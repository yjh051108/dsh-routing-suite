# Changelog

## 0.3.3（2026-09-04）maintain 版（用户开发体验反馈直采·验证类任务死锁根除）
- **新 · vExpect='maintain'（第三态）**：保持目标态=合法闭环——闭合条件 before=at 且 measured=at，无回升义务、不挂 dipPending、回 at 清一切旧账（与饱和步同口径）；declare 回执自带语义注记。此前 at 档验证步只有两条邪路：谎报 improve（被拦）或借 dip 编回升故事（本会话现场活证：主会话为过 at→at 闸被迫 rollback+虚构「回升计划」——闸逼人讲故事即闸的失败）
- **修 · 拒绝文教路**：at 档 improve 谎报的 ΔV 拒绝文本现明示 maintain 出路（「验证已达 at 且保持」应 declare vExpect='maintain'）——出路必须在违规现场可见，不靠模型回忆条款
- 边界照守：maintain 在 far/near 档直拒（未达目标谈保持=逃避改善义务）；maintain 步测后掉档直拒（倒退≠保持，走 rollback re-linearize）——诚实报档优于硬凑闭合
- 测试 78/78（新增 maintain 五面回归例：正路闭合/清旧账/非 at 拒/倒退拒/拒绝文教路）

## 0.3.2（2026-09-04）会话实测补丁版（session 06dcbf00 归档分析·三 Bug 全闭环）

- **修 · 数值闸 Bug-A（converge 过严）**：`declare` 含数字预测时，`converge` 的 agreed 若未覆盖该 key（用户尚未填测量结果）→ 原来误杀整体拒绝；修复：先判断 agreed 是否覆盖该 key，无覆盖则跳过（等待测量声明），有覆盖但缺 `≠` 才要求补格式——教学/演示场景不再被闸卡死
- **修 · askUser CALLER_NOT_LIVE 未预判 Bug-B（freeze 弹窗在 subagent 里抛异常）**：`freeze` 在 subagent 里调用时 runtime 抛 `CALLER_NOT_LIVE`——原 catch 吞错回「UI 确认」假成功，模型误以为用户点了确认继续走后续流程；修复：`askUser` 入口预判 `agent.session?.id` 不存在直接回退文本/autoconfirm，不触发 runtime 异常
- **修 · injected 幂等标记误清 Bug-C（onWeightsUnlock 清了注入记录导致 face 重复刷屏）**：解锁（weights→brainstorm）时 `onWeightsUnlock` 执行了 `injected: new Set()`——幂等键全清，下次 rolling 进 face 重复注入；修复：解锁只改 stage 回 brainstorm，注入记录跨解锁保持
- **新 · declare/converge/rollback 链路自演进**：数值预测 key 不匹配场景走「覆盖检查→无覆盖跳过→用户补测量→下次闭合」自然路径，无需 rollback；教学演示不再因闸设计过严被迫回炉
- 77/77 测试全绿（含新增 `v-no-cover` 场景测例）；热重载已生效

## 0.3.1（2026-09-04）体验补课版（用户新会话实测三缺+现场幻影案全闭环·本单由 v0.3 引擎自跑）
- **修 · dip 登记合法性（体验单缺陷①活板门）**：before=at 且 measured≠at 的 dip 登记直拒——不可满足的债务不配登记；报错自带出路（at 档只可收 at→at 饱和步，真倒退走 rollback re-linearize）
- **修 · 回 at 即清（缺陷①建议采纳+②死锁根除）**：improve 步达 at 或饱和步清一切 pendingDip（含旧引擎登记的存量死角）；末组收口三角死锁随之消解——未开 ΔV 旁路（用户裁决维持）
- **修 · 幻影 off 真凶（本会话两次清账悬案告破）**：pre-step 触发扫描全史重扫——命令回显滞留历史，每步重扫到就重执行 off。改为只评最近一条真实用户消息 + off 双确认 10s 窗口 + 执行前状态面自动备份 + armed/executed 留痕日志（含 sid）
- **修 · 确认扫描形状兼容+可查账**：消息 content 字符串形兼容（「继续」不翻转根因之一）；scanLog{len,intent,stage,head} 落盘——扫描看见了什么从猜测变读账
- **新 · autoConfirm 授权通道**：settings.autoConfirm=true 时 weights 自动确认并留痕（scanLog intent=autoConfirm）；授权凭据写死设置文件（用户原话『要能直接跳过确认环节完全自主』）；默认关闭=人工确认主权不变
- **新 · final 自启动正式化**：final+全组 settled 态 cost_set 自主开新单（trigger 语义，旧单 V 账本栈不抹）——t10 单元实演+本单恢复路径活证双凭
- 注入幂等提取 faceDecision 纯函数（可测）+inject 日志含 sid；三回归例入册（体验单序列原样回放）
- 测试 75/75（尾行可重跑）；本单全程 v0.3 引擎自驭，含回炉自证：agreed 邻接格式违规被自家数值闸当场作废重宣

