# dsh-routing-suite — Injector × Reasoning-Mode Routing Suite

One repository for the full stack: the **runtime surgery table** (dsh-super-injector,
restart-free plugin management) plus the **reasoning-mode routing presets**
(dsh-router-standard: task-aware reasoning-mode routing).

[中文](README.md) | English

## Install chain (three steps)

```powershell
# 1. Clone the suite (single repo: injector/preset content is stored directly, no submodules)
git clone https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. One-shot install (injector assembly + preset copy + layout self-check + restart prompt)
.\install.ps1
```

Or manually:

```powershell
# Step 1: assemble the injector (official assembly; bundles take over after restart)
dsh plugin --profile web add .\injector
# If dsh is not on PATH (npx @deepseek-ai/dsh web): npx '@deepseek-ai/dsh' plugin --profile web add .\injector

# Step 2: install the router presets (one or both; DSH scans one level only,
# so each preset directory must sit FLAT under .agent-presets)
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\router-standard $target

$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-spec'
Copy-Item -Recurse .\preset\router-spec $target

# Step 3: restart DSH → pick Router Standard / Router Spec in a new session
```

> Do NOT copy the `preset` directory as a whole — the extra nesting hides the
> presets from DSH discovery.

## Components

| Path | Repo | Version | Role |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | Runtime injector: dev_* tool family (inject / hot-reload / staging-promote / uninject / route self-heal); git installs build automatically (prepare hook) |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0 … mainline v1.19.1/v34](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | Reasoning-mode routing presets: router-standard (classified persona + full sections) / router-spec (deep-think-first). router-pro is planned but NOT part of v0.3.0 |

> Versions follow each component repo's git tag (links go to the matching Release).

The two components now evolve together with this repository (`injector/` and
`preset/` are ordinary directories whose contents are committed directly); the
standalone upstream repos `dsh-super-injector` / `dsh-router-standard` stay for
independent releases and may later become mirrors/archives. The preset install
directory is `preset/router-standard` (flat, no extra nesting).

## router-standard preset capabilities (P1–P23 measured summary)

- **Three behavior bands + weak internal routing**: spec (plan-collective) / react (doer) / mixed (trap, avoided) / weak (model self-classifies)
- **Model-matched persona**: Pro = spec sentence + few-shot (discrimination +5.0); Flash = neutral + classify (+5.7)
- **Near-field guidance**: fixed guidance after every real user message (cache 92–94% hit), routing 96% + convergence 100% + anti-dilution
- **Single-task three anchors** (persona-static): recall + converge + anti-runaway — open-task completion 0% → 100%
- **plan-mode preserved**: only the persona section is replaced; plan boundaries never lose focus
- **AI self-optimization tools**: `dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## v0.3.0 changes (real-assembly-chain fixes)

- **First-turn routing actually works** ([#13](https://github.com/yjh051108/dsh-routing-suite/issues/13)): the first real user message is captured via `agent/inbox/claimed` BEFORE assembly, so the first request is classified (previously every session's first request was unconditionally weak)
- **Near-field guidance moved to `agent/pre-step`** ([#34](https://github.com/yjh051108/dsh-routing-suite/issues/34)/[#36](https://github.com/yjh051108/dsh-routing-suite/issues/36)/[#55](https://github.com/yjh051108/dsh-routing-suite/issues/55)): the guide now rides the SAME request as the user message — reachable on the real chain, and it no longer manufactures a second API call per user message (the 2× cost spike)
- **Missing imports** ([#11](https://github.com/yjh051108/dsh-routing-suite/issues/11)), preset.yml YAML quoting ([#53](https://github.com/yjh051108/dsh-routing-suite/issues/53)), full sections after promotion ([#44](https://github.com/yjh051108/dsh-routing-suite/issues/44)), install script & docs fixes ([#35](https://github.com/yjh051108/dsh-routing-suite/issues/35)/[#42](https://github.com/yjh051108/dsh-routing-suite/issues/42)/[#41](https://github.com/yjh051108/dsh-routing-suite/issues/41)), injector git-install auto-build ([#40](https://github.com/yjh051108/dsh-routing-suite/issues/40))

## Docs

- Injector guide (10 rules): `injector/README.md`
- Routing preset paper & experiments: `preset/docs/paper.md` + `preset/docs/experiments.md` (P1–P23)

## License

MIT. Credits: xiaobright/modeltest (V4.1b evaluation), xiaobright/dsh-anchored-standard (anchoring mechanism).
