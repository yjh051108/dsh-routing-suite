# dsh-routing-suite — Injector × Reasoning-Mode Routing Suite

One repository for the full stack: the **runtime surgery table** (dsh-super-injector,
restart-free plugin management) plus the **reasoning-mode routing presets**
(dsh-router-standard: task-aware reasoning-mode routing) and the **mode-boost
plugin** (measured performance lifts on top of official presets).

[中文](README.md) | English

## Install chain (three steps)

```powershell
# 1. Clone the suite (includes three submodules)
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. One-shot install (injector assembly + preset copy + restart prompt)
# -ExecutionPolicy Bypass applies only to this PowerShell process; it does not change the system policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

`install.ps1` is encoded as UTF-8 with BOM for compatibility with Windows
PowerShell 5.1 when the script contains non-ASCII text. PowerShell 7 users can
also run `pwsh -File .\install.ps1` directly.

The one-shot installer stops with an actionable error if `dsh` is unavailable
or `injector/lib/index.js` has not been built. It reports completion only after
the injector and both routing presets have been installed successfully.

Or manually:

```powershell
# Step 1: assemble the injector (official assembly; bundles take over after restart)
dsh plugin --profile web add .\injector

# Step 2: install the router presets (one or both)
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\preset\router-standard $target

$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-spec'
Copy-Item -Recurse .\preset\preset\router-spec $target

# Step 3: restart DSH → pick Router Standard / Router Spec in a new session
```

## Components

| Path | Repo | Version | Role |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | Runtime injector: dev_* tool family (inject / hot-reload / staging-promote / uninject / route self-heal) |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | Reasoning-mode routing presets: router-standard (RL-interface restoration) / router-spec (deep-think-first) / router-pro (V4 Pro measured optimum) |

> Versions follow each component repo's git tag (links go to the matching Release).

The two components evolve independently (submodules point at each repo's
`main`); the suite aggregates the install chain and the overview.

## router-standard preset capabilities (P1–P23 measured summary)

- **Three behavior bands + weak internal routing**: spec (plan-collective) / react (doer) / mixed (trap, avoided) / weak (model self-classifies)
- **Model-matched persona**: Pro = spec sentence + few-shot (discrimination +5.0); Flash = neutral + classify (+5.7)
- **Near-field guidance**: fixed guidance after every real user message (cache 92–94% hit), routing 96% + convergence 100% + anti-dilution
- **Single-task three anchors** (persona-static): recall + converge + anti-runaway — open-task completion 0% → 100%
- **plan-mode preserved**: only the persona section is replaced; plan boundaries never lose focus
- **AI self-optimization tools**: `dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## Router Pro (v0.3.0) highlights

- V4 Pro measured-optimal routing: maintenance → RL interface (anchored-standard 98/99), build → doer (Mario 10/10), no-evidence → weak (router-v2 few-shot, discrimination +2.6 n=10)
- **Decision-closure loop** (all-branch near-field guidance): black-hole reasoning 58K→27K (2.1× curbed) with 100% action — **no budget cap**
- Competition band [0.03, 0.455] never touched (E2 matrix: 9/12 anti-routing, peak −10.6)
- Model split: Pro = router-v2 few-shot + decision closure; Flash = w7 + commit guidance

## Docs

- Injector guide (10 rules): `injector/README.md`
- Routing preset paper & experiments: `preset/docs/paper.md` + `preset/docs/experiments.md` (P1–P23), `preset/docs/paper-pro.md` (V4 Pro)

## License

MIT. Credits: xiaobright/modeltest (V4.1b evaluation), xiaobright/dsh-anchored-standard (anchoring mechanism).

