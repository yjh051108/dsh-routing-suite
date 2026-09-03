# SPEC-optimal — dsh-optimal-mode：LQR 最优律驱动（批准版 v0.1-approved）

> 2026-09-03 · **九项拍板已批**：A 映射表按现有执行 · B ΔV 三档+dip 例外 · C 硬 gate 只拦写工具
> （write/edit/edit_plan 类；pwsh/读观察不拦） · **D 删除 offline derivation 降级**（无工具=不得打卡，倒逼工具常装）
> · V 绝对档=**accept 断言计数分档**（0=达档/1-2=近/3+=远，插件从盘档自动算，天然有来源）
> · E backward 价值链=**L2 锁定时生成**（随规格单呈现可修订） · F **新建 dsh-optimal-mode 目录演进**（原目录保留回滚）
> · G 三个 offline 补丁**收编后废弃** · H **一次到位**（迁移清单 1-8 全走，末轮全量测试+注入验收）。
> 迁移落地于 `<v0.2-插件目录>`，本文档随迁移转正。
> 诚实首发：本插件**借用 LQR 的结构律**（backward 价值推导/单调门/策略前置），不声称数学等价——
> 任务状态空间非线性、代价非二次，Riccati 是类比骨架不是字面求解；凡类比处标注。

---

## 0. 为什么不是 predict、不是 MPC 框架

- **predict 错在重心**："猜值再核对"是表，**最优律从目标 backward 推导出来**才是里。名字应为
  optimal（最优律），预测只是模型的副产品。
- **MPC 黑盒宽泛**：每步在线重解有限时域优化=每轮重新想一遍未来——最优性交给数值优化器，
  **读不出推导链**（人体验=读推导是否严密，本文档体系的第一原则）。且 MPC 自己的稳定性证明
  要**借 LQR 的 P 阵当终端代价**（Mayne et al. 2000）——承载"最优+收敛"的硬结构本来就是 LQR。
- **LQR 给的是**：①闭式可写的 backward 递推（Riccati=逐步可复核的推导链）②预计算反馈律
  u=−K·e（在线只乘增益="少量 PID"被折进增益：全状态比例律≈PD，积分态消稳差）③**Lyapunov
  单调 V↓=定理级收敛**（"单调收敛"从口号变成检查项）④无穷时域天然适配长程（无 horizon 截断
  这个"宽泛"来源）。

**一句话总纲（替换旧版）**：
> 最优律由目标**一次 backward 推导**；每步只执行预推导策略并验证 cost-to-go 严格下降；
> 不降=模型错=重解（re-linearize），**永不手补控制器**——"调试"在结构上不存在。

---

## 1. LQR 骨架 ↔ 插件构件（映射表）

| LQR 构件 | 控制论语义 | 插件落点 |
|---|---|---|
| 状态 x | 系统当前态 | **残差向量**：北极星未满足项的带权清单（序带化） |
| 终端代价 Q_N | 目标点的误差罚 | **验收标准**（commit_star 的 accept + 模式题——Q_N 定义权在用户=定理 2） |
| 阶段代价 (Q,R) | 状态偏差 vs 控制努力 | **代价权重声明**：本步"进步值钱还是省力值钱"；每权重须来源（定理 4）；失败模式权重→∞=「防错=选标准」的字面化（最优律天生绕开，非事后纠偏） |
| 模型 (A,B) | 动作→状态转移 | **预测值来源**（公式/ISO/用户确认——无来源=模型不可辨识） |
| Riccati backward 递推 | 从 Q_N 倒推每步 V_i | **L2 锁定时生成价值链**：每小类带 V_in→V_out 期望档（不变式被下一步引用=状态转移 A 的物化） |
| 最优律 u=−K·x +前馈 | 预推导策略 | declare 的 **law 段**：偏差出现时的修正策略预先声明（增益×偏差形态）——消灭"调试"态 |
| Lyapunov 门 V̇<0 | 每步代价严格降 | **converge 的 ΔV↓ 硬闸**（=旧版"单调收敛"的形式化） |
| re-linearize | 工作点变了重解 | **rollback 的重定义**（§5）：产物=新模型/新权重，不是重试 |
| 可辨识性 | (A,B) 定不出就没法算 K | **置信=低→停，交分歧点**（人介入的显式出口） |

