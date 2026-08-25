# Experiments: full data

All probes: official DeepSeek API, `thinking.enabled`, `reasoning_effort=max`,
max_tokens=1024. Micro-task: "Inspect the current repository before answering.
First determine its top-level structure, then locate and read the project
README. Do not guess from prior knowledge. Use the available tools first."
Classifier: minimal-like / standard-like / ambiguous (lexicon: `We need`,
`we`, `let me`, marker first lines). Output sanitized — no reasoning text,
no API keys anywhere.

## A. Trigger matrix (V4 Pro, n=2 per cell)

| cell | condition | labels | first tokens | avg we/letMe |
|---|---|---|---|---|
| A1 | minimal + bash/read | 2 minimal-like | We×2 | 1.5 / 0.0 |
| A2 | minimal + full 21 tools | 1 minimal-like, 1 ambiguous | We, The | 0.5 / 0.5 |
| A3 | minimal + 6 file tools | 2 minimal-like | We×2 | 1.0 / 0.0 |
| A4 | minimal + 2 tools + catalog text in user | 2 minimal-like | We×2 | 2.5 / 0.0 |
| A5 | standard persona + 2 tools | 2 ambiguous | The×2 | 0.0 / 1.5 |
| A6 | paraphrased persona + 2 tools | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |
| B1 | minimal + edit | 2 minimal-like | We×2 | 2.0 / 0.0 |
| B2 | minimal + grep | 1 minimal-like, 1 ambiguous | We, The | 0.5 / 0.5 |
| B3 | minimal + glob | 2 minimal-like | We×2 | 1.5 / 0.0 |
| B4 | minimal + work surface (7 tools) | 2 minimal-like | We×2 | 1.5 / 0.0 |
| C1 | promote bash/read → full 21 | first: 2 minimal-like; promoted: 2 ambiguous | We×2; Interesting×2 | promoted letMe 0.0–0.1 |

### Control-plane ablation (n=3, base = minimal + 6 file tools)

| family added | labels |
|---|---|
| subagent / subagent_fork | 2 minimal-like + 1 ambiguous |
| job_list/output/kill | 3 minimal-like |
| create/update/get_goal | 3 minimal-like |
| workflow + skill + exit_plan_mode | **1 minimal-like + 1 ambiguous + 1 standard-like** |
| ask_user_question + web_search | 3 minimal-like |

### Name-vs-description ablation (n=3)

| workflow variant | labels |
|---|---|
| `workflow` + long description ("Run a JavaScript workflow script that orchestrates subagents.") | 2 minimal-like + 1 ambiguous |
| `workflow` + short description ("Run a workflow.") | **3 minimal-like, letMe=0** |
| `execute_workflow` + short description | 2 minimal-like + 1 ambiguous |

## B. Dual-model full matrix (n=2)

V4 Flash: A1–A4 all minimal-like (including full 21-tool catalog), B1–B4 all
minimal-like, C1 promoted ambiguous but letMe=0.0, A5/A6 ambiguous (The).
→ Flash: persona-dominated, catalog-immune, zero transient let-me.

V4 Pro: see §A (catalog-sensitive, control-plane-sensitive, transient
letMe ≤ 0.1).

## C. Phase-transition probe (V4 Pro, 21 points × n=2, 0.05 steps)

Fixed 6-tool surface; persona per mode point. Sanitized per-point labels:

