import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, rmdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/cosmokit/lib/index.js
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
/** Define a non-enumerable writable property and return the object. */
function defineProperty(object, key, value) {
	return Object.defineProperty(object, key, {
		writable: true,
		value,
		enumerable: false
	});
}
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
/** Binary source detection and base64/hex conversion helpers. */
var Binary;
(function(Binary) {
	Binary.is = isArrayBufferLike;
	Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
function deepEqual(a, b, strict) {
	if (a === b) return true;
	if (!strict && isNullable(a) && isNullable(b)) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a !== "object") return false;
	if (!a || !b) return false;
	function check(test, then) {
		return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
	}
	return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
		if (a.byteLength !== b.byteLength) return false;
		const viewA = new Uint8Array(a);
		const viewB = new Uint8Array(b);
		for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
		return true;
	}) ?? Object.keys({
		...a,
		...b
	}).every((key) => deepEqual(a[key], b[key], strict));
}
function tokenize(source, delimiters, delimiter) {
	const output = [];
	let state = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code >= 65 && code <= 90) {
			if (state === 1) {
				const next = source.charCodeAt(i + 1);
				if (next >= 97 && next <= 122) output.push(delimiter);
				output.push(code + 32);
			} else {
				if (state !== 0) output.push(delimiter);
				output.push(code + 32);
			}
			state = 1;
		} else if (code >= 97 && code <= 122) {
			output.push(code);
			state = 2;
		} else if (delimiters.includes(code)) {
			if (state !== 0) output.push(delimiter);
			state = 0;
		} else output.push(code);
	}
	return String.fromCharCode(...output);
}
/** Convert text to dash-delimited parameter case. */
function paramCase(source) {
	return tokenize(source, [45, 95], 45);
}
/** Runtime alias for `paramCase`. */
const hyphenate = paramCase;
/** Time constants plus parsing and formatting helpers. */
var Time;
(function(Time) {
	Time.millisecond = 1;
	Time.second = 1e3;
	Time.minute = Time.second * 60;
	Time.hour = Time.minute * 60;
	Time.day = Time.hour * 24;
	Time.week = Time.day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
	}
	Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * Time.day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * Time.minute);
	}
	Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
	}
	Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
		else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
		else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
		else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
		return ms + "ms";
	}
	Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/cordis/lib/index.js
/** Ordered collection of disposable values with O(1) deletion by value. */
var DisposableList = class {
	sn = 0;
	map = /* @__PURE__ */ new Map();
	weak = /* @__PURE__ */ new WeakMap();
	get length() {
		return this.map.size;
	}
	push(value) {
		const sn = ++this.sn;
		this.map.set(sn, value);
		this.weak.set(value, sn);
		return () => this.map.delete(sn);
	}
	delete(value) {
		const sn = this.weak.get(value);
		if (!sn) return false;
		return this.map.delete(sn);
	}
	clear() {
		const values = [...this.map.values()];
		this.map.clear();
		return values.reverse();
	}
	[Symbol.iterator]() {
		return this.map.values();
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return [...this];
	}
};
/** Shared symbols used to avoid public property-name collisions. */
const symbols = {
	shadow: Symbol.for("cordis.shadow"),
	receiver: Symbol.for("cordis.receiver"),
	original: Symbol.for("cordis.original"),
	metadata: Symbol.for("cordis.metadata"),
	initHooks: Symbol.for("cordis.initHooks"),
	checkProto: Symbol.for("cordis.checkProto"),
	effect: Symbol.for("cordis.effect"),
	filter: Symbol.for("cordis.filter"),
	isolate: Symbol.for("cordis.isolate"),
	intercept: Symbol.for("cordis.intercept"),
	init: Symbol.for("cordis.init"),
	check: Symbol.for("cordis.check"),
	config: Symbol.for("cordis.config"),
	invoke: Symbol.for("cordis.invoke"),
	extend: Symbol.for("cordis.extend"),
	tracker: Symbol.for("cordis.tracker"),
	resolveConfig: Symbol.for("cordis.resolveConfig")
};
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;
/** Return true when a plugin callback should be constructed with `new`. */
function isConstructor(func) {
	if (!func.prototype) return false;
	if (func instanceof GeneratorFunction) return false;
	if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
	return true;
}
/** Merge two prototype chains while preserving descriptors from `proto1`. */
function joinPrototype(proto1, proto2) {
	if (proto1 === Object.prototype) return proto2;
	const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
	for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
	return result;
}
/** Return true for non-null objects and functions. */
function isObject(value) {
	return value && (typeof value === "object" || typeof value === "function");
}
/** Find a property descriptor by walking an object's prototype chain. */
function getPropertyDescriptor(target, prop) {
	let proto = target;
	while (proto) {
		const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
		if (desc) return desc;
		proto = Object.getPrototypeOf(proto);
	}
}
/** Wrap services/functions so method calls see the caller's active context. */
function getTraceable(ctx, value) {
	if (!isObject(value)) return value;
	if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
	const tracker = value[symbols.tracker];
	if (!tracker) return value;
	return createTraceable(ctx, value, tracker);
}
/** Return a proxy that overlays readonly or writable properties onto a target. */
function withProps(target, props) {
	if (!props) return target;
	return new Proxy(target, {
		get: (target, prop, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
			return Reflect.get(target, prop, receiver);
		},
		set: (target, prop, value, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
			return Reflect.set(target, prop, value, receiver);
		}
	});
}
function withProp(target, prop, value) {
	return withProps(target, Object.defineProperty(Object.create(null), prop, {
		value,
		writable: false
	}));
}
function createShadow(ctx, target, property, receiver) {
	if (!property) return receiver;
	const origin = Reflect.getOwnPropertyDescriptor(target, property)?.value;
	if (!origin) return receiver;
	return withProp(receiver, property, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
	return new Proxy(value, { apply: (target, thisArg, args) => {
		if (thisArg === outer) thisArg = shadow;
		return getTraceable(ctx, Reflect.apply(target, thisArg, args));
	} });
}
function createTraceable(ctx, value, tracker) {
	if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
	const proxy = new Proxy(value, {
		get: (target, prop, receiver) => {
			if (prop === symbols.original) return target;
			if (prop === tracker.property) return ctx;
			if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
			let shadow, innerValue;
			const desc = getPropertyDescriptor(target, prop);
			if (desc && "value" in desc) innerValue = desc.value;
			else {
				shadow = createShadow(ctx, target, tracker.property, receiver);
				innerValue = Reflect.get(target, prop, shadow);
			}
			const innerTracker = innerValue?.[symbols.tracker];
			if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
			else if (!tracker.noShadow && typeof innerValue === "function") {
				shadow ??= createShadow(ctx, target, tracker.property, receiver);
				return createShadowMethod(ctx, innerValue, receiver, shadow);
			} else return innerValue;
		},
		set: (target, prop, value, receiver) => {
			if (prop === symbols.original) return false;
			if (prop === tracker.property) return false;
			if (typeof prop === "symbol") return Reflect.set(target, prop, value, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value, withProp(ctx, symbols.receiver, receiver));
			const shadow = createShadow(ctx, target, tracker.property, receiver);
			return Reflect.set(target, prop, value, shadow);
		},
		apply: (target, thisArg, args) => {
			return applyTraceable(proxy, target, thisArg, args);
		}
	});
	return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
	if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
	return value[symbols.invoke].apply(proxy, args);
}
/** Create a callable service object that dispatches through `symbols.invoke`. */
function createCallable(name, proto, tracker) {
	const self = function(...args) {
		return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
	};
	defineProperty(self, "name", name);
	return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
	const innerLines = info.error.stack.split("\n");
	if (typeof reason?.stack !== "string") {
		const outerError = new Error(reason);
		const lines = outerError.stack.split("\n");
		lines.splice(1, Infinity, ...getOuterStack());
		outerError.stack = lines.join("\n");
		throw outerError;
	}
	const lines = reason.stack.split("\n");
	let index = lines.indexOf(innerLines[2]);
	if (index === -1) throw reason;
	index -= info.offset;
	while (index > 0) {
		if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
		index -= 1;
	}
	lines.splice(index, Infinity, ...getOuterStack());
	reason.stack = lines.join("\n");
	throw reason;
}
/** Run a callback and splice outer call-site frames into thrown async errors. */
function composeError(callback, getOuterStack = buildOuterStack()) {
	const info = {
		offset: 1,
		error: /* @__PURE__ */ new Error()
	};
	try {
		const result = callback(info);
		if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
		else return result;
	} catch (reason) {
		handleError(info, reason, getOuterStack);
	}
}
/** Capture a lazy stack-frame supplier for later error composition. */
function buildOuterStack(offset = 0) {
	const outerError = /* @__PURE__ */ new Error();
	return () => outerError.stack.split("\n").slice(3 + offset);
}
/**
* Return whether an event result should stop a bail-style dispatch.
*
* @param value — a listener's return value.
* @returns `true` unless `value` is `null`, `false`, or `undefined`.
*/
function isBailed(value) {
	return value !== null && value !== false && value !== void 0;
}
/**
* Event bus installed as `ctx.events` and mixed into every context.
*
* The service supports concurrent, synchronous, serial, bail, and waterfall
* dispatch and automatically disposes listeners with their owning fiber.
*/
var EventsService = class {
	ctx;
	_hooks = {};
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.on("internal/listener", function(name, listener, options) {
			if (name === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
		});
		this.on("internal/update", function(config, noSave, next) {
			const cbs = [...this._hooks["internal/update"] || []];
			const _next = () => {
				return (cbs.shift() ?? next).call(this, config, noSave, _next);
			};
			return _next();
		}, {
			global: true,
			prepend: true
		});
	}
	/**
	* Resolve listeners for one dispatch and apply context filtering.
	*
	* @param type — the dispatch mode, reported on `internal/dispatch`.
	* @param args — the raw dispatch arguments; consumed up to the event name.
	* @returns the matching listener callbacks, bound to the dispatch `this`.
	*/
	dispatch(type, args) {
		const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
		const name = args.shift();
		if (!name.startsWith("internal/")) this.emit("internal/dispatch", type, name, args, thisArg);
		const filter = thisArg?.[Context.filter];
		return (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
	}
	/**
	* Run listeners concurrently and wait for all of them.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns a promise resolving once every listener has settled.
	*/
	async parallel(...args) {
		const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
		if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
	}
	/**
	* Run listeners synchronously without waiting for returned promises.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	*/
	emit(...args) {
		this.dispatch("emit", args).map((cb) => cb(...args));
	}
	/**
	* Run listeners in order, awaiting each, until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	async serial(...args) {
		for (const cb of this.dispatch("serial", args)) {
			const result = await cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Run listeners synchronously until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	bail(...args) {
		for (const cb of this.dispatch("bail", args)) {
			const result = cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Compose listeners around the final `next` callback.
	*
	* The last dispatch argument is treated as the innermost `next`. Listeners
	* run outermost-first; a listener that does not call `next()` vetoes the
	* rest of the chain, including the built-in behavior.
	*
	* @param args — optional `this`, the event name, listener arguments, then `next`.
	* @returns the outermost listener's return value.
	*/
	waterfall(...args) {
		const cbs = this.dispatch("waterfall", args);
		const inner = args.pop();
		const next = () => {
			return (cbs.shift() ?? inner)(...args);
		};
		args.push(next);
		return next();
	}
	/**
	* Store a listener record as an effect on the current fiber.
	*
	* @param label — effect label shown in fiber diagnostics.
	* @param hooks — the listener list for one event.
	* @param callback — the listener to store.
	* @param options — placement and filtering options.
	* @returns a disposer that unregisters the listener.
	*/
	register(label, hooks, callback, options) {
		const method = options.prepend ? "unshift" : "push";
		return this.ctx.fiber.effect(() => {
			hooks[method]({
				ctx: this.ctx,
				callback,
				...options
			});
			return () => this.unregister(hooks, callback);
		}, label);
	}
	/**
	* Remove a stored listener record.
	*
	* @param hooks — the listener list for one event.
	* @param callback — the listener to remove.
	* @returns `true` if the listener was found and removed.
	*/
	unregister(hooks, callback) {
		const index = hooks.findIndex((hook) => hook.callback === callback);
		if (index >= 0) {
			hooks.splice(index, 1);
			return true;
		}
	}
	/**
	* Register an event listener owned by the current fiber.
	*
	* The listener is removed automatically when the fiber unloads. Throws
	* `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
	*
	* @param name — the event name to listen for.
	* @param listener — called with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	on(name, listener, options) {
		if (typeof options !== "object") options = { prepend: options };
		this.ctx.fiber.assertActive();
		listener = this.ctx.reflect.bind(listener);
		const result = this.bail(this.ctx, "internal/listener", name, listener, options);
		if (result) return result;
		const hooks = this._hooks[name] ||= [];
		const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
		return this.register(label, hooks, listener, options);
	}
	/**
	* Register an event listener that disposes itself after the first call.
	*
	* @param name — the event name to listen for.
	* @param listener — called at most once with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	once(name, listener, options) {
		const dispose = this.on(name, function(...args) {
			dispose();
			return listener.apply(this, args);
		}, options);
		return dispose;
	}
};
/** Built-in placeholder formatters used by `Logger.format()`. */
const defaultFormatters = {
	s: (value) => String(value),
	d: (value) => Math.trunc(Number(value)),
	i: (value) => Math.trunc(Number(value)),
	f: (value) => Number(value),
	o: (value) => JSON.stringify(value),
	O: (value) => JSON.stringify(value),
	c: () => "",
	C: (value, exporter, message) => {
		return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
	}
};
function isAggregateError(error) {
	return error instanceof Error && Array.isArray(error["errors"]);
}
/** Logger facade for one named subsystem. */
var Logger = class {
	service;
	static color(exporter, code, value, decoration = "") {
		if (!exporter.colors) return "" + value;
		return `\u001b[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\u001b[0m`;
	}
	static code(name, level) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
			hash |= 0;
		}
		const colors = !level ? [] : level >= 2 ? c256 : c16;
		return colors[Math.abs(hash) % colors.length];
	}
	static format(exporter, message) {
		const args = message.args.slice();
		if (args[0] instanceof Error) {
			args[0] = args[0].stack || args[0].message;
			args.unshift("%s");
		} else if (typeof args[0] !== "string") args.unshift("%o");
		let format = args.shift();
		format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
			if (match === "%%") return "%";
			const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
			if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
			return match;
		});
		const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
		for (let arg of args) {
			if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
			format += " " + arg;
		}
		const { maxLength = 10240 } = exporter;
		return format.split(/\r?\n/g).map((line) => {
			return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
		}).join("\n");
	}
	constructor(options, service) {
		this.service = service;
		Object.assign(this, options);
		this.error = this._method("error", 0);
		this.info = this._method("info", 1);
		this.warn = this._method("warn", 2);
		this.debug = this._method("debug", 3);
	}
	_method(type, level) {
		return (...args) => {
			if (args.length === 1 && args[0] instanceof Error) {
				if (args[0].cause) this[type](args[0].cause);
				else if (isAggregateError(args[0])) {
					args[0].errors.forEach((error) => this[type](error));
					return;
				}
			}
			const sn = ++this.service._snMessage;
			const ts = Date.now();
			for (const exporter of this.service.exporters.values()) {
				if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
				const message = {
					sn,
					ts,
					type,
					level,
					name: this.name,
					...this.meta,
					args
				};
				exporter.export(message);
			}
		};
	}
};
/** ANSI 16-color palette indexes used for logger name coloring. */
const c16 = [
	6,
	2,
	3,
	4,
	5,
	1
];
/** ANSI 256-color palette indexes used for logger name coloring. */
const c256 = [
	20,
	21,
	26,
	27,
	32,
	33,
	38,
	39,
	40,
	41,
	42,
	43,
	44,
	45,
	56,
	57,
	62,
	63,
	68,
	69,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	92,
	93,
	98,
	99,
	112,
	113,
	129,
	134,
	135,
	148,
	149,
	160,
	161,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	170,
	171,
	172,
	173,
	178,
	179,
	184,
	185,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	204,
	205,
	206,
	207,
	208,
	209,
	214,
	215,
	220,
	221
];
/**
* Built-in logging service.
*
* Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
* directly to log with the current fiber-derived name.
*/
var LoggerService = class LoggerService {
	bufferSize = 1e3;
	buffer = [];
	ctx;
	_snMessage = 0;
	_snExporter = 0;
	exporters = /* @__PURE__ */ new Map();
	constructor(ctx) {
		const tracker = {
			property: "ctx",
			noShadow: true
		};
		const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		Object.assign(self, this);
		self.ctx = ctx;
		defineProperty(self, symbols.tracker, tracker);
		self.exporter({
			colors: 3,
			export: (message) => {
				self.buffer.push(message);
				if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
			}
		});
		return self;
	}
	/**
	* Register an exporter and dispose it with the current fiber.
	*
	* @param exporter — the sink that receives structured log messages.
	* @returns a disposer that removes the exporter.
	*/
	exporter(exporter) {
		return this.ctx.effect(() => {
			this.exporters.set(++this._snExporter, exporter);
			return () => this.exporters.delete(this._snExporter);
		}, "ctx.logger.exporter()");
	}
	_resolveConfig() {
		let intercept = this.ctx[symbols.intercept];
		const configs = [];
		while ("logger" in intercept) {
			if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
			intercept = Object.getPrototypeOf(intercept);
		}
		return Object.assign({}, ...configs);
	}
	[symbols.invoke](name) {
		const config = this._resolveConfig();
		const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
		name ??= config.name;
		name ??= hyphenate(fiber.name);
		return new Logger({
			name,
			level: config.level,
			meta: { fiber: new WeakRef(fiber) }
		}, this);
	}
	static {
		for (const type of [
			"error",
			"info",
			"warn",
			"debug"
		]) LoggerService.prototype[type] = function(...args) {
			return this()[type](...args);
		};
	}
};
function enhanceError(error) {
	const lines = error.stack.split("\n");
	lines.splice(0, 2, `Error: ${error.message}`);
	error.stack = lines.join("\n");
	return error;
}
const RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
	return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
/**
* Reflection and service-resolution layer installed as `ctx.reflect`.
*
* This service powers the context proxy, service registration, accessors, and
* the mixins that expose core service methods directly on `ctx`.
*/
var ReflectService = class {
	ctx;
	/** Proxy traps implementing service resolution for every context object. */
	static handler = {
		get: (target, prop, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
			if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
			const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
			try {
				const def = target.reflect.props[prop];
				if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
				if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
				return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
					const key = target[symbols.isolate][prop];
					let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
					while (true) {
						const impl = fiber.store?.[prop];
						if (impl) return getTraceable(ctx, impl.value);
						if (prop in fiber.inject) {
							error.message = `cannot get required service "${prop}" in inactive context`;
							throw error;
						}
						if (!fiber.runtime) throw error;
						if (fiber.parent[symbols.isolate][prop] !== key) throw error;
						fiber = fiber.parent.fiber;
					}
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		set: (target, prop, value, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
			const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
			const def = target.reflect.props[prop];
			if (!def) {
				if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
				throw enhanceError(error);
			}
			try {
				if (def.type === "accessor") {
					if (!def.set) return false;
					return def.set.call(ctx, value, ctx[symbols.receiver], error);
				}
				return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
					return ctx.reflect.set(prop, value, error);
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		has: (target, prop) => {
			if (isSpecialProperty(prop)) return Reflect.has(target, prop);
			if (Reflect.has(target, prop)) return true;
			return !!target.reflect.props[prop];
		}
	};
	/** Service implementations, keyed by isolation label. */
	store = Object.create(null);
	/** Declared context properties (services and accessors), by name. */
	props = Object.create(null);
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.mixin("reflect", [
			"get",
			"set",
			"provide",
			"accessor",
			"mixin"
		]);
		this.mixin("fiber", ["runtime", "effect"]);
		this.mixin("registry", ["inject", "plugin"]);
		this.mixin("events", [
			"on",
			"once",
			"parallel",
			"emit",
			"serial",
			"bail",
			"waterfall"
		]);
	}
	/**
	* Read a service from the store without the inject requirement.
	*
	* @param name — the service name.
	* @param strict — when `true`, only return implementations whose providing
	* fiber is currently active.
	* @returns the service value, or `undefined` when not (yet) provided.
	*/
	get(name, strict = true) {
		return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
	}
	_getImpl(name, strict = true) {
		const key = this.ctx[symbols.isolate][name];
		const impl = key && this.store[key];
		if (!impl) return;
		if (strict && impl.fiber.state !== 2) return;
		return impl;
	}
	/**
	* Overwrite a provided service's value.
	*
	* @param name — the service name.
	* @param value — the new service value.
	* @param error — carrier for the caller stack in diagnostics.
	* @returns `true` on success.
	* @throws when `name` was never provided, or was provided by another fiber.
	*/
	set(name, value, error) {
		const key = this.ctx[symbols.isolate][name];
		const impl = this.store[key];
		if (!impl) throw new Error(`cannot set property "${name}" without provide`);
		if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name}" in multiple fibers`);
		impl.value = value;
		return true;
	}
	/**
	* Register a service implementation owned by the current fiber.
	*
	* See the `ctx.provide()` overload above for the full contract.
	*
	* @param name — the service name.
	* @param value — the service value.
	* @param check — optional availability predicate for dependents.
	* @returns a disposer that unregisters the service.
	*/
	provide(name, value, check) {
		return this.ctx.fiber.effect(() => {
			if (!this.props[name]) this.props[name] ??= { type: "service" };
			else if (this.props[name].type !== "service") throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = { type: "service" };
			this.ctx.root[symbols.isolate][name] ??= Symbol(name);
			const key = this.ctx[symbols.isolate][name];
			const impl = {
				name,
				value,
				fiber: this.ctx.fiber,
				check
			};
			if (this.store[key]) throw new Error(`service "${name}" has been registered at <${this.store[key].fiber.name}>`);
			this.store[key] = impl;
			this.ctx.fiber.store[name] = impl;
			if (this.ctx.fiber.state === 2) this.notify([name]);
			return async () => {
				delete this.store[key];
				const fibers = this.notify([name]);
				await Promise.allSettled(fibers.map((fiber) => fiber.await()));
				delete this.ctx.fiber.store[name];
			};
		}, `ctx.provide(${JSON.stringify(name)})`);
	}
	/**
	* Re-evaluate every fiber that requires one of the given services.
	*
	* @param names — the service names that changed.
	* @param filter — restricts notification to matching isolation scopes.
	* @returns the fibers whose dependency state was refreshed.
	*/
	notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
		const fibers = [];
		for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
			let hasUpdate = false;
			for (const name of names) {
				if (!(name in fiber.inject)) continue;
				if (!filter(fiber.ctx, name)) continue;
				hasUpdate = true;
				fiber._checkImpl(name);
			}
			if (!hasUpdate) continue;
			fiber._refresh();
			fibers.push(fiber);
		}
		for (const name of names) {
			const self = Object.create(this.ctx);
			self[symbols.filter] = (target) => filter(target, name);
			this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
		}
		return fibers;
	}
	/**
	* Define a computed context property backed by get/set hooks.
	*
	* @param name — the context property name.
	* @param options — the `get` hook and optional `set` hook.
	* @returns a disposer that removes the accessor.
	*/
	accessor(name, options) {
		return this.ctx.fiber.effect(() => {
			if (name in this.props) throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = {
				type: "accessor",
				...options
			};
			return () => delete this.props[name];
		}, `ctx.accessor(${JSON.stringify(name)})`);
	}
	/**
	* Expose selected members of a service directly on `ctx`.
	*
	* See the `ctx.mixin()` overload above for the full contract.
	*
	* @param source — a context property name or a source object.
	* @param mixins — keys to forward, or a source-key → ctx-key map.
	* @returns a disposer that removes all created accessors.
	*/
	mixin(source, mixins) {
		const self = this;
		return this.ctx.fiber.effect(function* () {
			const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
			const getTarget = (ctx, error) => {
				return ctx[source];
			};
			for (const [key, value] of entries) yield self.accessor(value, {
				get(receiver, error) {
					const service = getTarget(this, error);
					if (isNullable(service)) return service;
					const mixin = receiver ? withProps(receiver, service) : service;
					const value = Reflect.get(service, key, mixin);
					if (typeof value !== "function") return value;
					return value.bind(mixin ?? service);
				},
				set(value, receiver, error) {
					const service = getTarget(this, error);
					const mixin = receiver ? withProps(receiver, service) : service;
					return Reflect.set(service, key, value, mixin);
				}
			});
		}, `ctx.mixin(${JSON.stringify(source)})`);
	}
	/**
	* Attach this context's tracing wrapper to a value.
	*
	* @param value — the value to wrap.
	* @returns the traceable wrapper (or the value itself when not applicable).
	*/
	trace(value) {
		return getTraceable(this.ctx, value);
	}
	/**
	* Wrap a callback so calls trace `this` and arguments to this context.
	*
	* @param callback — the function to wrap.
	* @returns a proxy delegating to `callback` with traced values.
	*/
	bind(callback) {
		return new Proxy(callback, {
			apply: (target, thisArg, args) => {
				return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
			},
			construct: (target, args, newTarget) => {
				return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
			}
		});
	}
};
const kValidationError$1 = Symbol.for("ValidationError");
/** Error raised when plugin configuration fails standard-schema validation. */
var ValidationError$1 = class extends TypeError {
	name = "ValidationError";
	/**
	* Build the aggregated message from schema issues.
	*
	* @param issues — the standard-schema issues, one message line each.
	*/
	constructor(issues) {
		super(`invalid config:\n` + issues.map((issue) => {
			if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
			else return `  - ${issue.message}`;
		}).join("\n"));
	}
};
Object.defineProperty(ValidationError$1.prototype, kValidationError$1, { value: true });
/**
* Validate and normalize config for a plugin runtime before it starts.
*
* @param runtime — the plugin runtime whose `Config` schema to apply.
* @param config — the raw user config.
* @returns the validated config, or `config` unchanged if the runtime has no schema.
* @throws {ValidationError} when validation reports issues.
*/
function resolveConfig(runtime, config) {
	if (!runtime.Config) return config;
	const result = runtime.Config["~standard"].validate(config);
	if ("then" in result) throw new TypeError("Async config validation is not supported");
	if (result.issues) throw new ValidationError$1(result.issues);
	else return result.value;
}
const effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
	const result = dispose();
	return effectInertia.get(dispose)?.() ?? result;
}
/** Notify plugin teardown without allowing one observer to break ownership cleanup. */
function emitPluginDisposed(context, fiber) {
	const args = ["internal/plugin", fiber];
	let callbacks;
	try {
		callbacks = context.events.dispatch("emit", args);
	} catch (error) {
		context.logger.error(error);
		return;
	}
	for (const callback of callbacks) try {
		const returned = callback(...args);
		Promise.resolve(returned).catch((error) => context.logger.error(error));
	} catch (error) {
		context.logger.error(error);
	}
}
/** Framework error with a stable machine-readable code. */
var CordisError = class CordisError extends Error {
	code;
	/**
	* @param code — the stable error code; also the default message.
	* @param message — optional human-readable override.
	*/
	constructor(code, message) {
		super(message ?? CordisError.Code[code]);
		this.code = code;
	}
};
/** Cordis error code definitions. */
(function(CordisError) {
	CordisError.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
const INACTIVE = "__INACTIVE__";
/**
* Runtime instance of one plugin application.
*
* A fiber tracks dependency state, validated config, lifecycle effects, and
* cleanup for the plugin context returned by `ctx.plugin()`.
*/
var Fiber = class {
	parent;
	inject;
	runtime;
	/** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
	uid;
	/** The context this fiber's plugin runs in (extends the parent context). */
	ctx;
	/** The validated plugin config (updated by `update()`). */
	config;
	/** The raw plugin config, re-resolved before each activation. */
	_config;
	/** Current lifecycle state; transitions emit `internal/status`. */
	state = 0;
	/** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
	dispose;
	/** Snapshot of required service implementations while loaded; `undefined` otherwise. */
	store;
	/** The in-flight load/unload transition, if one is currently running. */
	inertia;
	_hooks = Object.create(null);
	_disposables = new DisposableList();
	context;
	_error;
	_runner;
	_store = Object.create(null);
	/**
	* Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
	* rather than constructing them directly.
	*
	* @param parent — the context the plugin was loaded from.
	* @param config — raw config, validated against the runtime's schema.
	* @param inject — resolved dependency map (service name → intercept config).
	* @param runtime — the shared plugin runtime, or `null` for the root fiber.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	*/
	constructor(parent, config, inject, runtime, getOuterStack) {
		this.parent = parent;
		this.inject = inject;
		this.runtime = runtime;
		this._config = config;
		const collect = (dispose) => {
			this._disposables.push(dispose);
		};
		if (runtime) {
			this.uid = parent.registry.counter;
			this.ctx = this.context = parent.extend({ fiber: this });
			const injectEntries = Object.entries(this.inject);
			if (injectEntries.length) {
				this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
				for (const [name, config] of injectEntries) {
					if (isNullable(config)) continue;
					this.ctx[Context.intercept][name] = config;
				}
			}
			this._runner = {
				epoch: INACTIVE,
				getOuterStack,
				execute: function() {
					if (isConstructor(runtime.callback)) {
						const instance = new runtime.callback(this.ctx, this.config);
						for (const hook of instance?.[symbols.initHooks] ?? []) hook();
						return instance?.[symbols.init]?.();
					} else return runtime.callback(this.ctx, this.config);
				},
				collect
			};
			this.dispose = parent.fiber.effect(() => {
				const remove = runtime.fibers.push(this);
				return async () => {
					this.uid = null;
					emitPluginDisposed(this.context, this);
					if (this.ctx.registry.has(runtime.callback)) {
						remove();
						if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
					}
					this._setEpoch(INACTIVE);
					if (!this.inertia) this._updateState(() => {
						this.inertia = this._unload();
						return 5;
					});
					while (this.inertia) await this.inertia;
				};
			}, "ctx.plugin()");
			try {
				this.context.emit("internal/plugin", this);
			} catch (error) {
				Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
				throw error;
			}
			if (this.uid !== null && parent.fiber.state !== 5) {
				for (const name of Object.keys(this.inject)) this._checkImpl(name);
				this._refresh();
			}
		} else {
			this.uid = 0;
			this.ctx = this.context = parent;
			this.state = 2;
			this.store = Object.create(null);
			this._runner = {
				epoch: "",
				getOuterStack,
				execute: () => {},
				collect
			};
			this.dispose = () => this.restart();
		}
	}
	/** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
	get name() {
		let fiber = this;
		do {
			if (fiber.runtime?.name) return fiber.runtime.name;
			fiber = fiber.parent.fiber;
		} while (fiber !== fiber.parent.fiber);
		return "root";
	}
	/**
	* Throw if the fiber has already been disposed.
	*
	* @returns nothing when the fiber is still active.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
	*/
	assertActive() {
		if (this.uid !== null) return;
		throw new CordisError("INACTIVE_EFFECT");
	}
	_execute(runner) {
		const oldEpoch = runner.epoch;
		return composeError((info) => {
			const safeCollect = (dispose) => {
				if (typeof dispose === "function") runner.collect(dispose);
				else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
			};
			const effect = runner.execute.call(this);
			if (typeof effect === "function") return runner.collect(effect);
			else if (isNullable(effect)) {} else if (!isObject(effect)) throw new TypeError("Invalid effect");
			else if ("then" in effect) return effect.then(safeCollect);
			else if (Symbol.iterator in effect) {
				info.error = /* @__PURE__ */ new Error();
				const iter = effect[Symbol.iterator]();
				while (true) {
					const result = iter.next();
					safeCollect(result.value);
					if (result.done) return;
				}
			} else if (Symbol.asyncIterator in effect) {
				const iter = effect[Symbol.asyncIterator]();
				return (async () => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					while (true) {
						if (runner.epoch !== oldEpoch) return;
						const result = await iter.next();
						safeCollect(result.value);
						if (result.done) return;
					}
				})();
			} else throw new TypeError("Invalid effect");
		}, runner.getOuterStack);
	}
	effect(execute, label = "anonymous") {
		this.assertActive();
		if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
		const disposables = [];
		let disposing = false;
		let disposalTask;
		const dispose = () => {
			if (disposing) return disposalTask;
			disposing = true;
			let task;
			for (const disposable of disposables.splice(0).reverse()) if (task) task = task.then(() => runDisposable(disposable));
			else {
				const result = runDisposable(disposable);
				if (isObject(result) && "then" in result) task = result;
			}
			return disposalTask = task;
		};
		const meta = {
			label,
			children: []
		};
		const runner = {
			execute,
			epoch: true,
			collect: (dispose) => {
				disposables.push(dispose);
				this._disposables.delete(dispose);
				if (dispose[symbols.effect]) meta.children.push(dispose[symbols.effect]);
			},
			getOuterStack: buildOuterStack()
		};
		let task;
		let executing = true;
		let resolveSetup;
		let rejectSetup;
		let setupBarrier;
		let setupFailed = false;
		let inFlight;
		let removeWrapper = () => false;
		const waitForSetup = () => {
			setupBarrier ??= new Promise((resolve, reject) => {
				resolveSetup = resolve;
				rejectSetup = reject;
			});
			return setupBarrier;
		};
		const disposeAfter = (setup) => {
			return Promise.resolve(setup).then(() => dispose(), async (reason) => {
				await dispose();
				throw reason;
			});
		};
		const finalizeDisposal = (callback) => {
			let result;
			try {
				result = callback();
			} catch (error) {
				removeWrapper();
				throw error;
			}
			if (isObject(result) && "then" in result) {
				const pending = Promise.resolve(result).finally(() => {
					removeWrapper();
					if (inFlight === pending) inFlight = void 0;
				});
				return inFlight = pending;
			}
			removeWrapper();
			return result;
		};
		const wrapper = defineProperty(() => {
			if (!runner.epoch) return setupFailed ? inFlight : void 0;
			runner.epoch = false;
			return finalizeDisposal(() => {
				if (executing) return disposeAfter(waitForSetup());
				return task ? disposeAfter(task) : dispose();
			});
		}, symbols.effect, meta);
		effectInertia.set(wrapper, () => inFlight);
		removeWrapper = this._disposables.push(wrapper);
		try {
			task = this._execute(runner);
		} catch (reason) {
			executing = false;
			setupFailed = true;
			runner.epoch = false;
			let cleanup;
			try {
				cleanup = finalizeDisposal(dispose);
			} finally {
				rejectSetup?.(reason);
			}
			if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
			throw reason;
		}
		executing = false;
		if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
		task?.catch(() => {
			if (!runner.epoch) return dispose();
			return finalizeDisposal(dispose);
		}).catch((error) => this.ctx.logger.error(error));
		const disposeAsync = () => {
			if (!runner.epoch) return;
			runner.epoch = false;
			return finalizeDisposal(dispose);
		};
		wrapper.then = async (onFulfilled, onRejected) => {
			return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
		};
		return wrapper;
	}
	/**
	* Return metadata for currently registered effects.
	*
	* @returns one {@link EffectMeta} tree per labeled live effect.
	*/
	getEffects() {
		return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
	}
	_getState() {
		if (this.uid === null) return 4;
		if (this._error) return 3;
		if (this._runner.epoch !== INACTIVE) return 2;
		return 0;
	}
	_updateState(callback) {
		const oldState = this.state;
		this.state = callback() ?? this._getState();
		if (oldState === this.state) return;
		this.context.emit("internal/status", this, oldState);
		if (oldState !== 2 && this.state !== 2) return;
		for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
			const impl = this.ctx.reflect.store[key];
			if (impl.fiber !== this) continue;
			this.ctx.reflect.notify([impl.name]);
		}
	}
	_checkImpl(name) {
		const impl = this.ctx.reflect._getImpl(name, true);
		if (!impl) return delete this._store[name];
		try {
			if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name];
		} catch (error) {
			impl.fiber.ctx.logger.error(error);
			return delete this._store[name];
		}
		this._store[name] = impl;
	}
	_refresh() {
		let epoch = false;
		epoch = "";
		for (const name of Object.keys(this.inject)) {
			const impl = this._store[name];
			if (!impl) {
				epoch = INACTIVE;
				break;
			}
			epoch += ":" + impl.fiber.uid;
		}
		this._setEpoch(epoch);
	}
	_setEpoch(epoch) {
		const oldEpoch = this._runner.epoch;
		if (epoch === oldEpoch) return;
		this._runner.epoch = epoch;
		if (this.inertia) return;
		this._updateState(() => {
			if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
				this.inertia = this._reload();
				return 1;
			} else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	_resolveConfig(config) {
		config = this.context.waterfall(this, "internal/config", config, () => config);
		return this.runtime ? resolveConfig(this.runtime, config) : config;
	}
	async _reload() {
		this.store = { ...this._store };
		const oldEpoch = this._runner.epoch;
		try {
			await Promise.resolve();
			if (this._runner.epoch === oldEpoch) {
				this.config = this._resolveConfig(this._config);
				await this._execute(this._runner);
				this._error = void 0;
			}
		} catch (reason) {
			this.ctx.logger.error(reason);
			this._error = reason;
			this._runner.epoch = INACTIVE;
		}
		this._updateState(() => {
			if (this._runner.epoch === oldEpoch) this.inertia = void 0;
			else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	async _unload() {
		await Promise.all(this._disposables.clear().map(async (dispose) => {
			try {
				await composeError(async (info) => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					await runDisposable(dispose);
				}, this._runner.getOuterStack);
			} catch (reason) {
				this.ctx.logger.error(reason);
			}
		}));
		this.store = void 0;
		this._updateState(() => {
			if (this._runner.epoch === INACTIVE) this.inertia = void 0;
			else {
				this.inertia = this._reload();
				return 1;
			}
		});
	}
	/**
	* Wait for current lifecycle work and rethrow startup errors.
	*
	* @returns this fiber, once it has settled into a stable state.
	* @throws the config-validation or plugin-startup error, if any.
	*/
	async await() {
		while (this.inertia) await this.inertia;
		if (this._error) throw this._error;
		return this;
	}
	/**
	* Dispose and immediately reload this plugin with its current config.
	*
	* @returns a promise resolving once the reload settled.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
	*/
	async restart() {
		this.assertActive();
		this._setEpoch(INACTIVE);
		this._refresh();
		await this.await();
	}
	/**
	* Validate and apply new config, then restart the plugin.
	*
	* Runs the `internal/update` waterfall first, so update hooks (and HMR)
	* can veto or replace the restart.
	*
	* @param config — the new raw config; validated before anything restarts.
	* @param noSave — hint for persistence hooks not to write the change back.
	* @returns the update waterfall result; the default restart returns a promise.
	* @throws when validation, an update listener, or the restarted plugin fails.
	*/
	update(config, noSave = false) {
		this.assertActive();
		this._config = config;
		if (this.state !== 2) {
			this._error = void 0;
			this._setEpoch(INACTIVE);
			this._refresh();
			return;
		}
		config = this._resolveConfig(config);
		return this.context.waterfall(this, "internal/update", config, noSave, () => {
			this.config = config;
			this._error = void 0;
			return this.restart();
		});
	}
};
function isApplicable(object) {
	return object && typeof object === "object" && typeof object.apply === "function";
}
/**
* Decorator for declaring service dependencies on classes or class methods.
*
* On classes it contributes to the plugin's static `inject` map. On methods it
* delays the method call until the declared services are available.
*/
/**
* @param name — the required service name.
* @param config — optional intercept config applied for that service.
* @returns the class or method decorator.
*/
function Inject(name, config) {
	return function(value, decorator) {
		if (decorator.kind === "class") {
			if (!Object.hasOwn(value, "inject")) {
				defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
				defineProperty(value.inject, symbols.checkProto, true);
			}
			value.inject[name] = config;
		} else if (decorator.kind === "method") {
			const inject = (value[symbols.metadata] ??= {}).inject ??= Object.create(null);
			inject[name] = config;
			decorator.addInitializer(function() {
				const property = this[symbols.tracker]?.property;
				(this[symbols.initHooks] ??= []).push(() => {
					this.ctx.inject(inject, (ctx) => {
						return value.call(property ? withProps(this, { [property]: ctx }) : this);
					});
				});
			});
		} else throw new Error("@Inject() can only be used on class or class methods");
	};
}
/** Utilities for normalizing plugin dependency declarations. */
(function(Inject) {
	/**
	* Convert array/object/class-inherited inject metadata into a plain map.
	*
	* @param inject — the declaration to normalize; `null`/`undefined` add nothing.
	* @param result — the map to fill (service name → intercept config or `null`).
	* @returns `result`.
	*/
	function resolve(inject, result = Object.create(null)) {
		if (!inject) return result;
		if (Array.isArray(inject)) for (const name of inject) result[name] = null;
		else if (Reflect.has(inject, symbols.checkProto)) {
			Object.assign(result, resolve(Object.getPrototypeOf(inject)));
			for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		} else for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		return result;
	}
	Inject.resolve = resolve;
})(Inject || (Inject = {}));
/**
* Plugin registry installed as `ctx.registry` and mixed into every context.
*
* It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
* exposes map-like inspection over active plugin callbacks.
*/
var RegistryService = class {
	ctx;
	_counter = 0;
	_internal = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
	}
	/** Allocate the next fiber uid (increments on every read). */
	get counter() {
		return ++this._counter;
	}
	/** Number of registered plugin runtimes. */
	get size() {
		return this._internal.size;
	}
	/**
	* Resolve a supported plugin shape to its executable callback.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @returns the callback identifying the plugin, or `undefined` if invalid.
	*/
	resolve(plugin) {
		try {
			if (typeof plugin === "function") return plugin;
			if (isApplicable(plugin)) return plugin.apply;
		} catch {}
	}
	/**
	* Look up the runtime record for a plugin.
	*
	* @param plugin — any supported plugin shape.
	* @returns the runtime, or `undefined` when the plugin is not registered.
	*/
	get(plugin) {
		const key = this.resolve(plugin);
		return key && this._internal.get(key);
	}
	/**
	* Check whether a plugin has a registered runtime.
	*
	* @param plugin — any supported plugin shape.
	* @returns `true` when at least one fiber of the plugin exists.
	*/
	has(plugin) {
		const key = this.resolve(plugin);
		return !!key && this._internal.has(key);
	}
	/**
	* Dispose every running fiber for a plugin and remove its runtime record.
	*
	* @param plugin — any supported plugin shape.
	* @returns the removed runtime, or `undefined` when none was registered.
	*/
	delete(plugin) {
		const key = this.resolve(plugin);
		const runtime = key && this._internal.get(key);
		if (!runtime) return;
		this._internal.delete(key);
		for (const fiber of runtime.fibers) fiber.dispose();
		return runtime;
	}
	/** Iterate the registered plugin callbacks. */
	keys() {
		return this._internal.keys();
	}
	/** Iterate the registered plugin runtimes. */
	values() {
		return this._internal.values();
	}
	/** Iterate `[callback, runtime]` pairs. */
	entries() {
		return this._internal.entries();
	}
	/**
	* Visit every registered runtime.
	*
	* @param callback — receives each runtime and its identifying callback.
	*/
	forEach(callback) {
		return this._internal.forEach(callback);
	}
	/**
	* Start a callback once the requested dependencies are available.
	*
	* @param inject — required services, as an array or a name → config map.
	* @param callback — plugin body called with `(ctx, config)`.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	inject(inject, callback) {
		return this.plugin({
			inject,
			apply: callback,
			name: callback.name
		});
	}
	/**
	* Start a plugin in the current context and return its fiber.
	*
	* Creates (or reuses) the plugin's runtime record, then starts a new fiber
	* under the current context. Throws if `plugin` is not a supported shape or
	* if the current fiber is already disposed.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @param config — the plugin config, validated against its `Config` schema.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	plugin(plugin, config, getOuterStack = buildOuterStack()) {
		const callback = this.resolve(plugin);
		if (!callback) throw new Error("invalid plugin, expect function or object with an \"apply\" method, received " + typeof plugin);
		this.ctx.fiber.assertActive();
		let runtime = this._internal.get(callback);
		if (!runtime) {
			let name = plugin.name;
			if (name === "apply") name = void 0;
			runtime = {
				name,
				callback,
				fibers: new DisposableList(),
				Config: plugin.Config
			};
			this._internal.set(callback, runtime);
		}
		const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
		const wrapped = Object.create(fiber);
		wrapped.then = (onFulfilled, onRejected) => {
			return fiber.await().then(onFulfilled, onRejected);
		};
		return wrapped;
	}
};
/**
* Root and child dependency containers for Cordis plugins.
*
* A context is a proxy: normal property reads go through the service resolver,
* while `extend()`, `isolate()`, and `intercept()` create scoped child
* contexts without mutating their parent.
*/
var Context = class Context {
	/** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
	static effect = symbols.effect;
	/** Symbol key for a context's listener filter, consulted on every event dispatch. */
	static filter = symbols.filter;
	/** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
	static isolate = symbols.isolate;
	/** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
	static intercept = symbols.intercept;
	/**
	* Returns true for Cordis context proxies and context prototypes.
	*
	* Works across realms and across multiple copies of cordis, because the
	* brand is keyed by a global symbol rather than by `instanceof`.
	*
	* @param value — the value to test.
	* @returns `true` if `value` is a Cordis context, narrowing its type.
	*/
	static is(value) {
		return !!value?.[Context.is];
	}
	static {
		Context.is[Symbol.toPrimitive] = () => Symbol.for("cordis.is");
		Context.prototype[Context.is] = true;
	}
	/** Create the root context and install the built-in services. */
	constructor() {
		this[symbols.isolate] = Object.create(null);
		this[symbols.intercept] = Object.create(null);
		const self = new Proxy(this, ReflectService.handler);
		this.root = self;
		this.baseUrl = void 0;
		this.fiber = new Fiber(self, {}, Object.create(null), null, () => []);
		this.reflect = new ReflectService(self);
		this.registry = new RegistryService(self);
		this.events = new EventsService(self);
		this.logger = new LoggerService(self);
		this.fiber._disposables.clear();
		return self;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return `Context <${this.fiber.name}>`;
	}
	/**
	* Create a child context with extra metadata on top of the current scope.
	*
	* The child prototypally inherits every property of this context; own
	* properties of `meta` shadow the inherited ones. The parent is not mutated.
	*
	* @param meta — own properties (including symbol keys) to define on the child.
	* @returns a child context inheriting from this one.
	*/
	extend(meta = {}) {
		const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
		const self = Object.create(getTraceable(this, this));
		for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
		if (!shadow) return self;
		return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
	}
	/**
	* Create a child context with an independent service scope for `name`.
	*
	* Below the returned context, reads and writes of the service `name`
	* resolve against the new label instead of the parent's, so a different
	* implementation can be provided without affecting the parent scope.
	* Passing the same `label` to two `isolate()` calls joins their scopes.
	*
	* @param name — the service name to isolate.
	* @param label — scope label to join; defaults to a fresh unique symbol.
	* @returns a child context whose `name` service resolves in the new scope.
	*/
	isolate(name, label) {
		const shadow = Object.create(this[symbols.isolate]);
		shadow[name] = label ?? Symbol(name);
		return this.extend({ [symbols.isolate]: shadow });
	}
	intercept(name, config) {
		const intercept = Object.create(this[symbols.intercept]);
		intercept[name] = config;
		return this.extend({ [symbols.intercept]: intercept });
	}
};
/**
* Base class for services that expose a named API on `ctx`.
*
* Subclasses call `super(ctx, name)` from their constructor. The service is
* registered immediately and is automatically removed with the owning fiber.
*/
var Service = class Service {
	ctx;
	/** Symbol key of an instance method run after construction (class plugins). */
	static init = symbols.init;
	/** Symbol key of the availability predicate passed to `ctx.provide()`. */
	static check = symbols.check;
	/** Symbol key of the phantom intercept-config type parameter. */
	static config = symbols.config;
	/** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
	static invoke = symbols.invoke;
	/** Symbol key of the helper deriving an extended service instance. */
	static extend = symbols.extend;
	/** Symbol key of the tracker metadata used for context tracing. */
	static tracker = symbols.tracker;
	/** Symbol key of the intercept-config resolution helper below. */
	static resolveConfig = symbols.resolveConfig;
	/** The service name this instance is registered under. */
	name;
	/**
	* Register this instance as `name` in the current context.
	*
	* Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
	* service is unregistered automatically when the owning fiber unloads.
	* Services with a `[Service.invoke]` body return a callable instance.
	*
	* @param ctx — the context to register in (stored as `this.ctx`).
	* @param name — the service name; defaults to the static `provide` field.
	*/
	constructor(ctx, name) {
		this.ctx = ctx;
		name ??= this.constructor["provide"];
		let self = this;
		const tracker = {
			associate: name,
			property: "ctx"
		};
		if (self[symbols.invoke]) self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		self.ctx = ctx;
		self.name = name;
		defineProperty(self, symbols.tracker, tracker);
		self.ctx.reflect.provide(name, self, this[symbols.check]);
		return self;
	}
	[symbols.filter](ctx) {
		return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
	}
	[symbols.extend](props) {
		let self;
		if (this[Service.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
		else self = Object.create(this);
		return Object.assign(self, props);
	}
	/**
	* Merge intercept config from ancestors with optional base and head values.
	*
	* Entries added closer to the root apply first; `base` is prepended and
	* `head` appended. Uses `Config.merge` when the service declares one,
	* otherwise a shallow `Object.assign`.
	*
	* @param base — lowest-precedence config merged before all intercepts.
	* @param head — highest-precedence config merged after all intercepts.
	* @returns the merged config.
	*/
	[symbols.resolveConfig](base, head) {
		let intercept = this.ctx[Context.intercept];
		const configs = [];
		while (this.name in intercept) {
			if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
			intercept = Object.getPrototypeOf(intercept);
		}
		if (base) configs.unshift(base);
		if (head) configs.push(head);
		if (this["Config"]?.merge) return this["Config"].merge(...configs);
		else return Object.assign({}, ...configs);
	}
	static [Symbol.hasInstance](instance) {
		if (!instance) return false;
		let constructor = instance.constructor;
		while (constructor) {
			constructor = constructor.prototype?.constructor;
			if (constructor === this) return true;
			constructor &&= Object.getPrototypeOf(constructor);
		}
		return false;
	}
};
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/schemastery/lib/index.mjs
const kSchema = Symbol.for("schemastery");
const kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError];
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
const resolvers = {};
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-scope/lib/index.js
/**
* Shared insertion-ordered storage and effect ownership for scope-aware registries.
*
* @module @deepseek-ai/dsh-scope
*/
/**
* Insertion-ordered named entries with caller-owned duplicate diagnostics.
*
* Values are borrowed. Iterators are live within one nonempty table
* generation; draining the table detaches them from later insertions. Each
* successful insertion returns an idempotent undo for that exact entry.
*/
var NamedEntries = class {
	duplicateError;
	data = /* @__PURE__ */ new Map();
	constructor(duplicateError) {
		this.duplicateError = duplicateError;
	}
	/**
	* Insert one unique name.
	* @param name - name unique within this table.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo that removes only this insertion.
	*/
	insert(name, value) {
		const data = this.data;
		if (data.has(name)) throw this.duplicateError(name);
		data.set(name, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(name);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Read one named value.
	* @param name - name to resolve.
	* @returns the retained value, or `undefined` when absent.
	*/
	get(name) {
		return this.data.get(name);
	}
	/**
	* Test one name for membership.
	* @param name - name to test.
	* @returns whether the table contains that name.
	*/
	has(name) {
		return this.data.has(name);
	}
	/**
	* Iterate live names in insertion order.
	* @returns the native live key iterator.
	*/
	keys() {
		return this.data.keys();
	}
	/**
	* Iterate live entries in insertion order.
	* @returns the native live entry iterator.
	*/
	entries() {
		return this.data.entries();
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Insertion-ordered anonymous entries with independent registration identity.
*
* Equal values remain separate registrations. Values are borrowed, and
* iterators are live within one nonempty table generation; draining the table
* detaches them from later appends.
*/
var AnonymousEntries = class {
	data = /* @__PURE__ */ new Map();
	/**
	* Append one independently owned value.
	* @param value - borrowed value to retain.
	* @returns an idempotent undo for this exact append.
	*/
	append(value) {
		const data = this.data;
		const key = Symbol();
		data.set(key, value);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			data.delete(key);
			if (data.size === 0 && this.data === data) this.data = /* @__PURE__ */ new Map();
		};
	}
	/**
	* Iterate live values in insertion order.
	* @returns the native live value iterator.
	*/
	values() {
		return this.data.values();
	}
	/**
	* Test whether this table has no entries.
	* @returns whether the table is empty.
	*/
	isEmpty() {
		return this.data.size === 0;
	}
};
/**
* Own the global and exact-scope layers for one registry.
*
* Reads never create scoped layers. Registrations derive both visibility and
* effect ownership from the supplied Cordis context, collect undo before
* notification, and reclaim only a completely empty aggregate layer.
*/
var ScopedLayers = class {
	createLayer;
	onChange;
	/** The eagerly constructed context-global layer. */
	global;
	scoped = /* @__PURE__ */ new Map();
	constructor(createLayer, onChange) {
		this.createLayer = createLayer;
		this.onChange = onChange;
		this.global = createLayer(void 0);
	}
	/**
	* Read an existing exact-scope overlay. Deliberately chain-blind: callers
	* addressing one scope's OWN contributions (its restrictions, its guards)
	* must not silently pick up an ancestor's — use {@link chainLayers} where
	* inheritance is the point.
	* @param scope - exact scope key; `undefined` denotes no overlay.
	* @returns the existing scoped layer, or `undefined` without creating one.
	*/
	peek(scope) {
		if (scope === void 0) return void 0;
		return this.scoped.get(scope);
	}
	/**
	* Existing overlays along the scope's parent chain ({@link scopeChainOf}),
	* farthest ancestor first and the exact scope last, so a caller layering
	* them in order gives the nearest scope the final word.
	* @param scope - viewing scope, or `undefined` for no overlays.
	* @returns the existing layers, nearest last; absent overlays are skipped.
	*/
	chainLayers(scope) {
		const layers = [];
		for (const key of scopeChainOf(scope).reverse()) {
			const layer = this.scoped.get(key);
			if (layer !== void 0) layers.push(layer);
		}
		return layers;
	}
	/**
	* Materialize global named entries followed by scope-chain shadows,
	* farthest ancestor first, so the nearest scope's entry wins a name.
	* @param scope - viewing scope, or `undefined` for the global view.
	* @param pick - select the named table from a layer.
	* @returns an insertion-ordered effective map.
	*/
	merge(scope, pick) {
		const merged = new Map(pick(this.global).entries());
		for (const layer of this.chainLayers(scope)) for (const [name, value] of pick(layer).entries()) merged.set(name, value);
		return merged;
	}
	/**
	* Attach one synchronous layer mutation to its registration context.
	* @param ctx - context that determines both scope visibility and effect ownership.
	* @param action - atomic mutation returning its synchronous undo.
	* @param options - Cordis effect label and optional change notification.
	* @returns the exact disposer returned by `ctx.effect()`.
	*/
	effect(ctx, action, options) {
		const scope = scopeOf(ctx);
		const notify = options.notify ?? true;
		return ctx.effect(function* () {
			let layer;
			let created = false;
			if (scope === void 0) layer = this.global;
			else {
				const existing = this.scoped.get(scope);
				if (existing === void 0) {
					layer = this.createLayer(scope);
					this.scoped.set(scope, layer);
					created = true;
				} else layer = existing;
			}
			let undo;
			try {
				undo = action(layer);
			} catch (error) {
				if (scope !== void 0 && created && layer.isEmpty()) this.scoped.delete(scope);
				throw error;
			}
			yield () => {
				undo();
				if (scope !== void 0 && layer.isEmpty()) this.scoped.delete(scope);
				if (notify) this.onChange();
			};
			if (notify) this.onChange();
		}.bind(this), options.label);
	}
};
/**
* Scoped-context primitive: mint a Cordis context that tags registrations with
* an opaque identity and build routing-only event carriers for that identity.
*
* @module @deepseek-ai/dsh-scope
*/
/** Context tag written by {@link createScope}. */
const kScope = Symbol("dsh.scope");
/** The key associated with each carrier. Presence distinguishes an unkeyed carrier from a non-carrier. */
const carrierKeys = /* @__PURE__ */ new WeakMap();
/**
* The enclosing scope of each key. One relation powers both directions of
* scope nesting: registration views inherit DOWN the chain (a child scope
* sees its ancestors' layers — {@link ScopedLayers}), and event admission
* extends UP it (a listener tagged with an ancestor receives events dispatched
* to a descendant key — {@link scopeTarget}).
*/
const scopeParents = /* @__PURE__ */ new WeakMap();
/**
* The chain from a key to its root ancestor.
* @param key - the starting key, or `undefined` for the empty chain.
* @returns keys nearest-first: `[key, parent, grandparent, …]`.
*/
function scopeChainOf(key) {
	const chain = [];
	for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) chain.push(cursor);
	return chain;
}
/**
* Read the nearest scope tag inherited by a context.
* @param ctx - context to inspect.
* @returns its scope key, or `undefined` for an unscoped context.
*/
function scopeOf(ctx) {
	return ctx[kScope];
}
/**
* Build an opaque receiver that preserves the base filter, admits untagged
* listeners globally, and admits tagged listeners for a matching key or any
* of its ancestors ({@link bindScopeParent}): a listener owned by an enclosing
* scope receives every descendant scope's events, which is what lets one
* standing composition observe each of the agents composed under it. A tag
* BELOW the dispatch key stays excluded — events flow up the chain, never
* down.
* @param base - subject or service whose existing Cordis filter is preserved.
* @param key - routed scope identity, or `undefined` for an unscoped subject.
* @returns a carrier whose subject remains available only through event arguments.
*/
function scopeTarget(base, key) {
	const baseFilter = base[Context.filter];
	const carrier = { [Context.filter](ctx) {
		if (baseFilter !== void 0 && !baseFilter.call(base, ctx)) return false;
		const tag = scopeOf(ctx);
		if (tag === void 0) return true;
		for (let cursor = key; cursor !== void 0; cursor = scopeParents.get(cursor)) if (cursor === tag) return true;
		return false;
	} };
	carrierKeys.set(carrier, key);
	return carrier;
}
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js
/**
* Remote decorators and explicit Gateway bindings backed only by private
* module state. Strict reflection remains a Typert compiler responsibility.
* @module @deepseek-ai/dsh-typert-protocol
*/
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
* Test one generated Remote name against the Connection endpoint grammar.
* @param value - namespace, method, lookup, or Context segment.
* @returns whether the value can cross the shared RPC carrier unchanged.
*/
function isTypertRemoteSegment(value) {
	return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
/** A business Remote rejection preserved by unary and stream carriers. */
var TypertRemoteFailure = class extends Error {
	/** Stable caller-facing failure payload. */
	failure;
	/**
	* Wrap one business rejection for transport without changing its code or details.
	* @param failure - business failure returned unchanged to the caller.
	*/
	constructor(failure) {
		super(failure.message);
		this.name = "TypertRemoteFailure";
		this.failure = failure;
	}
};
const markers = /* @__PURE__ */ new WeakMap();
/**
* Bind one visible Service field to a Cordis key and Remote namespace.
* @param service - owning Service instance, normally `this`.
* @param serviceKey - exact Cordis service key.
* @param options - optional distinct wire namespace.
* @returns a frozen, inspectable binding with no compiler-injected metadata.
*/
function bindTypertRemote(service, serviceKey, options = {}) {
	validateName("service key", serviceKey);
	const namespace = options.namespace ?? serviceKey;
	validateName("namespace", namespace);
	return Object.freeze({
		service,
		serviceKey,
		namespace
	});
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
var TypertRemoteService = class extends Service {
	/** Visible binding consumed by the Gateway's source-mode discovery. */
	typertRemote;
	/**
	* Register the Service and bind the same key to Typert Gateway.
	* @param ctx - owning Cordis Context.
	* @param serviceKey - exact Cordis service key and default wire namespace.
	* @param options - optional distinct wire namespace.
	*/
	constructor(ctx, serviceKey, options = {}) {
		super(ctx, serviceKey);
		this.typertRemote = bindTypertRemote(this, this.name, options);
	}
};
function Remote(methodExportOrOptions, context) {
	if (typeof methodExportOrOptions === "string") {
		validateName("Remote export name", methodExportOrOptions);
		return remoteDecorator({ kind: "direct" }, void 0, methodExportOrOptions);
	}
	if (typeof methodExportOrOptions === "object") {
		if (remoteOptionMode(methodExportOrOptions) !== "stream" || Reflect.ownKeys(methodExportOrOptions).length !== 1) throw new TypeError("typert-protocol: Remote options must contain exactly mode: \"stream\"");
		return remoteDecorator({ kind: "direct" }, "stream");
	}
	if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
	addMarkerInitializer(context, { kind: "direct" });
}
function remoteOptionMode(options) {
	return Reflect.get(options, "mode");
}
function remoteDecorator(invocation, mode, exportName) {
	return function(_method, context) {
		addMarkerInitializer(context, invocation, mode, exportName);
	};
}
function addMarkerInitializer(context, invocation, mode, exportName) {
	if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
	const method = context.name;
	context.addInitializer(function() {
		const prototype = Object.getPrototypeOf(this);
		if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
		mark(prototype, method, invocation, mode, exportName);
	});
}
function mark(prototype, method, invocation, mode, exportName) {
	let table = markers.get(prototype);
	if (table === void 0) {
		table = /* @__PURE__ */ new Map();
		markers.set(prototype, table);
	}
	const marker = {
		...exportName === void 0 || exportName === method ? {} : { exportName },
		...mode === void 0 ? {} : { mode },
		invocation: Object.freeze(invocation)
	};
	const current = table.get(method);
	if (current !== void 0) {
		if (current.exportName === marker.exportName && current.mode === marker.mode && sameInvocation(current.invocation, invocation)) return;
		throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
	}
	table.set(method, Object.freeze(marker));
}
function sameInvocation(left, right) {
	return left.kind === right.kind && (left.kind === "direct" || right.kind === "context" && left.context === right.context);
}
function validateName(subject, value) {
	if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-util-crypto/lib/index.js
/**
* Random v4 UUID, minted from `crypto.getRandomValues`.
* @returns the UUID string.
*/
function randomUUID() {
	const bytes = globalThis.crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	const hex = Array.from(bytes, (byte, index) => {
		return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
	}).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-timeout/lib/index.js
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-llm/lib/index.js
/**
* dsh-llm's owned branded ids: tool-call correlation and provider request
* diagnostics.
*
* The `Branded<B>` primitive itself lives in `@deepseek-ai/dsh-brand` (a
* zero-dependency type-only package) so every owner of a cross-boundary id can
* brand it without depending on dsh-llm; see that package's README for the
* nominal-typing policy.
*
* @module @deepseek-ai/dsh-llm/brand
*/
/**
* Brand a message identifier.
* @param id - the opaque message identifier.
* @returns the same string, branded; no validation is performed.
*/
function MessageId(id) {
	return id;
}
/**
* Brand a string as a {@link ToolCallId}.
* @param id - the provider-issued (or synthesized) call id.
* @returns the same string, branded; no validation is performed.
*/
function ToolCallId(id) {
	return id;
}
/**
* Field-wise equality over {@link LlmCallConfig} — the comparison a caller
* runs to decide whether a proposed configuration is a real change (worth a
* logged header snapshot) or the held one restated.
* @param a - one configuration.
* @param b - the other.
* @returns whether every field (including the `stop` list, element-wise) matches.
*/
function callConfigEquals(a, b) {
	if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
	if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
	return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
/**
* Deep-freeze a value in place with an iterative traversal, guarding cycles,
* so later mutation throws without imposing a JavaScript call-stack depth cap.
* {@link AbortSignal} objects are deliberately skipped because they are the
* request's live cancellation channel and freezing them breaks abort.
* @param value - the value to freeze in place.
* @returns the same value, frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
/**
* Create one identified message and freeze it before publication.
* @param input - complete role, content, and source for a new message.
* @returns an immutable message with a fresh stable identity.
*/
function createMessage(input) {
	return freezeMessage({
		...input,
		id: MessageId(randomUUID())
	});
}
/**
* Create one identified user-role message and freeze it before publication.
* @param input - complete content and source for a new user message.
* @returns an immutable user message with a fresh stable identity.
*/
function createUserMessage(input) {
	return createMessage({
		...input,
		role: "user"
	});
}
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`, `INVARIANT`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = Schema.object({
	initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = Schema.object({
	mode: Schema.const("normal").required(),
	maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = Schema.object({
	mode: Schema.const("always").required(),
	backoff: backoffSchema
});
Schema.union([normalPolicySchema, alwaysPolicySchema]);
const NORMAL_POLICY_KEYS = /* @__PURE__ */ new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const ALWAYS_POLICY_KEYS = /* @__PURE__ */ new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const BACKOFF_KEYS = /* @__PURE__ */ new Set([
	"initialDelayMs",
	"maxDelayMs",
	"jitterRatio"
]);
function validateKeys(value, allowed, path) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${path}: unknown key "${key}"`);
}
function resolveBackoff(config, path) {
	if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
	const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
	const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
	if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > 2147483647) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > 2147483647) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
	if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
	return Object.freeze({
		initialDelayMs,
		maxDelayMs,
		jitterRatio
	});
}
/**
* Validate, default, and detach one provider-owned retry policy.
* @param config - optional provider configuration; omission selects normal defaults.
* @param path - diagnostic path naming the provider config that owns the value.
* @returns an immutable policy safe to capture in provider registration state.
*/
function resolveRetryPolicy(config, path) {
	if (config === void 0) return Object.freeze({
		mode: "normal",
		maxRetries: DEFAULT_MAX_RETRIES,
		retryableCodes: DEFAULT_RETRYABLE_CODES,
		...resolveBackoff(void 0, `${path}.backoff`)
	});
	switch (config.mode) {
		case "normal": {
			validateKeys(config, NORMAL_POLICY_KEYS, path);
			const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
			const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
			if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
			if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
			if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
			if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
			return Object.freeze({
				mode: "normal",
				maxRetries,
				retryableCodes: Object.freeze([...retryableCodes]),
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		}
		case "always":
			validateKeys(config, ALWAYS_POLICY_KEYS, path);
			return Object.freeze({
				mode: "always",
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		default: throw new Error(`${path}.mode must be "normal" or "always"`);
	}
}
/**
* Normalization for values thrown by a final LLM adapter boundary.
*
* @module @deepseek-ai/dsh-llm/adapter-failure
*/
/**
* Detach serializable provider facts from a value thrown by an adapter.
* @param value - arbitrary value thrown during adapter dispatch or iteration.
* @returns immutable provider-neutral facts suitable for a terminal finish chunk.
* @internal
*/
function normalizeLlmFailure(value) {
	const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
	const carried = ownFailureSnapshot(error);
	if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
	return Object.freeze({
		message: errorMessage$1(error),
		code: harnessErrorCode(error)
	});
}
/** Render a non-Error throw without letting hostile coercion escape normalization. */
function thrownMessage(value) {
	try {
		const message = String(value);
		return message.length > 0 ? message : "LLM adapter failed";
	} catch (_hostileThrownValue) {
		return "LLM adapter failed";
	}
}
/** Read a foreign error's own data-backed `code` without invoking accessors. */
function ownErrorCode(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "code");
		return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Snapshot an own data property without invoking an SDK-defined accessor. */
function ownFailureSnapshot(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
		return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Validate and detach an arbitrary serializable failure payload. */
function failureSnapshot(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		const candidate = value;
		const message = candidate.message;
		const code = candidate.code;
		const status = candidate.status;
		const providerRetryAfterMs = candidate.providerRetryAfterMs;
		const requestId = candidate.requestId;
		if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0)) return void 0;
		return Object.freeze({
			message,
			code,
			...status === void 0 ? {} : { status },
			...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
			...requestId === void 0 ? {} : { requestId }
		});
	} catch (_sdkFailureGetter) {
		return;
	}
}
/** Read an SDK error message without letting an accessor replace the primary failure. */
function errorMessage$1(error) {
	try {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) return message;
	} catch (_sdkMessageGetter) {}
	return "LLM adapter failed";
}
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error) {
	return error instanceof HarnessError ? error.code : "UNKNOWN";
}
/**
* Exhaustiveness helper for closed core unions. Use {@link assertNever} at the default branch so a
* new variant fails compilation at every required handler. Do not use it for declaration-merged
* unions such as session events or content blocks: handle known variants and explicitly fall
* through because plugins may add valid unknown cases.
* @module @deepseek-ai/dsh-llm/never
*/
/**
* Mark an unreachable closed-union branch. A newly unhandled typed variant fails at the call site;
* a value that escaped its type throws with diagnostics at runtime.
* @param value - the impossible value; typed `never` so an unhandled variant fails compilation at the call site.
* @param context - optional label (e.g. the switch site) prefixed into the throw message.
* @returns never — it always throws, with the offending value JSON-rendered in the message.
*/
function assertNever(value, context) {
	const rendered = JSON.stringify(value) ?? String(value);
	throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
/**
* Stable text shown to a model that cannot accept one durable image reference.
* @param ref - durable normalized attachment omitted from the request.
* @returns deterministic text-only placeholder.
*/
function textOnlyImageText(ref) {
	return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
/**
* True when typed model content contains an image block, walking nested
* tool-result content. This is the one recursive image walk shared by every
* image policy (capability gating, text-only serialization, compaction
* survey), so a consumer cannot silently diverge on nesting depth.
* @param content - typed model content blocks.
* @returns whether any nested block is an image.
*/
function contentHasImage(content) {
	return content.some((block) => block.type === "image" || block.type === "tool-result" && contentHasImage(block.content));
}
/** Replace every image occurrence, including nested tool results, for a text-only model. */
function replaceImagesForTextModel(blocks) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "image") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: textOnlyImageText(block.attachment)
			});
			continue;
		}
		if (block.type === "tool-result") {
			const content = replaceImagesForTextModel(block.content);
			if (content !== block.content) {
				next ??= blocks.slice(0, index);
				next.push({
					...block,
					content
				});
				continue;
			}
		}
		next?.push(block);
	}
	return next ?? blocks;
}
/**
* Project durable image history into deterministic text for an exact text-only model.
* @param messages - complete request history.
* @returns the original list without images, otherwise shallow message copies with stable placeholders.
*/
function projectImagesForTextModel(messages) {
	if (!messages.some((message) => contentHasImage(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceImagesForTextModel(message.content);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `.agents/notes/implemented/architecture/2026-06-21-mandatory-app-attribution-headers.md`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = createRequire(import.meta.url)("../package.json");
/**
* LLM service: adapter registry with a waterfall-interceptable streaming call
* API. Exports the `LlmRuntime` default, the abstract `LlmAdapter` for
* provider backends, and `BlockAssembler` for chunk assembly.
*
* @module @deepseek-ai/dsh-llm
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Typed error for LLM-related failures. Extends {@link HarnessError}, so the
* `code` string (e.g. `AUTH`, `RATE_LIMIT`, `NO_ADAPTER`) is shared taxonomy.
*/
var LlmError = class extends HarnessError {
	/** Serializable facts retained beside this live Error. */
	failure;
	/**
	* @param message - non-empty human-readable failure summary.
	* @param code - non-empty stable provider-neutral machine code.
	* @param options - optional cause and validated serializable provider facts.
	*/
	constructor(message, code, options) {
		if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
		if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
		if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
		if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
		if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
		super(message, code, options);
		this.name = "LlmError";
		this.failure = Object.freeze({
			message,
			code,
			...options?.status === void 0 ? {} : { status: options.status },
			...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
			...options?.requestId === void 0 ? {} : { requestId: options.requestId }
		});
	}
};
(() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listProviders_decorators;
	let _listConfigurableProviders_decorators;
	let _remoteDiscoverModels_decorators;
	return class LlmRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listProviders_decorators = [Remote];
			_listConfigurableProviders_decorators = [Remote];
			_remoteDiscoverModels_decorators = [Remote("discoverModels")];
			__esDecorate(this, null, _listProviders_decorators, {
				kind: "method",
				name: "listProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listProviders" in obj,
					get: (obj) => obj.listProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listConfigurableProviders_decorators, {
				kind: "method",
				name: "listConfigurableProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConfigurableProviders" in obj,
					get: (obj) => obj.listConfigurableProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteDiscoverModels_decorators, {
				kind: "method",
				name: "remoteDiscoverModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteDiscoverModels" in obj,
					get: (obj) => obj.remoteDiscoverModels
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		adapters = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		directory = /* @__PURE__ */ new Map();
		discoveries = /* @__PURE__ */ new Map();
		constructor(ctx) {
			super(ctx, "llm");
		}
		/** Notify topology observers without letting one broken listener veto the commit. */
		emitAdaptersUpdated() {
			let invariantFailure;
			for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
				const returned = listener();
				if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
					this.warnAdaptersListenerFailure(error);
				});
			} catch (error) {
				if (error?.code === "INVARIANT") {
					invariantFailure ??= error;
					continue;
				}
				this.warnAdaptersListenerFailure(error);
			}
			if (invariantFailure !== void 0) throw invariantFailure;
		}
		/** Contained-listener diagnostic shared by the sync and async failure paths. */
		warnAdaptersListenerFailure(error) {
			this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
			this.ctx.logger.warn(error);
		}
		/**
		* Register an adapter for the given provider routes. Throws `LlmError` with code
		* `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
		* Disposed with the fiber.
		* @param providers - every provider route this adapter should serve.
		* @param adapter - the adapter that streams calls for those providers.
		* @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
		*/
		registerAdapter(providers, adapter) {
			const owned = /* @__PURE__ */ new Set();
			let released = false;
			const dispose = this.ctx.effect(function* () {
				if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
				this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
				yield () => {
					released = true;
					for (const provider of owned) this.adapters.delete(provider);
					owned.clear();
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerAdapter()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
				this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
			};
			return handle;
		}
		/**
		* Validate one candidate route set for `adapter`, treating routes this
		* registration already holds as available. Nothing is mutated: a rejected
		* candidate leaves the registry exactly as it was.
		*/
		prepareRoutes(providers, adapter, owned) {
			const unique = /* @__PURE__ */ new Set();
			const registrations = [];
			for (const provider of providers) {
				if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
				if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
				const info = adapter.providerInfo(provider);
				if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
				unique.add(provider);
				const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
				registrations.push({
					adapter,
					provider: {
						id: info.id,
						name: info.name
					},
					retryPolicy
				});
			}
			return registrations;
		}
		/**
		* Swap this registration's routes for the prepared ones in one synchronous
		* section, so no observer can see the registry between the release and the
		* re-registration. The route set's one mutation point is also where
		* `llm/adapters-updated` is published, so a `replace` announces itself
		* exactly like a first registration.
		*/
		commitRoutes(owned, registrations) {
			for (const provider of owned) this.adapters.delete(provider);
			owned.clear();
			for (const registration of registrations) {
				this.adapters.set(registration.provider.id, registration);
				owned.add(registration.provider.id);
			}
			this.emitAdaptersUpdated();
		}
		/**
		* Describe provider routes with a registered adapter.
		* @returns detached provider metadata in registration order.
		*/
		listProviders() {
			return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
		}
		/**
		* Declare provider routes an adapter plugin can activate through
		* configuration. Registration is all-or-nothing: an empty list, invalid
		* entry, or a provider already declared by any registration throws
		* `LlmError` without registering the rest. Disposed with the fiber.
		* @param entries - every configurable provider this plugin owns.
		* @returns a handle that withdraws all of them, and can atomically replace them.
		*/
		registerConfigurableProviders(entries) {
			let held = [];
			let disposed = false;
			/**
			* Validate a candidate set in full against everything this registration
			* does not already hold, then publish it. Nothing is written until the
			* whole set passes, so a refused candidate leaves the current entries in
			* place — the property that makes `replace` a swap rather than a
			* delete-then-add that can strand the directory empty.
			*/
			const commit = (candidates) => {
				const detached = [];
				const own = new Set(held.map((entry) => entry.provider));
				for (const entry of candidates) {
					if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
					if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
					if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
					detached.push({
						...entry,
						settingsPath: [...entry.settingsPath]
					});
				}
				for (const entry of held) this.directory.delete(entry.provider);
				for (const entry of detached) this.directory.set(entry.provider, entry);
				held = detached;
				this.emitAdaptersUpdated();
			};
			const dispose = this.ctx.effect(function* () {
				if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
				commit(entries);
				yield () => {
					disposed = true;
					for (const entry of held) this.directory.delete(entry.provider);
					held = [];
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerConfigurableProviders()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
				commit(next);
			};
			return handle;
		}
		/**
		* List every declared configurable provider, registered or dormant.
		* @returns detached directory entries in declaration order.
		*/
		listConfigurableProviders() {
			return [...this.directory.values()].map((entry) => ({
				...entry,
				settingsPath: [...entry.settingsPath]
			}));
		}
		/**
		* Offer to interrogate provider endpoints on behalf of the settings
		* namespace this plugin owns. The namespace is the key because that is what
		* a configuration surface already holds from the configurable-provider
		* directory, and because a provider being *added* has no route to name yet.
		* Disposed with the fiber.
		* @param settingsNs - the namespace whose profiles this discovery serves.
		* @param discover - interrogates one endpoint and must honor the supplied signal.
		* @returns the disposer that withdraws the offer.
		*/
		registerModelDiscovery(settingsNs, discover) {
			const dispose = this.ctx.effect(function* () {
				if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
				if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
				this.discoveries.set(settingsNs, discover);
				yield () => {
					this.discoveries.delete(settingsNs);
				};
			}.bind(this), "llm.registerModelDiscovery()");
			return () => void dispose();
		}
		/**
		* Interrogate one provider endpoint for the models it advertises. The
		* request describes a draft, not a stored route, so nothing here reads or
		* writes settings or credentials — the caller owns both, and the reply is
		* candidate metadata a surface may offer for adoption.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - the endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation.
		* @returns the advertised models, deduplicated in endpoint order.
		*/
		async discoverModels(settingsNs, request, signal) {
			const discover = this.discoveries.get(settingsNs);
			if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
			if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
			const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
			const seen = /* @__PURE__ */ new Set();
			const models = [];
			for (const model of discovered) {
				if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
				seen.add(model.id);
				models.push({
					id: model.id,
					...model.name === void 0 ? {} : { name: model.name },
					...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
					...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens }
				});
			}
			return models;
		}
		/**
		* Remote adapter for one draft provider interrogation.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation supplied by the Remote carrier.
		* @returns advertised models in endpoint order.
		* @throws TypertRemoteFailure with `model-discovery-failed` when discovery refuses or fails.
		*/
		async remoteDiscoverModels(settingsNs, request, signal) {
			try {
				return await this.discoverModels(settingsNs, request, signal);
			} catch (error) {
				throw new TypertRemoteFailure({
					code: "model-discovery-failed",
					message: error instanceof Error ? error.message : String(error),
					details: {
						settingsNs,
						...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
					}
				});
			}
		}
		/**
		* Resolve the retry policy captured when one provider route was registered.
		* @param provider - registered provider route to inspect.
		* @returns the provider-owned policy, with normal defaults already resolved.
		*/
		providerRetryPolicy(provider) {
			return this.registration(provider).retryPolicy;
		}
		/**
		* Resolve provider-side request-image pricing for one exact route, or
		* `undefined` when the provider is unregistered or declares none. Unknown
		* providers degrade to `undefined` rather than throwing because callers
		* price durable history whose route may no longer be mounted.
		* @param provider - provider route named by a request header.
		* @param model - exact model id named by the same header.
		* @returns the owning adapter's image pricing for the route, when declared.
		*/
		imageRequestPricing(provider, model) {
			return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
		}
		/** Detach typed adapter-owned modality metadata. */
		detachedModalities(modalities) {
			return modalities === void 0 ? void 0 : [...modalities];
		}
		/**
		* Discover models advertised by one registered provider. Catalog membership
		* is advisory and never changes routing or request validation.
		* @param provider - registered provider route to inspect.
		* @returns detached model metadata in adapter-preferred order.
		*/
		async listModels(provider) {
			const models = await this.registration(provider).adapter.listModels(provider);
			const seen = /* @__PURE__ */ new Set();
			return models.map((model) => {
				if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
				seen.add(model.id);
				const inputModalities = this.detachedModalities(model.inputModalities);
				return {
					provider: model.provider,
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...inputModalities === void 0 ? {} : { inputModalities }
				};
			});
		}
		/**
		* Resolve and validate all metadata from the adapter that owns one exact
		* route. The result is detached from adapter-owned objects; catalog
		* membership remains advisory and does not control request routing.
		* @param provider - registered provider route to inspect.
		* @param model - exact model id passed to the adapter.
		* @param signal - optional cancellation for adapter-owned asynchronous lookup.
		* @returns exact model identity plus available context and reasoning metadata.
		*/
		async resolveModelInfo(provider, model, signal) {
			return this.resolveModelInfoFor(this.registration(provider), model, signal);
		}
		async resolveModelInfoFor(registration, model, signal) {
			const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
			return this.normalizeModelInfo(registration, model, resolved);
		}
		/** Validate and detach one adapter-returned exact model result. */
		normalizeModelInfo(registration, model, resolved) {
			const provider = registration.provider.id;
			if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const context = resolved.context;
			if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
			const inputModalities = this.detachedModalities(resolved.inputModalities);
			const defaultMaxTokens = resolved.defaultMaxTokens;
			if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
			const info = {
				provider,
				id: model,
				name: resolved.name,
				...resolved.description === void 0 ? {} : { description: resolved.description },
				...inputModalities === void 0 ? {} : { inputModalities },
				...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
				...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens }
			};
			const reasoning = resolved.reasoning;
			if (reasoning === void 0) return info;
			if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			const seen = /* @__PURE__ */ new Set();
			const efforts = reasoning.efforts.map((effort) => {
				if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
				seen.add(effort.id);
				return {
					id: effort.id,
					name: effort.name,
					...effort.description === void 0 ? {} : { description: effort.description }
				};
			});
			if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			return {
				...info,
				reasoning: {
					efforts,
					...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
				}
			};
		}
		/**
		* Validate a conversation call config against its exact model capability and
		* materialize adapter-configured defaults. Unsupported explicit efforts
		* reject before provider I/O; no clamping or aliasing is performed. This
		* standalone query does not bind a later dispatch; use {@link prepareCall}
		* when logging and streaming must share one adapter registration.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a detached config only when a default must be materialized.
		*/
		async resolveCallConfig(config, signal) {
			return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
		}
		async resolveCallFor(registration, config, signal) {
			const info = await this.resolveModelInfoFor(registration, config.model, signal);
			return this.resolveCallWithInfo(config, info);
		}
		/** Validate request controls against one already-bound exact model result. */
		resolveCallWithInfo(config, info) {
			const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
				...config,
				maxTokens: info.defaultMaxTokens
			} : config;
			const reasoning = info.reasoning;
			const requested = defaulted.reasoningEffort;
			let resolvedConfig = defaulted;
			if (reasoning === void 0) {
				if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
			} else {
				const effective = requested ?? reasoning.defaultEffort;
				if (effective !== void 0) {
					if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
					if (requested !== effective) resolvedConfig = {
						...defaulted,
						reasoningEffort: effective
					};
				}
			}
			return {
				config: resolvedConfig,
				...info.context === void 0 ? {} : { context: info.context },
				modelInfo: info
			};
		}
		/**
		* Resolve one call under its current adapter registration. The returned
		* one-shot handle keeps that registration across header logging and dispatch,
		* so HMR cannot combine one adapter's capability result with another adapter.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a prepared config and its registration-bound stream entry point.
		*/
		async prepareCall(config, signal) {
			const registration = this.registration(config.provider);
			const adapterCall = await this.prepareAdapterCall(registration.adapter, config.provider, config.model, signal);
			const modelInfo = this.normalizeModelInfo(registration, config.model, adapterCall.model);
			const resolved = this.resolveCallWithInfo(config, modelInfo);
			const resolvedConfig = deepFreeze(structuredClone(resolved.config));
			const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
			const adapterDefaults = deepFreeze({
				...config.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
				...config.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
			});
			let dispatched = false;
			return Object.freeze({
				config: resolvedConfig,
				retryPolicy: registration.retryPolicy,
				adapterDefaults,
				...context === void 0 ? {} : { context },
				...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
				stream: (options) => {
					if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
					if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
					dispatched = true;
					return this.streamWithRegistration(options, {
						registration,
						config: resolvedConfig,
						modelInfo,
						dispatch: (options) => adapterCall.stream(options)
					});
				}
			});
		}
		/**
		* dsh-desktop fix: adapter prepareCall guard — a custom-provider adapter built
		* against a pre-rc.2 kernel (the base LlmAdapter had no prepareCall) can be
		* missing prepareCall entirely. Fall back to the base semantics so the call
		* still works, and warn the user that the kernel needs an upgrade/reinstall.
		*/
		async prepareAdapterCall(adapter, provider, model, signal) {
			if (typeof adapter.prepareCall === "function") return adapter.prepareCall(provider, model, signal);
			console.warn("[dsh] LLM adapter for provider " + provider + " is missing prepareCall (built against an older kernel); falling back to base LlmAdapter.prepareCall semantics. Upgrade or reinstall the kernel to clear this warning.");
			return {
				model: await adapter.resolveModel(provider, model, signal),
				stream: (options) => adapter.stream(options)
			};
		}
		registration(provider) {
			const registration = this.adapters.get(provider);
			if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
			return registration;
		}
		/** Remove replay state whose historical route is owned by another adapter. */
		forAdapter(options, adapter) {
			const messages = options.messages.map((message) => {
				const source = message.source;
				if (message.role !== "assistant" || source.kind !== "model" || source.replayState === void 0) return message;
				if (this.adapters.get(source.provider)?.adapter === adapter) return message;
				return freezeMessage({
					...message,
					source: {
						kind: "model",
						provider: source.provider,
						model: source.model
					}
				});
			});
			if (messages.every((message, index) => message === options.messages[index])) return options;
			const filtered = {
				...options,
				messages
			};
			return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
		}
		/**
		* Final adapter boundary. Adapter selection, dispatch, iterator construction,
		* and iteration failures become one terminal failure chunk. Middleware and
		* downstream consumer failures remain thrown plugin or consumer errors.
		*/
		async *adapterStream(options, prepared) {
			let iterator;
			try {
				const registration = prepared?.registration ?? this.registration(options.provider);
				const adapter = registration.adapter;
				let modelInfo;
				let resolvedConfig;
				let dispatch;
				if (prepared === void 0) {
					const adapterCall = await this.prepareAdapterCall(adapter, options.provider, options.model, options.signal);
					modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
					resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
					dispatch = (options) => adapterCall.stream(options);
				} else {
					modelInfo = prepared.modelInfo;
					resolvedConfig = prepared.config;
					dispatch = prepared.dispatch;
				}
				if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
				const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
					...options,
					...resolvedConfig
				}) : {
					...options,
					...resolvedConfig
				};
				const projectedOptions = modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && resolvedOptions.messages.some((message) => contentHasImage(message.content)) ? Object.isFrozen(resolvedOptions) ? deepFreeze({
					...resolvedOptions,
					messages: projectImagesForTextModel(resolvedOptions.messages)
				}) : {
					...resolvedOptions,
					messages: projectImagesForTextModel(resolvedOptions.messages)
				} : resolvedOptions;
				iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
			} catch (error) {
				yield adapterFailureChunk(error, options.signal);
				return;
			}
			let completed = false;
			try {
				while (true) {
					let item;
					try {
						const next = await iterator.next();
						item = next.done ? { done: true } : {
							done: false,
							value: next.value
						};
					} catch (error) {
						completed = true;
						yield adapterFailureChunk(error, options.signal);
						return;
					}
					if (item.done) {
						completed = true;
						return;
					}
					yield item.value;
				}
			} finally {
				if (!completed) {
					const close = iterator.return?.bind(iterator);
					if (close) await close();
				}
			}
		}
		/**
		* Stream one model call as raw chunks (token-level deltas). Replay state is
		* retained only when the same adapter instance owns its historical provider
		* and the target provider. Final adapter selection remains fixed through
		* asynchronous exact-model resolution and dispatch. Adapter selection,
		* dispatch, and iteration failures become terminal `error` or `aborted`
		* finish chunks; middleware, nested-call, cleanup, and consumer failures
		* remain thrown.
		* @param options - the full request; `options.provider` selects the adapter.
		* @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
		*/
		stream(options) {
			return this.streamWithRegistration(options);
		}
		streamWithRegistration(options, prepared) {
			return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
		}
	};
})();
/** Convert one adapter throw into the stream protocol's terminal outcome. */
function adapterFailureChunk(error, signal) {
	const failure = normalizeLlmFailure(error);
	return {
		type: "finish",
		reason: signal?.aborted || failure.code === "ABORTED" ? {
			kind: "aborted",
			failure
		} : {
			kind: "error",
			failure
		}
	};
}
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-session/lib/index.js
/** Lossless-JSON validation and detached snapshots for durable session data. @module @deepseek-ai/dsh-session/json */
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor$1(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype$1(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor$1(value, "Object");
}
/** Whether an array uses one realm's intrinsic `Array.prototype`, not a subclass or forged prototype. */
function hasPlainArrayPrototype$1(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor$1(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype$1(objectPrototype);
}
/** Whether an object is a plain or null-prototype record from any JavaScript realm. */
function hasPlainObjectPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype$1(prototype);
}
/** Return every JSON-visible object key, or reject own data JSON would discard. */
function enumerableStringKeys(value) {
	const keys = Reflect.ownKeys(value);
	if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
	return keys;
}
/** Validate lossless JSON iteratively, optionally materializing a detached snapshot. */
function walkJsonValue(value, detach) {
	const ancestors = /* @__PURE__ */ new Set();
	let root;
	const assign = (destination, item) => {
		if (destination === void 0) return;
		if (destination.kind === "root") root = item;
		else if (destination.kind === "array") destination.target[destination.index] = item;
		else Object.defineProperty(destination.target, destination.key, {
			value: item,
			enumerable: true,
			configurable: true,
			writable: true
		});
	};
	const tasks = [{
		kind: "visit",
		value,
		...detach ? { destination: { kind: "root" } } : {}
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			ancestors.delete(task.source);
			continue;
		}
		if (task.kind === "array-item") {
			if (!Object.prototype.hasOwnProperty.call(task.source, task.index)) return void 0;
			tasks.push({
				kind: "visit",
				value: task.source[task.index],
				...task.target === void 0 ? {} : { destination: {
					kind: "array",
					target: task.target,
					index: task.index
				} }
			});
			continue;
		}
		if (task.kind === "object-property") {
			tasks.push({
				kind: "visit",
				value: task.source[task.key],
				...task.target === void 0 ? {} : { destination: {
					kind: "object",
					target: task.target,
					key: task.key
				} }
			});
			continue;
		}
		const current = task.value;
		if (current === null) {
			assign(task.destination, null);
			continue;
		}
		if (typeof current === "boolean" || typeof current === "string") {
			assign(task.destination, current);
			continue;
		}
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
			assign(task.destination, current);
			continue;
		}
		if (typeof current !== "object") return void 0;
		if (ancestors.has(current)) return void 0;
		if (Array.isArray(current)) {
			if (!hasPlainArrayPrototype$1(current)) return void 0;
			const length = current.length;
			if (Reflect.ownKeys(current).length !== length + 1) return void 0;
			const target = detach ? [] : void 0;
			if (target !== void 0) assign(task.destination, target);
			ancestors.add(current);
			tasks.push({
				kind: "leave",
				source: current
			});
			for (let index = length - 1; index >= 0; index--) tasks.push({
				kind: "array-item",
				source: current,
				index,
				...target === void 0 ? {} : { target }
			});
			continue;
		}
		if (!hasPlainObjectPrototype(current)) return void 0;
		const keys = enumerableStringKeys(current);
		if (keys === void 0) return void 0;
		const target = detach ? {} : void 0;
		if (target !== void 0) assign(task.destination, target);
		ancestors.add(current);
		tasks.push({
			kind: "leave",
			source: current
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) return void 0;
			tasks.push({
				kind: "object-property",
				source: current,
				key,
				...target === void 0 ? {} : { target }
			});
		}
	}
	return detach ? root : true;
}
/**
* Validate and detach lossless JSON in one read per property, so a stateful
* getter cannot change between validation and copying. Traversal is iterative,
* so valid nesting is bounded by available memory rather than the JavaScript
* call stack. Accepts ordinary arrays, plain or null-prototype objects, and JSON
* scalars; rejects sparse, cyclic, exotic, negative-zero, and non-finite values.
* Getter throws propagate.
*
* @param value - the candidate value to validate and detach.
* @returns the detached snapshot, or `undefined` when the value is not
*   losslessly JSON-serializable.
*/
function snapshotJsonValue(value) {
	return walkJsonValue(value, true);
}
/**
* Test the same lossless JSON boundary as {@link snapshotJsonValue} without
* detaching it. Only own enumerable string properties participate; `toJSON`
* is ignored and getters run, so persistence boundaries use the snapshotter.
* @param value - the candidate event data to test.
* @returns whether `value` survives JSON round-trip losslessly.
*/
function isJsonValue(value) {
	return walkJsonValue(value, false) === true;
}
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-system-prompt/lib/index.js
/**
* Registry for ordered system sections, dynamic context, tool schemas, and prompt variables.
*
* @module @deepseek-ai/dsh-system-prompt
*/
/**
* Sparse integer placements for repository-owned prompt sections.
*
* Adjacent values differ by at least ten to keep the first-party groups sparse
* and make accidental collisions mechanically detectable.
* External plugins may use any finite order; equal orders are deterministic by
* section name.
*/
const FIRST_PARTY_SECTION_ORDER = {
	HARNESS_IDENTITY: -1e3,
	HARNESS_SOURCE: -900,
	WEB_SURFACE: -800,
	DEPLOYMENT_PERSONA: 0,
	PLAN_POLICY: 500,
	TEAM_POLICY: 600,
	PTC_ONLY: 800,
	FILE_REFERENCE: 900,
	TOOL_BASH: 1e3,
	TOOL_PWSH: 1010,
	TOOL_READ: 1100,
	TOOL_WRITE: 1200,
	TOOL_EDIT: 1300,
	TOOL_GLOB: 1400,
	TOOL_GREP: 1500,
	TOOL_JOBS: 1600,
	TOOL_PTY: 1700,
	TOOL_WEB_SEARCH: 2e3,
	TOOL_WEB_FETCH: 2100,
	TOOL_LSP: 2200,
	TOOL_SESSION_QUERY: 2300,
	TOOL_GOAL: 2400,
	TOOL_CORDIS: 2500,
	TOOL_WORKFLOW: 2600,
	TOOL_RALPH: 2700,
	TOOL_SUBAGENT: 2800,
	TOOL_REPORT: 2900,
	TOOLS_SDK: 5e3,
	DELIVERABLE_FILE_REFERENCES: 9e3,
	STRUCTURED_OUTPUT: 9900
};
/**
* The deployment persona's section name and order. Exported because a
* composition can replace this slot — an agent preset shadows the
* deployment's persona with its own — and both sides naming the same section
* is what makes the replacement work rather than duplicate.
*/
const PERSONA_SECTION = "deployment:persona";
/** Prompt order of the persona slot. */
const PERSONA_ORDER = FIRST_PARTY_SECTION_ORDER.DEPLOYMENT_PERSONA;
/** Valid variable names: how they are written between the braces. */
const VARIABLE_NAME = /^[a-z][a-z0-9_]*$/;
/** Reserved {@link Config.toolOrder} marker for unlisted tools. */
const TOOL_ORDER_REST = "<unlisted-tools>";
/**
* Validate duplicate names and the required {@link TOOL_ORDER_REST} marker.
* Registered names are checked later because plugins have not loaded yet.
*/
function validateToolOrder(toolOrder) {
	if (toolOrder === void 0) return void 0;
	const seen = /* @__PURE__ */ new Set();
	for (const name of toolOrder) {
		if (seen.has(name)) throw new Error(`toolOrder lists "${name}" more than once`);
		seen.add(name);
	}
	if (!seen.has("<unlisted-tools>")) throw new Error(`toolOrder must contain the "${TOOL_ORDER_REST}" rest entry (where unlisted tools are inserted)`);
	return toolOrder;
}
/**
* Apply configured tool order, inserting unlisted tools lexicographically at
* {@link TOOL_ORDER_REST}. Unknown configured names fail; known but restricted
* names may be absent.
*/
function orderTools(tools, toolOrder, knownNames) {
	if (tools.find((tool) => tool.name === "<unlisted-tools>") !== void 0) throw new Error(`tool provider returned reserved tool name "${TOOL_ORDER_REST}" (reserved for toolOrder's rest entry)`);
	if (toolOrder === void 0) return tools.sort(compareToolNames);
	const unknown = toolOrder.filter((name) => name !== "<unlisted-tools>" && !knownNames.has(name));
	if (unknown.length > 0) throw new Error(`toolOrder lists unregistered tool${unknown.length > 1 ? "s" : ""} ${unknown.map((name) => `"${name}"`).join(", ")}; known tools: ${[...knownNames].sort().join(", ") || "(none)"}`);
	const listed = new Set(toolOrder);
	const rest = tools.filter((tool) => !listed.has(tool.name)).sort(compareToolNames);
	return toolOrder.flatMap((name) => name === "<unlisted-tools>" ? rest : tools.filter((tool) => tool.name === name));
}
/** Code-unit name comparison — locale-independent, so the order is identical on every machine. */
function compareNames(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}
/** Order prompt sections by their explicit placement, then deterministically by name. */
function comparePromptSections(a, b) {
	return a.order - b.order || compareNames(a.name, b.name);
}
/** Order tool schemas lexicographically by name. */
function compareToolNames(a, b) {
	return compareNames(a.name, b.name);
}
/** All prompt registrations owned by one global or scoped layer. */
var PromptLayer = class {
	sections;
	contexts;
	runtimeContextSuppressors = new AnonymousEntries();
	toolProviders = new AnonymousEntries();
	variables;
	/**
	* Create one prompt layer with diagnostics specific to its ownership scope.
	* @param scope - the scoped owner, or `undefined` for global registrations.
	*/
	constructor(scope) {
		this.sections = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `prompt section "${name}" is already registered (for a per-agent override, register through that agent's \`agent.ctx\` instead)` : `prompt section "${name}" is already registered in this scope`));
		this.contexts = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `prompt context "${name}" is already registered (for a per-agent override, register through that agent's \`agent.ctx\` instead)` : `prompt context "${name}" is already registered in this scope`));
		this.variables = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `prompt variable "${name}" is already registered (for a per-agent value, register through that agent's \`agent.ctx\` instead)` : `prompt variable "${name}" is already registered in this scope`));
	}
	/** @returns whether this layer owns no prompt registrations. */
	isEmpty() {
		return this.sections.isEmpty() && this.contexts.isEmpty() && this.runtimeContextSuppressors.isEmpty() && this.toolProviders.isEmpty() && this.variables.isEmpty();
	}
};
/** Registry service for the prompt inputs assembled before each model step. */
var SystemPrompt = class extends Service {
	static Config = Schema.object({
		includeHarnessIdentity: Schema.boolean().default(true),
		includeRuntimeContext: Schema.boolean().default(true),
		persona: Schema.string().default(""),
		toolOrder: Schema.array(Schema.string()).default(void 0)
	});
	layers = new ScopedLayers((scope) => new PromptLayer(scope), () => {
		this.ctx.emit("system-prompt/change");
	});
	toolOrder;
	constructor(ctx, config) {
		super(ctx, "systemPrompt");
		this.toolOrder = validateToolOrder(config.toolOrder);
		if (config.includeHarnessIdentity ?? true) this.section({
			name: "harness:identity",
			order: FIRST_PARTY_SECTION_ORDER.HARNESS_IDENTITY,
			text: "You are an AI agent powered by DeepSeek Harness."
		});
		this.section({
			name: PERSONA_SECTION,
			order: PERSONA_ORDER,
			text: config.persona ?? ""
		});
		if (!(config.includeRuntimeContext ?? true)) this.suppressRuntimeContext();
	}
	/**
	* Register an ordered prompt section in the calling context's scope. A scoped
	* section shadows a global section with the same name; duplicates within one
	* layer and non-finite orders throw. Registration and disposal emit
	* `system-prompt/change`.
	* @param section - the section to register.
	* @returns the exact Cordis effect disposer.
	*/
	section(section) {
		if (!Number.isFinite(section.order)) throw new TypeError(`prompt section "${section.name}" order must be a finite number`);
		return this.layers.effect(this.ctx, (layer) => layer.sections.insert(section.name, section), { label: "systemPrompt.section()" });
	}
	/**
	* Register ordered dynamic context in the calling context's scope. Scoped
	* entries shadow global entries with the same name.
	* @param context - the context contribution to register.
	* @returns the exact Cordis effect disposer.
	*/
	context(context) {
		if (!Number.isFinite(context.order)) throw new TypeError(`prompt context "${context.name}" order must be a finite number`);
		return this.layers.effect(this.ctx, (layer) => layer.contexts.insert(context.name, context), { label: "systemPrompt.context()" });
	}
	/**
	* Suppress every dynamic runtime-context contribution in the calling
	* context's scope without changing the services that own or enforce those
	* facts. Multiple suppressors remain independently disposable.
	* @returns the exact Cordis effect disposer.
	*/
	suppressRuntimeContext() {
		return this.layers.effect(this.ctx, (layer) => layer.runtimeContextSuppressors.append(true), { label: "systemPrompt.suppressRuntimeContext()" });
	}
	/**
	* Register a tool-schema provider in the calling context's scope. Global and
	* matching scoped providers both contribute; returning the reserved
	* {@link TOOL_ORDER_REST} name makes assembly fail.
	* @param provider - evaluated for each assembly with its context.
	* @returns the exact Cordis effect disposer.
	*/
	tools(provider) {
		return this.layers.effect(this.ctx, (layer) => layer.toolProviders.append(provider), { label: "systemPrompt.tools()" });
	}
	/**
	* Register a prompt variable in the calling context's scope. Scoped values
	* shadow globals; invalid or duplicate names throw. A provider may return
	* `undefined`, but rendering a section that references that value then fails.
	* @param name - the `[a-z][a-z0-9_]*` reference name.
	* @param provider - evaluated for each assembly.
	* @returns the exact Cordis effect disposer.
	*/
	variable(name, provider) {
		if (!VARIABLE_NAME.test(name)) throw new Error(`invalid prompt variable name "${name}" (must match ${String(VARIABLE_NAME)})`);
		return this.layers.effect(this.ctx, (layer) => layer.variables.insert(name, provider), { label: "systemPrompt.variable()" });
	}
	/**
	* Assemble global and scoped providers, detach tool parameters, apply
	* canonical ordering, then run the assembly waterfall. Scoped sections and
	* variables shadow globals. The returned waterfall value is authoritative
	* except that an effective complete section is restored afterwards as the
	* sole prompt section.
	* @param context - the optional scope and plugin-defined assembly fields.
	* @returns the post-waterfall assembly with any complete prompt enforced.
	*/
	async assemble(context = {}) {
		const scope = context.scope;
		const scopeLayers = this.layers.chainLayers(scope);
		const runtimeContextSuppressed = !this.layers.global.runtimeContextSuppressors.isEmpty() || scopeLayers.some((layer) => !layer.runtimeContextSuppressors.isEmpty());
		const variables = {};
		for (const [name, provider] of this.layers.global.variables.entries()) variables[name] = provider(context);
		for (const layer of scopeLayers) for (const [name, provider] of layer.variables.entries()) variables[name] = provider(context);
		const sectionByName = this.layers.merge(scope, (layer) => layer.sections);
		const contextByName = this.layers.merge(scope, (layer) => layer.contexts);
		const providers = [...this.layers.global.toolProviders.values(), ...scopeLayers.flatMap((layer) => [...layer.toolProviders.values()])];
		const collected = [];
		const knownNames = /* @__PURE__ */ new Set();
		for (const provider of providers) {
			const result = provider(context);
			const schemas = result.schemas.map(({ name, description, parameters }) => ({
				name,
				description,
				parameters: structuredClone(parameters)
			}));
			const acceptedKnownNames = result.knownNames ?? schemas.map((tool) => tool.name);
			collected.push(...schemas);
			for (const name of acceptedKnownNames) knownNames.add(name);
		}
		const sectionDefinitions = [...sectionByName.values()].sort(comparePromptSections);
		const completeSections = sectionDefinitions.filter((section) => section.complete === true);
		if (completeSections.length > 1) throw new Error(`multiple complete prompt sections are active: ${completeSections.map((section) => JSON.stringify(section.name)).join(", ")}`);
		let completeSection;
		const assembly = {
			sections: sectionDefinitions.map((section) => {
				const assembled = {
					name: section.name,
					text: typeof section.text === "function" ? section.text(context) : section.text
				};
				if (section.complete === true) completeSection = { ...assembled };
				return assembled;
			}),
			contexts: runtimeContextSuppressed ? [] : [...contextByName.values()].sort((a, b) => a.order - b.order).map((entry) => ({
				name: entry.name,
				text: typeof entry.text === "function" ? entry.text(context) : entry.text
			})),
			tools: orderTools(collected, this.toolOrder, knownNames),
			variables
		};
		const transformed = await this.ctx.waterfall(scopeTarget(this, scope), "system-prompt/assemble", assembly, context, () => Promise.resolve(assembly));
		if (completeSection === void 0 && !runtimeContextSuppressed) return transformed;
		return {
			...transformed,
			sections: completeSection === void 0 ? transformed.sections : [completeSection],
			contexts: runtimeContextSuppressed ? [] : transformed.contexts
		};
	}
};
//#endregion
//#region ../../../dsh-desktop/node_modules/@deepseek-ai/dsh-tools/lib/index.js
/**
* Enforced JSON Schema subset shared by tool outputs, generated PTC mode
* types, subagents, and workflows. The subset accepts any JSON root, an
* annotation-only schema for unconstrained JSON, one scalar `type`, object
* `properties`/`required`/boolean `additionalProperties`, array `items`,
* type-correct scalar `enum`/`const`, and exact-one `oneOf`.
*
* Unsupported or misplaced keywords reject rather than being accepted without
* enforcement. Consumers that require an object root apply
* {@link assertObjectJsonSchema} before accepting input.
* @module dsh-tools/json-schema
*/
/**
* Thrown when a raw schema falls outside the enforced subset. `violations`
* lists every offending path instead of stopping at the first author error.
*/
var JsonSchemaError = class extends HarnessError {
	/** Individual schema violations in walk order. */
	violations;
	constructor(violations) {
		super(`unsupported JSON schema: ${violations.join("; ")}`, "UNSUPPORTED_SCHEMA");
		this.name = "JsonSchemaError";
		this.violations = violations;
	}
};
const CONSTRAINT_KEYWORDS = /* @__PURE__ */ new Set([
	"type",
	"oneOf",
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
]);
const ANNOTATION_KEYWORDS = /* @__PURE__ */ new Set([
	"description",
	"title",
	"default",
	"examples"
]);
const SCHEMA_TYPES = [
	"object",
	"array",
	"string",
	"number",
	"integer",
	"boolean",
	"null"
];
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
/**
* Test for a realm-agnostic plain JSON record without accepting arrays or
* exotic objects.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the value has a plain-object prototype chain.
*/
function isPlainJsonRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	try {
		const prototype = Object.getPrototypeOf(value);
		return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
	} catch {
		return false;
	}
}
/** Whether an array uses one realm's intrinsic `Array.prototype`. */
function hasPlainArrayPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
/** Return whether a record contains only own enumerable string keys. */
function hasOnlyEnumerableStringKeys(value) {
	try {
		return Reflect.ownKeys(value).every((key) => typeof key === "string" && Object.prototype.propertyIsEnumerable.call(value, key));
	} catch {
		return false;
	}
}
/**
* Test for an ordinary schema record whose keys survive JSON projection.
* @param value - candidate record from any JavaScript realm.
* @returns Whether the record has an intrinsic prototype and only own enumerable string keys.
*/
function isJsonSchemaRecord(value) {
	return isPlainJsonRecord(value) && hasOnlyEnumerableStringKeys(value);
}
/**
* Test for a dense ordinary array with no JSON-invisible decorations.
* @param value - candidate array from any JavaScript realm.
* @returns Whether the array is intrinsic, dense, and undecorated.
*/
function isPlainJsonArray(value) {
	if (!Array.isArray(value)) return false;
	try {
		if (!hasPlainArrayPrototype(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
		for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return false;
		return true;
	} catch {
		return false;
	}
}
/** Lossless finite JSON number, excluding negative zero. */
function isJsonNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0);
}
/** Whether a scalar is valid for one declared schema type. */
function scalarMatches(type, value) {
	switch (type) {
		case "string": return typeof value === "string";
		case "number": return isJsonNumber(value);
		case "integer": return isJsonNumber(value) && Number.isInteger(value);
		case "boolean": return typeof value === "boolean";
		case "null": return value === null;
		/* v8 ignore next -- JsonSchemaScalarType is closed; this retains compile-time exhaustiveness. */
		default: return assertNever(type, "JsonSchemaType");
	}
}
/** Keywords that are invalid beside `oneOf`. */
const ONE_OF_SIBLING_KEYWORDS = [
	"properties",
	"required",
	"additionalProperties",
	"items",
	"enum",
	"const"
];
/** Validate object-only fields after its property schemas have been visited. */
function checkObjectSchemaTail(node, path, properties, violations) {
	const hasRequired = Object.hasOwn(node, "required");
	const required = hasRequired ? node.required : void 0;
	if (hasRequired) if (!isPlainJsonArray(required) || required.some((entry) => typeof entry !== "string")) violations.push(`${path}.required must be an array of strings`);
	else {
		const declared = isJsonSchemaRecord(properties) ? properties : {};
		for (const key of required) if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`);
	}
	if (Object.hasOwn(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") violations.push(`${path}.additionalProperties must be a boolean`);
}
/** Collect every violation for one raw schema tree without using the JavaScript call stack. */
function checkSchemaNode(root, rootPath, violations, seen) {
	const tasks = [{
		kind: "enter",
		node: root,
		path: rootPath
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.node);
			continue;
		}
		if (task.kind === "one-of-tail") {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(task.node, key)) violations.push(`${task.path}.${key} is not supported beside oneOf`);
			continue;
		}
		if (task.kind === "object-tail") {
			checkObjectSchemaTail(task.node, task.path, task.properties, violations);
			continue;
		}
		const { node, path } = task;
		if (!isJsonSchemaRecord(node)) {
			violations.push(`${path} must be a schema object`);
			continue;
		}
		if (seen.has(node)) {
			violations.push(`${path} is circular`);
			continue;
		}
		seen.add(node);
		tasks.push({
			kind: "leave",
			node
		});
		for (const key of Object.keys(node)) {
			if (CONSTRAINT_KEYWORDS.has(key)) continue;
			if (ANNOTATION_KEYWORDS.has(key)) {
				try {
					if (!isJsonValue(node[key])) violations.push(`${path}.${key} annotation must be lossless JSON data`);
				} catch {
					violations.push(`${path}.${key} annotation must be lossless JSON data`);
				}
				continue;
			}
			violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`);
		}
		if (Object.hasOwn(node, "description") && typeof node.description !== "string") violations.push(`${path}.description must be a string`);
		if (Object.hasOwn(node, "title") && typeof node.title !== "string") violations.push(`${path}.title must be a string`);
		const hasType = Object.hasOwn(node, "type");
		const hasOneOf = Object.hasOwn(node, "oneOf");
		if (hasType && hasOneOf) {
			violations.push(`${path} cannot declare both type and oneOf`);
			continue;
		}
		if (!hasType && !hasOneOf) {
			for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} requires type or oneOf`);
			continue;
		}
		if (hasOneOf) {
			const oneOf = node.oneOf;
			tasks.push({
				kind: "one-of-tail",
				node,
				path
			});
			if (!isPlainJsonArray(oneOf) || oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`);
			else for (let index = oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "enter",
				node: oneOf[index],
				path: `${path}.oneOf[${index}]`
			});
			continue;
		}
		const type = node.type;
		if (typeof type !== "string" || !SCHEMA_TYPES.includes(type)) {
			violations.push(Array.isArray(type) ? `${path}.type must be a single type string (type arrays are not supported)` : `${path}.type must be one of ${SCHEMA_TYPES.join("/")}`);
			continue;
		}
		const schemaType = type;
		for (const [key, types] of Object.entries({
			properties: ["object"],
			required: ["object"],
			additionalProperties: ["object"],
			items: ["array"],
			enum: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			],
			const: [
				"string",
				"number",
				"integer",
				"boolean",
				"null"
			]
		})) if (Object.hasOwn(node, key) && !types.includes(schemaType)) violations.push(`${path}.${key} is not supported on type "${schemaType}"`);
		switch (schemaType) {
			case "object": {
				const properties = Object.hasOwn(node, "properties") ? node.properties : void 0;
				tasks.push({
					kind: "object-tail",
					node,
					path,
					properties
				});
				if (Object.hasOwn(node, "properties")) if (!isJsonSchemaRecord(properties)) violations.push(`${path}.properties must be an object of schemas`);
				else {
					const entries = Object.entries(properties);
					for (let index = entries.length - 1; index >= 0; index--) {
						const entry = entries[index];
						/* v8 ignore next -- the loop is bounded by the captured entry count. */
						if (entry === void 0) continue;
						tasks.push({
							kind: "enter",
							node: entry[1],
							path: `${path}.properties.${entry[0]}`
						});
					}
				}
				break;
			}
			case "array":
				if (Object.hasOwn(node, "items")) tasks.push({
					kind: "enter",
					node: node.items,
					path: `${path}.items`
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null": {
				const hasEnum = Object.hasOwn(node, "enum");
				const allowed = hasEnum ? node.enum : void 0;
				const enumValid = isPlainJsonArray(allowed) && allowed.length > 0 && allowed.every((entry) => scalarMatches(schemaType, entry));
				if (hasEnum && !enumValid) violations.push(`${path}.enum must be a non-empty array of ${schemaType} values`);
				const hasConst = Object.hasOwn(node, "const");
				const declaredConst = hasConst ? node.const : void 0;
				const constValid = scalarMatches(schemaType, declaredConst);
				if (hasConst) {
					if (!constValid) violations.push(`${path}.const must be a ${schemaType} value`);
					else if (enumValid && !allowed.includes(declaredConst)) violations.push(`${path}.const must be one of ${path}.enum when both are declared`);
				}
				break;
			}
			/* v8 ignore next -- schemaType was narrowed from the closed SCHEMA_TYPES table above. */
			default: assertNever(schemaType, "JsonSchemaType");
		}
	}
}
/**
* Assert that an arbitrary raw schema uses only the enforced subset.
* Annotation-only schemas are accepted as the standard unconstrained-JSON
* form; callers that require an object root use {@link assertObjectJsonSchema}.
* @param schema - untrusted raw JSON Schema.
* @returns Assertion that the schema belongs to the supported subset.
*/
function assertSupportedJsonSchema(schema) {
	const violations = [];
	checkSchemaNode(schema, "schema", violations, /* @__PURE__ */ new Set());
	if (violations.length > 0) throw new JsonSchemaError(violations);
}
/** Safely test the lossless JSON boundary when a getter may throw. */
function safelyIsJsonValue(value) {
	try {
		return isJsonValue(value);
	} catch {
		return false;
	}
}
/** Root-aware diagnostic path for the parameter validator's empty sentinel. */
function diagnosticPath(path) {
	return path === "" ? "arguments" : path;
}
/** Append one object property without a leading dot at an implicit root. */
function propertyPath(path, key) {
	return path === "" ? key : `${path}.${key}`;
}
/** The generic exception-containment diagnostic owned by one valid schema node. */
function losslessValueViolation(path) {
	return [`"${diagnosticPath(path)}" must be a lossless JSON value`];
}
/** Append diagnostics without spreading a potentially wide child result as call arguments. */
function appendViolations(target, source) {
	for (const violation of source) target.push(violation);
}
/** Initialize one validation frame with empty aggregation state. */
function valueFrame(node, value, path) {
	return {
		node,
		value,
		path,
		catches: false,
		phase: "start",
		children: [],
		childIndex: 0,
		violations: [],
		tailViolations: [],
		matches: 0
	};
}
/** Validate one scalar node after its primitive type check. */
function checkScalarValue(node, value, path) {
	const allowed = Object.hasOwn(node, "enum") ? node.enum : void 0;
	if (allowed !== void 0 && !allowed.includes(value)) return [`"${diagnosticPath(path)}" must be one of ${JSON.stringify(allowed)}`];
	if (Object.hasOwn(node, "const") && value !== node.const) return [`"${diagnosticPath(path)}" must be ${JSON.stringify(node.const)}`];
	return [];
}
/** Validate one trusted schema/value pair with explicit frames rather than recursive calls. */
function checkValue(schema, value, path) {
	const frames = [valueFrame(schema, value, path)];
	let rootResult;
	const receive = (result) => {
		const parent = frames.at(-1);
		if (parent === void 0) {
			rootResult = result;
			return;
		}
		if (parent.kind === "oneOf") {
			if (result.length === 0) parent.matches++;
		} else appendViolations(parent.violations, result);
	};
	const finish = (result) => {
		frames.pop();
		receive(result);
	};
	while (frames.length > 0) {
		const frame = frames.at(-1);
		/* v8 ignore next -- the loop condition guarantees a current frame. */
		if (frame === void 0) break;
		try {
			if (frame.phase === "children") {
				if (frame.childIndex < frame.children.length) {
					const child = frame.children[frame.childIndex];
					/* v8 ignore next -- childIndex is bounded by children.length. */
					if (child === void 0) throw new Error("missing schema-value child frame");
					frame.childIndex++;
					frames.push(valueFrame(child.node, child.value, child.path));
					continue;
				}
				if (frame.kind === "oneOf") {
					finish(frame.matches === 1 ? [] : [`"${diagnosticPath(frame.path)}" must match exactly one oneOf branch (matched ${frame.matches})`]);
					continue;
				}
				appendViolations(frame.violations, frame.tailViolations);
				if (frame.violations.length > 0) finish(frame.violations);
				else if (frame.kind === "object") finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a lossless JSON object`]);
				else finish(safelyIsJsonValue(frame.value) ? [] : [`"${diagnosticPath(frame.path)}" must be a dense lossless JSON array`]);
				continue;
			}
			const nodeType = Object.hasOwn(frame.node, "type") ? frame.node.type : void 0;
			frame.catches = !(nodeType !== void 0 && !SCHEMA_TYPES.includes(nodeType));
			const oneOf = Object.hasOwn(frame.node, "oneOf") ? frame.node.oneOf : void 0;
			if (oneOf !== void 0) {
				frame.kind = "oneOf";
				frame.children = Array.from(oneOf, (branch) => ({
					node: branch,
					value: frame.value,
					path: frame.path
				}));
				frame.childIndex = 0;
				frame.matches = 0;
				frame.phase = "children";
				continue;
			}
			if (nodeType === void 0) {
				finish(safelyIsJsonValue(frame.value) ? [] : losslessValueViolation(frame.path));
				continue;
			}
			switch (nodeType) {
				case "object": {
					if (!isPlainJsonRecord(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an object`]);
						break;
					}
					const properties = Object.hasOwn(frame.node, "properties") ? frame.node.properties ?? {} : {};
					const violations = [];
					const required = Object.hasOwn(frame.node, "required") ? frame.node.required ?? [] : [];
					for (const key of required) if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) violations.push(`missing required property "${propertyPath(frame.path, key)}"`);
					const children = [];
					for (const [key, child] of Object.entries(properties)) {
						if (!Object.hasOwn(frame.value, key) || frame.value[key] === void 0) continue;
						children.push({
							node: child,
							value: frame.value[key],
							path: propertyPath(frame.path, key)
						});
					}
					const tailViolations = [];
					if (Object.hasOwn(frame.node, "additionalProperties") && frame.node.additionalProperties === false) {
						for (const key of Object.keys(frame.value)) if (!Object.hasOwn(properties, key)) tailViolations.push(`"${propertyPath(frame.path, key)}" is not a declared property (additionalProperties: false)`);
					}
					frame.kind = "object";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = violations;
					frame.tailViolations = tailViolations;
					frame.phase = "children";
					break;
				}
				case "array": {
					if (!Array.isArray(frame.value)) {
						finish([`"${diagnosticPath(frame.path)}" must be an array`]);
						break;
					}
					const items = Object.hasOwn(frame.node, "items") ? frame.node.items : void 0;
					const children = items === void 0 ? [] : frame.value.flatMap((entry, index) => [{
						node: items,
						value: entry,
						path: `${frame.path}[${index}]`
					}]);
					frame.kind = "array";
					frame.children = children;
					frame.childIndex = 0;
					frame.violations = [];
					frame.phase = "children";
					break;
				}
				case "string":
					finish(typeof frame.value === "string" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a string`]);
					break;
				case "number":
					finish(typeof frame.value !== "number" ? [`"${diagnosticPath(frame.path)}" must be a number`] : !isJsonNumber(frame.value) ? [`"${diagnosticPath(frame.path)}" must be a finite JSON number`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "integer":
					finish(!isJsonNumber(frame.value) || !Number.isInteger(frame.value) ? [`"${diagnosticPath(frame.path)}" must be an integer`] : checkScalarValue(frame.node, frame.value, frame.path));
					break;
				case "boolean":
					finish(typeof frame.value === "boolean" ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be a boolean`]);
					break;
				case "null":
					finish(frame.value === null ? checkScalarValue(frame.node, frame.value, frame.path) : [`"${diagnosticPath(frame.path)}" must be null`]);
					break;
				default: finish(assertNever(nodeType, "JsonSchemaType"));
			}
		} catch (error) {
			let failed = frames.pop();
			while (failed !== void 0 && !failed.catches) failed = frames.pop();
			if (failed === void 0) throw error;
			receive(losslessValueViolation(failed.path));
		}
	}
	/* v8 ignore next -- every root frame finishes or throws. */
	return rootResult ?? losslessValueViolation(path);
}
/**
* Validate a candidate value against an asserted raw schema. The function is
* total for arbitrary values and returns path-qualified violations.
* @param schema - a schema accepted by {@link assertSupportedJsonSchema}.
* @param value - the candidate JSON value.
* @param path - root label used in diagnostics.
* @returns All violations in walk order; empty means valid.
*/
function validateJsonSchemaValue(schema, value, path = "value") {
	return checkValue(schema, value, path);
}
/** Unified JSON-value schema DSL, inference, compilation, and typed tool helper. @module dsh-tools/schema */
const ANNOTATION_KEYS = [
	"description",
	"title",
	"default",
	"examples"
];
/** Throw one author-schema violation through the shared schema error type. */
function authorError(message) {
	throw new JsonSchemaError([message]);
}
/** Copy own annotation fields for validation by the raw-schema boundary. */
function copyAnnotations(source, target) {
	if (Object.hasOwn(source, "description")) target.description = source.description;
	if (Object.hasOwn(source, "title")) target.title = source.title;
	if (Object.hasOwn(source, "default")) target.default = source.default;
	if (Object.hasOwn(source, "examples")) target.examples = source.examples;
}
/** Reject author-only keys outside one node's declared vocabulary. */
function assertAuthorKeys(source, path, allowed) {
	for (const key of Object.keys(source)) if (!allowed.includes(key)) authorError(`${path}.${key} is not supported by the value schema DSL`);
}
/** Install a compiled node without giving `__proto__` assignment semantics. */
function assignCompiledNode(destination, node) {
	switch (destination.kind) {
		case "root":
			destination.holder.value = node;
			break;
		case "property":
			Object.defineProperty(destination.target, destination.key, {
				value: node,
				enumerable: true,
				configurable: true,
				writable: true
			});
			break;
		case "item":
			destination.target.items = node;
			break;
		case "one-of": destination.target[destination.index] = node;
	}
}
/** Install a compiled property map at its root or containing object node. */
function assignCompiledPropertyMap(destination, compiled) {
	if (destination.kind === "root") destination.holder.value = compiled;
	else destination.target.properties = compiled.properties;
}
/** Execute an author-schema compilation task graph without recursive descent. */
function runSchemaCompiler(initial) {
	const seen = /* @__PURE__ */ new Set();
	const tasks = [initial];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			seen.delete(task.input);
			continue;
		}
		if (task.kind === "property-map-tail") {
			if (task.required.length > 0) {
				task.compiled.required = task.required;
				if (task.destination.kind === "object") task.destination.target.required = task.required;
			}
			continue;
		}
		if (task.kind === "property") {
			if (!isJsonSchemaRecord(task.property)) authorError(`${task.path} must be a value schema object`);
			if (Object.hasOwn(task.property, "required") && task.property.required !== true) authorError(`${task.path}.required must be true when present`);
			if (Object.hasOwn(task.property, "required") && task.property.required === true) task.required.push(task.key);
			tasks.push({
				kind: "value",
				input: task.property,
				path: task.path,
				allowRequired: true,
				destination: {
					kind: "property",
					target: task.properties,
					key: task.key
				}
			});
			continue;
		}
		if (task.kind === "property-map") {
			if (!isJsonSchemaRecord(task.input)) authorError(`${task.path} must be an object of value schemas`);
			if (seen.has(task.input)) authorError(`${task.path} is circular`);
			seen.add(task.input);
			const compiled = { properties: {} };
			const required = [];
			assignCompiledPropertyMap(task.destination, compiled);
			tasks.push({
				kind: "leave",
				input: task.input
			});
			tasks.push({
				kind: "property-map-tail",
				compiled,
				required,
				destination: task.destination
			});
			const entries = Object.entries(task.input);
			for (let index = entries.length - 1; index >= 0; index--) {
				const entry = entries[index];
				/* v8 ignore next -- the loop is bounded by the captured entry count. */
				if (entry === void 0) continue;
				tasks.push({
					kind: "property",
					property: entry[1],
					path: `${task.path}.${entry[0]}`,
					key: entry[0],
					properties: compiled.properties,
					required
				});
			}
			continue;
		}
		const { input, path } = task;
		if (!isJsonSchemaRecord(input)) authorError(`${path} must be a value schema object`);
		if (seen.has(input)) authorError(`${path} is circular`);
		seen.add(input);
		const authorKeys = [...ANNOTATION_KEYS, ...task.allowRequired ? ["required"] : []];
		const node = {};
		assignCompiledNode(task.destination, node);
		tasks.push({
			kind: "leave",
			input
		});
		if (Object.hasOwn(input, "oneOf")) {
			assertAuthorKeys(input, path, [
				...authorKeys,
				"oneOf",
				"type"
			]);
			if (Object.hasOwn(input, "type")) authorError(`${path} cannot declare both type and oneOf`);
			if (!isPlainJsonArray(input.oneOf)) authorError(`${path}.oneOf must be an array of at least two value schemas`);
			const branches = [];
			node.oneOf = branches;
			copyAnnotations(input, node);
			for (let index = input.oneOf.length - 1; index >= 0; index--) tasks.push({
				kind: "value",
				input: input.oneOf[index],
				path: `${path}.oneOf[${index}]`,
				allowRequired: false,
				destination: {
					kind: "one-of",
					target: branches,
					index
				}
			});
			continue;
		}
		const inputType = Object.hasOwn(input, "type") ? input.type : void 0;
		switch (inputType) {
			case "json":
				assertAuthorKeys(input, path, [...authorKeys, "type"]);
				copyAnnotations(input, node);
				break;
			case "object":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"properties",
					"additionalProperties"
				]);
				if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean") authorError(`${path}.additionalProperties must be explicitly true or false`);
				node.type = "object";
				copyAnnotations(input, node);
				node.additionalProperties = input.additionalProperties;
				if (Object.hasOwn(input, "properties")) tasks.push({
					kind: "property-map",
					input: input.properties,
					path: `${path}.properties`,
					destination: {
						kind: "object",
						target: node
					}
				});
				break;
			case "array":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"items"
				]);
				node.type = "array";
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "items")) tasks.push({
					kind: "value",
					input: input.items,
					path: `${path}.items`,
					allowRequired: false,
					destination: {
						kind: "item",
						target: node
					}
				});
				break;
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				assertAuthorKeys(input, path, [
					...authorKeys,
					"type",
					"enum",
					"const"
				]);
				node.type = inputType;
				copyAnnotations(input, node);
				if (Object.hasOwn(input, "enum")) {
					if (!isPlainJsonArray(input.enum)) authorError(`${path}.enum must be a non-empty array of scalar values`);
					node.enum = Array.from(input.enum, (entry) => entry);
				}
				if (Object.hasOwn(input, "const")) node.const = input.const;
				break;
			default: authorError(`${path}.type must be string/number/integer/boolean/null/array/object/json, or use oneOf`);
		}
	}
}
/** Compile one implicit property map, collecting per-property requiredness. */
function compilePropertyMap(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "property-map",
		input,
		path,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/** Compile one author node without applying any consumer root restriction. */
function compileValueSchema(input, path) {
	const holder = {};
	runSchemaCompiler({
		kind: "value",
		input,
		path,
		allowRequired: false,
		destination: {
			kind: "root",
			holder
		}
	});
	/* v8 ignore next -- the root task assigns before scheduling any descendants. */
	return holder.value ?? authorError(`${path} did not compile`);
}
/**
* Compile one author-facing value schema to the enforced raw JSON Schema
* subset. The author-only `json` node becomes an annotation-only schema.
* @param spec - schema for any JSON-value root.
* @returns The asserted raw schema projection.
*/
function valueSchemaSpecToJsonSchema(spec) {
	const schema = compileValueSchema(spec, "schema");
	assertSupportedJsonSchema(schema);
	return schema;
}
/**
* Compile the implicit open parameter object into raw JSON Schema.
* @param spec - per-property parameter definitions.
* @returns An object-rooted raw schema with no implicit-root openness override.
*/
function parameterSchemaSpecToJsonSchema(spec) {
	const compiled = compilePropertyMap(spec, "parameters");
	const schema = {
		type: "object",
		properties: compiled.properties,
		...compiled.required === void 0 ? {} : { required: compiled.required }
	};
	assertSupportedJsonSchema(schema);
	return schema;
}
/** Invalid model-generated arguments for a typed tool. */
var ToolArgsError = class extends HarnessError {
	/** Individual violations in schema-walk order. */
	violations;
	constructor(violations) {
		super(`invalid arguments: ${violations.join("; ")}`, "INVALID_ARGS");
		this.name = "ToolArgsError";
		this.violations = violations;
	}
};
/**
* Define a first-party tool with inferred arguments and strict execution
* validation. Replay-only presenters validate softly and fall back to generic
* rendering for obsolete logged arguments.
* @param options - typed definition and optional finalizer and presenters.
* @returns A registry-ready definition.
*/
function defineTool(options) {
	const userExecute = options.execute;
	const userFinalizeContent = options.finalizeContent;
	const userRender = options.output.render;
	const userPresentationMeta = options.output.presentationMeta;
	const userPresentCall = options.presentCall;
	const userPresentResult = options.presentResult;
	const userIsConcurrencySafe = options.isConcurrencySafe;
	if (options.timeoutMs !== void 0 && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) throw new Error(`defineTool(${options.name}): timeoutMs must be a positive finite number`);
	const parameters = parameterSchemaSpecToJsonSchema(options.parameters);
	const outputSchema = valueSchemaSpecToJsonSchema(options.output.schema);
	const validate = (args) => validateJsonSchemaValue(parameters, args, "");
	const tool = {
		name: options.name,
		description: options.description,
		parameters,
		output: {
			schema: outputSchema,
			render(args, value) {
				return userRender(args, value);
			},
			...userPresentationMeta !== void 0 ? { presentationMeta(args, value) {
				return userPresentationMeta(args, value);
			} } : {}
		},
		...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {},
		async execute(args, exec) {
			const violations = validate(args);
			if (violations.length > 0) throw new ToolArgsError(violations);
			return userExecute(args, exec);
		}
	};
	if (userFinalizeContent) tool.finalizeContent = (exec, result) => userFinalizeContent(exec, result);
	if (userPresentCall) tool.presentCall = (args) => {
		if (validate(args).length > 0) return void 0;
		return userPresentCall(args);
	};
	if (userPresentResult) tool.presentResult = (args, result) => {
		if (validate(args).length > 0) return void 0;
		return userPresentResult(args, result);
	};
	if (userIsConcurrencySafe) tool.isConcurrencySafe = (args) => {
		if (validate(args).length > 0) return false;
		return userIsConcurrencySafe(args);
	};
	return tool;
}
/**
* PTC mode `run_code` transport. Programs call the registry's agent-visible
* tools through nested executions scheduled under the native concurrency
* contract; each sub-dispatch is logged for reconstruction, while only the
* outer curated result enters model history.
* @module @deepseek-ai/dsh-tools/src/ptc
*/
/** The model-facing name of the PTC mode tool. */
const RUN_CODE_NAME = "run_code";
/** The `tools:sdk` section order, after per-tool guidance sections. */
const SDK_SECTION_ORDER = FIRST_PARTY_SECTION_ORDER.TOOLS_SDK;
/**
* The TypeScript flavor: the fallback for a schema read with no runtime
* mounted ({@link resolveFlavor} owns which readers reach that). A real
* assembly always resolves a runtime first, so the model never sees this
* fallback outside its own language.
*/
const TYPESCRIPT_FLAVOR = {
	description: "Execute a TypeScript program against the available tools. Takes two required arguments: `code`, the BODY of an async function (erasable syntax only; top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Only what you print or return is program output — curate it. Image-bearing subtool results are attached after the run.",
	codeDescription: "The program: the body of an async TypeScript function."
};
/** Per-language `run_code` schema flavors (see {@link RunCodeFlavor}); one entry per {@link CodeSdkLanguage}. */
const RUN_CODE_FLAVORS = {
	typescript: TYPESCRIPT_FLAVOR,
	python: {
		description: "Execute a Python program against the available tools. Takes two required arguments: `code`, the BODY of an async function (top-level `await` and `return` work), and `description`, a short summary of what the program does. Call tools as `await tools.name(args)` per the declarations in the system prompt. Use `print(...)` and/or `return <value>` for program output — curate it. Image-bearing subtool results are attached after the run.",
		codeDescription: "The program: the body of an async Python function."
	}
};
/**
* The `description` parameter's model-facing description: language-independent
* (the UI label contract is the same for every runtime), shared between the
* static spec and the language-aware `parameters` getter so the two emissions
* can never drift.
*/
const RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION = "Clear, concise description of what this program does in active voice, 5-10 words (shown in the UI). Examples: \"Count TODO markers across packages\"; \"Read failing test and its fixture\"; \"Rename config key in every cordis.yml\".";
/**
* Resolve the {@link RunCodeFlavor} for the loaded runtime's language, read at
* schema-emission time so the model-visible `run_code` schema always matches
* the SDK section's language. `peekRuntime` returns `undefined` only when no
* runtime is mounted, which reaches this function through definition readers
* and `schemas()` — the doc-catalog harvest is the only shipped one, and none
* of them feeds a model, because `wireSchemas` calls `requireCodeRuntime`
* before projecting — so that path degrades to {@link TYPESCRIPT_FLAVOR}. A
* mounted runtime whose language has no flavor entry fails loud, exactly as
* `requireCodeRuntime` rejects it at assembly. Keeping this table in step with
* `SDK_RENDERERS` is the compiler's job ({@link CodeSdkLanguage}); what this
* guard owns is the runtime-supplied language neither table knows, which never
* yields a wrong-language schema for a real runtime.
*/
function resolveFlavor(peekRuntime) {
	const runtime = peekRuntime();
	if (runtime === void 0) return TYPESCRIPT_FLAVOR;
	const flavor = RUN_CODE_FLAVORS[runtime.language];
	if (!Object.hasOwn(RUN_CODE_FLAVORS, runtime.language) || flavor === void 0) {
		const known = Object.keys(RUN_CODE_FLAVORS).map((name) => JSON.stringify(name)).join(", ");
		throw new Error(`dsh-tools: no run_code schema flavor registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
	}
	return flavor;
}
/**
* Thrown by `run_code` when the program run itself failed — a program
* exception, a budget expiry, an abort, or substrate death. Extends
* {@link HarnessError} (`code: 'CODE_RUN_FAILED'`); the registry's execution
* pipeline converts it into a structured `isError` result whose text carries
* the failure kind plus the captured logs, so the model can self-correct.
*/
var CodeRunFailedError = class extends HarnessError {
	constructor(message) {
		super(message, "CODE_RUN_FAILED");
		this.name = "CodeRunFailedError";
	}
};
/**
* Snapshot one binding call's argument as lossless JSON, then snapshot that
* detached value again so dispatch and logging stay independent without
* reintroducing structured-clone's platform-specific nesting limit.
*/
function jsonNormalizeArgs(value) {
	let snapshot;
	try {
		snapshot = snapshotJsonValue(value);
	} catch (error) {
		throw new Error(`tool arguments must be lossless JSON: ${error instanceof Error ? error.message : String(error)}`);
	}
	if (snapshot === void 0) throw new Error("tool arguments must be lossless JSON (call the tool with an arguments object, e.g. `{}`)");
	const logged = snapshotJsonValue(snapshot);
	/* v8 ignore next -- snapshot is already a detached lossless JSON value. */
	if (logged === void 0) throw new Error("tool arguments could not be detached for durable logging");
	return {
		dispatched: snapshot,
		logged
	};
}
/** Two-space JSON presentation, matching the existing shallow `run_code` text contract. */
const JSON_INDENT = "  ";
/**
* ECMAScript caps `JSON.stringify`'s `space` string at ten characters. The
* renderer also caps TOTAL indentation there, compacting deeper subtrees, so
* formatted output remains linear in the canonical JSON size.
*/
const MAX_JSON_INDENT_CHARS = 10;
/** Render one non-string JSON root without recursive traversal or unbounded indentation growth. */
function renderJsonValue(value) {
	const chunks = [];
	const tasks = [{
		kind: "value",
		value,
		depth: 0,
		compact: false
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "text") {
			chunks.push(task.text);
			continue;
		}
		const current = task.value;
		if (current === null || typeof current === "boolean" || typeof current === "number") {
			chunks.push(String(current));
			continue;
		}
		if (typeof current === "string") {
			chunks.push(JSON.stringify(current));
			continue;
		}
		const compact = task.compact || (task.depth + 1) * 2 > MAX_JSON_INDENT_CHARS;
		const childDepth = task.depth + 1;
		if (Array.isArray(current)) {
			chunks.push("[");
			if (current.length === 0) {
				chunks.push("]");
				continue;
			}
			tasks.push({
				kind: "text",
				text: compact ? "]" : `\n${JSON_INDENT.repeat(task.depth)}]`
			});
			for (let index = current.length - 1; index >= 0; index--) {
				const item = current[index];
				/* v8 ignore next -- canonical JsonValue arrays are dense. */
				if (item === void 0) throw new Error("cannot render a sparse JSON array");
				tasks.push({
					kind: "value",
					value: item,
					depth: childDepth,
					compact
				});
				tasks.push({
					kind: "text",
					text: compact ? index === 0 ? "" : "," : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}`
				});
			}
			continue;
		}
		const keys = Object.keys(current);
		chunks.push("{");
		if (keys.length === 0) {
			chunks.push("}");
			continue;
		}
		tasks.push({
			kind: "text",
			text: compact ? "}" : `\n${JSON_INDENT.repeat(task.depth)}}`
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) throw new Error("cannot render a missing JSON object key");
			const item = current[key];
			/* v8 ignore next -- canonical JsonValue records contain no undefined properties. */
			if (item === void 0) throw new Error("cannot render an undefined JSON object property");
			tasks.push({
				kind: "value",
				value: item,
				depth: childDepth,
				compact
			});
			tasks.push({
				kind: "text",
				text: compact ? `${index === 0 ? "" : ","}${JSON.stringify(key)}:` : `${index === 0 ? "\n" : ",\n"}${JSON_INDENT.repeat(childDepth)}${JSON.stringify(key)}: `
			});
		}
	}
	return chunks.join("");
}
/** Render one present program completion value for the model-facing result text. */
function renderValue(value) {
	return typeof value === "string" ? value : renderJsonValue(value);
}
/**
* Build the `run_code` {@link ToolDefinition}: required `code` and
* `description` parameters, executed through the dispatch bridge described
* above. The
* registry reserves it as presentation infrastructure under non-native modes,
* outside the filterable global/scoped capability layers.
* @param registry - the owning registry (sub-calls go through its `execute`,
*   bindings cover its registered tools).
* @param options - the registry-private capabilities described above.
* @returns the registry-ready definition.
*/
function createRunCodeTool(registry, options) {
	const { requireRuntime, peekRuntime, maxParallel, shapeDispatchLog } = options;
	const definition = defineTool({
		name: RUN_CODE_NAME,
		description: TYPESCRIPT_FLAVOR.description,
		parameters: {
			code: {
				type: "string",
				required: true,
				description: TYPESCRIPT_FLAVOR.codeDescription
			},
			description: {
				type: "string",
				required: true,
				description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					logs: {
						type: "array",
						required: true,
						items: { type: "string" }
					},
					result: { type: "json" }
				}
			},
			render: (_args, value) => {
				const rendered = value.result === void 0 ? "" : renderValue(value.result);
				const parts = [value.logs.join("\n"), rendered].filter((part) => part.length > 0);
				return [{
					type: "text",
					text: parts.length > 0 ? parts.join("\n") : "(run_code completed with no output)"
				}];
			}
		},
		async execute(args, exec) {
			if (args.description.trim().length === 0) throw new Error("invalid description: expected a non-empty string");
			const runtime = requireRuntime();
			const runController = new AbortController();
			const onOuterAbort = () => {
				runController.abort(exec.signal.reason);
			};
			exec.signal.addEventListener("abort", onOuterAbort, { once: true });
			let dispatches = 0;
			const pendingQueue = [];
			const inFlight = /* @__PURE__ */ new Set();
			/** Tracked settle-event side work (log-content listener + append), drained at run settlement. */
			const logWork = /* @__PURE__ */ new Set();
			const commitQueue = [];
			let exclusiveActive = false;
			let driving = false;
			let driverRun = Promise.resolve();
			let wake;
			const wakeup = () => {
				const release = wake;
				wake = void 0;
				release?.();
			};
			/**
			* The single ordered lane. Each pass commits the head-of-line settled
			* dispatch (ordered post-execute), then starts the next queued entry if
			* its slot is free (ordered pre-execute), and otherwise sleeps until a
			* body settles or a new submission arrives. One run reaching the
			* empty-queues/empty-pool state is quiescence.
			*/
			const drive = () => {
				if (driving) return driverRun;
				driving = true;
				driverRun = (async () => {
					try {
						for (;;) {
							const signal = new Promise((resolve) => {
								wake = resolve;
							});
							const commitHead = commitQueue[0];
							if (commitHead !== void 0 && commitHead.settled) {
								commitQueue.shift();
								await commitHead.commit();
								if (commitHead.mode === "exclusive") exclusiveActive = false;
								continue;
							}
							const head = pendingQueue[0];
							if (head !== void 0) {
								if (runController.signal.aborted) {
									pendingQueue.shift();
									head.abandon();
									continue;
								}
								const mode = head.classify();
								if (!exclusiveActive && (mode === "exclusive" ? inFlight.size === 0 : inFlight.size < maxParallel)) {
									if (mode === "exclusive") exclusiveActive = true;
									head.mode = mode;
									pendingQueue.shift();
									commitQueue.push(head);
									await head.start();
									const flight = head.flight.finally(() => {
										inFlight.delete(flight);
										wakeup();
									});
									inFlight.add(flight);
									continue;
								}
							}
							if (pendingQueue.length === 0 && commitQueue.length === 0 && inFlight.size === 0) return;
							await signal;
						}
					} finally {
						driving = false;
						wake = void 0;
					}
				})();
				return driverRun;
			};
			/** Every dispatch settled AND committed; nothing can start (the run is aborted at call time). */
			const drainDispatches = async () => {
				await drive();
				while (logWork.size > 0) await Promise.allSettled([...logWork]);
			};
			const runOver = () => runController.signal.aborted;
			const binding = (name) => async (rawArgs) => {
				if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} not dispatched`);
				const normalized = jsonNormalizeArgs(rawArgs);
				const n = ++dispatches;
				const subCallId = ToolCallId(`${String(exec.callId)}:code:${n}`);
				const input = {
					callId: subCallId,
					rootCallId: exec.rootCallId,
					name,
					arguments: normalized.dispatched,
					...exec.agent ? { agent: exec.agent } : {},
					parent: exec.token,
					signal: runController.signal
				};
				const scheduler = registry[TOOL_RUNTIME_SCHEDULER];
				const outcome = await new Promise((resolve, reject) => {
					let parked;
					const settle = (result) => {
						resolve(result.isError ? {
							isError: true,
							message: result.error.message
						} : {
							isError: false,
							value: result.value
						});
						const agent = exec.agent;
						if (agent === void 0) return;
						const task = (async () => {
							const logged = await shapeDispatchLog({
								exec,
								agent,
								subCallId,
								name,
								isError: result.isError,
								content: result.content
							});
							agent.session.append("tool/code-dispatch", {
								rootCallId: exec.rootCallId,
								parentCallId: exec.callId,
								subCallId,
								name,
								arguments: normalized.logged,
								isError: result.isError,
								content: logged
							});
						})().finally(() => {
							logWork.delete(task);
						});
						logWork.add(task);
					};
					pendingQueue.push({
						flight: Promise.resolve(),
						settled: false,
						classify: () => registry.executionMode(input).kind,
						abandon: () => {
							reject(/* @__PURE__ */ new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} tool call abandoned`));
						},
						async start() {
							exec.agent?.session.append("tool/code-dispatch-start", {
								rootCallId: exec.rootCallId,
								parentCallId: exec.callId,
								subCallId,
								name,
								arguments: normalized.logged
							});
							const prepared = await scheduler.prepare(input);
							if (prepared.kind === "dispatch") {
								this.flight = scheduler.dispatch(prepared.exec).then((dispatchOutcome) => {
									parked = {
										kind: dispatchOutcome.kind,
										exec: prepared.exec,
										result: dispatchOutcome.result
									};
									this.settled = true;
								});
								return;
							}
							parked = {
								kind: prepared.kind,
								exec: prepared.exec,
								result: prepared.result
							};
							this.settled = true;
						},
						async commit() {
							/* v8 ignore next -- commit() runs only after `settled` flipped, which set parked. */
							if (parked === void 0) return;
							const result = parked.kind === "post-result" ? await scheduler.finalize(parked.exec, parked.result) : scheduler.finish(parked.exec, parked.result);
							if (!result.isError && result.content.some((block) => block.type === "image")) exec.deferContext(createUserMessage({
								content: result.content,
								source: {
									kind: "plugin",
									plugin: "tools-code-mode"
								}
							}));
							for (const context of result.additionalContexts ?? []) exec.deferContext(context);
							if (result.concludesTurn) exec.concludeTurn();
							settle(result);
							while (logWork.size > maxParallel) await Promise.race(logWork);
						}
					});
					wakeup();
					drive();
				});
				if (runOver()) throw new Error(`run_code run is over (${String(runController.signal.reason)}); ${name} result discarded`);
				if (outcome.isError) throw new Error(outcome.message);
				return outcome.value;
			};
			const functions = Object.create(null);
			for (const schema of registry.schemas(exec.agent)) {
				if (schema.name === "run_code") continue;
				Object.defineProperty(functions, schema.name, {
					enumerable: true,
					value: binding(schema.name)
				});
			}
			try {
				let result;
				try {
					result = await runtime.run({
						program: args.code,
						bindings: [{
							global: "tools",
							functions,
							errorClass: {
								name: "ToolCallError",
								memberNameProperty: "toolName"
							}
						}],
						signal: runController.signal
					});
				} finally {
					runController.abort("run_code settled");
					await drainDispatches();
				}
				if (result.error) {
					const logsText = result.logs.length > 0 ? `\nCaptured output:\n${result.logs.join("\n")}` : "";
					throw new CodeRunFailedError(`code run failed (${result.error.kind}): ${result.error.message}${logsText}`);
				}
				return {
					logs: result.logs,
					...result.value !== void 0 ? { result: result.value } : {}
				};
			} finally {
				exec.signal.removeEventListener("abort", onOuterAbort);
			}
		},
		presentCall: (args) => ({
			card: "generic",
			title: args.description,
			kind: "execute",
			rawInput: args.code
		})
	});
	Object.defineProperty(definition, "description", {
		enumerable: true,
		get: () => resolveFlavor(peekRuntime).description
	});
	Object.defineProperty(definition, "parameters", {
		enumerable: true,
		get: () => parameterSchemaSpecToJsonSchema({
			code: {
				type: "string",
				required: true,
				description: resolveFlavor(peekRuntime).codeDescription
			},
			description: {
				type: "string",
				required: true,
				description: RUN_CODE_DESCRIPTION_PARAM_DESCRIPTION
			}
		})
	});
	return definition;
}
/**
* PTC mode codegen: the pure projection from registered tool schemas to the TypeScript SDK
* text the model programs against (the `tools:sdk` prompt section). Sibling of
* `json-schema.ts` — `schemas()` (native function calling) and this module (the generated
* `declare const tools` API) are two projections of the same store.
* @module @deepseek-ai/dsh-tools/src/ts-types
*/
/** Property names that are valid bare TS identifiers; anything else is quoted. */
const IDENTIFIER$1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
/** Render an object key: bare when it is a valid identifier, quoted otherwise (every name stays reachable, no aliasing). */
function renderKey(name) {
	return IDENTIFIER$1.test(name) ? name : JSON.stringify(name);
}
/** One `indent`-deep line prefix (two spaces per level). */
function pad$1(indent) {
	return "  ".repeat(indent);
}
/** A one-line JSDoc block for a schema `description`, or no lines when there is none. */
function docLines$1(description, indent) {
	if (typeof description !== "string" || description.length === 0) return [];
	const collapsed = description.replace(/\s+/g, " ").trim();
	return [`${pad$1(indent)}/** ${collapsed.replaceAll("*/", String.raw`*\/`)} */`];
}
/** Render one scalar already validated by the unified schema boundary. */
function renderScalar(value) {
	return JSON.stringify(value);
}
/** Render a validated scalar `const`/`enum`, falling back to the broad type. */
function renderConstrainedScalar$1(node, type) {
	const broad = type === "integer" ? "number" : type;
	if (Object.hasOwn(node, "const")) return renderScalar(node.const);
	if (Object.hasOwn(node, "enum")) return node.enum.map(renderScalar).join(" | ");
	return broad;
}
/** Build one document from captured parts while retaining the legacy array-parenthesization test. */
function typeDocumentFrom(parts) {
	return {
		parts,
		containsUnionOrIntersection: parts.some((part) => typeof part === "string" ? part.includes("|") || part.includes("&") : part.containsUnionOrIntersection)
	};
}
/** Build a small document without an intermediate array at each call site. */
function typeDocument(...parts) {
	return typeDocumentFrom(parts);
}
/** Flatten a nested document with an explicit work stack. */
function flattenTypeDocument(document) {
	const chunks = [];
	const tasks = [document];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (typeof task === "string") {
			chunks.push(task);
			continue;
		}
		for (let index = task.parts.length - 1; index >= 0; index--) {
			const part = task.parts[index];
			/* v8 ignore next -- the loop is bounded by the captured part count. */
			if (part !== void 0) tasks.push(part);
		}
	}
	return chunks.join("");
}
/** Initialize one schema-render frame with empty aggregation state. */
function schemaRenderFrame(node, indent) {
	return {
		node,
		indent,
		phase: "start",
		children: [],
		childIndex: 0,
		childDocuments: [],
		entries: []
	};
}
/** Render an already asserted schema to a composable document. */
function renderSupportedSchema(schema, indent) {
	const frames = [schemaRenderFrame(schema, indent)];
	let rootDocument;
	const finish = (document) => {
		frames.pop();
		const parent = frames.at(-1);
		if (parent === void 0) rootDocument = document;
		else parent.childDocuments.push(document);
	};
	while (frames.length > 0) {
		const frame = frames.at(-1);
		/* v8 ignore next -- the loop condition guarantees a current frame. */
		if (frame === void 0) break;
		if (frame.phase === "children") {
			if (frame.childIndex < frame.children.length) {
				const child = frame.children[frame.childIndex];
				/* v8 ignore next -- childIndex is bounded by children.length. */
				if (child === void 0) throw new Error("missing schema render child");
				frame.childIndex++;
				frames.push(schemaRenderFrame(child.node, child.indent));
				continue;
			}
			if (frame.kind === "oneOf") {
				const parts = [];
				for (let index = 0; index < frame.childDocuments.length; index++) {
					if (index > 0) parts.push(" | ");
					const child = frame.childDocuments[index];
					/* v8 ignore next -- child documents correspond one-to-one with children. */
					if (child !== void 0) parts.push(child);
				}
				finish(typeDocumentFrom(parts));
				continue;
			}
			if (frame.kind === "array") {
				const child = frame.childDocuments[0];
				/* v8 ignore next -- array frames always schedule exactly one child. */
				if (child === void 0) throw new Error("missing array item type");
				finish(child.containsUnionOrIntersection ? typeDocument("(", child, ")[]") : typeDocument(child, "[]"));
				continue;
			}
			const required = new Set(frame.node.required);
			const parts = ["{"];
			for (let index = 0; index < frame.entries.length; index++) {
				const entry = frame.entries[index];
				const child = frame.childDocuments[index];
				/* v8 ignore next -- object entries and child documents have the same length. */
				if (entry === void 0 || child === void 0) throw new Error("missing object property type");
				const [name, prop] = entry;
				for (const line of docLines$1(prop.description, frame.indent + 1)) parts.push("\n", line);
				parts.push("\n", `${pad$1(frame.indent + 1)}${renderKey(name)}${required.has(name) ? "" : "?"}: `, child, ";");
			}
			parts.push("\n", `${pad$1(frame.indent)}}`);
			const declared = typeDocumentFrom(parts);
			finish(frame.node.additionalProperties === false ? declared : typeDocument(declared, " & Record<string, JsonValue>"));
			continue;
		}
		const node = frame.node;
		if (node.oneOf !== void 0) {
			frame.kind = "oneOf";
			frame.children = Array.from(node.oneOf, (child) => ({
				node: child,
				indent: frame.indent
			}));
			frame.childIndex = 0;
			frame.childDocuments = [];
			frame.phase = "children";
			continue;
		}
		if (node.type === void 0) {
			finish(typeDocument("JsonValue"));
			continue;
		}
		switch (node.type) {
			case "string":
			case "number":
			case "integer":
			case "boolean":
			case "null":
				finish(typeDocument(renderConstrainedScalar$1(node, node.type)));
				break;
			case "array":
				if (node.items === void 0) finish(typeDocument("JsonValue[]"));
				else {
					frame.kind = "array";
					frame.children = [{
						node: node.items,
						indent: frame.indent
					}];
					frame.childIndex = 0;
					frame.childDocuments = [];
					frame.phase = "children";
				}
				break;
			case "object": {
				const open = node.additionalProperties !== false;
				const entries = Object.entries(node.properties ?? {});
				if (entries.length === 0) finish(typeDocument(open ? "Record<string, JsonValue>" : "Record<string, never>"));
				else {
					frame.kind = "object";
					frame.entries = entries;
					frame.children = entries.map(([, child]) => ({
						node: child,
						indent: frame.indent + 1
					}));
					frame.childIndex = 0;
					frame.childDocuments = [];
					frame.phase = "children";
				}
				break;
			}
			/* v8 ignore next -- assertSupportedJsonSchema narrowed this closed type union. */
			default: finish(typeDocument("unknown"));
		}
	}
	/* v8 ignore next -- every root frame produces one document. */
	return rootDocument ?? typeDocument("unknown");
}
/**
* Map one enforced JSON-Schema node to a TypeScript type literal. Supports
* every unified schema construct and returns `unknown` for malformed or
* unsupported inputs without throwing.
* @param schema - the JSON-Schema node (any shape; hostile inputs degrade).
* @param indent - the indentation level for nested object members.
* @returns the TS type text (multi-line for objects with properties).
*/
function jsonSchemaToTs(schema, indent = 0) {
	try {
		assertSupportedJsonSchema(schema);
		return flattenTypeDocument(renderSupportedSchema(schema, indent));
	} catch {
		return "unknown";
	}
}
/** The fixed model-facing usage contract rendered above the declarations (see the PTC mode Agent Note's "What the model sees"). */
const SDK_INSTRUCTIONS$1 = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` — the body of an async TypeScript function (erasable syntax only — no \`enum\` or namespaces; type annotations are advisory, the code runs type-stripped) — and \`description\`, a short summary of what the program does. The declarations below are SDK bindings for this program. A declaration does not make its name a directly callable tool; only names supplied as separate tool schemas may be called directly.`;
const SDK_PROGRAM_INSTRUCTIONS = `Inside the program:

- Call tools as \`await tools.name(args)\` — quoted access for exotic names: \`tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value. Tool arguments must be lossless JSON.
- A FAILED tool call rejects with \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose \`message\` is human-readable — \`try/catch\` it to handle and continue.
- Independent read-only calls MAY overlap under \`Promise.all\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit results with \`return\` and/or \`console.log(...)\`. Only what you print or return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

Program-only SDK bindings:`;
/** Whether one string schema accepts the literal used by the bash example. */
function acceptsExampleString(schema, value) {
	return schema?.type === "string" && (schema.const === void 0 || schema.const === value) && (schema.enum === void 0 || schema.enum.includes(value));
}
/** Render the bash example only when its literal arguments satisfy the current parameter schema. */
function renderBashExample(schemas) {
	const bash = schemas.find((schema) => schema.name === "bash");
	if (bash === void 0) return "";
	const parameters = bash.parameters;
	if (parameters.type !== "object") return "";
	const required = parameters.required ?? [];
	if (required.some((name) => name !== "command" && name !== "description")) return "";
	if (!acceptsExampleString(parameters.properties?.command, "pwd")) return "";
	const needsDescription = required.includes("description");
	if (needsDescription && !acceptsExampleString(parameters.properties?.description, "Show current directory")) return "";
	return ` When no separate \`bash\` schema is supplied, invoke a declared \`bash\` binding inside \`run_code\`:\n\n\`run_code({ code: "return await tools.bash({ command: 'pwd'${needsDescription ? ", description: 'Show current directory'" : ""} })", description: "Show current directory" })\``;
}
/**
* Render the full `tools:sdk` prompt section: the fixed usage instructions
* plus one `declare const tools` interface covering every given tool.
* Deterministic — tools are emitted in lexicographic name order, so an
* unchanged tool set produces byte-identical text across assemblies. The sort
* is not a total order on byte-equal names, so two schemas sharing a name
* would render in argument order; the caller's visible-capability map is keyed
* by name, so the input never carries a duplicate.
* @param schemas - the tool schemas to declare (the caller excludes
*   `run_code` itself).
* @returns the complete section text.
*/
function renderToolsSdk(schemas) {
	const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	const argsMembers = [];
	const outputMembers = [];
	for (const schema of sorted) {
		argsMembers.push(...docLines$1(schema.description, 1));
		argsMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.parameters, 1)};`);
		outputMembers.push(`${pad$1(1)}${renderKey(schema.name)}: ${jsonSchemaToTs(schema.output, 1)};`);
	}
	const declaration = [
		`interface ToolArgsMap {${argsMembers.length > 0 ? `\n${argsMembers.join("\n")}\n` : ""}}`,
		`interface ToolOutputMap {${outputMembers.length > 0 ? `\n${outputMembers.join("\n")}\n` : ""}}`,
		"type ToolName = keyof ToolOutputMap",
		[
			"declare class ToolCallError extends Error {",
			"  readonly name: \"ToolCallError\";",
			"  readonly toolName: ToolName;",
			"}"
		].join("\n"),
		[
			"declare const tools: {",
			"  [K in ToolName]: (args: ToolArgsMap[K]) => Promise<ToolOutputMap[K]>;",
			"}"
		].join("\n")
	].join("\n\n");
	return `${SDK_INSTRUCTIONS$1}${renderBashExample(sorted)}\n\n${SDK_PROGRAM_INSTRUCTIONS}\n\n\`\`\`ts\ntype JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }\n\n${declaration}\n\`\`\``;
}
/**
* PTC mode codegen — Python flavor. The pure projection from registered tool schemas to the
* Python SDK text the model programs against under `runtime.language === 'python'`. Sibling of
* {@link ./ts-types.ts | ts-types.ts}; the two files are two projections of the same registry
* store, keyed by the loaded {@link @deepseek-ai/dsh-code-runtime#CodeRuntime.language | code
* runtime's language}.
*
* Under `mode: 'ptc'` the native tool schemas are omitted from the request, so this generated
* SDK is the model's ONLY source for each tool's argument names, required fields, types,
* descriptions, and canonical output shapes; under `mode: 'both'` the native schemas ship
* alongside it and it is one of two. Object-shaped arguments and outputs therefore render as one
* named `TypedDict` per tool (and per nested object), not an opaque `dict[str, Any]`, so the
* shape survives into the program under the mode that has nothing else to carry it.
* @module @deepseek-ai/dsh-tools/src/py-types
*/
/**
* The reference grammar's `xid_start xid_continue*` — the set
* `str.isidentifier()` accepts on a CPython whose Unicode tables match the
* engine's. See {@link isBareIdentifier} for what a version skew does.
*/
const IDENTIFIER = /^[\p{XID_Start}_]\p{XID_Continue}*$/u;
/**
* Whether a name can be emitted as a bare Python identifier rather than
* routed to the subscript/`dict[str, Any]` path.
*
* Python identifiers are not ASCII: `路径` is as legal a field name as `path`,
* and rejecting it would degrade the whole enclosing object, dropping every
* field's name, requiredness, and type — information whose only source under
* `mode: 'ptc'` is this generated text.
*
* NFKC stability is a second and separate condition, because CPython
* normalizes identifiers at compile time while JSON keys are compared as
* written: `ﬁeld` would be declared and reachable as `field`, so the SDK would
* advertise a key under a spelling the harness never accepts, and two keys
* that normalize together would collapse into one declaration. Those names
* take the subscript path, which carries their exact bytes.
*
* `IDENTIFIER` matches `str.isidentifier()` (measured on Node 22.23.1 vs
* CPython 3.9.6 tables): the equivalence holds inside the two versions' shared
* tables, and the skew characters below are exactly where that pair diverges.
* The predicate as a whole is deliberately stricter than `isidentifier()`,
* which does not test NFKC stability: `'ﬁeld'.isidentifier()` is True and
* this returns false.
*
* Both conditions are evaluated against the ENGINE's Unicode tables, and the
* two sides are versioned independently — `\p{XID_Start}`/`\p{XID_Continue}`
* follow the running engine (Node 22.23.1 reports Unicode 17.0) while CPython
* follows its own (3.9.6 reports 13.0.0). The skew is not symmetric. A CPython
* older than the engine is the dangerous direction: a character added to either
* property since its tables (U+10570 Vithkuqi and U+1E290 Toto, 14.0; U+1E4D0
* Nag Mundari, 15.0; U+1C89 Cyrillic TJE, 16.0 — ages per `DerivedAge.txt`; all
* four are NFKC-stable and accepted here, and all four are `Cn` on that 3.9.6,
* which rejects them) is emitted bare and its tokenizer refuses the character,
* taking the whole SDK block down — the same parseability invariant
* {@link UNPRINTABLE}, {@link LONE_SURROGATE} and {@link MAX_LIST_NESTING}
* exist for. Both properties carry it: a character added only to `XID_Continue`
* passes the trailing `\p{XID_Continue}*` in a tail position and fails the same
* way — U+200C ZWNJ and U+200D ZWJ are that case, gaining `XID_Continue` in UCD
* 15.1 and absent from it in 13.0.0, 14.0.0 and 15.0.0, so `a\u{200C}b` is
* emitted bare here while `isidentifier()` is False on 3.9.6 and on 3.12.13
* (15.0.0). A CPython newer than the engine only routes a legal name to the
* subscript/`dict[str, Any]` path: less readable, still correct. The NFKC
* condition reduces to the same skew, since normalization stability guarantees
* an assigned character's normalization never changes afterwards.
*
* This predicate is not the only reader of engine tables. {@link camelCase}
* reads them at three further points — its split set, its head test, and its
* `toUpperCase()` case mapping — and this predicate's verdict gates none of
* them: a class name derived there reaches emitted text whenever any object
* shape in the tool's schema declares a `TypedDict`, including for a tool this
* predicate rejected. A tool named `zz-\u{1E4D0}x` with such parameters never
* reaches the skew here (the `-` rejects it outright) yet emits `class
* Zz\u{1E4D0}xArgs`, which that same 3.9.6 refuses — Nag Mundari arrived two
* releases after its tables. The case mapping is a separate table rather than
* an XID membership test, and it fails on names both conditions above accept:
* `\u{019B}` is XID_Start and NFKC-stable, so this predicate accepts it and
* `async def \u{019B}` compiles on 3.9.6, but Node uppercases it to
* `\u{A7DC}` — unassigned in that CPython, whose own `.upper()` is the identity
* here — and the declared `class \u{A7DC}Args` fails with `invalid
* non-printable character U+A7DC`. Closing the exposure therefore covers all
* four read points, not this predicate alone; it needs the target interpreter's
* version, which the backend reporting `language: 'python'` owns; the
* language-dispatch Agent Note records the deferral.
*
* The `ts-types` sibling keeps its own ASCII rule rather than sharing this
* one: ECMAScript identifiers are a different set (`$`) and are never
* normalized, so one predicate cannot be correct for both. ZWJ/ZWNJ are not
* part of that difference — both sets carry them on the engine's tables; what
* separates the two there is the CPython table version above.
* @param name - the raw schema field or tool name.
* @returns whether the name can be emitted bare.
*/
function isBareIdentifier(name) {
	return IDENTIFIER.test(name) && name.normalize("NFKC") === name;
}
/**
* Python hard keywords: reserved everywhere, so a tool or field named
* ``class`` or ``lambda`` is legal on the wire but not as an attribute
* (``tools.class`` would be a SyntaxError in the model program) and not as a
* class-syntax `TypedDict` field. Such a tool renders under subscript access
* and such an object degrades to ``dict[str, Any]`` — the model still reaches
* every tool and field without collisions.
* Soft keywords (``match``, ``case``, ``type``, ``_`` — the language
* reference's whole set) are deliberately ABSENT: each is special in exactly
* one syntactic position — a statement head (``match``, ``type``), a ``match``
* statement's clause head (``case``), or a pattern (``_``) — so ``match: str``
* as a field and ``async def match(...)`` as a method are both legal, and
* including them would needlessly degrade common search/regex tool fields to
* ``dict[str, Any]``. Underscore-leading names are handled separately, not
* here: a non-dunder ``__token`` name-mangles, a dunder present on
* ``object``/``type`` resolves before the proxy hook, and implicit
* special-method lookup bypasses the hook.
*/
const RESERVED = /* @__PURE__ */ new Set([
	"False",
	"None",
	"True",
	"and",
	"as",
	"assert",
	"async",
	"await",
	"break",
	"class",
	"continue",
	"def",
	"del",
	"elif",
	"else",
	"except",
	"finally",
	"for",
	"from",
	"global",
	"if",
	"import",
	"in",
	"is",
	"lambda",
	"nonlocal",
	"not",
	"or",
	"pass",
	"raise",
	"return",
	"try",
	"while",
	"with",
	"yield",
	"__debug__"
]);
/** `typing` symbols this module may emit, in the deterministic import order. */
const TYPING_ORDER = [
	"Any",
	"Literal",
	"NotRequired",
	"Protocol",
	"TypedDict"
];
/** `indent`-deep line prefix (four spaces per level to match PEP 8 output). */
function pad(indent) {
	return "    ".repeat(indent);
}
/**
* The `Cc` code points that survive the whitespace collapse in {@link describe}
* and have no printable form: the C0 controls, DEL, and the C1 controls. Only
* U+0009 to U+000D are absent, because ECMAScript `\s` already collapsed them —
* `\s` is TAB/VT/FF/SP/NBSP/ZWNBSP/Zs plus LF/CR/LS/PS, so no C1 code point is
* in it and the whole U+0080 to U+009F block reaches this rule intact. Those
* are not hypothetical input: they are what Windows-1252 bytes 0x80 to 0x9F
* (smart quotes, em dash) become when decoded as Latin-1.
* CPython rejects source containing a NUL outright
* (`SyntaxError: source code string cannot contain null bytes`), whether it
* sits in a docstring or in a comment, so one such byte anywhere in a schema
* description would make the whole generated SDK unparseable — under
* `mode: 'ptc'`, the model's only declaration of the tools. The rest are
* legal but invisible; escaping them with the same rule keeps the emitted text
* readable and the treatment uniform.
*
* The boundary is the category, not per-code-point addressability: `\xNN`
* addresses U+0000 to U+00FF, so one escape form covers `Cc` exactly. The
* invisible `Cf` formatting characters pass through by design — of them only
* U+00AD soft hyphen would fit `\xNN` at all, and escaping that one while
* U+200B ZWSP, U+200E/U+200F bidi marks, and U+2060 word joiner passed through
* would leave a rule that is neither category- nor addressability-shaped. The
* whole family is legal in both consumers, since only LF and CR terminate a
* Python string literal or a `#` comment. That set is the tokenizer's, not
* `str.splitlines()`': NEL (U+0085), LS (U+2028), and PS (U+2029) split a
* string at run time but do not end a physical line in source — measured on
* CPython 3.9.6 and 3.12.13, each accepted in both positions with the value
* round-tripping — so they are safe raw wherever they reach emitted text
* unescaped, which for all three is `JSON.stringify`, at two call sites:
* {@link pyScalar}'s literal path, and the subscript tool-name comment's own
* call, which a name carrying any of them always reaches, none being
* `XID_Continue`. The `description` path escapes NEL under the class above and
* folds LS and PS in {@link describe}'s `\s+` collapse, both being `\s`.
*/
const UNPRINTABLE = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
/**
* Unpaired surrogate code points, escaped by {@link describe} as `\uNNNN` —
* its own form, since `\xNN` stops at U+00FF. The `u` flag is what makes this
* the LONE ones: in Unicode mode a well-formed pair is a single astral code
* point outside D800 to DFFF, so an emoji in a description survives untouched.
*
* This is the NUL case from {@link UNPRINTABLE}, not the invisible-character
* case. Python source must be UTF-8-encodable and a lone surrogate is not, so
* `compile()` raises `UnicodeEncodeError: surrogates not allowed` for one
* anywhere in the text — measured on 3.9 for a string literal and for a `#`
* comment alike. A raw or MCP tool description reaches this: `JSON.parse` on a
* wire `"\ud800"` escape yields exactly such a code point.
*/
const LONE_SURROGATE = /[\ud800-\udfff]/gu;
/**
* The collapsed one-line `description` of a schema node (byte-stable across
* formatting churn), or `undefined` when the node carries none. Every caller
* passes an object — a validated property node, the `ToolSdkSchema` itself, or
* the `{ description }` wrapper {@link docLines} synthesizes — so only the
* description field needs guarding. A description that collapses
* to nothing (empty, or whitespace only) is `undefined` too: it documents the
* node no better than an absent one, and emitting it would leave an empty
* `"""` docstring or a bare `#   ` line in the SDK. Only ECMAScript whitespace
* folds, so a description of whitespace plus one surviving control character is
* NOT absent: it collapses to that character's visible escape.
*
* Control characters left over after the whitespace collapse are rendered as
* their `\xNN` escapes (see {@link UNPRINTABLE}) and unpaired surrogates as
* their `\uNNNN` escapes (see {@link LONE_SURROGATE}); the escape's own backslash is
* emitted literally by both consumers, since {@link docLines} doubles it into a
* Python source escape and a `#` comment carries it verbatim.
*/
function describe(schema) {
	const description = schema.description;
	if (typeof description !== "string") return void 0;
	const collapsed = description.replace(/\s+/g, " ").replace(UNPRINTABLE, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`).replace(LONE_SURROGATE, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`).trim();
	return collapsed.length === 0 ? void 0 : collapsed;
}
/**
* One-line docstring for a tool `description`, or no lines when there is none.
* Backslashes are doubled first, every quote is escaped, and a trailing
* backslash cannot survive: a description ending in `"` or an odd backslash
* would otherwise merge with (or escape) the closing triple quote and make
* the generated block — PTC mode's only SDK — syntactically invalid Python.
*/
function docLines(description, indent) {
	const collapsed = describe({ description });
	if (collapsed === void 0) return [];
	const escaped = collapsed.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
	return [`${pad(indent)}"""${escaped}"""`];
}
/**
* CamelCase a name into a Python type identifier: non-identifier characters
* split words, `_` splits too (it is `XID_Continue`, so the split set names it
* explicitly), and a head that cannot start an identifier takes a `Tool`
* prefix. Unicode survives, so a `路径` field yields `路径`-based class names
* instead of collapsing to the bare prefix. A character that is not
* `XID_Continue` splits even when it is a letter, so a name whose NFKC folding
* would leave the identifier set is not carried through — the split set is the
* grammar's, not an ASCII approximation of it.
*
* The result is NFKC-normalized: these names are generated, never matched
* against a JSON key, so normalizing is free here and keeps what CPython
* compiles identical to what is emitted — unlike {@link isBareIdentifier},
* which must reject unstable names outright. Normalizing AFTER the prefix
* decision is what makes that hold at the seam the prefix creates: `Tool` +
* a combining-mark head composes there (`U+0301` gives `Tooĺ`, U+013A), so
* normalizing only the un-prefixed part would emit a name CPython compiles to
* a different symbol. The second call is idempotent on the un-prefixed arm.
*
* The split set, the head test, and `toUpperCase()` all read the engine's
* Unicode tables, so this function carries the same version skew
* {@link isBareIdentifier} documents, by paths independent of it: a class name
* derived here reaches emitted text whenever any object shape in the tool's
* schema declares a `TypedDict`, and the predicate's verdict on the tool name
* does not gate that. The case mapping is the one that can fail on a name the
* predicate accepted; the worked example is there.
* @param raw - the schema field or tool name to derive from.
* @returns a class-name segment safe to emit.
*/
function camelCase(raw) {
	const joined = raw.split(/[^\p{XID_Continue}]+|_+/u).filter((part) => part.length > 0).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("").normalize("NFKC");
	return (/^\p{XID_Start}/u.test(joined) ? joined : `Tool${joined}`).normalize("NFKC");
}
/** Class-name base cap keeping each emitted name — and total text — linear in schema depth. */
const MAX_CLASS_NAME_BASE = 120;
/**
* Deepest `list[…]` nesting emitted into one annotation before the item type
* degrades to `Any`. CPython's tokenizer rejects a logical line holding more
* than 200 simultaneously-open brackets (`MAXLEVEL`, `SyntaxError: too many
* nested parentheses`), so an array chain deeper than that would render an SDK
* block that is not valid Python at all — the same failure the docstring
* escaping in {@link docLines} exists to prevent. 180 leaves headroom for the
* few brackets an annotation can add around the chain, all of which count
* toward the same limit. Per emission site, counting brackets open at the
* chain's innermost point:
*
* - Return annotation, `async def f(self, args: X) -> chain:` — 180 `list[`
*   plus an innermost `Literal[`. The parameter list's `(` closed at the `)`
*   before the `->`, so it is NOT open here: 181.
* - TypedDict field, `field: NotRequired[chain]` — a class-body line with no
*   other open bracket, and its children start at `listDepth: 1` to reserve
*   the `NotRequired[`, so 179 `list[` plus `Literal[`: 181. Required fields
*   share that start for uniformity, spending one level of representable depth
*   on a bracket they never emit.
* - Argument annotation, `async def f(self, args: chain) -> Y:` — the `(` IS
*   still open around it: 180 `list[` plus `Literal[` plus the paren, 182, the
*   worst case. Reachable only through a raw `register()` whose `parameters`
*   is an array reached from the root through `oneOf` arms alone — the root
*   array itself, or one nested under any depth of unions, since an arm
*   inherits the enclosing depth unchanged (`A | B` opens no bracket). An
*   object ancestor takes it out of this case: its fields restart the chain at
*   the 181 site. `defineTool` compiles an object root, so the annotation is a
*   bare TypedDict class name or a one-bracket `dict[str, Any]` when that
*   object degrades — never a chain.
*
* A CPython grammar limit, not a deployment choice, so it is fixed rather than
* configurable. The sibling `ts-types` renderer needs no counterpart: nothing
* in the TypeScript grammar bounds nesting, and its SDK block is never type-
* checked. Only bracket nesting counts — a `oneOf` renders as a flat `A | B`
* chain and nested objects render as separate `class` statements, so neither
* accumulates open brackets at any depth. The invariant this cap serves is
* grammatical validity; see the `oneOf` arm in {@link renderType} for the one
* interpreter limit deliberately left uncapped.
*/
const MAX_LIST_NESTING = 180;
/**
* Cap a class-name base at {@link MAX_CLASS_NAME_BASE} (see the callers for
* why capping keeps the render linear). `slice` counts UTF-16 code units, so
* an astral character straddling the boundary would be cut in half and leave a
* lone surrogate — not an identifier character, and not even well-formed text;
* drop it rather than emit it.
*/
function capClassNameBase(base) {
	if (base.length <= MAX_CLASS_NAME_BASE) return base;
	const capped = base.slice(0, MAX_CLASS_NAME_BASE);
	return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
}
/**
* Reserve a unique class name from a base, suffixing `2`, `3`, … on collision.
* The base is capped at {@link MAX_CLASS_NAME_BASE} first: child class names
* derive from their parent's allocated name (`ParentChild`), so an unbounded
* schema of single-field objects would otherwise grow each name by one field
* per level and the sum of all names to Θ(depth²). Capping the base keeps each
* name — and the total emitted text — linear in depth. Collisions resume from
* the per-base counter in `state.nextClassCounter` rather than rescanning from
* `2`, so a deep chain sharing one capped base stays O(1) per allocation
* (amortized) instead of Θ(depth²) in time.
*/
function allocateClassName(base, state) {
	const capped = capClassNameBase(base);
	let name = capped;
	if (state.usedClassNames.has(name)) {
		let n = state.nextClassCounter.get(capped) ?? 2;
		while (state.usedClassNames.has(`${capped}${n}`)) n++;
		name = `${capped}${n}`;
		state.nextClassCounter.set(capped, n + 1);
	}
	state.usedClassNames.add(name);
	return name;
}
/**
* Append a child-name segment to a parent class-name base, capping the result
* at {@link MAX_CLASS_NAME_BASE}. Capping AT PROPAGATION (not only inside
* {@link allocateClassName}) keeps each level O(1): a deep `oneOf`- or
* object-chain would otherwise carry an ever-growing ConsString down the tree
* and re-materialize it (via `.length`/`.slice`) at every level — Θ(depth²).
* The bounded base plus the collision counter still yields unique names.
*
* The join is NFKC-normalized because both sides are separately normalized yet
* their concatenation need not be: a base ending in a Hangul L jamo or LV
* syllable composes with a following V or T jamo head (`가` + `ᆨ` gives `각`),
* so the emitted class name would differ from the symbol CPython compiles, and
* two byte-distinct names could fold onto one — `usedClassNames` dedupes by the
* raw bytes, so the collision counter would not see it. Normalizing costs
* O(cap + segment) per level, the same order as the `slice` it feeds. The other
* two join points need no counterpart: `Args`/`Output` start with `A`/`O` and
* {@link allocateClassName}'s suffix is digits, none of which compose backwards.
*/
function childClassName(base, segment) {
	return capClassNameBase(`${base}${segment}`.normalize("NFKC"));
}
/**
* Render one validated scalar as Python literal text (`True`/`False`,
* JSON-quoted strings, bare numbers). `null` cannot reach here: the `null`
* type renders directly as `None`, and the unified validator rejects a null
* `const`/`enum` entry on every other scalar type.
*
* A beyond-safe-range integral number takes `BigInt` digits rather than
* `String`: Python integers are arbitrary-precision, so the emitted digits ARE
* the value the model programs against, and `String` can give a different
* integer than the double holds (`2 ** 60` prints the rounded `...847000`, not
* the exact `...846976`) or no integer literal at all (`1e21` prints `1e+21`).
* `String`'s rounding is not a bug in it: `Number::toString` emits the shortest
* decimal string that re-reads to the same double, then pads to the exponent
* with zeros (1 significant digit for `1e20`, 16 for `2 ** 60`) — and when the
* shortest string is shorter than the double's exact value, those padded digits
* name an integer no double holds. Passing one back would have to cross the
* argument boundary as a JSON number — a double again — so the SDK would
* document a value no program can pass. `BigInt` needs no case split: where
* `String` is already exact (`2 ** 53`, `1e20`) the two agree byte for byte,
* and where it is not, `BigInt` is the exact one. The TS flavor needs no
* counterpart at all: its literal is re-read by a JS parser back into the same
* double.
*
* `JSON.stringify` is also what keeps this path's output parseable, and it is
* the only thing that does. It covers both classes of hazard: the two kinds of
* code point CPython refuses anywhere in source — NUL among the C0 controls,
* and the whole D800–DFFF unpaired-surrogate block, escaped under ES2019
* well-formed stringification, which the engines range guarantees — and the
* ones that break this line in particular, a bare `"` closing the literal
* early, a trailing odd backslash eating the closing quote, and a bare LF/CR
* ending it before its terminator. The `description` path carries
* {@link UNPRINTABLE} and {@link LONE_SURROGATE} because nothing quotes it,
* and folds newlines in {@link describe}.
*
* That leans on a coincidence worth naming: every escape `JSON.stringify` can
* emit (`\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t`, `\uXXXX`) is also a Python
* escape denoting the same character, so the emitted `Literal[...]` both
* parses and decodes back to the value the schema declared. DEL, the C1
* controls (NEL among them), and LS/PS (U+2028/U+2029) do reach it raw —
* legal but invisible, byte-for-byte as in the TS flavor; escaping them is a
* both-flavors change. Those last three are legal here for the reason
* {@link UNPRINTABLE} records: they are `str.splitlines()` boundaries, not
* tokenizer line terminators. The subscript tool-name comment quotes its name
* through its own call to the same `JSON.stringify`, never through this
* function, and inherits both halves — escapes and pass-throughs alike.
*/
function pyScalar(value) {
	if (value === true) return "True";
	if (value === false) return "False";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) return BigInt(value).toString();
	return String(value);
}
/**
* Render a validated scalar `const`/`enum` as `Literal[...]`, falling back to
* the broad type. Deliberately deviates from PEP 586, which restricts `Literal`
* parameters to int/bool/str/bytes/enum/None: a non-integral number
* `const`/`enum` emits a float literal (`Literal[1.5]`) a strict checker would
* reject. An integral one does not deviate — {@link pyScalar} emits int digits,
* including for the beyond-safe-range values it widens through `BigInt`, and
* PEP 586 admits int parameters. Harmless either way — the stub is advisory
* prompt text, only required to parse — and keeping the exact value
* communicates the constraint to the model.
*/
function renderConstrainedScalar(node, broad, state) {
	if (node.const !== void 0) {
		state.typing.add("Literal");
		return `Literal[${pyScalar(node.const)}]`;
	}
	if (node.enum !== void 0) {
		state.typing.add("Literal");
		return `Literal[${node.enum.map(pyScalar).join(", ")}]`;
	}
	return broad;
}
/**
* Map one JSON-Schema node to a Python type expression, threading `state` to
* collect the `TypedDict` declarations and `typing` symbols a full render
* needs. `className` is the name to give an object node with properties (and
* the prefix for its nested objects). Handles every unified schema construct —
* `oneOf` (→ `X | Y`), `const`/`enum` (→ `Literal[...]`), `integer` (→ `int`),
* `null` (→ `None`) — and degrades an unsupported or malformed schema to `Any`
* without throwing, the same trusted-after-validation stance as the sibling
* {@link ./ts-types.ts | ts-types} renderer. {@link jsonSchemaToPy} is the
* context-free entry point; this is the collecting core.
*/
function renderType(schema, className, state) {
	const newFrame = (schema, className, listDepth) => ({
		schema,
		className,
		phase: "start",
		listDepth,
		children: [],
		childIndex: 0,
		childTypes: [],
		entries: []
	});
	try {
		assertSupportedJsonSchema(schema);
		const frames = [newFrame(schema, className, 0)];
		let result;
		const finish = (type) => {
			frames.pop();
			const parent = frames.at(-1);
			if (parent === void 0) result = type;
			else parent.childTypes.push(type);
		};
		while (frames.length > 0) {
			const frame = frames.at(-1);
			/* v8 ignore next -- the loop condition guarantees a current frame. */
			if (frame === void 0) break;
			if (frame.phase === "children") {
				if (frame.childIndex < frame.children.length) {
					const child = frame.children[frame.childIndex];
					/* v8 ignore next -- childIndex is bounded by children.length. */
					if (child === void 0) throw new Error("missing python render child");
					frame.childIndex++;
					frames.push(newFrame(child.schema, child.className, child.listDepth));
					continue;
				}
				if (frame.kind === "oneOf") {
					let union = "";
					for (const [index, childType] of frame.childTypes.entries()) union = index === 0 ? childType : `${union} | ${childType}`;
					finish(union);
					continue;
				}
				if (frame.kind === "array") {
					/* v8 ignore next -- the ?? arm needs a childless array frame, which start never builds. */
					finish(`list[${frame.childTypes[0] ?? "Any"}]`);
					continue;
				}
				const node = frame.node;
				const name = frame.allocated;
				/* v8 ignore next -- typeddict frames always set node and allocated at start. */
				if (node === void 0 || name === void 0) throw new Error("missing typeddict frame state");
				const required = new Set(node.required);
				const lines = [`class ${name}(TypedDict):`];
				for (let index = 0; index < frame.entries.length; index++) {
					const entry = frame.entries[index];
					const fieldType = frame.childTypes[index];
					/* v8 ignore next -- entries and childTypes correspond one-to-one. */
					if (entry === void 0 || fieldType === void 0) throw new Error("missing typeddict field type");
					const [field, fieldSchema] = entry;
					const description = describe(fieldSchema);
					if (description !== void 0) lines.push(`${pad(1)}# ${description}`);
					if (required.has(field)) lines.push(`${pad(1)}${field}: ${fieldType}`);
					else {
						state.typing.add("NotRequired");
						lines.push(`${pad(1)}${field}: NotRequired[${fieldType}]`);
					}
				}
				if (node.additionalProperties !== false) lines.push(`${pad(1)}# Additional keys beyond those declared are allowed.`);
				if (lines.length === 1) lines.push(`${pad(1)}pass`);
				state.classes.push(lines.join("\n"));
				finish(name);
				continue;
			}
			frame.phase = "children";
			const node = frame.schema;
			if (node.oneOf !== void 0) {
				frame.kind = "oneOf";
				frame.children = node.oneOf.map((branch, index) => ({
					schema: branch,
					className: childClassName(frame.className, `${index + 1}`),
					listDepth: frame.listDepth
				}));
				continue;
			}
			if (node.type === void 0) {
				state.typing.add("Any");
				finish("Any");
				continue;
			}
			switch (node.type) {
				case "string":
					finish(renderConstrainedScalar(node, "str", state));
					break;
				case "number":
					finish(renderConstrainedScalar(node, "float", state));
					break;
				case "integer":
					finish(renderConstrainedScalar(node, "int", state));
					break;
				case "boolean":
					finish(renderConstrainedScalar(node, "bool", state));
					break;
				case "null":
					finish("None");
					break;
				case "array":
					if (node.items === void 0) {
						state.typing.add("Any");
						finish("list[Any]");
						break;
					}
					if (frame.listDepth >= MAX_LIST_NESTING) {
						state.typing.add("Any");
						finish("Any");
						break;
					}
					frame.kind = "array";
					frame.children = [{
						schema: node.items,
						className: frame.className,
						listDepth: frame.listDepth + 1
					}];
					break;
				case "object": {
					const entries = Object.entries(node.properties ?? {});
					if (className === "" || !entries.every(([name]) => isBareIdentifier(name) && !RESERVED.has(name) && !(name.startsWith("__") && !name.endsWith("__")))) {
						state.typing.add("Any");
						finish("dict[str, Any]");
						break;
					}
					if (entries.length === 0 && node.additionalProperties !== false) {
						state.typing.add("Any");
						finish("dict[str, Any]");
						break;
					}
					frame.kind = "typeddict";
					frame.node = node;
					frame.allocated = allocateClassName(frame.className, state);
					state.typing.add("TypedDict");
					frame.entries = entries;
					/* v8 ignore next -- allocated is always set before children are built. */
					frame.children = entries.map(([field, child]) => ({
						schema: child,
						className: childClassName(frame.allocated ?? "", camelCase(field)),
						listDepth: 1
					}));
					break;
				}
				/* v8 ignore next 4 -- assertSupportedJsonSchema narrowed this closed type union. */
				default:
					state.typing.add("Any");
					finish("Any");
			}
		}
		/* v8 ignore next -- every root frame produces one expression. */
		return result ?? "Any";
	} catch {
		state.typing.add("Any");
		return "Any";
	}
}
/** The fixed model-facing usage contract rendered above the declarations. */
const SDK_INSTRUCTIONS = `## Writing code for run_code

\`run_code\` takes two required arguments: \`code\` — the body of an async Python function (top-level \`await\` and \`return\` both work) — and \`description\`, a short summary of what the program does. At run time exactly two of the names declared below are bound: \`tools\` and \`ToolCallError\`. Everything else is a STATIC STUB describing argument and return types — in particular the \`TypedDict\` classes do NOT exist at run time, so build arguments as plain \`dict\`/\`list\` JSON values: \`await tools.name({"field": 1})\`, never \`FooArgs(field=1)\`, which raises \`NameError\`. Inside the program:

- Call tools as \`await tools.name(args)\` — subscript access for exotic, reserved, or underscore-leading names: \`await tools["my-tool"](args)\`. Every call resolves to the tool's typed canonical JSON value (each method's return type below). Tool arguments must be lossless JSON.
- A FAILED tool call raises \`ToolCallError\`, whose \`toolName\` identifies the failed tool and whose message is human-readable — wrap in \`try/except\` to handle and continue.
- Independent read-only calls MAY overlap under \`asyncio.gather\` (safe calls run concurrently; mutating calls run alone, in submission order). Sequence dependent work with \`await\`.
- Emit the run's answer with \`print(...)\` and/or a top-level \`return <value>\`; the returned value must be lossless JSON. Only what you print and return is program output. A successful tool result containing an image is attached after the run so you can inspect it on the next step; every other intermediate result stays out of the conversation, so extract just what you need.

The available tools:`;
/**
* Render the full `tools:sdk` prompt section under `runtime.language ===
* 'python'`: the Python-flavored usage instructions plus one named `TypedDict`
* per tool argument or output object (and per nested object) and one awaitable
* method per visible tool on a `Tools` protocol — typed args in, the tool's
* canonical output value out — with a `tools: Tools` singleton the model calls
* into. The `typing` import line lists exactly the symbols the render used.
* Deterministic — tools are emitted in lexicographic name order, and class
* declarations precede the protocol in that same order (nested classes before
* the parent that references them), so an unchanged tool set produces
* byte-identical text across assemblies. The sort is not a total order on
* byte-equal names, so two schemas sharing a name would render in argument
* order; the caller's visible-capability map is keyed by name, so the input
* never carries a duplicate.
* @param schemas - the tool schemas plus canonical output schemas to declare
*   (the caller excludes `run_code` itself).
* @returns the complete section text.
*/
function renderToolsSdkPy(schemas) {
	const sorted = [...schemas].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	const state = {
		classes: [],
		usedClassNames: /* @__PURE__ */ new Set(),
		nextClassCounter: /* @__PURE__ */ new Map(),
		typing: /* @__PURE__ */ new Set(["Protocol"])
	};
	const members = [];
	let statements = 0;
	for (const schema of sorted) {
		const argType = renderType(schema.parameters, `${camelCase(schema.name)}Args`, state);
		const outputType = renderType(schema.output, `${camelCase(schema.name)}Output`, state);
		if (isBareIdentifier(schema.name) && !RESERVED.has(schema.name) && !schema.name.startsWith("_")) {
			const doc = docLines(schema.description, 2);
			members.push(doc.length > 0 ? `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}:` : `${pad(1)}async def ${schema.name}(self, args: ${argType}) -> ${outputType}: ...`);
			members.push(...doc);
			statements += 1;
		} else {
			members.push(`${pad(1)}# tools[${JSON.stringify(schema.name)}](args: ${argType}) -> ${outputType}`);
			const description = describe(schema);
			if (description !== void 0) members.push(`${pad(1)}#   ${description}`);
		}
	}
	const body = (statements > 0 ? members : [`${pad(1)}pass`, ...members]).join("\n");
	const imports = TYPING_ORDER.filter((symbol) => state.typing.has(symbol));
	const classBlock = state.classes.length > 0 ? `${state.classes.join("\n\n")}\n\n` : "";
	return `${SDK_INSTRUCTIONS}\n\n\`\`\`python\n${`from typing import ${imports.join(", ")}\n\nclass ToolCallError(Exception):
    toolName: str\n\n${classBlock}class Tools(Protocol):\n${body}\n\ntools: Tools`}\n\`\`\``;
}
/**
* Tool registry, model presentation modes, and pre/guard/around/post/result
* execution pipeline.
* @module @deepseek-ai/dsh-tools
*/
/**
* Language → SDK-section renderer. The registry looks up the loaded
* `ctx.codeRuntime.language` in this table when assembling the `tools:sdk`
* section under a non-native mode; a runtime whose language is not a key
* fails the assembly loudly (same idiom as `toolOrder` violations). Adding a
* new backend language is three parallel edits — a {@link CodeSdkLanguage}
* member, an entry here, and a `RUN_CODE_FLAVORS` entry in `ptc.ts` for
* its `run_code` schema strings — plus the renderer function this table points
* at. The `satisfies` clause pins this table's key set to that union, which
* the flavor table is checked against too, so any of the three left out is a
* typecheck failure. What no check reaches is the prose that names the values
* instead of deriving them: the seam's `dsh-code-runtime` README pair, its
* `CodeRuntime.language` JSDoc, and `docs/subsystems/code-runtime.md`
* with its zh pair, plus this package's own README pair and the
* {@link Config.mode} JSDoc.
*/
/**
* Prompt order of the `ptc` collapse statement: after the persona and before
* per-tool guidance, so the model reads which tools it may call before it
* reads what each one is for.
*/
const COLLAPSE_SECTION_ORDER = FIRST_PARTY_SECTION_ORDER.PTC_ONLY;
/**
* The model-facing statement of the `ptc` collapse. Names the consequence
* (the call fails) and the route (inside the program), because a rule the
* model can only discover by being denied is one it corrects too late.
*/
const PTC_ONLY_INSTRUCTION = `\`${RUN_CODE_NAME}\` is the only tool you can call directly — a tool call naming any other tool fails. Reach every tool the SDK declares below from inside the program.`;
const SDK_RENDERERS = {
	typescript: renderToolsSdk,
	python: renderToolsSdkPy
};
/**
* Scheduler entry point omitted from the generated named service API.
* @internal
*/
const TOOL_RUNTIME_SCHEDULER = Symbol("@deepseek-ai/dsh-tools.scheduler");
/** Canonical error code for cancellation after a tool body was invoked. */
const TOOL_ABORTED = "ABORTED";
/** Canonical error code for cancellation before a tool body was invoked. */
const TOOL_ABORTED_BEFORE_DISPATCH = "ABORTED_BEFORE_DISPATCH";
/**
* Thrown (internally) when the model requests a tool that isn't registered.
* Extends {@link HarnessError} (`code: 'UNKNOWN_TOOL'`) so an unknown-tool
* failure is as routable as a tool-thrown one — retry/sandbox/replay code can
* distinguish it from a tool body's own error.
*/
var ToolNotFoundError = class extends HarnessError {
	/**
	* @param toolName - the name the caller asked for.
	* @param reachableFrom - how the model reaches this tool instead, when the
	*   name IS visible and only the presentation denies calling it directly.
	*   Omitted for a name that is registered nowhere.
	*/
	constructor(toolName, reachableFrom) {
		let message;
		if (typeof toolName !== "string" || toolName.trim().length === 0) message = "unknown tool: the model emitted a tool call with an empty name ——【工具调用 name 为空】可能原因：① 适配器协议不匹配（在「设置 → 模型」确认该供应商实际使用 Chat Completions / Responses / Anthropic Messages 协议，与所选 api 一致）；② 中转网关（如 tokenrhythm）剥离或损坏了 tool_call/name 字段；③ 长上下文下模型输出 JSON 崩坏。请先核对协议、绕过中转网关直连重试。";
		else if (reachableFrom === void 0) message = `unknown tool "${toolName}"`;
		else message = `unknown tool "${toolName}": ${reachableFrom}`;
		super(message, "UNKNOWN_TOOL");
		this.name = "ToolNotFoundError";
	}
};
/** Thrown when a tool body or post-policy value violates its declared output. */
var ToolOutputError = class extends HarnessError {
	/** Schema/value violations in validation order. */
	violations;
	constructor(toolName, violations) {
		super(`tool "${toolName}" returned invalid output: ${violations.join("; ")}`, "INVALID_TOOL_OUTPUT");
		this.name = "ToolOutputError";
		this.violations = violations;
	}
};
/** Convert one projector exception into the canonical invalid-output failure. */
function projectionError(toolName, projector, error) {
	return new ToolOutputError(toolName, [`output.${projector} failed: ${errorMessage(error)}`]);
}
/** Snapshot one projector result before later durable-result materialization. */
function snapshotProjection(toolName, projector, candidate) {
	try {
		const detached = snapshotJsonValue(candidate);
		if (detached === void 0) throw new ToolOutputError(toolName, [`output.${projector} returned non-lossless JSON`]);
		return detached;
	} catch (error) {
		if (error instanceof ToolOutputError) throw error;
		throw projectionError(toolName, projector, error);
	}
}
/** Snapshot one body or policy value into the canonical invalid-output failure class. */
function snapshotToolValue(toolName, candidate) {
	try {
		const detached = snapshotJsonValue(candidate);
		if (detached === void 0) throw new ToolOutputError(toolName, ["value is not lossless JSON"]);
		return detached;
	} catch (error) {
		if (error instanceof ToolOutputError) throw error;
		throw new ToolOutputError(toolName, [`value snapshot failed: ${errorMessage(error)}`]);
	}
}
/**
* Best-effort human-readable message from an arbitrary thrown value: Error
* instances use `.message`; non-Error objects with a string `message`
* property (e.g. `throw { message: 'denied' }`) use it too; everything else
* is stringified.
*/
function errorMessage(error) {
	try {
		if (error instanceof Error) return error.message;
		if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") return error.message;
		return String(error);
	} catch {
		return "<unprintable thrown value>";
	}
}
/** Derive one failure message from policy feedback without changing its rendered blocks. */
function failureMessageFromContent(content) {
	const text = content.map((block) => block.type === "text" ? block.text : `[${block.type} content]`).join("\n");
	return text.length > 0 ? text : "tool result blocked by post-execute policy";
}
/** Snapshot and freeze one durable tool-result projection or reject lossy data. */
function materializePresentation(candidate) {
	const detached = snapshotJsonValue(candidate);
	if (detached === void 0) throw new TypeError("tool result must be losslessly JSON-serializable");
	return deepFreeze(detached);
}
/** Structured `{ name, code }` for a thrown HarnessError, else undefined. */
function errorInfo(error) {
	try {
		return error instanceof HarnessError ? {
			name: error.name,
			code: error.code
		} : void 0;
	} catch {
		return;
	}
}
/** One scope's complete tool-registry contribution. */
var ToolLayer = class {
	tools;
	restrictions = new AnonymousEntries();
	guards = new AnonymousEntries();
	/**
	* Presentation this scope's agent declared for itself, shadowing the
	* deployment default. One cell rather than an entry table: two answers to
	* "which form does the model see" is a contradiction, not a merge.
	*/
	mode;
	constructor(scope) {
		this.tools = new NamedEntries((name) => /* @__PURE__ */ new Error(scope === void 0 ? `tool "${name}" is already registered (for a per-agent variant, register through that agent's \`agent.ctx\` instead)` : `tool "${name}" is already registered in this scope`));
	}
	/** Whether every contribution table in this aggregate layer is empty. */
	isEmpty() {
		return this.tools.isEmpty() && this.restrictions.isEmpty() && this.guards.isEmpty() && this.mode === void 0;
	}
	/** Whether every compiled restriction in this layer admits a global tool name. */
	admits(name) {
		for (const filter of this.restrictions.values()) if (filter.allow !== void 0 && !filter.allow.has(name) || filter.deny !== void 0 && filter.deny.has(name)) return false;
		return true;
	}
	/** First monotonic denial from this layer's live guard registrations. */
	guardReason(exec) {
		for (const guard of this.guards.values()) {
			const reason = guard(exec);
			if (reason !== void 0) return reason;
		}
	}
};
/** Resolve the run_code overlap cap at the owning config boundary (direct construction bypasses the Loader schema). */
function resolveMaxParallelSubCalls(value) {
	const maxParallelSubCalls = value ?? 10;
	if (!Number.isInteger(maxParallelSubCalls) || maxParallelSubCalls < 1) throw new Error("maxParallelSubCalls must be a positive integer");
	return maxParallelSubCalls;
}
/**
* Tool registry and execution pipeline. Scoped registrations shadow globals;
* one visibility resolver feeds presentation, lookup, and dispatch.
*/
var ToolRuntime = class extends Service {
	static inject = ["systemPrompt"];
	static Config = Schema.object({
		mode: Schema.union([
			"native",
			"ptc",
			"both"
		]).default("native"),
		maxParallelSubCalls: Schema.natural().min(1).default(10)
	});
	/** Internal staged view consumed by `dsh-agent-loop`'s parallel scheduler. */
	[TOOL_RUNTIME_SCHEDULER] = {
		prepare: (exec) => this.prepareScheduledExecution(exec),
		dispatch: (exec) => this.dispatchScheduledExecution(exec),
		finalize: (exec, result) => this.finalizeScheduledExecution(exec, result),
		finish: (exec, result) => this.finishScheduledExecution(exec, result)
	};
	/**
	* dsh-desktop compat: global-symbol scheduler mirror.
	* Symbol() keys are copy-unique: when a second dsh-tools instance ends up
	* in-process (a plugin bundling its own nested copy), dsh-agent-loop's
	* module-local symbol misses that instance's scheduler field and tool
	* turns died with "Cannot read properties of undefined (reading
	* 'prepare')". Symbol.for is process-global, so the agent-loop guard
	* resolves the scheduler across copies. Kernel-internal callers keep
	* using the private symbol.
	*/
	[Symbol.for("@deepseek-ai/dsh-tools.scheduler")] = this[TOOL_RUNTIME_SCHEDULER];
	/** Context deferred by a running tool body, keyed by its scheduler-owned execution. */
	deferredContexts = /* @__PURE__ */ new WeakMap();
	/** Executions whose tool body declared the current turn complete. */
	concludingExecutions = /* @__PURE__ */ new WeakSet();
	/** Original caller cancellation, kept outside the wrapper-mutable execution object. */
	cancellationStates = /* @__PURE__ */ new WeakMap();
	/** Definition-owned final content transform snapshotted before policy begins. */
	contentFinalizers = /* @__PURE__ */ new WeakMap();
	layers = new ScopedLayers((scope) => new ToolLayer(scope), () => {
		this.ctx.emit("tools/change");
	});
	/** Presentation for scopes that declare none; {@link presentAs} shadows it per scope. */
	defaultMode;
	maxParallelSubCalls;
	/**
	* Reserved presentation transport, kept outside the filterable registration
	* layers. Built on first need rather than at construction: which agents run
	* a PTC mode is no longer known when the service is constructed, and the
	* transport is stateless beyond its closures over `this`.
	*/
	ptcTransport;
	constructor(ctx, config = {}) {
		super(ctx, "tools");
		this.defaultMode = config.mode ?? "native";
		this.maxParallelSubCalls = resolveMaxParallelSubCalls(config.maxParallelSubCalls);
		ctx.systemPrompt.tools((context) => this.wireSchemas(context.scope));
		if (this.defaultMode !== "native") {
			ctx.systemPrompt.section(this.collapseSection());
			ctx.systemPrompt.section(this.sdkSection());
		}
	}
	/**
	* The prompt statement of the `ptc` executor collapse, registered wherever
	* {@link sdkSection} is and rendering empty outside an effective `ptc`.
	*
	* Every tool contributes its own guidance section naming its tool, none of
	* them qualify how that tool is reached, and they all render before the SDK.
	* Without this the model reads a catalog of tools it is told to use and no
	* statement that only `run_code` may be called, so it emits a native call,
	* receives `UNKNOWN_TOOL` for a tool the prompt just declared, and concludes
	* the deployment is inconsistent. {@link COLLAPSE_SECTION_ORDER} places the rule
	* before that guidance rather than after it.
	*
	* `both` renders empty: native calls do execute there, so the rule is false.
	* @returns the section registration.
	*/
	collapseSection() {
		return {
			name: "tools:ptc-only",
			order: COLLAPSE_SECTION_ORDER,
			text: (context) => this.modeFor(context.scope) === "ptc" ? PTC_ONLY_INSTRUCTION : ""
		};
	}
	/**
	* The generated-SDK prompt section, registered globally by a PTC mode
	* deployment and per scope by {@link presentAs}.
	*
	* The body regenerates from the CALLING scope, and renders empty for an
	* agent presenting natively — an agent that opted out under a PTC mode
	* deployment still sees the global registration, and an empty section is
	* dropped from the rendered prompt.
	* @returns the section registration.
	*/
	sdkSection() {
		return {
			name: "tools:sdk",
			order: SDK_SECTION_ORDER,
			text: (context) => {
				const mode = this.modeFor(context.scope);
				if (mode === "native") return "";
				const runtime = this.requireCodeRuntime(mode);
				const render = SDK_RENDERERS[runtime.language];
				/* v8 ignore next -- requireCodeRuntime rejects an unknown language before this runs. */
				if (render === void 0) throw new Error(`dsh-tools: no SDK renderer for ${runtime.language}`);
				return render(this.sdkSchemas(context.scope));
			}
		};
	}
	/**
	* The presentation one scope's agent sees: its own declaration, else the
	* deployment default.
	* @param scope - the calling agent, or undefined for the global view.
	* @returns the resolved presentation mode.
	*/
	modeFor(scope) {
		const layers = this.layers.chainLayers(scope);
		for (let index = layers.length - 1; index >= 0; index -= 1) {
			const mode = layers[index]?.mode;
			if (mode !== void 0) return mode;
		}
		return this.defaultMode;
	}
	/**
	* The reserved `run_code` transport, built on first need.
	*
	* It never enters the global layer: per-agent restrictions must not remove
	* it, and a scoped registration must not shadow it. The visibility resolver
	* appends it after resolving the filterable global/scoped capability layers,
	* and only for scopes whose mode actually presents it.
	* @returns the shared transport definition.
	*/
	requireCodeTransport() {
		this.ptcTransport ??= createRunCodeTool(this, {
			requireRuntime: () => this.requireCodeRuntime(this.defaultMode),
			peekRuntime: () => this.ctx.get("codeRuntime"),
			maxParallel: this.maxParallelSubCalls,
			shapeDispatchLog: (dispatch) => this.shapeDispatchLog(dispatch)
		});
		return this.ptcTransport;
	}
	/**
	* Present the calling scope's tools in `mode` instead of the deployment
	* default. Nearest scope on the chain wins, so a preset's standing
	* declaration covers every agent joined under it.
	*
	* Scoped only, and one declaration per scope: this is how an agent preset
	* composes PTC mode agents beside native ones in the same process, and a
	* process-global override would be the `mode` config field instead.
	* @param mode - the presentation the covered agents' models see.
	* @returns the exact disposer that restores the deployment default.
	*/
	presentAs(mode) {
		const ctx = this.ctx;
		if (scopeOf(ctx) === void 0) throw new Error("tools.presentAs() requires a scoped context (agent.ctx): a context-global presentation is the `mode` config field on the tools row");
		return ctx.effect(function* () {
			yield this.layers.effect(ctx, (layer) => {
				if (layer.mode !== void 0) throw new Error(`tools.presentAs("${mode}") conflicts with "${layer.mode}" already declared for this scope; one composition selects one presentation`);
				layer.mode = mode;
				return () => {
					layer.mode = void 0;
				};
			}, { label: "tools.presentAs()" });
			if (mode !== "native") {
				yield ctx.systemPrompt.section(this.collapseSection());
				yield ctx.systemPrompt.section(this.sdkSection());
			}
		}.bind(this), "tools.presentAs()");
	}
	/**
	* Build one scope's wire schemas and names for prompt-order validation.
	* Restrictions do not make known tools invalid, but a mode collapse does.
	*/
	wireSchemas(scope) {
		const view = this.view(scope);
		const mode = this.modeFor(scope);
		if (mode === "native") return {
			schemas: [...view.visible.values()].map((definition) => this.schemaOf(definition, false)),
			knownNames: [...view.knownNames]
		};
		this.requireCodeRuntime(mode);
		const schemas = [...view.visible.values()].map((definition) => this.schemaOf(definition, false));
		if (mode === "ptc") return {
			schemas: schemas.filter((schema) => schema.name === RUN_CODE_NAME),
			knownNames: [RUN_CODE_NAME]
		};
		return {
			schemas,
			knownNames: [...view.knownNames, RUN_CODE_NAME]
		};
	}
	/**
	* Resolve the code runtime or throw the actionable misconfiguration error.
	* Read at use time (assembly / run_code execution), NOT via static
	* `inject`: an inject entry would hold `ctx.tools` — and every tool plugin
	* behind it — hostage to a code runtime existing even under `mode:
	* 'native'`.
	*
	* Assembly and `run_code` execution read separately, so the language is not
	* bound to a request. Harmless while one published backend exists — both
	* reads return the same flavor — but a reload that swapped in a second
	* language between them would hand a program written against one SDK to the
	* other. Binding it is deferred until a second backend ships (the first
	* point it is testable); rationale in the
	* [language-dispatch note](../../../../.agents/notes/implemented/feature/2026-07-31-ptc-language-dispatch.md).
	*/
	requireCodeRuntime(mode) {
		const runtime = this.ctx.get("codeRuntime");
		if (!runtime) throw new Error(`dsh-tools: mode "${mode}" requires a code runtime — load a ctx.codeRuntime implementation (e.g. @deepseek-ai/dsh-code-runtime-worker-thread) or set tools mode to "native"`);
		if (!Object.hasOwn(SDK_RENDERERS, runtime.language)) {
			const known = Object.keys(SDK_RENDERERS).map((name) => JSON.stringify(name)).join(", ");
			throw new Error(`dsh-tools: no SDK renderer registered for runtime language ${JSON.stringify(runtime.language)} (known: ${known})`);
		}
		return runtime;
	}
	/**
	* Register globally or in the calling agent scope. Scoped tools shadow
	* globals; duplicates within one layer and the reserved `run_code` name fail.
	* @param definition - tool schema, execution, and optional finalization/presentation callbacks.
	* @returns the exact disposer that unregisters the tool.
	*/
	register(definition) {
		const name = definition.name;
		const output = definition.output;
		if (output === void 0 || typeof output !== "object" || typeof output.render !== "function" || output.presentationMeta !== void 0 && typeof output.presentationMeta !== "function") throw new TypeError(`tool "${name}" must declare output { schema, render, presentationMeta? }`);
		assertSupportedJsonSchema(output.schema);
		const timeoutMs = definition.timeoutMs;
		if (timeoutMs !== void 0 && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) throw new TypeError(`tool "${name}" timeoutMs must be a positive finite number`);
		if (name === "run_code") throw new Error(`tool name "${RUN_CODE_NAME}" is reserved for the PTC mode presentation transport and cannot be registered or shadowed`);
		return this.layers.effect(this.ctx, (layer) => layer.tools.insert(name, definition), { label: "tools.register()" });
	}
	/**
	* Restrict global tools for the calling agent scope. Empty filters, unknown
	* names, scope-local names, and reserved transport names fail. Restrictions
	* intersect; scoped registrations remain visible.
	* @param filter - global-tool mask: `allow` (keep only) and/or `deny` (remove).
	* @returns the exact disposer that lifts this restriction.
	*/
	restrict(filter) {
		const scope = scopeOf(this.ctx);
		if (scope === void 0) throw new Error("tools.restrict() requires a scoped context (agent.ctx): a context-global restriction would mask every agent — deny the tool for the intended agent instead");
		const allow = filter.allow;
		const deny = filter.deny;
		if (allow === void 0 && deny === void 0) throw new Error("tools.restrict({}) is a no-op: pass `allow` and/or `deny` (an empty filter is almost always a materialized-empty-config bug)");
		const compiled = {
			...allow !== void 0 ? { allow: new Set(allow) } : {},
			...deny !== void 0 ? { deny: new Set(deny) } : {}
		};
		if ([...allow ?? [], ...deny ?? []].includes("run_code")) throw new Error(`tools.restrict() cannot name reserved PTC mode presentation transport "${RUN_CODE_NAME}"; restrict end-capability tools instead`);
		const known = this.view(scope).restrictableNames;
		const unknown = [...allow ?? [], ...deny ?? []].filter((name) => !known.has(name));
		if (unknown.length > 0) throw new Error(`tools.restrict() names unknown global tool${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")}; known global tools: ${[...known].sort().join(", ") || "(none)"}`);
		return this.layers.effect(this.ctx, (layer) => layer.restrictions.append(compiled), { label: "tools.restrict()" });
	}
	/**
	* Register a monotonic guard after the extensible `tools/pre-execute`
	* waterfall. A plain-context guard applies globally; one registered through
	* `agent.ctx` applies only to that agent. Any matching guard may deny by
	* returning a reason, while no guard can force-allow a call another guard
	* denied. The exact effect disposer is returned for ordered ownership and
	* HMR cleanup.
	* @param guard - synchronous check; a returned string denies the execution.
	* @returns the exact disposer that unregisters the guard.
	*/
	guard(guard) {
		return this.layers.effect(this.ctx, (layer) => layer.guards.append(guard), {
			label: "tools.guard()",
			notify: false
		});
	}
	/** First monotonic denial from the global then the scope chain's guard layers, farthest first. */
	guardReason(exec) {
		const globalReason = this.layers.global.guardReason(exec);
		if (globalReason !== void 0) return globalReason;
		if (exec.agent === void 0) return void 0;
		for (const layer of this.layers.chainLayers(exec.agent)) {
			const reason = layer.guardReason(exec);
			if (reason !== void 0) return reason;
		}
	}
	/**
	* Resolve every registry fact one scope needs in one layer traversal. The
	* visible map applies restrictions to the INHERITED surface, then the
	* scope's own registrations and the reserved presentation transport; the
	* other sets retain the pre-restriction facts needed by restriction and
	* prompt-order validation.
	*
	* A restriction filters what a scope inherits — the global layer and every
	* ancestor layer on its chain — and never what its OWN layer registers.
	* That exemption is what a per-child capability filter has to keep intact:
	* the delegation runtime registers a child's reporting and structured-output
	* tools into the child's own layer, and a filter naming the capabilities the
	* child may use must not strip the machinery it answers through.
	*
	* Reading the exempt set as "the global layer" instead of "not mine" held
	* only while every model-facing tool sat in the host composition. Once
	* presets moved them onto the agent plane they became an ANCESTOR
	* contribution, so a child's filter silently stopped constraining anything
	* it was given.
	* @param scope - the viewing scope (the agent), or undefined for the global view.
	* @returns the complete derived view for that scope.
	*/
	view(scope) {
		const layers = this.layers.chainLayers(scope);
		const own = this.layers.peek(scope);
		const inherited = new Map(this.layers.global.tools.entries());
		for (const layer of layers) {
			if (layer === own) continue;
			for (const [name, definition] of layer.tools.entries()) inherited.set(name, definition);
		}
		const visible = /* @__PURE__ */ new Map();
		const knownNames = /* @__PURE__ */ new Set();
		const restrictableNames = /* @__PURE__ */ new Set();
		for (const [name, definition] of inherited) {
			knownNames.add(name);
			restrictableNames.add(name);
			if (layers.every((layer) => layer.admits(name))) visible.set(name, definition);
		}
		if (own !== void 0) for (const [name, definition] of own.tools.entries()) {
			knownNames.add(name);
			visible.set(name, definition);
		}
		if (this.modeFor(scope) !== "native") visible.set(RUN_CODE_NAME, this.requireCodeTransport());
		return {
			visible,
			knownNames,
			restrictableNames
		};
	}
	/**
	* Look up a tool as one scope sees it (scoped
	* shadows global; a restricted-away global reads as absent). Presenters pass
	* the calling agent so the rendered card matches the definition that
	* actually executed.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @returns the definition the scope resolves, or undefined when none is visible.
	*/
	get(name, scope) {
		return this.view(scope).visible.get(name);
	}
	/**
	* Resolve the definition that MAY EXECUTE for a call, applying the mode
	* collapse at the operation boundary that owns it. The registry view
	* (`get`) is presentation-agnostic; here a MODEL-DIRECT call under `ptc`
	* may only name the reserved `run_code` transport, while a nested
	* sub-dispatch (a `parent` token set — the `run_code` SDK calling a tool
	* it bound) may call any visible tool. Denial surfaces as `UNKNOWN_TOOL`
	* through the executor, matching an absent definition.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
	* @returns the definition that may run, or undefined when the call must be rejected.
	*/
	resolveExecution(name, scope, nested) {
		const tool = this.get(name, scope);
		if (tool === void 0) return void 0;
		if (this.collapses(name, scope, nested)) return void 0;
		return tool;
	}
	/**
	* Project visible definitions onto the allowlisted model-facing schema fields,
	* excluding execution and presentation callbacks.
	* @param scope - the viewing scope (the agent); omitted = the global view.
	* @returns one deep-cloned schema per visible tool.
	*/
	schemas(scope) {
		return [...this.view(scope).visible.values()].map((definition) => this.schemaOf(definition, true));
	}
	/** Project visible callable tools onto the generated PTC mode SDK contract. */
	sdkSchemas(scope) {
		return [...this.view(scope).visible.values()].filter((definition) => definition.name !== RUN_CODE_NAME).map((definition) => {
			const output = snapshotJsonValue(definition.output.schema);
			/* v8 ignore next -- registration already validated and retained this schema as lossless JSON. */
			if (output === void 0) throw new Error(`tool "${definition.name}" output schema must be lossless JSON before SDK projection`);
			return {
				...this.schemaOf(definition, true),
				output
			};
		});
	}
	/** Project one definition onto the model-facing schema fields. */
	schemaOf(definition, detachParameters) {
		const { name, description, parameters } = definition;
		const detached = detachParameters ? snapshotJsonValue(parameters) : parameters;
		if (detached === void 0) throw new Error(`tool "${name}" parameters must be lossless JSON before schema projection`);
		return {
			name,
			description,
			parameters: detached
		};
	}
	/**
	* Classify a pending call through the caller's visible tool definition. Only
	* an exact `true` is parallel; unknown, hidden, undeclared, invalid, or
	* throwing classifiers are exclusive.
	* @param exec - call name, parsed arguments, and optional agent scope.
	* @returns the fail-closed scheduling mode.
	*/
	executionMode(exec) {
		const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
		if (!tool?.isConcurrencySafe) return { kind: "exclusive" };
		try {
			return tool.isConcurrencySafe(exec.arguments) === true ? { kind: "parallel" } : { kind: "exclusive" };
		} catch {
			return { kind: "exclusive" };
		}
	}
	/**
	* Run the `tools/ptc-dispatch-log` waterfall over one settled sub-dispatch
	* and return the content the bridge should log on `tool/code-dispatch`.
	* Contained: when a listener throws, the method logs the original settled
	* content; that failure must not fail the dispatch or omit the settle event. Private:
	* the ONE consumer is the `run_code` bridge this registry constructs, which
	* receives it as a capability parameter (the `requireRuntime` idiom) — the
	* waterfall, not this invoker, is the public extension point.
	*/
	async shapeDispatchLog(dispatch) {
		try {
			return await this.ctx.waterfall(scopeTarget(this, dispatch.agent), "tools/ptc-dispatch-log", dispatch, () => Promise.resolve(dispatch.content));
		} catch (error) {
			this.ctx.logger.warn(`tools: ptc-dispatch-log listener failed for ${dispatch.name}: ${errorMessage(error)}; logging the original settled content`);
			return dispatch.content;
		}
	}
	/**
	* Whether the `ptc` mode collapse denies a model-direct call: only the
	* reserved `run_code` transport may be named. Nested sub-dispatches (a
	* `parent` token set) bypass the collapse. One home for the
	* security-relevant predicate, shared by {@link resolveExecution} and
	* {@link createExecution} so the two can never drift apart.
	*
	* Resolved through {@link modeFor}, NOT `defaultMode`: an agent given `ptc`
	* by an agent preset under a native deployment is the composition
	* `dsh-agent-tool-presentation` exists for, and reading the deployment default would
	* leave exactly that agent uncollapsed — announcing one surface while
	* executing another, which is the bypass this collapse closes.
	* @param name - the tool name as registered.
	* @param scope - the viewing scope whose effective presentation mode applies.
	* @param nested - whether the call is a transport sub-dispatch, not a model-direct call.
	*/
	collapses(name, scope, nested) {
		return !nested && this.modeFor(scope) === "ptc" && name !== "run_code";
	}
	/**
	* Execute through pre-policy, guards, around-dispatch, post-policy,
	* definition-owned content finalization, and final notification. Tool and
	* listener failures resolve as materialized error results; an invisible tool
	* reports `UNKNOWN_TOOL`. The returned outcome is the same lossless, frozen
	* snapshot final observers receive. Cancellation
	* arriving after entry and before final result materialization skips a
	* not-yet-started body with `ABORTED_BEFORE_DISPATCH` or replaces a
	* successful started outcome with `ABORTED`; already-started work is still
	* drained and may retain a tool-owned structured error.
	* @param exec - the typed same-process call input. The registry assigns its
	*   correlation token before policy begins.
	* @returns the materialized final result.
	*/
	async execute(exec) {
		return this.prepareExecution(exec, (prepared) => this.completeScheduledExecution(prepared));
	}
	async completeScheduledExecution(prepared) {
		switch (prepared.kind) {
			case "dispatch": {
				const dispatched = await this.dispatchScheduledExecution(prepared.exec);
				return dispatched.kind === "post-result" ? await this.finalizeScheduledExecution(prepared.exec, dispatched.result) : this.finishScheduledExecution(prepared.exec, dispatched.result);
			}
			case "post-result": return await this.finalizeScheduledExecution(prepared.exec, prepared.result);
			case "final-result": return this.finishScheduledExecution(prepared.exec, prepared.result);
			/* v8 ignore next -- closed-union exhaustiveness guard */
			default: return assertNever(prepared, "scheduled tool preparation");
		}
	}
	createExecution(exec) {
		const deferredContexts = [];
		const token = createExecutionToken();
		const callId = exec.callId;
		const rootCallId = exec.rootCallId ?? callId;
		const name = exec.name;
		const agent = exec.agent;
		const parent = exec.parent;
		const signal = exec.signal;
		const visible = this.get(name, agent);
		const collapsed = visible !== void 0 && this.collapses(name, agent, parent !== void 0);
		const concludingExecutions = this.concludingExecutions;
		const base = {
			token,
			callId,
			rootCallId,
			name,
			signal,
			...agent !== void 0 ? { agent } : {},
			...parent !== void 0 ? { parent } : {},
			deferContext(context) {
				deferredContexts.push(context);
			},
			concludeTurn() {
				concludingExecutions.add(this);
			}
		};
		const capturedFinalizer = visible?.finalizeContent?.bind(visible);
		const finalizerFor = () => collapsed && !signal.aborted ? void 0 : capturedFinalizer;
		try {
			const detached = snapshotJsonValue(exec.arguments);
			if (detached === void 0) throw new TypeError("tool execution arguments must be losslessly JSON-serializable");
			const execution = {
				...base,
				arguments: deepFreeze(detached)
			};
			this.deferredContexts.set(execution, deferredContexts);
			this.contentFinalizers.set(execution, finalizerFor());
			this.cancellationStates.set(execution, {
				callerSignal: signal,
				bodyInvoked: false
			});
			if (collapsed) {
				if (signal.aborted) return {
					kind: "final-result",
					exec: execution,
					result: toolAbortedBeforeDispatchResult()
				};
				return {
					kind: "final-result",
					exec: execution,
					result: toolErrorResult(new ToolNotFoundError(name, `only \`${RUN_CODE_NAME}\` is callable directly — call \`${name}\` from inside a \`${RUN_CODE_NAME}\` program instead`))
				};
			}
			return {
				kind: "ready",
				exec: execution
			};
		} catch (error) {
			const execution = {
				...base,
				arguments: void 0
			};
			this.contentFinalizers.set(execution, finalizerFor());
			return {
				kind: "final-result",
				exec: execution,
				result: toolErrorResult(error)
			};
		}
	}
	/**
	* Run the ordered pre-execute and monotonic guard stages for the scheduler.
	* @param input - the caller-supplied execution input.
	* @returns the prepared execution plus the next scheduler stage.
	* @internal
	*/
	async prepareScheduledExecution(input) {
		return this.prepareExecution(input, (prepared) => prepared);
	}
	async prepareExecution(input, next) {
		const created = this.createExecution(input);
		if (created.kind !== "ready") return next(created);
		const exec = created.exec;
		if (this.callerCancelled(exec)) return next({
			kind: "final-result",
			exec,
			result: toolAbortedBeforeDispatchResult()
		});
		try {
			const carrier = scopeTarget(this, exec.agent);
			const gate = await this.ctx.waterfall(carrier, "tools/pre-execute", exec, () => Promise.resolve({ kind: "allow" }));
			const askResolution = gate.kind === "ask" ? await this.serviceAsk(exec, gate) : {
				decision: gate,
				approvalCancelled: false
			};
			const { decision } = askResolution;
			if (this.callerCancelled(exec) && askResolution.approvalCancelled) return await next({
				kind: "post-result",
				exec,
				result: toolAbortedBeforeDispatchResult()
			});
			const denialReason = decision.kind === "allow" ? this.guardReason(exec) : decision.reason;
			if (denialReason !== void 0) return await next({
				kind: "post-result",
				exec,
				result: this.materializeFinalResult({
					content: [{
						type: "text",
						text: `Error: ${denialReason}`
					}],
					isError: true,
					error: { message: denialReason }
				})
			});
			if (this.callerCancelled(exec)) return await next({
				kind: "post-result",
				exec,
				result: toolAbortedBeforeDispatchResult()
			});
			return await next({
				kind: "dispatch",
				exec
			});
		} catch (error) {
			return next({
				kind: "final-result",
				exec,
				result: toolErrorResult(error)
			});
		}
	}
	/** Whether the original caller signal is currently aborted. */
	callerCancelled(exec) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		return state.callerSignal.aborted;
	}
	/** Canonical cancellation outcome selected by whether the tool body started. */
	cancellationResult(exec, prior) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		return state.bodyInvoked ? toolAbortedResult(prior) : toolAbortedBeforeDispatchResult(prior);
	}
	/**
	* Dispatch the registered body with the original caller signal fused back
	* into any around-wrapper replacement. Cancellation never abandons the body:
	* a started promise reaches quiescence before its outcome becomes `ABORTED`.
	*/
	async dispatchToolBody(exec) {
		const state = this.cancellationStates.get(exec);
		/* v8 ignore next -- only registry-minted executions reach the staged scheduler methods */
		if (state === void 0) throw new Error("tool registry scheduler invariant violated: missing cancellation state");
		const wrapperSignal = exec.signal;
		const fused = fuseToolSignals(state.callerSignal, wrapperSignal);
		const signal = fused.signal;
		if (isAborted(signal)) {
			fused.dispose();
			return toolAbortedBeforeDispatchResult();
		}
		exec.signal = signal;
		try {
			const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
			if (!tool) throw new ToolNotFoundError(exec.name);
			state.bodyInvoked = true;
			const returned = await tool.execute(exec.arguments, exec);
			const result = this.createSuccessResult(exec, tool, returned);
			return isAborted(signal) ? toolAbortedResult(result) : result;
		} catch (error) {
			return toolErrorResult(error);
		} finally {
			fused.dispose();
			exec.signal = wrapperSignal;
		}
	}
	/**
	* Run around-dispatch and the tool body. Tool and unknown-tool failures still
	* receive post-execute; pipeline failures are already final.
	* @param exec - the prepared execution.
	* @returns whether the result still needs post-execute.
	* @internal
	*/
	async dispatchScheduledExecution(exec) {
		try {
			const mutableExec = exec;
			const carrier = scopeTarget(this, exec.agent);
			const result = await this.ctx.waterfall(carrier, "tools/execute", mutableExec, () => this.dispatchToolBody(mutableExec));
			const normalized = this.normalizeDispatchResult(exec, result);
			const deferredContexts = this.deferredContexts.get(exec);
			/* v8 ignore next -- dispatch only receives executions minted by this registry's prepare stage */
			if (deferredContexts === void 0) throw new Error("tool registry scheduler invariant violated: unprepared execution");
			const resultWithDeferredContexts = deferredContexts.length === 0 ? normalized : this.markCanonical(exec, {
				...normalized,
				additionalContexts: [...deferredContexts, ...normalized.additionalContexts ?? []]
			});
			return {
				kind: "post-result",
				result: this.callerCancelled(exec) && !resultWithDeferredContexts.isError ? this.cancellationResult(exec, resultWithDeferredContexts) : resultWithDeferredContexts
			};
		} catch (error) {
			return {
				kind: "final-result",
				result: toolErrorResult(error)
			};
		}
	}
	/**
	* Run ordered post-execute, then apply definition-owned content finalization,
	* materialize, and notify the final outcome.
	* @param exec - the prepared execution.
	* @param result - dispatch/pre result that still needs post-execute.
	* @returns the materialized final result.
	* @internal
	*/
	async finalizeScheduledExecution(exec, result) {
		try {
			const postResult = await this.postExecute(exec, result);
			return this.finishScheduledExecution(exec, this.callerCancelled(exec) && !postResult.isError ? this.cancellationResult(exec, postResult) : postResult);
		} catch (error) {
			return this.finishScheduledExecution(exec, toolErrorResult(error));
		}
	}
	/**
	* Materialize the candidate, apply definition-owned content finalization,
	* then materialize and notify the authoritative result.
	* @param exec - the prepared execution.
	* @param result - final result.
	* @returns the materialized final result.
	* @internal
	*/
	finishScheduledExecution(exec, result) {
		let materializedResult;
		try {
			materializedResult = this.materializeFinalResult(result);
		} catch (error) {
			materializedResult = this.materializeFinalResult(toolErrorResult(error));
		}
		let finalResult;
		try {
			finalResult = this.materializeFinalResult(this.applyFinalContent(exec, materializedResult));
		} catch (error) {
			finalResult = this.materializeFinalResult(toolErrorResult(error));
		}
		this.notifyResult(exec, finalResult);
		return finalResult;
	}
	/** Apply the snapshotted tool-owned content transform without exposing other result fields. */
	applyFinalContent(exec, result) {
		const finalizeContent = this.contentFinalizers.get(exec);
		if (finalizeContent === void 0) return result;
		const content = finalizeContent(exec, result);
		return content === void 0 ? result : {
			...result,
			content
		};
	}
	/** Notify observers without exposing a mutation or error channel into the outcome. */
	notifyResult(exec, result) {
		Object.freeze(exec);
		const { name: toolName, callId } = exec;
		const reportFailure = (error) => {
			this.ctx.logger.warn(`tool "${toolName}" (${callId}): tools/result observer failed: ${errorMessage(error)}`);
		};
		const callbacks = this.ctx.events.dispatch("emit", [
			scopeTarget(this, exec.agent),
			"tools/result",
			exec,
			result
		]);
		for (const callback of callbacks) try {
			const returned = callback(exec, result);
			Promise.resolve(returned).catch(reportFailure);
		} catch (error) {
			reportFailure(error);
		}
	}
	/**
	* Resolve an `ask` decision to allow/deny through the approval seam. The
	* seam is consumed opportunistically with `ctx.get('approval')` — a
	* deployment that composes no ApprovalService keeps the historical degrade
	* to deny, and an unmount mid-session degrades the same way on the next ask.
	* An agent-less execution also degrades: without an agent there is no
	* session to audit to and no UI to route to. Otherwise the outcome maps
	* one-to-one — `allowed-once` proceeds; the three non-grants deny with
	* distinct reasons so the model can tell a human "no" from an absent
	* approval channel.
	*/
	async serviceAsk(exec, ask) {
		const approval = this.ctx.get("approval");
		if (approval === void 0) return {
			decision: {
				kind: "deny",
				reason: ask.reason ?? `tool "${exec.name}" requires approval (not yet supported)`
			},
			approvalCancelled: false
		};
		if (exec.agent === void 0) return {
			decision: {
				kind: "deny",
				reason: `tool "${exec.name}" requires approval, but the call has no agent to route it through`
			},
			approvalCancelled: false
		};
		const outcome = await approval.request({
			agent: exec.agent,
			toolName: exec.name,
			callId: exec.callId,
			...ask.reason !== void 0 ? { reason: ask.reason } : {},
			signal: exec.signal
		});
		switch (outcome) {
			case "allowed-once": return {
				decision: { kind: "allow" },
				approvalCancelled: false
			};
			case "rejected": return {
				decision: {
					kind: "deny",
					reason: `the user rejected tool "${exec.name}"`
				},
				approvalCancelled: false
			};
			case "cancelled": return {
				decision: {
					kind: "deny",
					reason: `approval for tool "${exec.name}" was cancelled`
				},
				approvalCancelled: true
			};
			case "unavailable": return {
				decision: {
					kind: "deny",
					reason: `tool "${exec.name}" requires approval, but no approval channel is available`
				},
				approvalCancelled: false
			};
			default: return assertNever(outcome, "ApprovalOutcome");
		}
	}
	/**
	* Run the `tools/post-execute` waterfall over a dispatched `result` and apply
	* its {@link PostToolDecision}: `accept` keeps the call successful (replacing
	* `content` when given), `block` turns it into an `isError` whose content is
	* the corrective `feedback`. Either decision may attach `additionalContexts`,
	* which are ferried on the returned result for the loop's active-batch FIFO.
	* Context deferred by the tool body survives an accepted result but is
	* discarded when the outer call is blocked; a block exposes only context the
	* blocking decision explicitly supplied.
	* Runs inside `execute`'s outer try/catch (a throwing listener → isError).
	*/
	async postExecute(exec, result) {
		const decision = await this.ctx.waterfall(scopeTarget(this, exec.agent), "tools/post-execute", exec, result, () => Promise.resolve({ kind: "accept" }));
		const decisionContexts = decision.additionalContexts ?? [];
		if (decision.kind === "block") {
			const message = failureMessageFromContent(decision.feedback);
			return this.markCanonical(exec, {
				content: decision.feedback,
				isError: true,
				error: { message },
				...decisionContexts.length > 0 ? { additionalContexts: decisionContexts } : {}
			});
		}
		if (Object.hasOwn(decision, "content") && Object.hasOwn(decision, "value")) throw new TypeError("tools/post-execute accept decision cannot replace both value and content");
		const additionalContexts = [...result.additionalContexts ?? [], ...decisionContexts];
		if (Object.hasOwn(decision, "value")) {
			if (result.isError) throw new TypeError("tools/post-execute cannot replace the value of a failed result");
			const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
			if (tool === void 0) throw new ToolNotFoundError(exec.name);
			const replaced = this.createSuccessResult(exec, tool, decision.value);
			return this.markCanonical(exec, {
				...replaced,
				...additionalContexts.length > 0 ? { additionalContexts } : {}
			});
		}
		return this.markCanonical(exec, {
			...result,
			...decision.content !== void 0 ? { content: decision.content } : {},
			...additionalContexts.length > 0 ? { additionalContexts } : {}
		});
	}
	/** Registry-normalized results and the exact dispatch that validated each value. */
	canonicalResults = /* @__PURE__ */ new WeakMap();
	/** Mark one registry-normalized result as canonical only for its owning dispatch. */
	markCanonical(exec, result) {
		this.canonicalResults.set(result, exec.token);
		return result;
	}
	/** Snapshot, validate, render, and optionally project one successful body value. */
	createSuccessResult(exec, tool, candidate) {
		const detached = snapshotToolValue(tool.name, candidate);
		const violations = validateJsonSchemaValue(tool.output.schema, detached, "value");
		if (violations.length > 0) throw new ToolOutputError(tool.name, violations);
		const value = deepFreeze(detached);
		let rendered;
		try {
			rendered = tool.output.render(exec.arguments, value);
		} catch (error) {
			throw projectionError(tool.name, "render", error);
		}
		const content = snapshotProjection(tool.name, "render", rendered);
		let meta;
		if (exec.parent === void 0 && tool.output.presentationMeta !== void 0) {
			let projected;
			try {
				projected = tool.output.presentationMeta(exec.arguments, value);
			} catch (error) {
				throw projectionError(tool.name, "presentationMeta", error);
			}
			meta = snapshotProjection(tool.name, "presentationMeta", projected);
		}
		const concludesTurn = this.concludingExecutions.has(exec);
		return this.markCanonical(exec, this.materializeFinalResult({
			isError: false,
			value,
			content,
			...meta !== void 0 ? { meta } : {},
			...concludesTurn ? { concludesTurn: true } : {}
		}));
	}
	/** Normalize an around-dispatch wrapper's authored result through the owning output contract. */
	normalizeDispatchResult(exec, result) {
		if (this.canonicalResults.get(result) === exec.token) return result;
		if (result.isError) return this.markCanonical(exec, {
			isError: true,
			error: result.error,
			content: result.content,
			...result.meta !== void 0 ? { meta: result.meta } : {},
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		});
		const tool = this.resolveExecution(exec.name, exec.agent, exec.parent !== void 0);
		if (tool === void 0) throw new ToolNotFoundError(exec.name);
		const normalized = this.createSuccessResult(exec, tool, result.value);
		return this.markCanonical(exec, {
			...normalized,
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		});
	}
	/** Materialize the authoritative commit outcome once, immediately before `tools/result`. */
	materializeFinalResult(result) {
		const presentation = {
			content: result.content,
			...result.meta !== void 0 ? { meta: result.meta } : {},
			...result.additionalContexts !== void 0 ? { additionalContexts: result.additionalContexts } : {}
		};
		if (result.isError) return materializePresentation({
			isError: true,
			error: result.error,
			...presentation
		});
		return deepFreeze({
			...materializePresentation({
				isError: false,
				...presentation,
				...result.concludesTurn === true ? { concludesTurn: true } : {}
			}),
			value: result.value
		});
	}
};
/** Mint a same-process correlation token whose identity is its value. */
function createExecutionToken() {
	return Symbol("dsh.tool.execution");
}
function toolErrorResult(error) {
	const info = errorInfo(error);
	const message = errorMessage(error);
	return {
		content: [{
			type: "text",
			text: `Error: ${message}`
		}],
		isError: true,
		error: {
			message,
			...info ? { info } : {}
		}
	};
}
/** Read live abort state across an await without treating it as synchronously immutable. */
function isAborted(signal) {
	return signal.aborted;
}
/**
* Fuse caller and wrapper cancellation without nesting `AbortSignal.any`.
* Keeping the relay dispatch-scoped also removes listeners when work settles.
*/
function fuseToolSignals(caller, wrapper) {
	if (caller === wrapper) return {
		signal: caller,
		dispose() {}
	};
	const controller = new AbortController();
	let listening = false;
	const dispose = () => {
		if (!listening) return;
		listening = false;
		caller.removeEventListener("abort", abortFromCaller);
		wrapper.removeEventListener("abort", abortFromWrapper);
	};
	const abortFrom = (source) => {
		const reason = source.reason;
		controller.abort(reason);
		dispose();
	};
	const abortFromCaller = () => {
		abortFrom(caller);
	};
	const abortFromWrapper = () => {
		abortFrom(wrapper);
	};
	if (wrapper.aborted) abortFromWrapper();
	else if (caller.aborted) abortFromCaller();
	else {
		listening = true;
		caller.addEventListener("abort", abortFromCaller, { once: true });
		wrapper.addEventListener("abort", abortFromWrapper, { once: true });
	}
	return {
		signal: controller.signal,
		dispose
	};
}
/** Canonical result when cancellation supersedes success after body invocation. */
function toolAbortedResult(prior) {
	const additionalContexts = prior?.additionalContexts ?? [];
	return {
		content: [{
			type: "text",
			text: "Error: tool call aborted"
		}],
		isError: true,
		error: {
			message: "tool call aborted",
			info: {
				name: "AbortError",
				code: TOOL_ABORTED
			}
		},
		...additionalContexts.length > 0 ? { additionalContexts } : {}
	};
}
/** Canonical result when cancellation prevents tool body invocation. */
function toolAbortedBeforeDispatchResult(prior) {
	const additionalContexts = prior?.additionalContexts ?? [];
	return {
		content: [{
			type: "text",
			text: "Error: tool call aborted before dispatch"
		}],
		isError: true,
		error: {
			message: "tool call aborted before dispatch",
			info: {
				name: "AbortError",
				code: TOOL_ABORTED_BEFORE_DISPATCH
			}
		},
		...additionalContexts.length > 0 ? { additionalContexts } : {}
	};
}
//#endregion
//#region ../../../dsh-desktop/node_modules/cosmokit/lib/index.cjs
var require_lib$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var index_exports = {};
	__export(index_exports, {
		Binary: () => Binary,
		Time: () => Time,
		arrayBufferToBase64: () => arrayBufferToBase64,
		arrayBufferToHex: () => arrayBufferToHex,
		base64ToArrayBuffer: () => base64ToArrayBuffer,
		camelCase: () => camelCase,
		camelize: () => camelize,
		capitalize: () => capitalize,
		clone: () => clone,
		contain: () => contain,
		deduplicate: () => deduplicate,
		deepEqual: () => deepEqual,
		defineProperty: () => defineProperty,
		difference: () => difference,
		filterKeys: () => filterKeys,
		formatProperty: () => formatProperty,
		hexToArrayBuffer: () => hexToArrayBuffer,
		hyphenate: () => hyphenate,
		intersection: () => intersection,
		is: () => is,
		isNonNullable: () => isNonNullable,
		isNullable: () => isNullable,
		isPlainObject: () => isPlainObject,
		makeArray: () => makeArray,
		mapValues: () => mapValues,
		noop: () => noop,
		omit: () => omit,
		paramCase: () => paramCase,
		pick: () => pick,
		remove: () => remove,
		sanitize: () => sanitize,
		snakeCase: () => snakeCase,
		trimSlash: () => trimSlash,
		uncapitalize: () => uncapitalize,
		union: () => union,
		valueMap: () => mapValues
	});
	module.exports = __toCommonJS(index_exports);
	function noop() {}
	function isNullable(value) {
		return value === null || value === void 0;
	}
	function isNonNullable(value) {
		return !isNullable(value);
	}
	function isPlainObject(data) {
		return data && typeof data === "object" && !Array.isArray(data);
	}
	function filterKeys(object, filter) {
		return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
	}
	function mapValues(object, transform) {
		return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
	}
	function pick(source, keys, forced) {
		if (!keys) return { ...source };
		const result = {};
		for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
		return result;
	}
	function omit(source, keys) {
		if (!keys) return { ...source };
		const result = { ...source };
		for (const key of keys) Reflect.deleteProperty(result, key);
		return result;
	}
	function defineProperty(object, key, value) {
		return Object.defineProperty(object, key, {
			writable: true,
			value,
			enumerable: false
		});
	}
	function contain(array1, array2) {
		return array2.every((item) => array1.includes(item));
	}
	function intersection(array1, array2) {
		return array1.filter((item) => array2.includes(item));
	}
	function difference(array1, array2) {
		return array1.filter((item) => !array2.includes(item));
	}
	function union(array1, array2) {
		return Array.from(/* @__PURE__ */ new Set([...array1, ...array2]));
	}
	function deduplicate(array) {
		return [...new Set(array)];
	}
	function remove(list, item) {
		const index = list?.indexOf(item);
		if (index >= 0) {
			list.splice(index, 1);
			return true;
		} else return false;
	}
	function makeArray(source) {
		return Array.isArray(source) ? source : isNullable(source) ? [] : [source];
	}
	function is(type, value) {
		if (arguments.length === 1) return (value2) => is(type, value2);
		return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
	}
	function isArrayBufferLike(value) {
		return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
	}
	function isArrayBufferSource(value) {
		return isArrayBufferLike(value) || ArrayBuffer.isView(value);
	}
	var Binary;
	((Binary2) => {
		Binary2.is = isArrayBufferLike;
		Binary2.isSource = isArrayBufferSource;
		function fromSource(source) {
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			else return source;
		}
		Binary2.fromSource = fromSource;
		function toBase64(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
			let binary = "";
			const bytes = new Uint8Array(source);
			for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
			return btoa(binary);
		}
		Binary2.toBase64 = toBase64;
		function fromBase64(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
			return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
		}
		Binary2.fromBase64 = fromBase64;
		function toHex(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
			return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
		}
		Binary2.toHex = toHex;
		function fromHex(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
			const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
			const buffer = [];
			for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
			return Uint8Array.from(buffer).buffer;
		}
		Binary2.fromHex = fromHex;
	})(Binary || (Binary = {}));
	var base64ToArrayBuffer = Binary.fromBase64;
	var arrayBufferToBase64 = Binary.toBase64;
	var hexToArrayBuffer = Binary.fromHex;
	var arrayBufferToHex = Binary.toHex;
	function clone(source, refs = /* @__PURE__ */ new Map()) {
		if (!source || typeof source !== "object") return source;
		if (is("Date", source)) return new Date(source.valueOf());
		if (is("RegExp", source)) return new RegExp(source.source, source.flags);
		if (isArrayBufferLike(source)) return source.slice(0);
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		const cached = refs.get(source);
		if (cached) return cached;
		if (Array.isArray(source)) {
			const result2 = [];
			refs.set(source, result2);
			source.forEach((value, index) => {
				result2[index] = Reflect.apply(clone, null, [value, refs]);
			});
			return result2;
		}
		const result = Object.create(Object.getPrototypeOf(source));
		refs.set(source, result);
		for (const key of Reflect.ownKeys(source)) {
			const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
			if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
			Reflect.defineProperty(result, key, descriptor);
		}
		return result;
	}
	function deepEqual(a, b, strict) {
		if (a === b) return true;
		if (!strict && isNullable(a) && isNullable(b)) return true;
		if (typeof a !== typeof b) return false;
		if (typeof a !== "object") return false;
		if (!a || !b) return false;
		function check(test, then) {
			return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
		}
		return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
			if (a2.byteLength !== b2.byteLength) return false;
			const viewA = new Uint8Array(a2);
			const viewB = new Uint8Array(b2);
			for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
			return true;
		}) ?? Object.keys({
			...a,
			...b
		}).every((key) => deepEqual(a[key], b[key], strict));
	}
	function capitalize(source) {
		return source.charAt(0).toUpperCase() + source.slice(1);
	}
	function uncapitalize(source) {
		return source.charAt(0).toLowerCase() + source.slice(1);
	}
	function camelCase(source) {
		return source.replace(/[_-][a-z]/g, (str) => str.slice(1).toUpperCase());
	}
	function tokenize(source, delimiters, delimiter) {
		const output = [];
		let state = 0;
		for (let i = 0; i < source.length; i++) {
			const code = source.charCodeAt(i);
			if (code >= 65 && code <= 90) {
				if (state === 1) {
					const next = source.charCodeAt(i + 1);
					if (next >= 97 && next <= 122) output.push(delimiter);
					output.push(code + 32);
				} else {
					if (state !== 0) output.push(delimiter);
					output.push(code + 32);
				}
				state = 1;
			} else if (code >= 97 && code <= 122) {
				output.push(code);
				state = 2;
			} else if (delimiters.includes(code)) {
				if (state !== 0) output.push(delimiter);
				state = 0;
			} else output.push(code);
		}
		return String.fromCharCode(...output);
	}
	function paramCase(source) {
		return tokenize(source, [45, 95], 45);
	}
	function snakeCase(source) {
		return tokenize(source, [45, 95], 95);
	}
	var camelize = camelCase;
	var hyphenate = paramCase;
	function formatProperty(key) {
		if (typeof key !== "string") return `[${key.toString()}]`;
		return /^[a-z_$][\w$]*$/i.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
	}
	function trimSlash(source) {
		return source.replace(/\/$/, "");
	}
	function sanitize(source) {
		if (!source.startsWith("/")) source = "/" + source;
		return trimSlash(source);
	}
	var Time;
	((Time2) => {
		Time2.millisecond = 1;
		Time2.second = 1e3;
		Time2.minute = Time2.second * 60;
		Time2.hour = Time2.minute * 60;
		Time2.day = Time2.hour * 24;
		Time2.week = Time2.day * 7;
		let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
		function setTimezoneOffset(offset) {
			timezoneOffset = offset;
		}
		Time2.setTimezoneOffset = setTimezoneOffset;
		function getTimezoneOffset() {
			return timezoneOffset;
		}
		Time2.getTimezoneOffset = getTimezoneOffset;
		function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
			if (typeof date === "number") date = new Date(date);
			if (offset === void 0) offset = timezoneOffset;
			return Math.floor((date.valueOf() / Time2.minute - offset) / 1440);
		}
		Time2.getDateNumber = getDateNumber;
		function fromDateNumber(value, offset) {
			const date = new Date(value * Time2.day);
			if (offset === void 0) offset = timezoneOffset;
			return new Date(+date + offset * Time2.minute);
		}
		Time2.fromDateNumber = fromDateNumber;
		const numeric = /\d+(?:\.\d+)?/.source;
		const timeRegExp = new RegExp(`^${[
			"w(?:eek(?:s)?)?",
			"d(?:ay(?:s)?)?",
			"h(?:our(?:s)?)?",
			"m(?:in(?:ute)?(?:s)?)?",
			"s(?:ec(?:ond)?(?:s)?)?"
		].map((unit) => `(${numeric}${unit})?`).join("")}$`);
		function parseTime(source) {
			const capture = timeRegExp.exec(source);
			if (!capture) return 0;
			return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
		}
		Time2.parseTime = parseTime;
		function parseDate(date) {
			const parsed = parseTime(date);
			if (parsed) date = Date.now() + parsed;
			else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
			else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
			return date ? new Date(date) : /* @__PURE__ */ new Date();
		}
		Time2.parseDate = parseDate;
		function format(ms) {
			const abs = Math.abs(ms);
			if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
			else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
			else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
			else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
			return ms + "ms";
		}
		Time2.format = format;
		function toDigits(source, length = 2) {
			return source.toString().padStart(length, "0");
		}
		Time2.toDigits = toDigits;
		function template(template2, time = /* @__PURE__ */ new Date()) {
			return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
		}
		Time2.template = template;
	})(Time || (Time = {}));
	0 && (module.exports = {
		Binary,
		Time,
		arrayBufferToBase64,
		arrayBufferToHex,
		base64ToArrayBuffer,
		camelCase,
		camelize,
		capitalize,
		clone,
		contain,
		deduplicate,
		deepEqual,
		defineProperty,
		difference,
		filterKeys,
		formatProperty,
		hexToArrayBuffer,
		hyphenate,
		intersection,
		is,
		isNonNullable,
		isNullable,
		isPlainObject,
		makeArray,
		mapValues,
		noop,
		omit,
		paramCase,
		pick,
		remove,
		sanitize,
		snakeCase,
		trimSlash,
		uncapitalize,
		union,
		valueMap
	});
}));
//#endregion
//#region src/index.ts
var import_lib = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __name = (target, value) => __defProp(target, "name", {
		value,
		configurable: true
	});
	var import_cosmokit = require_lib$1();
	var kSchema = Symbol.for("schemastery");
	var kValidationError = Symbol.for("ValidationError");
	globalThis.__schemastery_index__ ??= 0;
	globalThis.__schemastery_refs__ = void 0;
	var ValidationError = class extends TypeError {
		constructor(message, options) {
			let prefix = "$";
			for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
			else if (typeof segment === "number") prefix += "[" + segment + "]";
			else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
			if (prefix.startsWith(".")) prefix = prefix.slice(1);
			super((prefix === "$" ? "" : `${prefix} `) + message);
			this.options = options;
		}
		static {
			__name(this, "ValidationError");
		}
		name = "ValidationError";
		static is(error) {
			return !!error?.[kValidationError];
		}
	};
	Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
	var Schema = /* @__PURE__ */ __name(function(options) {
		const schema = /* @__PURE__ */ __name(function(data, options2 = {}) {
			return Schema.resolve(data, schema, options2)[0];
		}, "schema");
		if (options.refs) {
			const refs = (0, import_cosmokit.valueMap)(options.refs, (options2) => new Schema(options2));
			const getRef = /* @__PURE__ */ __name((uid) => refs[uid], "getRef");
			for (const key in refs) {
				const options2 = refs[key];
				options2.sKey = getRef(options2.sKey);
				options2.inner = getRef(options2.inner);
				options2.list = options2.list && options2.list.map(getRef);
				options2.dict = options2.dict && (0, import_cosmokit.valueMap)(options2.dict, getRef);
			}
			return refs[options.uid];
		}
		Object.assign(schema, options);
		if (typeof schema.callback === "string") try {
			schema.callback = new Function("return " + schema.callback)();
		} catch {}
		Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
		Object.setPrototypeOf(schema, Schema.prototype);
		schema.meta ||= {};
		schema.toString = schema.toString.bind(schema);
		return schema;
	}, "Schema");
	Schema.prototype = Object.create(Function.prototype);
	Schema.prototype[kSchema] = true;
	Object.defineProperty(Schema.prototype, "~standard", { get() {
		return {
			version: 1,
			vendor: "schemastery",
			validate: /* @__PURE__ */ __name((value) => {
				try {
					return { value: Schema.resolve(value, this, {})[0] };
				} catch (error) {
					if (ValidationError.is(error)) return { issues: [{
						message: error.message,
						path: error.options.path
					}] };
					throw error;
				}
			}, "validate")
		};
	} });
	Schema.ValidationError = ValidationError;
	Schema.prototype.toJSON = /* @__PURE__ */ __name(function toJSON() {
		if (globalThis.__schemastery_refs__) {
			globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
			return this.uid;
		}
		globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
		globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
		const result = {
			uid: this.uid,
			refs: globalThis.__schemastery_refs__
		};
		globalThis.__schemastery_refs__ = void 0;
		return result;
	}, "toJSON");
	Schema.prototype.set = /* @__PURE__ */ __name(function set(key, value) {
		this.dict[key] = value;
		return this;
	}, "set");
	Schema.prototype.push = /* @__PURE__ */ __name(function push(value) {
		this.list.push(value);
		return this;
	}, "push");
	function mergeDesc(original, messages) {
		const result = typeof original === "string" ? { "": original } : { ...original };
		for (const locale in messages) {
			const value = messages[locale];
			if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
			else if (typeof value === "string") result[locale] = value;
		}
		return result;
	}
	__name(mergeDesc, "mergeDesc");
	function getInner(value) {
		return value?.$value ?? value?.$inner;
	}
	__name(getInner, "getInner");
	function extractKeys(data) {
		return (0, import_cosmokit.filterKeys)(data ?? {}, (key) => !key.startsWith("$"));
	}
	__name(extractKeys, "extractKeys");
	Schema.prototype.i18n = /* @__PURE__ */ __name(function i18n(messages) {
		const schema = Schema(this);
		const desc = mergeDesc(schema.meta.description, messages);
		if (Object.keys(desc).length) schema.meta.description = desc;
		if (schema.dict) schema.dict = (0, import_cosmokit.valueMap)(schema.dict, (inner, key) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
		});
		if (schema.list) schema.list = schema.list.map((inner, index) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data = {}) => {
				if (Array.isArray(getInner(data))) return getInner(data)[index];
				if (Array.isArray(data)) return data[index];
				return extractKeys(data);
			}));
		});
		if (schema.inner) schema.inner = schema.inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => {
			if (getInner(data)) return getInner(data);
			return extractKeys(data);
		}));
		if (schema.sKey) schema.sKey = schema.sKey.i18n((0, import_cosmokit.valueMap)(messages, (data) => data?.$key));
		return schema;
	}, "i18n");
	Schema.prototype.extra = /* @__PURE__ */ __name(function extra(key, value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	}, "extra");
	for (const key of [
		"required",
		"disabled",
		"collapse",
		"hidden",
		"loose"
	]) Object.assign(Schema.prototype, { [key](value = true) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	Schema.prototype.deprecated = /* @__PURE__ */ __name(function deprecated() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "deprecated",
			type: "danger"
		});
		return schema;
	}, "deprecated");
	Schema.prototype.experimental = /* @__PURE__ */ __name(function experimental() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "experimental",
			type: "warning"
		});
		return schema;
	}, "experimental");
	Schema.prototype.pattern = /* @__PURE__ */ __name(function pattern(regexp) {
		const schema = Schema(this);
		const pattern2 = (0, import_cosmokit.pick)(regexp, ["source", "flags"]);
		schema.meta = {
			...schema.meta,
			pattern: pattern2
		};
		return schema;
	}, "pattern");
	Schema.prototype.simplify = /* @__PURE__ */ __name(function simplify(value) {
		if ((0, import_cosmokit.deepEqual)(value, this.meta.default, this.type === "dict")) return null;
		if ((0, import_cosmokit.isNullable)(value)) return value;
		if (this.type === "object" || this.type === "dict") {
			const result = {};
			for (const key in value) {
				const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
				if (this.type === "dict" || !(0, import_cosmokit.isNullable)(item)) result[key] = item;
			}
			if ((0, import_cosmokit.deepEqual)(result, this.meta.default, this.type === "dict")) return null;
			return result;
		} else if (this.type === "array" || this.type === "tuple") {
			const result = [];
			value.forEach((value2, index) => {
				const schema = this.type === "array" ? this.inner : this.list[index];
				const item = schema ? schema.simplify(value2) : value2;
				result.push(item);
			});
			return result;
		} else if (this.type === "intersect") {
			const result = {};
			for (const item of this.list) Object.assign(result, item.simplify(value));
			return result;
		} else if (this.type === "union") for (const schema of this.list) try {
			Schema.resolve(value, schema, {});
			return schema.simplify(value);
		} catch {}
		return value;
	}, "simplify");
	Schema.prototype.toString = /* @__PURE__ */ __name(function toString(inline) {
		return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
	}, "toString");
	Schema.prototype.role = /* @__PURE__ */ __name(function role(role, extra2) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			role,
			extra: extra2
		};
		return schema;
	}, "role");
	for (const key of [
		"default",
		"link",
		"comment",
		"description",
		"max",
		"min",
		"step"
	]) Object.assign(Schema.prototype, { [key](value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	var resolvers = {};
	Schema.extend = /* @__PURE__ */ __name(function extend(type, resolve2) {
		resolvers[type] = resolve2;
	}, "extend");
	Schema.resolve = /* @__PURE__ */ __name(function resolve(data, schema, options = {}, strict = false) {
		if (!schema) return [data];
		if (options.ignore?.(data, schema)) return [data];
		if ((0, import_cosmokit.isNullable)(data) && schema.type !== "lazy") {
			if (schema.meta.required) throw new ValidationError(`missing required value`, options);
			let current = schema;
			let fallback = schema.meta.default;
			while (current?.type === "intersect" && (0, import_cosmokit.isNullable)(fallback)) {
				current = current.list[0];
				fallback = current?.meta.default;
			}
			if ((0, import_cosmokit.isNullable)(fallback)) return [data];
			data = (0, import_cosmokit.clone)(fallback);
		}
		const callback = resolvers[schema.type];
		if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
		try {
			return callback(data, schema, options, strict);
		} catch (error) {
			if (!schema.meta.loose) throw error;
			return [schema.meta.default];
		}
	}, "resolve");
	Schema.from = /* @__PURE__ */ __name(function from(source) {
		if ((0, import_cosmokit.isNullable)(source)) return Schema.any();
		else if ([
			"string",
			"number",
			"boolean"
		].includes(typeof source)) return Schema.const(source).required();
		else if (source[kSchema]) return source;
		else if (typeof source === "function") switch (source) {
			case String: return Schema.string().required();
			case Number: return Schema.number().required();
			case Boolean: return Schema.boolean().required();
			case Function: return Schema.function().required();
			default: return Schema.is(source).required();
		}
		else throw new TypeError(`cannot infer schema from ${source}`);
	}, "from");
	Schema.lazy = /* @__PURE__ */ __name(function lazy(builder) {
		const schema = new Schema({
			type: "lazy",
			builder,
			inner: { toJSON: /* @__PURE__ */ __name(() => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			}, "toJSON") }
		});
		return schema;
	}, "lazy");
	Schema.natural = /* @__PURE__ */ __name(function natural() {
		return Schema.number().step(1).min(0);
	}, "natural");
	Schema.percent = /* @__PURE__ */ __name(function percent() {
		return Schema.number().step(.01).min(0).max(1).role("slider");
	}, "percent");
	Schema.date = /* @__PURE__ */ __name(function date() {
		return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
			const date2 = new Date(value);
			if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
			return date2;
		}, true)]);
	}, "date");
	Schema.regExp = /* @__PURE__ */ __name(function regExp(flag = "") {
		return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
			try {
				return new RegExp(value, flag);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)]);
	}, "regExp");
	Schema.arrayBuffer = /* @__PURE__ */ __name(function arrayBuffer(encoding) {
		return Schema.union([
			Schema.is(ArrayBuffer),
			Schema.is(SharedArrayBuffer),
			Schema.transform(Schema.any(), (value, options) => {
				if (import_cosmokit.Binary.isSource(value)) return import_cosmokit.Binary.fromSource(value);
				throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
			}, true),
			...encoding ? [Schema.transform(Schema.string(), (value, options) => {
				try {
					return encoding === "base64" ? import_cosmokit.Binary.fromBase64(value) : import_cosmokit.Binary.fromHex(value);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)] : []
		]);
	}, "arrayBuffer");
	Schema.extend("lazy", (data, schema, options, strict) => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return Schema.resolve(data, schema.inner, options, strict);
	});
	Schema.extend("any", (data) => {
		return [data];
	});
	Schema.extend("never", (data, _, options) => {
		throw new ValidationError(`expected nullable but got ${data}`, options);
	});
	Schema.extend("const", (data, { value }, options) => {
		if ((0, import_cosmokit.deepEqual)(data, value)) return [value];
		throw new ValidationError(`expected ${value} but got ${data}`, options);
	});
	function checkWithinRange(data, meta, description, options, skipMin = false) {
		const { max = Infinity, min = -Infinity } = meta;
		if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
		if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
	}
	__name(checkWithinRange, "checkWithinRange");
	Schema.extend("string", (data, { meta }, options) => {
		if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
		if (meta.pattern) {
			const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
			if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
		}
		checkWithinRange(data.length, meta, "string length", options);
		return [data];
	});
	function decimalShift(data, digits) {
		const str = data.toString();
		if (str.includes("e")) return data * Math.pow(10, digits);
		const index = str.indexOf(".");
		if (index === -1) return data * Math.pow(10, digits);
		const frac = str.slice(index + 1);
		const integer = str.slice(0, index);
		if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
		return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
	}
	__name(decimalShift, "decimalShift");
	function isMultipleOf(data, min, step) {
		step = Math.abs(step);
		if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
		const index = step.toString().indexOf(".");
		const digits = step.toString().slice(index + 1).length;
		return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
	}
	__name(isMultipleOf, "isMultipleOf");
	Schema.extend("number", (data, { meta }, options) => {
		if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
		checkWithinRange(data, meta, "number", options);
		const { step } = meta;
		if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
		return [data];
	});
	Schema.extend("boolean", (data, _, options) => {
		if (typeof data === "boolean") return [data];
		throw new ValidationError(`expected boolean but got ${data}`, options);
	});
	Schema.extend("bitset", (data, { bits, meta }, options) => {
		let value = 0, keys = [];
		if (typeof data === "number") {
			value = data;
			for (const key in bits) if (data & bits[key]) keys.push(key);
		} else if (Array.isArray(data)) {
			keys = data;
			for (const key of keys) {
				if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
				if (key in bits) value |= bits[key];
			}
		} else throw new ValidationError(`expected number or array but got ${data}`, options);
		if (value === meta.default) return [value];
		return [value, keys];
	});
	Schema.extend("function", (data, _, options) => {
		if (typeof data === "function") return [data];
		throw new ValidationError(`expected function but got ${data}`, options);
	});
	Schema.extend("is", (data, { constructor }, options) => {
		if (typeof constructor === "function") {
			if (data instanceof constructor) return [data];
			throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
		} else {
			if ((0, import_cosmokit.isNullable)(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			let prototype = Object.getPrototypeOf(data);
			while (prototype) {
				if (prototype.constructor?.name === constructor) return [data];
				prototype = Object.getPrototypeOf(prototype);
			}
			throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		}
	});
	function property(data, key, schema, options) {
		try {
			const [value, adapted] = Schema.resolve(data[key], schema, {
				...options,
				path: [...options.path || [], key]
			});
			if (adapted !== void 0) data[key] = adapted;
			return value;
		} catch (e) {
			if (!options?.autofix) throw e;
			delete data[key];
			return schema.meta.default;
		}
	}
	__name(property, "property");
	Schema.extend("array", (data, { inner, meta }, options) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		checkWithinRange(data.length, meta, "array length", options, !(0, import_cosmokit.isNullable)(inner.meta.default));
		return [data.map((_, index) => property(data, index, inner, options))];
	});
	Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in data) {
			let rKey;
			try {
				rKey = Schema.resolve(key, sKey, options)[0];
			} catch (error) {
				if (strict) continue;
				throw error;
			}
			result[rKey] = property(data, key, inner, options);
			data[rKey] = data[key];
			if (key !== rKey) delete data[key];
		}
		return [result];
	});
	Schema.extend("tuple", (data, { list }, options, strict) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		const result = list.map((inner, index) => property(data, index, inner, options));
		if (strict) return [result];
		result.push(...data.slice(list.length));
		return [result];
	});
	function merge(result, data) {
		for (const key in data) {
			if (key in result) continue;
			result[key] = data[key];
		}
	}
	__name(merge, "merge");
	Schema.extend("object", (data, { dict }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in dict) {
			const value = property(data, key, dict[key], options);
			if (!(0, import_cosmokit.isNullable)(value) || key in data) result[key] = value;
		}
		if (!strict) merge(result, data);
		return [result];
	});
	Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
		const messages = [];
		for (const inner of list) try {
			return Schema.resolve(data, inner, options, strict);
		} catch (error) {
			messages.push(error);
		}
		throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
	});
	Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
		if (!list.length) return [data];
		let result;
		for (const inner of list) {
			const value = Schema.resolve(data, inner, options, true)[0];
			if ((0, import_cosmokit.isNullable)(value)) continue;
			if ((0, import_cosmokit.isNullable)(result)) result = value;
			else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
			else if (typeof value === "object") merge(result ??= {}, value);
			else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
		}
		if (!strict && (0, import_cosmokit.isPlainObject)(data)) merge(result, data);
		return [result];
	});
	Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
		const [result, adapted = data] = Schema.resolve(data, inner, options, true);
		if (preserve) return [callback(result)];
		else return [callback(result), callback(adapted)];
	});
	var formatters = {};
	function defineMethod(name, keys, format) {
		formatters[name] = format;
		Object.assign(Schema, { [name](...args) {
			const schema = new Schema({ type: name });
			keys.forEach((key, index) => {
				switch (key) {
					case "sKey":
						schema.sKey = args[index] ?? Schema.string();
						break;
					case "inner":
						schema.inner = Schema.from(args[index]);
						break;
					case "list":
						schema.list = args[index].map(Schema.from);
						break;
					case "dict":
						schema.dict = (0, import_cosmokit.valueMap)(args[index], Schema.from);
						break;
					case "bits":
						schema.bits = {};
						for (const key2 in args[index]) {
							if (typeof args[index][key2] !== "number") continue;
							schema.bits[key2] = args[index][key2];
						}
						break;
					case "callback": {
						const callback = schema.callback = args[index];
						callback["toJSON"] ||= () => callback.toString();
						break;
					}
					case "constructor": {
						const constructor = schema.constructor = args[index];
						if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
						break;
					}
					default: schema[key] = args[index];
				}
			});
			if (name === "object" || name === "dict") schema.meta.default = {};
			else if (name === "array" || name === "tuple") schema.meta.default = [];
			else if (name === "bitset") schema.meta.default = 0;
			return schema;
		} });
	}
	__name(defineMethod, "defineMethod");
	defineMethod("is", ["constructor"], ({ constructor }) => {
		if (typeof constructor === "function") return constructor.name;
		else return constructor;
	});
	defineMethod("any", [], () => "any");
	defineMethod("never", [], () => "never");
	defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
	defineMethod("string", [], () => "string");
	defineMethod("number", [], () => "number");
	defineMethod("boolean", [], () => "boolean");
	defineMethod("bitset", ["bits"], () => "bitset");
	defineMethod("function", [], () => "function");
	defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
	defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
	defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
	defineMethod("object", ["dict"], ({ dict }) => {
		if (Object.keys(dict).length === 0) return "{}";
		return `{ ${Object.entries(dict).map(([key, inner]) => {
			return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
		}).join(", ")} }`;
	});
	defineMethod("union", ["list"], ({ list }, inline) => {
		const result = list.map(({ toString: format }) => format()).join(" | ");
		return inline ? `(${result})` : result;
	});
	defineMethod("intersect", ["list"], ({ list }) => {
		return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
	});
	defineMethod("transform", [
		"inner",
		"callback",
		"preserve"
	], ({ inner }, isInner) => inner.toString(isInner));
	module.exports = Schema;
})))(), 1);
const SCAFFOLD_BUILD_SH = `#!/bin/bash
# Generated by dsh-super-injector dev_scaffold_plugin.
# Build: compile src/ → lib/ with the dsh checkout's tsc.
# Requires DSH_CHECKOUT pointing at a dsh source checkout (auto-probe below).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# DSH_CHECKOUT 探测：环境变量 → 常见路径（home 下 dsh-harness）
CHECKOUT="\${DSH_CHECKOUT:-}"
if [ -z "$CHECKOUT" ]; then
  for candidate in "\$HOME/dsh-harness" "\$HOME/dsh" "\$HOME/.dsh/dsh-harness"; do
    if [ -d "\$candidate/packages" ]; then CHECKOUT="\$candidate"; break; fi
  done
fi
if [ -z "$CHECKOUT" ] || [ ! -d "$CHECKOUT/packages" ]; then
  echo "build: cannot locate the dsh checkout (set DSH_CHECKOUT)" >&2
  exit 1
fi

TSC="$CHECKOUT/node_modules/.bin/tsc"
if [ ! -x "$TSC" ] && [ ! -f "$TSC.cmd" ]; then
  echo "build: tsc not found at $TSC" >&2
  exit 1
fi

link_pkg() {
  local target="$CHECKOUT/$2"
  if [ ! -e "$target" ]; then
    echo "build: dependency target missing: $target" >&2
    exit 1
  fi
  node -e "
    const fs = require('fs');
    const path = require('path');
    const link = path.resolve(process.argv[1]);
    const target = path.resolve(process.argv[2]);
    fs.rmSync(link, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  " "node_modules/$1" "$target"
}

echo "=== Linking build dependencies (checkout: $CHECKOUT) ==="
mkdir -p node_modules/@deepseek-ai
node -e "const fs=require('fs');fs.rmSync('node_modules/@standard-schema',{recursive:true,force:true})"
link_pkg cordis vendor/cordis
link_pkg cosmokit vendor/cosmokit
link_pkg schemastery vendor/schemastery
link_pkg @deepseek-ai/dsh-tools packages/core/tools
link_pkg @deepseek-ai/dsh-llm packages/llm/llm
link_pkg @deepseek-ai/dsh-system-prompt packages/core/system-prompt
# @types/node（编译类型；checkout 自带）
link_pkg @types/node node_modules/@types/node

STD_SCHEMA=$(find "$CHECKOUT/node_modules/.pnpm" -maxdepth 1 -type d -iname '@standard-schema+spec@*' 2>/dev/null | head -1)
if [ -n "$STD_SCHEMA" ]; then
  node -e "
    const fs = require('fs');
    const path = require('path');
    fs.rmSync('node_modules/@standard-schema', { recursive: true, force: true });
    fs.mkdirSync('node_modules/@standard-schema', { recursive: true });
    fs.symlinkSync(path.resolve(process.argv[1]), path.resolve('node_modules/@standard-schema/spec'), process.platform === 'win32' ? 'junction' : 'dir');
  " "$STD_SCHEMA/node_modules/@standard-schema/spec"
fi

echo "=== Compiling src → lib ==="
"$TSC" -p tsconfig.json
echo "=== Build complete ==="
`;
const SCAFFOLD_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "types": ["node"],
    "declaration": true,
    "declarationDir": "lib/types",
    "outDir": "lib",
    "rootDir": "src",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true
  },
  "include": ["src"]
}
`;
const SCAFFOLD_GITIGNORE = `node_modules/
lib/
*.tsbuildinfo
*.tgz
`;
/** 工具包形态：注册一个工具（含 Config schema + ctx.effect 注册规范）。 */
function scaffoldToolkitSrc(pkgName, description) {
	return `/**
 * ${pkgName} — 工具包形态（由 dev_scaffold_plugin 生成）。
 * 规范：资源注册必须挂 ctx.effect（热重载/卸载自动清理——注入器踩坑记录）。
 *
 * 高性能铁律（DeepSeek V4 Pro 实测，参考 dsh-anchored-standard 98/99）：
 * 1. 工具 schema 精简：description 用短句点明用途，详解放 tool result / 静态引导文本，
 *    不要写进 schema——工具目录按字符计费进首轮 prefill，实测 6 插件可膨胀到 17.6 万字符，
 *    稀释首轮注意力且无缓存 prefill 最贵（缓存命中便宜 10 倍）。
 * 2. 首轮锚定：工具面大（≥5 个）时首轮只露最核心的 1-2 个工具，首个工具调用后恢复全部——
 *    首轮请求结构决定整条会话的策略轨迹，锚定在训练对齐的窄工具面再放开，能力不损。
 *    启用方法见 apply() 末尾的注释块。
 */
import type { Context } from 'cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from 'schemastery'

export const name = ${JSON.stringify(pkgName)}
export const inject = ['tools']

export interface Config {
  greeting: string
}

export const Config = z.object({
  greeting: z.string().default('你好'),
})

export function apply(ctx: Context, config: Config): void {
  // 工具注册（ctx.effect：fiber dispose 自动注销）
  ctx.effect(() => ctx.tools.register(defineTool({
    name: '${pkgName.replace(/[^a-z0-9_]/gi, "_")}_hello',
    description: ${JSON.stringify(description || "示例工具")},
    parameters: {
      name: { type: 'string', required: true, description: '谁' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute(args: { name: string }) {
      return config.greeting + '，' + args.name + '！'
    },
  })), '${pkgName}: hello tool')

  // ── 高性能引导：首轮锚定（工具面 ≥5 个或 description 总量大时启用）──────────
  // 机制：system-prompt/assemble 是 Waterfall（必须 await next() 再裁剪）；
  // 会话无任何持久化 tool/call 前，只保留本插件最核心的工具；首个工具调用落地后
  // 恢复全部。阶段从持久 session events 推导，resume/reload 不丢状态。
  // 启用步骤：① inject 数组加 'systemPrompt'；② 把下方 MINE 换成你的工具名集合；
  // ③ 把 '<核心工具>' 换成首轮要保留的那个工具名。
  // ctx.on('system-prompt/assemble', async (_assembly: unknown, context: any, next: () => Promise<any>) => {
  //   const assembled = await next()
  //   const agent = context.agent
  //   if (!agent || agent.session.events.some((e: any) => e.type === 'tool/call')) return assembled
  //   const MINE = new Set(['${pkgName.replace(/[^a-z0-9_]/gi, "_")}_hello'])
  //   const CORE = '<核心工具>'
  //   return { ...assembled, tools: assembled.tools.filter((t: any) => !MINE.has(t.name) || t.name === CORE) }
  // })
}
`;
}
/** 守护循环形态：timer 驱动 → LLM 决策 → 行动（参考 loop-demo，可自我优化）。 */
function scaffoldDaemonSrc(pkgName, description) {
	return `/**
 * ${pkgName} — 守护循环形态（由 dev_scaffold_plugin 生成）。
 * 小 agent loop：timer 驱动自主循环 → 观察 → LLM 决策 → 行动 → 再睡。
 * 插件自身的提示词/循环参数皆可自我优化（改 → build → dev_reload_package）。
 */
import type { Context } from 'cordis'
import type LlmService from '@deepseek-ai/dsh-llm'
import { createUserMessage, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import z from 'schemastery'

type AppContext = Context & {
  llm: LlmService
  setInterval(fn: () => void, ms: number): any
}

export const name = ${JSON.stringify(pkgName)}
export const inject = ['timer', 'llm']

export interface Config {
  intervalMs: number
  logFile: string
  watchFile: string
}

export const Config = z.object({
  intervalMs: z.number().min(5000).default(60000),
  logFile: z.string().default(''),
  watchFile: z.string().default(''),
})

export function apply(ctx: AppContext, config: Config): void {
  // 短名（去 scope）：日志文件名不能含 '/'（会变成子路径）
  const SHORT = ${JSON.stringify(pkgName.split("/").pop() ?? "plugin")}
  // DSH_HOME 优先：web 进程 homedir 可能与 DSH_HOME 不一致（部署常见），homedir() 推导会错位
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  const logFile = config.logFile || join(dshHome, 'super-injector', SHORT + '.log')
  const watchFile = config.watchFile || join(dshHome, 'super-injector', 'self-heal.log')
  let cycles = 0
  let llmCalls = 0
  let lastRoute: { provider: string; model: string } | null = null

  const log = (msg: string): void => {
    try {
      mkdirSync(dirname(logFile), { recursive: true })
      appendFileSync(logFile, '[' + new Date().toISOString() + '] ' + msg + '\\n')
    } catch { /* 日志失败静默 */ }
  }

  // 观察面：捕获主模型路由（waterfall 必须 next() 委托）
  ctx.on('llm/stream', (options, next) => {
    lastRoute = { provider: options.provider, model: options.model }
    return next()
  })

  async function decideWithLlm(tail: string): Promise<string> {
    if (!lastRoute) return '无可用 LLM 路由（未捕获到主模型调用），跳过决策'
    llmCalls += 1
    try {
      let text = ''
      const stream = ctx.llm.stream({
        provider: lastRoute.provider,
        model: lastRoute.model,
        system: '你是守护 agent。分析给定日志尾部，判断是否需要人工介入。直接输出结论：需介入（10 字内原因）/ OK。',
        messages: [createUserMessage({ source: { kind: 'user' }, content: [{ type: 'text', text: tail.slice(0, 800) }] })],
        temperature: 0,
        reasoningEffort: ReasoningEffortId('off'),
        maxTokens: 200,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') text += chunk.text
      }
      return text.trim().slice(0, 60) || 'LLM 无输出'
    } catch (e) {
      return 'LLM 调用失败: ' + String(e).slice(0, 40)
    }
  }

  // ═══ 小 agent loop：每 intervalMs 醒来 → 观察 → 决策 → 行动 → 再睡 ═══
  ctx.setInterval(() => {
    void (async () => {
      cycles += 1
      let tail = ''
      try {
        const { readFileSync } = await import('node:fs')
        const t = readFileSync(watchFile, 'utf8').trim().split('\\n')
        tail = t.slice(-3).join('\\n')
      } catch { /* 无观察源 */ }
      let decision: string
      if (tail.includes('heal-failed') || tail.includes('reboot-failed')) {
        decision = await decideWithLlm(tail)
      } else {
        decision = 'OK（无异常，LLM 未唤醒）'
      }
      log('cycle=' + cycles + ' llmCalls=' + llmCalls + ' decision=' + decision)
    })().catch((e) => log('loop error: ' + String(e)))
  }, config.intervalMs)

  ctx.logger?.info?.('[' + ${JSON.stringify(pkgName)} + '] 守护循环启动（每 ' + config.intervalMs + 'ms 一轮）')
}
`;
}
/** UI 面板形态：host 工具 + client 面板（conversation.view slot + tsdown client bundle）。 */
function scaffoldUiSrc(pkgName, description) {
	return `/**
 * ${pkgName} — UI 面板形态（由 dev_scaffold_plugin 生成）。
 * host 侧：工具 + webServer API；client 侧：conversation.view slot 面板。
 * 构建：npm run build（host tsc）+ npm run build:client（tsdown → lib/client.js）。
 */
import type { Context } from 'cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from 'schemastery'

export const name = ${JSON.stringify(pkgName)}
export const inject = ['tools', 'webServer']

export interface Config {
  title: string
}

export const Config = z.object({
  title: z.string().default('面板'),
})

export function apply(ctx: Context, config: Config): void {
  // host API（前缀路由，client 面板消费）
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/${pkgName}/api',
    handler: async (req: any, res: any) => {
      const text = JSON.stringify({ title: config.title, ts: Date.now() })
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(text)
    },
  }), '${pkgName}: api')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: '${pkgName.replace(/[^a-z0-9_]/gi, "_")}_status',
    description: ${JSON.stringify(description || "面板状态")},
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }],
    },
    async execute() {
      return JSON.stringify({ title: config.title })
    },
  })), '${pkgName}: status tool')
}
`;
}
const SCAFFOLD_UI_CLIENT = (pkgName) => `/**
 * ${pkgName} — client 面板（conversation.view slot）。
 * 构建：npm run build:client（tsdown，产物 lib/client.js，ModuleLoader.load 注册）。
 * ⚠️ 两个必坑（2026-08 实测）：① apply 用 ctx.slots 必须 export const inject
 * = ['slots']（服务注入声明）；② register 必须带 name 字段（= slot 名，
 * 如 conversation.view）——缺 name 报 "slot undefined is not declared"。
 */
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'

type ClientContext = {
  slots: SlotsService
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.slots.inject('conversation.view', () =>
    ctx.slots.register({
      name: 'conversation.view',
      id: '${pkgName}-panel',
      label: () => ${JSON.stringify(pkgName)},
      component: () => ({
        render() {
          const el = document.createElement('div')
          el.textContent = ${JSON.stringify(pkgName)} + ' 面板（host API: /${pkgName}/api）'
          el.style.padding = '12px'
          el.style.fontFamily = 'monospace'
          return el
        },
      }),
    }),
  ), '${pkgName}: panel')
}
`;
/** UI 形态的 tsdown 配置（简化版，参照官方 packages 模式）。 */
const SCAFFOLD_TSDOWN = (pkgName) => `import { fileURLToPath } from 'node:url'
import type { UserConfig } from 'tsdown'

const PLUGIN_ID = ${JSON.stringify(pkgName)}

const CLIENT_EXTERNALS = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-runtime/client',
]

const clientBundle: UserConfig = {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: ' + JSON.stringify(PLUGIN_ID) + ', factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    codeSplitting: false,
  },
}

export default [clientBundle] satisfies UserConfig[]
`;
/** 统一 package.json 模板（peerDeps 范围声明，不硬编码版本）。 */
function scaffoldPackageJson(pkgName, description, form) {
	const withClient = form === "ui-panel" || form === "hybrid";
	const peerDeps = {
		"@deepseek-ai/dsh-llm": ">=0.0.1-rc <2",
		"@deepseek-ai/dsh-tools": ">=0.0.1-rc <2",
		"cordis": ">=4.0.0-rc <5",
		"schemastery": "^3.18.0"
	};
	if (withClient) peerDeps["@deepseek-ai/dsh-client-ui-slots"] = ">=0.0.1-rc <2";
	const pkg = {
		name: pkgName,
		version: "0.0.1",
		description: description || pkgName + "（" + form + " 形态）",
		private: true,
		type: "module",
		main: "./lib/index.js",
		types: "./lib/types/index.d.ts",
		files: ["lib"],
		license: "BSD-3-Clause",
		peerDependencies: peerDeps,
		devDependencies: {
			"@types/node": "^24.13.3",
			typescript: "^5.9.0"
		},
		scripts: {
			build: "bash scripts/build.sh",
			typecheck: "tsc -p tsconfig.json --noEmit"
		}
	};
	if (withClient) {
		pkg.devDependencies["tsdown"] = "^0.22.14";
		pkg.scripts["build:client"] = "tsdown";
		pkg.exports = {
			".": {
				types: "./lib/types/index.d.ts",
				default: "./lib/index.js"
			},
			"./client": {
				types: "./lib/types/client/index.d.ts",
				default: "./lib/client.js"
			},
			"./package.json": "./package.json"
		};
		pkg.dsh = { client: {
			inject: ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-ui-slots"],
			platform: "web"
		} };
	}
	return JSON.stringify(pkg, null, 2) + "\n";
}
const name = "dsh-super-injector";
const inject = [
	"loader",
	"timer",
	"tools",
	"systemPrompt",
	"webServer"
];
const Config = import_lib.default.object({
	registryFile: import_lib.default.string().default(""),
	profileNodeModules: import_lib.default.string().default(""),
	autoRestore: import_lib.default.boolean().default(true),
	intervalMs: import_lib.default.number().default(1500),
	watches: import_lib.default.array(import_lib.default.object({
		dir: import_lib.default.string().required(),
		match: import_lib.default.string().required()
	})).default([])
});
const FIBER_NAMES = [
	"pending",
	"loading",
	"active",
	"failed",
	"disposed",
	"unloading"
];
/** 递归收集 dir 下所有 .js 的相对路径指纹（mtime + size）。
* E: 只统计 .js（运行时文件）——跳过 .map/.d.ts（构建产物，不参与运行，
* 通常占一半以上）——正确性不变，stat 开销省 50%+。
* （实测：Windows 上改文件内容不更新父目录 mtime，目录级快路径不可用，
* 故保留全量 .js 深扫，仅收窄文件范围。） */
function fingerprintOf(dir) {
	try {
		const parts = [];
		const walk = (base) => {
			for (const entry of readdirSync(base, { withFileTypes: true })) {
				const full = join(base, entry.name);
				if (entry.isDirectory()) walk(full);
				else if (entry.name.endsWith(".js") && !entry.name.endsWith(".d.ts")) {
					const st = statSync(full);
					parts.push(`${relative(dir, full)}:${st.mtimeMs}:${st.size}`);
				}
			}
		};
		walk(dir);
		parts.sort();
		return parts.join("|");
	} catch {
		return null;
	}
}
/**
* 操作互斥锁：注入/卸载/重载/安装全部串行执行（多会话并发调用注入器时，
* 后操作排队等前操作完成——避免同一插件被并发重载/卸载的竞态）。
*/
let opChain = Promise.resolve();
function withOpLock(fn) {
	const run = opChain.then(() => fn(), () => fn());
	opChain = run.then(() => void 0, () => void 0);
	return run;
}
function apply(ctx, config) {
	const logger = ctx.logger;
	const dshHome = process.env.DSH_HOME || join(homedir(), ".dsh");
	const registryFile = config.registryFile || join(dshHome, "super-injector", "registry.json");
	const profileNodeModules = config.profileNodeModules || join(dshHome, "profiles", "web", "node_modules");
	const intervalMs = config.intervalMs ?? 1500;
	const watches = config.watches ?? [];
	function readRegistry() {
		try {
			const list = JSON.parse(readFileSync(registryFile, "utf8"));
			return Array.isArray(list) ? list : [];
		} catch {
			return [];
		}
	}
	function writeRegistry(list) {
		mkdirSync(dirname(registryFile), { recursive: true });
		const tmp = registryFile + ".tmp";
		writeFileSync(tmp, JSON.stringify(list, null, 2), "utf8");
		renameSync(tmp, registryFile);
	}
	/** 该包是否已有 ACTIVE 的 loader entry（权威防重判断）。 */
	function hasActiveEntry(pkgName) {
		for (const entry of ctx.loader.entries()) {
			const opts = entry.options;
			if (opts.group) continue;
			if (opts.name === pkgName && entry.fiber && FIBER_NAMES[entry.fiber.state] === "active") return true;
		}
		return false;
	}
	/** 清除某包目录的模块缓存残留（失败 import 留下的残缺 job 会毒化重试）。 */
	function purgeCache(pkgDir) {
		const loadCache = ctx.loader.internal?.loadCache;
		if (!loadCache || typeof loadCache.delete !== "function") return;
		const key = pkgDir.replace(/\\/g, "/");
		for (const u of [...loadCache.keys()]) if (decodeURIComponent(u).includes(key)) Map.prototype.delete.call(loadCache, u);
	}
	/** 按包名匹配清理 webserver 路由残留（强制登记守卫的自愈部分）。 */
	function clearRoutesByMatch(match) {
		const hs = ctx.webServer;
		const cleaned = [];
		for (const tableName of [
			"exact",
			"prefixes",
			"upgrades"
		]) {
			const table = hs?.[tableName];
			if (!table || typeof table.delete !== "function") continue;
			for (const k of [...table.keys()]) if (String(k).includes(match)) {
				table.delete(k);
				cleaned.push(`${tableName}[${k}]`);
			}
		}
		return cleaned;
	}
	/**
	* 整包热重载：清缓存 → import → 重建 fiber，失败回滚保留旧代。
	* @param match - entry 匹配子串（id/name；同时用于 URL 匹配，除非给 urlMatch）
	* @param urlMatch - URL 匹配子串（watch 自动重载传目录路径；loadCache key 是
	*   百分号编码的 file URL，包名不是 URL 子串，必须用目录路径匹配）
	*/
	const SELF_RELOAD_MIN_INTERVAL_MS = 1e4;
	let selfReloading = false;
	const selfReloadStateFile = join(dirname(registryFile), "self-reload.json");
	function readSelfReloadState() {
		try {
			const raw = JSON.parse(readFileSync(selfReloadStateFile, "utf8"));
			return { at: typeof raw.at === "number" ? raw.at : 0 };
		} catch {
			return { at: 0 };
		}
	}
	function writeSelfReloadState(at) {
		try {
			mkdirSync(dirname(selfReloadStateFile), { recursive: true });
			writeFileSync(selfReloadStateFile, JSON.stringify({ at }, null, 2), "utf8");
		} catch {}
	}
	/** 目标 entry 名是否命中注入器自身（match 或匹配 entry 含注入器名）。 */
	function matchesSelf(match) {
		if (String(match).includes("dsh-super-injector")) return true;
		for (const entry of ctx.loader.entries()) {
			const o = entry.options;
			if (o.group) continue;
			if (!String(o.name).includes("dsh-super-injector")) continue;
			if (String(o.name).includes(match) || String(o.id).includes(match)) return true;
		}
		return false;
	}
	const selfHealLogFile = join(dirname(registryFile), "self-heal.log");
	/** 追加一行故障审计（时间 + 事件 + 详情）。 */
	function auditLog(event, detail) {
		try {
			mkdirSync(dirname(selfHealLogFile), { recursive: true });
			rotateLog(selfHealLogFile);
			appendFileSync(selfHealLogFile, `[${(/* @__PURE__ */ new Date()).toISOString()}] ${event}: ${detail}\n`);
		} catch {}
	}
	/** 日志轮转（D）：超限后滚动 .1/.2，保留 2 代，防长期运行无限增长。 */
	function rotateLog(file) {
		try {
			if (statSync(file).size <= 1048576) return;
			try {
				rmSync(file + ".2", { force: true });
			} catch {}
			try {
				renameSync(file + ".1", file + ".2");
			} catch {}
			try {
				renameSync(file, file + ".1");
			} catch {}
		} catch {}
	}
	/**
	* ═══ 统一 profile patch 写入（F：防 YAML 双顶层值 + 防重复 id——实测踩坑）═══
	* 官方 patch 初始是顶层 `[]`（空数组）；盲 append `- id:` 会产生两个顶层
	* YAML 值 → 解析必炸。本函数：移除顶层 `[]` 再追加条目，保证文件始终
	* 单一顶层值（列表）。
	*
	* ═══ 幂等去重（2026-08-15 别人机器 duplicate loader entry id 教训）═══
	* 手动 patch / 重复安装 / 多路径写入都可能让同 id entry 出现两次——dsh
	* loader 装配遇同 id 直接抛 `duplicate loader entry id`，整个 plugin tree
	* 加载失败（启动即崩），且注入器自身无法自愈（鸡生蛋）。因此：
	*  1. 写入前扫描现有条目 id；若 appendText 的 id 已存在 → 不追加（幂等）；
	*  2. 对历史重复：重写文件时按 id 去重（保留最后一条，注释块保留）；
	*  3. heal/self-test 等触碰 patch 的路径全部走这里，杜绝盲 append。
	* @param appendText - 要追加的条目文本（含换行，如 `- id: xxx\n  disabled: true\n`）
	* @returns 是否发生了写入
	*/
	function writePatch(appendText) {
		try {
			const patchFile = join(dirname(profileNodeModules), "cordis.patch.yml");
			mkdirSync(dirname(patchFile), { recursive: true });
			let content = "";
			try {
				content = readFileSync(patchFile, "utf8");
			} catch {}
			const appendIds = [...appendText.matchAll(/^\s*- id:\s*([^\s#]+)/gm)].map((m) => m[1]);
			const blocks = extractPatchBlocks(content);
			const existing = /* @__PURE__ */ new Set();
			const kept = [];
			for (const b of blocks) {
				if (b.id) {
					if (existing.has(b.id)) continue;
					existing.add(b.id);
				}
				kept.push(b.text);
			}
			if (appendIds.length > 0 && appendIds.every((id) => existing.has(id))) return false;
			const cleanedTop = kept.join("").replace(/^\s*\[\]\s*$/m, "");
			writeFileSync(patchFile, cleanedTop + appendText, "utf8");
			return true;
		} catch {
			return false;
		}
	}
	/** 把 patch 内容切分为"条目块"（`- id:` 及其缩进子行 + 前置注释行）。
	* 每块文本保留行尾换行，块间 join 不粘连；顶格注释单独成块（不并入前一条目，
	* 否则重写时注释会与下一条目粘连成一行、后续 `disabled: true` 等错挂条目）。 */
	function extractPatchBlocks(content) {
		const lines = content.split("\n");
		const blocks = [];
		let current = null;
		for (const line of lines) {
			const idMatch = /^\s*- id:\s*([^\s#]+)/.exec(line);
			if (idMatch) {
				if (current) blocks.push(current);
				current = {
					id: idMatch[1],
					text: line + "\n"
				};
			} else if (current) {
				if (/^\s/.test(line) || line.trim() === "") current.text += line + "\n";
				else {
					blocks.push(current);
					current = null;
					blocks.push({ text: line + "\n" });
				}
			} else if (line.trim() !== "" && !/^\s*#/.test(line) && !/^\s*\[\]\s*$/.test(line)) blocks.push({ text: line + "\n" });
			else if (line.trim() !== "" && !/^\s*\[\]\s*$/.test(line)) blocks.push({ text: line + "\n" });
		}
		if (current) blocks.push(current);
		return blocks;
	}
	/**
	* ═══ 失败自愈（实测保障 + 官方路径优先）：注入器已缺席时自动重试装配
	* （3 次，间隔 4s/8s/12s）。路径选择（实测教训）：loader.create 会新建
	* **幽灵 entry**，与官方 bundles entry 并存时 loader 对账防双实例会把官方
	* entry 标 disabled——所以自愈**优先走官方装配**（touch profile patch →
	* include.refresh 重装 bundles，无幽灵）；touch 无效才 fallback
	* loader.create（保底复活）。触发方：重启器 catch（reboot-failed）与
	* 看门狗（watchdog-timeout——reboot 异步挂起时 catch 不会执行）。
	*/
	function scheduleHeal(selfEntry, reason) {
		try {
			const rebootCtx = ctx.root;
			const pkgName = selfEntry?.options?.name ?? "@dsh-external/dsh-super-injector";
			const cfg = selfEntry?.options?.config ?? {};
			const patchFile = join(dirname(profileNodeModules), "cordis.patch.yml");
			let attempt = 0;
			const heal = () => {
				attempt += 1;
				(async () => {
					try {
						if (attempt <= 3) try {
							mkdirSync(dirname(patchFile), { recursive: true });
							appendFileSync(patchFile, `\n# super-injector heal ${Date.now()}\n`);
							await new Promise((r) => globalThis.setTimeout(r, 3e3));
							let officialAlive = false;
							try {
								for (const entry of rebootCtx.loader.entries()) {
									const o = entry.options;
									if (o.group) continue;
									if (String(o.name).includes("dsh-super-injector") && entry.fiber && FIBER_NAMES[entry.fiber.state] === "active") officialAlive = true;
								}
							} catch {}
							if (officialAlive) {
								logger.info("[super-injector] 自愈：第 %d 次 touch patch 官方重装配生效（%s）", attempt, pkgName);
								opStats.selfHeal.ok += 1;
								saveStats();
								auditLog("heal-ok", `第 ${attempt} 次 touch patch 官方重装配成功（${pkgName}，触发=${reason}）`);
								arbitrateOfficial();
								return;
							}
							throw new Error("touch patch 后官方 entry 未复活");
						} catch (e) {
							const lc = rebootCtx.loader.internal?.loadCache;
							if (lc && typeof lc.delete === "function") {
								for (const u of [...lc.keys()]) if (typeof u === "string" && decodeURIComponent(u).includes(pkgName)) Map.prototype.delete.call(lc, u);
							}
							await rebootCtx.loader.create({
								name: pkgName,
								config: cfg
							});
							logger.info("[super-injector] 自愈：第 %d 次 fallback loader.create 重新装配完成（%s）", attempt, pkgName);
							opStats.selfHeal.ok += 1;
							saveStats();
							auditLog("heal-ok", `第 ${attempt} 次 fallback loader.create 重新装配成功（${pkgName}，触发=${reason}）`);
							arbitrateOfficial();
						}
					} catch (e) {
						logger.error("[super-injector] 自愈第 %d 次失败: %s", attempt, String(e));
						opStats.selfHeal.fail += 1;
						auditLog(`heal-failed`, `第 ${attempt} 次失败: ${String(e)}（触发=${reason}）`);
						if (attempt < 3) globalThis.setTimeout(heal, 4e3);
						else auditLog("heal-exhausted", "3 次均失败（需人工介入：修复产物后 touch profile patch 触发重装配）");
					}
				})();
			};
			globalThis.setTimeout(heal, 4e3);
			logger.warn("[super-injector] 自愈已排程（4s 后第 1 次：touch patch 官方装配，最多 3 次，触发=%s）", reason);
		} catch (e) {
			logger.error("[super-injector] 自愈排程失败: %s", String(e));
		}
	}
	async function reloadPackage(match, urlMatch) {
		const internal = ctx.loader.internal;
		if (!internal) return "ERROR: loader.internal 不可用";
		const loadCache = internal.loadCache;
		const urlKey = (urlMatch ?? match).replace(/\\/g, "/");
		let urls = [...loadCache.keys()].filter((u) => {
			if (typeof u !== "string") return false;
			return decodeURIComponent(u).includes(urlKey);
		});
		let entryUrl;
		if (urls.length === 0) {
			let libPath;
			try {
				const name = findEntry(match)?.options?.name;
				const candidates = [];
				if (name) {
					const parts = name.startsWith("@") ? name.split("/") : [name];
					candidates.push(join(profileNodeModules, ...parts, "lib", "index.js"));
				}
				if (urlMatch) candidates.push(join(urlMatch, "lib", "index.js"));
				for (const lib of candidates) if (existsSync(lib)) {
					libPath = lib;
					break;
				}
				if (libPath) {
					const realLib = realpathSync(libPath);
					await ctx.loader.import(pathToFileURL(realLib).href, () => []);
					const real = realLib.replace(/\\/g, "/");
					for (const u of loadCache.keys()) if (typeof u === "string" && decodeURIComponent(u).includes(real)) {
						entryUrl = u;
						break;
					}
				}
			} catch {}
			if (entryUrl) {
				auditLog("cache-miss-healed", `缓存无匹配已降级从磁盘加载（${urlKey} → ${entryUrl}）`);
				urls = [entryUrl];
			}
		} else entryUrl = urls.find((u) => u.endsWith("/lib/index.js"));
		if (!entryUrl) return `INFO: 缓存中无匹配且磁盘降级失败 "${urlKey}" 的模块`;
		const entryUrlFinal = entryUrl;
		try {
			const fresh = buildFreshnessProblems(dirname(dirname(fileURLToPath(entryUrlFinal))));
			if (fresh.block.length > 0) {
				auditLog("reload-blocked-stale", `${urlKey}: ${fresh.block.join("; ")}`);
				return "ERROR: 重载前构建产物预检失败（先修复再重载，否则前端必挂）：\n- " + fresh.block.join("\n- ") + "\n修复：npm run build:all（host + client 两步构建）→ 再重载";
			}
			if (fresh.warn.length > 0) {
				auditLog("reload-stale-artifacts", `${urlKey}: ${fresh.warn.join("; ")}`);
				logger.warn("[super-injector] 重载 %s 构建产物可能过期（未阻断）: %s", urlKey, fresh.warn.join("; "));
			}
		} catch {}
		if (matchesSelf(match)) {
			if (selfReloading) return "ERROR: 自重载窗口进行中（自杀→重建约 1-2 秒），请稍后再试——防止连环自杀";
			const since = Date.now() - readSelfReloadState().at;
			if (since < SELF_RELOAD_MIN_INTERVAL_MS) return `ERROR: 自重载节流：距上次仅 ${Math.round(since / 1e3)}s（最小间隔 ${SELF_RELOAD_MIN_INTERVAL_MS / 1e3}s）——防止循环自杀`;
			selfReloading = true;
			writeSelfReloadState(Date.now());
			auditLog("self-reload", `自重载触发（match=${match}），自杀并排程重启器`);
			const selfEntry = findEntry(match);
			const precheckBackup = /* @__PURE__ */ new Map();
			for (const u of urls) {
				precheckBackup.set(u, loadCache.get(u));
				Map.prototype.delete.call(loadCache, u);
			}
			const restorePrecheckCache = () => {
				for (const [u, job] of precheckBackup) if (job === void 0) Map.prototype.delete.call(loadCache, u);
				else Map.prototype.set.call(loadCache, u, job);
			};
			try {
				const probeNs = await ctx.loader.import(entryUrlFinal, () => []);
				const probe = ctx.loader.unwrapExports(probeNs);
				if (!(probe && (typeof probe === "function" || typeof probe.apply === "function"))) {
					restorePrecheckCache();
					selfReloading = false;
					return "ERROR: 自重载预检失败——新代码导出非有效插件（缺 apply），已拒绝自杀（旧代码继续运行）";
				}
			} catch (e) {
				restorePrecheckCache();
				selfReloading = false;
				auditLog("precheck-failed", String(e));
				return `ERROR: 自重载预检失败——新代码无法加载（${String(e).slice(0, 200)}），已拒绝自杀（旧代码继续运行，缓存已恢复）`;
			}
			try {
				for (const u of urls) Map.prototype.delete.call(loadCache, u);
			} catch {}
			globalThis.setTimeout(() => {
				try {
					const cur = selfEntry?.fiber;
					if (!cur || FIBER_NAMES[cur.state] !== "active") {
						auditLog("watchdog", "重启器 5s 未完成重建（疑似异步挂起），触发自愈");
						scheduleHeal(selfEntry, "watchdog-timeout");
					}
				} catch {}
			}, 5e3);
			globalThis.setTimeout(() => {
				(async () => {
					try {
						const entry = selfEntry;
						if (!entry || typeof entry._dispose !== "function") throw new Error("selfEntry 无官方 _dispose（loader 契约缺失）");
						const rebootCtx = ctx.root;
						const previousPlugin = entry.fiber?.runtime?.callback ?? null;
						const fresh = rebootCtx.loader.unwrapExports(await entry.parent.tree.import(entry.options.name, () => []));
						await entry._dispose();
						const startWith = async (plugin) => {
							const fiber = rebootCtx.registry.plugin(plugin, entry.options.config ?? {}, entry.getOuterStack);
							fiber.entry = entry;
							entry.fiber = fiber;
							await fiber.await();
							try {
								if (entry.options.disabled !== void 0) delete entry.options.disabled;
								const parent = entry.parent;
								if (parent && Array.isArray(parent.data)) {
									for (const d of parent.data) if (d && d.id === entry.id && d.disabled !== void 0) delete d.disabled;
								}
							} catch {}
						};
						try {
							await startWith(fresh);
						} catch (error) {
							if (previousPlugin) try {
								await startWith(previousPlugin);
							} catch (rollbackError) {
								throw new AggregateError([error, rollbackError], "reboot 与 rollback 均失败");
							}
							throw error;
						}
						try {
							const name = String(entry.options.name ?? "");
							if (name) {
								const cm = rebootCtx.get("clientModules");
								if (cm && typeof cm.processOne === "function") cm.processOne(name);
							}
						} catch {}
						logger.info("[super-injector] 重启器重建完成（REPLACE 语义，fiber=%s）", entry.fiber?.state);
					} catch (error) {
						logger.error("[super-injector] 重启器重建失败: %s", String(error));
						console.error("[super-injector] 重启器重建失败:", error);
						auditLog("reboot-failed", String(error));
						scheduleHeal(selfEntry, "reboot-failed");
					} finally {
						selfReloading = false;
					}
				})();
			}, 100);
			return `OK: 注入器已自杀（dispose + 释放文件句柄），重建已排程（100ms 后由全局定时器执行——重启器生命周期独立于自身 fiber）`;
		}
		for (const entry of ctx.loader.entries()) {
			const o = entry.options;
			if (o.group) continue;
			if (!String(o.name).includes("dsh-super-injector")) continue;
			if (String(o.name).includes(match) || String(o.id).includes(match)) return "ERROR: 重载目标命中注入器自身，但未走自重载路径（匹配串需含 dsh-super-injector）。已拒绝——防止无保护自毁";
		}
		const oldJob = loadCache.get(entryUrlFinal);
		let oldPlugin = null;
		let oldJobUsable = false;
		try {
			oldPlugin = ctx.loader.unwrapExports(oldJob?.module?.getNamespace());
			oldJobUsable = oldPlugin !== null && oldPlugin !== void 0;
		} catch {
			oldJobUsable = false;
		}
		if (!oldJobUsable) {
			const backup = /* @__PURE__ */ new Map();
			for (const u of urls) {
				backup.set(u, loadCache.get(u));
				Map.prototype.delete.call(loadCache, u);
			}
			try {
				const fresh = ctx.loader.unwrapExports(await ctx.loader.import(entryUrlFinal, () => []));
				for (const entry of ctx.loader.entries()) {
					const opts = entry.options;
					if (opts?.name && String(opts.name).includes(match)) {
						const fiber = entry.fiber;
						if (fiber && typeof fiber === "object") {
							if (typeof fiber.dispose === "function") try {
								await fiber.dispose();
							} catch {}
							const registry = ctx.registry;
							if (registry && typeof registry.delete === "function" && typeof registry.plugin === "function") {
								registry.delete(fiber);
								const nf = registry.plugin(fresh, entry.options.config ?? {}, () => []);
								nf.entry = entry;
								entry.fiber = nf;
							}
						}
					}
				}
				return `OK: ${match} 坏缓存兜底重载完成（无旧代回滚）`;
			} catch (e) {
				for (const [u, job] of backup) loadCache.set(u, job);
				return "ERROR: 兜底 import 失败，已恢复原缓存: " + (e instanceof Error ? e.stack : String(e));
			}
		}
		const runtime = ctx.registry.get(oldPlugin);
		if (!runtime) {
			const target = [...ctx.loader.entries()].find((en) => {
				const o = en.options;
				return o?.name && String(o.name).includes(match);
			});
			if (target?.fiber) try {
				if (typeof target.fiber.dispose === "function") await target.fiber.dispose();
				const backup2 = /* @__PURE__ */ new Map();
				for (const u of urls) {
					backup2.set(u, loadCache.get(u));
					Map.prototype.delete.call(loadCache, u);
				}
				const fresh2 = ctx.loader.unwrapExports(await ctx.loader.import(entryUrlFinal, () => []));
				const nf2 = ctx.registry.plugin(fresh2, target.options.config ?? {}, () => []);
				nf2.entry = target;
				target.fiber = nf2;
				normalizeEntriesByName(match);
				return `OK: registry 无 runtime，entry.fiber 直接重建（state=${nf2.state}）`;
			} catch (e) {
				return "ERROR: entry 重建失败: " + (e instanceof Error ? e.stack : String(e));
			}
			return "ERROR: registry 中无该插件 runtime 且 entry 无 fiber";
		}
		const backup = /* @__PURE__ */ new Map();
		for (const u of urls) {
			backup.set(u, loadCache.get(u));
			Map.prototype.delete.call(loadCache, u);
		}
		let fresh;
		try {
			fresh = ctx.loader.unwrapExports(await ctx.loader.import(entryUrlFinal, () => []));
		} catch (e) {
			for (const [u, job] of backup) loadCache.set(u, job);
			return "ERROR: import 失败，已回滚缓存（旧代保留）: " + (e instanceof Error ? e.stack : String(e));
		}
		function currentConfigOf(fallback) {
			try {
				for (const entry of ctx.loader.entries()) {
					const opts = entry.options;
					if (opts?.name && String(opts.name).includes(match) && opts.config !== void 0) {
						if (typeof fallback === "object" && fallback !== null && typeof opts.config === "object" && opts.config !== null) return {
							...fallback,
							...opts.config
						};
						return opts.config;
					}
				}
			} catch {}
			return fallback;
		}
		const fibers = [...runtime.fibers];
		const failures = [];
		let rebuilt = 0;
		try {
			const config = currentConfigOf(fibers[0]?._config);
			const oldFiberEntry = [...ctx.loader.entries()].find((en) => {
				const o = en.options;
				return o?.name && String(o.name).includes(match);
			})?.fiber;
			if (oldFiberEntry && typeof oldFiberEntry.dispose === "function") try {
				await oldFiberEntry.dispose();
			} catch {}
			ctx.registry.delete(oldPlugin);
			const newFibers = [];
			for (const oldFiber of fibers) try {
				const fiber = oldFiber.parent.registry.plugin(fresh, config, () => []);
				fiber.entry = oldFiber.entry;
				if (fiber.entry) fiber.entry.fiber = fiber;
				newFibers.push(fiber);
				rebuilt++;
			} catch (e) {
				failures.push(String(e));
			}
			await Promise.allSettled(newFibers.map((f) => {
				return (typeof f.await === "function" ? f.await() : void 0) ?? Promise.resolve();
			}));
		} catch (e) {
			for (const [u, job] of backup) loadCache.set(u, job);
			try {
				ctx.registry.delete(fresh);
				for (const oldFiber of fibers) {
					const fiber = oldFiber.parent.registry.plugin(oldPlugin, currentConfigOf(oldFiber._config), () => []);
					fiber.entry = oldFiber.entry;
					if (fiber.entry) fiber.entry.fiber = fiber;
				}
			} catch {}
			const message = String(e instanceof Error ? e.stack ?? e.message : e);
			if (message.includes("duplicate") || message.includes("already registered")) {
				const cleaned = clearRoutesByMatch(match);
				return "ERROR: 检测到未登记的裸注册（" + (e instanceof Error ? e.message : String(e)) + "）——插件必须把资源注册挂到 ctx.effect（登记后 dispose 自动清理，热重载不再残留）。\n已自动清理疑似残留路由：" + (cleaned.length ? cleaned.join(", ") : "（无）") + "\n请重载重试；若仍失败请检查插件源码中的裸注册。";
			}
			return "ERROR: 重建失败，已回滚（旧代保留）: " + message;
		}
		if (failures.length) return `WARN: ${match} 部分重建（${rebuilt}/${fibers.length}）: ${failures.join("; ")}`;
		normalizeEntriesByName(match);
		const activeEntry = [...ctx.loader.entries()].find((en) => {
			const o = en.options;
			return !o.group && String(o.name).includes(match) && en.fiber && FIBER_NAMES[en.fiber.state] === "active";
		});
		const fullName = activeEntry?.options.name ?? match;
		try {
			const dbg = [`[${(/* @__PURE__ */ new Date()).toISOString()}] reload match=${match} fullName=${fullName}`, `  activeEntry=${activeEntry ? activeEntry.id : "none"} fiberState=${activeEntry?.fiber ? FIBER_NAMES[activeEntry.fiber.state] : "?"} entry.disabled=${activeEntry ? activeEntry.disabled : "?"} options.disabled=${activeEntry ? JSON.stringify(activeEntry.options.disabled) : "?"}`];
			const cmDbg = ctx.get("clientModules");
			dbg.push(`  cm=${cmDbg ? "yes" : "no"} clientPath(short)=${cmDbg?.clientPath ? String(cmDbg.clientPath(match)) : "?"} clientPath(full)=${cmDbg?.clientPath ? String(cmDbg.clientPath(fullName)) : "?"}`);
			if (cmDbg?.table) {
				const keys = [];
				for (const k of cmDbg.table.keys()) keys.push(String(k));
				dbg.push(`  table keys(${keys.length}): ${keys.filter((k) => k.includes("dsh-external")).join(",") || "(none)"}`);
			}
			appendFileSync(join(dshHome, "super-injector", "reload-debug.log"), dbg.join("\n") + "\n");
		} catch {}
		refreshClientRow(fullName);
		notifyClientRebuilt(fullName);
		const client = clientStatus(fullName);
		recordOp("reload", rebuilt > 0);
		return `OK: ${match} 热重载完成（清缓存 ${urls.length} 模块，重建 ${rebuilt} fiber）\n- ${client}`;
	}
	/** 当前 loader 已装配插件清单（确定性信息：id/name/fiber 状态/入口）。 */
	function listPlugins() {
		const lines = [];
		const injectedNames = new Set(readRegistry().map((e) => e.name));
		for (const entry of ctx.loader.entries()) {
			const opts = entry.options;
			if (opts.group) continue;
			const state = entry.fiber ? FIBER_NAMES[entry.fiber.state] ?? `state:${entry.fiber.state}` : "no-fiber";
			const entryUrl = [...ctx.loader.internal.loadCache.keys()].find((u) => typeof u === "string" && u.includes(opts.id));
			const injected = injectedNames.has(opts.name) ? " [injected]" : "";
			lines.push(`- [${state}] ${opts.id} (${opts.name})${injected}${opts.disabled ? " [disabled]" : ""}${entryUrl ? "\n    entry: " + entryUrl : ""}`);
		}
		return lines.length ? lines.join("\n") : "（loader 中无已装配插件 entry）";
	}
	/** 查找匹配的 entry（id 或 name 子串）——优先活跃 entry，跳过 disposed/failed/disabled 残留。 */
	function findEntry(match) {
		const candidates = [];
		for (const entry of ctx.loader.entries()) {
			const opts = entry.options;
			if (opts.group) continue;
			if (opts.id.includes(match) || opts.name.includes(match)) candidates.push(entry);
		}
		if (candidates.length === 0) return void 0;
		const live = candidates.find((e) => {
			return stateOf(e) === "active";
		});
		if (live) return live;
		return candidates.find((e) => {
			const st = stateOf(e);
			return st !== "disposed" && st !== "failed" && st !== "no-fiber";
		}) ?? candidates[0];
	}
	const staged = /* @__PURE__ */ new Map();
	const stagingFile = join(dirname(registryFile), "staging.json");
	function saveStaging() {
		try {
			const data = {};
			for (const [name, t] of staged) if (typeof t.source === "string" && t.source !== "") data[name] = {
				description: t.description,
				parameters: t.parameters,
				source: t.source,
				promoted: t.promoted
			};
			mkdirSync(dirname(stagingFile), { recursive: true });
			writeFileSync(stagingFile, JSON.stringify(data, null, 2), "utf8");
		} catch {}
	}
	/** 恢复持久化的 staging（含 promoted 重新转正注册）。 */
	function restoreStaging() {
		try {
			if (!existsSync(stagingFile)) return;
			const data = JSON.parse(readFileSync(stagingFile, "utf8"));
			for (const [name, raw] of Object.entries(data)) {
				if (typeof raw.source !== "string" || raw.source === "") continue;
				if (staged.has(name)) continue;
				let fn;
				try {
					fn = new Function("args", "ctx", `return (${raw.source})(args, ctx)`);
				} catch {
					continue;
				}
				const tool = {
					description: String(raw.description ?? ""),
					parameters: raw.parameters && typeof raw.parameters === "object" ? raw.parameters : {},
					execute: fn,
					source: raw.source,
					promoted: raw.promoted === true
				};
				staged.set(name, tool);
				if (tool.promoted) try {
					const dispose = ctx.effect(() => ctx.tools.register(defineTool({
						name,
						description: tool.description,
						parameters: tool.parameters,
						output: {
							schema: { type: "string" },
							render: (_x, v) => [{
								type: "text",
								text: String(v)
							}]
						},
						async execute(args) {
							return String(await tool.execute(args, ctx));
						}
					})));
					tool.disposer = () => dispose();
					logger.info("[super-injector] 已恢复转正工具 %s", name);
				} catch {}
			}
		} catch (e) {
			logger.warn("[super-injector] staging 恢复失败: %s", String(e));
		}
	}
	restoreStaging();
	safeRegister(defineTool({
		name: "dev_stage_add",
		description: "开发侧挂：把测试/开发工具挂\"后侧\"（不进 tools schema、不污染缓存前缀），经 dev_stage_call 调用测试。execute 为 JS 代码字符串（function(args, ctx){...}），仅限可信代码。转正用 dev_stage_promote，丢弃用 dev_stage_demote。",
		parameters: {
			name: {
				type: "string",
				required: true,
				description: "工具名（唯一）"
			},
			description: {
				type: "string",
				required: true,
				description: "工具描述"
			},
			parameters: {
				type: "json",
				description: "参数 schema（可选，留空则无参）"
			},
			execute: {
				type: "string",
				required: true,
				description: "JS 代码：function(args, ctx){ return ... }"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_a, v) => [{
				type: "text",
				text: String(v)
			}]
		},
		async execute(args) {
			if (!args.name || !/^[a-zA-Z0-9_-]+$/.test(args.name)) return "ERROR: name 缺失或含非法字符";
			if (staged.has(args.name)) return `ERROR: staging 已存在同名工具（${args.name}），先 dev_stage_demote 或换个名`;
			let fn;
			try {
				fn = new Function("args", "ctx", `return (${args.execute})(args, ctx)`);
			} catch (e) {
				return "ERROR: execute 代码编译失败: " + String(e);
			}
			staged.set(args.name, {
				description: String(args.description ?? ""),
				parameters: args.parameters && typeof args.parameters === "object" ? args.parameters : {},
				execute: fn,
				source: String(args.execute),
				promoted: false
			});
			saveStaging();
			return `OK: ${args.name} 已挂后侧（staging，不进 schema，缓存零污染）。测试: dev_stage_call ${args.name} {"...":...}；转正: dev_stage_promote ${args.name}`;
		}
	}));
	safeRegister(defineTool({
		name: "dev_stage_call",
		description: "调用后侧（staging）工具测试：不进 schema、不污染缓存。args 为传给工具的 JSON 参数对象。",
		parameters: {
			name: {
				type: "string",
				required: true,
				description: "staging 工具名"
			},
			args: {
				type: "json",
				description: "传给工具的 JSON 参数（可选）"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_a, v) => [{
				type: "text",
				text: String(v)
			}]
		},
		async execute(a) {
			const t = staged.get(a.name);
			if (!t) return `ERROR: staging 无此工具（${a.name}）——dev_stage_list 查看`;
			try {
				return String(await t.execute(a.args ?? {}, ctx));
			} catch (e) {
				return "ERROR: " + (e instanceof Error ? e.stack ?? e.message : String(e));
			}
		}
	}));
	safeRegister(defineTool({
		name: "dev_stage_list",
		description: "列出后侧（staging）工具（含转正状态）",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_a, v) => [{
				type: "text",
				text: String(v)
			}]
		},
		async execute() {
			if (staged.size === 0) return "（staging 空）";
			return [...staged.entries()].map(([name, t]) => `- ${name} ${t.promoted ? "[已转正]" : "[后侧]"} : ${t.description.slice(0, 60)}`).join("\n");
		}
	}));
	safeRegister(defineTool({
		name: "dev_stage_promote",
		description: "转正：把 staging 工具一键挂\"前侧\"（正式注册进 tools schema，下一次请求缓存刷新一次）。确认工具有效后使用。",
		parameters: { name: {
			type: "string",
			required: true,
			description: "staging 工具名"
		} },
		output: {
			schema: { type: "string" },
			render: (_a, v) => [{
				type: "text",
				text: String(v)
			}]
		},
		async execute(a) {
			const t = staged.get(a.name);
			if (!t) return `ERROR: staging 无此工具（${a.name}）`;
			if (t.promoted) return `${a.name} 已在前侧（转正过）`;
			try {
				const dispose = ctx.effect(() => ctx.tools.register(defineTool({
					name: a.name,
					description: t.description,
					parameters: t.parameters,
					output: {
						schema: { type: "string" },
						render: (_x, v) => [{
							type: "text",
							text: String(v)
						}]
					},
					async execute(args) {
						return String(await t.execute(args, ctx));
					}
				})));
				t.disposer = () => dispose();
			} catch (e) {
				return "ERROR: 转正注册失败: " + String(e);
			}
			t.promoted = true;
			saveStaging();
			return `OK: ${a.name} 已转正挂前侧（进 schema）。注意：下一次请求将刷新缓存（唯一一次全灭）。`;
		}
	}));
	safeRegister(defineTool({
		name: "dev_stage_demote",
		description: "丢弃/撤回：从 staging 移除工具（若已转正则同时从正式工具集注销）。",
		parameters: { name: {
			type: "string",
			required: true,
			description: "staging 工具名"
		} },
		output: {
			schema: { type: "string" },
			render: (_a, v) => [{
				type: "text",
				text: String(v)
			}]
		},
		async execute(a) {
			const t = staged.get(a.name);
			if (!t) return `ERROR: staging 无此工具（${a.name}）`;
			let unregistered = "";
			if (t.disposer) try {
				t.disposer();
				unregistered = "，已从正式工具集注销";
			} catch (e) {
				unregistered = "，正式工具注销失败: " + String(e);
			}
			staged.delete(a.name);
			saveStaging();
			return `OK: ${a.name} 已从 staging 移除${unregistered}`;
		}
	}));
	function stateOf(entry) {
		return entry.fiber ? FIBER_NAMES[entry.fiber.state] ?? `state:${entry.fiber.state}` : "no-fiber";
	}
	/** 等待 fiber 稳定（active/failed），最多 timeoutMs；返回最终状态。
	*  ⚠️ 超时不等于失败：fiber 可能仍在 loading（插件 apply 慢/异步初始化）——
	*  文案区分"真失败"（failed）与"检查超时"（功能以实际为准，可
	*  dev_plugin_status 复核）。 */
	function waitFiberStable(entry, timeoutMs = 3e3) {
		return new Promise((resolve) => {
			let retried = false;
			let start = Date.now();
			const check = () => {
				const st = stateOf(entry);
				if (st === "active") {
					clearInterval(iv);
					resolve(st);
					return;
				}
				if (st === "failed") {
					clearInterval(iv);
					resolve(st + "（失败）");
					return;
				}
				if (Date.now() - start > timeoutMs) {
					clearInterval(iv);
					if (retried) {
						resolve(st + "（检查超时，功能以实际为准）");
						return;
					}
					retried = true;
					start = Date.now();
					return;
				}
			};
			const iv = setInterval(check, 50);
			check();
		});
	}
	/**
	* 清除 loader 对账标记的 disabled（幽灵 entry 隔离）：
	* 运行时 create 的 entry 不在配置树里，loader 对账（include.refresh /
	* config 变更监听）会把它标 disabled 防双实例——而 client-modules 的
	* processOne 要求 !entry.disabled 才注册 client 模块（**注入插件的 UI
	* 不生效的根因**）。注入器语义：注入 = 完整生效（host 工具 + client UI），
	* 因此注入/重载后立即清除 disabled，让 client 模块可注册。
	* 对账只在 config 变更时触发，清除后不再次对账不会复发。
	*/
	function normalizeEntry(entry) {
		if (!entry) return;
		try {
			const o = entry.options;
			if (o && o.disabled !== void 0 && o.disabled !== null) {
				delete o.disabled;
				const parent = entry.parent;
				if (parent && Array.isArray(parent.data)) {
					for (const d of parent.data) if (d && d.id === entry.id && d.disabled !== void 0) delete d.disabled;
				}
			}
		} catch {}
	}
	/** 按包名清除所有同名 entry 的 disabled（注入/重载后统一调用）。 */
	function normalizeEntriesByName(name) {
		for (const entry of ctx.loader.entries()) {
			const o = entry.options;
			if (o.group) continue;
			if (o.name === name || o.name.includes(name)) normalizeEntry(entry);
		}
	}
	/**
	* 清理同名残留 entry（disposed/failed 且无活跃 fiber），防堆积：
	* 注入失败/自杀失败的旧 entry 会留在 loader 树里，重载时 findEntry
	* 虽已活跃优先，但残留多了会让状态列表失真、`waitFiberStable` 轮询错位。
	*/
	function cleanupStaleEntries(name) {
		for (const entry of ctx.loader.entries()) {
			const o = entry.options;
			if (o.group) continue;
			if (o.name !== name) continue;
			const st = entry.fiber ? FIBER_NAMES[entry.fiber.state] : "no-fiber";
			if (st === "active") continue;
			try {
				const p = entry.parent.remove(entry.id, true);
				if (p && typeof p.then === "function") p.catch(() => {});
				logger.info("[super-injector] 清理残留 entry %s（%s）", entry.id, st);
			} catch {}
		}
	}
	/**
	* client-modules 增量补扫：normalize disabled 发生在 loader.create 的
	* microtask flush **之后**（create await 期间 flush 已用旧 disabled 拒绝），
	* 必须主动重跑 processOne 让注入插件的 client 模块（UI）注册成功。
	* 直接调 private 方法（TS private 编译后是普通属性，运行时可见）。
	*/
	function refreshClientRow(name) {
		try {
			const cm = ctx.get("clientModules");
			if (!cm || typeof cm.processOne !== "function") return;
			if (cm.processOne(name) && typeof cm.compose === "function" && typeof cm.notifyGraphChanged === "function") {
				cm.composed = cm.compose();
				cm.notifyGraphChanged();
				logger.info("[super-injector] client 模块已注册 %s", name);
			}
		} catch (e) {
			logger.warn("[super-injector] client 模块补扫失败: %s", String(e));
		}
	}
	/**
	* 通知 client-modules 重哈希 bundle（rebuilt 是 HMR watch 注册钩子）：
	* host 热重载后 client bundle rev 变化 → onGraphChanged → 浏览器端
	* HMR/刷新拉新 bundle——改 UI 代码 → build:client → reload → 免手动刷新。
	*/
	function notifyClientRebuilt(name) {
		try {
			const cm = ctx.get("clientModules");
			if (cm && typeof cm.rebuilt === "function") {
				const rev = cm.rebuilt(name);
				if (rev) logger.info("[super-injector] client bundle 已联动（rev=%s）", rev);
			}
		} catch {}
	}
	/** 卸载后从 client 模块表移除行（client-modules 只订阅 internal/plugin 增事件，卸载不自动清）。 */
	function removeClientRow(name) {
		try {
			const cm = ctx.get("clientModules");
			if (!cm || !cm.table) return;
			if (cm.table.delete(name)) {
				if (typeof cm.compose === "function" && typeof cm.notifyGraphChanged === "function") {
					cm.composed = cm.compose();
					cm.notifyGraphChanged();
				}
				logger.info("[super-injector] client 模块表已移除 %s", name);
			}
		} catch {}
	}
	const statsFile = join(dirname(registryFile), "stats.json");
	const EMPTY_STATS = {
		inject: {
			ok: 0,
			fail: 0
		},
		reload: {
			ok: 0,
			fail: 0
		},
		uninject: {
			ok: 0,
			fail: 0
		},
		install: {
			ok: 0,
			fail: 0
		},
		selfHeal: {
			ok: 0,
			fail: 0
		},
		lastFailures: []
	};
	function loadStats() {
		try {
			const raw = JSON.parse(readFileSync(statsFile, "utf8"));
			const num = (v) => typeof v === "number" ? v : 0;
			const fails = Array.isArray(raw?.lastFailures) ? raw.lastFailures.slice(-5) : [];
			return {
				inject: {
					ok: num(raw?.inject?.ok),
					fail: num(raw?.inject?.fail)
				},
				reload: {
					ok: num(raw?.reload?.ok),
					fail: num(raw?.reload?.fail)
				},
				uninject: {
					ok: num(raw?.uninject?.ok),
					fail: num(raw?.uninject?.fail)
				},
				install: {
					ok: num(raw?.install?.ok),
					fail: num(raw?.install?.fail)
				},
				selfHeal: {
					ok: num(raw?.selfHeal?.ok),
					fail: num(raw?.selfHeal?.fail)
				},
				lastFailures: fails
			};
		} catch {
			return {
				...EMPTY_STATS,
				inject: { ...EMPTY_STATS.inject },
				reload: { ...EMPTY_STATS.reload },
				uninject: { ...EMPTY_STATS.uninject },
				install: { ...EMPTY_STATS.install },
				selfHeal: { ...EMPTY_STATS.selfHeal },
				lastFailures: []
			};
		}
	}
	const opStats = loadStats();
	function saveStats() {
		try {
			mkdirSync(dirname(statsFile), { recursive: true });
			writeFileSync(statsFile, JSON.stringify(opStats, null, 2), "utf8");
		} catch {}
	}
	/** 审计摘要：最近 3 条故障/自愈事件（读 self-heal.log 尾部）。 */
	function auditSummary() {
		try {
			if (!existsSync(selfHealLogFile)) return "";
			const lines = readFileSync(selfHealLogFile, "utf8").trim().split("\n").filter(Boolean);
			if (lines.length === 0) return "";
			return "\n===== 故障审计（self-heal.log 尾部 3 条）=====\n" + lines.slice(-3).join("\n");
		} catch {
			return "";
		}
	}
	/** 验证 client 模块注册状态（host 侧已完成后的第二验证面）。
	* 区分「无 client 声明（预期跳过）」与「有声明但注册失败（真 ✗）」。 */
	function clientStatus(name) {
		let declared = false;
		try {
			const parts = name.startsWith("@") ? name.split("/") : [name];
			const pkgFile = join(profileNodeModules, ...parts, "package.json");
			const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
			declared = !!(pkg.dsh?.client && pkg.dsh.client.platform === "web");
		} catch {}
		if (!declared) return "client 跳过（无 client 声明，属预期）";
		try {
			const cm = ctx.get("clientModules");
			if (!cm || typeof cm.clientPath !== "function") return "client 服务不可用";
			let path = cm.clientPath(name);
			if (!path && cm.table && typeof cm.table.keys === "function") {
				for (const key of cm.table.keys()) if (String(key).includes(name)) {
					path = cm.clientPath(key);
					break;
				}
			}
			return path ? `client ✓ (${path.split(/[\\/]/).slice(-2).join("/")})` : `client ✗（已声明 client 但注册失败——检查 client bundle 是否构建（build:client）与 entry 状态）`;
		} catch {
			return "client 状态未知";
		}
	}
	/** 记录一次操作结果（ok=true 记成功，否则记失败 + 失败原因可审计）；落盘跨重启累计。 */
	function recordOp(kind, ok, reason) {
		const bucket = opStats[kind];
		if (ok) bucket.ok += 1;
		else {
			bucket.fail += 1;
			opStats.lastFailures = [...opStats.lastFailures.slice(-4), {
				kind,
				at: (/* @__PURE__ */ new Date()).toISOString(),
				reason: reason ?? ""
			}];
		}
		saveStats();
	}
	/**
	* B: 官方 entry 仲裁——幽灵压制官方时自动清理恢复（kill_zombie 自动化）。
	* 场景（实测多次踩坑）：运行时 loader.create（注入/自愈 fallback）产生幽灵
	* entry，与官方 bundles entry 并存 → include 对账把官方 entry 标 disabled →
	* 官方清单 enabled=false、实际跑在幽灵上。仲裁：检测到「官方 disabled +
	* 幽灵 active」→ 排程（1s 后，避开当前调用栈）：dispose 幽灵 → 移除幽灵
	* entry → 恢复官方（清 disabled + refresh）。触发点：apply 末尾 + 自愈成功。
	*/
	function arbitrateOfficial() {
		try {
			const entries = [...ctx.loader.entries()].filter((e) => !e.options.group && String(e.options.name).includes("dsh-super-injector"));
			if (entries.length < 2) return;
			const official = entries.find((e) => String(e.id).includes("include:"));
			const ghosts = entries.filter((e) => e !== official && e.fiber && FIBER_NAMES[e.fiber.state] === "active");
			if (!official || !official.disabled || ghosts.length === 0) return;
			auditLog("arbitrate", `幽灵压制官方（official=${official.id} disabled，ghosts=${ghosts.map((g) => g.id).join(",")}），排程清理`);
			const ghostRef = ghosts[0];
			const officialRef = official;
			globalThis.setTimeout(() => {
				(async () => {
					try {
						if (ghostRef.fiber && typeof ghostRef.fiber.dispose === "function") await ghostRef.fiber.dispose();
						try {
							await ghostRef.parent.remove(ghostRef.id, true);
						} catch {}
						try {
							if (officialRef.options.disabled !== void 0) delete officialRef.options.disabled;
							const parent = officialRef.parent;
							if (parent && Array.isArray(parent.data)) {
								for (const d of parent.data) if (d && d.id === officialRef.id && d.disabled !== void 0) delete d.disabled;
							}
							officialRef.fiber = void 0;
							if (typeof officialRef.refresh === "function") await officialRef.refresh();
							auditLog("arbitrate-ok", `官方 entry 恢复（${officialRef.id}），幽灵 ${ghostRef.id} 已清理`);
						} catch (e) {
							auditLog("arbitrate-failed", `官方恢复失败: ${String(e)}`);
						}
					} catch (e) {
						auditLog("arbitrate-failed", String(e));
					}
				})();
			}, 1e3);
		} catch {}
	}
	/** 注入一个本地插件包：junction → loader.create → 记录清单。 */
	async function inject(dir) {
		const absDir = resolve(dir);
		const pkgPath = join(absDir, "package.json");
		if (!existsSync(absDir) || !statSync(absDir).isDirectory()) return `ERROR: 目录不存在或不可访问: ${absDir}`;
		if (!existsSync(pkgPath)) return `ERROR: ${absDir} 存在但没有 package.json（不是插件包目录）`;
		let pkg;
		try {
			pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		} catch (e) {
			return "ERROR: package.json 解析失败: " + String(e);
		}
		const pkgName = pkg.name;
		if (!pkgName) return "ERROR: package.json 缺 name";
		cleanupStaleEntries(pkgName);
		if (hasActiveEntry(pkgName)) return `INFO: ${pkgName} 已激活运行，跳过注入`;
		purgeCache(absDir);
		const parts = pkgName.startsWith("@") ? pkgName.split("/") : [pkgName];
		const linkDir = join(profileNodeModules, ...parts);
		try {
			let linkExists = false;
			try {
				linkExists = lstatSync(linkDir).isSymbolicLink() || lstatSync(linkDir).isDirectory();
			} catch {}
			if (!linkExists || !isHealthyLink(linkDir)) {
				if (linkExists) try {
					rmSync(linkDir, {
						recursive: true,
						force: true
					});
				} catch {}
				mkdirSync(dirname(linkDir), { recursive: true });
				symlinkSync(absDir, linkDir, "junction");
			}
		} catch (e) {
			return `ERROR: 建立 junction 失败（${linkDir}）: ${String(e)}`;
		}
		try {
			await ctx.loader.create({
				name: pkgName,
				config: {}
			});
		} catch (e) {
			return `ERROR: loader.create 失败: ${e instanceof Error ? e.stack : String(e)}`;
		}
		normalizeEntriesByName(pkgName);
		refreshClientRow(pkgName);
		const list = readRegistry();
		if (!list.some((e) => e.dir === absDir)) {
			list.push({
				dir: absDir,
				name: pkgName,
				at: (/* @__PURE__ */ new Date()).toISOString()
			});
			writeRegistry(list);
		}
		const hostOk = hasActiveEntry(pkgName);
		const client = clientStatus(pkgName);
		recordOp("inject", hostOk);
		return `OK: ${pkgName} 已注入（junction=${linkDir}）\n- host ${hostOk ? "✓" : "✗"}\n- ${client}`;
	}
	/** 卸载一个已注入的插件包：卸 entry（fiber dispose）→ 清 registry → 删 junction。 */
	async function uninject(match, allowSelf = false) {
		if (match.includes("super-injector") && !allowSelf) return "ERROR: 拒绝卸载 dsh-super-injector 自身（引导器不可卸载；自举卸载需 self=true）";
		const steps = [];
		let fullName = null;
		for (const entry of ctx.loader.entries()) {
			const opts = entry.options;
			if (opts.group) continue;
			if (!opts.name.includes(match)) continue;
			fullName = opts.name;
			try {
				await entry.parent.remove(entry.id, true);
				steps.push("entry 已卸载: " + opts.name);
			} catch (e) {
				steps.push("entry 卸载失败: " + String(e));
			}
		}
		if (!steps.some((s) => s.startsWith("entry 已卸载"))) steps.push("（无匹配 entry）");
		if (fullName && !allowSelf) {
			const idShort = fullName.split("/").pop();
			if (idShort) {
				const patchFile = join(dirname(profileNodeModules), "cordis.patch.yml");
				let already = false;
				try {
					already = readFileSync(patchFile, "utf8").includes(`id: ${idShort}`);
				} catch {}
				if (already) steps.push("profile patch 已有 disabled（幂等跳过）");
				else if (writePatch(`\n# 已卸载插件（${fullName}）：disabled 阻断其 bundle patch 自装配\n- id: ${idShort}\n  disabled: true\n`)) steps.push("profile patch 已写 disabled（阻断自装配，防 refresh 加回；writePatch 兼容 [] 初始形式）");
				else steps.push("profile patch 写入失败");
			}
		}
		const reg = readRegistry();
		const hit = reg.find((e) => e.name.includes(match) || e.dir.includes(match));
		if (hit) fullName ??= hit.name;
		const after = reg.filter((e) => !e.name.includes(match) && !e.dir.includes(match));
		if (after.length !== reg.length) {
			writeRegistry(after);
			steps.push("registry 已清理");
		}
		if (fullName && !allowSelf) {
			const parts = fullName.startsWith("@") ? fullName.split("/") : [fullName];
			const linkDir = join(profileNodeModules, ...parts);
			try {
				if (existsSync(linkDir)) {
					rmdirSync(linkDir);
					steps.push("junction 已删除: " + linkDir);
				} else steps.push("（junction 不存在）");
			} catch (e) {
				steps.push("junction 删除失败: " + String(e));
			}
		} else steps.push("（未找到完整包名，跳过 junction 清理）");
		if (fullName) {
			removeClientRow(fullName);
			steps.push("client 模块表已清理");
		}
		const entryUnloaded = steps.some((s) => s.startsWith("entry 已卸载"));
		const noMatch = steps.some((s) => s.startsWith("（无匹配 entry）"));
		if (entryUnloaded) recordOp("uninject", true);
		else if (!noMatch) recordOp("uninject", false);
		return "OK: 卸载完成\n- " + steps.join("\n- ");
	}
	/** junction 健康检查：能读目录 = 目标可达（Windows 断电后悬空 junction 的 lstat 仍是链接但读目录抛错）。 */
	function isHealthyLink(p) {
		try {
			if (!lstatSync(p).isSymbolicLink()) return false;
			readdirSync(p);
			return true;
		} catch {
			return false;
		}
	}
	/** 启动自动恢复：① bundle junction 断电自愈（profile packages 的 link:）→ ② 注入清单逐个重新注入。 */
	/** client 骨架校验（注入前 + autoRestore 恢复前共用——pixel-forge 事件教训：
	* 坏 client 插件在 registry → 新会话恢复 → apply 失败 → HARNESS 启动失败）。
	* 返回问题列表（空 = 健康）。lib 与 src 双检查（只有 lib 无 src 不绕过）。
	* ⚠️ slot 白名单（2026-08-14 dsh-external-plugins 事件教训）：注册的 slot 名
	* 必须位于已知合法集合内——早期只认 conversation.view，导致 settings.plugin.item
	* 等设置页卡片被误判为坏骨架；同时白名单外的陌生 slot 名仍视为异常，防 typo。 */
	const KNOWN_SLOTS = [
		"conversation.view",
		"settings.plugin.item",
		"settings.plugins.tab",
		"settings.section",
		"settings.general.item",
		"conversation.session.header.actions",
		"conversation.session.header.utilities",
		"conversation.input.dock",
		"conversation.composer.dock",
		"sidebar.footer.action",
		"shell.overlay"
	];
	const SLOT_ALT = KNOWN_SLOTS.map((s) => s.replace(/\./g, "\\.")).join("|");
	const REGISTER_NAME = new RegExp(`register\\(\\{[\\s\\S]*?name:\\s*['"](${SLOT_ALT})['"]`);
	function clientSkeletonProblems(base) {
		const problems = [];
		try {
			const libClient = join(base, "lib", "client.js");
			if (existsSync(libClient)) {
				const lib = readFileSync(libClient, "utf8");
				if (!/inject\s*=\s*\[[^\]]*['"]slots['"]/.test(lib) && !/inject\s*:\s*\[[^\]]*['"]slots['"]/.test(lib)) problems.push("lib/client.js 缺 inject 含 slots（apply 用 ctx.slots 必须声明——cordis 服务注入契约）");
				if (!REGISTER_NAME.test(lib)) problems.push(`lib/client.js 的 register 缺合法 name（应为已知 slot：${KNOWN_SLOTS.join(" / ")}）`);
			}
			const clientSrcPath = join(base, "src", "client", "index.ts");
			if (existsSync(clientSrcPath)) {
				const src = readFileSync(clientSrcPath, "utf8");
				if (!/export const inject\s*=\s*\[[^\]]*['"]slots['"]/.test(src)) problems.push("src/client/index.ts 缺 export const inject = ['slots']（apply 用 ctx.slots 必须声明，否则报 cannot get property 'slots' without inject）");
				if (!REGISTER_NAME.test(src)) problems.push(`slots.register 缺合法 name（应为已知 slot：${KNOWN_SLOTS.join(" / ")}——缺了报 slot undefined is not declared）`);
			}
		} catch {}
		return problems;
	}
	/**
	* 构建产物新鲜度校验（2026-08-14 index build 事件教训：漏构建 client /
	* lib 过期 → 前端 bundle script failed to load + host 跑旧代码）。
	* 注入/重载/恢复/构建后四路共用：
	*  - block：必崩项——声明了 dsh.client 但 lib/client.js 缺失，或非 tsdown
	*    产物（缺 __ModuleLoader__ 特征，可能被 tsc 覆盖/手改）→ 阻断操作；
	*  - warn：质量项——src 比产物新（疑似漏 build / build:client）→ 提示。
	*    纯 mtime 比较在 git checkout 场景可能误报（检出的 src 时间戳更新），
	*    故只警告不阻断。无 src 的目录（纯 dist 发布形态）跳过新鲜度。
	*/
	function buildFreshnessProblems(base) {
		const block = [];
		const warn = [];
		try {
			const pkgPath = join(base, "package.json");
			if (!existsSync(pkgPath)) return {
				block,
				warn
			};
			const pkgBuf = readFileSync(pkgPath);
			if (pkgBuf.length >= 3 && pkgBuf[0] === 239 && pkgBuf[1] === 187 && pkgBuf[2] === 191) block.push("package.json 带 UTF-8 BOM（EF BB BF）——tsdown/JSON.parse 无法解析，构建必挂；用无 BOM 工具重写（node 写文件，勿用 PowerShell Set-Content -Encoding UTF8）");
			const hasClient = !!JSON.parse(readFileSync(pkgPath, "utf8")).dsh?.client;
			const srcDir = join(base, "src");
			let hostLatest = 0;
			let clientLatest = 0;
			const walk = (dir, onFile) => {
				let entries;
				try {
					entries = readdirSync(dir, { withFileTypes: true });
				} catch {
					return;
				}
				for (const f of entries) {
					const p = join(dir, f.name);
					if (f.isDirectory()) walk(p, onFile);
					else if (/\.(ts|tsx)$/.test(f.name)) onFile(p);
				}
			};
			if (existsSync(srcDir)) walk(srcDir, (p) => {
				try {
					const mt = statSync(p).mtimeMs;
					if (p.replace(/\\/g, "/").includes("/client/")) {
						if (mt > clientLatest) clientLatest = mt;
					} else if (mt > hostLatest) hostLatest = mt;
				} catch {}
			});
			const libIndex = join(base, "lib", "index.js");
			if (existsSync(libIndex)) {
				let mt = 0;
				try {
					mt = statSync(libIndex).mtimeMs;
				} catch {}
				if (hostLatest > 0 && hostLatest - mt > 8e3) warn.push("lib/index.js 过期（src 修改晚于构建 8s+，疑似漏 npm run build——重载会跑旧代码）");
			}
			if (hasClient) {
				const libClient = join(base, "lib", "client.js");
				if (!existsSync(libClient)) block.push("lib/client.js 不存在（package.json 声明了 dsh.client 但没构建 client——先 npm run build:client，否则前端必挂）");
				else try {
					if (!readFileSync(libClient, "utf8").includes("__ModuleLoader__")) block.push("lib/client.js 不是 tsdown bundle（缺 __ModuleLoader__ 特征——可能被 tsc 覆盖或手改，重新 npm run build:client）");
					let mt = 0;
					try {
						mt = statSync(libClient).mtimeMs;
					} catch {}
					if (clientLatest > 0 && clientLatest - mt > 8e3) warn.push("lib/client.js 过期（src/client 修改晚于构建 8s+，疑似漏 npm run build:client——前端会加载旧 UI）");
				} catch {}
			}
		} catch {}
		return {
			block,
			warn
		};
	}
	/**
	* profile link: 依赖 junction 自愈（2026-08-14 扩展）。
	*
	* 正规语义：profile package.json 的 `link:` 依赖声明 → node_modules junction
	* 物化。此前只对 `dsh.profile.bundles` 列表自愈；agent preset 行解析同样走
	* node_modules（preset 挂载 `@dsh-external/dsh-music-forge` 等本地包时按
	* ctx.baseUrl 解析）——deps 里 link: 声明但不在 bundles 的包（如
	* dsh-music-forge 供 music-producer 预设）重启后 junction 会丢，预设挂载
	* 失败。同一物化机制，同一重建逻辑，自愈范围推广到**全部 link: 依赖**。
	* registry 包（非 link:）不在此列——它们的 node_modules 由包管理器管理。
	* @returns 重建的 junction 描述列表（空 = 全部健康）。
	*/
	function healProfileLinks() {
		const healed = [];
		try {
			const profileDir = dirname(profileNodeModules);
			const profilePkg = JSON.parse(readFileSync(join(profileDir, "package.json"), "utf8"));
			const bundles = profilePkg?.dsh?.profile?.bundles ?? [];
			const deps = profilePkg?.dependencies ?? {};
			const bundleSet = new Set(bundles);
			const linkNames = Object.keys(deps).filter((n) => String(deps[n] ?? "").startsWith("link:"));
			for (const name of linkNames) {
				const target = String(deps[name]).slice(5);
				if (!target || !existsSync(target)) continue;
				const scope = name.startsWith("@") ? name.split("/")[0] : null;
				const linkDir = join(profileNodeModules, scope ?? "");
				const linkPath = join(linkDir, scope ? name.split("/")[1] : name);
				if (!isHealthyLink(linkPath)) {
					try {
						if (existsSync(linkPath)) rmdirSync(linkPath);
					} catch {}
					try {
						mkdirSync(linkDir, { recursive: true });
						symlinkSync(target, linkPath, "junction");
						healed.push(`${name} → ${target}`);
						logger.warn("[super-injector] 断电自愈：重建 junction %s → %s", name, target);
					} catch (err) {
						logger.warn("[super-injector] junction 重建失败 %s: %s", name, String(err));
					}
				}
			}
			for (const name of bundles) if (bundleSet.has(name) && !linkNames.includes(name)) {
				if (!(deps[name] ?? "").startsWith("link:") && !isHealthyLink(join(profileNodeModules, ...name.startsWith("@") ? name.split("/") : [name]))) logger.warn("[super-injector] bundle %s 非 link 依赖且 junction 异常（registry 包由包管理器管理）", name);
			}
		} catch (err) {
			logger.warn("[super-injector] link 依赖 junction 自愈扫描失败: %s", String(err));
		}
		return healed;
	}
	async function restore() {
		try {
			healProfileLinks();
		} catch (err) {
			logger.warn("[super-injector] junction 自愈扫描失败: %s", String(err));
		}
		for (const e of readRegistry()) try {
			if (hasActiveEntry(e.name)) continue;
			const problems = clientSkeletonProblems(e.dir);
			const fresh = buildFreshnessProblems(e.dir);
			const block = [...problems, ...fresh.block];
			if (block.length > 0) {
				auditLog("restore-skip-bad-client", `${e.name} client 骨架/构建产物问题，跳过恢复: ${block.join("; ")}`);
				logger.warn("[super-injector] 恢复 %s 跳过（client 骨架/构建产物问题）: %s", e.name, block.join("; "));
				continue;
			}
			await inject(e.dir);
			logger.info("[super-injector] 自动恢复 %s", e.name);
		} catch (err) {
			logger.warn("[super-injector] 恢复 %s 失败: %s", e.name, err instanceof Error ? err.stack : String(err));
		}
	}
	if (config.autoRestore) restore();
	const fingerprints = /* @__PURE__ */ new Map();
	const lastDangleTs = /* @__PURE__ */ new Map();
	let reloading = false;
	ctx.setInterval(() => {
		if (reloading) return;
		const watchList = [...watches];
		for (const e of readRegistry()) if (!watchList.some((w) => w.dir === e.dir)) watchList.push({
			dir: e.dir,
			match: e.name
		});
		for (const w of watchList) {
			if (String(w.match).includes("dsh-super-injector")) continue;
			const fp = fingerprintOf(join(w.dir, "lib"));
			if (fp === null) {
				const now = Date.now();
				const prevDang = lastDangleTs.get(w.dir);
				if (prevDang === void 0 || now - prevDang > 3e4) {
					lastDangleTs.set(w.dir, now);
					auditLog("watch-dangling", `目录不可读，跳过自动重载（源被删/悬空 junction）: ${w.dir}`);
				}
				continue;
			}
			lastDangleTs.delete(w.dir);
			const prev = fingerprints.get(w.dir);
			if (prev !== void 0 && prev !== fp) {
				fingerprints.set(w.dir, fp);
				reloading = true;
				const libFile = join(w.dir, "lib", "index.js");
				(existsSync(libFile) ? ctx.loader.import(pathToFileURL(libFile).href, () => []).then((ns) => {
					const probe = ctx.loader.unwrapExports(ns);
					return !!(probe && (typeof probe === "function" || typeof probe.apply === "function"));
				}).catch(() => false) : Promise.resolve(false)).then((probeOk) => {
					if (!probeOk) {
						reloading = false;
						auditLog("watch-precheck-blocked", `自动重载预检失败（新代码不可加载），保持旧代码: ${w.dir}`);
						logger.warn("[super-injector] 自动重载预检失败，跳过（旧代码继续运行）: %s", w.dir);
						return;
					}
					reloadPackage(w.match, w.dir).then((r) => logger.info("[super-injector] %s", r)).catch((e) => logger.warn("[super-injector] %s", e instanceof Error ? e.stack : String(e))).finally(() => {
						reloading = false;
					});
				});
				return;
			}
			fingerprints.set(w.dir, fp);
		}
	}, intervalMs);
	function safeRegister(tool) {
		try {
			ctx.effect(() => ctx.tools.register(tool), `dsh-super-injector: ${tool.name ?? "tool"}`);
		} catch (e) {
			logger.warn("[super-injector] 跳过冲突工具注册: %s", e instanceof Error ? e.message : String(e));
		}
	}
	/** 启动自净：清除历史版本裸注册残留的同名工具（僵尸闭包），再注册新工具。 */
	function purgeStaleTools() {
		try {
			const toolsSvc = ctx.get("tools");
			if (!toolsSvc) return;
			const names = [];
			const table = toolsSvc.layers?.global?.tools;
			if (table && typeof table.keys === "function") {
				for (const name of table.keys()) if (typeof name === "string" && name.startsWith("dev_")) names.push(name);
			}
			for (const name of names) try {
				if (typeof toolsSvc.unregister === "function") toolsSvc.unregister(name);
				else if (table) Map.prototype.delete.call(table, name);
			} catch {}
			if (names.length > 0) {
				logger.warn("[super-injector] 已清理 %d 个僵尸工具残留: %s", names.length, names.join(","));
				auditLog("purge-stale-tools", names.join(","));
			}
		} catch {}
	}
	purgeStaleTools();
	safeRegister(defineTool({
		name: "dev_inject_plugin",
		description: "超级模组注入器：运行时注入任意本地 DSH 插件包（junction 链接 + loader.create，不碰 patch/package.json、不重启）。参数 = 插件包目录绝对路径（含 package.json 与 lib/）",
		parameters: { dir: {
			type: "string",
			required: true,
			description: "插件包目录绝对路径（如 F:/dsh/03-dev-infra/dsh-xxx）"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const dir = String(args.dir ?? "").trim();
			if (!dir) return "ERROR: dir 必填（插件包目录绝对路径）";
			const problems = clientSkeletonProblems(resolve(dir));
			const fresh = buildFreshnessProblems(resolve(dir));
			const block = [...problems, ...fresh.block];
			if (block.length > 0) return "ERROR: 注入前校验发现 client 骨架/构建产物问题（已阻断——缺 inject 的 client 注入后 Tab 必挂，缺 client bundle 前端必挂）：\n- " + block.join("\n- ") + "\n修复：参照脚手架模板补骨架 → npm run build:all（host + client 两步构建）→ 再注入";
			if (fresh.warn.length > 0) {
				auditLog("inject-stale-artifacts", `${dir}: ${fresh.warn.join("; ")}`);
				logger.warn("[super-injector] 注入 %s 构建产物可能过期（未阻断）: %s", dir, fresh.warn.join("; "));
			}
			return withOpLock(() => inject(dir));
		}
	}));
	safeRegister(defineTool({
		name: "dev_injected_list",
		description: "列出已注入的超级模组清单（registry，含目录与时间）",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute() {
			const list = readRegistry();
			return list.length ? list.map((e) => `- ${e.name} @ ${e.dir}（${e.at}）`).join("\n") : "（无注入记录）";
		}
	}));
	safeRegister(defineTool({
		name: "dev_uninject_plugin",
		description: "超级模组卸载器：卸载已注入的插件包——卸 loader entry（fiber dispose，工具/监听全清理）→ 清注入清单 → 删 profile junction → 另写 profile patch disabled 条目（防 include.refresh 加回），免重启。参数 = 包名子串（如 dsh-toy-supermod）",
		parameters: {
			match: {
				type: "string",
				required: true,
				description: "包名/路径子串（如 dsh-toy-supermod 或 @dsh-external/dsh-toy-supermod）"
			},
			self: {
				type: "boolean",
				description: "自举卸载（仅对 dsh-super-injector 自身）：卸运行时 entry，保留 registry/junction/bundles 装配链，重启后自动装回"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const match = String(args?.match ?? "").trim();
			if (!match) return "ERROR: match 必填（包名/路径子串）";
			return withOpLock(() => uninject(match, Boolean(args.self)));
		}
	}));
	safeRegister(defineTool({
		name: "dev_clear_routes",
		description: "清 webserver 路由表残留：删除 path 前缀匹配的 exact/prefixes/upgrades 条目（插件热重载残留路由的自愈工具，无需重启）",
		parameters: { prefix: {
			type: "string",
			description: "path 前缀（如 /browser-panel）"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const hs = ctx.webServer;
			const out = [];
			for (const tableName of [
				"exact",
				"prefixes",
				"upgrades"
			]) {
				const table = hs?.[tableName];
				if (!table || typeof table.delete !== "function") {
					out.push(`${tableName}: 不可访问`);
					continue;
				}
				const keys = [...table.keys()].filter((k) => String(k).startsWith(args.prefix));
				for (const k of keys) {
					table.delete(k);
					out.push(`deleted ${tableName}[${k}]`);
				}
				if (!keys.length) out.push(`${tableName}: 无匹配`);
			}
			return out.join("\n");
		}
	}));
	safeRegister(defineTool({
		name: "dev_reload_package",
		description: "确定性热重载已加载的 bundle 插件包（清缓存 → 重新 import → registry 重建 fiber，失败回滚保留旧代）。不带参数时返回当下已装配插件清单；带参数重载并给出重载前后 fiber 状态对比。",
		parameters: { packageName: {
			type: "string",
			description: "包路径子串（缺省 = 只列插件清单，不重载）"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			if (!args.packageName) return "===== 当前已装配插件（loader entries）=====\n" + listPlugins();
			const entry = findEntry(args.packageName);
			const before = entry ? stateOf(entry) : "（未找到）";
			const result = await withOpLock(() => reloadPackage(args.packageName));
			const freshEntry = findEntry(args.packageName);
			const after = freshEntry ? await waitFiberStable(freshEntry) : "（未找到）";
			return result + "\n--- 重载前后状态 ---\nbefore: [" + before + "]\nafter: [" + after + "]";
		}
	}));
	safeRegister(defineTool({
		name: "dev_reload_preset",
		description: "预设热更新（agent-presets 新一代，绕 ESM 缓存）：给 .agent-presets/<preset>/agent.cordis.yml 的相对 .mjs 引用加 ?v=N query（N 自增）——组合文件指纹变化 → 新会话挂载新一代 → 新 URL 无缓存命中 → 改代码无需换文件名/重启即可生效。已运行会话保持旧代。",
		parameters: { preset: {
			type: "string",
			description: "预设 id（缺省 = 全部）"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const presetsRoot = join(dshHome, ".agent-presets");
			const names = args.preset ? [args.preset] : (() => {
				try {
					return readdirSync(presetsRoot).filter((d) => !d.startsWith("."));
				} catch {
					return [];
				}
			})();
			if (!names.length) return "ERROR: 未找到任何预设（" + presetsRoot + "）";
			const out = [];
			for (const name of names) {
				const ymlFile = join(presetsRoot, name, "agent.cordis.yml");
				if (!existsSync(ymlFile)) {
					out.push("[" + name + "] 无 agent.cordis.yml（跳过）");
					continue;
				}
				let yml = "";
				try {
					yml = readFileSync(ymlFile, "utf8");
				} catch {
					out.push("[" + name + "] 读取失败（跳过）");
					continue;
				}
				const refs = [...yml.matchAll(/(name: \.\/[A-Za-z0-9._-]+\.mjs)(\?v=\d+)?/g)];
				if (!refs.length) {
					out.push("[" + name + "] 无相对 .mjs 引用（无需热更新）");
					continue;
				}
				const changed = [];
				for (const m of refs) {
					const base = m[1];
					const cur = m[2] ? Number(m[2].slice(3)) : 0;
					yml = yml.replace(m[0], base + "?v=" + (cur + 1));
					changed.push(base.split("/").pop() + " -> ?v=" + (cur + 1));
				}
				try {
					writeFileSync(ymlFile, yml, "utf8");
				} catch {
					out.push("[" + name + "] 写入失败（跳过）");
					continue;
				}
				out.push("[" + name + "] " + changed.join(", "));
			}
			return "OK: 预设热更新\n- " + out.join("\n- ") + "\n注：新会话挂载新一代（新 URL 绕 ESM 缓存）；已运行会话保持旧代";
		}
	}));
	safeRegister(defineTool({
		name: "dev_heal_links",
		description: "profile link: 依赖 junction 自愈（手动触发，免重启）：扫描 profile package.json 全部 link: 依赖（bundles 装配依赖 + agent preset 解析依赖），悬空/缺失的 node_modules junction 重建。返回重建清单。",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute() {
			const healed = healProfileLinks();
			recordOp("selfHeal", healed.length === 0);
			return healed.length > 0 ? `OK: 已重建 ${healed.length} 个 junction\n- ` + healed.join("\n- ") : "OK: 全部 link: 依赖 junction 健康（无需修复）";
		}
	}));
	safeRegister(defineTool({
		name: "dev_fix_patch",
		description: "profile patch 修复：扫描 ~/.dsh/profiles/*/cordis.patch.yml，按 entry id 去重（同 id 保留最后一条，备份原文件）——修复 \"duplicate loader entry id\" 启动崩溃（手动 patch 两次/重复安装造成）。--check 只查不写",
		parameters: {
			profile: {
				type: "string",
				description: "只修指定 profile（缺省全部）"
			},
			check: {
				type: "boolean",
				description: "只检查不写入"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const profilesRoot = join(dshHome, "profiles");
			let profileDirs = [];
			try {
				profileDirs = readdirSync(profilesRoot).filter((d) => !d.startsWith("."));
			} catch {
				return "ERROR: 未找到 profiles 目录: " + profilesRoot;
			}
			if (args.profile) profileDirs = profileDirs.filter((d) => d === args.profile);
			if (!profileDirs.length) return "ERROR: 未找到 profile: " + (args.profile ?? "（空）");
			const out = [];
			let fixedAny = false;
			for (const profile of profileDirs) {
				const patchFile = join(profilesRoot, profile, "cordis.patch.yml");
				if (!existsSync(patchFile)) continue;
				let content = "";
				try {
					content = readFileSync(patchFile, "utf8");
				} catch {
					out.push(`[${profile}] 读取失败（跳过）`);
					continue;
				}
				const blocks = extractPatchBlocks(content);
				const seen = /* @__PURE__ */ new Set();
				const kept = [];
				const dup = [];
				for (const b of blocks) {
					if (b.id) {
						if (seen.has(b.id)) {
							const rec = dup.find((r) => r.id === b.id);
							if (rec) rec.count += 1;
							else dup.push({
								id: b.id,
								count: 1
							});
							continue;
						}
						seen.add(b.id);
					}
					kept.push(b.text);
				}
				if (!dup.length) {
					out.push(`[${profile}] 健康：无重复 id`);
					continue;
				}
				fixedAny = true;
				for (const rec of dup) out.push(`[${profile}] 修复：id "${rec.id}" 重复，删除 ${rec.count} 条（保留最后一条）`);
				if (args.check) continue;
				const bak = patchFile + ".bak-" + Date.now();
				try {
					renameSync(patchFile, bak);
					writeFileSync(patchFile, kept.join("\n").replace(/\s*$/, "") + "\n", "utf8");
					out.push(`[${profile}] 已重写（备份: ${bak}）`);
				} catch (e) {
					out.push(`[${profile}] 写入失败: ${String(e instanceof Error ? e.message : e)}`);
				}
			}
			out.push(fixedAny ? args.check ? "\n发现重复 id（未写入，--check 模式）" : "\n修复完成，现在可以重新启动 dsh" : "\n全部 profile 健康");
			return out.join("\n");
		}
	}));
	safeRegister(defineTool({
		name: "dev_plugin_status",
		description: "列出当下已装配插件清单（id/name/fiber 状态/入口 URL），不执行重载",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute() {
			return `===== 操作统计（跨重启累计）=====\n${[
				"inject",
				"reload",
				"uninject",
				"install",
				"selfHeal"
			].map((k) => `${k} ${opStats[k].ok}✓/${opStats[k].fail}✗`).join(" | ")}${opStats.lastFailures.length ? "\n===== 最近失败（可审计）=====\n" + opStats.lastFailures.map((f) => `[${f.kind} ${f.at}] ${f.reason || "（无原因）"}`).join("\n") : ""}${auditSummary()}\n\n===== 当前已装配插件（loader entries）=====\n` + listPlugins();
		}
	}));
	safeRegister(defineTool({
		name: "dev_install_package",
		description: "热装配一个本地 bundle 插件：改 profile package.json（dependencies 加 link + bundles 数组加包名）→ 建 node_modules junction → loader.create 动态加载（免重启生效）。幂等：已存在的项自动跳过。重启后由 bundles 列表正常装配（双路径一致）",
		parameters: {
			dir: {
				type: "string",
				required: true,
				description: "插件包目录绝对路径（须含 package.json，且已 build 出 lib/）"
			},
			profile: {
				type: "string",
				description: "目标 profile 名（缺省 web）"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			return withOpLock(async () => {
				const dir = String(args.dir);
				const profileName = args.profile ? String(args.profile) : "web";
				try {
					const pkgPath = join(dir, "package.json");
					if (!existsSync(pkgPath)) return "ERROR: 目录无 package.json: " + dir;
					const name = JSON.parse(readFileSync(pkgPath, "utf8")).name;
					if (typeof name !== "string" || !name) return "ERROR: package.json 缺 name";
					const home = process.env.DSH_HOME || join(homedir(), ".dsh");
					const profileDir = join(home, "profiles", profileName);
					const profilePkgPath = join(profileDir, "package.json");
					if (!existsSync(profilePkgPath)) return "ERROR: profile 不存在: " + profileDir;
					const steps = [];
					const raw = readFileSync(profilePkgPath, "utf8");
					const profilePkg = JSON.parse(raw);
					profilePkg.dependencies = profilePkg.dependencies ?? {};
					profilePkg.dsh = profilePkg.dsh ?? {};
					profilePkg.dsh.profile = profilePkg.dsh.profile ?? {};
					profilePkg.dsh.profile.bundles = profilePkg.dsh.profile.bundles ?? [];
					if (profilePkg.dependencies[name]) steps.push("dependencies 已存在（跳过）");
					else {
						profilePkg.dependencies[name] = "link:" + dir;
						steps.push("dependencies += " + name);
					}
					if (profilePkg.dsh.profile.bundles.includes(name)) steps.push("bundles 已存在（跳过）");
					else {
						profilePkg.dsh.profile.bundles.push(name);
						steps.push("bundles += " + name);
					}
					writeFileSync(profilePkgPath, JSON.stringify(profilePkg, null, 2) + "\n", "utf8");
					const scope = name.startsWith("@") ? name.split("/")[0] : null;
					const linkDir = scope ? join(profileDir, "node_modules", scope) : join(profileDir, "node_modules");
					const linkPath = join(linkDir, scope ? name.split("/")[1] : name);
					if (existsSync(linkPath)) steps.push("node_modules link 已存在（跳过）");
					else {
						mkdirSync(linkDir, { recursive: true });
						symlinkSync(dir, linkPath, "junction");
						steps.push("node_modules link 已建立");
					}
					let exists = false;
					for (const entry of ctx.loader.entries()) if (entry.options?.name === name) {
						exists = true;
						break;
					}
					if (exists) {
						steps.push("loader entry 已存在（跳过 create）");
						normalizeEntriesByName(name);
						refreshClientRow(name);
					} else {
						await ctx.loader.create({ name });
						normalizeEntriesByName(name);
						refreshClientRow(name);
						steps.push("loader.create 已热装配（免重启生效）");
					}
					const client = clientStatus(name);
					recordOp("install", steps.some((s) => s.startsWith("dependencies +=") || s.startsWith("dependencies 已存在")));
					return "OK: " + name + " 热装配完成\n- " + steps.join("\n- ") + `\n- ${client}\n（重启后由 bundles 列表正常装配，双路径一致；patch 层配置重启后接管）`;
				} catch (e) {
					return "ERROR: 安装失败: " + String(e);
				}
			});
		}
	}));
	/** DSH checkout 探测（env → 常见路径）。 */
	function detectCheckout() {
		const env = process.env.DSH_CHECKOUT;
		if (env && existsSync(join(env, "packages"))) return env;
		const candidates = [
			join(homedir(), "dsh-harness"),
			join(homedir(), "dsh"),
			join(homedir(), ".dsh", "dsh-harness")
		];
		for (const c of candidates) if (existsSync(join(c, "packages"))) return c;
		return "";
	}
	/** spawnSync 封装（stdout+stderr 合并返回；找不到命令返回 null）。
	* 统一把 web 进程的 node 目录前缀进 PATH（npm.cmd/node 可寻），
	* extraEnv 可覆盖。 */
	function runCmd(cmd, args, cwd, extraEnv) {
		try {
			const sep = process.platform === "win32" ? ";" : ":";
			const env = {
				...process.env,
				PATH: dirname(process.execPath) + sep + (process.env.PATH ?? ""),
				...extraEnv ?? {}
			};
			const r = spawnSync(cmd, args, {
				cwd,
				env,
				encoding: "utf8",
				shell: false,
				maxBuffer: 67108864
			});
			if (r.error) return null;
			const out = String(r.stdout ?? "") + String(r.stderr ?? "");
			return {
				code: r.status ?? -1,
				output: out
			};
		} catch {
			return null;
		}
	}
	/** bash 探测：Git/PortableGit 常见路径优先（确定性）→ PATH 直查（拒绝 WSL 的 bash.exe）。
	* 实测踩坑：Windows 装了 WSL 时 System32\bash.exe 抢先于 PATH 命中——启动即报
	* "适用于 Linux 的 Windows 子系统没有已安装的分发版"，构建必挂。 */
	function findBash() {
		const candidates = [
			join(process.env.USERPROFILE ?? "", ".workbuddy", "binaries", "PortableGit", "versions", "1.2.0", "usr", "bin", "bash.exe"),
			"C:/Program Files/Git/bin/bash.exe",
			"C:/Program Files/Git/usr/bin/bash.exe"
		];
		for (const c of candidates) if (existsSync(c)) return c;
		const probe = spawnSync("bash", ["--version"], { encoding: "utf8" });
		if (!probe.error) {
			const out = String(probe.stdout ?? "") + String(probe.stderr ?? "");
			if (!/wsl\.exe|windows subsystem/i.test(out)) return "bash";
		}
		return "";
	}
	/** npm 可执行名（Node 22 支持直接 spawn .cmd）。 */
	const NPM_CMD = process.platform === "win32" ? "npm.cmd" : "npm";
	/** 可靠 npm 调用：优先 node npm-cli.js（绝对路径，不受 PATH/环境限制）。 */
	function npmRun(args, cwd) {
		const npmCli = join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
		if (existsSync(npmCli)) {
			const r = runCmd(process.execPath, [npmCli, ...args], cwd);
			if (r !== null) return r;
		}
		return runCmd(NPM_CMD, args, cwd);
	}
	safeRegister(defineTool({
		name: "dev_scaffold_plugin",
		description: "插件生产线：生成四种形态的插件骨架（toolkit 工具包 / daemon-loop 守护循环(timer+LLM 自主 agent loop) / ui-panel UI 面板 / hybrid 混合）——package.json（peerDeps 范围声明不硬编码版本）+ tsconfig + build.sh（DSH_CHECKOUT 自动探测）+ 形态源码（资源挂 ctx.effect 规范）+ 可选 client 骨架。生成后：dev_build_plugin 构建 → dev_inject_plugin 注入。",
		parameters: {
			dir: {
				type: "string",
				required: true,
				description: "目标目录（绝对路径，不存在则创建）"
			},
			name: {
				type: "string",
				required: true,
				description: "插件名（如 my-tool；或完整包名 @scope/my-tool）"
			},
			form: {
				type: "string",
				description: "形态：toolkit / daemon-loop / ui-panel / hybrid（缺省 toolkit）"
			},
			description: {
				type: "string",
				description: "一句话描述"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const targetDir = resolve(String(args.dir ?? "").trim());
			const rawName = String(args.name ?? "").trim();
			const form = String(args.form ?? "toolkit").trim();
			if (!targetDir || !rawName) return "ERROR: dir 与 name 必填";
			if (![
				"toolkit",
				"daemon-loop",
				"ui-panel",
				"hybrid"
			].includes(form)) return "ERROR: form 必须是 toolkit / daemon-loop / ui-panel / hybrid";
			if (!/^@?[a-z0-9][a-z0-9-_]*(\/[a-z0-9][a-z0-9-_]*)?$/.test(rawName)) return "ERROR: name 非法（小写字母/数字/-/_，可带 @scope/）";
			const pkgName = rawName.startsWith("@") ? rawName : "@dsh-external/" + rawName;
			try {
				mkdirSync(targetDir, { recursive: true });
				const files = [
					["package.json", scaffoldPackageJson(pkgName, args.description ?? "", form)],
					["tsconfig.json", SCAFFOLD_TSCONFIG],
					[".gitignore", SCAFFOLD_GITIGNORE],
					["scripts/build.sh", SCAFFOLD_BUILD_SH],
					["README.md", `# ${pkgName}\n\n${args.description ?? pkgName + "（" + form + " 形态）"}\n\n由 dsh-super-injector dev_scaffold_plugin 生成。\n\n## 构建与注入\n\n\`\`\`bash\nDSH_CHECKOUT=<checkout> bash scripts/build.sh\n# 注入器环境内：dev_inject_plugin <本目录>\n\`\`\`\n`]
				];
				if (form === "toolkit") files.push(["src/index.ts", scaffoldToolkitSrc(pkgName, args.description ?? "")]);
				else if (form === "daemon-loop") files.push(["src/index.ts", scaffoldDaemonSrc(pkgName, args.description ?? "")]);
				else if (form === "ui-panel") {
					files.push(["src/index.ts", scaffoldUiSrc(pkgName, args.description ?? "")]);
					files.push(["src/client/index.ts", SCAFFOLD_UI_CLIENT(pkgName)]);
					files.push(["tsdown.config.ts", SCAFFOLD_TSDOWN(pkgName)]);
				} else {
					files.push(["src/index.ts", scaffoldDaemonSrc(pkgName, args.description ?? "")]);
					files.push(["src/client/index.ts", SCAFFOLD_UI_CLIENT(pkgName)]);
					files.push(["tsdown.config.ts", SCAFFOLD_TSDOWN(pkgName)]);
				}
				for (const [rel, content] of files) {
					const full = join(targetDir, rel);
					mkdirSync(dirname(full), { recursive: true });
					writeFileSync(full, content, "utf8");
				}
				if (form === "ui-panel" || form === "hybrid") {
					const clientSrc = readFileSync(join(targetDir, "src/client/index.ts"), "utf8");
					const problems = [];
					if (!/export const inject\s*=\s*\[[^\]]*'slots'/.test(clientSrc)) problems.push("缺 export const inject = ['slots']（cordis 服务注入声明——apply 用 ctx.slots 必须声明）");
					if (!/register\(\{[\s\S]*?name:\s*['"](?:conversation\.view|settings\.plugin\.item|settings\.plugins\.tab|settings\.section|settings\.general\.item)['"]/.test(clientSrc)) problems.push("slots.register 缺合法 name（应为已知 slot：conversation.view / settings.plugin.item / settings.plugins.tab / settings.section / settings.general.item——缺了报 slot undefined is not declared）");
					if (problems.length > 0) return "ERROR: client 骨架校验失败（" + pkgName + "）：\n- " + problems.join("\n- ") + "\n（模板异常——请反馈注入器维护，勿直接使用该骨架）";
				}
				auditLog("scaffold", `${pkgName}（${form}）→ ${targetDir}`);
				return `OK: ${pkgName}（${form} 形态）已生成于 ${targetDir}\n- ${files.length} 个文件\n- client 骨架校验通过（inject 声明 + register name）\n下一步：dev_build_plugin {"dir": "${targetDir.replace(/\\/g, "/")}"} → dev_inject_plugin {"dir": "${targetDir.replace(/\\/g, "/")}"}`;
			} catch (e) {
				return "ERROR: 生成失败: " + String(e);
			}
		}
	}));
	safeRegister(defineTool({
		name: "dev_build_plugin",
		description: "插件生产线：构建并打包插件——探测 DSH_CHECKOUT（env/常见路径）→ bash scripts/build.sh（junction link + tsc 编译 host）→ 有 build:client 则 npm run build:client（tsdown 编译 UI）→ npm pack 产出 tgz。依赖：bash/node/npm 在 PATH。返回产物路径。",
		parameters: { dir: {
			type: "string",
			required: true,
			description: "插件目录（含 package.json 与 scripts/build.sh）"
		} },
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const pluginDir = resolve(String(args.dir ?? "").trim());
			if (!pluginDir || !existsSync(join(pluginDir, "package.json"))) return "ERROR: dir 无 package.json";
			const checkout = detectCheckout();
			if (!checkout) return "ERROR: 未找到 DSH checkout（设置 DSH_CHECKOUT 环境变量）";
			let pkg;
			try {
				pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));
			} catch {
				return "ERROR: package.json 解析失败";
			}
			const steps = [];
			if (existsSync(join(pluginDir, "scripts", "build.sh"))) {
				const bash = findBash();
				if (!bash) return "ERROR: bash 不可用（PATH 与常见路径均未找到）";
				const bashBinDir = bash !== "bash" ? dirname(bash) : "";
				const nodeBinDir = dirname(process.execPath);
				const env = { DSH_CHECKOUT: checkout };
				const sep = process.platform === "win32" ? ";" : ":";
				env.PATH = [
					bashBinDir,
					nodeBinDir,
					process.env.PATH ?? ""
				].filter(Boolean).join(sep);
				const r = runCmd(bash, ["scripts/build.sh"], pluginDir, env);
				if (r === null) return "ERROR: bash 不可用（需在 PATH）";
				if (r.code !== 0) return `ERROR: build.sh 失败（exit ${r.code}）:\n${r.output.slice(-1500)}`;
				steps.push(`host 构建完成（${checkout}）`);
			} else return "ERROR: 缺 scripts/build.sh（用 dev_scaffold_plugin 生成）";
			if (typeof (pkg.scripts ?? {})["build:client"] === "string") {
				const r = npmRun(["run", "build:client"], pluginDir);
				if (r === null) return "ERROR: npm 不可用（需在 PATH）";
				if (r.code !== 0) return `ERROR: build:client 失败（exit ${r.code}）:\n${r.output.slice(-1500)}`;
				steps.push("client 构建完成（tsdown → lib/client.js）");
			}
			const r = npmRun(["pack"], pluginDir);
			if (r === null) return "ERROR: npm 不可用（需在 PATH）";
			if (r.code !== 0) return `ERROR: npm pack 失败（exit ${r.code}）:\n${r.output.slice(-800)}`;
			const tgzMatch = /([^\s]+\.tgz)\s*$/m.exec(r.output.trim());
			if (!tgzMatch) return "ERROR: 未识别到 tgz 产物:\n" + r.output.slice(-800);
			const tgz = join(pluginDir, tgzMatch[1]);
			if (!existsSync(tgz)) return "ERROR: tgz 未生成（" + tgz + "）";
			steps.push(`打包完成: ${tgz}`);
			const fresh = buildFreshnessProblems(pluginDir);
			if (fresh.block.length > 0) return `ERROR: 构建完成但产物校验失败（产物不能用于注入/发布）：\n- ${fresh.block.join("\n- ")}`;
			if (fresh.warn.length > 0) steps.push(`⚠️ 产物新鲜度警告（建议核查）: ${fresh.warn.join("; ")}`);
			auditLog("build", `${String(pkg.name)} → ${tgz}`);
			return "OK: " + String(pkg.name) + " 构建打包完成\n- " + steps.join("\n- ") + "\n下一步：dev_inject_plugin / dev_release_plugin";
		}
	}));
	safeRegister(defineTool({
		name: "dev_release_plugin",
		description: "插件生产线：发布 GitHub Release——gh release create v<version> <tgz>（tag + 附件 + notes 模板）。依赖：gh CLI 已认证 + git remote 指向目标仓库。返回 release URL。",
		parameters: {
			dir: {
				type: "string",
				required: true,
				description: "插件目录（含 package.json 与 tgz 产物）"
			},
			version: {
				type: "string",
				description: "版本号（缺省读 package.json version，如 0.0.1）"
			},
			notes: {
				type: "string",
				description: "Release 说明（可选）"
			}
		},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute(args) {
			const pluginDir = resolve(String(args.dir ?? "").trim());
			if (!pluginDir || !existsSync(join(pluginDir, "package.json"))) return "ERROR: dir 无 package.json";
			let pkg;
			try {
				pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));
			} catch {
				return "ERROR: package.json 解析失败";
			}
			const version = String(args.version ?? pkg.version ?? "").trim().replace(/^v/, "");
			if (!version) return "ERROR: 缺版本号";
			const tgzs = readdirSync(pluginDir).filter((f) => f.endsWith(".tgz"));
			if (tgzs.length === 0) return "ERROR: 目录无 tgz（先 dev_build_plugin）";
			let repo = "";
			const remote = runCmd("git", [
				"remote",
				"get-url",
				"origin"
			], pluginDir);
			if (remote && remote.code === 0) {
				const m = /[:/]([^/]+\/[^/]+?)(?:\.git)?\s*$/.exec(remote.output.trim());
				if (m) repo = m[1];
			}
			if (!repo) return "ERROR: 无法推断仓库（git remote origin）";
			const tgz = join(pluginDir, tgzs[tgzs.length - 1]);
			const tag = "v" + version;
			const notesText = String(args.notes ?? `## ${String(pkg.name)} v${version}\n\n由 dsh-super-injector dev_release_plugin 发布。\n\n### 安装\n\n下载 tgz 解压 → 注入器环境内 \`dev_inject_plugin <目录>\`，或 \`dsh plugin --profile web add <目录>\`。`);
			const notesFile = join(pluginDir, ".release-notes-" + Date.now() + ".md");
			writeFileSync(notesFile, notesText, "utf8");
			const r = runCmd("gh", [
				"release",
				"create",
				tag,
				tgz,
				"--repo",
				repo,
				"--title",
				`${String(pkg.name)} v${version}`,
				"--notes-file",
				notesFile
			], pluginDir);
			try {
				rmSync(notesFile, { force: true });
			} catch {}
			if (r === null) return "ERROR: gh CLI 不可用（需在 PATH 且已认证）——手动：\ngh release create " + tag + " " + tgz + " --repo " + repo + " --notes \"<说明>\"";
			if (r.code !== 0) return `ERROR: gh release 失败（exit ${r.code}）:\n${r.output.slice(-800)}`;
			const url = /(https:\/\/github\.com\/[^\s]+)/.exec(r.output);
			auditLog("release", `${String(pkg.name)} ${tag} → ${repo}`);
			return "OK: " + String(pkg.name) + " " + tag + " 已发布" + (url ? "\n" + url[1] : "") + "\n" + r.output.slice(-400);
		}
	}));
	safeRegister(defineTool({
		name: "dev_self_test",
		description: "故障演练：一键回归注入器全链路——①注入假插件→host ✓ ②热重载→fiber uid 变化 ③自重载节流拒绝（<10s）④预检拦截（临时破坏 lib→拒绝自杀→恢复）⑤卸载即净 ⑥patch 写入合法性。全部自恢复、不留下污染；输出 PASS/FAIL 清单。",
		parameters: {},
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: String(value)
			}]
		},
		async execute() {
			const results = [];
			const check = (name, ok, detail = "") => {
				results.push([
					name,
					ok,
					detail
				]);
			};
			const TEST_PKG = "@dsh-external/selftest-runner";
			const TEST_SHORT = "selftest-runner";
			const tmpDir = join(dshHome, "super-injector", TEST_SHORT);
			try {
				rmSync(tmpDir, {
					recursive: true,
					force: true
				});
			} catch {}
			mkdirSync(tmpDir, { recursive: true });
			try {
				mkdirSync(join(tmpDir, "src"), { recursive: true });
				mkdirSync(join(tmpDir, "scripts"), { recursive: true });
				writeFileSync(join(tmpDir, "package.json"), JSON.stringify({
					name: TEST_PKG,
					version: "0.0.1",
					private: true,
					type: "module",
					main: "./lib/index.js",
					files: ["lib"],
					license: "BSD-3-Clause",
					peerDependencies: {
						"@deepseek-ai/dsh-tools": ">=0.0.1-rc <2",
						"cordis": ">=4.0.0-rc <5"
					},
					devDependencies: {
						"@types/node": "^24.13.3",
						typescript: "^5.9.0"
					},
					scripts: { build: "bash scripts/build.sh" }
				}, null, 2) + "\n", "utf8");
				writeFileSync(join(tmpDir, "tsconfig.json"), "{\n  \"compilerOptions\": {\n    \"target\": \"ES2023\", \"module\": \"NodeNext\", \"moduleResolution\": \"NodeNext\", \"lib\": [\"ES2023\"],\n    \"strict\": true, \"types\": [\"node\"], \"declaration\": true, \"declarationDir\": \"lib/types\",\n    \"outDir\": \"lib\", \"rootDir\": \"src\", \"skipLibCheck\": true, \"esModuleInterop\": true,\n    \"sourceMap\": true\n  },\n  \"include\": [\"src\"]\n}\n", "utf8");
				writeFileSync(join(tmpDir, "src", "index.ts"), `import type { Context } from 'cordis'\nimport { defineTool } from '@deepseek-ai/dsh-tools'\nexport const name = ${JSON.stringify(TEST_PKG)}\nexport const inject = ['tools']\nexport function apply(ctx: Context): void {\n  ctx.effect(() => ctx.tools.register(defineTool({\n    name: 'self_test_hello',\n    description: 'self test',\n    parameters: {},\n    output: { schema: { type: 'string' }, render: (_a: unknown, v: unknown) => [{ type: 'text', text: String(v) }] },\n    async execute() { return 'hello' },\n  })), 'self-test')\n}\n`, "utf8");
				writeFileSync(join(tmpDir, "scripts", "build.sh"), `#!/bin/bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/.." && pwd)"\ncd "$ROOT"\nCHECKOUT="\${DSH_CHECKOUT:-}"\nif [ -z "$CHECKOUT" ] || [ ! -d "$CHECKOUT/packages" ]; then echo "no checkout" >&2; exit 1; fi\nTSC="$CHECKOUT/node_modules/.bin/tsc"\nlink_pkg() {\n  node -e "const fs=require('fs');const path=require('path');const l=path.resolve(process.argv[1]);const t=path.resolve(process.argv[2]);fs.rmSync(l,{recursive:true,force:true});fs.mkdirSync(path.dirname(l),{recursive:true});fs.symlinkSync(t,l,process.platform==='win32'?'junction':'dir');" "node_modules/$1" "$2"\n}\nmkdir -p node_modules/@deepseek-ai\nnode -e "const fs=require('fs');fs.rmSync('node_modules/@standard-schema',{recursive:true,force:true})"\nlink_pkg cordis "$CHECKOUT/vendor/cordis"\nlink_pkg cosmokit "$CHECKOUT/vendor/cosmokit"\nlink_pkg schemastery "$CHECKOUT/vendor/schemastery"\nlink_pkg @deepseek-ai/dsh-tools "$CHECKOUT/packages/core/tools"\nlink_pkg @types/node "$CHECKOUT/node_modules/@types/node"\n"$TSC" -p tsconfig.json\n`, "utf8");
				const checkout = detectCheckout();
				if (!checkout) {
					check("checkout 探测", false, "无 DSH_CHECKOUT");
					return summarize(results);
				}
				const bash = findBash();
				if (!bash) {
					check("bash 探测", false, "无 bash");
					return summarize(results);
				}
				const bashBinDir = bash !== "bash" ? dirname(bash) : "";
				const sep = process.platform === "win32" ? ";" : ":";
				const buildEnv = { DSH_CHECKOUT: checkout };
				buildEnv.PATH = [
					bashBinDir,
					dirname(process.execPath),
					process.env.PATH ?? ""
				].filter(Boolean).join(sep);
				const br = runCmd(bash, ["scripts/build.sh"], tmpDir, buildEnv);
				const libBuilt = existsSync(join(tmpDir, "lib", "index.js"));
				check("测试插件构建", br !== null && br.code === 0 && libBuilt, br && br.code !== 0 ? br.output.slice(-300) : libBuilt ? "" : "lib/index.js 未生成");
				if (!br || br.code !== 0 || !libBuilt) return summarize(results);
				try {
					await uninject(TEST_SHORT);
				} catch {}
				const inj = await inject(tmpDir);
				if (inj.includes("host ✓")) check("注入（host ✓）", true, inj);
				else {
					let diag = "";
					try {
						diag += "junction→" + readlinkSync(join(profileNodeModules, "@dsh-external", TEST_SHORT)) + "\n";
					} catch (e) {
						diag += "junction err: " + e.code + "\n";
					}
					diag += "tmpLib=" + existsSync(join(tmpDir, "lib", "index.js")) + " tmpPkg=" + existsSync(join(tmpDir, "package.json")) + " tmpSrc=" + existsSync(join(tmpDir, "src", "index.ts"));
					check("注入（host ✓）", false, inj + "\n" + diag);
				}
				const beforeUid = (() => {
					for (const e of ctx.loader.entries()) {
						const o = e.options;
						if (!o.group && String(o.name) === TEST_PKG && e.fiber) return e.fiber.uid;
					}
					return null;
				})();
				try {
					const lcT = ctx.loader.internal?.loadCache;
					if (lcT) {
						for (const u of [...lcT.keys()]) if (typeof u === "string" && decodeURIComponent(u).includes(TEST_SHORT)) Map.prototype.delete.call(lcT, u);
					}
					await ctx.loader.import(TEST_PKG, () => []);
				} catch {}
				const rl = await withOpLock(() => reloadPackage(TEST_SHORT, tmpDir));
				const afterUid = (() => {
					for (const e of ctx.loader.entries()) {
						const o = e.options;
						if (!o.group && String(o.name) === TEST_PKG && e.fiber) return e.fiber.uid;
					}
					return null;
				})();
				check("热重载（uid 变化）", beforeUid !== null && afterUid !== null && beforeUid !== afterUid, `uid ${beforeUid} → ${afterUid} | ${rl.slice(0, 80)}`);
				writeSelfReloadState(Date.now() - 5e3);
				const throttle = await withOpLock(() => reloadPackage("dsh-super-injector"));
				check("自重载节流（<10s 拒绝）", throttle.includes("节流"), throttle.slice(0, 100));
				writeSelfReloadState(0);
				let libPath = "";
				try {
					const juncLib = join(profileNodeModules, "@dsh-external", "dsh-super-injector", "lib", "index.js");
					if (existsSync(juncLib)) {
						const real = realpathSync(juncLib);
						if (existsSync(real)) libPath = real;
					}
					if (!libPath) {
						const lcT = ctx.loader.internal?.loadCache;
						for (const u of lcT?.keys() ?? []) {
							if (typeof u !== "string" || !u.endsWith("/lib/index.js")) continue;
							const d = decodeURIComponent(u);
							if (!d.includes("dsh-super-injector") && !d.includes("cloud-restore")) continue;
							let fp = d.replace(/^file:\/\//, "");
							if (fp.startsWith("/")) fp = fp.slice(1);
							if (existsSync(fp)) {
								libPath = fp;
								break;
							}
						}
					}
				} catch {}
				if (libPath) {
					let libRestored = true;
					try {
						const backup = readFileSync(libPath, "utf8");
						writeFileSync(libPath, "BROKEN SELF TEST !!!", "utf8");
						const precheck = await withOpLock(() => reloadPackage("dsh-super-injector"));
						check("预检拦截（拒绝自杀）", precheck.includes("预检失败"), precheck.slice(0, 150));
						writeFileSync(libPath, backup, "utf8");
						libRestored = true;
					} catch (e) {
						check("预检拦截（拒绝自杀）", false, String(e));
					}
					check("预检后 lib 恢复", libRestored);
				} else check("预检拦截（拒绝自杀）", false, "未定位注入器 lib");
				const ui = await uninject(TEST_SHORT);
				let entryGone = true;
				for (const e of ctx.loader.entries()) {
					const o = e.options;
					if (!o.group && String(o.name) === TEST_PKG) entryGone = false;
				}
				check("卸载即净（entry 移除）", entryGone, ui.slice(0, 100));
				const patched = writePatch(`\n# self-test ${Date.now()}\n- id: self-test-check\n  disabled: true\n`);
				const patchText = readFileSync(join(dirname(profileNodeModules), "cordis.patch.yml"), "utf8");
				const hasBareArray = /^\s*\[\]\s*$/m.test(patchText);
				const hasList = /^\s*- id:/m.test(patchText);
				check("patch 写入（无 [] 与列表混存）", patched && !(hasBareArray && hasList), `bareArray=${hasBareArray} list=${hasList}`);
				try {
					let cleaned = patchText;
					cleaned = cleaned.replace(/\n# self-test \d+\n- id: self-test-check\n  disabled: true\n?/, "");
					cleaned = cleaned.replace(/\n# 已卸载插件（[^\n]*\n- id: selftest-runner\n  disabled: true\n?/, "");
					const finalPatch = /^\s*- id:/m.test(cleaned) ? cleaned : cleaned.replace(/^\s*\[\]\s*$/m, "") + "\n[]\n";
					writeFileSync(join(dirname(profileNodeModules), "cordis.patch.yml"), finalPatch, "utf8");
				} catch {}
			} catch (e) {
				check("整体", false, String(e));
			} finally {
				try {
					const linkDir = join(profileNodeModules, "@dsh-external", TEST_SHORT);
					if (existsSync(linkDir)) rmSync(linkDir, {
						recursive: true,
						force: true
					});
				} catch {}
			}
			return summarize(results);
		}
	}));
	/** 汇总 PASS/FAIL（PASS 项的预期拒绝场景（ERROR: 前缀）显示为 [EXPECTED]）。 */
	function summarize(results) {
		const pass = results.filter(([, ok]) => ok).length;
		const lines = results.map(([n, ok, d]) => {
			let detail = d ? d.slice(0, 400) : "";
			if (ok && detail.startsWith("ERROR:")) detail = "[EXPECTED]" + detail.slice(6);
			return `- [${ok ? "PASS" : "FAIL"}] ${n}${detail ? " — " + detail : ""}`;
		});
		auditLog("self-test", `PASS ${pass}/${results.length}`);
		return `===== 注入器自检（PASS ${pass}/${results.length}）=====\n` + lines.join("\n");
	}
	try {
		ctx.systemPrompt.context({
			name: "dsh-super-injector",
			order: -90,
			text: "本环境装有 dsh-super-injector（dev_* 工具）：任意本地插件包可运行时注入——工具包/守护循环（timer+LLM 自主 agent loop）/UI 面板/混合形态，同一通道；注入即完整生效（host+UI）、可热重载与自重载、卸载即净。插件自身的提示词/工具/循环皆可自我优化；建新插件优先克隆/借鉴/重构生态已有资源（dsh-external 仓库、已注入插件、官方 packages 模式），不重复造轮子。若注入器无法支撑此闭环，优先修复注入器。从零体验路径：dev_plugin_status → dev_self_test → dev_scaffold_plugin → dev_build_plugin → dev_inject_plugin → dev_uninject_plugin。"
		});
	} catch (e) {
		logger.warn("[super-injector] systemPrompt.context 重复注册容忍（跳过，新实例继续运行）: %s", e instanceof Error ? e.message : String(e));
	}
	logger.info("[super-injector] 就绪：watch %d 目录（%dms），autoRestore=%s", watches.length, intervalMs, String(config.autoRestore));
	arbitrateOfficial();
	try {
		const cmSvc = ctx.get("clientModules");
		if (cmSvc?.pkgMeta && typeof cmSvc.pkgMeta.delete === "function") {
			cmSvc.pkgMeta.delete("@dsh-external/dsh-super-injector");
			if (typeof cmSvc.processOne === "function") {
				cmSvc.processOne("@dsh-external/dsh-super-injector");
				auditLog("client-meta-healed", "client-modules pkgMeta 缓存已清并重解析（设置页插件管理 UI 注册）");
			}
		}
	} catch {}
	async function readBody(req) {
		const chunks = [];
		for await (const c of req) chunks.push(Buffer.from(c));
		return Buffer.concat(chunks).toString("utf8");
	}
	/** 新建 agent 会话，把任意目录内化成插件（AI 自主完成分析→脚手架→构建→注入）。 */
	async function startIngest(dir, title) {
		const abs = resolve(dir);
		if (!existsSync(abs)) return "ERROR: 目录不存在: " + abs;
		const agentsSvc = ctx.get("agents");
		if (!agentsSvc || typeof agentsSvc.create !== "function") return "ERROR: agents 服务不可用（无法新建会话）";
		const sessionId = "ingest-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		const prompt = `请把目录 ${abs} 里的内容**内化成 DSH 插件**。步骤：①分析内容（代码/脚本/配置/文档/资源，任意形态）②决定插件形态（toolkit 工具包 / daemon-loop 守护循环 / ui-panel UI 面板 / hybrid 混合）③用 dev_scaffold_plugin 生成骨架或直接编写插件包（package.json/tsconfig/scripts/build.sh/src）④dev_build_plugin 构建⑤dev_inject_plugin 注入⑥dev_self_test 自检确认。若内容本身已是可注入插件包（含 package.json+lib/）则直接构建注入。完成后汇报插件名与用途。`;
		const seed = [{
			type: "user/message",
			seq: 0,
			time: Date.now(),
			data: {
				kind: "user",
				source: { kind: "user" },
				content: [{
					type: "text",
					text: prompt
				}]
			}
		}];
		const handle = await agentsSvc.create({
			sessionId,
			meta: { cwd: process.cwd() },
			seed
		});
		auditLog("ingest-session", `${abs} → 会话 ${handle.agent.id}（${title ?? "内化插件"}）`);
		return `OK: 内化会话已创建（${handle.agent.id}）——AI 正在把内容变成插件，会话列表可见`;
	}
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/super-injector/api",
		handler: async (req, res) => {
			const send = (code, obj) => {
				res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify(obj));
			};
			try {
				const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/^\/super-injector\/api/, "") || "/";
				if (req.method === "GET" && path === "/list") return send(200, {
					ok: true,
					entries: readRegistry().map((e) => ({
						...e,
						active: hasActiveEntry(e.name)
					})),
					stats: opStats,
					clientDeclared: !!process.env.DSH_WEB
				});
				if (req.method === "POST" && path === "/uninstall") {
					const body = JSON.parse(await readBody(req));
					const match = String(body?.match ?? "").trim();
					if (!match) return send(400, {
						ok: false,
						error: "match 必填"
					});
					return send(200, {
						ok: true,
						result: await uninject(match)
					});
				}
				if (req.method === "POST" && path === "/inject") {
					const body = JSON.parse(await readBody(req));
					const dir = String(body?.dir ?? "").trim();
					if (!dir) return send(400, {
						ok: false,
						error: "dir 必填"
					});
					return send(200, {
						ok: true,
						result: await inject(dir)
					});
				}
				if (req.method === "POST" && path === "/ingest") {
					const body = JSON.parse(await readBody(req));
					const dir = String(body?.dir ?? "").trim();
					if (!dir) return send(400, {
						ok: false,
						error: "dir 必填（要内化成插件的文件夹路径）"
					});
					return send(200, {
						ok: true,
						result: await startIngest(dir, String(body?.title ?? ""))
					});
				}
				return send(404, {
					ok: false,
					error: "not found: " + path
				});
			} catch (e) {
				return send(500, {
					ok: false,
					error: String(e instanceof Error ? e.message : e)
				});
			}
		}
	}), "super-injector: plugin-manager-api");
}
//#endregion
export { Config, apply, inject, name };

//# sourceMappingURL=index.js.map