# Changelog

本项目版本与仓库提交对应，格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

> **版本以 git tag 为准**：已发布 v0.3.1 / v0.3.3（GitHub Releases 资产）；未打 tag 的
> 小节为开发史（其内容随下一个发布一并交付）。

## [0.3.3] — 2026-08-15（已发布，git tag v0.3.3）

### 更新（高性能引导升级为 P1-P23 完整认知）

- **规范铁律 7 条 → 10 条**：新增「近距离信号原则」（所有行为引导必须在用户消息之后注入，远距离同指令衰减甚至反向——P13/P14/P20）、「弱域内路由」（模糊任务交模型自分类，按模型选 persona——P8/P11）、「单任务长链路三锚」（回顾+收敛+反跑题，完成率 0%→100%——P22/P23）
- **缓存原则强化**：system 前缀任何动态变化 = 全量缓存 miss（命中便宜 10 倍）；固定文本引导保持 92-94% 命中
- **高性能引导认知表**：首轮锚定 / 近距离引导 / 弱域内路由 / deep-guide / 单任务三锚 / plan-mode 保留——六机制落地方式与实测数字
- 参考链接更新：[dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) v0.1.0（含论文与 P1-P23 全数据）

### 验证

- v0.3.3 为**实装发布**（含 lib 变更，非文档-only）：注入器自检 8/8 PASS（测试插件构建 /
  注入 host ✓ / 热重载 uid 变化 / 自重载节流 / 预检拦截 / lib 恢复 / 卸载即净 / patch 写入
  合法性），Windows 官方装配路径实测
- 历史说明：v0.3.1 之后至 v0.3.3 之前的提交（0.3.2 特性、0.3.3 文档、patch 去重）未单独打
  tag——v0.3.1 的 Release 资产含其中部分内容，完整内容随 v0.3.3 交付

### 修复（v0.3.3 实装：Windows 装配实测三 bug + 自包含打包）

- **writePatch/extractPatchBlocks 粘连 bug（patch 串位）**：条目块后的顶格注释被并入前一块，
  块间重写无换行 → 注释与下一 `- id:` 粘连成一行，`disabled: true` 错挂上一条目（实测：
  卸载自检插件后注入器行被禁用）。修复：每块保留行尾换行、顶格注释单独成块，块间 join 不再粘连
- **DSH_HOME 优先（homedir 错家）**：web 进程 homedir 与 DSH_HOME 不一致时（如服务账户/
  跨用户部署），registry/profileNodeModules/日志全错位，junction 建到错误 profile → loader
  找不到包。修复：`process.env.DSH_HOME || homedir()/.dsh` 统一路径（scaffold 模板同步）
- **自检 tmpDir 去硬编码**：移除自检临时目录的硬编码个人路径（盘符/用户名不再出现），改 DSH_HOME 下
  稳定目录；`reloadPackage` 磁盘降级改 import **realpath URL**（junction URL 会被 tsx 旧缓存
  命中，tmpDir 迁移后重载失效——实测 uid 不变）
- **findBash 拒绝 WSL**：Windows 装 WSL 时 System32\bash.exe 抢先 PATH 命中，构建必挂
  （"适用于 Linux 的 Windows 子系统没有已安装的分发版"）。修复：Git/PortableGit 路径优先，
  PATH 探测结果含 wsl 标记即拒绝
- **宿主自包含打包（issue #1 根治）**：tsdown 新增 host bundle，把 @deepseek-ai/dsh-tools /
  schemastery 等运行时依赖打进 lib/index.js——官方装配（`dsh plugin add <目录>`，link: 依赖
  不装 peers）不再出现 `Cannot find package '@deepseek-ai/dsh-tools'`，任何装配路径均可加载
- **杂物清理**：移除源码中的个人引用（engram 注释/默认匹配名）、`dev_reload_package` 描述
  不再带默认插件名；`Config` 显式标注（junction 依赖下 declaration 报 TS2742）
- 自检 8/8 PASS（含 patch 写入合法性 + 热重载 uid 变化）

## [0.3.2] — 2026-08-15

### 新增（高性能引导：首轮锚定 + 工具 schema 精简）

- **骨架模板自带高性能引导**：`dev_scaffold_plugin` 生成的 toolkit 骨架头部注释新增两条
  高性能铁律（工具 schema 精简——description 短句化、详解不进 schema；首轮锚定——工具面
  ≥5 时首轮只露核心 1-2 个、首个 `tool/call` 后恢复全部），`apply()` 末尾附**可启用的首轮
  锚定实现块**（`system-prompt/assemble` Waterfall 过滤器 + `agent.session.events` 持久化
  推导晋升，resume 安全，只裁剪本插件工具）
