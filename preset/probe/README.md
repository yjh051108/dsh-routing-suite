# probe/ — 路由预设实验现场（历史档案）

> 这里存放 routing 预设研发过程中的**实验脚本与方法论文档**。
> ⚠️ **性质：历史实验快照，非活跃代码。** 脚本中的跨模块相对路径（如
> `../router-standard/preset/router-core.mjs`、`../../mode-boost/lib/core.js`）
> **已失效**——当前源码已改名为 `router-core-v34.mjs`（版本线），`mode-boost`
> 目录也已不在仓库中。这些脚本是某个时间点跑出来存档的结果集，**保留用于查阅
> 实验方法论，不保证当前可运行**，也不做依赖修复。

## 目录结构

```
probe/
├── run-*.mjs                # 实验运行脚本（110 个）：驱动一次实验（logprobs 扫描/代理/评测）
├── analyze_*.py / gen_*.py  # 分析与生成脚本（28 个）：清洗、聚合、生成候选池
├── *_pool-*.py              # curated 池版本（a/b/c/d），用于精选注入候选
├── cot-lexicon.md           # CoT 词汇表（研究笔记）：优秀 vs 极差思维链词汇
├── deepseek-v4-pro-weights/ # [gitignore] 模型权重/行为分析（~5.2GB，可重新获取）
├── dsh-2020-dataset/        # [gitignore] 数据集（~283MB）
├── deepseek-tokenizer/      # [gitignore] tokenizer 权重（~7.5MB）
├── results/                 # [gitignore] 实验结果（log/jsonl/logprobs，~50MB）
├── sessions/                # [gitignore] 会话快照（~700KB）
└── official-presets/        # [gitignore] 官方预设对照
```

## 版控边界

- **保留（入版控）**：`*.mjs` / `*.py` 实验脚本、`cot-lexicon.md` 等文档。
- **忽略（gitignore，仍在盘上）**：大件目录、`results/`、候选池 json/csv、会话快照。
  `.gitignore` 见仓库根，实验数据不入仓库分发。

## 研究背景（为什么有这些实验）

routing 预设的核心假设：DeepSeek V4 在 persona 轴上的行为**不是连续分布**，而是
**分相变、聚成稳定区**（spec/react/mixed/weak）。这套实验里的 logprobs 扫描、
反毒化、词汇表/候选池分析，是为了找到"哪一档工具面在哪个阶段该开"，从而把模型
量化到稳定区。当前路由预设源码在 `preset/router-*/`，实验只在 `probe/`。
