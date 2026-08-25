# 优秀 vs 极差思维链输出词汇全表（CoT Lexicon）

> 来源：社区 DSH 实验（dsh-anchored-standard / dsh-anchored-flash / modeltest / dsh-router-standard / dsh-2020-dataset）、DeepSeek 官方技术栈（Minimal/Standard persona、thinking mode）、Transformer/推理研究（Qian et al. 2025 MI peaks、s1 budget forcing、Gravity7 hedging、Cognaptus epistemic verbalization、Thought Anchors 2025）。
> 用途：作为精选 400 个注入候选的词典依据。

---

## 1. 优秀思维链词汇（Good CoT markers）

### 1.1 协作第一人称复数（核心）
- `we` / `We`
- `we need` / `we need to`
- `we should`
- `we must`
- `we will`
- `we can`
- `we are`
- `we have`
- `we want`
- `we'll` / `we've` / `we're` / `we'd`
- `our` / `Our`
- `us`
- `let's` / `Let's`
- `let us`
- `together`
- `as a team`
- `our goal` / `our plan` / `our next step` / `our approach`

### 1.2 结构化推进词（thought anchors / planning）
- `first` / `First`
- `then` / `Next`
- `finally` / `Finally`
- `step` / `Step`
- `phase` / `Phase`
- `milestone` / `Milestone`
- `objective` / `Objective`
- `goal` / `Goal`
- `plan` / `Plan`
- `approach` / `Approach`
- `strategy` / `Strategy`
- `task` / `Task`
- `pipeline`
- `commit`
- `proceed`
- `continue`
- `focus`

### 1.3 验证/执行动作词
- `verify` / `Verify`
- `confirm`
- `check`（作为执行动作，非 epistemic 滥用时）
- `review`
- `validate`
- `ensure`
- `inspect`
- `analyze`
- `build`
- `fix`
- `implement`
- `test`
- `decide`
- `choose` / `select`
- `produce` / `deliver`

### 1.4 逻辑连接/结论词
- `therefore`
- `so`（作为推进连接，非填充时）
- `thus`
- `hence`
- `consequently`
- `as a result`
- `this means`
- `in summary`
- `because`
- `since`
- `if ... then`

### 1.5 行动导向/简洁风格
- `concrete`
- `actionable`
- `directly`
- `concise`
- `short`
- `one action per sentence`
- `decision-level summary`

### 1.6 DeepSeek Minimal 轨迹指纹
- 首行：`We need` / `We`
- 全文：`we` 高频、`let's` 高频
- `let me` = 0
- 短 reasoning 块（p50 ~100–250 字符）
- 可选的 `Good.` / `Great.` / `Excellent.` 首行（弱指纹，不是充分条件）
- 零阶段回复（过程全部留在 reasoning/tool call）

---

## 2. 极差思维链词汇（Bad CoT markers）

### 2.1 第一人称执行/自我中心（DeepSeek standard-like 主指纹）
- `let me`
- `I'll`
- `I'm`
- `I need to`
- `I can`
- `I will`
- `I should`
- `I think`
- `I want`
- `I have`
- `I would`
- `I'd` / `I've` / `I am`
- `I'm going to`
- `Let me start by`
- `Let me take a look`

### 2.2 指代用户/外部视角
- `the user`
- `the user wants`
- `they want`
- `he/she wants`
- `The user wants me`

### 2.3 犹豫/填充/自我怀疑（hedging markers，错误轨迹高密度）
- `wait`
- `but wait`
- `hmm` / `hm`
- `um` / `uh`
- `so`（填充用法）
- `actually`
- `basically`
- `just`
- `okay`
- `well`
- `let me reconsider`
- `let me double-check`
- `let me think`
- `alternatively`
- `however`
- `maybe`
- `perhaps`
- `I guess`
- `I suppose`
- `I'm not sure`
- `I wonder`
- `hold on`
- `let's see`
- `probably`
- `seems`
- `might`
- `check`（epistemic 滥用：反复“let me check”）

### 2.4 道歉/自我修正循环
- `I apologize`
- `sorry`
- `I'm sorry`
- `wait, no`
- `actually no`
- `that's wrong`
- `I made a mistake`
- `let me fix`
- `let me correct`
- `I apologize for`

### 2.5 过度礼貌/对话填充
- `I'd be happy to help`
- `Sure, let me take a look at that`
- `Great question`
- `That's a good point`
- `First, I will`
- `I'll do X`
- `Let me start by`

