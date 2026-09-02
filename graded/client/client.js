/**
 * dsh-graded-mode client — 官方面板内的「分级计划树」工具卡片（keyed toolview）。
 *
 * 装配：package.json `dsh.client`（platform web / immediately）+ exports["./client"]
 * → dsh-client-modules serve `/plugins/<id>/client.js` → window.__ModuleLoader__.load。
 *
 * 职责：覆盖 edit_plan / lock_stage 两个工具的通用工具行（keyed hit REPLACES
 * generic row），把结构化参数（items / groups / level）渲染成可展开收起的树——
 * 组头行（🔒 已锁徽标）+ 缩进小类行（概念 chips）+ 锁定摘要卡。
 *
 * 数据只来自工具调用参数 JSON（模型传的对象本身就是结构,无任何字符串解析）。
 */
window.__ModuleLoader__.load({
  id: "@dsh-external/dsh-graded-mode",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    let react = require("react")

    const { useState, useEffect, useRef } = react
    const e = (type, props, ...children) => react.createElement(type, props, ...children)

    /* ---- 样式注入（官方 pattern：style 标签 + data-plugin-css） ---- */
    const CSS = `
.graded-tree{font-size:13px;line-height:1.55;margin:8px 0 4px;color:var(--dsw-alias-label-primary,#333)}
.graded-l1{display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 2px;border-top:1px solid var(--dsw-alias-border-l2,#eee)}
.graded-l1:first-child{border-top:none}
.graded-l1-title{font-weight:600;margin-right:4px}
.graded-lock{font-size:11px;color:var(--dsw-alias-state-success-primary,#2a9d6e)}
.graded-editing{font-size:11px;color:var(--dsw-alias-label-tertiary,#999)}
.graded-l2{display:flex;gap:6px;padding:3px 2px 3px 22px;color:var(--dsw-alias-label-secondary,#555)}
.graded-l2-done{border-left:2px solid var(--dsw-alias-state-success-primary,#2a9d6e);padding-left:20px;opacity:.62}
.graded-l2-title{margin-right:2px}
.graded-chip{font-size:11px;background:var(--dsw-alias-bg-code,#f2f2f2);border-radius:8px;padding:1px 7px;color:var(--dsw-alias-label-secondary,#666)}
.graded-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#999);margin-top:2px}
.graded-summary{font-size:11px;color:var(--dsw-alias-label-tertiary,#999);margin-top:4px}
.graded-pop button,.graded-pop input,.graded-pop select{pointer-events:auto;cursor:pointer}\n.graded-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:2px 10px;border-radius:10px;background:var(--dsw-alias-bg-code,#f2f2f2);color:var(--dsw-alias-label-secondary,#555);cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#e5e5e5);user-select:none}
.graded-badge:hover{background:var(--dsw-alias-bg-hover,#e8e8e8)}
.graded-badge-stage{font-weight:600}
.graded-badge-off{filter:grayscale(1);opacity:.55}
.graded-pop{position:fixed;right:14px;top:60px;z-index:99999;background:var(--dsw-bg,#fff);border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.14);padding:10px 12px;min-width:300px;max-height:80vh;overflow:auto;pointer-events:auto}
.graded-pop-progress{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.graded-pop-progress b{font-size:16px;color:var(--dsw-alias-label-primary,#222)}
.graded-chip-done{font-size:11px;background:var(--dsw-alias-state-success-primary,#2a9d6e);color:#fff;border-radius:8px;padding:1px 7px}
`
    const tagId = "@dsh-external/dsh-graded-mode/graded-tree.css"
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      const tag = document.createElement("style")
      tag.dataset.plugin = "@dsh-external/dsh-graded-mode"
      tag.dataset.pluginCss = tagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /* ---- 纯展示组件（不做解析语义,只渲染工具参数结构） ---- */

    function L2Item({ title, concepts, status, locked }) {
      const done = status === "completed"
      return e("div", { className: "graded-l2" + (done ? " graded-l2-done" : ""), style: done ? { opacity: ".62" } : undefined },
        e("span", { className: "graded-l2-title" }, (done ? "✅ " : locked ? "• " : "") + title),
        (concepts || []).map((c, i) => e("span", { className: "graded-chip", key: i }, c)),
      )
    }

    function Tree({ groups, editing }) {
      // 视觉/密度优化：已完成组默认折叠（层级聚焦当前推进组——历史完成组收进一行）
      const [closed, setClosed] = useState(() => {
        const init = {}
        for (const g of groups || []) {
          if (g.locked && (g.items || []).every((it) => it.status === "completed")) init[g.title] = true
        }
        return init
      })
      return e("div", { className: "graded-tree" },
        (groups || []).map((g) => {
          const isClosed = !!closed[g.title]
          return e("div", { key: g.title },
            e("div", {
              className: "graded-l1",
              onClick: () => setClosed((c) => ({ ...c, [g.title]: !c[g.title] })),
            },
              e("span", null, isClosed ? "▸" : "▼"),
              e("span", { className: "graded-l1-title" }, g.title),
              e("span", { style: { marginLeft: "4px", fontSize: "10px", color: "#999" } }, String((g.items || []).filter((it) => it.status === "completed").length) + "/" + String((g.items || []).length)),
              e("span", { className: "graded-lock" }, g.locked ? "🔒" : ""),
            ),
            !isClosed && e("div", null,
              (g.items || []).map((it, i) => e(L2Item, { key: i, title: it.title, concepts: it.concepts, status: it.status, locked: g.locked })),
              (g.items || []).length === 0 && e("div", { className: "graded-hint" }, "（大类已锁定,小类待分化）"),
            ),
          )
        }),
        groups && groups.length === 0 && e("div", { className: "graded-hint" }, "（尚未编辑,先 edit_plan(L1) 写大类）"),
      )
    }

    /** edit_plan 树卡片：args 参数 → 树（L1=组头行;L2=完整树）。 */
    function EditPlanRow({ toolName, block }) {
      let raw = null
      try {
        const args = (block && (block.call || block).argsRaw) || null
        raw = typeof args === "string" ? JSON.parse(args) : args
      } catch { /* 参数不可解析 → 降级通用展示 */ }
      const level = raw && raw.level
      const itemsArr = raw && Array.isArray(raw.items) ? raw.items : []
      const groups = raw && level === "L2" && Array.isArray(raw.groups) ? raw.groups
        : itemsArr.map((t) => ({ title: t && t.title, locked: false, items: [] }))
      const l2n = level === "L2" ? groups.reduce((n, g) => n + ((g && g.items) || []).length, 0) : 0
      return e("div", null,
        e("div", { className: "graded-hint" }, `计划编辑（${level === "L2" ? "小类分化" : "大类"}·${(groups || []).length} 大类${level === "L2" ? " · " + l2n + " 小类" : ""}）`),
        e(Tree, { groups, editing: true }),
      )
    }

    /** lock_stage 摘要卡。 */
    function LockStageRow({ toolName, block }) {
      let raw = null
      try {
        const args = (block && (block.call || block).argsRaw) || null
        raw = typeof args === "string" ? JSON.parse(args) : args
      } catch { /* 同上 */ }
      const level = raw && raw.level
      return e("div", { className: "graded-hint" },
        level === "L1" ? "🔒 L1 大类已锁定——锁定后大类不可再改,进入小类分化。" : "🔒🔒 L2 小类已锁定——所有门已关闭,审核弹窗已发出。")
    }

    /* ---- 完成情况面板（会话头部徽章：阶段 + 进度,点击展开组进度） ---- */

    const STAGE_LABEL = { off: "未激活", brainstorm: "需求对齐", "l1-edit": "大类编辑", "l2-edit": "小类分化", review: "待审核", develop: "逐项开发", final: "已完成" }
    const MODE_TAG = { correct: "C", experience: "E", research: "R" }
    const DO_ICON = { self: "●", subagent: "▲", workflow: "■", daemon: "⚙", mixed: "◇" }
    const VERIFY_TAG = { self: "自查", subagent: "验派", redteam: "⭕红", dual: "双轨", workflow: "批验" }
    const STATUS_CLS = { completed: "#2a9d6e", in_progress: "#2b6cb0", pending: "#999" }

    /** 项层完整规格（spec 全文 + accept 全文 + 红队历史时间线）。 */
    function ItemDetail({ it }) {
      const log = (it.redteam && it.redteam.log) || []
      return e("div", { style: { margin: "4px 0 4px 28px", fontSize: "12px", borderLeft: "2px solid #eee", paddingLeft: "8px" } },
        it.spec && e("div", { style: { color: "#444", marginBottom: "2px" } }, "任务: " + it.spec),
        e("div", { style: { color: "#555", marginBottom: "2px" } },
          "验收: " + ((it.accept || []).map((a) => a).join("；") || "（无——先声明）")),
        e("div", { style: { color: "#777" } },
          "do=" + (it.do || "?") + " verify=" + (it.verify || "?") + (it.doHistory && it.doHistory.length ? " · 修订×" + it.doHistory.length : "")),
        log.length > 0 && e("div", { style: { marginTop: "4px" } },
          e("div", { style: { fontSize: "11px", color: "#888" } }, "红队历史（轮次 " + it.redteam.rounds + "）："),
          log.map((l, i) => e("div", { key: i, style: { fontSize: "11px", color: l.verdict === "pass" ? "#2a9d6e" : "#c0392b", margin: "1px 0" } },
            "· " + (l.verdict === "pass" ? "通过" : "打回") + " " + ((l.issues || []).join("；") || "")
          )),
        ),
      )
    }

    /** 三层树：组卡（accept 摘要+verify+进度）→小类行（状态色+图标+红队标）→项层规格。 */
    function SpecTree({ plan }) {
      const [openG, setOpenG] = useState({})
      const [openI, setOpenI] = useState({})
      return e("div", { className: "graded-tree" },
        (plan && plan.groups || []).map((g) => {
          const gOpen = openG[g.title]
          const done = (g.items || []).filter((i) => i.status === "completed").length
          return e("div", { key: g.title, style: { marginBottom: "4px" } },
            e("div", { className: "graded-l1", onClick: () => setOpenG((c) => ({ ...c, [g.title]: !c[g.title] })) },
              e("span", null, gOpen ? "▼" : "▸"),
              e("span", { className: "graded-l1-title" }, g.title + (g.locked ? " 🔒" : "")),
              e("span", { className: "graded-hint" }, "验收: " + ((g.accept || []).slice(0, 2).map((a) => a.length > 18 ? a.slice(0, 18) + "…" : a).join("；") || "（无）")),
              e("span", { className: g.total && done === g.total ? "graded-chip-done" : "graded-chip" }, done + "/" + (g.items || []).length),
            ),
            gOpen && e("div", null,
              (g.items || []).map((it) => {
                const iOpen = openI[it.title]
                const color = STATUS_CLS[it.status] || "#999"
                return e("div", { key: it.title },
                  e("div", { className: "graded-l2", style: { cursor: "pointer", color: "#333" }, onClick: () => setOpenI((c) => ({ ...c, [it.title]: !c[it.title] })) },
                    e("span", null, iOpen ? "▾" : "▸"),
                    e("span", { style: { color: color, fontWeight: it.status === "completed" ? 600 : 400 } }, it.title + (it.status === "completed" ? " ✅" : it.status === "in_progress" ? " ▶" : "")),
                    !(it.accept || []).length && e("span", { title: "规格缺：无验收标准", style: { color: "#b8860b" } }, "⚠"),
                    e("span", { className: "graded-chip" }, "do=" + DO_ICON[it.do] + " " + VERIFY_TAG[it.verify]),
                    it.redteam && e("span", { style: { fontSize: "11px", color: it.redteam.passed ? "#2a9d6e" : "#c0392b" } },
                      it.redteam.passed ? "红✅" : "红⭕×" + (it.redteam.log || []).filter((l) => l.verdict === "reject").length),
                  ),
                  iOpen && e(ItemDetail, { it }),
                )
              }),
            ),
          )
        }),
      )
    }

    /* ---- 真正的 React 错误边界（渲染+生命周期捕获——Safe 的 try/catch 只兜渲染层） ---- */
    class Boundary extends react.Component {
      constructor(props) { super(props); this.state = { err: null } }
      static getDerivedStateFromError(err) { return { err } }
      componentDidCatch(err) { /* 只降级设置块，不抛到上层树 */ }
      render() {
        if (this.state.err) {
          return e("div", { className: "graded-hint", title: String(this.state.err) }, "（设置面板降级：" + String(this.state.err).slice(0, 60) + "）")
        }
        return this.props.children
      }
    }

    /* ---- 原生 DOM 设置面板（绕过 React 合成事件被宿主层级拦截的问题——事件 100% 原生） ---- */
    function NativePanel({ sid, state, onState, onClose, onSwitch }) {
      // 修复闪退：effect 只挂载一次（回调 ref 化）——2s 轮询导致的父重渲染不再重建面板（否则原生 select 下拉被撕掉）
      const cbRef = useRef({ onState, onClose, onSwitch })
      cbRef.current = { onState, onClose, onSwitch }
      useEffect(() => {
        const root = document.createElement("div")
        root.style.cssText = "position:fixed;right:14px;top:64px;z-index:99999;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.16);padding:12px;min-width:320px;font:13px/1.6 system-ui,sans-serif;color:#222"
        root.setAttribute("data-graded-native", "1")
        const [sessions, settings] = state
        const sess = (sessions || []).map((x) => `<option value="${x.sid}">${x.sid.replace(/^session-/, "").slice(0, 8)} · ${x.stage} · ${(x.task || "").slice(0, 18)}</option>`).join("")
        root.innerHTML =
          `<div style="font-weight:700;margin-bottom:8px">⚙ 设置</div>` +
          `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="width:64px">会话</span>` +
          `<select data-n="sid" style="font-size:13px;flex:1">${sess}</select></div>` +
          `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="width:64px">作用域</span>` +
          `<label style="display:inline-flex;gap:4px;margin-right:10px;cursor:pointer"><input type="radio" name="gscope" value="global" ${settings.scope === "global" ? "checked" : ""}>全局</label>` +
          `<label style="display:inline-flex;gap:4px;cursor:pointer"><input type="radio" name="gscope" value="session" ${settings.scope === "session" ? "checked" : ""}>本会话</label></div>` +
          `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="width:64px">概念上限</span>` +
          `<input type="range" data-n="limit" min="3" max="8" value="${settings.limit}" style="flex:1"><b data-n="limitv" style="min-width:14px">${settings.limit}</b></div>` +
          `<div style="display:flex;align-items:center;gap:8px;margin:8px 0"><span style="width:64px">检测模式</span>` +
          `<select data-n="vm" style="font-size:13px;flex:1">` +
          `<option value="auto" ${settings.vm === "auto" ? "selected" : ""}>自决策（默认，成本最低）</option>` +
          `<option value="self-redteam" ${settings.vm === "self-redteam" ? "selected" : ""}>单自红队（每小类裁决）</option>` +
          `<option value="subagent" ${settings.vm === "subagent" ? "selected" : ""}>单 subagent（每小类委派）</option></select></div>` +
          `<div style="margin-top:6px"><button data-n="save" style="font-size:13px;padding:4px 14px;cursor:pointer">保存</button>` +
          `<button data-n="close" style="font-size:13px;padding:4px 14px;cursor:pointer;margin-left:8px">关闭</button></div>` +
          `<div data-n="msg" style="font-size:12px;color:#2a9d6e;margin-top:6px"></div>`
        document.body.appendChild(root)
        const q = (n) => root.querySelector(`[data-n="${n}"]`)
        q("sid").value = sid || ""
        const apply = (patch) => cbRef.current.onState({ ...settings, ...patch })
        q("sid").addEventListener("change", (ev) => { const v = ev.target.value; if (v && cbRef.current.onSwitch) cbRef.current.onSwitch(v) })
        root.querySelectorAll('input[name="gscope"]').forEach((el) => el.addEventListener("change", (ev) => { if (ev.target.checked) apply({ scope: ev.target.value }) }))
        q("limit").addEventListener("input", (ev) => { apply({ limit: Number(ev.target.value) }); q("limitv").textContent = ev.target.value })
        q("vm").addEventListener("change", (ev) => apply({ vm: ev.target.value }))
        q("save").addEventListener("click", () => {
          const scope = root.querySelector('input[name="gscope"]:checked').value
          const qs = "?scope=" + scope + (scope === "session" && sid ? "&sid=" + encodeURIComponent(sid) : "")
          fetch("/graded-mode/api/settings" + qs, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ conceptLimit: settings.limit, verifyMode: settings.vm }) })
            .then((r) => r.json()).then((j) => { q("msg").textContent = j && j.ok ? "✓ 已保存（下次会话生效）" : (j?.error || "保存失败") }).catch((e) => { q("msg").textContent = String(e) })
        })
        q("close").addEventListener("click", () => cbRef.current.onClose())
        return () => { root.remove() }
      }, []) // 只挂载一次：轮询/状态刷新不再重建面板
      return null
    }

    function SettingPanel({ sid, onClose, onSwitch }) {
      const [st, setSt] = useState(null)
      const [scope, setScope] = useState("global")
      const [limit, setLimit] = useState(3)
      const [vm, setVm] = useState("auto")
      const [saved, setSaved] = useState(false)
      const [err, setErr] = useState(null)
      const [sessions, setSessions] = useState([])
      useEffect(() => {
        let alive = true
        const qs = sid ? "?sid=" + encodeURIComponent(sid) : ""
        fetch("/graded-mode/api/settings" + qs).then((r) => r.json()).then((j) => { if (alive && j && j.conceptLimit !== undefined) { setLimit(j.conceptLimit); setVm(j.verifyMode); setSt(j) } }).catch(() => {})
        fetch("/graded-mode/api/sessions").then((r) => r.json()).then((j) => { if (alive && j && j.ok) setSessions(j.sessions) }).catch(() => {})
        return () => { alive = false }
      }, [sid])
      const save = () => {
        const qs = "?scope=" + scope + (scope === "session" && sid ? "&sid=" + encodeURIComponent(sid) : "")
        fetch("/graded-mode/api/settings" + qs, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conceptLimit: limit, verifyMode: vm }),
        }).then((r) => r.json()).then((j) => { if (j && j.ok) { setSaved(true); setErr(null); setTimeout(() => setSaved(false), 1200) } else { setErr(j?.error || "保存失败") } }).catch((e) => setErr(String(e)))
      }
      const row = (label, node) => e("div", { style: { display: "flex", alignItems: "center", gap: "8px", margin: "6px 0" } }, e("span", { style: { width: "72px", fontSize: "12px" } }, label), node)
      return e("div", { style: { borderTop: "1px solid #ddd", padding: "8px", background: "#fff" } },
        e("div", { style: { fontWeight: "700", marginBottom: "4px" } }, "⚙ 设置"),
        e("div", { style: { display: "flex", alignItems: "center", gap: "8px", margin: "6px 0", fontSize: "12px" } },
          e("span", { style: { width: "72px" } }, "会话"),
          e("select", { value: sid || "", onChange: (ev) => { if (ev.target.value && onSwitch) onSwitch(ev.target.value) }, style: { fontSize: "12px", maxWidth: "260px" } },
            e("option", { value: "" }, sid ? "当前会话" : "（无）"),
            (sessions || []).map((x) => e("option", { key: x.sid, value: x.sid }, x.sid.replace(/^session-/, "").slice(0, 8) + " · " + x.stage + (x.task ? " · " + x.task : ""))))),
        row("作用域", e("div", { style: { display: "flex", gap: "10px", fontSize: "12px" } },
          ["global", "session"].map((s) =>
            e("label", { key: s, style: { display: "inline-flex", alignItems: "center", gap: "2px" } }, e("input", { type: "radio", checked: scope === s, onChange: () => setScope(s) }), s === "global" ? "全局" : "本会话")))),
        row("概念上限", e("div", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } },
          e("input", { type: "range", min: 3, max: 8, value: limit, onChange: (ev) => setLimit(Number(ev.target.value)) }),
          e("span", { style: { fontSize: "12px" } }, String(limit)))),
        row("检测模式", e("select", { value: vm, onChange: (ev) => setVm(ev.target.value), style: { fontSize: "12px" } },
          e("option", { value: "auto" }, "自决策（默认，成本最低）"),
          e("option", { value: "self-redteam" }, "单自红队（每小类裁决）"),
          e("option", { value: "subagent" }, "单 subagent（每小类委派）"))),
        err ? e("div", { style: { color: "#c0392b", fontSize: "12px" } }, err) : null,
        saved ? e("span", { style: { color: "#2a9d6e", fontSize: "12px" } }, " ✓ 已保存（下次会话生效）") :
          e("button", { onClick: save, style: { fontSize: "12px", padding: "2px 10px", marginTop: "4px" } }, "保存"),
        e("button", { onClick: onClose, style: { fontSize: "12px", padding: "2px 10px", marginLeft: "8px" } }, "关闭"))
    }

    function ProgressBadge() {
      const [st, setSt] = useState(null)
      const [open, setOpen] = useState(false)
      const [settings, setSettings] = useState(false)
      const [settingsData, setSettingsData] = useState({ values: { scope: "global", limit: 3, vm: "auto" }, sessions: [] })
      useEffect(() => {
        let alive = true
        fetch("/graded-mode/api/settings").then((r) => r.json()).then((j) => { if (alive && j && j.conceptLimit !== undefined) setSettingsData((d) => ({ ...d, values: { scope: "global", limit: j.conceptLimit, vm: j.verifyMode } })) }).catch(() => {})
        fetch("/graded-mode/api/sessions").then((r) => r.json()).then((j) => { if (alive && j && j.ok) setSettingsData((d) => ({ ...d, sessions: j.sessions })) }).catch(() => {})
        return () => { alive = false }
      }, [])
      // 会话锁定：首次成功显示后 localStorage 记忆（多会话并发时徽章不再随“最近活跃”漂移）；
      // 面板“会话”下拉切换=显式更新锁定
      const lockKey = "graded.lock.sid"
      const getLocked = () => { try { return localStorage.getItem(lockKey) } catch { return null } }
      const sk = getLocked()
      useEffect(() => {
        let alive = true
        const qs = sk ? "?sid=" + encodeURIComponent(sk) : ""
        const tick = () => {
          fetch("/graded-mode/api/state" + qs).then((r) => r.json()).then((j) => {
            if (!alive) return
            if (j && j.ok && j.stage !== "off") {
              if (!sk) { try { localStorage.setItem(lockKey, j.sid) } catch { /* */ } }
              setSt(j)
            } else if (j && j.ok) { setSt(j) }
            else if (sk) {
              // 锁定的会话已失效（off/无盘档）→ 清锁回退（防死锁）
              try { localStorage.removeItem(lockKey) } catch { /* */ }
              setSt(null)
            }
          }).catch((e) => { if (sk) { try { localStorage.removeItem(lockKey) } catch { /* */ } setSt(null) } })
        }
        tick()
        const id = setInterval(tick, 2000)
        return () => { alive = false; clearInterval(id) }
      }, [sk])
      if (!st || !st.ok) return null
      if (st.stage === "off") return null
      const stageLabel = STAGE_LABEL[st.stage] || st.stage
      const pct = st.total ? Math.round((st.done / st.total) * 100) : 0
      const rt = st.redteam || {}
      const rtTag = (rt.pending > 0 || rt.rounds === 0) && rt.rejected === 0
        ? e("span", { title: "红队：待验", style: { color: "#b8860b" } }, "●")
        : rt.rejected > 0
          ? e("span", { title: "红队：打回×" + rt.rejected, style: { color: "#c0392b" } }, "⭕" + rt.rejected)
          : e("span", { title: "红队：通过" + rt.passed + " · 轮次" + rt.rounds, style: { color: "#2a9d6e" } }, "✅" + rt.passed)
      return e("span", { style: { position: "relative" } },
        e("span", { className: "graded-badge", onClick: () => setOpen((o) => !o), title: "分级模式面板（sid 短号=状态归属会话）" },
          e("span", { className: "graded-badge-stage" }, stageLabel),
          (st.mode && MODE_TAG[st.mode]) && e("span", { style: { fontSize: "10px", fontWeight: "700", opacity: ".8", marginRight: "2px" } }, "[" + MODE_TAG[st.mode] + "]"),
          st.current && e("span", { style: { fontSize: "11px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "▸" + st.current),
          e("span", null, st.done + "/" + st.total + " ✓" + pct + "%"),
          rtTag,
          st.sidShort && e("span", { style: { fontSize: "10px", fontWeight: "700", opacity: ".85", marginLeft: "2px" } }, "·" + st.sidShort),
        ),
        open && e("div", { className: "graded-pop" },
          e("div", { className: "graded-pop-progress" },
            e("b", null, st.done + "/" + st.total),
            e("span", { className: "graded-chip" }, "任务: " + (st.task || "-")),
            (st.mode && MODE_TAG[st.mode]) && e("span", { className: "graded-chip" }, "模式: " + MODE_TAG[st.mode]),
          ),
          st.star && st.star.purpose && e("div", { style: { fontSize: "12px", color: "#444", margin: "2px 0 4px", padding: "4px 6px", background: "#faf7e8", borderRadius: "6px" } },
            "★ 北极星: " + st.star.purpose),
          e("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", fontSize: "11px", color: "#666", marginBottom: "4px" } },
            e("span", { className: "graded-chip" }, "打卡率 " + (st.total ? Math.round((st.done / st.total) * 100) : 0) + "%"),
            e("span", { className: "graded-chip" }, "标准覆盖 " + (st.specCoverage || 0) + "%" + (st.missingSpec ? " ⚠" + st.missingSpec : "")),
            e("span", { className: "graded-chip" }, "审计单注率 " + Math.round((st.uniqueRate || 0) * 100) + "%"),
          ),
          e("div", { className: "graded-hint", style: { marginBottom: "4px" } },
            "红队: 通过 " + (rt.passed || 0) + " · 打回 " + (rt.rejected || 0) + " · 轮次 " + (rt.rounds || 0) + (rt.pending ? " · 待验 " + rt.pending : "")),
          e(SpecTree, { plan: st.plan }),
          e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" } },
            e("span", { className: "graded-hint" }, "点击徽章收起 · 数据来自 /graded-mode/api/state"),
            e("button", { onClick: () => setSettings((s) => !s), style: { fontSize: "12px", padding: "2px 8px" } }, "⚙ 设置")),
          settings && e(Boundary, null, e(NativePanel, { sid: (st && st.sid) ? st.sid : null, state: [settingsData.sessions, { scope: "global", limit: 3, vm: "auto", ...settingsData.values }], onState: (s) => setSettingsData((d) => ({ ...d, values: s })), onClose: () => setSettings(false), onSwitch: (nsid) => { try { localStorage.setItem(lockKey, nsid) } catch { /* */ } setSt(null); fetch("/graded-mode/api/state?sid=" + encodeURIComponent(nsid)).then((r) => r.json()).then((j) => { if (j && j.ok) setSt(j) }).catch(() => {}) } })),
        ),
      )
    }

    /* ---- 安全包装：组件抛错时降级为注释行,绝不拖垮会话 UI 树（无气泡根因防御） ---- */

    function Safe(fn) {
      return function (props) {
        try {
          return fn(props)
        } catch (err) {
          return e("div", { className: "graded-hint", title: String(err) }, "（分级卡片渲染降级）")
        }
      }
    }

    /* ---- 注册两个 keyed toolview（keyed hit REPLACES general row） ---- */

    const inject = ["slots"]

    function apply(ctx) {
      ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
        name: "tool.call.toolview",
        key: "edit_plan",
        locale: "@dsh-external/dsh-graded-mode",
      }, Safe(EditPlanRow)))
      ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
        name: "tool.call.toolview",
        key: "lock_stage",
        locale: "@dsh-external/dsh-graded-mode",
      }, Safe(LockStageRow)))
      ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () =>
        ctx.slots.register({
          name: "conversation.session.header.utilities",
          id: "@dsh-external/dsh-graded-mode/progress",
        }, Safe(ProgressBadge))), "graded-mode: progress badge")
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
