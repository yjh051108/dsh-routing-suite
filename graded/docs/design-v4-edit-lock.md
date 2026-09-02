# v4 设计：编辑+锁定两工具的分级模式（讨论稿 v2 — 顺序强制版）

> 状态：讨论稿（用户拍板后实现）。v3 基线：plan-l1/plan-l2/mark-l1/mark-l2 四工具 + 模型自调 ask_user_question +
> #L1/#L2 字符串编码 + 解析器识别。
>
> **用户拍板（已定,不再讨论）**：
> 1. **顺序强制**：必须先大类后小类（大类编辑→大类锁定→小类编辑→小类锁定）。阶段注入两段式不变。
> 2. **不识别**：过程不靠解析 #L1/#L2 字符串,靠**工具调用本身**（类的归属是工具参数,lock 驱动阶段推进）。
> 3. **编辑即展示**：每次编辑成功立即落盘, GUI 实时可见。
> 4. **工具就两个**：edit_plan / lock_stage,level 参数切语义。
> 5. **全锁自动树状审核**：L1+L2 都锁定 → 插件直接 ctx.userQuestions.ask（树状图 detail）。
> 6. **不祸害 todo**：不写官方 todo_write；数据面 = todo max（独立事件 `graded/plan`）。官方 todo 面板零污染。
> 7. **官方面板可见树状图**：client 插件渲染（/plugins/<id>/client.js 装配链）。

## 1. 状态机（工具驱动,顺序强制）

```
off ──/graded <任务>──▶ L1-EDIT ──lock_stage('L1')──▶ L2-EDIT ──lock_stage('L2')──▶ REVIEW
                        │      │                      │      │                       │
                        │      │                      │      └── 全锁=所有门关闭 → 自动 ask(树状)
                        │      └──(注入下一阶段提示)───┘
                        └── 注入「先想大类」提示   注入「三概念分化」提示
REVIEW ──审核通过──▶ DEVELOP（逐小类开发,下轮设计; 候选 mark_task 单工具）
REVIEW ──审核拒绝──▶ 解锁对应层,注入意见,回编辑（解锁粒度下轮定,候选: 含"大类"意见 → 回 L1-EDIT,否则回 L2-EDIT）
```

- **阶段工具面（有门,但按阶段固定,不做内容解析）**：
  - L1-EDIT：`edit_plan`（只接受 level='L1'）+ `lock_stage`（只接受 level='L1'）
  - L2-EDIT：同上但 level='L2'（分阶段注册同工具不同校验——工具按当前阶段校验 level,错误层级直接报错）
  - REVIEW/DEVELOP：edit/lock 不再可用（审核期间屏蔽）
- **锁定语义（锁了就是锁了）**：lock_stage 后该层 edit_plan 拒绝（"L1 已锁定"）；解锁唯一入口=用户审核拒绝（插件自动按意见解锁）

## 2. 工具设计

```js
edit_plan({ level: 'L1', items: [{ title: '大类名' }] })
edit_plan({ level: 'L2', groups: [{ title: '大类名', items: [{ title: '小类名', concepts: ['概念1','概念2','概念3'] }] }] })
lock_stage({ level: 'L1' | 'L2' })
```

- **edit_plan**：校验 level 与阶段匹配（已锁层→报错）；立即写 `graded/plan` 树快照（编辑即展示）；返回树文本（模型感知清单）
- **lock_stage(level='L1')**：校验 L1 树非空 → 标记锁定 → append `graded/lock`；随后 pre-step 自动注入 L2 阶段提示
- **lock_stage(level='L2')**：校验 → L1 已锁 + L2 树非空 → 锁定结尾 → **在工具执行内** `await ctx.userQuestions.ask({ questions:[{ id:'graded-plan-review', question, detail: <树状 markdown>, options:[确认/修改], intent:{kind:'plan-review', approve:'确认'} }], agent, signal })` → 答案回传:通过→注入确认文本+DEVELOP;拒绝→解锁+意见文本
- **ask 的 detail**：由**结构化树对象**直接生成（不是解析字符串）；官方 plan-review 意图渲染为计划卡片；client 树状渲染吃同源对象

## 3. 数据面（todo max,不碰官方 todo_write）

- 事件：
  - `graded/plan`：`{ treemap: { groups: [{ title, locked, items: [{ title, concepts, status }] }] } }`（每次 edit 后全量快照,复用官方 projection 风格）
  - `graded/lock`：`{ level: 'L1'|'L2', at: <时间戳>, treemap }`
- **官方 todo_write 全程不写**；模型感知清单 = 工具结果文本（每行 `#L1 大类` / `  #L2 小类 | 概念: a,b,c`,**纯展示,不做解析**）
- 会话持久化：事件随 session.jsonl（官方事件流）自动落盘 ✓；树面板刷新后从事件重放还原 ✓

## 4. 官方面板树状图（client 装配链）

- 插件 package.json：
  - `exports["./client"]` → `./lib/client.js`（构建产物,build.mjs 扩展复制 client/ → lib/client/）
  - `dsh.client` 段（依赖名列表,参照官方 client 插件 package.json 形态）
- 装配：web-app 的 client roster（dsh-client-modules 扫描 `dsh.client` 行 → `/plugins/<id>/client.js`）；浏览器 `window.__ModuleLoader__.load({id, factory})`
- client 职责：订阅 session 事件 `graded/plan`/`graded/lock` → 渲染**可展开/收起的树面板**（在官方 UI 内,任务消息流附近或独立卡片；展开状态为渲染层本地态,刷新由事件重放恢复）；审核 detail 树与面板同源
- 降级路径：client 未加载时,工具结果文本树仍完整可见（纯文本 `#L1/#L2` 行）

## 5. 与 v3 的差异/迁移

| v3 | v4 |
|---|---|
| plan-l1/plan-l2/mark-* 四工具 | edit_plan / lock_stage 两工具 |
| #L1/#L2 前缀 + 单行合并编码 | 结构化参数 + 事件对象（零字符串解析） |
| 解析器识别阶段（plan-tree.js 猜测） | lock 事件驱动（确定） |
| 模型自调 ask_user_question | 插件自动 ctx.userQuestions.ask |
| 写官方 todo_write（污染） | graded/plan 独立事件（零污染） |
| 平铺 GUI | client 树状渲染（+审核计划卡片） |

- 保留：mode-state 幂等注入逻辑、phaseSplitting 提示词思想、renderTree（改为从结构化对象生成）
- 退役：plan-tree.js 解析（旧会话查看兼容改为"仅展示不做状态依据"）

## 6. 开放点（下轮）

1. 审核拒绝的**解锁粒度**（意见含"大类"回 L1-EDIT 与否）
2. develop 执行期工具（mark_task 候选）与 focusL2 注入
3. client 构建链落实（tsdown/esbuild 最小化——单文件 client.js 无明显依赖可免构建?）
4. 旧会话对旧格式的查看兼容策略
