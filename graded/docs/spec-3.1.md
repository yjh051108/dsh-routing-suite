# dsh-graded-mode 3.1 规格书（v0.2 待拍板）

> 基线：v3.0.0（已备份 <backup-dir>\\dsh-graded-mode-v3.0.0）。3.1 = 规格化重设计：
> **头脑风暴对齐 → 规划（任务定义+验收标准+执行形态）→ 审核规格 → 执行按规格定制注入**。
> 核心哲学：**以目的为导向的验收**（非以提示/证据为导向）、建筑式增量（下面有问题上面遭殃）、
> 注意力转移与核心概念可控=思维质量、引导大于限制、门控（不写不让过）、**信息不闭环不前进**。

---

## 0. 总纲

```
① /graded <任务> → 【头脑风暴·需求对齐】注入
   （模型：模式自报[模式:x] + 需求理解/疑点清单 + 边界与非目标 + 北极星草案）
   → 用户答复/补充 → 模型整合 → **commit_star 定稿**（北极星=目的宣言 + 需求清单 + 非目标 + 假设）
   → 进入规划
② L1 编辑（两级先后）：大类标题 + 组 spec + 组 accept(≤3 条) + 组 verify  → lock_stage(L1)
③ L2 编辑：每小类 = 标题 + 概念 + 小类 spec + accept(不设限,按模式文法) + do + verify
   → lock_stage(L2)【全量校验：所有字段非空，缺即拒】
④ 审核 = 完整规格评审单（北极星+需求 + 树 + 双层 spec + 双层 accept + 形态矩阵）
   → 用户『确认』/『修改』（『修改』=全解锁自由修订，支持完全重写；北极星/需求/模式均可修订）
⑤ 执行模式：每小类注入 = spec段 → accept段 → 形态段 → 铁律段（固定，按模式）→ 打卡句
   北极星元认知段：approved 入场一次（长版），组入口浓缩版一次
⑥ 组收官：证据回放 → 组级标准**逐条核对**（每条单独判定+证据）→ 整体验收 → 标定
⑦ 终验：finalCheck（六项）+ 全链组级标准汇总核对 + 北极星达成核对
```

## 1. 数据模型（盘档 state）

```ts
state: {
  stage: 'off'|'brainstorm'|'l1-edit'|'l2-edit'|'review'|'develop'|'final',
  task: string, mode: 'correct'|'experience'|'research'|string, // 措辞包 id,可扩展
  star: {                       // ★ 头脑风暴定稿（北极星+需求,信息闭环的唯一来源）
    purpose: string,            // 北极星：目的宣言（一句话,commit_star 必填）
    requirements: string[],     // 对齐后的需求条目（含用户答复修订）
    nonGoals: string[],         // 非目标/不做清单
    assumptions: string[],      // 假设（环境/取舍/前提,含"默认理解是X,用户未异议"）
    aligned: boolean,           // 是否已定稿（commit_star 后 true）
  },
  l1Locked: boolean, l2Locked: boolean,
  plan: { groups: Group[] },
  injected: Set<string>,        // 幂等键（先注后键,3.0 机制保留）
  audit: { injections: Record<string, number>, lastFingerprint: string,
           redteam: { rounds: number, passed: number, rejected: number } },
}
Group: {
  title: string,
  spec: string,          // 组任务描述（多行自由文本,可含负面声明与参考文档提及）
  accept: string[],      // 组级验收标准（≤3 条,按模式文法;组收官逐条核对）
  verify: 'self'|'subagent'|'redteam'|'user',  // 组收官验证方（do 无意义,主代理负责）
  locked: boolean,
  items: Item[],
}
Item: {
  title: string,
  concepts: string[],    // ≤3,保留
  spec: string,          // 小类任务说明（多行,可提及参考文件/文档→注入时模型自然引用）
  accept: string[],      // 验收标准（必填不设限,按模式文法;探索型"占位+退路"允许）
  do: 'self'|'subagent'|'workflow'|'daemon'|'mixed',
  verify: 'self'|'subagent'|'redteam'|'dual'|'workflow', // 开发期只读
  status: 'pending'|'in_progress'|'completed',
  redteam?: { rounds: number, passed: boolean|null, log: {verdict:string, issues:string[], at:number}[] },
}
```

