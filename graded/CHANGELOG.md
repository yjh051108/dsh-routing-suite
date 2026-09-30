# Changelog

## 0.0.1-rc1 + v4 消息源契约修复（2026-09-30）
- **会话格式 v4 兼容**：v4 的消息源准入拒绝字面量 `source.kind === 'plugin'`（v3 退休写法；
  本次在 DSH 0.2.0-rc.2 上复现）。插件注入引导即抛
  `SessionFormatError: format v4 message requires a producer-owned source kind`，表现为「本轮运行失败」
  ——分级模式一注入就断（commit_star 激活后、mark_task 续轮后各复现一次）。
  四处注入点（`src/index.js` 的 `userMsg()`、`src/tools.js` 三处 steer）改用 v3→v4 迁移的兜底映射
  `plugin:dsh-graded-mode`（`session-format-v3-to-v4/src/sources.ts`：`plugin:${plugin}`）。
- **自跳过判断同步**：`kind === 'plugin'` → `isInjectedByPlugin()`（同时认退休字面量与 `plugin:*` 前缀，
  与 router-core 的同类问题同源）。不改这处，新 kind 下插件自己注入的审核提示会被 review 文本扫描
  当成用户回复（含「确认」→ 误推进阶段）。
- 回归测试：`tests/v4-source-kind.test.mjs`（4 例；打补丁前 3 例红）。
- 兼容性：**同时兼容 v3 / v4 宿主**。v3 原生的 `assertEvent(event, 3)` 只做结构校验后直接返回
  （`session-format-v2-to-v3/src/payload.ts`），source-kind 白名单只作用于 **v2 迁移分类**，
  因此 `plugin:dsh-graded-mode` 在 v3 宿主上同样可写。唯一附加要求在**消费侧**：过滤注入消息
  要同时认 `plugin` 与 `plugin:*`（本 PR 已在 `graded` 内处理；`router-core` 的同类问题见上游 issue #143）。
- 升级提示：安装副本需 `node scripts/build.mjs` 刷新 `lib/` 后**重启宿主**
  （打包版不会热加载 node_modules 里的插件文件）。

## 0.0.1-rc1（2026-09-02）Release Candidate
- 注入淤积根治：focus 幂等键去 status（状态抖动不再重注同名引导）；执行端续轮 followup→steer + 同 turn 60ms 引导合并（消除 next-turn 堆积）
- 面板稳定：会话感知三级回退（URL/历史解析 ?sid=/盘 mtime）+防错显示；**设置面板闪退修复**（effect 一次挂载+回调 ref 化）
- 概念上限动态化：loadConceptLimit 读路径对齐设置 API（此前写读不一致致设置失效）——phaseL2/焦点注入/schema 描述全随设置（实测 8 全链断言）
- 面板视觉：已完成组默认折叠+组进度徽标+完成态侧条
- 测试 62/62；`0.0.1-exp` 为前一实验版（历史保留）

## 0.0.1-exp（2026-09-02）体验实验版
- 脑暴出题制：ask_user_question 选择题对齐（多轮歧义结清）+必选模式题（用户点选，经 commit_star(mode) 落盘）
- 时序修复：大小类引导走 next-step（同轮即时，无过期）；锁定回执=完整规格单；审核唯一确认请求；『修改』回滚开口（reject-ack）
- 小类粒度模式 item.mode（缺省继承会话；scanMode 只认用户=防漂移）
- 北极星锚定替代"开工前自问"；委派允许情景改写（验收锚=盘档规格）+委派通道自主决策（后台/阻塞）
- commit_star 修订保留阶段（修复回退 bug）；focus 模式标注修复；开源脱敏（发布面路径占位/os.homedir 回退/硬编码净化+红队两轮复核）

## 3.1.0（2026-09-01）规格化重设计
- 脑暴链→commit_star 定稿；规格化两级计划（spec/accept/do/verify 必填门控）
- 注入规格前置三段式+委派/编排/红队/双轨 skill 卡；组收官逐条核对+verify 注入
- 状态磁盘单轨（热重载零中断）；审计端点；超级面板（三层树/量化/北极星/红队灯）

## 3.0.0（2026-09-01）正式版
- 两级任务协议：大类→锁定→小类→锁定→树状审核→打卡制开发→组收官→终验
- 三模式包（correct/experience/research）；先注后键单注；当下态回执
