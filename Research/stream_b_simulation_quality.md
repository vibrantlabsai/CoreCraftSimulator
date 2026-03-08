# Stream B: Simulation Quality Improvements

## What This Is

EnterpriseSim is a Smallville-style multi-agent simulator for generating customer support worlds. It spawns generative agents (customers, support employees, managers) in Docker containers via pi-mono RPC, runs them through a tick-based simulation loop, and produces a populated SQLite database (`world.db`).

The simulator MVP works but produces thin, homogeneous data. This stream improves the quality of generated worlds by enforcing multi-turn conversations, adding realistic ticket pacing, and adding observability.

**This stream is independent of Stream A (Robustness) and Stream C (Agent Scaling).** It modifies different functions in shared files. After completion, changes will be merged by the main instance.

---

## Architecture Overview

```
SimulationEngine.run()
  └─ for each tick:
       └─ TickProcessor.process(tick, sim_time)
            ├─ Phase 1: _customer_phase()     — customers respond to agent replies + file new tickets
            ├─ Phase 2: _routing_phase()       — round-robin assign unassigned tickets to employees
            ├─ Phase 3: _employee_phase()      — build perception prompt, send to employee via RPC
            └─ Phase 4: _manager_phase()       — handle escalations
```

**Key concept:** The engine sends "perception prompts" to agents via `PiAgent.send_message()`. Agents act autonomously inside Docker containers using CLI tools (`esim send-reply`, `esim lookup-customer`, etc.) that write directly to `world.db`. The engine reads the resulting DB state next tick.

---

## Task B1: Enforce Multi-Turn Dialogue

### Problem
Employees resolve tickets in a single turn — they look up the order, send a reply, and mark resolved all in one `send_message` call. This produces 1-2 message conversations instead of realistic 4-8 message threads.

### Fix: Two-pronged approach

#### B1a. Prompt-level changes

**File:** `src/enterprise_sim/orchestrator/agent_manager.py`

**Employee system prompt** — modify `_build_employee_system_prompt()` (starts at line 312, the non-manager branch starts at line 370):

Add these guidelines to the employee system prompt (both manager and non-manager versions):

```
IMPORTANT INTERACTION GUIDELINES:
- NEVER resolve a ticket on your first interaction. Always gather information first.
- Your first response should acknowledge the issue and ask clarifying questions or look up relevant data.
- Only offer a resolution after you understand the full picture (customer history, order details, applicable policies).
- Do NOT mark a ticket as resolved until you've confirmed the customer accepts your proposed solution.
```

**Customer system prompt** — modify `_build_customer_system_prompt()` (starts at line 274):

Add to the customer instructions:

```
If the support agent tries to resolve your issue without fully understanding it, without looking up your order details, or without properly investigating, express frustration and insist they investigate properly before jumping to conclusions.
```

#### B1b. Engine-level changes

**File:** `src/enterprise_sim/orchestrator/tick_processor.py`

1. In `_get_actionable_tickets()` (line 202), add `message_count` to each ticket dict:

```python
# After fetching last_msg, also count total messages
msg_count = conn.execute(
    "SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = ?",
    (t["id"],),
).fetchone()[0]
# Add to the dict:
actionable.append({
    ...existing fields...,
    "message_count": msg_count,
})
```

2. In `_build_employee_perception()` (line 230), use message_count to add guidance:

```python
for t in tickets:
    lines.append(f"--- Ticket #{t['id']} ---")
    lines.append(f"Customer: {t['customer_id']} | Subject: {t['subject']} | Status: {t['status']}")
    lines.append(f"Latest message from customer:\n{t['last_message']}")
    if t.get("message_count", 0) <= 2:
        lines.append(">>> This is a new ticket. Gather information and investigate before proposing a resolution.")
    lines.append("")
```

### Current code for reference

**Employee system prompt (non-manager)** currently ends with:
```
For each customer interaction:
1. Look up the customer and their order history first
2. Understand the issue before responding
3. Use send-reply to respond to the customer professionally
4. Follow escalation policy for refunds above ${refund_limit:.2f}
5. Update the ticket status as you work

Always acknowledge the customer's feelings. Be thorough but efficient.
```

**Customer system prompt** currently ends with:
```
RESPONSE FORMAT:
1. Write your reply (1-3 sentences, in character)...
2. At the END of every response, include exactly one XML tag: <satisfaction-delta>X</satisfaction-delta>...
3. If the issue is fully resolved, ALSO call the mark_resolved tool...
4. Never break character...
```

---

## Task B2: Realistic Ticket Pacing

### Problem
Flat `ticket_probability` (default 0.15) per tick per customer. All customers equally likely to file at any time. Max 1 active ticket per customer. This produces uniform, predictable ticket patterns.

### Fix: Time-aware, personality-driven pacing

#### B2a. Add TicketPacing config

**File:** `src/enterprise_sim/orchestrator/sim_config.py`