**门控**：brainstorm 未定稿（star.aligned=false）→ edit_plan 被拒（"先完成需求对齐/定稿北极星"）；
edit_plan L1：组 `spec`+`accept` 非空才接受；L2：item `spec`+`accept`+`do`+`verify` 非空才接受；
lock_stage(L2) 前全量复检，缺项即拒（报缺哪项）。审核前一切字段可改（含 commit_star 修订）；
进 develop 后 spec/accept/verify/star 只读（改口仅『修改』回到审核前），`do` 可改（温和提醒，走修订登记）。

## 2. 工具契约

- `commit_star(purpose, requirements?, nonGoals?, assumptions?)`【新·brainstorm 阶段】：
  定稿北极星+需求 → stage 切 l1-edit；purpose 必填（≥1 句目的宣言），其余可选但建议填；
  已定稿后再次调用=修订（审核前允许，审核后只读）；校验：目的句不得为空/机械照抄任务原文
  （须"对齐后"的表述）。
- `edit_plan(level, items?/groups?)`：schema 扩字段（必填验证如上）；回执全量展示（树+标准+形态）。
- `lock_stage(level)`：L2 锁前全量校验。
- `mark_task(level, title, status)`：主代理唯一推进者——do=subagent/workflow 的小类**仍由主代理打卡**；
  verify=redteam 的小类未 pass 不得 mark。
- `redteam_verdict(level, title, verdict: 'pass'|'reject', issues[])`【新】：
  仅 verify=redteam 的小类/组可用；reject → 修复后**必须再裁决**（再审批铁律,自演红队同流程）；
  记录轮次与 log（面板消费）。pass 后 mark_task 才可推进该小类。

## 3. 注入矩阵

### 3.0 【头脑风暴·需求对齐】（规划前第一阶段注入·信息闭环的起点）

```
【头脑风暴·需求对齐】（规划前的第一件事——不做完不进规划，不做完没北极星）
任务文本：{task}
这是一次**信息齐平**：把"你要什么、边界在哪、什么算达成"在写大字之前先对齐。
做四件事：
① 理解与疑点（≤5 条）：写出你对本任务的完整理解（最终交付什么/为谁/在什么约束下）；
   同时列出**疑点清单**，每条给"我的默认理解是 X——对吗？"，如：
   · 关于【对象/范围】：我的默认理解是 …，对吗？
   · 关于【完成度】：…是"达成的底线"？还是"理想态"？（默认=底线可判，理想态另列）
   · 关于【约束/环境】：…资源用/不用（预算/时间/技术取舍）？
② 边界与非目标（不做清单）：明确哪些**明确不属本任务**（防蔓延）；
   假设清单：环境/取舍/前提（如"假定无需兼容 X"）。
③ 北极星草案（一句话目的宣言）：**为【谁】在【什么处境】下，达成【什么价值/什么可观测结果】**——
   句式示例："为深夜学习的人，把原本 10 分钟的留痕整理压到 1 分钟以内的可搜索笔记"
   它不是任务清单，是"过审标准"：拿着它，任何进展都能问"这服务于目的吗？"
④ 模式自报（写在本条回复首行）：[模式:correct|experience|research]（任务性质判定,立此存照）。
---
此后**等用户答复**（会有一轮"信息对齐"：用户逐条答/追加/改口）。
用户答复后：整合答复 → 调 **commit_star**(purpose=定稿北极星, requirements=对齐后需求,
nonGoals=非目标, assumptions=假设) → 显示定稿 → 进入规划。
若用户答复"没有补充/按你理解来"：把疑点清单转为"默认理解"写入 assumptions（标注采纳方式），
照样 commit_star——**闭不了环就标注假设，而不是不写。**
```

### 3.1 执行模式·每小类定制（规格前置三段式）

