window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-super-injector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/index.ts
		const inject = ["slots"];
		const API = "/super-injector/api";
		function el(tag, cls, text) {
			const e = document.createElement(tag);
			if (cls) e.className = cls;
			if (text !== void 0) e.textContent = text;
			return e;
		}
		const styles = `
.spi-page{font-family:ui-monospace,monospace;font-size:12px;line-height:1.6;padding:14px 16px;max-width:720px}
.spi-page h3{margin:0 0 8px;font-size:13px}
.spi-add{border:1.5px dashed var(--theme-border,#555);border-radius:8px;padding:12px;margin-bottom:14px;text-align:center;color:var(--theme-text-secondary,#999)}
.spi-add.drag{border-color:var(--theme-accent,#4a9eff);background:rgba(74,158,255,.08)}
.spi-row{display:flex;gap:6px;margin-top:10px}
.spi-input{flex:1;background:var(--theme-input-bg,#111);color:var(--theme-text,#ddd);border:1px solid var(--theme-border,#333);border-radius:6px;padding:6px 8px;font-size:12px}
.spi-btn{background:var(--theme-accent,#4a9eff);color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;white-space:nowrap}
.spi-btn.ghost{background:transparent;border:1px solid var(--theme-border,#444);color:var(--theme-text,#ccc)}
.spi-btn.danger{background:transparent;border:1px solid #d33;color:#d33}
.spi-btn:disabled{opacity:.45;cursor:not-allowed}
.spi-list{list-style:none;margin:0;padding:0}
.spi-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--theme-border,#333);border-radius:8px;margin-bottom:6px}
.spi-item .name{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.spi-item .dir{color:var(--theme-text-secondary,#888);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%}
.spi-item .st{font-size:10px;padding:2px 6px;border-radius:10px}
.spi-item .st.on{background:rgba(46,204,113,.15);color:#2ecc71}
.spi-item .st.off{background:rgba(255,193,7,.12);color:#f1c40f}
.spi-msg{margin-top:10px;padding:8px 10px;border-radius:6px;background:var(--theme-input-bg,#111);border:1px solid var(--theme-border,#333);white-space:pre-wrap;max-height:180px;overflow:auto;font-size:11px}
.spi-stats{color:var(--theme-text-secondary,#888);font-size:11px;margin:0 0 10px}
`;
		function fetchJson(path, init) {
			return fetch(API + path, {
				headers: { "content-type": "application/json" },
				...init
			}).then((r) => r.json());
		}
		function apply(ctx) {
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "super-injector-plugins",
				order: 50,
				label: () => "插件",
				component: () => ({ render() {
					const style = document.createElement("style");
					style.textContent = styles;
					const page = el("div", "spi-page");
					const h = el("h3", void 0, "插件管理（dsh-super-injector）");
					const stats = el("p", "spi-stats");
					page.append(style, h, stats);
					const add = el("div", "spi-add");
					add.textContent = "拖入文件夹，或输入路径——「内化」= 新建会话让 AI 把内容变成插件；「注入」= 目录已是插件包直接注入";
					const row = el("div", "spi-row");
					const input = el("input", "spi-input");
					input.placeholder = "D:/path/to/folder";
					const btnIngest = el("button", "spi-btn", "内化（AI 造插件）");
					const btnInject = el("button", "spi-btn ghost", "直接注入");
					row.append(input, btnIngest, btnInject);
					add.append(row);
					page.append(add);
					add.addEventListener("dragover", (e) => {
						e.preventDefault();
						add.classList.add("drag");
					});
					add.addEventListener("dragleave", () => add.classList.remove("drag"));
					add.addEventListener("drop", (e) => {
						e.preventDefault();
						add.classList.remove("drag");
						input.placeholder = "浏览器无法读取拖入文件夹的绝对路径——请粘贴路径或使用选择器";
					});
					const list = el("ul", "spi-list");
					page.append(list);
					const msg = el("div", "spi-msg");
					msg.style.display = "none";
					page.append(msg);
					const say = (text, isErr = false) => {
						msg.textContent = text;
						msg.style.display = text ? "block" : "none";
						msg.style.borderColor = isErr ? "#d33" : "var(--theme-border,#333)";
					};
					const refresh = () => {
						fetchJson("/list").then((d) => {
							if (!d?.ok) return say(JSON.stringify(d), true);
							const { entries, stats: s } = d;
							stats.textContent = `inject ${s?.inject?.ok ?? 0}✓/${s?.inject?.fail ?? 0}✗ · reload ${s?.reload?.ok ?? 0}✓ · uninject ${s?.uninject?.ok ?? 0}✓/${s?.uninject?.fail ?? 0}✗ · 共 ${entries.length} 个注入插件`;
							list.textContent = "";
							if (!entries.length) {
								list.append(el("li", "spi-item", "（暂无注入插件——拖入文件夹或输入路径开始）"));
								return;
							}
							for (const e of entries) {
								const li = el("li", "spi-item");
								const name = el("span", "name", String(e.name));
								const dir = el("span", "dir", String(e.dir));
								const st = el("span", "st " + (e.active ? "on" : "off"), e.active ? "运行中" : "未激活");
								const btn = el("button", "spi-btn danger", "卸载");
								btn.addEventListener("click", () => {
									btn.disabled = true;
									btn.textContent = "卸载中…";
									fetchJson("/uninstall", {
										method: "POST",
										body: JSON.stringify({ match: e.name })
									}).then((r) => {
										say(r?.result ?? JSON.stringify(r), !r?.ok);
									}).catch((err) => say("卸载请求失败: " + err, true)).finally(() => {
										btn.disabled = false;
										btn.textContent = "卸载";
										setTimeout(refresh, 600);
									});
								});
								li.append(name, dir, st, btn);
								list.append(li);
							}
						}).catch((err) => say("加载失败: " + err, true));
					};
					const doAction = (path, label) => {
						const dir = input.value.trim();
						if (!dir) {
							say("请先输入文件夹路径", true);
							return;
						}
						btnIngest.disabled = btnInject.disabled = true;
						btnIngest.textContent = btnInject.textContent = "处理中…";
						say("");
						fetchJson(path, {
							method: "POST",
							body: JSON.stringify({
								dir,
								title: label
							})
						}).then((r) => {
							say(r?.result ?? JSON.stringify(r), !r?.ok);
							if (r?.ok) setTimeout(refresh, 1200);
						}).catch((err) => say("请求失败: " + err, true)).finally(() => {
							btnIngest.disabled = btnInject.disabled = false;
							btnIngest.textContent = "内化（AI 造插件）";
							btnInject.textContent = "直接注入";
						});
					};
					btnIngest.addEventListener("click", () => doAction("/ingest", "内化插件"));
					btnInject.addEventListener("click", () => doAction("/inject", "直接注入"));
					refresh();
					const timer = window.setInterval(refresh, 6e4);
					return { dispose: () => window.clearInterval(timer) };
				} })
			})), "super-injector: settings page");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map