Current contents:
```python
from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path

@dataclass
class WorldConfig:
    num_ticks: int = 48
    tick_duration_minutes: int = 5
    ticket_probability: float = 0.15
    provider: str = "openai"
    model: str = "gpt-5-mini"
    seed: int | None = None
    output_dir: Path | None = None

@dataclass
class TickSummary:
    ...
```

Add a `TicketPacing` dataclass and wire it into WorldConfig:

```python
@dataclass
class TicketPacing:
    base_probability: float = 0.10
    rush_hour_multiplier: float = 2.5    # applied during 9-10 AM, 1-2 PM
    quiet_multiplier: float = 0.3         # applied outside business hours
    patience_modifier: bool = True        # impatient customers file more often
    max_active_tickets: int = 2           # allow concurrent tickets per customer
```

Add `pacing: TicketPacing = field(default_factory=TicketPacing)` to `WorldConfig`. Keep `ticket_probability` for backward compatibility but `pacing` takes precedence when present.

#### B2b. Update ticket filing logic

**File:** `src/enterprise_sim/orchestrator/tick_processor.py`

Modify `_customer_maybe_file_ticket()` (starts at line 99):

Current logic:
```python
def _customer_maybe_file_ticket(self, conn, agent_id, agent, tick, sim_time, summary):
    # Skip if customer already has an active ticket
    open_count = conn.execute(
        "SELECT COUNT(*) FROM tickets WHERE customer_id = ? AND status IN ('open', 'in_progress', 'escalated')",
        (agent_id,),
    ).fetchone()[0]
    if open_count > 0:
        return

    # Roll dice
    if self.rng.random() > self.config.ticket_probability:
        return
    ...
```

Replace with:
```python
def _customer_maybe_file_ticket(self, conn, agent_id, agent, tick, sim_time, summary):
    pacing = self.config.pacing

    # Check active ticket limit
    open_count = conn.execute(
        "SELECT COUNT(*) FROM tickets WHERE customer_id = ? AND status IN ('open', 'in_progress', 'escalated')",
        (agent_id,),
    ).fetchone()[0]
    if open_count >= pacing.max_active_tickets:
        return

    # Calculate time-aware probability
    hour = sim_time.hour
    prob = pacing.base_probability

    if hour in (9, 13):  # Rush hours: 9-10 AM, 1-2 PM
        prob *= pacing.rush_hour_multiplier
    elif hour < 8 or hour >= 17:  # Outside business hours
        prob *= pacing.quiet_multiplier

    # Personality modifier: impatient customers contact more
    if pacing.patience_modifier:
        patience = agent._persona.get("patience_level", 0.5)
        prob *= (1.0 - patience + 0.5)  # low patience → higher probability

    if self.rng.random() > prob:
        return
    # ... rest of the method stays the same
```

---

## Task B3: Observability — Agent Decision Traces

### Problem
No way to see what agents are doing during simulation. `sim_events` captures high-level events (ticket_created, agent_acted) but not the actual prompts, responses, tool calls, or timing.

### Fix: Add sim_traces table and instrument agent calls

#### B3a. Create traces table

**File:** `src/enterprise_sim/orchestrator/simulation_engine.py`

In `_setup()` (starts at line 45), after the `sim_events` table creation (around line 64-78), add:

```python
conn.executescript("""
    ...existing sim_clock and sim_events tables...

    CREATE TABLE IF NOT EXISTS sim_traces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tick INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        prompt_sent TEXT,
        raw_response TEXT,
        tool_calls TEXT,
        duration_ms INTEGER,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
""")
```

#### B3b. Instrument PiAgent.send_message()

**File:** `src/enterprise_sim/orchestrator/agent_manager.py`

Add `import time` at the top.

In `send_message()` (starts at line 146), track timing and tool calls:

```python
def send_message(self, content: str) -> str:
    if not self._proc or self._proc.poll() is not None:
        raise RuntimeError("pi-mono process is not running")

    cmd = json.dumps({"type": "prompt", "message": content}) + "\n"
    self._proc.stdin.write(cmd)
    self._proc.stdin.flush()

    start_time = time.monotonic()
    all_text_parts = []
    tool_calls = []  # NEW: track tool calls

    while True:
        line = self._proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue

        event_type = event.get("type", "")

        if event_type == "tool_execution_end":
            if event.get("toolName") == "mark_resolved" and not event.get("isError"):
                self._is_resolved = True
            # NEW: record tool call
            tool_calls.append({
                "tool": event.get("toolName", ""),
                "error": event.get("isError", False),
            })
        elif event_type == "turn_end":
            message = event.get("message", {})
            content_blocks = message.get("content", [])
            for block in content_blocks:
                if block.get("type") == "text":
                    all_text_parts.append(block.get("text", ""))
        elif event_type == "agent_end":
            break

    response = "\n".join(all_text_parts)
    duration_ms = int((time.monotonic() - start_time) * 1000)

    # NEW: store trace on the agent instance for callers to log
    self.last_trace = {
        "raw_response": response,
        "tool_calls": tool_calls,
        "duration_ms": duration_ms,
    }

    return response
```

