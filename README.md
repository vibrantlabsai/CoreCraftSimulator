# EnterpriseSimulator

The bottleneck for RL-trained LLMs isn't algorithms — it's environments. We have GRPO, we have compute, but we don't have a scalable way to create the diverse, realistic environments needed to train agents.

Research areas like **Unsupervised Environment Design (UED)** and **Open-endedness** point toward solutions, but there's a gap between theory and practice. EnterpriseSimulator is an experiment exploring one concrete approach: **what if you could grow RL environments from simulated worlds instead of hand-crafting them?**

## The Approach

```
Simulate World → Mine Tasks → Train Agents
```

1. **Simulate a rich world** — A Smallville-style multi-agent simulation where LLM-powered customers, support agents, and managers interact through a shared database. This produces organic, realistic scenarios — not scripted ones.

2. **Mine tasks from the world** — A task miner extracts RL-ready scenarios from the simulation data. Instead of a human designing each task, the simulation itself produces a curriculum of diverse situations.

3. **Wrap as an RL environment** — Each mined task becomes a gym-like environment (via [OpenEnv](https://github.com/openlabs-dev/openenv)) with reset/step/reward. Train agents with GRPO or collect offline data for other methods.

The thesis: this pattern — simulate world, extract tasks, train agents — could generalize beyond customer support to any domain where you can simulate realistic interactions.

## Project Structure

```
src/enterprise_sim/          # World simulation engine
├── orchestrator/            # Tick-based simulation loop, agent management
├── agents/                  # LLM-powered agent definitions
├── tools/                   # CLI tools for agents to interact with the world
├── task_miner/              # Extract RL tasks from simulation data
└── analyze/                 # Simulation analysis and reporting

openenv_pkg/                 # OpenEnv RL environment (deployable to HF Spaces)
├── server/                  # FastAPI environment server
│   ├── environment.py       # MCPEnvironment with reward computation
│   ├── customer_agent.py    # LLM-simulated customer for training
│   └── tools.py             # DB-backed tool functions
├── client.py                # Python client for programmatic interaction
└── data/                    # World DB, agent personas, mined tasks

dashboard/                   # Web dashboard for simulation analysis
```

## Quick Start

### Run the world simulation

```bash
uv run enterprise-sim simulate --num-ticks 50 --output output/
```

### Mine tasks from the simulated world

```bash
uv run enterprise-sim mine-tasks --db output/world.db
```

### Deploy the RL environment

```bash
cd openenv_pkg
uv run openenv push --repo-id <your-hf-repo>
```

### Train an agent

```python
from client import CustomerSupportEnv

env = CustomerSupportEnv(base_url="https://your-space.hf.space")
with env:
    obs = env.reset()
    print(obs.customer_message)

    obs = env.call_tool("lookup_customer", customer_id=obs.customer_id)
    obs = env.call_tool("send_reply", ticket_id=obs.ticket_id, message="Let me help you with that.")
    print(f"Satisfaction: {obs.satisfaction}, Resolved: {obs.resolved}")
```

## The Environment

The customer support environment exposes 4 tools:

| Tool | Description |
|------|-------------|
| `lookup_customer` | Look up customer profile, order history, open tickets |
| `check_order` | Get full order details, items, shipping status |
| `send_reply` | Reply to the customer (triggers LLM customer response) |
| `update_ticket` | Update ticket status, add internal notes |

**Reward** = `0.55 × resolution + 0.30 × satisfaction + 0.15 × efficiency`

Each episode runs up to 10 steps. The simulated customer responds with realistic messages and satisfaction signals based on their persona (patience level, communication style, issue complexity).

## Live Demo

Try the interactive environment: [HuggingFace Space](https://huggingface.co/spaces/jjmachan/enterprise-sim-support)
