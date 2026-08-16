# 高星插件精选（DSH Plugin Picks）

> 💡 **想在 DSH 界面里直接浏览、搜索、点击安装？** 先装内置插件市场：
> 推荐运行根目录 `.\install.ps1`（安装本地增强版，含自动更新），然后打开 **设置 → 插件市场**。
> 若只要官方原版：`dsh plugin --profile web add dshmarket`。
> 市场源码已作为子模块接入本仓库：`../market/dsh-market`。

这个目录把 GitHub 上 **Star 靠前且真正面向 DeepSeek Harness（DSH）生态**的插件聚合进
`dsh-routing-suite`，方便一站式发现和安装。

- `popular.json` — 机器可读精选清单（名称 / 仓库 / 分类 / Star / 简介）
- `install.ps1` — 一键安装器（调用官方 `dsh plugin --profile <profile> add github:<repo>`）
- 完整生态目录见 [`../catalog/oh-my-dsh/PLUGINS.md`](../catalog/oh-my-dsh/PLUGINS.md)（Oh-My-DSH 聚合社区，自动同步 1200+ 精选条目）

## 快速安装

```powershell
# 安装全部精选插件（默认 profile = web）
.\plugins\install.ps1

# 只看清单
.\plugins\install.ps1 -List

# 只装某几个
.\plugins\install.ps1 -Name dsh-web-ui,modlens,dsh-vision-router

# 演练（不实际安装）
.\plugins\install.ps1 -DryRun
```

> 部分插件需要构建或额外环境（如视觉链、浏览器扩展、桌面端），安装失败时请以该插件
> README 为准，可先 `git clone` 到本地再 `dsh plugin add <目录>`。

## 精选清单

| 插件 | Star | 分类 | 说明 |
|---|---:|---|---|
| [dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) | 2814 | UI | DSH Web UI 皮肤/插件合集：任务板、Git 图、右侧面板、远程移动端 UI、桌宠、实时 token 统计 |
| [modlens](https://github.com/liustack/modlens) | 1981 | Vision | DSH 视觉插件：粘贴图片得到结构化 JSON 证据（OCR、版面、语义） |
| [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 1328 | UI | 侧边栏完整工作台：文件渲染编辑 / 终端 / Git / 子代理 |
| [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) | 1307 | UI | Claude Code 风格 TUI：鲸鱼顶栏、实时状态、流式思考、双击 Esc 回滚 |
| [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) | 445 | Vision | 视觉任务全家桶：图片问答、长截图 OCR、UI 还原、grounding、像素 diff |
| [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | 344 | Agent | 多 Agent 团队协作：队长/成员/任务依赖/消息 |
| [dsh-market](https://github.com/dsh-market/dsh-market) | 322 | Market | DSH 内可视化插件市场：浏览、搜索、一键安装社区插件 |
| [dsh-at-file](https://github.com/omdsh-dev/dsh-at-file) | 227 | UI | Codex 风格 @file 提及：搜索工作区文件并附加到 prompt |
| [oh-dsh](https://github.com/hust-open-atom-club/oh-dsh) | 196 | Runtime | 一套 DSH runtime：Desktop、Web 与 TUI 三种开发体验 |
| [dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui) | 175 | UI | 终端 UI + harness workflow：TDD、证据门、视觉图像模块 |
| [dsh-browser](https://github.com/Lum1104/dsh-browser) | 168 | UI | Chrome 侧边栏扩展，让 DSH 直接操控浏览器，无需视觉能力 |
| [dsh-vision-router](https://github.com/ysr666/dsh-vision-router) | 164 | Vision | 内置免费视觉链 + 像素级视觉工具：Q&A、grounding、crop、OCR、SVG trace |
| [dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize) | 126 | UI | 对话内生成交互式可视化卡片 |
| [dsh-genui](https://github.com/omdsh-dev/dsh-genui) | 113 | UI | 回复内联渲染交互 UI：布局、图表、表单、mermaid、3D 场景 |
| [modsearch](https://github.com/liustack/modsearch) | 105 | Search | DSH 网页/X 搜索插件：问网页或 X，拿结构化 JSON 证据 |
| [dsh-memory-evolve](https://github.com/csyangwen/dsh-memory-evolve) | 93 | Memory | 跨会话长期记忆 + 后台自我进化：五轨记忆、技能自我进化 |
| [dsh-noema](https://github.com/ZSeven-W/dsh-noema) | 61 | Memory | Noema 长期记忆：可检查的持久记忆、召回工具与设置页 |
| [dsh-auto-mode](https://github.com/NanmiCoder/dsh-auto-mode) | 60 | Agent | 安全自动权限策略：fail-closed，避免危险操作 |
| [dsh-turn-rewind](https://github.com/Anionex/dsh-turn-rewind) | 56 | Agent | 对话与代码状态回退，基于持久 Change Ledger |
| [dsh-notification](https://github.com/omdsh-dev/dsh-notification) | 49 | UI | 回合完成桌面通知，支持结果分类与关键词规则 |
| [anysearch-dsh](https://github.com/anysearch-team/anysearch-dsh) | 48 | Search | AnySearch 搜索提供商与高级搜索工具 |
| [mstar-harness](https://github.com/btspoony/mstar-harness) | 45 | Agent | Harness Workflow Engine：技能驱动的 Harness/Loop 工程工作流 |
| [dsh-automation](https://github.com/titanwings/dsh-automation) | 42 | Agent | 定时在全新 Agent Session 中运行 Coding 任务 |
| [dsh-qqbot](https://github.com/tencent-connect/dsh-qqbot) | 40 | IM | QQ 机器人接入 DSH 的官方插件 |
| [dsh-mnemon](https://github.com/omdsh-dev/dsh-mnemon) | 33 | Memory | 跨 Agent 本地优先持久记忆：Mnemon 驱动，知识图谱 + Sidebar UI |
| [dsh-data-agent](https://github.com/omdsh-dev/dsh-data-agent) | 27 | Data | 会话级数据库连接：写 SQL 并基于实时执行反馈迭代 |
| [dsh-handbook](https://github.com/Electricitysheep/dsh-handbook) | 300 | Docs | DSH 从 0 到 1 深度手册：安装、插件开发、性能调优、实测案例 |
| [Oh-My-DSH](https://github.com/like-study1/Oh-My-DSH) | 37 | Catalog | DSH 插件聚合社区/完整目录：自动同步 dsh-plugin 生态 |
| [awesome-dsh-plugin](https://github.com/bruc3van/awesome-dsh-plugin) | 152 | Catalog | DSH 插件精选目录与 Star 排行榜（TOP200） |

> Star 数为 2026-08-16 GitHub API 快照，仅作热度参考；不代表安全性或兼容性背书。