- **README 规范铁律 5 条 → 7 条**（新增「首轮锚定」「工具 schema 精简」），新增
  「高性能插件（首轮锚定 · 为什么 & 怎么做）」小节：原理、三步启用、session JSONL 验证法
- **SPEC 铁律 6 条 → 8 条**，新增第 6 节「性能引导契约」：事件契约（Waterfall 必须
  `await next()`、`agent` 判空、晋升从持久日志推导、工具执行失败也算晋升）、过滤边界
  （只裁剪本插件工具）、成本模型（首轮无缓存 prefill 全量计费、17.6 万字符实测、schema
  面 vs 文本内容的微探针证据）

### 参考与致谢

- 首轮锚定机制源自 **xiaobright** 的
  [`dsh-anchored-standard`](https://github.com/xiaobright/dsh-anchored-standard)
  （MIT，两阶段锚定 preset 与 `tool-bootstrap.mjs` 实现，Project2 实测 98/99）
- 原理分析与统计证据来自 **xiaobright** 的
  [`modeltest`](https://github.com/xiaobright/modeltest)（V4.1b，frozen：
  harness 对照分析 / 触发机制实验 / 轨迹统计）

### 验证

- tsc 编译通过；新骨架实测：`dev_scaffold_plugin` 生成文件含铁律注释与锚定块
- 运行副本（cloud-restore 云源自举）同步 `lib/` 后自重载，前后均 active

## [0.3.1] — 2026-08-14

### 修复（pixel-forge 事件根治——坏 client 挂死 HARNESS）

- **autoRestore 恢复前 client 校验**：坏 client 插件（缺 inject）恢复时**跳过 + 审计**（此前恢复路径无校验——坏插件在 registry → 新会话启动 → client apply 失败 → 整个 HARNESS "Failed to load plugins"——用户被迫手动修）
- **校验正则兼容单双引号**：用户手修的双引号 `inject = ["slots"]` 被误判为"缺 inject"的 bug
- **clientSkeletonProblems 公共化**：注入阻断 / 恢复跳过共用同一校验逻辑（一条防线两处生效）

### 新增

- 注入前 client 骨架校验升级（v0.3.0 并入）：同时检查编译产物 lib/client.js（只有 lib 无 src 不绕过）+ 缺 inject 阻断注入

### 验证

- 双引号 inject 假插件注入通过（不误判）
- 坏 client 假插件注入阻断
- 自检 8/8 无回归

## [0.2.6] — 2026-08-14

### 修复

- **watch 自动重载前预检**（用户反馈"太自由容易自杀"）：build 半途/改错导致的损坏 lib 不可加载时**拒绝自动重载**（旧代码继续运行）+ `watch-precheck-blocked` 审计——与手动自重载的预检拦截同一道防线。实测：music-forge 构建半途被拦一次，build 完成后正常注入
- **systemPrompt.context 重复注册容忍**：自重载 rebuild 不再因 `duplicate` 整体 failed（此前导致注入器死亡 + 自愈 3 连败）
- **恢复路径验证**：注入器 failed 后用 **touch patch（include.refresh 进程内重装配）复活**——免杀进程的"延迟重启"（实测 6 秒恢复 + 自检 8/8）

### 兼容

- **DSH 0.1.0-rc.6（正式开源版）验证通过**：注入器一行未改直接运行，自检 8/8；peerDeps 范围声明（`>=0.0.1-rc <2`）在 rc.5 → rc.6 升级中实证"升级不报废"

## [0.2.4] — 2026-08-13

### 修复

- **发布包可独立安装（实测验证）**：tgz 增加 `scripts/build.sh`（此前 `files: ['lib']` 未带构建脚本）——解压副本此前缺 node_modules 依赖链接，`dsh plugin add` 后 `ERR_MODULE_NOT_FOUND` 装不上。现在解压后 `DSH_CHECKOUT=<checkout> bash scripts/build.sh` 即可建依赖链接。**实测**：下载 v0.2.4 tgz → 解压 → 建依赖 → 重启 → 注入器从云端副本加载并工作（自举验证通过）
- **自重载降级匹配用 realpath**：缓存无匹配降级从磁盘加载后，按包名重新匹配会失败（副本目录如 `cloud-restore` 不含包名）——改 `realpathSync(lib)` 匹配 loadCache 真实 key（实测：云端副本自重载链路修复）

### 质量

- 云源自举实验：卸载本地注入器 → 下载 GitHub release 副本 → 装配 → 运行中注入器 = 云端版（entry URL 指向副本），工具/自检全部可用

## [0.1.0] — 2026-08-12

### 新增

- **超级模组注入器**：运行时注入任意本地 DSH 插件包（junction 链接 + `loader.create`，不碰 patch / package.json / bundles 列表、不重启进程），注入清单自动恢复（`~/.dsh/super-injector/registry.json`）
- **热重载全家桶**（融合 dsh-bundle-hmr）：`dev_reload_package` 整包重载（清缓存 → 重新 import → 重建 fiber，失败回滚保留旧代）、`dev_plugin_status` 装配清单、`dev_install_package` 双路径安装（profile package.json + junction + loader.create）
- **卸载器**：`dev_uninject_plugin` 卸 loader entry（fiber dispose 全清理）→ 清注入清单 → 删 junction，免重启；引导器自身受保护不可卸载
- **路由残留自愈**：`dev_clear_routes` 直捣 webserver 内部路由表（exact/prefixes/upgrades），按 path 前缀删除孤儿路由，插件热重载残留 `duplicate route` 免重启即可清除
- **强制登记守卫**：`reloadPackage` 重建失败若报 `duplicate / already registered` → 判定未登记裸注册 → 明确报错（要求插件把资源注册挂 `ctx.effect`）+ 自动清理残留路由
- **开发侧挂区（staging）**：测试/开发工具挂"后侧"不进 tools schema（缓存零污染），`dev_stage_call` 测试、`dev_stage_promote` 一键转正（唯一一次缓存刷新）、`dev_stage_demote` 撤回——杜绝开发期工具波动打穿 DeepSeek 前缀缓存

### 优化

- **注入缓存友好化**：注入文本固定 + order 9998 尾部化（参考官方 system prompt 设计），移除 llm/stream 动态旁路——system 前缀恒定，缓存命中不再受注入波动影响

### 修复

- `getOuterStack is not a function`：`registry.plugin` 第三参必须是函数（`() => []`），双路径修正
- 工具 schema 兜底 + `safeRegister` 冲突容忍（同名工具跳过注册而非崩溃）
- 注入防重改权威判断（`hasActiveEntry`）+ 失败残留清理

## [0.1.1] — 2026-08-13

### 修复

- `dev_stage_demote` 无法注销已转正工具：`dev_stage_promote` 注册改挂 `ctx.effect` 并保存 disposer，demote 时真正从正式工具集注销（此前只删 staging 条目，正式注册残留）
- `purgeCache` 防御：loader.internal 缺失时安全跳过（不再非空断言炸 inject 路径）
- registry 原子写（tmp + rename）：中断不残留半截 JSON 毒化自动恢复

### 优化

- `dev_inject_plugin` dir 参数必填 + 空值兜底报错
- `hasActiveEntry` fiber 状态魔数（2）改为语义常量（FIBER_NAMES 反查 'active'）
- 预防正式版：peerDeps 放宽（`@deepseek-ai/dsh-tools >=0.0.1-rc <2`、`cordis >=4.0.0-rc <5`）
- 文档：README 新增「生态定位：官方之下的运行时标准层」章节

## [0.2.3] — 2026-08-13

### 修复（外部测评 P0/P1 + 作死压力测试驱动）

- **自重载链路断裂根治（P0）**：缓存无匹配不再 INFO 退出——降级从磁盘 URL 直接加载（junction/urlMatch 目录的 lib/index.js），`loader.import` 重新解析磁盘填充缓存后继续重载流程。此前缓存丢失（并行 build/自检交错 purge）会让自重载/热重载直接失效，只能人工 touch/重启；现链路自愈（实测：清空缓存 → 自重载直接从磁盘加载成功，审计 `cache-miss-healed`）
- **watch 悬空抑制（压测③）**：目录消失/悬空 junction（源被删/改名）时，watch 不再盲目 reload（此前虚增 ✓ 且无审计）——跳过重载 + `watch-dangling` 审计一次（30s 节流防刷屏）
- **uninject 统计口径（压测②）**：无匹配 = no-op 幂等，既不计 ✓ 也不计 ✗（此前：早期计 ✗ 产生 9✗ 假失败；后改计 ✓ 高估成功）
- **注入错误区分（压测①）**：`目录不存在或不可访问` 与 `存在但无 package.json` 分开报错

### 新增

- **操作失败可审计**：stats.json 增加 `lastFailures`（最近 5 条失败：类型 + 时间戳 + 原因），`dev_plugin_status` 展示「最近失败」区——9✗ 假失败等历史可追溯
- `dev_uninject_plugin` 的 match 参数改为必填 + 空值守卫（此前空参 `match.includes` TypeError）

### 质量

- 作死/压力测试（subagent 极限场景）：连环自重载 / 坏语法自杀 / 注入不存在目录 / 重复注入幂等 / 卸载不存在插件 / 缺参守卫 / 注入后删源码（悬空 junction）/ 注入卸载循环 3 轮 / 连跑自检 2 次——**六条防线全部扛住，零崩溃零残留，11 步全 PASS**
- 修后自检 8/8 全绿 + 卸载 no-op 统计不再污染（31✓/9✗ 恒定）

## [0.2.2] — 2026-08-13

### 新增

- **INSTALL.md 傻瓜式安装手册**：Release 包 / git / 手动 patch 三方式 + 验证 + 10 行排查表 + 卸载回滚小节 + Windows（Git Bash/cmd 双语法）说明 + 版本号占位（`<版本>` 不写死）
- **`[injected]` 标记**：`dev_plugin_status` 对运行时注入的插件标注（与 bundle 装配区分，hash id 不再难认）
- **`dev_self_test` 热重载自包含**：重载自检插件自身（固定 specifier + 固定目录，缓存一致），不再依赖环境里的外部插件（如 engram）

### 优化

- `dev_self_test` 预期拒绝场景（节流/预检拦截）改 `[EXPECTED]` 前缀——计入 PASS，不再误导新手
- client 状态区分：无 client 声明 → `client 跳过（属预期）`；有声明注册失败 → 真 `✗` + 诊断指引
- `dev_uninject_plugin` 描述补"另写 profile patch disabled 条目（防 include.refresh 加回）"，与实测行为一致
- 引导提示词补一行从零体验路径（dev_plugin_status → dev_self_test → dev_scaffold_plugin → dev_build_plugin → dev_inject_plugin → dev_uninject_plugin）

### 修复

- 注入 junction 悬空重建：`existsSync` 对悬空 junction 返回 false（跟随目标）导致 symlink EEXIST——改 `lstatSync` 判断链接存在 + `rmSync` 删除重建
- `uninject` 幂等：已存在同名 disabled 条目时跳过（此前重复卸载会累积 patch 条目）
- 自检 patch 清理：列表存在时不再追加 `[]`（防双顶层值回归）

### 质量

- 零上下文 subagent 三轮评测闭环：9/10 → 9.5/10 → **10/10**（七条 polish 全部落地 + 8/8 回归连续通过）

## [0.2.1] — 2026-08-13

### 优化

- `dev_self_test` 预期拒绝场景改 `[EXPECTED]` 前缀（不误导新手）
- client 状态区分「无声明（预期跳过）」与「有声明注册失败（真 ✗ + 诊断指引）」
- 引导提示词补从零体验路径一行

## [0.2.0] — 2026-08-13

### 新增

- **插件生产线三件套**：
  - `dev_scaffold_plugin`：四种形态骨架（toolkit 工具包 / daemon-loop 守护循环(timer+LLM) / ui-panel UI 面板 / hybrid 混合）——peerDeps 范围声明、ctx.effect 规范、build.sh 模板（DSH_CHECKOUT 自动探测）
  - `dev_build_plugin`：探测 checkout → tsc + tsdown（client）+ npm pack → tgz
  - `dev_release_plugin`：gh release create + tag + tgz 附件 + notes 模板
- **`dev_self_test` 一键回归**：注入 → 热重载 → 自重载节流 → 预检拦截 → 卸载即净 → patch 合法性，8 项全自动、自恢复无污染
- **patch 写入守卫 `writePatch`**：统一 profile patch 写入（顶层 `[]` 兼容 + 幂等），杜绝 YAML 双顶层值
- **审计日志轮转**：self-heal.log 超 1MB 自动滚动（保留 2 代）
- **操作统计落盘**：`stats.json` 跨重启累计（dev_plugin_status 显示历史成功率）
- **官方 entry 仲裁**：幽灵 entry 压制官方（disabled）时自动清理恢复（kill-zombie 自动化）
- **README 插件开发指南**：「30 行写一个会思考的插件」+ 规范铁律 + 生态借鉴

### 优化

- watch 指纹轻量化：只扫 `.js`（跳过 .map/.d.ts，stat 开销省 50%+）
- 引导提示词：静态到头（order -90）动态到尾（消息尾）缓存原则注释化

### 修复

- junction 悬空检测（inject 复用悬空链接 → import ENOENT）
- `uninject` 幂等缺失（重复卸载累积 patch 条目）

## 未发布

- 见 [README.md](./README.md) 与仓库提交历史
