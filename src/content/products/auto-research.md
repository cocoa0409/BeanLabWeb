---
slug: auto-research
title: "Auto Research: Endless Evolution"
category: "Coding"
---

This dataset measures a model's ability to **learn from environment feedback**. Each task is a scoreable environment whose optimum is known to exist but cannot be reached in practice. Progress comes through iteration: the agent forms a hypothesis, implements it, measures the outcome, and revises, closing distance to the optimum over a long horizon.

Every task is a combinatorial optimization or continuous non-convex optimization problem, solved through **heuristic coding**. The tasks span games, real-world applications, and mathematical and geometric problems. Their difficulty has two sources: **the scale of computation** the optimum requires, and **the unknowability of the future**, where the best action depends on information not yet available to the agent. No amount of prior knowledge removes either constraint; the gap narrows only as the agent's strategy improves.


---


## Design Philosophy

Every task is manually constructed and long-horizon, authored by elite competitive-programming and mathematical-olympiad contestants. Each task is self-contained, with a computable objective, a dense scalar reward, and freshly generable instances. Tasks are designed so that pattern-matching plateaus early and a strong score requires sustained iteration.

Two principles shape every task:

* **Dense feedback.** Each attempt is scored on a continuous objective rather than a binary outcome, providing a learning signal at every step of a long trajectory.  
* **Unbounded room to improve.** The optimum is never reached, so tasks do not saturate as models grow stronger. A better strategy always remains available.

Together these properties isolate one capability: how far a model can improve on a problem once it is inside it.


---


## Why This Is Different

Most agentic datasets present problems with a fixed correct answer. Success is binary, and once a model reaches the ceiling the data stops teaching. These tasks are open-ended optimization: **the reward is continuous, relatively comparable and the optimum is never attained**, so the data keeps producing signals after standard benchmarks have saturated.

They also measure a different thing. A pass/fail task records whether a model reached a known solution; it says little about how. Here a strong score requires a trajectory of improvement, **making the agent's ability to learn from feedback directly observable** rather than inferred from a final answer.


---


## Sample

Performance analysis of `claude-opus-4-8` (xhigh effort) \+ Claude Code can be found in the compressed files for the sample tasks and rollout.

### Task 1 Battleships (Game)

#### Battleships: Minimum-Cost Radar Search

You are playing a game of Battleships against a hidden opponent. The opponent has placed **S** ships on an **N×N** grid and you must find and destroy all of them while spending as little total **cost** as possible. This is a heuristic optimization task.

Edit the file `/app/strategy.py` so that it destroys every ship at lower total cost than the provided baseline. A stronger strategy earns a higher score.


---


##### Overview

Each ship occupies between **1** and **L** (inclusive) contiguous horizontal or vertical cells. Each turn you may take one of two actions:

- **Shoot** a single cell. Cost **1**. You are told whether you **missed**, **hit** a ship (but did not destroy it), or **killed** (destroyed) a ship completely.  
- **Scan** a rectangular region with a radar. The scan returns the **number of ship cells** inside the region. A scan costs `P * log2(N*N + 2 - A)`, where `A` is the area (number of cells) of the scanned rectangle and `log2` is the base-2 logarithm.

Note the shape of the scan cost: scanning a region that covers almost the whole board is cheap (a full-board scan costs only `P`), while small scans are expensive (a single-cell scan costs about `P * log2(N*N)`). Use this to your advantage.

Your task is to destroy all the ships while incurring the least total cost.


---


##### Input (what your strategy is given)

Your strategy receives a `game` object exposing these **read-only attributes**:

- `game.N` — the grid size (the board is `N × N`, 0-indexed).  
- `game.S` — the number of ships.  
- `game.L` — the maximum ship length (always `N // 2`).  
- `game.P` — the scan cost parameter.  
- `game.ship_lengths` — a list where `game.ship_lengths[n]` is the number of ships of length `n`, for `n` in `1 .. L` (index `0` is unused). This is the exact per-length ship manifest.  
- `game.ships_left` — the number of ships not yet destroyed (updates as you sink them; the game is over when this reaches `0`).

You do **not** know where the ships are — that is what you must discover.

##### Output (the actions you take)

Your strategy interacts with the board by calling methods on `game`:

- `game.shoot(r, c)` → returns one of the strings `"MISS"`, `"HIT"`, `"KILL"`. Shoots row `r`, column `c` (both 0-based). Costs **1**.  
- `game.scan(r1, c1, r2, c2)` → returns an `int`: the number of ship cells inside the inclusive rectangle whose opposite corners are `(r1, c1)` and `(r2, c2)` (given in any order). Costs `P * log2(N*N + 2 - A)`.

You implement a class named **`Strategy`** with a method **`play(self, game)`**. `play` should keep taking actions until every ship is destroyed (`game.ships_left == 0`) and then return.

```python
class Strategy:
   def play(self, game):
       # ... call game.shoot(...) / game.scan(...) until game.ships_left == 0 ...
```

###### Rules (violating any of these makes the case invalid → 0 reward for it)

