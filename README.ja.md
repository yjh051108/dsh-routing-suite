# dsh-routing-suite — インジェクタ × 思考モードルーティング スイート

「ランタイム手術台」（dsh-super-injector、再起動不要のプラグイン管理）と
「思考モードルーティングプリセット」（dsh-router-standard: タスク認識型の思考モード
ルーティング）、そして **mode-boost プラグイン**（公式プリセットの上に積む実測済みの
性能向上）を、ひとつのリポジトリにまとめたフルスタックです。

[中文](README.md) | [English](README.en.md) | 日本語

## インストールチェーン（3 ステップ）

```powershell
# 1. スイートを clone（3 つの submodule を含む）
git clone --recurse-submodules https://github.com/yjh051108/dsh-routing-suite.git
cd dsh-routing-suite

# 2. ワンショットインストール（インジェクタの装着 + プリセットのコピー + 再起動の案内）
.\install.ps1
```

または手動で：

```powershell
# ステップ 1：インジェクタを装着する（公式の装着方式。再起動後は bundles が引き継ぐ）
dsh plugin --profile web add .\injector

# ステップ 2：ルータープリセットをインストールする（片方だけでも両方でも可）
$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-standard'
Copy-Item -Recurse .\preset\preset\router-standard $target

$target = Join-Path $env:USERPROFILE '.dsh\.agent-presets\router-spec'
Copy-Item -Recurse .\preset\preset\router-spec $target

# ステップ 3：DSH を再起動 → 新しいセッションで Router Standard / Router Spec を選択
```

## コンポーネント

| パス | リポジトリ | バージョン | 役割 |
|---|---|---|---|
| `injector/` | [dsh-super-injector](https://github.com/yjh051108/dsh-super-injector) | [v0.3.3](https://github.com/yjh051108/dsh-super-injector/releases/tag/v0.3.3) | ランタイムインジェクタ：dev_* ツールファミリー（注入 / ホットリロード / 仮置きからの昇格 / 注入解除 / ルート自己修復） |
| `preset/` | [dsh-router-standard](https://github.com/yjh051108/dsh-router-standard) | [v0.3.0](https://github.com/yjh051108/dsh-router-standard/releases/tag/v0.3.0) | 思考モードルーティングプリセット：router-standard（RL インターフェースの復元）/ router-spec（深い思考を優先）/ router-pro（V4 Pro の実測最適） |

> バージョンは各コンポーネントリポジトリの git tag に従います（リンクは対応する Release に飛びます）。

2 つのコンポーネントはそれぞれ独立して進化します（submodule は各リポジトリの `main` を
指しています）。スイート側はインストールチェーンと全体像を集約する役割です。

## router-standard プリセットの機能（P1–P23 実測サマリ）

- **3 つの挙動バンド + weak 内部ルーティング**：spec（計画・集団）/ react（実行者）/ mixed（罠。回避する）/ weak（モデルが自己分類）
- **モデルに合わせた persona**：Pro = spec 文 + few-shot（判別度 +5.0）、Flash = neutral + classify（+5.7）
- **近距離ガイダンス**：実ユーザーメッセージのたびに固定のガイダンスを注入（キャッシュヒット率 92–94%）、ルーティング 96% + 収束 100% + 希釈対策
- **単一タスクの 3 アンカー**（persona 静的）：振り返り + 収束 + 脱線防止 —— オープンタスクの完了率 0% → 100%
- **plan-mode の維持**：persona セクションのみを差し替えるため、plan の境界で focus を失わない
- **AI 自己最適化ツール**：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent`

## Router Pro（v0.3.0）のハイライト

- V4 Pro 実測最適のルーティング：保守 → RL インターフェース（anchored-standard 98/99）、構築 → 実行者（Mario 10/10）、根拠なし → weak（router-v2 few-shot、判別度 +2.6、n=10）
- **意思決定クロージャループ**（全分岐に近距離ガイダンス）：ブラックホール的な推論を 58K→27K（2.1 倍の抑制）に、アクション率は 100% —— **予算上限なし**
- 競合バンド [0.03, 0.455] には一切触れない（E2 マトリクス：12 件中 9 件が逆ルーティング、ピーク −10.6）
- モデル別の切り分け：Pro = router-v2 few-shot + 意思決定クロージャ、Flash = w7 + コミットガイダンス

## ドキュメント

- インジェクタガイド（10 の鉄則）：`injector/README.md`
- ルーティングプリセットの論文と実験：`preset/docs/paper.md` + `preset/docs/experiments.md`（P1–P23）、`preset/docs/paper-pro.md`（V4 Pro）

## ライセンス

MIT。謝辞：xiaobright/modeltest（V4.1b 評価）、xiaobright/dsh-anchored-standard（アンカリング機構）。
