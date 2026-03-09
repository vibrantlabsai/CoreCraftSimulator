"""Generate simplified Task Miner conceptual diagram as SVG.

Usage:
  uv run python openenv_pkg/scripts/plot_task_miner.py
  # Output: openenv_pkg/outputs/task_miner.svg
"""

from pathlib import Path


def rect(x, y, w, h, rx=12, fill="#fff", stroke="#ccc", sw=1.5, opacity=1):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{opacity}"/>')


def text(x, y, t, size=14, fill="#333", weight="normal", anchor="middle",
         style=""):
    st = f' font-style="{style}"' if style else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
            f'font-weight="{weight}" text-anchor="{anchor}" dy="0.35em"{st}>{t}</text>')


def arrow_line(x1, y1, x2, y2, color="#666", w=2):
    cid = color.replace("#", "")
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{color}" stroke-width="{w}" marker-end="url(#a-{cid})"/>')


def arrow_path(d, color="#666", w=2):
    cid = color.replace("#", "")
    return (f'<path d="{d}" stroke="{color}" stroke-width="{w}" '
            f'fill="none" marker-end="url(#a-{cid})"/>')


def main():
    W, H = 860, 580

    colors = ["#7c3aed", "#d4a017", "#4a90d9", "#16a34a", "#ea580c"]
    markers = "\n".join(
        f'<marker id="a-{c.replace("#","")}" viewBox="0 0 10 10" refX="9" refY="5" '
        f'markerWidth="7" markerHeight="7" orient="auto">'
        f'<path d="M0 0L10 5L0 10z" fill="{c}"/></marker>'
        for c in colors
    )

    p = []

    # Background
    p.append(rect(0, 0, W, H, rx=14, fill="#f8f9fb", stroke="#dee2e6", sw=2))

    # Title
    p.append(text(W/2, 30, "Task Miner  —  Adaptive Difficulty Mining",
                  size=22, fill="#1a1a2e", weight="bold"))
    p.append(text(W/2, 54, "Symbiotic loop between task mining and world simulation",
                  size=11, fill="#888", style="italic"))

    # ── Layout: circular flow ──
    #
    #        [Task Miner]
    #             |
    #          [World]  ←→  [Simulator]
    #             |
    #         [Runner]
    #             |
    #        [Assess k/n]
    #          /     \
    #    [modify]  [grow]
    #       ↑         ↑
    #       └→ Task Miner / Simulator

    cx = W / 2  # center x

    # ── 1. Task Miner (top) ──
    tm_w, tm_h = 240, 60
    tm_x, tm_y = cx - tm_w/2, 80
    p.append(rect(tm_x+2, tm_y+2, tm_w, tm_h, fill="#00000008", stroke="none"))
    p.append(rect(tm_x, tm_y, tm_w, tm_h, fill="#7c3aed", stroke="#6d28d9", rx=10))
    p.append(text(cx, tm_y + 20, "Task Miner", size=15, fill="white", weight="bold"))
    p.append(text(cx, tm_y + 42, "Propose task + rubric + target k/n",
                  size=9.5, fill="#e0d4ff"))

    # ── 2. World (center) ──
    wo_w, wo_h = 200, 70
    wo_x, wo_y = cx - wo_w/2, 190
    p.append(rect(wo_x+2, wo_y+2, wo_w, wo_h, fill="#00000008", stroke="none"))
    p.append(rect(wo_x, wo_y, wo_w, wo_h, fill="#fffbeb", stroke="#d4a017", sw=2, rx=10))
    p.append(text(cx, wo_y + 22, "World (world.db)", size=13, fill="#7a6200", weight="bold"))
    p.append(text(cx, wo_y + 46, "customers · orders · tickets",
                  size=9.5, fill="#a08000"))
    p.append(text(cx, wo_y + 60, "products · knowledge_base",
                  size=9.5, fill="#a08000"))

    # ── 3. Simulator (left of world) ──
    si_w, si_h = 150, 50
    si_x, si_y = wo_x - si_w - 60, wo_y + (wo_h - si_h)/2
    p.append(rect(si_x+2, si_y+2, si_w, si_h, fill="#00000008", stroke="none"))
    p.append(rect(si_x, si_y, si_w, si_h, fill="#16a34a", stroke="#15803d", rx=10))
    p.append(text(si_x + si_w/2, si_y + 16, "Simulator", size=13, fill="white", weight="bold"))
    p.append(text(si_x + si_w/2, si_y + 36, "Grow the world",
                  size=9.5, fill="#dcfce7"))

    # ── 4. Runner (below world) ──
    ru_w, ru_h = 220, 60
    ru_x, ru_y = cx - ru_w/2, 310
    p.append(rect(ru_x+2, ru_y+2, ru_w, ru_h, fill="#00000008", stroke="none"))
    p.append(rect(ru_x, ru_y, ru_w, ru_h, fill="#4a90d9", stroke="#3b82d6", rx=10))
    p.append(text(cx, ru_y + 20, "Runner", size=15, fill="white", weight="bold"))
    p.append(text(cx, ru_y + 42, "Run task x n  ·  LLM Judge scores",
                  size=9.5, fill="#dbeafe"))

    # ── 5. Difficulty check (below runner) ──
    di_w, di_h = 200, 50
    di_x, di_y = cx - di_w/2, 420
    p.append(rect(di_x+2, di_y+2, di_w, di_h, fill="#00000008", stroke="none"))
    p.append(rect(di_x, di_y, di_w, di_h, fill="#ea580c", stroke="#dc2626", rx=10))
    p.append(text(cx, di_y + 16, "Difficulty Check", size=13, fill="white", weight="bold"))
    p.append(text(cx, di_y + 36, "pass rate vs target k/n",
                  size=9.5, fill="#fed7aa"))

    # ── Arrows: main flow ──

    # Task Miner → World
    p.append(arrow_line(cx, tm_y + tm_h, cx, wo_y, "#7c3aed"))
    p.append(text(cx + 10, (tm_y + tm_h + wo_y)/2, "task",
                  size=9, fill="#7c3aed", style="italic", anchor="start"))

    # World → Runner
    p.append(arrow_line(cx, wo_y + wo_h, cx, ru_y, "#d4a017"))
    p.append(text(cx + 10, (wo_y + wo_h + ru_y)/2, "snapshot",
                  size=9, fill="#d4a017", style="italic", anchor="start"))

    # Runner → Difficulty
    p.append(arrow_line(cx, ru_y + ru_h, cx, di_y, "#4a90d9"))
    p.append(text(cx + 10, (ru_y + ru_h + di_y)/2, "results",
                  size=9, fill="#4a90d9", style="italic", anchor="start"))

    # ── Feedback loops ──

    # Left loop: Difficulty → "modify task" → back to Task Miner
    # Curve from difficulty left side, up to task miner left side
    p.append(arrow_path(
        f"M {di_x} {di_y + di_h/2} "
        f"C {di_x - 100} {di_y + di_h/2}, "
        f"{tm_x - 100} {tm_y + tm_h/2}, "
        f"{tm_x} {tm_y + tm_h/2}",
        "#7c3aed", w=2))
    # Label on the left curve
    p.append(text(tm_x - 68, (di_y + tm_y + tm_h)/2 + 10, "modify",
                  size=10, fill="#7c3aed", weight="600"))
    p.append(text(tm_x - 68, (di_y + tm_y + tm_h)/2 + 24, "task",
                  size=10, fill="#7c3aed", weight="600"))

    # Right loop: Difficulty → Simulator → grows World
    # Route along the right margin: right from Difficulty, up, then left to Simulator
    margin_r = 740  # right margin x
    corner_r = 16   # corner radius
    sim_r = si_x + si_w  # right edge of Simulator
    sim_cy = si_y + si_h / 2  # Simulator center y
    di_r = di_x + di_w  # right edge of Difficulty
    di_cy = di_y + di_h / 2
    p.append(arrow_path(
        f"M {di_r} {di_cy} "
        f"L {margin_r - corner_r} {di_cy} "
        f"Q {margin_r} {di_cy} {margin_r} {di_cy - corner_r} "
        f"L {margin_r} {sim_cy + corner_r} "
        f"Q {margin_r} {sim_cy} {margin_r - corner_r} {sim_cy} "
        f"L {sim_r} {sim_cy}",
        "#16a34a", w=2))
    p.append(text(margin_r + 12, (di_cy + sim_cy) / 2 - 7, "grow",
                  size=10, fill="#16a34a", weight="600", anchor="start"))
    p.append(text(margin_r + 12, (di_cy + sim_cy) / 2 + 7, "world",
                  size=10, fill="#16a34a", weight="600", anchor="start"))

    # Simulator ↔ World (bidirectional)
    p.append(arrow_line(si_x + si_w, si_y + si_h/2 - 6,
                        wo_x, wo_y + wo_h/2 - 6, "#16a34a"))
    p.append(arrow_line(wo_x, wo_y + wo_h/2 + 6,
                        si_x + si_w, si_y + si_h/2 + 6, "#16a34a"))

    # ── "On target" badge ──
    ok_w, ok_h = 120, 28
    ok_x, ok_y = cx - ok_w/2, di_y + di_h + 14
    p.append(rect(ok_x, ok_y, ok_w, ok_h, rx=6,
                  fill="#dcfce7", stroke="#16a34a", sw=1.2))
    p.append(text(cx, ok_y + ok_h/2, "on target &#x2192; keep",
                  size=10, fill="#166534", weight="600"))
    p.append(arrow_line(cx, di_y + di_h, cx, ok_y, "#16a34a", w=1.5))

    # ── Trainee model label (next to runner) ──
    p.append(rect(ru_x + ru_w + 16, ru_y + 12, 130, 30, rx=6,
                  fill="#e0e7ff", stroke="#4a90d9", sw=1))
    p.append(text(ru_x + ru_w + 81, ru_y + 27, "Trainee Model",
                  size=9.5, fill="#4a50a9", weight="600"))

    # ── Footer ──
    p.append(text(W/2, H - 18,
                  "Richer worlds enable harder tasks  ·  "
                  "Task gaps drive world growth",
                  size=10.5, fill="#999", style="italic"))

    # Assemble
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    {markers}
    <style>text {{ font-family: Inter, -apple-system, Segoe UI, sans-serif; }}</style>
  </defs>
  {"".join(p)}
</svg>"""

    out = Path(__file__).resolve().parent.parent / "outputs" / "task_miner.svg"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(svg)
    print(f"Saved to {out}")


if __name__ == "__main__":
    main()