---

## 2. ΔV 序带三档机制（已定粒度）

不要求精确数值 V，但要求**每步与栈顶前一 closed 步对比**，报告方向并过闸：

| ΔV 档 | 判定 | 闸行为 |
|---|---|---|
| ↓ 改善 | 残差严格减少（断言清掉/风险降级） | 过闸条件之一；须**两通道一致**（公式推导×实测信号——定理 5 同源不计） |
| → 持平 | 无进展 | **不过闸**（终端未达成而持平=本步未产生代价下降=模型预言失效）；除非 declare 预声明了持平段（见 dip） |
| ↑ 变差 | 残差增加 | 不过闸→invalidated；**例外**：declare 预声明 `dip: 暂时变差+回升计划`（重构 J-curve/非单调真实段）——converge 按声明轨迹核对，吻合照闭 |

- V 的绝对水平=declare 自带的**残差档**（未满足项的粗粒度计数/分档即可，序数不基数）。
- 旧版"数值型 agreed 必须 ≠ 非同源复算"机制**保留**，叠加 ΔV 三档 → 闭合三要素：
  **ΔV↓（或声明 dip 吻合）+ 数值逐项吻合 + 两通道一致**。

---

## 3. 契约升级：五件套 → 最优律五件套（predict_declare → optimal_declare）

| # | 旧字段 | 新字段 | 变化 |
|---|---|---|---|
| ① | invariants | **state** | 不变式链 + 本步残差向量定义（x 是什么、本步改哪个分量）|
| ② | predictions(值+来源) | **value** | 保留；追加**ΔV 预测档**（本步预期把残差从档几降到档几）——先算后做不变 |
| ③ | budget(失败+防错) | **cost + law** | 拆两段：cost=Q/R 权重声明（含来源）；law=**反馈策略**——若观测偏差 e 出现，预声明的修正动作（增益×偏差形态），"永不手补"的前置化 |
| ④ | observations | **measure** | 预期-观测对升级为**双通道测量计划**（ΔV 两条独立通道；单通道=closed 不合格）|
| ⑤ | confidence | **identifiability** | 语义收紧：模型 (A,B) 可辨识性；低=停下交分歧点（工具回执直说） |

兼容性：字段改名但栈文件（`<sid>.predict.json`）结构演进为 `V2`（带 V 账本字段），旧会话文件读入自动降级（不炸）。

---

## 4. 工具面（10 → 10，4 改名 + 2 强 gate）

| 工具 | 状态 | 变化 |
|---|---|---|
| commit_star / edit_plan / lock_stage / mark_task / redteam_verdict / revise_do | **保留** | mark_task 增 V 链核对；redteam 语义改「代价函数对抗审」（见 §6） |
| predict_declare → **optimal_declare** | 改造 | §3 契约 |
| predict_converge → **optimal_converge** | 改造 | 闭合三要素（§2）+ V 账本记录（每步 V_in/V_out 落盘）|
| predict_rollback → **optimal_rollback** | 改造 | reason 必须是 re-linearize 产物（§5）|
| predict_stack → **optimal_stack** | 改造 | 增 **V 时间线**（三档轨迹+权重变更史）|

## 5. rollback = re-linearize（反漂移形式化）

- 现状：rollback 撤栈顶→重 declare（可原地重猜）。
- 新律：invalidated 后 declare 的**模型签名必须变**——`sources(预测来源集) ∪ weights(Q/R) ∪ 状态定义`
  三者至少其一变化；签名近似重复（同 title+同来源集）→ **declare 拒绝**，回执=定理 6：
  「第 2 次不降禁止再调参数——换建模/换范式/交人」。落盘审计（rolledBack 史）记签名。

## 6. 状态机与注入（V-drive 骨架的 LQR 读法）

`off → brainstorm → l1-edit → l2-edit → review → develop → final` **全部保留**，语义各就位：

- **brainstorm**=终端代价校准（验收三要素+权重+模式=Q_N 定义，选择权在用户）
- **l1/l2-edit+lock**=状态空间分解；**L2 锁定新增 backward 传播**：从组目标倒推每小类
  V_in→V_out 期望档（写进小类 spec 的派生字段，锁定时随规格单呈现）
