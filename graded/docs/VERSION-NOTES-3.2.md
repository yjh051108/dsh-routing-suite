# dsh-graded-mode v3.2.0 版本说明（体验增强版）

- 基线：v3.1.0（备份 <backup-dir>\\dsh-graded-mode-v3.1.0）
- 测试：61/61（mode-state / tools / inject-text）
- 反馈驱动：基于 7abc5cad 真实会话分析（效果未达预期的三因）与本会话多轮实测修复

## 变更总览（semver minor：新功能+行为增强）

### 新功能
1. **脑暴出题制**：`ask_user_question` 选择题对齐需求（≤5 题/轮、可多轮 ≤3 轮、歧义全结清才定稿）；
   **必选模式题**（correct/experience/research+判定法+推荐）——模式在任务第一理解时由用户点选定，不再靠模型事后自报（修复"视觉项目被判 correct→体验句全程缺失"）。
   **模式落盘**：模式题选择经 `commit_star(mode=…)` 随定稿写入（唯一可信来源）。
2. **小类粒度模式**：item.mode（correct/experience/research，缺省继承会话模式）——全栈任务按小类切验收重心；聚焦注入明示"本小类模式"；树/审核标注。
3. **模式防漂移**：scanMode 只认用户消息（模型不得自行改口——修复"开局 E 后期 C"）。
4. **委派通道决策**：委派 skill 增「后台（默认推荐，不阻塞主链）/ 阻塞（依赖结果时）」自主决策指引。

### 时序修复（核心：引导不再过期）
4. **大小类引导走 next-step（steer）**：lock L1/L2 后**同 turn 下一步**即达引导——不再等 turn 边界（此前"小类锁完才见大类引导"根因）；执行期 mark 引导保持 followup（跨轮续轮 flow 不变）。
5. **锁定即呈完整规格单**：specSheet（北极星+需求计数+规格树）随 lock L2 回执呈现；审核提示=唯一"请确认"（消除双重请求/重复规格单）。
6. **『修改』回滚开口**：reject-ack 引导（此前回滚后系统沉默→模型自由发挥跳过修订呈现）。

### 体验修正
7. **北极星锚定**替代"开工前自问"（声明式→目的+验收锚一眼）。
8. **委派规范改写**：允许情景化改写（角色/术语澄清），但规格事实逐条完整进入、验收锚=盘档 accept（不以委托文本为准）。
9. focus 模式标注重复右括号修复；50+ 项防御（负测/渲染/门控/审计）全绿。

## 全链（3.2）
```
（命令/文本/自主 commit_star）→ 脑暴出题（含模式必选题）→ commit_star → L1 规格化(组 spec/accept/verify)
→ 锁定(steer→phaseL2 同轮) → L2 规格化(小类 spec/accept/do/verify/item.mode) → 锁定(回执呈规格单)
→ 审核提示(唯一请求) → 确认/修改(回滚→reject-ack→修订重审) → 执行(三段式+星锚+铁律按小类模式)
→ 打卡(回执当下态+followup 跨轮) → 组收官(逐条核对+verify 注入+红队先裁) → 终验+审计终检
```

## 已知边界
1. 面板视觉观感=用户过目项（无自动化 UI 验收）。
2. 用户指令型路径：『修改』/off 已在真实链/同款判定链复测；off 真发命令通道回执修复后待一次现场复验。
3. 组级 redteam 实战+e2e-redteam-group 脚本已闭环。

## 工具集（6）
commit_star / edit_plan / lock_stage / mark_task / redteam_verdict / revise_do