Also add `self.last_trace: dict | None = None` to `__init__()` (around line 54).

#### B3c. Log traces from tick processor

**File:** `src/enterprise_sim/orchestrator/tick_processor.py`

Add a helper method to TickProcessor:

```python
def _log_trace(self, conn, tick: int, agent_id: str, phase: str, prompt: str, agent) -> None:
    """Write agent trace to sim_traces table."""
    trace = getattr(agent, "last_trace", None)
    if not trace:
        return
    conn.execute(
        "INSERT INTO sim_traces (tick, agent_id, phase, prompt_sent, raw_response, tool_calls, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (tick, agent_id, phase, prompt, trace["raw_response"], json.dumps(trace["tool_calls"]), trace["duration_ms"]),
    )
```

Then add `_log_trace()` calls after each `agent.send_message()` or `agent.respond()` call:

1. In `_customer_respond_to_agent()` (line 58) — after `agent.respond()` call (line 79):
   ```python
   response = agent.respond("send_reply", {"message": last_msg["content"]})
   self._log_trace(conn, tick, agent_id, "customer_response", f"Agent replied: {last_msg['content']}", agent)
   ```

2. In `_customer_maybe_file_ticket()` (line 99) — after `agent.send_message()` call (line 114):
   ```python
   raw = agent.send_message("You're contacting customer support now...")
   self._log_trace(conn, tick, agent_id, "customer_new_ticket", "Filing new ticket", agent)
   ```

3. In `_employee_phase()` (line 176) — after `agent.send_message(perception)` (line 186):
   ```python
   agent.send_message(perception)
   self._log_trace(conn, tick, agent_id, "employee", perception, agent)
   ```

4. In `_manager_phase()` (line 251) — after `agent.send_message(perception)` (line 268):
   ```python
   agent.send_message(perception)
   self._log_trace(conn, tick, agent_id, "manager", perception, agent)
   ```

---

## Files Modified (Summary)

| File | What Changes |
|------|-------------|
| `src/enterprise_sim/orchestrator/agent_manager.py` | System prompts (multi-turn guidelines), `send_message()` (trace tracking), `__init__` (last_trace field) |
| `src/enterprise_sim/orchestrator/tick_processor.py` | `_get_actionable_tickets` (message_count), `_build_employee_perception` (new-ticket hint), `_customer_maybe_file_ticket` (pacing logic), `_log_trace` (new helper), trace logging in all 4 phases |
| `src/enterprise_sim/orchestrator/sim_config.py` | New `TicketPacing` dataclass, add `pacing` field to `WorldConfig` |
| `src/enterprise_sim/orchestrator/simulation_engine.py` | `_setup()` — add `sim_traces` table creation |

### Conflict zones with Stream A

Stream A modifies these same files but different sections:
- `agent_manager.py`: Stream A modifies `send_message()` internals (timeout threading). Stream B modifies `send_message()` (trace tracking) and system prompt methods. **Merge needed** — the timeout wrapper and trace tracking both modify `send_message()`.
- `tick_processor.py`: Stream A wraps phase methods in try/except + ThreadPoolExecutor. Stream B modifies perception building and pacing logic. **Low conflict** — different functions.
- `sim_config.py`: Both add new fields to `WorldConfig`. **Easy merge** — just combine the new fields.

---

## Verification

After implementing all 3 tasks:

```bash
# Run a 6-tick simulation
uv run esim simulate --ticks 6 --seed 42 --model gpt-4o-mini

# Check multi-turn: tickets should have 3+ messages
sqlite3 output/sim_*/world.db "SELECT ticket_id, COUNT(*) as msg_count FROM ticket_messages WHERE ticket_id > 8 GROUP BY ticket_id"

# Check pacing: look at ticket creation times
sqlite3 output/sim_*/world.db "SELECT * FROM sim_events WHERE event_type = 'ticket_created'"

# Check traces: should have entries for every agent interaction
sqlite3 output/sim_*/world.db "SELECT agent_id, phase, duration_ms, tool_calls FROM sim_traces LIMIT 10"

# Verify trace completeness
sqlite3 output/sim_*/world.db "SELECT phase, COUNT(*) FROM sim_traces GROUP BY phase"
```

---

## Important Notes

- Use `uv run` to run all Python commands
- The user reviews all changes — never auto-commit
- Default model is `gpt-5-mini` — use `--model gpt-4o-mini` for testing until Stream A fixes the timeout issue
- The codebase is at `/Users/jjmachan/workspace/personal/CoreCraftSim/.bare.stream-b-simulation-quality/`
- Run on branch `stream-b-simulation-quality` (worktree created via `wt switch --create stream-b-simulation-quality`)
- **Worktree setup:** Created via worktrunk (`wt`). The worktree lives at `~/.../CoreCraftSim/.bare.stream-b-simulation-quality`. Claude Code's shell resets cwd after each command, so **use absolute paths** for all file operations — `cd` will not persist.
- When done, merge back with `wt merge main` from the worktree
