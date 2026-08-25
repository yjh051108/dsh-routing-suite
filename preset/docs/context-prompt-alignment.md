# context-prompt-alignment（v1.29 设计说明）

> 本文件记录 v1.29.0 改动的技能依据与刻意不做的事。技能源：context-engineering（通道/生命周期/权威）、
> system-prompt-engineering（sections/描述/schema 组织）、plugin-dev-paradigm（形态边界）。

## 改动一：delivery_check schema ↔ 执行一致

**依据**（system-prompt-engineering）：描述说能做、执行层不能做是最大反模式。旧 schema 承诺
headless smoke / url 必传 / timeout / retry，而 v1.23 起实现已不跑浏览器；且 url+requireSmoke
在实现里无条件加 FAIL——严格遵守 schema 的模型永远过不了页面 gate。

**改法**：删除死参数（requireSmoke / timeoutMs / virtualTimeMs / retry，含 shim 注册）；url 降级为
页面门禁标记（有 url ⇒ evidence 须含 ≥1 项 reviewed:true 视觉证据，由实现 490-493 行强制）；
DESC 与参数描述改写为“gate 只校验证据，浏览器验证由你自己做”。main 注册与 own-layer shim 同源。

**不做的**：不把 smoke 重新内置回 delivery_check——v1.23 的决策（模型自测 + evidence）保留，
恢复浏览器的 ROI 为负（preset 不拥有宿主浏览器资源；形态边界见 plugin-dev-paradigm）。

## 改动二：装配保留他方 runtime contexts

**依据**（context-engineering）：只清理自己拥有且有害的。旧实现每次 assembly 返回 contexts: []，
把其他插件合法贡献的当前事实（workspace/mode/状态）无差别清空——跨插件作用域污染。

**改法**：三处（首轮 / 晋级 SDK 分支 / 普通晋级）全除 contexts 覆写；本 preset 只替换 sections 与工具面。
集成测试新增 foreign-context fixture，断言他方 context 在首轮与晋级后均存活。

## 改动三：阶段指南声明式化

**依据**：四阶段指南常驻 system prompt（每轮注意力税）；旧文本是数百字流程剧本（记忆策略/subagent
策略/失败归因/页面验证教程），与 schema 精简目标自相矛盾；且 planning 指引建议调用验证阶段才解锁的
subagent/workflow（描述=执行可用性不一致）。

**改法**：每个指南保留 Object（当前阶段+工具）/ Link（解锁顺序）/ Action（完成信号与门禁），压缩散文；
planning 段改为“subagent/workflow 验证阶段解锁，当前先把关注点拆成条目”。

## 刻意不做（RFC，待宿主能力）

- **RFC-1 stage → session event**：阶段仍是 sidecar stages.json（模型可见状态不可从 session log 重建）。
  完整修复需宿主支持 router/stage-* 自定义事件类型并持久化——属 dsh 主机层能力，非 preset 可独立完成。
  暂以 dev_router_status + router-stage section 缓解；列入后续 RFC。
- **RFC-2 router-stage 从 section 迁 PromptContext**：阶段事实每次 assembly 变化，语义上更接近
  runtime context；但迁移会改变 KV 前缀稳定性与压缩行为，需先在宿主 API 上验证动态 context provider
  的重算语义再动。暂保持 section（稳定性优先）。
- **RFC-3 delivery 结果门禁**：autoAdvance 仍按“调用了 delivery_check”推进（stage 2→3）。刻意保留——
  阶段 3 解锁修复工具（bash/jobs），若以 PASS 为前提会困住失败的模型；真正的门禁在 delivery_check 结果
  与 stageText“do NOT declare delivered”。不改为结果门控。
- **镜像与 suite**：preset 内 v34（挂载）与 mjs（镜像）同步维护；suite 同步由 dsh-routing-suite 的
  sync 策略负责（见该仓库 README），本仓库不再双份演进。

## 验证

- 单元/集成：router.test.mjs（deliveryCheck 新契约 + 证据门禁用例）+ router.integration.test.mjs（contexts 保留）
- 自检：probe/selftest.mjs
- 真机验证（安装进 3081 测试环境的行为面）由 A2A 测试节点执行，本 PR 不自行部署。
