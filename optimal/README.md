# optimal — 最优律闭环协议插件（dsh-closedloop-mode v0.3.3）

> **更名与退役说明**：本目录前身为 `graded/`（dsh-graded-mode，0.0.1-rc1 时代，打卡制任务清单范式）。
> 该插件已**退役**：v0.2 完成范式替换（控制循环即状态机），v0.3 定名 **dsh-closedloop-mode**——
> 策略驻留引擎、轨迹涌现回路（规划只是权重，下一步由实测状态实时运算）。命令名由 `/graded` 更名为 **`/optimal`**。

## 安装（先卸载 rc1 旧版）

1. **卸载旧 dsh-graded-mode（rc1）**——三者都做，防双引擎抢注同名工具/路由：
   - 运行中会话：`dev_uninject_plugin dsh-graded-mode`（若经超级注入器装载）
   - 删除 profile patch 里的 `@dsh-external/dsh-graded-mode` 装载条目（`~/.dsh/profiles/<profile>/cordis.patch.yml`）
   - 删除 junction：`~/.dsh/profiles/<profile>/node_modules/@dsh-external/dsh-graded-mode`
2. 安装本插件：`dev_install_package <本目录>`（或 `dev_inject_plugin <本目录>` 免重启试装；或 npm pack 的 tgz 常规装载）
3. 验证：新会话输入 `/optimal status`；右上角出现常驻徽章（未开单时灰色「无单」）。

## 用法（三步控制环）

```
/optimal 全量 <任务>          → cost_set 定 Q_N（断言=文本+档位+来源；非目标确认制）
                              → decompose 组级结构（无块级清单——动作实时提议）
                              → freeze 锁权重 → 用户「确认」开快环
（快环）每步：引擎给最小状态面（残差/Q_N/已闭集）→ 模型提议 cost-to-go 最小的动作
              → 差分契约 declare → 实现 → converge 三要素（ΔV 降×异源复算×双通道）→ closed
（收口）全组落账 → terminal_check 归零报告；中途改口发「修改」全段可逆。
```

核心纪律：无来源=断言无效；单通道动作自动按重流程（无测量不放权）；红队动作由 **fresh 子代理直读盘档**、
引文逐字硬验（另头审）；数值 agreed 必须「实测 <A> ≠ 预测 <B>」数字对且相等（防复述/防占位）。

详细理论见 docs/THEORY-v0.3-closedloop.md；机制映射见 docs/THEORY.md 与 docs/ARCHITECTURE.md。