### 2.6 低信息量首行/阶段回复
- `The user wants ...`
- `Interesting`（promoted 后常见）
- `Let me ...`
- `I will ...`
- 向用户发送过程性阶段回复（不是最终交付）

### 2.7 结构坏指标
- 长 reasoning 块（p50 >400 字符）
- 反复自我修订/回声
- 重复
- 主题漂移
- degenerate loops（死循环式复述）
- 高 hedging 密度 + 高多样性

---

## 3. DeepSeek/DSH 特有指纹与触发变量

### 3.1 轨迹分类（社区词法分类器）
- **minimal-like**：首行 `We need`、全文 `we`、无 `let me`；短块；零阶段回复
- **standard-like**：首行 `The user wants...` / `Let me...`；`let me`/`I` 高频；长块；阶段回复多
- **ambiguous**：`Need ...` 开头、`Interesting` 开头、无持续 `let me` 但也不是 `we`

### 3.2 触发变量（已实测）
- Minimal system（46 字符）→ we；Standard system（~5k tokens）→ let me
- 首轮工具 schema 数量/组合：`bash+editor` → we；完整 25 工具 → let me；`glob` 是已观测分界之一
- `max_tokens=1024` 首轮封顶 → we；256000 → let me（非单调，4096/8192 有翻转）
- 技能目录（skill-catalog ~9KB user 注入）→ 0/9 we
- AGENTS.md/CLAUDE.md digest 注入 → 0/9 we
- 命令式 hint（“read first and follow them”）→ we→let me 翻转；中性/建议式 → 保持 we
- user 近场（suffix）有效；system/远场无效

### 3.3 dsh-2020 数据集验证的 top 单 token（Standard 下 weFirst 5/5、let me≈0）
- 思维标记：`<think>`
- 代码/结构符号：`{`、`await`、`->`、`#`、`\t`、`\n`、`>`、`|`、`` ` ``
- 数学/特殊符号：`≠`、`√`、`∃`、`∪`、`σ`、`∏`、`→`、`Δ`
- 任务/规划词：`ĠTasks`、`Ġcommit`、`ĠThinking`、`Ġobjective`、`ĠApproach`、`Ġstrategy`、`Ġdeeply`、`Ġverify`
- 协作代词：`ĠWe`、`ĠOur`、`ĠLet's`、`Ġwe've`
- 模态词：`Ġmay`、`Ġwould`

---

## 4. 研究结论（机制层面）

1. **Thinking tokens 是控制信号，不只是填充**：`Hmm`、`Wait`、`So`、`Therefore`、`Let me reconsider` 与 MI 峰值强相关；抑制它们会显著降低推理性能（Qian et al. 2025）。
2. **但 hedging markers 在错误轨迹中更密集**：`alternatively`、`however`、`wait`、`let me reconsider`、`maybe`、`I think`、`probably` 等，在错误答案中密度/多样性更高——它们是不确定的症状，不是认知美德（Gravity7/Think Deep Think Fast）。
3. **真正的因果 pivots 是 planning/backtracking 句子**，不是 hedge 词（Thought Anchors 2025）。
4. **正确轨迹通常更短**；长轨迹常伴随 thrashing/自我怀疑。
5. **epistemic verbalization 有功能**：注入“Wait, is that correct?”能恢复约 15% 失败轨迹；但过度使用会瘫痪。坏轨迹是“高密度+多样性 hedging + 无收敛”，不是单个词出现。
6. **安全前缀也是 mode switch**：`I cannot`/`I apologize` 决定整个拒绝轨迹。

---

## 5. 对 400 候选精选的启示

- **应优先包含 Good markers 的 token/短语**：`we need`、`we should`、`let's`、`our`、`plan`、`verify`、`first/next/finally`、`task/objective/approach`。
- **应包含能激活 planning/backtracking 的“thought anchor”结构**：`<think>`、`{`、`await`、`->`、`#` 等单 token（数据集已验证）。
- **应避免/反制 Bad markers**：注入文本本身不应含 `let me`、`I'll`、`the user`、`wait`、`actually`、`hmm`、`maybe` 等（除非是“不要用 X”的指令，但命令式有翻转风险）。
- **指令措辞用中性/建议式**，不用命令式（社区 issue #49）。
- **中文任务可用中文 Good markers**：我们、咱们、我们一起、我们的、大家、团队、协同、先、然后、最后、验证、计划、目标。
