# dsh-routing-suite — Injector × Reasoning-Mode Routing Suite

One repository for the full stack: the **runtime surgery table** (dsh-super-injector,
restart-free plugin management) plus the **reasoning-mode routing presets**
(dsh-router-standard: task-aware reasoning-mode routing) and the **mode-boost
plugin** (measured performance lifts on top of official presets).

[中文](README.md) | English

## Install chain (three steps)

```powershell
# 1. Clone the suite (includes core submodules + Oh-My-DSH catalog)
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. One-shot install (injector assembly + preset copy + restart prompt)
.\install.ps1

# Optional: install curated high-star DSH plugins
.\plugins\install.ps1
```

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
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [main](https://github.com/yjh051108/dsh-router-standard) (v0.2.0 + 2026-08-16 corrections) | Reasoning-mode routing presets: router-standard (RL-interface restoration) / router-spec (deep-think-first); latest main includes the important correction notice and Pro direction updates |
| `mode-boost/` | [dsh-mode-boost](https://github.com/yjh051108/dsh-mode-boost) | [v0.1.0](https://github.com/yjh051108/dsh-mode-boost/releases/tag/v0.1.0) | Mode-boost plugin: deep-persona convergence lift / boost reclassification guidance / depth-adaptive dispatch (host-plane, mounts on top of official presets) |
| `catalog/oh-my-dsh/` | [Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH) | main (auto-synced) | DSH plugin aggregator / complete catalog: 1200+ curated entries, auto-synced from the dsh-plugin topic |
| `plugins/` | curated in this repo | — | High-star DSH plugin picks (`popular.json`) + one-click installer (`install.ps1`) |

> Versions follow each component repo's git tag / main (links go to the matching repo or Release).

The core components evolve independently (submodules point at each repo's
`main`); the suite aggregates the install chain, the catalog, and curated picks.

## router-standard preset capabilities (P1–P23 measured summary)

- **Three behavior bands + weak internal routing**: spec (plan-collective) / react (doer) / mixed (trap, avoided) / weak (model self-classifies)
- **Model-matched persona**: Pro = spec sentence + few-shot (discrimination +5.0); Flash = neutral + classify (+5.7)
- **Near-field guidance**: fixed guidance after every real user message (cache 92–94% hit), routing 96% + convergence 100% + anti-dilution
- **Single-task three anchors** (persona-static): recall + converge + anti-runaway — open-task completion 0% → 100%
- **plan-mode preserved**: only the persona section is replaced; plan boundaries never lose focus
- **AI self-optimization tools**: `dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## Ecosystem integration: high-star plugins + full catalog

- **Full catalog**: `catalog/oh-my-dsh/` is the [Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH)
  aggregator submodule, auto-syncing 1200+ curated entries from the `dsh-plugin`
  topic — start at [`catalog/oh-my-dsh/PLUGINS.md`](catalog/oh-my-dsh/PLUGINS.md).
- **High-star picks**: `plugins/` collects the most-starred, DSH-specific plugins
  with a machine-readable manifest (`popular.json`) and one-click installer
  (`install.ps1`) — start at [`plugins/README.md`](plugins/README.md).


## Latest preset main update (2026-08-16)

- The router-standard repo now carries an **important correction notice**: the
  dual-attractor theoretical explanation is marked superseded; the measured
  fault-line/routing-layer interpretation and the Pro direction are documented
  in `preset/README.md` / `preset/docs/`.
- The measured P1–P23 router capabilities above remain the practical summary.

## Docs

- Injector guide (10 rules): `injector/README.md`
- Routing preset paper & experiments: `preset/docs/paper.md` + `preset/docs/experiments.md` (P1–P23)
- High-star plugin picks & installer: `plugins/README.md`
- Full plugin catalog: `catalog/oh-my-dsh/PLUGINS.md`

## License

MIT. Credits: xiaobright/modeltest (V4.1b evaluation), xiaobright/dsh-anchored-standard (anchoring mechanism).
