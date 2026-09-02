# VERIFIABILITY — 文档可复核性总表

> 原则（research 验收）：每条断言给出**来源**（文档/代码/会话）、**证据**（数值/位置）、**复现路径**（可执行）。
> 抽查由独立红队执行（见 README 的 redteam 记录）。

## README.md（4 断言）

| # | 断言 | 来源 | 证据 | 复现路径 |
|---|---|---|---|---|
| R1 | 6 工具清单与实测一致 | README「工具（6）」 | 6 行工具表 | `gh api repos/yjh051108/dsh-routing-suite/git/trees/main?recursive=1`（graded/src/tools.js 内 6 个 `export function*Definition`） |
| R2 | 全链 7 步 | README「全链」 | 7 行流程 | 走一遍：`/graded` 触发 → commit_star → edit_plan(L1/L2) → lock ×2 → mark_task（见 docs/DATA.md f0855822 链） |
| R3 | 测试 62 项 | README「开发与测试」 | 62/62 | `cd graded && npm test`（三条测试文件联合运行） |
| R4 | 装配命令占位符 | README「装配」 | `<NPM_GLOBAL>/<DSH_HOME>/<PLUGIN_DIR>` | 换真实路径执行 `dsh plugin --profile web add <PLUGIN_DIR>` |

## ARCHITECTURE.md（4 断言）

| # | 断言 | 来源 | 证据 | 复现路径 |
|---|---|---|---|---|
| A1 | 状态机 7 态 | ARCHITECTURE §1 | off→brainstorm→l1-edit→l2-edit→review→develop→final | `src/mode-state.js`：`STAGES` 枚举+`onLockL1/onLockL2/onReviewApproved` 转换（`node --test tests/mode-state.test.mjs`） |
| A2 | 三通道时序 | ARCHITECTURE §3 | steer/followup/splice 表 | `src/index.js`：`agent.steer`（tools.js lock 分支）/`agent.followup`（mark 分支）/`spliceInjection`（pre-step）；测试 `tests/tools.test.mjs`「锁 L2 → 进入 review」 |
| A3 | 幂等键先注后键 | ARCHITECTURE §3 | registerInjected 后 splice 跳过 | `src/tools.js`（steer 成功→注册键）；`src/index.js`（`injected.has` 检查）；审计 `uniqueRate=1`（f0855822） |
| A4 | 状态磁盘单轨 | ARCHITECTURE §1 | loadState/saveState 唯一权威 | `src/mode-state.js` stateDirFor（`join(os.homedir(),'.dsh','graded-state')`）+ `git grep -n "loadState" grad-ed/src` — 无内存副本 |

## THEORY.md（4 断言）

| # | 断言 | 来源 | 证据 | 复现路径 |
|---|---|---|---|---|
| T1 | 线性注意力四条文献真实 | THEORY §文献 | Katharopoulos ICML2020 等 4 篇 | 公开核对：arXiv（2006.16236 / 2106.09685 / 1706.03762 / 1810.04805） |
| T2 | 映射表 3 条有命中证据 | THEORY §机制映射表 | 3 行映射（线性/双边/懈怠） | 复现：`f0855822` 审计端点（`/graded-mode/api/audit` 的 uniqueRate=1）；`npm test` 红队门用例 |
| T3 | jspace 未映射（占位） | THEORY §3 | 「无映射——占位」行 | 全库 `grep -n jspace` 仅 THEORY/DATA 出现（无虚假映射） |
| T4 | 引用-证据对 6 条 | THEORY §引用 | 6 行表格 | 对照 THEORY 表逐一下载/执行（test 用例名→`npm test` 单跑） |

## DATA.md（4 断言）

| # | 断言 | 来源 | 证据 | 复现路径 |
|---|---|---|---|---|
| D1 | 三会话指标数值 | DATA §1 | 637/639 工具、36/31 标定、75 截图 | 会话包导入后按 `user/message`/`tool/call` 事件类型聚合（同公开统计法） |
| D2 | 懈怠强度表 | DATA §2 | 781d16c5 后段 1 工具/0 读图 | 同聚合法按小类分段（焦点注入→打卡） |
| D3 | 审计口径数值 | DATA §4 | focus=22/check=7/uniqueRate=1 | 会话运行期 `GET /graded-mode/api/audit`（f0855822） |
| D4 | 零敏感原文 | DATA 合规声明 | 两轮红队 0 命中 | 红队审计记录（本仓库审计声明）；黑名单扫描脚本可复用 |

**抽查范围**：红队抽 ≥4 条（R1/R3/A2/T2/D3 至少），复现路径可执行性判定。
