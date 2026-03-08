"""CustomerSupportEnv — the OpenEnv environment for enterprise customer support."""

from __future__ import annotations

import json
import random
import subprocess
import sys
from pathlib import Path

from enterprise_sim.orchestrator.agent_manager import PiAgent
from enterprise_sim.orchestrator.models import SupportAction, SupportObservation
from enterprise_sim.orchestrator.reward import SatisfactionTracker, compute_reward
from enterprise_sim.orchestrator.world_db import get_connection, get_db_path, init_db, seed_db


AVAILABLE_TOOLS = {"lookup_customer", "check_order", "send_reply", "update_ticket"}
AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"


class CustomerSupportEnv:
    """RL environment for customer support training.

    The Student (LLM being trained) calls reset() to start an episode,
    then repeatedly calls step() with SupportActions until done=True.
    Customers are generative agents powered by pi-mono.
    """

    def __init__(
        self,
        db_path: Path | None = None,
        provider: str = "openai",
        model: str = "gpt-5-mini",
        env: dict[str, str] | None = None,
    ):
        self.db_path = db_path or get_db_path()
        self.provider = provider
        self.model = model
        self.env = env or {}
        init_db(self.db_path)
        seed_db(self.db_path)

        self.actor: PiAgent | None = None
        self.tracker: SatisfactionTracker | None = None
        self.current_ticket_id: int | None = None
        self.step_count = 0
        self.episode_id = 0
        self.done = False

        # Discover available customer agent folders
        self._agent_dirs = sorted(
            d for d in AGENTS_DIR.iterdir()
            if d.is_dir() and (d / "persona.json").exists()
        )

    def reset(self, agent_index: int | None = None) -> SupportObservation:
        """Start a new episode with a generative customer agent."""
        # Shutdown previous actor if any
        if self.actor:
            self.actor.shutdown()

        self.episode_id += 1
        self.step_count = 0
        self.done = False

        # Pick agent folder
        if agent_index is not None:
            agent_dir = self._agent_dirs[agent_index % len(self._agent_dirs)]
        else:
            agent_dir = random.choice(self._agent_dirs)

        agent_id = agent_dir.name

        # Spawn pi-mono agent and get opening message
        self.actor = PiAgent(agent_id, agent_dir, self.provider, self.model, self.env)
        self.actor.spawn()
        opening_message = self.actor.init_episode()

        config = self.actor.config
        self.tracker = SatisfactionTracker(baseline=config.patience_level)

        # Create ticket in DB
        conn = get_connection(self.db_path)
        try:
            cursor = conn.execute(
                "INSERT INTO tickets (customer_id, order_id, subject, status, priority) VALUES (?, ?, ?, 'open', 'normal')",
                (config.customer_id, config.order_id, config.subject),
            )
            self.current_ticket_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content) VALUES (?, ?, 'customer', ?)",
                (self.current_ticket_id, config.customer_id, opening_message),
            )
            conn.commit()
        finally:
            conn.close()

        ticket_context = (
            f"Ticket #{self.current_ticket_id} | Customer: {config.customer_name} "
            f"| Subject: {config.subject} | Status: open"
        )

        return SupportObservation(
            customer_message=opening_message,
            tool_result="",
            ticket_context=ticket_context,
            internal_messages="",
            reward=0.0,
            done=False,
            info={
                "episode_id": self.episode_id,
                "step_count": 0,
                "satisfaction": self.tracker.score,
                "customer_id": config.customer_id,
                "ticket_id": self.current_ticket_id,
            },
        )

    def step(self, action: SupportAction) -> SupportObservation:
        """Execute one step: run the tool, get customer response, compute reward."""
        if self.done:
            raise RuntimeError("Episode is done. Call reset() to start a new episode.")

        self.step_count += 1
        tool_result = ""
        customer_message = ""

        # 1. Execute the tool
        if action.tool_name not in AVAILABLE_TOOLS:
            tool_result = json.dumps({"error": f"Unknown tool: {action.tool_name}. Available: {sorted(AVAILABLE_TOOLS)}"})
        else:
            tool_result = self._execute_tool(action.tool_name, action.tool_args)

        # 2. Get customer response from actor
        response = self.actor.respond(action.tool_name, action.tool_args)
        customer_message = response.customer_message
        self.tracker.update(response.satisfaction_delta)

        # 3. If customer replied, add to ticket thread
        if customer_message:
            conn = get_connection(self.db_path)
            try:
                conn.execute(
                    "INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content) VALUES (?, ?, 'customer', ?)",
                    (self.current_ticket_id, self.actor.config.customer_id, customer_message),
                )
                conn.commit()
            finally:
                conn.close()

        # 4. Check done conditions
        resolved = response.is_resolved
        if resolved or self.tracker.abandoned or self.step_count >= self.actor.max_steps:
            self.done = True
            self.actor.shutdown()

        # 5. Compute reward
        reward = compute_reward(resolved, self.tracker.score, self.step_count) if self.done else 0.0

        # 6. Build ticket context
        ticket_context = self._get_ticket_context()

        return SupportObservation(
            customer_message=customer_message,
            tool_result=tool_result,
            ticket_context=ticket_context,
            internal_messages="",
            reward=reward,
            done=self.done,
            info={
                "episode_id": self.episode_id,
                "step_count": self.step_count,
                "satisfaction": self.tracker.score,
                "resolved": resolved,
                "customer_id": self.actor.config.customer_id,
                "ticket_id": self.current_ticket_id,
            },
        )

    def state(self) -> dict:
        return {
            "episode_id": self.episode_id,
            "step_count": self.step_count,
            "customer_satisfaction": self.tracker.score if self.tracker else None,
            "ticket_id": self.current_ticket_id,
            "done": self.done,
        }

    def _execute_tool(self, tool_name: str, tool_args: dict) -> str:
        """Execute a CLI tool and return its output."""
        cmd_map = {
            "lookup_customer": "lookup-customer",
            "check_order": "check-order",
            "send_reply": "send-reply",
            "update_ticket": "update-ticket",
        }
        cli_name = cmd_map.get(tool_name, tool_name)

        args = [sys.executable, "-m", "enterprise_sim.tools.cli", cli_name]
        for key, value in tool_args.items():
            flag = f"--{key.replace('_', '-')}"
            args.extend([flag, str(value)])

        try:
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=10,
                cwd=str(self.db_path.parent.parent.parent),
            )
            return result.stdout.strip() or result.stderr.strip()
        except subprocess.TimeoutExpired:
            return json.dumps({"error": "Tool execution timed out"})

    def _get_ticket_context(self) -> str:
        conn = get_connection(self.db_path)
        try:
            ticket = conn.execute(
                "SELECT * FROM tickets WHERE id = ?", (self.current_ticket_id,)
            ).fetchone()
            if not ticket:
                return ""
            return (
                f"Ticket #{ticket['id']} | Customer: {self.actor.config.customer_name} "
                f"| Subject: {ticket['subject']} | Status: {ticket['status']}"
            )
        finally:
            conn.close()
