# ARCHITECTURE — dsh-graded-mode 架构说明

> 配套：README（用法）/ THEORY.md（理论映射）/ DATA.md（实测数据）/ VERSION-NOTES-3.2.md（变更）。

## 1. 状态机（磁盘单轨）

```
off → brainstorm → l1-edit → l2-edit → review → develop → final
                 ↑_______________________|
                 （『修改』回滚：reject-ack 后回 l1-edit，树保留可修订）
```

- 状态唯一权威=磁盘文件 `$DSH_HOME/graded-state/<sid>.json`（`loadState`/`saveState`；**无内存副本**）
  ——热重载/进程重启后 pre-step 读盘即恢复，零中断。
- 阶段推进=工具调用（`lock_stage` 成功即切阶段）+用户文本（审核期『确认』/『修改』），零字符串解析。

## 2. 工具（6）与契约

| 工具 | 阶段 | 关键契约 |
|---|---|---|
| `commit_star` | brainstorm/预审 | purpose 必填（不照抄原文/≥12 字）；mode 随定稿落盘；复习保留阶段 |
| `edit_plan` | l1/l2-edit | L1 组 spec/accept 必填；L2 小类 spec/accept/do/verify 必填（mode 可选）；回执全量 |
| `lock_stage` | l1/l2-edit | **先复检后写入**（拒绝=状态不变）；L2 回执=完整规格评审单 |
| `mark_task` | develop/final | redteam 门：verify=redteam 未裁决通过拒绝；回执=当下态 |
| `redteam_verdict` | develop/final | 仅 verify=redteam 项；reject 必附问题清单；再审批义务；轮次落盘 |
| `revise_do` | develop/final | do 可改（登记 doHistory）；verify 只读 |

门控总则：编辑必填 → 锁定复检 →（编辑/锁定/裁决/打卡）拒绝**均不落盘**（哈希级验证）。

## 3. 注入时序（三通道）

| 通道 | 机制 | 用途 | 时效 |
|---|---|---|---|
| steer（next-step） | 工具 execute 内 `agent.steer(...)`；同 turn 下一步拼接 | 大小类引导（phaseL2 / 审核提示） | **同轮即时**（无过期） |
| followup（next-turn） | 跨 turn 边界拼接 | 打卡续轮（mark 后下一引导） | 跨轮（自动续轮语义） |
| splice（pre-step 后处理） | 当前 decision.messages 插入 | 恢复/兜底：命令触发、回滚 reject-ack、off 回执、阶段入口 | 同轮 |

- **幂等键（先注后键）**：steer/followup 成功后注册注入键（l1-guidance/l2-guidance/review-pending/approved-kickoff/focus:*/check:*）→ splice 通道见键跳过；失败不注册 → splice 兜底补（引导不丢）。
- 模式扫描 `scanMode`：只认**用户**最近非插件消息的 `[模式:x]`（模型不得自漂移）；脑暴必选模式题经 `commit_star(mode)` 落盘（唯一可信来源）。

## 4. 门控与红队（防御链）

- 三入口同标准：编辑（assertL1Items/assertL2Groups）→ 锁定（先复检）→ 推进（mark_task redteam 门）。
- `redteam_verdict`：reject → 修复 → **必须再次裁决**（再审批铁律，自演红队同义务）；轮次/log 落盘供面板/审计。
- 组收官：组级标准**逐条核对**（严苛>小类）+verify 注入（redteam 先裁后定）。

## 5. 注入渲染（单点分发）

- `formSection`：形态段单点（subagent→委派 skill 卡 / workflow→编排 skill 卡 / verify=redteam→红队规范 / verify=dual→双轨规范 / 其余摘要行）。
- `focusL2*`：规格前置三段式 + `starAnchor`（北极星锚定：目的+验收锚，替代声明式自问）+ `verifyLaw(mode)`（铁律按**小类模式**：item.mode || 会话 mode）。
- `specSheet`：锁定即呈完整规格评审单（北极星+需求计数+规格树）；审核提示=唯一确认请求。

## 6. 数据面

- 清单只存结构化树（不写官方 todo_write；自定义事件不落盘——DSH 加载器白名单约束）。
- `auditBody`（/graded-mode/api/audit）：注入计数（focus:*/check:* 前缀聚合）+盘档指纹（sha1）+redteam 统计（轮次/通过/打回）+唯一率。
- 面板 API（/graded-mode/api/state）：mode/current/redteam/uniqueRate/specCoverage/star/plan（三层树消费）。

## 7. 依赖与边界

- 宿主生态：`@deepseek-ai/dsh-*`（agent-loop 的 inbox（steer/followup/splice）、session-persistence-jsonl、tools）——插件只依赖宿主契约。
- 回退路径：状态目录默认 `join(os.homedir(), '.dsh', 'graded-state')`（运行时计算，无硬编码用户名/盘符——脱敏约束）。
