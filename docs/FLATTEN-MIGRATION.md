# 扁平化迁移说明（submodule → 直接文件）

> 本仓库自 `refactor/flat-submodules` 起，由 **嵌套仓库（submodule）模式** 改为 **仓库内直接文件模式**。

## 变更背景

原结构：

```text
dsh-routing-suite/
  .gitmodules
  injector/   ← submodule (dsh-super-injector)
  preset/     ← submodule (dsh-router-standard)
```

新结构（本分支）：

```text
dsh-routing-suite/
  .gitignore
  LICENSE
  injector/                  ← 普通目录：dsh-super-injector 内容（15 tracked files）
  preset/                    ← 普通目录：dsh-router-standard 内容（93 tracked files）
    router-standard/
    router-spec/
    router-react/            ← 平铺，可直接复制安装（无 preset/preset 额外嵌套）
    docs/ probe/(仅 tracked) scripts/ README.md ...
```

## 使用差异

- 克隆不再需要 `--recurse-submodules`：`git clone https://github.com/yjh051108/dsh-routing-suite.git`
- 预设安装目录：`.\preset\router-standard`（已平铺，无多余嵌套）
- 组件版本随本仓库统一演进；上游独立仓库 `dsh-super-injector` / `dsh-router-standard` 仍保留（独立发布/镜像/归档待定）

## 数据边界

- `preset/probe/` 下重型数据（`deepseek-v4-pro-weights`、`dsh-2020-dataset`、`results`、`sessions`、`deepseek-tokenizer`）保持 gitignore，**不会**进入 git。
- 仓库根 `.gitignore` 已补充同类忽略项，防止误提交。

## 测试与 CI

- 本地验证（2026-08-25）：
  - `node preset/router-standard/router-bootstrap-v34.selftest.mjs` → SELFTEST PASS
  - `node --test preset/router.test.mjs` → 26/26 pass
- `.github/workflows/ci.yml` 暂未推送：gh token（OAuth App）缺 `workflow` scope，GitHub 拒绝创建 workflow 文件；模板保留 `D:\dsh\prep-public\workflows\`，授权后补。

## 发布红线

- **router-standard 当前为研发线（v1.19.1 / v34），尚未发布**。本仓库只做结构重构与基建，**不要**基于本分支打 tag / 发 release；发布时机由维护者另行决定。

## 回滚

老版本仓库仍可回退到 `main` 之前的 submodule 形态；撤销本分支：`git revert <merge-sha>` 或 `git checkout main`（若未合并则丢弃分支即可）。