- Coordinates must be inside the grid (`0 <= r, c < N`).  
- You may **not** shoot the same cell twice. (Scanning the same region more than once is allowed, but you still pay for it.)  
- `play` must return only **after every ship is destroyed**. Returning early — or crashing, or running past the per-case time limit — invalidates the case.  
- Use only the documented `game` API (its attributes and `shoot`/`scan`). At grading time your strategy runs in a **separate process** and reaches the grader only through this API; the board lives in the grader, never in your process, so there is no ground truth to read — the only way to learn the layout is to shoot and scan.

Because ships can have length **1**, no region is safe to skip until a scan (or a shot) has proven it empty. Ships may also touch each other, but never overlap.


---


##### Scoring

For each test case your **raw cost** is the total cost incurred to destroy all ships (shots + scan costs). Lower is better. The baseline — the starter `strategy.py`, also defined as `BaselineStrategy` in `engine.py` — fires at cells in a fixed pseudo-random order until everything sinks, never scanning.

Your reward on a case is the ratio `reward_case = baseline_cost / your_cost`, so matching the baseline scores `1.0`, doing twice as well scores `2.0`, and being invalid on a case scores `0.0`. Your **final score is the mean of `reward_case` over the entire hidden test set**. The unmodified starter strategy therefore scores exactly `1.0` — your goal is to score as far above `1.0` as you can.

There is a large hidden test set used for your real score; you can see only a small sample locally (see below). Do not overfit to the visible cases.


---


##### Test Case Generation

Each test case is generated as follows:

- **N**, the grid size, is uniform in **[8, 20]**.  
- **S**, the number of ships, is uniform in **[N/2, floor(3·N/2)]**.  
- **L**, the maximum ship length, is fixed to **floor(N/2)**.  
- **P**, the scan cost parameter, is uniform in **[0.1, 1.0]**.  
- Ships are placed one at a time onto an initially empty grid: a length in **[1, L]** is chosen uniformly, then every legal placement (horizontal or vertical, in-bounds, non-overlapping) is enumerated and one is chosen uniformly at random. Ships may touch but not overlap. If a chosen length has no legal placement, the whole grid is restarted. This repeats until all **S** ships are placed.  
- All random choices are uniform.


---


##### Your workspace (`/app`)

| File | Access | Purpose |  
|------|--------|---------|  
| `strategy.py` | **editable** | Your `Strategy` class — the only file that is graded. Starts as the baseline. |  
| `engine.py` | **read-only** | The game engine: `Game`, `shoot`, `scan`, the cost model, and the frozen baseline (`BaselineStrategy`). |  
| `runner.py` | **read-only** | Runs a strategy in the isolated process (used by `run_local.py` and the grader). |  
| `run_local.py` | helper | Self-test script that scores `strategy.py` on the visible sample cases. |  
| `sample_cases/` | helper data | 100 visible example cases (the hidden test set is much larger). |

`engine.py` and `runner.py` are **read-only**: before grading they are checked against a SHA-256 hash, and if either has been modified or removed your reward is **0**. Write your entire solution in `strategy.py` — it is the only file that is graded. `run_local.py` and `sample_cases/` are there for your own testing.

###### Iterate locally

Run your strategy against the visible sample cases at any time:

```bash
cd /app && python run_local.py
```

This prints, per case, the baseline cost, your cost, and the ratio, plus the mean ratio. Reading `engine.py` is encouraged — it shows exactly how shots, scans, and costs are computed.

###### What is evaluated

When you are done, the grader runs your `/app/strategy.py` against the hidden cases and computes the mean `baseline_cost / your_cost`. Your strategy is run in **process isolation**: it executes in its own process and interacts with the grader only through `game.shoot`/`game.scan`, exactly as in local testing — but the board is held by the grader, not your process. Only `/app/strategy.py` is graded — keep your whole solution in that one file (define a class `Strategy` with a method `play(self, game)`). Standard-library Python only; do not rely on network access.


---


There is no known optimal strategy for this problem — any approach can be pushed further. Treat it as an open-ended optimization: keep refining and testing your strategy, raising the score step by step, until further changes stop yielding meaningful improvement and your strategy has nearly converged.

### Task 2 39 Squares (Geometric Problem)

#### 39 Squares in a Square: Smallest Enclosing Square

Pack **exactly 39 unit squares** (each with side length 1) into the smallest possible **enclosing square**. The squares may be placed anywhere and rotated to any angle; they must not overlap. Your score is how much smaller than side 7 you can make the enclosing square.

This is a genuine geometric optimization problem — the best arrangement is **not known to you**, and there is no formula to look up. You must design the packing yourself. Your final deliverable is one data file describing your 39 squares, but how you get there is up to you: write code to search for, optimize, and verify candidate packings, and keep iterating to shrink the enclosing square as far as you legally can.


---


##### The goal

You place 39 **unit** squares — every square has side exactly 1 — in the plane. Each square has a centre and an orientation (it may be rotated to any angle). A packing is **legal** when:

- **No two squares overlap.** Their interiors must be disjoint; squares may **touch** (share an edge or a corner), but may not cross.

