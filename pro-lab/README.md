# dsh-pro-lab

An opt-in experiment and evidence plugin for DeepSeek V4 Pro sessions.

The default arm is `standard`. It observes the request route and session events but does not change the assembled prompt or tool catalog. Flash and unknown models are not automatically modified. A non-standard arm must be selected before the first model request with `dev_pro_lab_mode` and is then locked for the session.

OpenCode Go Flash is classified as `opencode-go-flash-quantized`, a separate evidence population. It must not be pooled with official DeepSeek Flash or used as a Pro baseline: a small quantization loss can look like a routing or prompt regression if the provider populations are mixed.

## Controls

| Tool | Purpose |
| --- | --- |
| `dev_pro_lab_mode` | Select one arm before the first request |
| `dev_pro_lab_status` | Inspect the sanitized state and invalid-run reasons |
| `dev_pro_lab_export` | Write the current trace and summary as JSONL |

Supported arms are `standard`, `anchored`, `prompt-only`, `schema-only`, `injection-suppressed`, `promote-on-tool`, `promote-on-assistant`, `zero-tool`, `whoami`, and `warmup`.

For a clean first-request comparison, set `DSH_PRO_LAB_ARM=anchored` before starting DSH (replace `anchored` with another arm). A first user message exactly `/v4 lab anchored` is also recognized. The `dev_pro_lab_mode` tool is useful only before assembly in an externally prepared session; after the first assembly the arm is immutable.

The first request evidence contains provider/model, max token setting when visible, ordered tool names, tool count, schema fingerprint, prompt-section shape, and context count. Later events contribute turn/step/tool/error counts and request/header snapshots. Tool arguments, prompt text, reasoning text, message content, and secrets are intentionally excluded.

The process-wide append-only trace is `$DSH_HOME/pro-lab/sessions.jsonl`. `dev_pro_lab_export` writes a per-session JSONL file with a final `summary` record. Evidence writes are best-effort and never fail a user request.

## Validity rules

An experiment is marked invalid when the first header disagrees with the first assembled schema, a bootstrap arm exposes more than two tools, a zero-tool arm exposes any tool, contexts are not suppressed when requested, more than one schema transition occurs, or multiple known prompt writers are visible in the same assembly.

These checks are diagnostics, not a quality score. Use acceptance criteria such as tests/build success, contract completion, reasonable diff, final verification, and absence of repeated/dead-end tool loops when comparing arms.

## Development

```powershell
npm test
```

The plugin has no runtime dependencies beyond the DSH/Cordis host. It is a plain ESM package so the suite can install it directly with `dsh plugin --profile web add .\pro-lab`.
