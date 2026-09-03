# Changelog
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
