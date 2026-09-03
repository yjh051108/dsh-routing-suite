# dsh-graded-predict v3.1.0 版本说明

- 基线：v3.0.0（备份 <backup-dir>\\dsh-graded-predict-v3.0.0）
- 规格书：docs/spec-3.1.md（v0.2,9 章）
- 测试：52/52（mode-state / tools / inject-text 三文件）
- 自验：scripts/e2e-3.1.mjs（全链 dogfood,隔离目录零污染）

## 新链（信息不闭环不前进）

```
自动入口：模型自主进入——直接调 commit_star(目的宣言) 即激活（off → 一次对齐 → l1-edit；/graded 非必需）
① /graded <任务> → 【头脑风暴·需求对齐】注入
   模型：模式自报 [模式:x] + 需求理解/疑点清单(≤5,每条"默认理解是X对吗") + 边界/非目标 + 假设 + 北极星草案
   → 用户答复 → commit_star 定稿（purpose 必填;不照抄任务原文;审核前可修订）
② L1 编辑（两级先后）：大类标题 + 组 spec + 组 accept(≤3) + 组 verify → lock_stage(L1)
③ L2 编辑：小类 = 标题 + 概念 + spec + accept(按模式文法) + do + verify（全必填）
④ 审核 = 完整规格评审单（北极星+需求+树+双层规格+形态矩阵）
⑤ 执行注入 = 规格前置三段式（任务 spec→验收 accept→执行形态→按模式铁律→打卡→门禁）
   注入差异=结构差异：self=摘要一行 / subagent=委派 skill 卡 / workflow=编排 skill 卡
   verify：redteam=红队裁决规范 / dual=双轨并行规范
⑥ 组收官：证据回放 → 组级标准逐条核对（严苛>小类） → 组 verify 注入（redteam 先裁后定）→ 标定
⑦ 终验：finalCheck 六项 + 北极星达成核对
```

## 工具集（6）

| 工具 | 阶段 | 语义 |
|---|---|---|
| commit_star | brainstorm | 定稿北极星+purpose 必填+校验（照抄/过短拒）+修订（审核前）+只读（开发期） |
| edit_plan | l1/l2-edit | L1 组规格门控（spec/accept）；L2 小类规格门控（spec/accept/do/verify）；回执全量 |
| lock_stage | l1/l2-edit | 先复检后写入（拒绝=状态不变）；L2 全量复检 |
| mark_task | develop/final | 打卡；**redteam 门**（verify=redteam 未裁决通过拒绝,含轮次） |
| redteam_verdict | develop/final | 裁决 pass/reject+issues（reject 必附清单）；再审批义务；轮次+log 落盘 |
| revise_do | develop/final | do 可改（登记 doHistory）；**verify 只读**（验收承诺不打折） |

## 模式（措辞包,可注册扩展）

- correct=可测量断言（主语+行为+数值/边界）；experience=感受断言+可复现动作（禁指标冒充）；
  research=可复核断言（来源+复现路径+边界）；探索型占位须带退路（≥2 候选或写明为何+请求认可）。
- 自报 [模式:x] 写在脑暴回复首行；用户随时 [模式:xxx] 改口（任意阶段切换+回执）。

## 持久/可靠性

- 状态=磁盘单轨（$DSH_HOME/graded-state/<sid>.json,无内存副本）：热重载/重启零中断。
- 注入幂等：先注后键（followup 成功后注册键,失败→pre-step splice 兜底）；develop 期实测单注。
- 审计端点 GET /graded-mode/api/audit：注入计数（前缀聚合）/盘档指纹/红队统计/唯一率。
- 超级面板：徽章（阶段+模式+当前唯一任务+红队灯）→ 三层树（组卡/小类行/项层规格+红队历史）
  +量化条（打卡率/标准覆盖/单注率）+★北极星栏+黄旗⚠（规格缺）。

## 已知边界（诚实清单）

1. 视觉/交互观感验收=用户过目（自动用例无法测 UI 观感）。建议在新会话触发一轮看面板实际效果。
2. 用户指令型路径未实机复测（历史早间实测过『修改』回滚与 /graded off，其后修复未复验）：
   『修改』回滚链、off 清盘与重入——下轮实测。
3. ~~redteam 组级裁决路径单测已覆盖~~ → **已闭环**：`scripts/e2e-redteam-group.mjs` 真实链验证
   （规格化组=redteam→小类打卡→组标定被门拦截→打回→再裁→pass→放行 `🔒✅`，零污染）。
4. 3.0 起步会话（无规格树）注入走兜底："（无——先声明两句话再开工）"+任务段回退标题。
