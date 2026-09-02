# dsh-graded-mode（分级模式 v3.2）

会话级两级任务协议插件（DSH 生态）：**一次性触发，未触发 = 官方原样**（零工具注册、零注入）。
功能主线：**脑暴需求对齐（选择题式）→ 北极星定稿 → 规格化两级计划 → 完整规格审核 → 按规格定制注入执行 → 组收官逐条核对 → 终验**。

> 开源分发：本目录即 dsh-routing-suite 的 `graded/` 子模块；版本说明/演进见 `docs/VERSION-NOTES-3.2.md` 与 `CHANGELOG.md`；三模式与理论实证见 `docs/THEORY.md`；实测数据（脱敏）见 `docs/DATA.md`；架构见 `docs/ARCHITECTURE.md`。

## 特性

- **脑暴出题制**：`ask_user_question` 选择题对齐需求（≤5 题/轮、可多轮、所有歧义点结清才定稿），含**必选模式题**（correct / experience / research——由用户点选，非模型自报）。
- **规格化门控**：大类=标题+组 `spec`/`accept`/`verify`；小类=标题+概念+`spec`+`accept`+`do`+`verify`（+可选 `mode`）——**全必填门控**，缺即拒（先复检后写入，拒绝=状态不变）。
- **注入按规格定制**：每小类注入=规格前置三段式（任务 spec → 验收 accept → 执行形态）+**北极星锚定**+按小类模式铁律；形态含委派 skill（**情景可改写、验收锚=盘档规格**）/编排/红队裁决/双轨并行。
- **时序即时**：大小类引导走 next-step（同轮即达，无过期）；锁定回执=完整规格单；审核提示=唯一确认请求；『修改』回滚自动开口（reject-ack）。
- **小类粒度模式**：`item.mode`（缺省继承会话模式）——全栈任务按小类切验收重心；模式改口只认用户消息（防漂移）。
- **打卡制+红队门**：`mark_task`=唯一前进许可；`verify=redteam` 的小类/组**未裁决通过不得打卡**（打回→修复→再审批）。
- **状态磁盘单轨**：热重载/重启零中断；注入幂等（先注后键，无双注）；审计端点 `/graded-mode/api/audit`（注入计数/指纹/红队/单注率）+超级面板（三层树/量化/北极星/红队灯）。

## 全链（7 步）

```
① 脑暴（选择题对齐+模式必选）→ ② commit_star 定稿（目的宣言/需求/非目标/假设）
③ L1 规格化（组 spec/accept/verify）→ 锁定（同轮 phaseL2）
④ L2 规格化（小类 spec/accept/do/verify/item.mode）→ 锁定（回执=完整规格单）
⑤ 审核（唯一确认请求）→『确认』/『修改』（回滚→reject-ack→修订重审）
⑥ 执行（三段式+星锚+按小类模式铁律）→ 打卡 → 组收官（逐条核对+verify 注入+红队先裁）
⑦ 终验（finalCheck 六项）→ 审计终检
```

启动：`/graded <任务>`（用户）或 `/graded off` 关闭；**模型可自主进入**——直接调 `commit_star(目的宣言)` 即激活（信息不足会被拒）。

## 装配（DSH 官方路径）

```bash
# 占位符按你的环境替换：<NPM_GLOBAL>（npm 全局目录）、<DSH_HOME>（默认 ~/.dsh）、<PLUGIN_DIR>（本插件目录）
export PATH="<NPM_GLOBAL>:$PATH"
DSH_HOME='<DSH_HOME>' node <NPM_GLOBAL>/@deepseek-ai/dsh/lib/bin.js plugin --profile web add <PLUGIN_DIR>
# 重启 DSH web
```

## 工具（6）

| 工具 | 作用 |
|---|---|
| `commit_star` | 脑暴定稿（purpose 必填；mode 随定稿落盘；修订保留阶段；开发期只读） |
| `edit_plan` | L1 组规格 / L2 小类规格（全必填门控）；回执全量（树+标准+形态+模式） |
| `lock_stage` | 锁定（先复检后写入；L2 回执=完整规格评审单） |
| `mark_task` | 打卡（redteam 门：未裁决通过拒绝） |
| `redteam_verdict` | 红队裁决（pass/reject+问题清单；再审批义务；轮次落盘） |
| `revise_do` | 形态修订（do 可改+登记轨迹；verify 只读） |

## 模式与面板

- 三模式=措辞包：correct（可测量断言）/ experience（感受断言+可复现动作）/ research（可复核断言）——脑暴必选+小类粒度覆盖。
- 徽章（右上）：阶段+模式+当前唯一任务+红队灯；点击展开三层树（组卡→小类行→项层规格+红队历史）+量化条（打卡/标准覆盖/单注率）+★北极星栏。

## 开发与测试

- 测试：`node --test tests/mode-state.test.mjs tests/tools.test.mjs tests/inject-text.test.mjs`（62 项）
- 构建：`node scripts/build.mjs`（产出 `lib/`）
- E2E 自验：`scripts/e2e-3.1.mjs`（全链 dogfood）/ `scripts/e2e-redteam-group.mjs`（组级红队链）
- 热重载：`dev_reload_package dsh-graded-mode`（零重启）

## 许可

Apache-2.0（见 LICENSE）；作者署名与致谢见 LICENSE 页脚；理论引用与实测数据见 docs/THEORY.md、docs/DATA.md。
