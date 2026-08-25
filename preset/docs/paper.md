# Dual-Attractor Behavior Policies and Task-Aware Routing

**Phase transitions in reasoning-mode conditioning of DeepSeek V4 Pro, and a
router that exploits them**

*Community research artifact. Not affiliated with DeepSeek. All measurements
were made through the official API with `thinking.enabled` and
`reasoning_effort=max` on fixed micro-tasks; Project2 numbers come from
[xiaobright/modeltest](https://github.com/xiaobright/modeltest) (V4.1b,
frozen, personal harness).*

---

## Abstract

We report a measurable property of a frontier reasoning model (DeepSeek V4
Pro): its agent behavior along a *persona axis* — from a plan-first
"specification" condition to a doer "reactive" condition — is **not
continuously tunable**. Fine-grained probing (21 mode points, n=2) shows the
behavior collapses into three bands: a stable react region (0–0.19) — the stable-we attractor (RL condition), an
unstable transition band (0.2–0.49), and a stable spec region (0.5–1.0) — the let-me/self-routing attractor
whose 11 interior points behave identically. The same model scores 99/96
under the react condition on a maintenance benchmark and 10/10 under the spec
condition on a greenfield build task, while the wrong condition scores 91 and
6 — a roughly ten-point swing caused by prompt conditioning alone, which
users experience as "god/ghost duality". We interpret this as a
**dual-attractor behavior policy**: post-training aligned two specialist
scaffolds (a minimal "exact RL prompt and schemas" condition and a code-mode
doer condition); intermediate prompts fall into the training-distribution
gap, hence the unstable band. Because behavior is also *path-committed* (an
anchored trajectory survives a later tool-catalog expansion with at most one
perturbed reasoning block), the model cannot self-route — mode selection must
come from outside. We present **router-standard**, a task-aware agent preset
that classifies the first user message, injects the persona of the correct
stable band plus a first-turn core tool set, and exposes the full catalog
after the first durable tool call. The transition band is never selected
automatically. The design and all raw statistics are open.

## 1. Introduction

Agent harnesses condition models with a system prompt and a visible tool
catalog. Empirically, the *first request* of a session is decisive: the model
commits to a trajectory, and later changes to the conditioning (e.g. a wider
tool catalog) perturb at most one reasoning block before the original
trajectory reasserts itself. Prior work in the same benchmark program showed
that the official "minimal" preset — one system sentence and two tools, which
the harness's own snapshot test calls *"the exact RL prompt and schemas"* —
outperforms the full Standard preset on a maintenance task by a wide margin
(99/96 vs 91), and that a two-phase preset (minimal bootstrap, then the full
catalog) recovers the same band while keeping all tools (98/99).

This paper adds three findings:

1. **The axis is not a continuum.** Along the persona axis there is a phase
   transition and an unstable band. Continuous "knob" interfaces are an
   illusion at the behavior layer; quantization to stable bands is the honest
   design.
2. **The duality is symmetric.** The same model that is "god" under spec
   conditions on a maintenance task is "ghost" under those conditions on a
   greenfield build task, and the reverse holds: a doer condition scores 10/10
   where the react condition scores 6. Conditioning, not capability, swings the
   score.
3. **Self-routing is impossible for the model.** Behavior is path-committed
   and phase-transitional; there is no mechanism inside the policy for
   switching modes mid-session. External routing is therefore *necessary*, and
   we provide an automated one.

We release **router-standard** — a DeepSeek Harness preset implementing
task-aware, three-band routing with agent-visible tuning tools.

## 2. Background and related work

**Agent scaffolds and RL alignment.** Frontier models are post-trained in
agentic loops over fixed tool protocols. A harness condition that matches the
training distribution activates a specialist policy; one that does not leaves
the model in an out-of-distribution state with degraded behavior. DeepSeek
Harness's official `minimal` preset is a documented instance of the training
condition: its snapshot test asserts that it sends "the exact RL prompt and
schemas" — one sentence, two tools, `complete: true`, runtime context
suppressed.

**Prompt sensitivity of reasoning models.** Reasoning traces are conditioned
by system text; the lexicon of traces (collective "We need" vs first-person
"Let me") is a fingerprint of the scaffold, not a measure of capability. A
control model (V4 Flash) changes its trace style wholesale under the same
prompt swap while its score does not move, proving the lexicon is a
conditioning artifact.

