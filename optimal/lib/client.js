/**
 * dsh-closedloop-mode client — v0.3 徽章面板（常驻 + 会话感知）+ 分解/冻结摘要卡（keyed toolview）。
 *
 * v0.3 数据面纪律：
 *   - 徽章永不自隐藏：无单=灰色「无单」不可点；取数失败=灰显重试（不消失）；有单=正常态。
 *   - 会话感知=宿主 session 槽 props.sessionId 唯一来源（同 session-log-download 组件的正式通道）——
 *     旧「全局持久锁 + 最近活跃回退」两机制整体废除（跨会话串台病根，锁键名一并消失）。
 *   - 弹层内设置块（原生面板与齿轮入口）已移除：参数非 GUI（用户裁定「不手动调参」）。
 *   - 面板只追数据：/panel v3（residual/groupsBrief/openStep/audit）+/state v3，旧键一律回退容错。
 *   - V 阶梯柱状图已删（用户拍板 2026-09-04：徽章稳定绑会话后无意义，面板只看当前会话进度）。
 */
window.__ModuleLoader__.load({
  id: "@dsh-external/dsh-closedloop-mode",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    let react = require("react")

    const { useState, useEffect } = react
    const e = (type, props, ...children) => react.createElement(type, props, ...children)

    /* ---- 样式注入（官方 pattern：style 标签 + data-plugin-css） ---- */
    const CSS = `
.graded-tree{font-size:13px;line-height:1.55;margin:8px 0 4px;color:var(--dsw-alias-label-primary,#333)}
.graded-l1{display:flex;align-items:center;gap:6px;padding:4px 2px;border-top:1px solid var(--dsw-alias-border-l2,#eee)}
.graded-l1:first-child{border-top:none}
.graded-l1-title{font-weight:600;margin-right:4px}
.graded-chip{font-size:11px;background:var(--dsw-alias-bg-code,#f2f2f2);border-radius:8px;padding:1px 7px;color:var(--dsw-alias-label-secondary,#666)}
.graded-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#999);margin-top:2px}
.graded-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:2px 10px;border-radius:10px;background:var(--dsw-alias-bg-code,#f2f2f2);color:var(--dsw-alias-label-secondary,#555);cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#e5e5e5);user-select:none}
.graded-badge:hover{background:var(--dsw-alias-bg-hover,#e8e8e8)}
.graded-badge-stage{font-weight:600}
.graded-badge-off{filter:grayscale(1);opacity:.55;cursor:default;pointer-events:none}
.graded-pop{position:fixed;right:14px;top:60px;z-index:99999;background:var(--dsw-bg,#fff);border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.14);padding:10px 12px;min-width:300px;max-height:80vh;overflow:auto;pointer-events:auto}
.graded-pop-progress{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.graded-pop-progress b{font-size:16px;color:var(--dsw-alias-label-primary,#222)}
.v-stair-wrap{border-top:1px solid var(--dsw-alias-border-l2,#eee);padding-top:6px}
`
    const tagId = "@dsh-external/dsh-closedloop-mode/graded-tree.css"
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style")
      tag.dataset.plugin = "@dsh-external/dsh-closedloop-mode"
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    const STAGE_LABEL = { off: "未启动", brainstorm: "代价标定", weights: "合同评审", rolling: "快环定序", final: "终端校验" }
    const VERIFY_TAG = { self: "自查", subagent: "验派", redteam: "对抗审", user: "人核" }

    /* ---- 摘要卡（keyed toolview）：v3 组级数据，无块级 items ---- */

    function DecomposeRow({ toolName, block }) {
      let raw = null
      try {
        const args = (block && (block.call || block).argsRaw) || null
        raw = typeof args === "string" ? JSON.parse(args) : args
      } catch { /* 参数不可解析 → 降级通用展示 */ }
      const groups = raw && Array.isArray(raw.groups) ? raw.groups : []
      return e("div", { className: "graded-tree" },
        groups.length === 0 && e("div", { className: "graded-hint" }, "（无组结构——v0.3 decompose 只提交大类）"),
        groups.map((g, i) => e("div", { key: i, className: "graded-l1" },
          e("span", { className: "graded-l1-title" }, (g && g.title) || "?"),
          e("span", { className: "graded-chip" }, "核对:" + (VERIFY_TAG[g && g.verify] || g.verify || "自查")),
          ((g && g.accept) || []).slice(0, 2).map((a, j) => e("span", { key: j, className: "graded-chip", title: a }, a.length > 18 ? a.slice(0, 18) + "…" : a)),
        )),
      )
    }

    function FreezeRow() {
      return e("div", { className: "graded-hint" }, "🧊 权重与组结构已锁（单一锁点）——用户『确认』后开快环，每步实时定序；『修改』全段可逆。")
    }

    /* ---- 当前会话进度面（/panel v3 同源）----
     * V 阶梯柱状图已按用户拍板移除（2026-09-04：徽章稳定绑定会话后柱阵无意义——
     * 它画的是整条历史栈，不是"这个会话现在到哪了"）。面板只留进度读数。 */

    function SessionProgress({ panel }) {
      const res = panel.residual || {}
      return e("div", { className: "v-stair-wrap" },
        e("div", { className: "graded-chip", style: { marginBottom: 4 } },
          "残差 " + (res.lastBand || "far") + " · 未落账组 " + (res.groupsOpen ? res.groupsOpen.length : "?") + " · 已闭动作 " + (res.closedCount ?? "?")
          + (res.dipPending || (panel.vLadder && panel.vLadder.dipPending) ? " · dip 挂账" : "")),
        panel.openStep && e("div", { className: "graded-chip", title: "#" + panel.openStep.n + " " + panel.openStep.title, style: { marginTop: 4, color: "#1a6fb5", fontWeight: 700 } }, "▸ 进行：" + panel.openStep.title),
        Array.isArray(panel.groupsBrief) && panel.groupsBrief.length > 0 && e("div", { className: "graded-hint", style: { marginTop: 3 }, title: panel.groupsBrief.map((g) => g.title + (g.settled ? "✓" : "·未落账") + "（闭" + g.closedActs + "）").join("\n") },
          "组: " + panel.groupsBrief.map((g) => (g.settled ? "✅" : "▫️") + g.title.slice(0, 8)).join(" ")),
        e("div", { className: "graded-hint", style: { marginTop: 3 } }, "模型/版本: " + (panel.modelState && panel.modelState.paramsSource ? panel.modelState.paramsSource : "未接线") + " · v" + (panel.v || 3)),
      )
    }

    /* ---- 常驻徽章（三态；数据严格绑 props.sessionId，零全局锁） ---- */

    function ProgressBadge(props) {
      const sid = props && props.sessionId ? String(props.sessionId) : null
      const [st, setSt] = useState(null)
      const [pl, setPl] = useState(null)
      const [open, setOpen] = useState(false)
      const [fail, setFail] = useState(false)
      useEffect(() => {
        if (!sid) { setSt(null); setPl(null); return }
        let alive = true
        const qs = "?sid=" + encodeURIComponent(sid)
        const tick = () => {
          fetch("/graded-mode/api/panel" + qs).then((r) => r.json()).then((j) => {
            if (!alive) return
            if (j && j.ok) { setPl(j); setFail(false) } else { setPl(null); setFail(true) }
          }).catch(() => { if (alive) { setPl(null); setFail(true) } })
          fetch("/graded-mode/api" + qs).then((r) => r.json()).then((j) => {
            if (!alive) return
            if (j && j.ok && j.stage && j.stage !== "off") setSt(j)
            else setSt(null)
          }).catch(() => { if (alive) setSt(null) })
        }
        tick()
        const id = setInterval(tick, 2000)
        return () => { alive = false; clearInterval(id) }
      }, [sid])

      // 态一：无会话上下文/该会话未开单 → 灰色「无单」，不可点（不消失）
      if (!sid || !st || st.stage === "off") {
        return e("span", { className: "graded-badge graded-badge-off", title: sid ? "本会话未开最优律单（/optimal <任务> 开单）" : "最优律：未取到会话上下文" }, "无单")
      }
      // 态二：有单但取数失败 → 灰显重试（不消失）
      if (fail && !pl) {
        return e("span", { className: "graded-badge graded-badge-off", title: "面板取数失败——轮询重试中（徽章常驻不消失）" }, "● 重试中")
      }
      const rt = st.audit || {}
      const rtTag = rt.pending > 0
        ? e("span", { title: "另头审：待审 " + rt.pending, style: { color: "#b8860b" } }, "●")
        : rt.rejected > 0
          ? e("span", { title: "另头审：打回×" + rt.rejected, style: { color: "#c0392b" } }, "⭕" + rt.rejected)
          : rt.rounds > 0
            ? e("span", { title: "另头审：通过" + rt.passed + " · 轮次" + rt.rounds, style: { color: "#2a9d6e" } }, "✅" + rt.passed)
            : null
      const pct = st.total ? Math.round((st.done / st.total) * 100) : 0
      return e("span", { style: { position: "relative" } },
        e("span", { className: "graded-badge", onClick: () => setOpen((o) => !o), title: "最优律面板（当前会话进度 · 数据=sid=" + (st.sidShort || "?") + "）" },
          e("span", { className: "graded-badge-stage" }, STAGE_LABEL[st.stage] || st.stage,
          pl && pl.openStep && e("span", { style: { fontSize: "11px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "▸" + pl.openStep.title),
          e("span", null, "组 " + st.done + "/" + st.total + " ✓" + pct + "%"),
          rtTag,
          st.sidShort && e("span", { style: { fontSize: "10px", fontWeight: "700", opacity: ".85", marginLeft: "2px" } }, "·" + st.sidShort)),
        open && e("div", { className: "graded-pop" },
          e("div", { className: "graded-pop-progress" },
            e("b", null, st.done + "/" + st.total),
            e("span", { className: "graded-chip" }, "任务: " + (st.task || "-")),
            e("span", { className: "graded-chip", title: "数据绑当前会话" }, "sid " + (st.sidShort || "?"))),
          st.cost && st.cost.purpose && e("div", { style: { fontSize: "12px", color: "#444", margin: "2px 0 4px", padding: "4px 6px", background: "#faf7e8", borderRadius: "6px" } },
            "★ 目的: " + st.cost.purpose),
          st.cost && Array.isArray(st.cost.assertions) && st.cost.assertions.length > 0 && e("div", { className: "graded-hint", style: { marginBottom: "4px" }, title: st.cost.assertions.map((a) => "[" + a.severity + "] " + a.text).join("\n") },
            "Q_N×" + st.cost.assertions.length + ": " + st.cost.assertions.map((a) => (a.severity === "catastrophic" ? "⚡" : a.severity === "minor" ? "○" : "△") + a.text.slice(0, 14)).join(" ")),
          e("div", { className: "graded-hint", style: { marginBottom: "4px" } },
            "另头审: 通过 " + (rt.passed || 0) + " · 打回 " + (rt.rejected || 0) + " · 轮次 " + (rt.rounds || 0) + (rt.pending ? " · 待验 " + rt.pending : "")),
          e("div", { style: { margin: "6px 0" } },
            pl ? e(SessionProgress, { panel: pl }) : e("div", { className: "graded-hint", style: { padding: "10px 0" } }, "⚠ 进度取数失败/无激活会话——轮询重试中（降级不白屏）")),
          e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" } },
            e("span", { className: "graded-hint" }, "点击徽章收起 · 数据 /panel+/state（均绑当前会话）")))),
      )
    }

    /* ---- 安全包装：组件抛错降级为注释行，绝不拖垮会话 UI 树 ---- */

    function Safe(fn) {
      const Wrapped = (props) => {
        try {
          return fn(props)
        } catch (err) {
          return e("div", { className: "graded-hint", title: String(err) }, "（最优律卡片渲染降级）")
        }
      }
      return Wrapped
    }

    const inject = ["slots"]

    function apply(ctx) {
      ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
        name: "tool.call.toolview",
        key: "decompose",
        locale: "@dsh-external/dsh-closedloop-mode",
      }, Safe(DecomposeRow)))
      ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
        name: "tool.call.toolview",
        key: "freeze",
        locale: "@dsh-external/dsh-closedloop-mode",
      }, Safe(FreezeRow)))
      ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () =>
        ctx.slots.register({
          name: "conversation.session.header.utilities",
          id: "@dsh-external/dsh-closedloop-mode/progress",
        }, Safe(ProgressBadge))), "closedloop: progress badge")
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
