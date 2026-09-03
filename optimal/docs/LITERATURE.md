# LITERATURE — 分解粒度与增量工程（模型侧文献支撑）

> **修订声明（v2）**：初版引用了人类认知负荷（Miller 1956 等）——**已撤销**：模型≠人类，
> 人类工作记忆 7±2 不适用于 LLM（模型容量=上下文窗口与注意机制）。本版只保留**模型侧**文献。

## 1. 分解粒度（任务分解有效性）

- **Least-to-Most Prompting**（Zhou et al., ICLR 2023）——把难题分解为可顺序解决的子问题（SCAN 类任务 99.7%）：**分解本身有效**，粒度=子问题可独立解。
  [综述引述](https://ar5iv.labs.arxiv.org/html/2501.04040#12) · [基准与评测（ACM TIST）](https://dl.acm.org/doi/10.1145/3712701)
- **Plan-and-Solve Prompting**（Wang et al., 2023）——先规划再分步解题——**粒度以"计划可解"为准**（与 our L1/L2 两级规划同构）。

## 2. 别拆太细：步骤数→错误累积

- **长程多步执行研究**：单步 100% 正确但**长程执行指数衰减**——步骤越多，累积失败率越高。
  [Long Horizon Execution 报道](https://quantumzeitgeist.com/100-percent-100-accuracy-long-horizon-execution-llms-demonstrates-exponential-gains-despite/)
  → **"粒度偏碎"的代价=步骤暴增→错误累积**（对应"低内聚"的模型侧本质）。

## 3. 别太粗：长上下文中间信息衰减

- **Lost in the Middle: How Language Models Use Long Contexts**（Liu et al., TACL 2024）——长上下文中**中间位置信息**效能显著下降。
  [ACL Anthology](https://aclanthology.org/2024.tacl-1.9/) · [MIT Press](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00638/119630/Lost-in-the-Middle-How-Language-Models-Use-Long)
  → **"单步过宽/包办"的代价=单步上下文过长→中间信息衰减**（对应"高耦合"的模型侧本质）；
  同时为本插件**每大类结束 compact** 提供直接依据（压缩历史→把注意力留给当下）。

## 4. 规则导出（提示词落地）

| 准则 | 文献 | 提示词 |
|---|---|---|
| 分解有效=可独立解 | Least-to-Most / Plan-and-Solve | 每小类=可独立验收的职责块（SRP/内聚保持——通用软件工程） |
| 不碎（步数可控） | 长程指数衰减 | 粒度偏碎→步骤暴增→错误累积（危险） |
| 不粗（上下文可控） | Lost in the Middle | 单步过宽→中间信息衰减（危险） |
| 宏观分配 | — | 数量随难度宏观分配（难→细些、易→聚些）——**无人为硬数字** |

> 注：SRP/GRASP（Martin/Larman）为通用软件工程内聚准则（保留）；**凡人类认知类文献一律不引用**（模型≠人类）。