**Two-phase anchoring.** [dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard)
bootstraps the first request with the minimal condition and expands the tool
catalog after the first durable tool call (Project2: 98/99, worst 98; two
runs, `let me` total 1/355 reasoning blocks).

## 3. Theory: dual-attractor behavior policies

We propose the following model, which is consistent with all measurements
below.

**Assumption A1 (dual scaffolds).** Post-training aligned at least two
behavioral attractors, realized as prompt distributions: a *spec* attractor
(plan-first, collective, read-first; the minimal condition) and a *react*
attractor (doer, first-person, write-first; the code-mode condition). Each
attractor is a local optimum of the policy over prompt space: within its
basin, the model's behavior is stable and strong.

**A2 (out-of-distribution gap).** Between the basins, prompt configurations
the training never sampled (e.g. the spec sentence plus half a doer
instruction) place the policy in the distribution gap. Behavior there is
high-entropy: the model randomly mixes trajectories of both attractors.
Predictions: (P1) an unstable, mixed band exists between the stable bands;
(P2) scores under the mixed condition are *lower* than under either stable
condition on any task.

**A3 (path commitment).** The policy conditions on the full conversation, so
after the first request the trajectory is strongly anchored: later changes to
the tool catalog perturb at most one reasoning block, then the original
trajectory reasserts (measured). Consequently the mode of a session is
effectively fixed by the first request, and the model has no internal
mechanism to switch modes mid-session — **self-routing is impossible by
construction**.

**A4 (conditioning dominance).** On a fixed task, the score difference
between the two stable conditions can exceed the difference between models in
the same band. "God/ghost duality" — the same model scoring 99 on one task and
6 on another under *different* conditions, while each condition is the
stronger one on *its* task — follows directly from A1: each attractor is a
specialist, and neither generalizes across task families.

## 4. Method: router-standard

**Preset.** A full Standard composition (rc.6) plus a router plugin row
(`./router-bootstrap.mjs`). The persona row is a non-complete fallback; the
router owns the actual persona.

**Classification.** The first `user/message` is classified by keyword counts
into one of the two stable bands (`react` if net react keywords > 0, else
`spec`). The transition band is never selected automatically.

**First-request injection.** On the first assembly (no durable `tool/call`
yet), the router:
- replaces **only the persona section** (`applyPersona`): all other sections —
  above all the plan-mode section, which is toggled per plan state by the
  harness and carries the plan-boundary instructions — are preserved. We
  measured that dropping the plan-mode section makes the model "ignore" plan
  mode and, after `exit_plan_mode`, re-explore the repository it had already
  inspected (duplicate searches, duplicate directory listings): an
  "amnesia" artifact caused by the router, now fixed by construction;
- filters the visible tools to the band's core set (spec: read-first;
  react: write-first; shell always included);
- clears runtime contexts (spec parity).

After the first durable `tool/call`, the full catalog is exposed; the persona
stays constant for the session (no fallback regression).

**Agent-visible tuning.** `dev_router_status` reports mode, band, persona,
core tools and override state; `dev_router_mode` accepts band names, 0–100,
0.0–1.0, or `auto`. Numeric inputs quantize to the three bands — the interface
is honest about the measurement.

**Band quantization.** `bandOf(mode)`: spec for mode < 0.2, mixed (transition)
for 0.2 ≤ mode < 0.5, react for mode ≥ 0.5. Personas: three fixed texts
(spec sentence; spec sentence + "work directly" + "verify by reading/running";
full doer text with test-ceremony suppression).

## 5. Experiments

