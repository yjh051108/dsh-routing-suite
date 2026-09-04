# optimal — Closed-Loop Protocol Plugin (dsh-closedloop-mode v0.3.3)

> **Rename & retirement note**: this folder was `graded/` (dsh-graded-mode, rc1 era, checklist paradigm) — now **retired**.
> v0.2 replaced the paradigm (the state machine IS the control loop); v0.3 ships as **dsh-closedloop-mode**:
> policy lives in the engine, trajectory emerges from the loop. Command renamed `/graded` → **`/optimal`**.

## Install (uninstall rc1 first)

1. Remove dsh-graded-mode: uninject it if mounted, delete its entry in `~/.dsh/profiles/<profile>/cordis.patch.yml`, and remove its junction under `~/.dsh/profiles/<profile>/node_modules/@dsh-external/`.
2. Install this plugin via `dev_install_package <dir>` (or `dev_inject_plugin` for a hot try, or the packed tgz).
3. Verify: `/optimal status` in a fresh session; a persistent badge appears (grey "无单"/idle when no contract).

## How it works

Slow loop: cost_set (Q_N assertions: text+severity+source; non-goals user-confirmed) → decompose (GROUPS only — no pre-planned block list) → freeze (single lock) → user confirms.
Fast loop: engine injects a minimal state face (residual / Q_N / closed set) → model proposes the move minimizing cost-to-go → differential declare → implement → converge (strict ΔV drop × non-homologous recompute × ≥2 channels) → closed. Group settle is a mechanical gate; redteam actions are audited by a FRESH subagent reading the raw ledger file (verbatim-quote verification). Terminal check is the single throw point.
Mid-course corrections ("修改") are accepted in every resting stage — the ledger of closed work is never rewritten.

See docs/THEORY-v0.3-closedloop.md (Theorem 7: policy/trajectory separation).