| mode | labels (n=2) | first tokens | we / letMe |
|---|---|---|---|
| 0.00 | 2 minimal-like | We×2 | 1.5 / 0.0 |
| 0.05 | 1 minimal-like, 1 ambiguous | We×2 | 2.0 / 0.5 |
| 0.10 | 2 minimal-like | We×2 | 1.0 / 0.0 |
| 0.15 | 2 minimal-like | We×2 | 1.0 / 0.0 |
| 0.20 | 2 ambiguous | The, We | 0.5 / 1.0 |
| 0.25 | 1 ambiguous, 1 minimal-like | We×2 | 1.0 / 0.5 |
| 0.30 | 1 standard-like, 1 minimal-like | Let, We | 1.0 / 1.0 |
| 0.35 | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |
| 0.40 | 1 minimal-like, 1 ambiguous | We, The | 0.5 / 0.5 |
| 0.45 | 2 ambiguous | The×2 | 0.0 / 1.0 |
| 0.50 | 2 ambiguous | The×2 | 0.0 / 1.0 |
| 0.55 | 1 standard-like, 1 minimal-like | Let, We | 0.5 / 0.5 |
| 0.60 | 2 ambiguous | The×2 | 0.0 / 1.0 |
| 0.65 | 2 ambiguous | The×2 | 0.0 / 1.0 |
| 0.70 | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |
| 0.75 | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |
| 0.80 | 2 ambiguous | (empty), The | 0.0 / 0.5 |
| 0.85 | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |
| 0.90 | 2 ambiguous | The×2 | 0.0 / 1.0 |
| 0.95 | 1 standard-like, 1 ambiguous | Let, The | 0.0 / 1.0 |
| 1.00 | 1 ambiguous, 1 standard-like | The, Let | 0.0 / 1.0 |

Reading: stable spec band [0, 0.15]; phase transition at 0.20; unstable
transition band [0.2, 0.45]; stable react band [0.5, 1.0] — 11 interior
points behave alike (we=0, The/Let).

## D. Recommended-config verification (n=5, V4 Pro)

| cell | labels | letMe avg |
|---|---|---|
| minimal + 7 file tools | **5/5 minimal-like** | 0.0 |
| 7 tools + workflow (short desc) | 3 minimal-like, 1 ambiguous, 1 standard-like | 0.4 |
| 7 tools → promote to full | first 5/5 minimal-like; promoted 5/5 ambiguous (`Interesting`-leading) | 0.1 |

## E. React/spec persona separation (n=3 × 2 models)

| model | spec persona | react persona |
|---|---|---|
| V4 Pro | 3/3 minimal-like, We | 1 standard-like + 2 ambiguous, The/Let, we=0 |
| V4 Flash | 3/3 minimal-like, We | 3/3 ambiguous, The, letMe 1–3, we=0 |

## F. Task–trajectory scores (real sessions)

| run | preset | trajectory | score |
|---|---|---|---|
| Project2 run 1 | minimal (WSL) | minimal-like | 99 |
| Project2 run 2 | minimal (WSL) | minimal-like | 96 |
| Project2 | standard (WSL) | standard-like, letMe=208 | 91 |
| Project2 | PTC/code (WSL) | standard-like | 92 |
| Project2 ×2 | anchored-standard (Win) | minimal-like, letMe 1+0 / 355 blocks | 98, 99 |
| Mario web game | code (PTC) | standard-like, 73万 chars, read:write 2.9:1 | 10/10 |
| Mario web game | anchored-standard | minimal-like, 38万 chars, edit-driven 1:2 | 6/10 |

Mario artifacts: code-mode 2,566-line single-file game + 16.7 KB test harness
(sound 36, fireball 29, power-up 42, coin 83, levels 121); anchored-mode
1,102-line multi-file game (camera 26, invincibility 6; no fireball, coin 17).
Both sessions: zero tool errors.

## G. Router amnesia session (real session, router-standard)