## 0.3.0（2026-09-04）闭环定序版（THEORY-v0.3 定理7 · 策略驻留引擎，轨迹涌现回路 · **breaking**）
- **breaking · 块级轨迹冻结废除**：freeze 语义改为锁**权重+组结构+约束**（单一锁点 weightsLocked），块级序列与 vChain 块档链合同整体移除——动作由快环每步实时提议（cost-to-go 最小者），规划降级为先验，权重才是合同。旧盘档 v2 经 migrateLegacy 只读迁移（零回写；对照组 tag v0.2-baseline=5cea82f 冻结，旧目录全程 git 零改动）
- **breaking · 差分契约 args=diff / engine=merge**：optimal_declare 收 {title,group,predict,channels,可选覆写}，链式量（beforeBand=盘档 lastBand 直读）、Q_N 成本投影、法基行由引擎物化后过**同一道闸**——契约书写 3.9KB/块→**0.4KB/动作（-89%，fit-plant 现跑复现）**，手抄错漏错误类整体消失
- **breaking · 另头审上线（audit_record，工具 10→11）**：redteam 动作闭合后引擎从栈文件**机械切审材**（非全栈复读），fresh 子代理直读盘档审推导链，回执**引文必须为栈文件逐字子串**（parseVerdict 伪造即拒；手动 cost_audit 同形同闸），verdict≤1KB 落账 closed[].audit。活证三态：reject 真拦落账（smoke#1 审出预测建模缺陷 4 issues）/pass 放行（smoke#2 引文×4 全真）/饱和归零（smoke#3 zero=true）
- **breaking · 第5闸「无测量不放权」**：merge 后 channels<2 → 准入=重流程（完整仪式+引导三要素），双通道闸不豁免——引导=补通道或降提议态，无绕闸第三位
- **修复 · 开发段可逆（a2）**：确认/修改翻转扫描覆盖 weights+rolling 全段（v0.2 只接 review 段——本单实证缺陷：develop 段用户改口只能 off 重开）；onWeightsUnlock 单口解锁，已闭账分毫不动（wiring p2 测例锁死）
- **修复 · 数值对硬校验（冒烟#1 活证两洞，当场修）**：agreed 从「格式含≠」升为「实测 <A> ≠ 预测 <B> 数字对且 A==B」——「实测13≠预测14」错配与「尚未发生」占位强制转不吻合当场作废；smoke#2 故意错配被拦原文在栈（rolledBack diffs 活证）
- **修复 · 底档 dip 饱和（smoke#2 死锁活证→smoke#3 复验）**：末动作落 at 档时 improve 必拦、dip 回升义务不可满足的死锁——after=at 的 dip 判 dip-saturated 不挂账并清同档旧账；terminalCheck 饱和口径同步（dipPlan 谎报 improve 照拦，闸只增不减）
- 教育=违规事件：讲课件自周期注入全撤（inject-text 薄面=off 回执+版本双导出，测例锁键集），常驻面=stateFace 纯函数（真档实测 740B；冒烟注入均值 206B/帧 vs v0.2 开局 2-3KB）；条款住进拒绝文本（本会话 declare 漏 law 被直拒=现场活证）
- 量尺转正 scripts/fit-plant.mjs：discrepancies/rolledBack 提取按盘实况修正（前版恒 0 缺陷入回滚史）；死会话逐值/活会话单调/篡改自测三制式；inj 口径 v1→v2 变更史在脚本头（两代并存可稽）
- 面板/端点追 v3 键面：panelBody 纯函数与端点同源（v:3·residual·groupsBrief·audit·无 costRemaining，真会话 curl 活证 HTTP200/无档 404），client v3 主读+旧键回退+降级不白屏守卫；**localhost GET 穿认证**（旧「curl 通道不可达」结论修正）
- 换代窗口纪律两轮活证：卸2挂3冒烟挂回，真账形状零污染（v0.3 写面隔离 .closedloop.json，主 .json v0.2 形状全程 intact）
- 测试 71/71（十文件规范命令尾行）；五闸+第5闸+a2→测例映射表 docs/TEST-DISPOSITION.md（旧 97 例逐用例处置）；冒烟读数对照表 docs/FIT-plant.md v0.3 追加段
- 未执行如实标注：**A/B 五域对照=用户撤销未执行**（预测表「未经对照验证」开放项，见 docs/CLOSEDLOOP-DELIVERY.md 遗留）；模型层参数接线=未做（面板 modelState 诚实占位）；declare 底档 dip 警示文案未同步饱和规则（误导性残留，v0.3.1）

