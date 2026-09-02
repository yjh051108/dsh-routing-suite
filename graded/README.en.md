# dsh-graded-mode v0.0.1-exp (Graded Mode)

Session-level two-level task protocol plugin for DSH. **One-shot trigger; untouched = stock behavior** (zero tool registration, zero injection).

> Full docs (Chinese with embedded English sections): [README.md](README.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [THEORY](docs/THEORY.md) · [DATA](docs/DATA.md) · [STUDY](docs/STUDY.md) · [VERIFIABILITY](docs/VERIFIABILITY.md)

## Fit & Cost (read this first)

**This plugin is not a universal workflow — it only raises the ceiling for one kind of task: non-repeating, multi-increment, long-chain, high-coupling.** Wrong scenario = net loss.

| Scenario | Verdict | Notes |
|---|---|---|
| One-shot single artifact (pelican test, single HTML file, one-off art) | ❌ Not recommended | Success depends on the **model's own weight capability/knowledge** — process cannot close knowledge gaps; you pay full-chain overhead for one shot |
| Repeating light task | ❌ Not recommended | Overhead > benefit |
| Multi-increment long chain (staged 3D build, plugin development, chaptered docs, cross-session engineering) | ✅ Meaningful gains | Every item verified + checked in; gates & redteam prevent later steps from breaking earlier ones |

**Cost transparency (measured)**: graded mode costs **~20x tokens vs non-graded** (per-item spec injection / review / verification guidance / gate round-trips — the process cost, not waste). **Default low-cost config** (panel ⚙): conceptLimit=3 (raise to 5-8 for big-capacity models) · verifyMode=auto (switch to self-redteam / subagent when needed). **Rule of thumb**: if the task fits "a couple of conversations", run bare.

## Quick start

```
/graded <task>            # trigger (or /graded off; model may self-enter via commit_star)
```

Chain: brainstorm quiz → commit_star → L1 spec (group spec/accept/verify) → lock → L2 spec (item spec/accept/do/verify/mode) → lock (spec sheet receipt) → review (single confirm) → spec-driven injection → check-in → group close-out (per-criterion review + redteam gate) → final check.

## Tools (6)

commit_star · edit_plan · lock_stage · mark_task · redteam_verdict · revise_do

## Tests

`npm install && npm test` — 62/62 (mode-state / tools / inject-text).

## License

Apache-2.0 (see LICENSE).
