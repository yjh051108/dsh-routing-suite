# docs/archive/ — 预设历史版本归档

> 三大预设演进过程中**被当前版本替换掉的历史 bootstrap**。
> 归档仅为查阅历史，**不参与运行**（`agent.cordis.yml` 只挂载当前版，见各 preset 目录）。

## 为什么归档而不是删除

历史版本记录了路由预设的演进脉络（尤其 router-react 在 RL 接口还原上的多轮迭代）。
git 历史虽可追溯，但归档让"旧版长什么样"在文件系统里可直接查阅，无需翻 commit。

## 版本线演进表（当前 = 各 preset 目录内带版本号文件）

| preset | 当前版 | agent.cordis.yml 挂载 | 归档的历史版 |
|---|---|---|---|
| `router-standard`（主力研发线） | `v34` | `router-bootstrap-v34.mjs` | 无（v34 之前为无版本别名，未见独立历史版） |
| `router-react`（RL 接口还原） | `v17` | `router-bootstrap-v17.mjs` | `v1`、`v5`、`v6`、`v7`、`v8` |
| `router-spec`（雷霆大思考） | `v10` | `router-bootstrap-v10.mjs` | `v1` |

## 目录

```
docs/archive/
├── router-react/  → v1, v5, v6, v7, v8（RL 接口还原的历史迭代）
└── router-spec/   → v1（深度思考优先的历史版）
```

## 说明

- **无版本号文件**（各 preset 目录里的 `router-bootstrap.mjs` / `router-core.mjs`）**不是历史**，
  它们是当前版在运行面/测试里的**兼容别名**（`probe/*.mjs`、`router.*.test.mjs` 引用 `router-core.mjs`），
  与带版本号文件保持同步，**勿删**。
- 归档版带 `router-core-*.mjs` 配套文件未单独保留——历史 core 逻辑已并入当版 core，
  若要翻阅旧 core 请用 git 历史。