- **review**=模型与权重的独立可读性审（规格单含价值链）
- **develop**=最优律闭环（每步：declare 契约→实现→converge 三要素）
- **组收官**=**V 链覆盖检查**（组内各步 ΔV 账本单调、末档≤组目标档）——旧逐条核对的数学化
- **final**=终端代价清零验证（北极星残差全清+抽查）
- **红队门**=代价函数对抗审（阈值是否自造/权重是否收缩语义——定理 2/4 的结构位）

**闭环接线（体检缺口：现状 gate 在打卡位是迟到的）**：
1. 写路径硬 gate 前移：编辑/实现类工具（edit_plan/revise_do/及宿主写工具声明）execute 时查栈顶——
   open 未 converge → 拒绝+推 converge 契约（与现有 redteam 门同风格，硬 gate）
2. pre-step 主动推送：栈顶 invalidated → 注入 re-linearize 契约；栈空/全 closed → 注入激活小类
   的 optimal_declare 契约（每步从推导起步；幂等键防重注，复用现有先注后键机制）
3. 文本/命令通道（graded: 触发语系）保留；`[模式:x]` 扫描不动

## 7. 叙事改造（激发器 6 全文落地）

退役词→替换：**测试通过→"与推导一致/代价下降"**；**调试→"重推导"**；**验收合格→"终端代价清零"**；
**predict→optimal**。注入文本全语系随 §3/§6 更新（inject-text.js 单点）。

## 8. 文献锚点（正式引用前按"先审校"纪律逐条复核）

1. Kalman, R.E. (1960). *Contributions to the theory of optimal control*. ZAMM —— LQR 出处。
2. Bryson & Ho (1975). *Applied Optimal Control*. —— Riccati backward 递推教科书。
3. Anderson & Moore. *Optimal Control: Linear Quadratic Methods*. —— LQR/ARE 标准教材。
4. Mayne, Rawlings, Rao & Scokaert (2000). *Constrained model predictive control: Stability and optimality*. Automatica. —— MPC 稳定性借终端代价（LQR P 阵）的正宗文献；MPC 降格为"滚动框架"的依据。
- 保留旧文档的撤回纪律（2408.06254 类防伪引用）。

## 9. 体检事实基线（本 spec 的现状依据，2026-09-03）

| 项 | 实测 |
|---|---|
| 全量测试 | **70/70 绿**（V-drive 66 + predict 4，node v22.20.0） |
| 装配状态 | 已注入 active（`98089ef2 @dsh-external/dsh-graded-predict [injected]`）；旧 graded-mode 已禁用 |
| 门控现状 | mark_task 已吃 closed 步（含 offline derivation 降级）；converge 全吻合自动打卡；**pre-step 主动拦截未接（gate 迟到）** |
| 打包残留 | tgz 仍名 `dsh-external-dsh-graded-mode-0.0.1-rc1`（未按新包名） |
| 离线补丁 | `patches/graded-predict-offline*.mjs` ×3 待收编或废弃 |

## 10. 迁移清单（纸面通过后执行）

1. 目录/包/patch id 改名 dsh-optimal-mode；tgz 重打
2. `predict-engine.js` → `optimal-engine.js`：V 账本 + 闭合三要素 + 签名反漂移 + 兼容读旧栈
3. tools.js：4 工具改名换契约；mark_task V 链核对；写路径硬 gate 前移
4. index.js：pre-step 闭环推送（幂等键复用）
5. inject-text.js：§7 叙事语系 + L2 锁定 backward 价值链生成
6. 面板/审计：V 时间线 + 权重变更史
7. 测试：ΔV 闸/dip 轨迹/签名反漂移/迟到 gate 修复，e2e×4 更新
8. THEORY.md 修订 + 本 SPEC 转正式版

---

**待批点（纸面对齐用）**：A. 映射表有无过度类比处；B. ΔV 三档 + dip 例外是否接受（或持平一律不过闸）；
C. 写路径硬 gate 前移会不会误伤（declare 前读代码/调查属只读不算写，仅拦写工具——边界请确认）；
D. offline derivation 降级通道保留否（宿主无 predict 工具时的兜底）。