There is no fixed container: the "enclosing square" is measured from your packing. Let the axis-aligned bounding box of all your squares' corners have width `w` and height `h`. The side of the smallest enclosing (axis-aligned) square is `s = max(w, h)`, and **this `s` is what you minimize.** (Because the container is itself a square, its side must cover the larger of the two extents. You do not report `s` — the judge computes it from your squares, so you cannot mis-state it.)

A hard lower bound is `s ≥ √39 ≈ 6.2450` (39 unit squares have total area 39, which must fit inside `s²`). The trivial arrangement — 39 axis-aligned squares on a 7×7 grid — has `s = 7`. Everything worth doing lives in the gap between them, and getting there requires **tilting** some squares: an axis-aligned packing of 39 unit squares cannot beat `s = 7`.


---


##### What you deliver

Write your packing to the file **`/app/squares.json`**: a JSON array of **exactly 39** elements, one per square. Each element describes one unit square as a 4-element array `[cx, cy, dx, dy]`, where `(cx, cy)` is the square's **centre** and `(dx, dy)` is a **direction vector** giving the orientation of one pair of its edges.

The judge normalises `(dx, dy)` to a unit vector `u = (dx, dy)/|(dx, dy)|`, takes the perpendicular `v = (−u_y, u_x)`, and forms the four corners as `centre ± ½·u ± ½·v`. So every entry is automatically a genuine **unit square** — you never have to make four corners line up, and you never write an angle. You only choose *where* each square sits and *which way* it points. `(dx, dy)` may have any non-zero length (its magnitude is divided out); only its **direction** matters. Examples:

- `["3.5", "0.5", "1", "0"]` — an axis-aligned unit square centred at `(3.5, 0.5)`.  
- `["2", "2", "1", "1"]` — a square tilted **45°** (direction `(1, 1)`).  
- `["1", "1", "2", "1"]` — a square tilted by `arctan(½)` (direction `(2, 1)`, i.e. slope ½). This is exact and needs no trigonometry.

**Every field must be a string containing an exact arithmetic expression** — not a bare number. The best coordinates are generally irrational (they involve square roots), and no finite decimal represents them exactly. The judge evaluates each expression in **50-significant-digit decimal arithmetic**, so a value stated as an expression is exact.

An expression may use integers and decimals, `+ - * / **`, parentheses, and the constants `pi` and `e`. There are **no functions** — write roots as powers with a fractional exponent: `2**(1/2)` is √2, `2**(1/3)` a cube root, and so on (nesting is allowed). Because orientation is given as a *vector*, you never need `sin`/`cos` or `arctan`: to tilt a square to slope `p/q`, just use direction `(q, p)`; for a unit direction write, e.g., `["2/5**(1/2)", "1/5**(1/2)"]` for the slope-½ tilt.

Rules for the file:

- It must parse as JSON and contain **exactly 39** squares.  
- Each `cx`, `cy`, `dx`, `dy` must be a **string** expression that evaluates to a finite value, and each direction `(dx, dy)` must be **non-zero**. (A plain number written as a string, e.g. `"0.5"`, is a valid expression; a bare JSON number like `0.5` is rejected.)  
- Overlap is checked with an absolute tolerance of `1e-9`. Exact expressions clear this with enormous margin; if you use plain decimals, give enough digits (or leave a tiny gap between squares).

A starter `squares.json` already sits at `/app/squares.json` — the trivial 7×7 grid of 39 axis-aligned squares (`s = 7`), purely to show the format. Replace it with a tighter packing.


---


##### Scoring

1. **Legality (pass/fail).** If the file is missing or unparsable, does not contain exactly 39 squares, has a field that is not a valid finite expression, a zero-length direction vector, or **any overlap** (beyond the `1e-9` tolerance), the reward is **0**.

2. **Reward (for a legal packing).** Let `s` be the side of the smallest square enclosing your 39 unit squares (computed as above), and let `sopt` be the side of the **best packing known** — a fixed value that is **not disclosed to you**. Writing `t = (7 − s) / (7 − sopt)`, the reward is `t²`, clamped to `[0, 1]`:

  - `s ≥ 7` (no better than the trivial grid) → reward **0**  
  - `sopt < s < 7` → reward `((7 − s) / (7 − sopt))²`  
  - `s ≤ sopt` (you reached the best known packing) → reward **1**

  So the trivial 7×7 grid (`s = 7`) scores **0** and the best known packing scores **1**. The reward rises **quadratically** as you drive `s` down: it is worth little just below the baseline and climbs steeply only as `s` approaches the optimum, so the payoff is concentrated in closing the last of the gap. (`s` is bounded below by the area limit `s ≥ √39 ≈ 6.245`.) You are not told `sopt`, so there is exactly one thing to do: **make the enclosing square as small as you legally can.**


---


Approach it as the real optimization problem it is: decide how many squares to tilt and at what angles, how they interlock, and where each one sits; search and refine (a physical relaxation, simulated annealing, or a dedicated packing solver all work well); then write the centres and direction vectors (as exact expressions, or high-precision decimals with a tiny safety gap) to `/app/squares.json`.
