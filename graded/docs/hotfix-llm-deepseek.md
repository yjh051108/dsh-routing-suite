# hotfix: llm-deepseek 消息 content 归一化（2026-09-01）

## 背景
`/compact` 与自动压缩 100% 失败：`compaction/end error: "DeepSeek API stream from https://api.deepseek.com failed"`（TRANSPORT）。
直连探针全部正常（key/模型/875k+ 输入/流式/reasoning/超限/harness 头/node fetch 均成功）。

## 根因（插桩实证）
`[ds-probe] TRANSPORT cause: TypeError: content.some is not a function` → 修一次后：
`blocks.filter is not a function` — 压缩器重放的历史消息中 **content 不是数组**（字符串/缺失），
而 `@deepseek-ai/dsh-llm-deepseek` 的 `contentHasImage()`/`flattenText()` 假设数组 → TypeError → 被包装成 TRANSPORT（假网络错误）。

## 修复（node_modules 内,升级 DSH 后需重打）
`dsh-llm-deepseek/lib/index.js` 的 `streamWithConnection()` 入口：
将 messages 的 content 统一归一化为 text 块数组（`[{"type":"text","text":...}]`），
非数组 content（string/null/其他）→ 文本块；`[zcode-hotfix]` 注释标记。

连带：`assertTextOnly`/`assertSupportedImageRoles`/`hasImages` 三处加 `Array.isArray` 容错（double-guard）。

## 验证
UI `/compact` → `compaction/summary` + `compaction/end OK` + `command/done success`（Compacted 2224 history items）。