## 0.2.0（2026-09-04）范式替换版（SPEC-replace v0.2 · 控制循环即状态机 · **breaking**）
- **范式彻底替换（非移植）**：状态机=控制环本身——代价标定→分解→冻结（档链机械生成）→滚动闭合→终端归零校验；v0.1 的"契约移植"废案
- **breaking · mark_task 删除**：旧机制终结——闭合唯一通道=optimal_converge 三要素（ΔV 序带严格降 × 数值「实测≠预测(通道)」异源复算 × channels≥2 标识两两不同），closed=V 账本锚点自动落账推进
- **breaking · 三选一 mode 废除**：correct/experience/research 三选一 mode 题取消（判定重心由代价档位承载）；cost_set 的 mode/requirements 旧参数显式拒收
- **breaking · 工具集换血为 10 件**（TOOL_NAMES 唯一真相，注册漂移 warn）：decompose / freeze / cost_set / cost_audit / revise_do / optimal_declare / optimal_converge / optimal_rollback / optimal_stack / terminal_check
- **代价定稿硬门（cost_set）**：断言逐条 severity(minor/major/catastrophic)+source——无来源=断言无效（定理4）；nonGoals 仅随用户选择题确认落盘（定理1 确认制，AI 直写=拒）；失败态权重→∞=防错选标准
- **代价对抗审（cost_audit）**：scope=group/block 冷视角找茬（source 真实性/语义收缩/law 前置），reject 必附证据清单，打回修复须再审；红队块过审才滚动
- **vChain 全局档链**：freeze 按块序机械生成 vIn→vOut（far/near/at，末块必 at）；链不连续=拒锁（生成防线）；块级 dv=局部档与全局期望并存不对表（三档粒度下中段平台属固有）
- **terminal_check 唯一 throw 位**：非 final 态直拒；全链唯一归零验证点，非零=报告交处置不阻断；**报告落盘 terminalReport 字段**（真跑坑③修复：判据要求落盘而实现缺失）
- **观测量自指禁令入 convergeLaw**（真跑教训固化）：凡引用盘档/栈演进量的预测必须写成跨通道动态等式，禁钉历史快照字面量（declare 自身即推入新 open 步）
- **形状契约直拒**（真跑坑①②修复）：measure.channels 非数组→契约文案回执+引擎兜底，原生 TypeError 消除
- **面板主体=V 账本**：/panel 只读端点（vLadderOf 与 stackText 同源）；档链阶梯全量节点+dip 挂账+剩余代价读数+openStep 活体行；计划树降为可展开细节
- **禁词表裁判制**：7 条禁词以 tests/lingua-forbid.test.mjs 为唯一真相源，src/**.js 全扫零命中强制（交付文档同受扫）
- 盘档 v2：stage/task/cost{assertions,nonGoals…}/plan/vChain/l1Locked/injected/terminalReport；旧 star/redteam 键只读兼容一周期；mode 键零读者零作者清除
- 自驭真跑验证：本版本由插件自身驱动完成全程（P 场会话 cost_set 8 断言→3 块闭合→terminal_check 归零），真跑反馈 6 处当场修，无默吞
- 测试 96/96（五文件规范命令实测尾行）

## 0.1.0（2026-09-03）最优律驱动版（SPEC-optimal v0.1-approved · LQR 结构律落地）
- **predict→optimal**：四工具换契约——optimal_declare 新增 cost 权重（Q/R 物化,失败态→∞=防错选标准）、law 偏差策略（≥1 条,消灭"调试"态结构位）、measure 双通道（≥2 独立标识,定理5）、vExpect ΔV 序带预期（improve|dip,dip 须回升计划）
- **converge 三要素硬闸**：ΔV cost-to-go 序带（far/near/at）严格下降 × 数值「实测≠预测(通道)」非同源复算 × 双通道一致；closed=V 账本锚点自动打卡
- **rollback=re-linearize + 反漂移签名**：来源/权重/不变式至少一易,同签名重 declare 引擎直拒（定理6）；连续 dip 禁止,回升义务挂账核销
- **无降级通道（拍板 D）**：mark_task 删除 offline derivation 兜底——无 optimal 工具=不得打卡
- 写闸前移：revise_do 栈顶 open 硬拒；pre-step ④ 栈提醒（open/invalidated 幂等键）；lock_stage L2 回执附 backward 价值链（拍板 E：accept 计数初档）
- 状态文件 .predict.json→.optimal.json（load 自动迁移）；目录/包/插件名统一 dsh-optimal-mode（拍板 F：新目录演进,原 dsh-graded-predict 保留回滚）；API 路径 /graded-mode/* 保留（client 契约）
- 诚实边界：借用 LQR 结构律,不声称数学等价；文献（Kalman1960/Bryson-Ho/Anderson-Moore/Mayne2000）正式引用前按先审校纪律复核



> 更早历史（grade 系 3.x/rc 时代）见 git 历史与 README 更名叙事。
