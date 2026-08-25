# FEEDBACK-v34 — router-standard 跨预设自验反馈清单

> 来源：对 v34（v1.19.1）的一次完整自验（HTML 交付型任务）后的真实感受，
> 分"建设性/不顺手"两面。**状态：记录待办，未实施**——用户明确"先停下来，不继续改代码"。
> 每项含：建议 + 我的根因定位（源码级）+ 建议优先级。
> 待用户点头后按优先级落地；落地后须过 `sync-preset.cjs --bump` + selftest + `dev_reload_preset`。

## 一、做得好的（保留，不改进）

1. **渐进式工具解锁（phases）**：降低"用哪个工具"的选择噪音。✅ 保留
2. **Meta 工具按需查询**（`tools_catalog`/`tools_help`）：不背全 schema。✅ 保留
3. **内置页面验证**（`dev_page_check`）：headless Chrome + 截图 + console + DOM smoke 一条龙。✅ 保留
4. **交付 gate + evidence manifest**：强制 file/utf8/smoke/视觉证据 + `reviewed:true`。✅ 保留
5. **todo/goal/branch/background jobs**：长任务持久化。✅ 保留

## 二、不顺手 / 分散注意力（建议改进）

### #1 [高] dev_page_check 的 DOM 输出太长
- **现象**：每次返回约 6–8KB 完整 UI DOM（大量 `<input type="range">` 面板），10+ 次验证后重复垃圾文本占大量上下文。
- **建议**：默认只返回"错误 + 元素摘要"或提供 diff，不返回完整 DOM。
- **根因**：`stripDomNoise()`（`router-bootstrap.mjs:431`）目前只剥 `style/script`，很浅；`domChars` 默认 8000（第622行）。输入框/滑块类控件文本未被过滤。
- **优先级**：高（直接省上下文，最立竿见影）。

### #2 [高] URL 处理不够透明
- **现象**：带 query 测（`...html?ui=0`）时工具把 `?` 编码进文件名 → `ERR_FILE_NOT_FOUND`；改成 `file:///...?...` 才成功。
- **建议**：schema 说明"带 query 必须用 `file://` 形式"；或自动识别 query 不编码。
- **根因**：`normalizePageUrl()`（`router-bootstrap.mjs:525`）`/^[a-z][a-z0-9+.-]*:\/\//` 判断 scheme，非 scheme 走自动编码，把 `?` 当路径字符。
- **优先级**：高（浪费一轮；文档补一行即可缓解）。

### #3 [高] write/edit 返回完整前后文本
- **现象**：绑定返回全文，系统提示虽警告但误用即上下文爆炸。
- **建议**：默认返回 **diff/hash + 行号范围**，不返回前后全文。
- **优先级**：中高（依赖 dsh 原生绑定，预设侧改动有限，需评估）。

### #4 [中] 页面视觉证据要"另起一步"＋缺异常点 checklist
- **现象**：`dev_page_check` 只返回截图路径，需再 `read_image`；无前后对比/自动伪影检测。本次把"阴影内白色亮斑"误判为星点 bloom。
- **建议**：门禁加"异常视觉 checklist"（阴影内孤立高亮点 / 盘边缘硬边 / 天空不连续色块），或半自动伪影提示。
- **根因**：当前只有 `reviewed:true`（人工标记），无自动伪影检测逻辑（`router-bootstrap.mjs` 无 artifact/bloom 检测）。
- **优先级**：中（这是"可审计、能发现伪影"的短板）。

### #5 [中] pageCheckLock 状态语焉不详
- **现象**：`dev_router_status` 显示 `pageCheckLock=busy`，无说明影响什么、要不要等。
- **建议**：加一行说明（"另一页面检查进行中；若超10分钟自动接管"）。
- **根因**：单飞锁已有 owner/at 字段（第561-568行），但 `dev_router_status` 未渲染说明文案。
- **优先级**：中（低实现成本）。

### #6 [中] "自我路由"阶段推动是元工作，与任务竞争注意力
- **现象**：write/edit 已预解锁，常在某阶段就完成实现，`phase_advance` 显得像补手续。
- **建议**：评估阶段推进是否可以更轻量、或将完成信号更紧贴任务自然节点。
- **优先级**：中（哲学层面，需你拍板方向，不擅动）。

### #7 [中] 工具签名不统一，关键工具需预置默认值/直接展示
- **现象**：稳定工具（`dev_page_check` 的 timeout/width/height、`delivery_check` 的 evidence 结构）须先查询 schema，否则猜错参数。
- **建议**：预置默认值并直接展示默认值。
- **优先级**：中。

### #8 [低] 一次会话里工具面仍偏大（validation 阶段全开）
- **现象**：phase 3/3 所有工具一次全开，`ralph/workflow/engram` 对单 HTML 任务用不上仍占 schema 与注意力。
- **建议**：按任务类型裁剪非必要重型工具。
- **优先级**：低（哲学 + 裁剪逻辑，需你定）。

## 三、Bug（待修，最高优先）

### BUG-1 [高] dev_page_check 每次检查完挂后台，电脑总炸
- **现象**：`dev_page_check` 反复跑后累积后台进程 → CPU/内存爆。
- **根因定位**（源码级）：
  1. `pageCheckRun()`（`router-bootstrap.mjs:550`）失败时**自动重试**（第577-587行）会再拉一次 Chrome → 失败场景双进程。
  2. `forceTreeKill()`（第596-608行）是 **fire-and-forget**（`sub.spawn` 不 await），且只按**主 pid** `taskkill /F /T`。
  3. `--headless=new --screenshot --dump-dom` 的 Chrome 会 fork 多个子进程（renderer/gpu/utility）；若主 pid 已失效或 taskkill 枚举不到整棵树，**孤儿 chrome 进程残留**，10+ 次检查就堆积 → 爆机。
- **定位结论**：孤儿 Chrome 进程**回收不可靠**是根因——`forceTreeKill` 依赖主 pid 精确 + taskkill 全树，两者在 headless 下都脆弱。
- **建议修复方向**（待批准）：
  a) `--headless` 下给 Chrome 显式 `--run-all-compositor-stages-before-draw` + 用 `--screenshot` 结束即退；或改用一次性 profile 并确保退出。
  b) `forceTreeKill` 改为**等进程真正退出**（await + 超时哨兵），或按 `--user-data-dir` 进程组枚举全杀（不只主 pid）。
  c) 重试逻辑加"上一 Chrome 已确认回收才允许下一拉"。
- **优先级**：**最高**（直接影响可用性，你的机器反复被打爆）。

## 四、落地方式（待你点头）

- 全部改动走 **preset 源码（无版本别名）+ `sync-preset.cjs --bump` + selftest + `dev_reload_preset`**。
- **修复顺序建议**：BUG-1（爆机）→ #1 DOM 精简 → #2 URL 提示 → #5 pageCheckLock 说明 → 其余按你定优先级。
- 涉及哲学/方向（#6 #8）先与你对齐再动，不擅改。

> 详细演进史见 `CHANGELOG.md`；设计文档见 `docs/STANDARD-PLAN.md`；开发流程见 `AGENTS.md`。