```
【当前小类·{组}】{上一小类已打卡 ✅}
【本小类任务】{spec 多行（模型自然引用提及的文档）}
【本小类验收标准】（开局已锁,打卡前逐条对照,按模式文法）：
  {accept[0..n]}
【执行形态】do={do}（{选项摘要} | 你的岗位=唯一推进负责人） | 验收：verify={verify}（{选项摘要}）
【验收铁律·{模式词}】（固定,不再轮换变体）…
然后**打卡**：mark_task(level="L2", title="{item}", status="completed")……
【单类门禁】…
```

- **do=subagent**：形态段=《委派规范》——任务+标准（prompt 内嵌,一字不改）→ 子代理约束
  （全工具+可再派生；交付=成果+证据链+验收记录）→ 你的岗位=撰写委派 prompt→派发→回收→
  按标准独立验收→（未过则打回再派/自补）→ mark。委派 skill 化（选项摘要=skill 卡片）。
- **do=workflow**：形态段=《编排规范》：以目的为导向自编（并行/流水线/混合全自动）→
  写脚本→执行→汇总判分；岗位=编排+护栏+判分；要 skill 可自建。
- **verify=redteam**：形态段追加《红队裁决》：自演/独立 subagent/双红队交叉/用户复核——
  模型在允许集内自主定组合并说明；先裁决（通过/打回+问题清单）；打回→修复→**再裁决**；调 redteam_verdict 落盘。
- **verify=dual**：双轨并行（开发+独立验证并行,完成后对照）。

### 3.2 组收官注入（四段）

```
【大类收官·{组}】本组小类已全部完成——
① 证据回放：每小类证据各 1 行（路径+数值）
② 组级验收标准**逐条核对**（每条单独判定+证据,不得整体"过"——组级=局部成果初步汇总,
   严苛程度高于小类;verify={组verify}——redteam 则先裁决再进 ③）
③ 整体验收（一致性/覆盖性）
④ 标定大类完成：mark_task(level="L1", …)。完成后即停。
```

## 4. 北极星·元认知段（approved 入场长版一次 + 组入口浓缩版）

目的来源：`state.star.purpose`（brainstorm 定稿,非任务原文——信息闭环的产物）。

```
【北极星·元认知】（此刻讲一遍，之后不再重复）
本会话的一切对象——大类、小类、执行形态、验证方式——都要回答同一个问题：它们服务于哪个目的？
目的就是需求对齐后定稿的目标：{star.purpose}

这正是"以目的为导向"的意思：**验收是对目的的验收**——不是为了"做过"、为了"证据好看"、
为了"提示词写完了"而验收；而是"这件事要做到什么程度才算服务于目的"。

但北极星不在每个小类里跟你重讲——你被允许、也只被允许在开工前一眼确认：
**「对于这个目的，我这一次任务实际要的是什么？」**
答完这一眼（目的→本次任务→验收锚），就把全部注意力放回这一块砖。

任何更远的思考——"后面还有没有更好的路""该不该改计划""别的小类是不是能顺带做了"——
都不是此刻的事，它们属于审核、收官、终验的舞台。

专注不等于盲目，清醒不等于分心：**目的是远处站岗的人，你只管把手头这块砌好、验好、打卡。**
```

浓缩版（组入口）：`（北极星·本组）本组仍服务于：{star.purpose}。当前唯一任务={首小类}，验收锚={accept 摘要}。`

## 5. 三种 accept 文法（固化,进提示词/面板/编辑引导）

- **correct（正确性）**：`主语 + 行为 + 可测量断言`（数值/边界/枚举）。示例：
  `花瓣 60s 内位移>10px` `错误数=0` `400=HTTP 200`。禁用：感觉良好/差不多/能跑就行。
- **experience（体验）**：第一人称感受断言 + 至少一个可复现动作。示例：
  `试玩时"我想继续往下玩"（≥1 处,记下哪一处）` `操作 5 次无卡顿,截图可复现`。
  禁：指标冒充感受（fps 90 ≠ 体验好,除非声明为佐证）。
- **research（研究）**：可复核断言 = 来源 + 复现路径 + 边界。示例：
  `结论 X 有来源（公式/引用路径）+ 复现（命令/参数/行号）+ 边界（未证实项明示）`。
  禁：无出处推断、把"我觉得"当结论。