Timeline (sanitized): pwsh list → web_search ×2 → exit_plan_mode → **pwsh
list again + glob** → **web_search ×2 (near-identical queries)** →
ask_user_question (scope). Root cause: early router replaced the whole
section list, dropping the plan-mode section (the harness toggles it per plan
state; source comment: "entering or leaving plan mode changes only the prompt
section"). Fixed: `applyPersona` replaces only the persona section.

## H. Reproducibility

- Probe scripts: `dsh-probe/` (creds from the harness credential store;
  `matrix.mjs`, `run-extra.mjs`, `run-name.mjs`, `run-gradient.mjs`,
  `run-verify.mjs`, `analyze-session.mjs`; all zero-dependency, sanitized).
- Sanitized result JSONs: `dsh-probe/results/`.
- Session exports referenced by hash only in the public record (they contain
  private paths and reasoning text).

## I. P3/P5/P6/P8 — self-routing impossibility and its narrow exception

**P3 (no self-routing, same persona, task swap, n=2)**: persona fixed to spec,
inject a greenfield task after a maintenance task → still `We` (we=5, we=13);
persona fixed to react, inject a maintenance task → still `The`/`Let` (we=0).
Trajectory is fully persona-locked; task content has zero effect.

**P5 (router personas, 3 variants × 2 tasks × n=2)**: instruct, few-shot, and
explicit TASK_TYPE classification personas all produce doer trajectories on
both tasks — the router instruction itself lands in the react attractor.
No task discrimination under any router persona (v1/v2/v3 discrimination ≈ 0).

**P6 (tail persona, n=2)**: persona text at the END of the user message is
ineffective and reversed: tail-spec (neutral system + spec text in user) →
2/2 `Let` (doer) on a maintenance task; tail-react behaves like react. Identity
conditioning is system-position-specific.

**P8 (domain-overlap scan, 8 personas × 2 tasks × n=3)**: task discrimination
(planScore = we − letMe) per persona:

| persona | planScore maint | planScore green | discrimination |
|---|---|---|---|
| neutral | −0.67 | −4.00 | **+3.33** (internal routing, correct direction) |
| spec | +1.00 | +8.00 | −7.00 (anti-routing: green becomes MORE plan) |
| spec-mixed | +1.00 | +7.67 | −6.67 |
| mixed (competition) | −1.00 | −1.00 | 0.00 (no routing, pure trap) |
| react-weak | −1.00 | −1.00 | 0.00 |
| react | −1.00 | −2.33 | +1.33 |
| router-v1 (instruct) | +0.33 | −1.00 | +1.33 |
| router-v2 (few-shot) | 0.00 | −2.33 | **+2.33** (explicit routing works, partial) |

Findings: an internal-routing domain EXISTS, but in the weak-persona region
(neutral, router-v2 few-shot), not in the mixed competition band (which is
discrimination-free). Spec-side personas anti-route (greenfield tasks become
more plan-collective — the measured mechanism behind the 6/10 Mario score).
Routing in the weak domain is a *lean*, not a flip (maint stays near 0, never
reaches spec's +1).

**P2 revisited (score level, fixed assertion)**: gcd+csvSum JS task — spec 5/5,
mixed 5/5, react 5/5 & 4/5. Simple tasks saturate: trajectory differences do
not surface in scores until the task is complex enough (Mario: 10 vs 6).

Design consequence: the only self-routing window is a **weak persona + few-shot
routing instruction + external classifier fallback** (router-v2 style). This
"weak-router" configuration is the candidate for a practical optimum; score
validation on a complex task is the open measurement.

## J. P9 — complex-task score validation (shopping cart, 10 asserts, n=3)

Task: 8-feature cart module (merge/remove/updateQty/discount/coupon/snapshot/
clear/boundary errors), 10 asserts, up to 5 repair rounds. Conditions:
spec(0) / mixed(0.3) / react(1) / weak-router (neutral + few-shot routing
instruction).

| condition | scores | mean | rounds to pass (median) |
|---|---|---|---|
| spec(0.0) | 10, 10, 10 | 10.0 | 3 |
| mixed(0.3) | 10, 10, **0** | 6.7 | 3 (failed run: export shape wrong, never fixed) |
| react(1.0) | 10, 10, 10 | 10.0 | 2 |
| weak-router | 10, 10, 10 | 10.0 | 4 |

Findings: (a) the task is still too easy for trajectory differences to
dominate — three conditions saturate at 10/10; (b) the mixed band shows its
instability at score level: 1 of 3 runs failed outright (5 rounds, wrong
export shape never repaired despite explicit feedback), consistent with the
0.0-discrimination trajectory evidence; (c) weak-router is safe: full score
on a greenfield task, at parity with spec and react (P10 partially
supported); (d) react converged fastest (median 2 rounds vs 3–4), consistent
with the doer attractor's produce-verify loop on build tasks. A harder task
(multi-file, open spec) is needed to amplify score differences.

## K. P8-Flash — domain scan on V4 Flash (n=3)

| persona | planScore maint | planScore green | discrimination |
|---|---|---|---|
| neutral | −0.33 | −2.33 | +2.00 |
| spec | +1.67 | +5.67 | −4.00 |
| spec-mixed | +1.33 | +6.00 | −4.67 |
| mixed (competition) | −0.33 | −3.33 | **+3.00** |
| react-weak | 0.00 | −4.67 | **+4.67** |
| react | −1.00 | −2.67 | +1.67 |
| router-v1 | −1.00 | −3.67 | +2.67 |
| router-v2 | −0.33 | −4.67 | **+4.33** |

Key difference vs Pro: **Flash has NO competition trap** — the mixed band
(+3.00) and react-weak (+4.67) are the STRONGEST routing domains on Flash,
whereas on Pro they measure 0.00. Flash's weaker attractors let task content
penetrate the persona: weak-persona routing is roughly 1.5–2× stronger on
Flash. Spec-side anti-routing exists on both (greenfield tasks become more
plan-collective), but weaker on Flash (−4/−4.67 vs −7/−6.67).

## L. P10 — deep-then-converge scan (V4 Flash, n=3, maxTokens 8192)

| persona | mean reasoning chars | convergence | finish | deep-score |
|---|---|---|---|---|
| spec(0) | 22,168 | 0.67 | tool_calls ×2, length ×1 | 14,779 |
| react(1) | 9,724 | 1.00 | tool_calls ×3 | 9,724 |
| deep1 (think deeply) | **32,514** | **0.00** | length ×3 | **0** |
| deep2 (two-phase) | 31,889 | **0.00** | length ×3 | 0 |
| **deep-react** (react + deep-then-produce) | **18,389** | **1.00** | tool_calls ×3 | **18,389** |

Findings:
- The "thunder thinking, then converge" region EXISTS as a persona:
  **deep-react** — the react persona plus a "think deeply first, then
  produce" sentence — doubles reasoning depth vs plain react (9.7k → 18.4k
  chars) while keeping 100% convergence (finish = tool_calls, never
  budget-truncated).
- **Pure deep-thinking instructions are a trap**: deep1/deep2 reach 32k chars
  (the 8192-token budget) with 0% convergence — "think deeply" alone makes the
  model think to the budget ceiling without acting. Deep thinking MUST be
  paired with an explicit convergence instruction.
- Under max reasoning, the model spends reasoning until the budget is
  exhausted unless the persona anchors "then commit and act" — the budget
  starvation behind "thunder thinking feels bad".
- This is the empirical form of the MoE intuition: the internal
  explore-then-route-then-commit structure is triggerable by the persona
  interval; the binding instruction is the critical ingredient.

## L. Related-task chain (P21, flash, n=3, 8 rounds) — guidance FAILS

Same-file evolution chain (write cart.js → fix total → extend coupon → fix
coupon → extend snapshot → fix remove → extend import → fix clear).
Behavior-truth verdicts: fix = explore-before-produce; extend = produce used.

| variant | route | read continuity | fix rounds |
|---|---|---|---|
| a-baseline (no guidance) | **15/24 (63%)** | 21% | 8/12 (67%) |
| b-boost | 15/24 (63%) | 17% | 6/12 (50%) |
| c-continuity ("read existing code first") | 12/24 (50%) | 13% | 6/12 (50%) |
| d-deep (v12 text) | **11/24 (46%)** | 13% | 6/12 (50%) |

Findings: (a) the 96% of v12/deep-guide holds ONLY for unrelated-task
alternation; related chains collapse to 46-63% — baseline is the best
variant, guidance is NEGATIVE in related tasks (it steers the model toward
classification instead of reading the existing code); (b) read continuity is
13-21% everywhere — models rewrite instead of read-modify; caveat: probe
tool results are information-void fixtures (a real `read` returns content),
which may inflate the skip-read rate, but the guidance-negative effect
(deep 46% < baseline 63%) is real. Related-task chains are an open problem;
real-session feedback is the authoritative test.