All probe requests: official API, `thinking: {type:'enabled'}`,
`reasoning_effort: 'max'`, max_tokens 1024, fixed micro-task ("inspect the
repository, then locate and read the README"). Lexicon classifier: minimal-like
(`We`-leading, we>0, let-me=0), standard-like (`Let me`-leading), else
ambiguous. API keys came from the harness's own credential store; outputs
were sanitized (no reasoning text, no keys).

### 5.1 Trajectory trigger matrix (V4 Pro, n=2 per cell)

| condition | result |
|---|---|
| minimal persona + bash/read | 2/2 minimal-like |
| minimal persona + full 21-tool catalog | 1 minimal-like + 1 ambiguous |
| minimal persona + 6 file tools | 2/2 minimal-like |
| minimal persona + catalog text in user message | 2/2 minimal-like (no effect) |
| standard persona + 2 tools | 2/2 ambiguous |
| paraphrased persona + 2 tools | 1 ambiguous + 1 standard-like |
| +edit / +grep / +glob / +7-tool work surface | stable minimal-like (grep/glob noisy at n=2) |
| control-plane families (jobs/goals/interact) | 3/3 minimal-like each |
| workflow/skill/plan family | 1 minimal-like + 1 ambiguous + **1 standard-like** |
| workflow long description | 2/3 minimal-like |
| workflow short description ("Run a workflow.") | **3/3 minimal-like** |
| renamed workflow (execute_workflow) + short description | 2/3 minimal-like |

Findings: persona is the dominant trigger; the *schema surface* (not catalog
text) is a secondary condition; within the minimal persona, control-plane
tools — above all `workflow`/`skill`/plan — and long descriptions perturb,
while file tools do not. Description semantics are a per-tool perturbation
variable (short descriptions are the safe line).

### 5.2 Dual-model matrix (V4 Flash vs V4 Pro, n=2)

| dimension | flash | pro |
|---|---|---|
| persona switch | extreme (100% `We` under minimal; The/ambiguous otherwise) | strong |
| tool-catalog sensitivity | **zero** (full 21-tool catalog stays 2/2 minimal-like) | sensitive (1/2 perturbed) |
| promote transient | `Interesting`-leading, let-me = 0 | `Interesting`-leading, let-me ≤ 0.1 |
| control-plane sensitivity | n/a (catalog-insensitive) | strong (`workflow` family) |

Flash's trajectory is persona-determined and catalog-immune ("converges
fast"); Pro is catalog-sensitive ("converges slower") — consistent with a
wider basin structure for Pro and a narrower one for Flash.

### 5.3 Phase-transition probe (V4 Pro, 21 points × n=2)

Mode points 0.00–1.00 in 0.05 steps; persona per point; fixed 6-tool surface.
Collapsed behavior:

- 0.00–0.15: 9/10 minimal-like, `We`-leading, let-me ≈ 0 — **spec band**;
- 0.20: first react fragment activates → `We` trajectory lost — **phase
  transition**;
- 0.20–0.45: mixed `We`/`The`/`Let`, unstable labels — **transition band**
  (P1 confirmed);
- 0.50–1.00: 11 points behave alike: we=0, `The`/`Let`, let-me ≈ 0.5–1 —
  **react band** (the axis is not continuous; the "knob" has three positions).

### 5.4 Path commitment (promote-keep, n=2–5)

First request: bash/read (or 7-tool surface) → second request: full 21-tool
catalog. First requests are 5/5 minimal-like; promoted requests show at most
one transient block (`Interesting`/`Let me`, ~50% probability), then the
anchored trajectory persists; `let me` total ≤ 0.1 per promoted request.
Trajectory survives catalog expansion (A3 confirmed).

### 5.5 Task–trajectory adaptation (scores)

| task family | react condition (RL/we) | spec condition (doer/let-me) |
|---|---|---|
| maintenance (Project2, V4.1b) | minimal 99/96, anchored 98/99 | standard 91, PTC 92 |
| greenfield build (Mario web game) | anchored 6/10 | code (PTC) **10/10** |

The greenfield build under code mode produced a 2,566-line single-file game
(read:write ratio 2.9:1, verification-driven) with a 16.7 KB test harness;
under the react condition the same task produced a 1,102-line multi-file game
with a 1:2 read:write ratio (edit-driven, no tests). Both sessions had zero
tool errors — the score gap is a conditioning effect, not a failure artifact
(A4 confirmed; P2 for the mixed band remains an open measurement).

### 5.6 Router amnesia root cause (session analysis)

An early router version replaced the *entire* section list with its persona,
silently dropping the harness's plan-mode section. In a real session the
model then (a) "ignored" plan mode, and (b) after `exit_plan_mode` re-explored
the repository it had already inspected: duplicate `pwsh` directory listings,
duplicate near-identical `web_search` queries, and a late scope question to
the user. The harness's own source documents that entering/leaving plan mode
changes *only* the prompt section — the fix (replace only the persona section)
restores the plan boundary and the "proceed per approved plan" instruction.

## 6. Discussion

**God/ghost duality is routing, not sampling.** The ~10-point swings in §5.5
are deterministic consequences of conditioning (both sessions had zero tool
errors). Users who perceive "the same model is sometimes god, sometimes
ghost" are observing which attractor the harness happened to invoke.

**Continuity is a user-interface illusion.** The behavior layer has a phase
transition; continuous tuning interfaces should quantize. We keep the numeric
API for compatibility but document the three bands.

**Limitations.** n is small (2–5 per probe cell; two task families for
scores); the classifier is keyword-based (a learned router is future work);
the transition band's score penalty (P2) is not yet measured on a complex
task — simple tasks saturate (spec/mixed/react all 5/5); P9 (complex-task
score comparison) is partially run and needs its harness fixed (module
resolution + connectivity) before conclusions; V4 Flash and V4 Pro differ in
basin structure, so results do not transfer blindly; the trajectory lexicon
is a fingerprint, not an identity proof.

**Self-routing: impossibility and its narrow exception.** P3 (persona fixed,
task swapped mid-session → trajectory unchanged, n=2), P5 (three router
personas, all absorbed by the doer attractor, n=2) and P8 (domain-overlap
scan, 8 personas × 2 tasks × n=3) locate the only internal-routing window: a
**weak persona** (neutral system, or neutral + few-shot routing instruction)
where task content leans the trajectory in the correct direction
(discrimination +3.3 / +2.3). The lean is partial — maintenance scores stay
near zero, never reaching the react attractor's +1. The mixed competition band
is discrimination-free (0.0). Spec-side personas anti-route: greenfield tasks
become MORE plan-collective (planScore +8), the measured mechanism behind the
6/10 anchored Mario score. Self-routing therefore exists only as a
weak-domain lean, not a reliable switch — external routing remains required,
and a "weak-router" (weak persona + few-shot instruction + external
classifier fallback) is the candidate practical optimum. Mid-session mode
changes are not viable: persona switches invalidate the whole prefix cache,
tail personas are ineffective (P6: tail-spec produces doer trajectories), and
the native subagent inherits the session persona — the working mechanism is
mode isolation (fresh context, own system prompt; `dev_mode_subagent`).

**Predictions open for testing.** (P2) mixed-band scores are lower than both
stable bands on a complex task; (P4) dual-attractor structure transfers to
other frontier models with documented scaffold training; (P10) weak-router
scores at least as well as the best stable band on both task families.

**Deep-then-converge: the MoE intuition, measured (P10, Flash, 8192 budget).**
A single-turn scan (5 personas × n=3) finds the "thunder thinking, then
converge" interval: **deep-react** — the react persona plus "think deeply
first, then produce" — doubles reasoning depth vs plain react (9.7k → 18.4k
chars) at 100% convergence (finish = tool_calls, never budget-truncated).
Pure deep-thinking instructions are a trap: "think deeply" alone reaches the
8192-token budget (32k chars) with 0% convergence. Under max reasoning the
model spends its entire budget unless the persona anchors "then commit and
act" — the budget starvation behind the "thunder thinking feels bad"
experience. This is the empirical form of the MoE intuition: the internal
explore-then-route-then-commit structure is triggerable by a persona
interval, and the binding instruction is the critical ingredient. The Flash
domain scan (P8-F) also shows no competition trap on Flash (mixed +3.00,
react-weak +4.67) — Flash's weaker attractors let task content through,
making weak-persona routing 1.5–2× stronger than on Pro. The Pro
deep-converge scan is running (max-reasoning Pro is slow) and will be added
on completion.

## 7. Conclusion

Frontier reasoning models can host multiple specialist behavior policies
selected by the first-request conditioning. The selection is discrete and
path-committed, the gaps between the specialists are unstable, and the model
cannot route itself. External, task-aware routing — human or automated — is
therefore not an optimization but a requirement. router-standard implements
this routing for DeepSeek Harness with measured bands, honest quantization,
and agent-visible tuning; the code, tests, and data are open.

## References

1. DeepSeek Harness, official repository (agent presets; `minimal-preset.snapshot.ts`: "sends the exact RL prompt and schemas").
2. xiaobright/modeltest — Project2 V4.1b evaluation harness (frozen) and DeepSeek V4 Pro harness analysis (2026-08-14).
3. xiaobright/dsh-anchored-standard — two-phase minimal-bootstrap preset (MIT), Project2 98/99.
4. DeepSeek-V4-Pro model card (Hugging Face): domain specialists and unified on-policy distillation.

## Appendix: data

Full per-cell tables, session fingerprints, and sanitized result JSONs are in
`experiments.md` and the `results/` directory of the probe harness
(`dsh-probe`). All statistics are reproducible from the public probe scripts
against any API key with `reasoning_effort=max`.