- **探索型占位**（任何模式,探索性任务）：占位必须带**退路**，如
  `待定：探索出 ≥2 个候选方案并给出推荐(含取舍理由)；若只探索出 1 个,写明为何并请求认可`。
  组收官前未回填 → 组收官黄旗拦截。

## 6. 超级面板设计稿（徽章 → 全屏面板,可展开/可跟踪/可量化）

**徽章态**（常驻右上角）：
`[模式 C|E|R] · 当前唯一任务：{item} · 标准就绪 ✓ · 红队 ●(待验)/✅(通过 n)/⭕(打回 n) · {done}/{total}`
点击 → 全屏面板：

```
┌ 量化条 ────────────────────────────────────────────────┐
│ 打卡率 │ 标准覆盖率 │ 红队通过/打回·轮次 │ 审计单注率 ◆ │
│ ★ 北极星（常驻一行）：{star.purpose}                     │
├ 总览层（组卡片×n,可展开）──────────────────────────────┤
│ #L1 {组} ✅ {组accept 摘要≤3行} verify={v} {done}/{total} │
│   └ 组层（小类行,可展开） {item} {状态色} do=●▲■⚙◇       │
│     │ accept 摘要 verify=… 红队:●/✅/⭕n                  │
│     └ 项层（完整规格,可跟踪）                            │
│  spec 全文 | accept 全文 | 形态 | 证据链摘要 | 红队裁决历史 │
│  （每次 mark 时间戳/证据行数/裁决轮次 时间线）            │
├ 需求/非目标/假设（可展开）：requirements/nonGoals/assumptions │
└────────────────────────────────────────────────────────┘
状态色：pending 灰 / in_progress 蓝 / completed 绿 / redteam 打回 橙 / 黄旗 ⚠(标准缺/待回填)
图标：do=self● subagent▲ workflow■ daemon⚙ mixed◇ | verify=redteam 追加红标
```

面板由 client 轮询 `/graded-mode/api`（现状升级,含 star/规格/形态）+ 新增 `/graded-mode/api/audit`；
徽章实时同步注入状态。

## 7. 审计端点

`GET /graded-mode/api/audit` → `{ok, sid, injections: {brainstorm:1, l1-guidance:1, …}, fingerprint,
redteam:{rounds,passed,rejected}, uniqueRate}`。
检测/审计类任务的取证从"解压 zstd 统计"变为一眼可见（3.1 收益之一）。

## 8. 保留/退役清单

保留：模式自报与改口、先注后键单注、当下态回执、防爆续轮、单类门禁、`DELEGATE_ONCE` 能力提示
（并入 do 选项摘要而非单独段）、六项 finalCheck（升级为"组级标准汇总+北极星达成核对+六项"）。
退役：VERIFY_VARIANTS 三变体轮换（结构差异已足够,铁律固定按模式措辞）。
兼容：无历史盘档（用户明示不考虑旧会话升级路径；代码仍做字段缺省容错,防未来回归）。

## 9. 实施拆分（全做完一次发布 3.1.0）

- **M0 头脑风暴阶段**：mode-state（stage='brainstorm' + star 字段 + 门控：未定稿禁止 edit_plan）、
  tools（commit_star 新工具）、inject-text（《头脑风暴·需求对齐》模板）、index（brainstorm 注入+阶段分发）
- **M1 数据模型+工具契约**：mode-state（字段+校验+序列化）、tools（edit_plan 必填校验/回执全量/
  redteam_verdict 新工具/do 可改登记）
- **M2 注入渲染**：inject-text 全面改版（规格前置三段式+北极星长/浓缩+组收官四段+委派/编排/红队规范）
- **M3 组合流程**：index.js（组 verify 注入、redteam 门（verify=redteam 未 pass 不得 mark）、
  /api/audit、面板 API 升级）
- **M4 超级面板**：client（徽章+三层树+量化条+红队状态+时间线+北极星栏）
- **M5 测试**：新增 brainstorm 门控/校验/渲染/redteam 流程用例（期望 50+ 用例）
- **M6 文档**：VERSION-NOTES-3.1.md、README 更新
