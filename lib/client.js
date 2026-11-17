window.__ModuleLoader__.load({
	id: "dsh-fans-session-monitor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		const PANEL_ID = "session-overview";
		const PANEL_ORDER = 25;
		const BUNDLE_NAME = "dsh-fans-session-monitor";

		const SETTINGS_KEY = "dsh-plugin-session-monitor:settings:v1";
		const LEGACY_OVERVIEW_SETTINGS_KEY = "dsh-session-overview.settings";
		const LEGACY_BUSY_SETTINGS_KEY = "dsh-plugin-busy-workspace:settings:v2";
		const SETTINGS_DEFAULTS = {
			sidebarEnabled: true,
			overviewEnabled: true,
			orderByActivity: true,
			highlightSessionRows: true,
			highlightBusyWorkspaceHeaders: true,
			intensity: 0.6,
			stickyColors: true,
			stickyHours: 24,
			showSeen: true,
			showWorkspace: true,
			compact: false,
			quietRunMinutes: 30,
			notifyOnCompletion: true,
			// 重启后还原“上次关闭时的现场”
			restoreScene: true,
			// 现场有效期（小时）：关闭超过这么久就不再还原
			sceneHours: 72,
			// 七态高亮配色（可在配置页用选择器 / HEX / RGB 三种方式调整）
			stateColors: {
				review: "#f97316",
				waiting: "#eab308",
				running: "#3b82f6",
				interrupted: "#ef4444",
				unread: "#22c55e",
				seen: "#00c8c8",
				archived: "#94a3b8",
			},
		};

		const STICKY_KEY = "dsh-plugin-session-monitor:state:v1";
		const LEGACY_STICKY_KEY = "dsh-plugin-busy-workspace:state:v2";
		const OVERRIDES_KEY = "dsh-plugin-session-monitor:overrides:v1";
		const STICKY_VERSION = 1;
		// Bump when sticky semantics change in a way that invalidates existing
		// records; normalizeSticky drops stale-phase records once per epoch.
		const SEEN_EPOCH = 2;
		const OVERRIDES_VERSION = 1;

		const SCENE_KEY = "dsh-session-overview.scene.v1";
		const SCENE_VERSION = 1;
		const SCENE_MAX_SESSIONS = 300;
		const SCENE_WRITE_DELAY_MS = 2000;
		const SCENE_HEARTBEAT_MS = 30000;

const SIDEBAR_CSS = `
:root {
  --bw-intensity: 0.6;
  --bw-review: #f97316;
  --bw-waiting: #eab308;
  --bw-running: #3b82f6;
  --bw-interrupted: #ef4444;
  --bw-unread: #22c55e;
  --bw-seen: #00c8c8;
  --bw-archived: #94a3b8;
  --bw-settle: #22c55e;

  --bw-bar-width: 3px;
  --bw-fill-alpha: calc(var(--bw-intensity) * 0.16);
  --bw-ring-alpha: calc(0.30 + var(--bw-intensity) * 0.28);
  --bw-fade: 1;
  --bw-title-mix: 82%;

  --bw-selection: #7c5cff;
}

/* ---------------------------------------------------------------- *
 * 0. Colour families, exactly the Session Overview palette
 * ---------------------------------------------------------------- */

[data-busy-session="review"]      { --bw-tone: var(--bw-review); --bw-title-mix: 86%; }
[data-busy-session="waiting"]     { --bw-tone: var(--bw-waiting); --bw-title-mix: 86%; }
[data-busy-session="running"]     { --bw-tone: var(--bw-running); --bw-title-mix: 82%; }
[data-busy-session="interrupted"] { --bw-tone: var(--bw-interrupted); --bw-title-mix: 86%; }
[data-busy-session="unread"]      { --bw-tone: var(--bw-unread); --bw-title-mix: 82%; }
[data-busy-session="seen"]        { --bw-tone: var(--bw-seen); --bw-title-mix: 82%; --bw-fade: 0.9; }
[data-busy-session="archived"]    { --bw-tone: var(--bw-archived); --bw-title-mix: 66%; --bw-fade: 0.78; }

[data-busy-state="review"]      { --bw-tone: var(--bw-review); }
[data-busy-state="waiting"]     { --bw-tone: var(--bw-waiting); }
[data-busy-state="running"]     { --bw-tone: var(--bw-running); }
[data-busy-state="interrupted"] { --bw-tone: var(--bw-interrupted); }
[data-busy-state="unread"]      { --bw-tone: var(--bw-unread); }
[data-busy-state="seen"]        { --bw-tone: var(--bw-seen); --bw-fade: 0.9; }
[data-busy-state="archived"]    { --bw-tone: var(--bw-archived); --bw-fade: 0.82; }

/* ---------------------------------------------------------------- *
 * 1. Activity ordering
 * ---------------------------------------------------------------- */

[data-busy-list="true"] {
  display: flex;
  flex-direction: column;
}

[data-busy-list="true"] > * {
  flex: 0 0 auto;
}

/* ---------------------------------------------------------------- *
 * 2. Workspace headers
 * ---------------------------------------------------------------- */

[class*="_groupSection"][data-busy-workspace="true"] > [class*="_projectRow"] {
  position: relative;
  border-radius: 8px;
  background: color-mix(
    in srgb,
    var(--bw-tone) calc(var(--bw-fill-alpha) * 68% * var(--bw-fade)),
    transparent
  );
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--bw-tone) calc(var(--bw-ring-alpha) * 70%), transparent);
  transition: background 160ms var(--ds-ease-in-out, ease),
              box-shadow 160ms var(--ds-ease-in-out, ease);
}

[class*="_groupSection"][data-busy-workspace="true"] > [class*="_projectRow"]::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
  top: 50%;
  translate: 0 -50%;
  width: var(--bw-bar-width);
  height: 20px;
  border-radius: 0 2px 2px 0;
  background: var(--bw-tone);
  opacity: var(--bw-fade);
}

[class*="_groupSection"][data-busy-workspace="true"] > [class*="_projectRow"]::after {
  content: attr(data-busy-label);
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 7px;
  margin-inline-start: 2px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.2px;
  line-height: 1;
  white-space: nowrap;
  color: color-mix(in srgb, var(--bw-tone) 86%, var(--dsw-alias-label-primary, currentColor));
  background: color-mix(
    in srgb,
    var(--bw-tone) calc((13% + var(--bw-intensity) * 5%) * var(--bw-fade)),
    transparent
  );
}

[class*="_groupSection"][data-busy-workspace="true"]
  > [class*="_projectRow"][data-busy-multi="true"]::after {
  content: attr(data-busy-count) " 涓? attr(data-busy-label);
}

[class*="_groupSection"][data-busy-workspace="true"]
  > [class*="_projectRow"] [class*="_projectText"] {
  color: color-mix(in srgb, var(--bw-tone) 78%, var(--dsw-alias-label-primary, currentColor));
  font-weight: 600;
}

[class*="_groupSection"][data-busy-workspace="true"]
  > [class*="_projectRow"] [class*="_folder"] {
  color: var(--bw-tone);
}

[class*="_groupSection"][data-busy-workspace="true"][data-busy-held="true"]
  > [class*="_projectRow"],
[class*="_groupSection"][data-busy-workspace="true"]:has(> [class*="_projectRow"][aria-expanded="false"])
  > [class*="_projectRow"] {
  background: color-mix(
    in srgb,
    var(--bw-tone) calc(var(--bw-fill-alpha) * 100% * var(--bw-fade)),
    transparent
  );
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--bw-tone) calc(var(--bw-ring-alpha) * 100% * var(--bw-fade)), transparent);
}

[class*="_groupSection"][data-busy-workspace="true"][data-busy-held="true"]
  > [class*="_projectRow"]::before,
[class*="_groupSection"][data-busy-workspace="true"]:has(> [class*="_projectRow"][aria-expanded="false"])
  > [class*="_projectRow"]::before {
  height: 26px;
}

/* ---------------------------------------------------------------- *
 * 3. Session rows
 * ---------------------------------------------------------------- */

[class*="_sessionRow"][data-busy-session] {
  position: relative;
  background: color-mix(
    in srgb,
    var(--bw-tone) calc(var(--bw-fill-alpha) * 100% * var(--bw-fade)),
    transparent
  );
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--bw-tone) calc(var(--bw-ring-alpha) * 100% * var(--bw-fade)), transparent);
  transition: background 180ms var(--ds-ease-in-out, ease),
              box-shadow 180ms var(--ds-ease-in-out, ease);
}

[class*="_sessionRow"][data-busy-session]:hover {
  background-color: color-mix(
    in srgb,
    var(--bw-tone) calc(var(--bw-fill-alpha) * 145% * var(--bw-fade)),
    transparent
  );
}

[class*="_sessionRow"][data-busy-session]::before {
  content: "";
  position: absolute;
  inset-block: 5px;
  inset-inline-start: 0;
  width: var(--bw-bar-width);
  border-radius: 0 2px 2px 0;
  background: var(--bw-tone);
  opacity: var(--bw-fade);
  pointer-events: none;
}

[class*="_sessionRow"][data-busy-session="running"]::before {
  animation: bw-breathe 2.4s var(--ds-ease-in-out, ease-in-out) infinite;
}

@keyframes bw-breathe {
  0%, 100% { opacity: calc(var(--bw-fade) * 0.6); }
  50%      { opacity: var(--bw-fade); }
}

/*
 * The trailing word is the same word the Session Overview bucket uses. It is a
 * small text label rather than a second pill, because the sidebar already has a
 * trailing time label and two pills on one row read as clutter.
 */
[class*="_sessionRow"][data-busy-session][data-busy-label]::after {
  content: attr(data-busy-label);
  flex: none;
  margin-inline-start: 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  color: color-mix(in srgb, var(--bw-tone) 78%, var(--dsw-alias-label-secondary, currentColor));
  opacity: var(--bw-fade);
}

[class*="_sessionRow"][data-busy-session] [class*="_title"] {
  color: color-mix(
    in srgb,
    var(--bw-tone) var(--bw-title-mix),
    var(--dsw-alias-label-primary, currentColor)
  );
  font-weight: 600;
}

/* Selection: a 2px border frame. */
[class*="_sessionRow"][class*="_selected"] {
  position: relative;
  box-sizing: border-box;
  border: 2px solid var(--bw-selection);
  border-radius: 7px;
  background-color: color-mix(in srgb, var(--bw-selection) 12%, transparent);
  background-clip: padding-box;
  /*
   * The official row reserves its 3px inline paint inset as a transparent
   * border. Replacing it with a 2px border would move the content 1px left;
   * add that 1px back to the inline padding so nothing shifts.
   */
  padding-inline-start: calc(
    var(--dsh-sidebar-row-padding, 12px) - var(--dsh-sidebar-paint-inset, 3px) +
      var(--dsh-workspace-indent, 0px) + 1px
  );
  padding-inline-end: 9px;
  z-index: 2;
}

/* The status bar sits just inside the border; keep its original height. */
[class*="_sessionRow"][class*="_selected"]::before {
  inset-block: 3px;
  inset-inline-start: 0;
}

[class*="_sessionRow"][class*="_selected"]:hover {
  background-color: color-mix(in srgb, var(--bw-selection) 18%, transparent);
}

/* ---------------------------------------------------------------- *
 * 4. The settle moment
 * ---------------------------------------------------------------- */

[class*="_sessionRow"][data-busy-settled="true"] {
  animation: bw-settle 1.1s var(--ds-ease-in-out, ease-out) 1;
}

@keyframes bw-settle {
  0% {
    background: color-mix(
      in srgb,
      var(--bw-settle) calc(var(--bw-intensity) * 42%),
      transparent
    );
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--bw-settle) 62%, transparent);
  }
  100% {
    background: transparent;
    box-shadow: inset 0 0 0 1px transparent;
  }
}

[class*="_sessionRow"][data-busy-settled="true"] [class*="_title"] {
  animation: bw-settle-title 1.1s var(--ds-ease-in-out, ease-out) 1;
}

@keyframes bw-settle-title {
  0%   { color: var(--bw-settle); }
  100% { color: inherit; }
}

@media (prefers-reduced-motion: reduce) {
  [class*="_sessionRow"][data-busy-session="running"]::before {
    animation: none;
    opacity: var(--bw-fade);
  }
  [class*="_sessionRow"][data-busy-settled="true"],
  [class*="_sessionRow"][data-busy-settled="true"] [class*="_title"] {
    animation: none;
  }
}


`;

		// ── 设置 ─────────────────────────────────────────────────────────
		const settingsListeners = new Set();
		let settingsCache = null;

		function parseHours(value, fallback) {
			const text = String(value === null || value === undefined ? "" : value).trim();
			if (text === "") return fallback;
			const n = Number(text);
			if (!isFinite(n)) return fallback;
			return Math.min(720, Math.max(1, Math.round(n)));
		}

		function parseCount(value, fallback, min, max) {
			const text = String(value === null || value === undefined ? "" : value).trim();
			if (text === "") return fallback;
			const n = Number(text);
			if (!isFinite(n)) return fallback;
			return Math.min(max, Math.max(min, Math.round(n)));
		}

		function parseBoolean(value, fallback) {
			return typeof value === "boolean" ? value : fallback;
		}

		const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

		function parseHexColor(value, fallback) {
			if (typeof value !== "string") return fallback;
			let text = value.trim();
			if (text !== "" && !text.startsWith("#")) text = `#${text}`;
			if (!HEX_COLOR_RE.test(text)) return fallback;
			if (text.length === 4) {
				text = `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
			}
			return text.toLowerCase();
		}

		function normalizeColors(rawColors, baseColors) {
			const out = {};
			for (const key of Object.keys(baseColors)) {
				out[key] = parseHexColor(rawColors?.[key], baseColors[key]);
			}
			return out;
		}

		function normalizeSettings(raw) {
			const base = { ...SETTINGS_DEFAULTS };
			if (!raw || typeof raw !== "object") return base;
			const highlightSessionRows =
				typeof raw.highlightSessionRows === "boolean"
					? raw.highlightSessionRows
					: typeof raw.highlightRunningSessions === "boolean"
						? raw.highlightRunningSessions
						: base.highlightSessionRows;
			const showSeen =
				typeof raw.showSeen === "boolean"
					? raw.showSeen
					: typeof raw.showSeenRows === "boolean"
						? raw.showSeenRows
						: base.showSeen;
			return {
				sidebarEnabled: parseBoolean(raw.sidebarEnabled, base.sidebarEnabled),
				overviewEnabled: parseBoolean(raw.overviewEnabled, base.overviewEnabled),
				orderByActivity: parseBoolean(raw.orderByActivity, base.orderByActivity),
				highlightSessionRows,
				highlightBusyWorkspaceHeaders: parseBoolean(
					raw.highlightBusyWorkspaceHeaders,
					base.highlightBusyWorkspaceHeaders,
				),
				intensity:
					typeof raw.intensity === "number" && Number.isFinite(raw.intensity)
						? Math.min(1, Math.max(0, raw.intensity))
						: base.intensity,
				stickyColors: parseBoolean(raw.stickyColors, base.stickyColors),
				stickyHours: parseHours(raw.stickyHours, base.stickyHours),
				showSeen,
				showWorkspace: parseBoolean(raw.showWorkspace, base.showWorkspace),
				compact: parseBoolean(raw.compact, base.compact),
				quietRunMinutes: parseCount(raw.quietRunMinutes, base.quietRunMinutes, 0, 1440),
				notifyOnCompletion: parseBoolean(raw.notifyOnCompletion, base.notifyOnCompletion),
				restoreScene: parseBoolean(raw.restoreScene, base.restoreScene),
				sceneHours: parseHours(raw.sceneHours, base.sceneHours),
				stateColors: normalizeColors(raw.stateColors, base.stateColors),
			};
		}

		function readJson(key) {
			try {
				const text = localStorage.getItem(key);
				if (text === null) return null;
				const parsed = JSON.parse(text);
				return parsed !== null && typeof parsed === "object" ? parsed : null;
			} catch (error) {
				return null;
			}
		}

		function readSettings() {
			try {
				if (typeof localStorage === "undefined") return { ...SETTINGS_DEFAULTS };
				const current = readJson(SETTINGS_KEY);
				if (current !== null) return normalizeSettings(current);
				const overview = readJson(LEGACY_OVERVIEW_SETTINGS_KEY);
				const busy = readJson(LEGACY_BUSY_SETTINGS_KEY);
				const merged = {
					...SETTINGS_DEFAULTS,
					...(overview || {}),
					...(busy || {}),
					// C's showSeen and A's showSeenRows both hid seen; keep hidden if either did.
					showSeen:
						(overview?.showSeen !== false) && (busy?.showSeenRows !== false),
					highlightSessionRows:
						typeof busy?.highlightSessionRows === "boolean"
							? busy.highlightSessionRows
							: typeof busy?.highlightRunningSessions === "boolean"
								? busy.highlightRunningSessions
								: true,
				};
				const next = normalizeSettings(merged);
				localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
				return next;
			} catch (error) {
				return { ...SETTINGS_DEFAULTS };
			}
		}

		function currentSettings() {
			if (settingsCache === null) settingsCache = readSettings();
			return settingsCache;
		}

		function persistSettings(next) {
			settingsCache = next;
			try {
				if (typeof localStorage !== "undefined") {
					localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
				}
			} catch (error) {
				/* 存储不可用时仅在本会话内生效 */
			}
			for (const listener of settingsListeners) {
				try {
					listener(next);
				} catch (error) {
					/* 订阅者已卸载 */
				}
			}
		}

		function updateSettings(patch) {
			persistSettings(normalizeSettings({ ...currentSettings(), ...patch }));
		}

		function subscribeSettings(listener) {
			settingsListeners.add(listener);
			return () => {
				settingsListeners.delete(listener);
			};
		}

		function useSettings() {
			const [value, setValue] = React.useState(currentSettings);
			React.useEffect(() => subscribeSettings(setValue), []);
			return value;
		}

		// ── 共享最终态 / 手动纠错 ───────────────────────────────────────
		const statusListeners = new Set();
		let stickyCache = null;
		let overridesCache = null;

		function emptySticky() {
			return { version: STICKY_VERSION, seenEpoch: SEEN_EPOCH, sessions: {} };
		}

		function normalizeSticky(raw) {
			if (!raw || typeof raw !== "object" || typeof raw.sessions !== "object" || raw.sessions === null) {
				return emptySticky();
			}
			const sessions = {};
			for (const [id, entry] of Object.entries(raw.sessions)) {
				if (typeof id !== "string" || id === "") continue;
				if (!entry || typeof entry !== "object") continue;
				if (!["interrupted", "unread", "seen", "settled"].includes(entry.phase)) continue;
				sessions[id] = {
					phase: entry.phase,
					at: Number(entry.at) || Date.now(),
					updatedAt: Number(entry.updatedAt) || 0,
				};
			}
			const state = { version: STICKY_VERSION, seenEpoch: SEEN_EPOCH, sessions };
			// One-time rebuild: sticky "seen" written before the completion-time
			// check (pre 1.0.4) can mark a never-opened completion as grey. Drop
			// them once; the resolver rebuilds grey only with real read evidence.
			if (raw.seenEpoch !== SEEN_EPOCH) {
				for (const [id, entry] of Object.entries(sessions)) {
					if (entry.phase === "seen") delete sessions[id];
				}
			}
			return state;
		}

		function loadSticky() {
			if (typeof localStorage === "undefined") return emptySticky();
			const current = readJson(STICKY_KEY);
			if (current !== null) return normalizeSticky(current);
			const legacy = readJson(LEGACY_STICKY_KEY);
			const migrated = normalizeSticky(legacy);
			// Interrupted records written by the old timeout heuristic are not
			// trustworthy evidence; drop them once instead of carrying a false red
			// mark into the new status model.
			for (const [id, entry] of Object.entries(migrated.sessions)) {
				if (entry.phase === "interrupted") delete migrated.sessions[id];
			}
			try {
				localStorage.setItem(STICKY_KEY, JSON.stringify(migrated));
			} catch (error) {
				/* storage may be disabled */
			}
			return migrated;
		}

		function stickyState() {
			if (stickyCache === null) stickyCache = loadSticky();
			return stickyCache;
		}

		function persistSticky() {
			try {
				localStorage.setItem(STICKY_KEY, JSON.stringify(stickyState()));
			} catch (error) {
				/* keep in memory */
			}
		}

		function stickyFor(id) {
			return stickyState().sessions[id];
		}

		function rememberSticky(id, phase, updatedAt) {
			if (!["interrupted", "unread", "seen", "settled"].includes(phase)) return;
			const state = stickyState();
			const current = state.sessions[id];
			if (current && current.phase === phase && current.updatedAt >= updatedAt) return;
			state.sessions[id] = { phase, at: Date.now(), updatedAt };
			persistSticky();
		}

		function forgetSticky(id) {
			const state = stickyState();
			if (state.sessions[id] === undefined) return;
			delete state.sessions[id];
			persistSticky();
		}

		function normalizeOverrides(raw) {
			if (!raw || typeof raw !== "object" || typeof raw.sessions !== "object" || raw.sessions === null) {
				return { version: OVERRIDES_VERSION, sessions: {} };
			}
			const sessions = {};
			for (const [id, entry] of Object.entries(raw.sessions)) {
				if (typeof id !== "string" || id === "") continue;
				if (!entry || typeof entry !== "object") continue;
				if (
					!["review", "waiting", "running", "interrupted", "unread", "seen", "archived"].includes(
						entry.phase,
					)
				) {
					continue;
				}
				sessions[id] = {
					phase: entry.phase,
					at: Number(entry.at) || Date.now(),
					basisUpdatedAt: Number(entry.basisUpdatedAt) || 0,
				};
			}
			return { version: OVERRIDES_VERSION, sessions };
		}

		function overridesState() {
			if (overridesCache === null) overridesCache = normalizeOverrides(readJson(OVERRIDES_KEY));
			return overridesCache;
		}

		function persistOverrides() {
			try {
				localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overridesState()));
			} catch (error) {
				/* keep in memory */
			}
		}

		function overrideFor(id) {
			return overridesState().sessions[id];
		}

		function setOverride(id, phase, basisUpdatedAt, markedAt) {
			if (!OVERRIDE_PHASES.includes(phase)) return;
			const state = overridesState();
			state.sessions[id] = {
				phase,
				at: Number(markedAt) || Date.now(),
				basisUpdatedAt: Number(basisUpdatedAt) || 0,
			};
			persistOverrides();
			notifyStatus();
		}

		function clearOverrideQuiet(id) {
			const state = overridesState();
			if (state.sessions[id] === undefined) return;
			delete state.sessions[id];
			persistOverrides();
		}

		function clearOverride(id) {
			const state = overridesState();
			if (state.sessions[id] === undefined) return;
			delete state.sessions[id];
			persistOverrides();
			notifyStatus();
		}

		function notifyStatus() {
			for (const listener of [...statusListeners]) {
				try {
					listener();
				} catch (error) {
					/* a listener must not break the state write */
				}
			}
		}

		function subscribeStatus(listener) {
			statusListeners.add(listener);
			return () => statusListeners.delete(listener);
		}

		function useStatusVersion() {
			const [tick, setTick] = React.useState(0);
			React.useEffect(() => subscribeStatus(() => setTick((value) => value + 1)), []);
			return tick;
		}

		// 高亮退出收口（v1.2.0）：自动最终态不再按时间过期，唯一途径是
		// 标记「已完结」→ 从标记时刻起算 stickyHours 超时，或「清除状态标记」。
		// 旧的 isFinalExpired/isFinalStale 活动时间过期逻辑已移除。

		// ── Host 运行证据（只读）──────────────────────────────────────────
		const RUNTIME_ROUTE = "/session-monitor/runtime";
		let runtimeToken = "";
		let runtimeTokenPromise = null;
		let runtimeBootAt = 0;
		let runtimeFetchedAt = 0;
		const runtimeSessions = new Map();

		function newRuntimeToken() {
			const cryptoApi = globalThis.crypto;
			if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID();
			const bytes = new Uint8Array(24);
			if (cryptoApi?.getRandomValues !== undefined) cryptoApi.getRandomValues(bytes);
			else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
			return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
		}

		async function ensureRuntimeToken(force = false) {
			if (force) {
				runtimeToken = "";
				runtimeTokenPromise = null;
			}
			if (runtimeToken !== "") return runtimeToken;
			if (runtimeTokenPromise !== null) return runtimeTokenPromise;
			const token = newRuntimeToken();
			runtimeTokenPromise = (async () => {
				const response = await fetch(RUNTIME_ROUTE, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ action: "register", token }),
				});
				if (!response.ok) throw new Error("runtime token registration failed");
				runtimeToken = token;
				return token;
			})().finally(() => {
				runtimeTokenPromise = null;
			});
			return runtimeTokenPromise;
		}

		async function refreshRuntime(ctx) {
			if (typeof fetch !== "function") return;
			const sessions = service(ctx, "sessions");
			const snapshot = sessions?.list?.getSnapshot?.();
			const ids = snapshot?.byId ? Object.keys(snapshot.byId).slice(0, 200) : [];
			if (ids.length === 0) {
				runtimeSessions.clear();
				runtimeFetchedAt = Date.now();
				notifyStatus();
				return;
			}
			let token = await ensureRuntimeToken();
			let response;
			try {
				response = await fetch(RUNTIME_ROUTE, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-session-monitor-token": token,
					},
					body: JSON.stringify({ action: "run-state", token, sessionIds: ids }),
				});
				if (response.status === 403) {
					token = await ensureRuntimeToken(true);
					response = await fetch(RUNTIME_ROUTE, {
						method: "POST",
						headers: {
							"content-type": "application/json",
							"x-session-monitor-token": token,
						},
						body: JSON.stringify({ action: "run-state", token, sessionIds: ids }),
					});
				}
			} catch (error) {
				return;
			}
			if (!response.ok) return;
			let payload;
			try {
				payload = await response.json();
			} catch (error) {
				return;
			}
			if (payload?.ok !== true) return;
			runtimeBootAt = Number(payload.bootAt) || 0;
			runtimeSessions.clear();
			for (const [id, value] of Object.entries(payload.sessions || {})) {
				if (value && typeof value === "object") runtimeSessions.set(id, value);
			}
			runtimeFetchedAt = Date.now();
			notifyStatus();
		}

		function startRuntime(ctx) {
			let disposed = false;
			let timer = null;
			let pending = 0;
			const schedule = () => {
				if (disposed) return;
				if (pending !== 0) return;
				pending = window.setTimeout(() => {
					pending = 0;
					void refreshRuntime(ctx);
				}, 250);
			};
			const sessions = service(ctx, "sessions");
			const workspaces = service(ctx, "workspaces");
			const disposers = [];
			for (const store of [sessions?.list, workspaces?.list]) {
				if (store && typeof store.subscribe === "function") disposers.push(store.subscribe(schedule));
			}
			timer = window.setInterval(() => void refreshRuntime(ctx), 30 * 1000);
			void refreshRuntime(ctx);
			ctx.effect(
				() => () => {
					disposed = true;
					if (timer !== null) window.clearInterval(timer);
					if (pending !== 0) window.clearTimeout(pending);
					for (const dispose of disposers) {
						try {
							dispose();
						} catch (error) {
							/* ignore */
						}
					}
				},
				"session-monitor: runtime refresh",
			);
		}

		// ── 上次现场 ─────────────────────────────────────────────────────
		// 关窗口时把每个会话的状态快照写入 localStorage；下次启动读回，用于还原
		// 「上次关闭时正在运行 / 在等审批 / 未读完成」这些重启后无法再算出来的状态。
		const scene = {
			loaded: false,
			boot: null, // { savedAt, sessions: { id: entry } } 或 null（无现场/已过期/已清除）
			bootSummary: null, // { savedAt, running, pending, unread } 供提示条使用
			ack: new Set(), // 用户已确认（点开）的会话，不再显示“上次运行中”
			seen: {}, // id -> 时间戳，本次运行内点开过
			timer: null,
			writing: false,
			dirty: false,
			listeners: new Set(),
			stop: null,
		};

		function sceneListenersNotify() {
			for (const listener of scene.listeners) {
				try {
					listener();
				} catch (error) {
					/* 订阅者已卸载 */
				}
			}
		}

		function useScene() {
			const [, setTick] = React.useState(0);
			React.useEffect(() => {
				const listener = () => setTick((value) => value + 1);
				scene.listeners.add(listener);
				return () => {
					scene.listeners.delete(listener);
				};
			}, []);
			return scene;
		}

		function readSceneRaw() {
			try {
				if (typeof localStorage === "undefined") return null;
				const raw = localStorage.getItem(SCENE_KEY);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (!parsed || parsed.version !== SCENE_VERSION || typeof parsed.sessions !== "object") return null;
				const sessions = {};
				for (const [id, entry] of Object.entries(parsed.sessions || {})) {
					if (!entry || typeof entry !== "object") continue;
					sessions[id] = {
						running: entry.running === true,
						pending: typeof entry.pending === "string" ? entry.pending : null,
						unread: entry.unread === true,
						lastActivity: Number(entry.lastActivity) || 0,
						seenAt: Number(entry.seenAt) || 0,
					};
				}
				return { savedAt: Number(parsed.savedAt) || 0, sessions };
			} catch (error) {
				return null;
			}
		}

		function writeSceneRaw(payload) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(SCENE_KEY, JSON.stringify(payload));
			} catch (error) {
				/* 存储不可用：本次运行不持久化 */
			}
		}

		/** 启动时装载现场；超过有效期或用户关闭了还原则丢弃。 */
		function loadBootScene(settings) {
			if (!settings.restoreScene) {
				scene.boot = null;
				return;
			}
			const raw = readSceneRaw();
			if (!raw || !raw.savedAt) {
				scene.boot = null;
				return;
			}
			const ageHours = (Date.now() - raw.savedAt) / 3600000;
			if (ageHours > settings.sceneHours) {
				scene.boot = null;
				return;
			}
			scene.boot = raw;
			let running = 0;
			let pending = 0;
			let unread = 0;
			for (const entry of Object.values(raw.sessions)) {
				if (entry.pending) pending += 1;
				else if (entry.running) running += 1;
				else if (entry.unread) unread += 1;
			}
			scene.bootSummary = { savedAt: raw.savedAt, running, pending, unread, total: running + pending + unread };
		}

		function bootEntryOf(id) {
			if (!scene.boot) return null;
			const entry = scene.boot.sessions[id];
			if (!entry) return null;
			if (scene.ack.has(id)) return null;
			return entry;
		}

		// ── 数据收集 ─────────────────────────────────────────────────────
		function service(ctx, name) {
			try {
				return ctx.get(name);
			} catch (error) {
				return undefined;
			}
		}

		function toMillis(value) {
			if (typeof value === "number" && isFinite(value)) return value;
			if (typeof value === "string") {
				const parsed = Date.parse(value);
				return Number.isNaN(parsed) ? 0 : parsed;
			}
			return 0;
		}

		function ago(ms) {
			if (!ms) return "时间未知";
			const diff = Date.now() - ms;
			if (diff < 60000) return "刚刚";
			const minutes = Math.floor(diff / 60000);
			if (minutes < 60) return minutes + " 分钟前";
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return hours + " 小时前";
			return Math.floor(hours / 24) + " 天前";
		}

		function stamp(ms) {
			if (!ms) return "未知时间";
			const date = new Date(ms);
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}

		function baseName(path) {
			if (typeof path !== "string" || path === "") return "";
			const parts = path.split(/[\\/]/).filter(Boolean);
			return parts.length === 0 ? path : parts[parts.length - 1];
		}

		/** 读出全部可见会话的实时事实（不含展示用的状态分组）。 */
		function collectLive(ctx) {
			const sessionsService = service(ctx, "sessions");
			const workspacesService = service(ctx, "workspaces");
			const uiSession = service(ctx, "uiSession");
			if (!sessionsService || !workspacesService) {
				return { error: "当前部署没有提供 sessions / workspaces 服务", items: [], workspaces: [], archived: new Set() };
			}
			const sessions = (sessionsService.list && sessionsService.list.getSnapshot && sessionsService.list.getSnapshot()) || { byId: {} };
			const workspaces = (workspacesService.list && workspacesService.list.getSnapshot && workspacesService.list.getSnapshot()) || { items: [] };
			const statuses = uiSession && uiSession.sessionStatus && uiSession.sessionStatus.getSnapshot ? uiSession.sessionStatus.getSnapshot() : new Map();
			const archived = new Set(workspaces.archivedSessionIds || []);
			const workspaceOf = new Map();
			const workspaceName = new Map();
			for (const workspace of workspaces.items || []) {
				const name = workspace.title || baseName(workspace.path) || "工作区";
				workspaceName.set(workspace.workspaceId, name);
				for (const id of workspace.sessionIds || []) workspaceOf.set(id, workspace.workspaceId);
			}

			const items = [];
			for (const id of Object.keys(sessions.byId || {})) {
				const session = sessions.byId[id];
				if (!session || session.blank || archived.has(id)) continue;
				if (session.origin === "subagent") continue;
				const status = statuses.get(id) || {};
				const workspaceId = workspaceOf.get(id);
				const agentLive = session.agentAvailable !== false;
				items.push({
					id,
					title: (session.title || "").trim() || "未命名会话",
					workspace: workspaceId ? workspaceName.get(workspaceId) || "工作区" : "未分组",
					workspaceId: workspaceId || null,
					updatedAt: toMillis(session.updatedAt),
					selected: id === currentSelectedSessionId,
					domState: id === currentSelectedSessionId ? currentSelectedDomState : null,
					running: agentLive && status.running === true,
					agentAvailable: session.agentAvailable === true,
					pending: (status.pendingInteraction && status.pendingInteraction.kind) || null,
					unread: status.completionUnread === true,
					subagents: typeof session.runningSubagentCount === "number" ? session.runningSubagentCount : 0,
				});
			}
			return { error: null, items, workspaces: workspaces.items || [], archived, workspaceOf };
		}

		function quietNote(live, settings) {
			if (!settings.quietRunMinutes || settings.quietRunMinutes <= 0) return "运行中";
			if (!live.updatedAt) return "运行中";
			const minutes = Math.floor((Date.now() - live.updatedAt) / 60000);
			if (minutes < settings.quietRunMinutes) return "运行中";
			return `运行中 · ${minutes} 分钟无新输出`;
		}

		/** 把一个会话解析成面板上的分组 + 说明；所有视图共用这一个函数。 */
		function resolveStatus(live, settings) {
			// Manual correction is a user-visible override, but it must not survive
			// evidence that the session has moved on. Opening a Session directly
			// contradicts a manual "unread" pin, so viewing clears that one too.
			// Expiry rules (v1.1.1, 采纳方案③):
			//   - 「已完结」 expires stickyHours after it was MARKED (override.at),
			//     independent of activity — the early-clear button just removes it;
			//   - the other six manual marks never time-expire (they are explicit
			//     corrections and stay visible until a contradiction or manual clear);
			//   - AUTOMATIC final states (unread/seen/interrupted sticky) keep the
			//     original stickyHours-from-activity expiry.
			const override = overrideFor(live.id);
			if (override) {
				const viewed = live.selected && override.phase === "unread";
				const markExpired =
					override.phase === "archived" &&
					Number(override.at) > 0 &&
					Date.now() - Number(override.at) > settings.stickyHours * 3600000;
				const stale =
					viewed ||
					markExpired ||
					live.updatedAt > override.basisUpdatedAt ||
					live.running ||
					live.pending !== null ||
					live.unread;
				if (stale) {
					clearOverrideQuiet(live.id);
					if (viewed) {
						// Viewing a pinned unread Session: drop the pin AND any
						// settled plain-style memory, then record seen. Without
						// this, settled memory made the row fall back to a plain
						// no-highlight row instead of 已查看.
						forgetSticky(live.id);
						if (settings.stickyColors) rememberSticky(live.id, "seen", live.updatedAt);
					}
					// 「已完结」超时 = 提前进入普通样式的收口，写入 settled 记忆，
					// 防止青色已查看/其他高亮回弹。
					if (markExpired) rememberSticky(live.id, "settled", Date.now());
				} else {
					return {
						bucket: override.phase,
						note: OVERRIDE_NOTES[override.phase] ?? `手动标记为${PHASE_LABELS[override.phase]}`,
						source: "manual",
						confidence: "manual",
					};
				}
			}

			if (live.pending === "approval" || live.pending === "plan-review") {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return {
					bucket: "review",
					note: live.pending === "approval" ? "等待你批准工具调用" : "计划等待你确认",
					source: "live",
					confidence: "authoritative",
				};
			}
			if (live.pending === "question") {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return { bucket: "waiting", note: "Agent 在等你回答", source: "live", confidence: "authoritative" };
			}

			// The selected row's official data-state is a direct renderer fact:
			// it stays "ongoing" while the conversation is actively producing,
			// even when a status subscription frame is momentarily behind.
			if (live.selected && live.domState === "ongoing") {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return { bucket: "running", note: quietNote(live, settings), source: "dom", confidence: "authoritative" };
			}
			if (live.selected && live.domState === "warning") {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return { bucket: "review", note: "等待你处理", source: "dom", confidence: "authoritative" };
			}

			const hostEvidence =
				Date.now() - runtimeFetchedAt < 45 * 1000 ? runtimeSessions.get(live.id) : undefined;
			if (hostEvidence?.running === true) {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return {
					bucket: "running",
					note: live.agentAvailable === false ? "状态待确认" : quietNote(live, settings),
					source: "runtime",
					confidence: "authoritative",
				};
			}

			if (live.running) {
				if (stickyFor(live.id)) forgetSticky(live.id);
				return {
					bucket: "running",
					note: live.agentAvailable === false ? "状态待确认" : quietNote(live, settings),
					source: "live",
					confidence: live.agentAvailable === false ? "unknown" : "authoritative",
				};
			}

			// 「已完结」清除/超时后的普通样式记忆：只要会话没有出现比 settled
			// 时刻更新的真实事件（新 turn 完成/中断/活动），就保持普通行，
			// 不再回弹到青色已查看或其他高亮。
			const settledMemory = stickyFor(live.id);
			const settledAt = settledMemory?.phase === "settled" ? Number(settledMemory.updatedAt) || 0 : 0;
			const newerThanSettled = (value) => settledAt <= 0 || (Number(value) || 0) > settledAt;
			if (settledAt > 0 && live.pending === null && live.unread !== true) {
				const turnAdvanced = newerThanSettled(hostEvidence?.lastTurnEndAt);
				const activityAdvanced = newerThanSettled(live.updatedAt);
				if (!turnAdvanced && !activityAdvanced) {
					return { bucket: null, note: "", source: "settled", confidence: "sticky" };
				}
				if (settledMemory !== undefined && turnAdvanced) {
					forgetSticky(live.id); // 新一轮 turn 完成/中断：旧 settled 记录让位
				}
			}

			// Positive Host evidence. A live running flag always wins above, so this
			// branch only handles a Session whose Agent is gone.
			const evidence = hostEvidence;
			if (evidence !== undefined) {
				const lastEventAt = Number(evidence.lastEventAt) || 0;
				const newerLocalActivity = live.updatedAt > 0 && lastEventAt > 0 && live.updatedAt > lastEventAt;
				const interruptedEvidence =
					evidence.lastTurn === "interrupted" ||
					(evidence.lastTurn === "open" && runtimeBootAt > lastEventAt && lastEventAt > 0);
				if (interruptedEvidence && !newerLocalActivity) {
					// 统一收口：Host 中断证据不再按时间过期；退出高亮的唯一途径
					// 是标记「已完结」→ 超时/手动清除。
					if (settings.stickyColors) rememberSticky(live.id, "interrupted", live.updatedAt);
					return { bucket: "interrupted", note: "已中断", source: "turn", confidence: "authoritative" };
				}
			}

			const boot = bootEntryOf(live.id);
			const sameMoment = boot ? !live.updatedAt || live.updatedAt <= boot.lastActivity : false;
			const hostSettled =
				evidence !== undefined &&
				evidence.running !== true &&
				evidence.lastTurn === "completed";
			if (hostSettled) {
				// Host says the turn completed. A stale shutdown-scene "running"
				// must not resurrect it as red; this is a green unread completion
				// until the user opens/reads it, then a grey seen row.
				const memory = stickyFor(live.id);
				if (memory !== undefined && memory.phase === "interrupted") forgetSticky(live.id);
				// Seen evidence must be NEWER than this completion. A sticky
				// "seen" (or a scene seenAt) recorded for a PREVIOUS turn must
				// not swallow a fresh completion, or a just-finished task shows
				// grey "已完成 · 已查看" that the user never opened.
				const completedAt = Number(evidence.lastTurnEndAt) || live.updatedAt || 0;
				const seenAt = Math.max(scene.seen[live.id] || 0, boot ? boot.seenAt || 0 : 0);
				const memorySeenAt = memory?.phase === "seen" ? Number(memory.updatedAt) || 0 : 0;
				const seen =
					live.selected ||
					(seenAt > 0 && seenAt >= completedAt) ||
					(memorySeenAt > 0 && memorySeenAt >= completedAt);
				if (!seen && memory !== undefined && memory.phase === "seen" && memorySeenAt < completedAt) {
					forgetSticky(live.id);
				}
				if (seen) {
					if (!settings.showSeen) return { bucket: null, note: "", source: "idle", confidence: "authoritative" };
					// Record the sticky at completion time, not the client
					// snapshot time: the snapshot's updatedAt can lag the Host's
					// turn-end by a few ms, which previously let a just-written
					// seen sticky fail its own freshness check on the NEXT paint
					// (grey flipped back to green after switching Sessions).
					if (settings.stickyColors) {
						rememberSticky(live.id, "seen", Math.max(Number(live.updatedAt) || 0, completedAt));
					}
					return { bucket: "seen", note: "空闲", source: "turn", confidence: "authoritative" };
				}
				if (settings.stickyColors) rememberSticky(live.id, "unread", live.updatedAt);
				return { bucket: "unread", note: "完成，未查看", source: "turn", confidence: "authoritative" };
			}

			if (boot && sameMoment) {
				// 上次关闭时在等用户处理，重启后仍然需要用户处理，不能标成
				// “已中断”，否则长时间不操作会一直显示红色。
				if (boot.pending === "approval") {
					if (stickyFor(live.id)) forgetSticky(live.id);
					return { bucket: "review", note: "上次关闭前在等审批", source: "scene", confidence: "scene" };
				}
				if (boot.pending === "plan-review") {
					if (stickyFor(live.id)) forgetSticky(live.id);
					return { bucket: "review", note: "上次关闭前在等计划确认", source: "scene", confidence: "scene" };
				}
				if (boot.pending === "question") {
					if (stickyFor(live.id)) forgetSticky(live.id);
					return { bucket: "waiting", note: "上次关闭前在等你回答", source: "scene", confidence: "scene" };
				}
				if (boot.running) {
					// The currently selected row is being viewed; a stale scene
					// "running" must not paint the open conversation red.
					if (live.selected) {
						const memory = stickyFor(live.id);
						if (memory !== undefined && memory.phase === "interrupted") forgetSticky(live.id);
					} else {
						// A non-selected Session with no live run but a scene "running"
						// is the previous run that never closed: interrupted.
						if (settings.stickyColors) rememberSticky(live.id, "interrupted", live.updatedAt);
						return { bucket: "interrupted", note: "上次关闭时正在运行", source: "scene", confidence: "scene" };
					}
				}
				if (boot.unread && !(boot.seenAt && boot.seenAt >= boot.lastActivity)) {
					if (settings.stickyColors) rememberSticky(live.id, "unread", live.updatedAt);
					return { bucket: "unread", note: "完成，未查看", source: "scene", confidence: "scene" };
				}
			}

			if (live.unread) {
				if (settings.stickyColors) rememberSticky(live.id, "unread", live.updatedAt);
				return { bucket: "unread", note: "完成，未查看", source: "live", confidence: "authoritative" };
			}

			const memory = stickyFor(live.id);
			if (!settings.stickyColors) {
				if (memory !== undefined) forgetSticky(live.id);
			} else if (memory !== undefined) {
				if (memory.phase === "unread") {
					// Promotion needs read evidence NEWER than the completion the
					// unread was recorded for; a stale boot timestamp alone must
					// not promote it.
					const lastActivity = Math.max(Number(memory.updatedAt) || 0, (boot && boot.lastActivity) || 0);
					const seenAt = Math.max(scene.seen[live.id] || 0, boot ? boot.seenAt || 0 : 0);
					const seen = live.selected || (seenAt > 0 && seenAt >= lastActivity);
					if (seen) {
						if (!settings.showSeen) return { bucket: null, note: "", source: "idle", confidence: "authoritative" };
						rememberSticky(live.id, "seen", live.updatedAt);
						return { bucket: "seen", note: "空闲", source: "sticky", confidence: "sticky" };
					}
					// Unread persists until this row is actually selected or a
					// scene seenAt proves it was read; an idle repaint must not
					// silently promote it to seen.
					return { bucket: "unread", note: "完成，未查看", source: "sticky", confidence: "sticky" };
				}
				if (memory.phase === "seen") {
					if (!settings.showSeen) {
						forgetSticky(live.id);
						return { bucket: null, note: "", source: "idle", confidence: "authoritative" };
					}
					return { bucket: "seen", note: "空闲", source: "sticky", confidence: "sticky" };
				}
				if (memory.phase === "interrupted") {
					return { bucket: "interrupted", note: "已中断", source: "sticky", confidence: "sticky" };
				}
			}
			if (memory !== undefined) forgetSticky(live.id);
			if (!settings.stickyColors || !settings.showSeen) {
				return { bucket: null, note: "", source: "idle", confidence: "authoritative" };
			}
			rememberSticky(live.id, "seen", live.updatedAt);
			return { bucket: "seen", note: "空闲", source: "idle", confidence: "authoritative" };
		}

		// ── 现场写入 ─────────────────────────────────────────────────────
		function entryFor(live) {
			const boot = scene.boot ? scene.boot.sessions[live.id] : undefined;
			const seenAt = Math.max(scene.seen[live.id] || 0, boot ? boot.seenAt || 0 : 0);
			const fresh = !boot || live.updatedAt > boot.lastActivity;
			if (boot && !scene.ack.has(live.id) && !fresh && !live.running && !live.pending) {
				// 关闭后没有新活动：保留关闭那一刻的样子，跨多次重启仍然成立。
				return {
					running: boot.running,
					pending: boot.pending,
					unread: boot.unread,
					lastActivity: boot.lastActivity,
					seenAt,
				};
			}
			return {
				running: live.running,
				pending: live.pending,
				unread: live.unread,
				lastActivity: live.updatedAt,
				seenAt,
			};
		}

		function flushScene(ctx) {
			if (scene.timer) {
				clearTimeout(scene.timer);
				scene.timer = null;
			}
			if (!ctx) return;
			const model = collectLive(ctx);
			if (model.error) return;
			const sessions = {};
			for (const live of model.items) sessions[live.id] = entryFor(live);
			const order = Object.entries(sessions)
				.sort((a, b) => (b[1].lastActivity || 0) - (a[1].lastActivity || 0))
				.slice(0, SCENE_MAX_SESSIONS);
			const trimmed = {};
			for (const [id, entry] of order) trimmed[id] = entry;
			writeSceneRaw({ version: SCENE_VERSION, savedAt: Date.now(), sessions: trimmed });
			scene.dirty = false;
		}

		function scheduleSceneWrite(ctx, immediate) {
			if (!ctx) return;
			scene.dirty = true;
			if (immediate) {
				flushScene(ctx);
				return;
			}
			if (scene.timer) return;
			scene.timer = setTimeout(() => {
				scene.timer = null;
				flushScene(ctx);
			}, SCENE_WRITE_DELAY_MS);
		}

		function startSceneTracker(ctx) {
			if (scene.stop) return scene.stop;
			const subscribe = (store) => {
				if (!store || typeof store.subscribe !== "function") return;
				try {
					store.subscribe(() => scheduleSceneWrite(ctx));
				} catch (error) {
					/* ignore */
				}
			};
			const sessionsService = service(ctx, "sessions");
			const workspacesService = service(ctx, "workspaces");
			const uiSession = service(ctx, "uiSession");
			if (sessionsService) subscribe(sessionsService.list);
			if (workspacesService) subscribe(workspacesService.list);
			if (uiSession && uiSession.sessionStatus) subscribe(uiSession.sessionStatus);

			const heartbeat = setInterval(() => scheduleSceneWrite(ctx), SCENE_HEARTBEAT_MS);
			const onHide = () => flushScene(ctx);
			const onVisibility = () => {
				if (typeof document !== "undefined" && document.visibilityState === "hidden") flushScene(ctx);
			};
			if (typeof window !== "undefined") {
				window.addEventListener("pagehide", onHide);
				window.addEventListener("beforeunload", onHide);
			}
			if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

			scene.stop = () => {
				clearInterval(heartbeat);
				if (typeof window !== "undefined") {
					window.removeEventListener("pagehide", onHide);
					window.removeEventListener("beforeunload", onHide);
				}
				if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
				scene.stop = null;
			};
			return scene.stop;
		}

		function acknowledge(id) {
			scene.seen[id] = Date.now();
			scene.ack.add(id);
			if (scene.boot && scene.boot.sessions[id]) {
				const entry = scene.boot.sessions[id];
				entry.running = false;
				entry.pending = null;
				entry.seenAt = scene.seen[id];
			}
			sceneListenersNotify();
		}

		function clearScene() {
			scene.boot = null;
			scene.bootSummary = null;
			scene.ack.clear();
			try {
				if (typeof localStorage !== "undefined") localStorage.removeItem(SCENE_KEY);
			} catch (error) {
				/* ignore */
			}
			sceneListenersNotify();
		}

		// ── 面板 ─────────────────────────────────────────────────────────
		const BUCKETS = [
			{ key: "review", label: "待审核", hint: "权限审批 / 计划待确认", color: "#f97316" },
			{ key: "waiting", label: "待处理", hint: "Agent 在等你回答", color: "#eab308" },
			{ key: "running", label: "执行中", hint: "Agent 正在运行", color: "#3b82f6" },
			{ key: "interrupted", label: "已中断", hint: "Host 中断 / 上次关闭未完成", color: "#ef4444" },
			{ key: "unread", label: "已完成 · 未查看", hint: "跑完了还没打开", color: "#22c55e" },
			{ key: "seen", label: "已完成 · 已查看", hint: "打开过的完成会话", color: "#00c8c8" },
			{ key: "archived", label: "已完结", hint: "手动标记的阶段结束", color: "#94a3b8" },
		];

		function useModel(ctx, settings, sceneTick, statusTick) {
			const [tick, setTick] = React.useState(0);
			React.useEffect(() => {
				const stores = [];
				const sessionsService = service(ctx, "sessions");
				const workspacesService = service(ctx, "workspaces");
				const uiSession = service(ctx, "uiSession");
				if (sessionsService) stores.push(sessionsService.list);
				if (workspacesService) stores.push(workspacesService.list);
				if (uiSession && uiSession.sessionStatus) stores.push(uiSession.sessionStatus);
				const disposers = [];
				for (const store of stores) {
					if (!store || typeof store.subscribe !== "function") continue;
					try {
						disposers.push(store.subscribe(() => setTick((value) => value + 1)));
					} catch (error) {
						/* 退化为轮询 */
					}
				}
				const timer = setInterval(() => setTick((value) => value + 1), 30000);
				return () => {
					clearInterval(timer);
					for (const dispose of disposers) {
						try {
							dispose();
						} catch (error) {
							/* ignore */
						}
					}
				};
			}, [ctx]);
			return React.useMemo(() => {
				try {
					const model = collectLive(ctx);
					if (model.error) return { ...model, rows: [], counts: {} };
					const rows = [];
					for (const live of model.items) {
						const resolved = resolveStatus(live, settings);
						if (resolved.bucket === null || resolved.bucket === undefined) continue;
						if (resolved.bucket === "seen" && !settings.showSeen) continue;
						rows.push({ ...live, bucket: resolved.bucket, note: resolved.note });
					}
					rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
					const counts = {};
					for (const row of rows) counts[row.bucket] = (counts[row.bucket] || 0) + 1;
					return { error: null, rows, counts };
				} catch (error) {
					return { error: String((error && error.message) || error), rows: [], counts: {} };
				}
			}, [ctx, tick, settings, sceneTick, statusTick]);
		}

		const styles = {
			page: {
				display: "flex",
				flexDirection: "column",
				height: "100%",
				minHeight: 0,
				padding: "18px 22px 24px",
				boxSizing: "border-box",
				gap: 14,
			},
			head: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
			title: { fontSize: 16, fontWeight: 600, margin: 0, color: "inherit" },
			subtitle: { fontSize: 12, opacity: 0.55 },
			banner: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "8px 12px",
				borderRadius: 8,
				border: "1px solid rgba(245,158,11,0.35)",
				background: "rgba(245,158,11,0.10)",
				fontSize: 12,
			},
			bannerText: { flex: "1 1 auto", minWidth: 0 },
			bannerButton: {
				outline: "none",
				padding: "3px 10px",
				borderRadius: 999,
				border: "1px solid rgba(127,127,127,0.35)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				cursor: "pointer",
				flex: "0 0 auto",
			},
			chips: { display: "flex", gap: 8, flexWrap: "wrap" },
			chip: {
				outline: "none",
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				padding: "4px 10px",
				borderRadius: 999,
				border: "1px solid rgba(127,127,127,0.28)",
				background: "transparent",
				color: "inherit",
				fontSize: 12,
				cursor: "pointer",
				lineHeight: "18px",
			},
			chipActive: {
				borderColor: "rgba(127,127,127,0.7)",
				background: "rgba(127,127,127,0.14)",
				fontWeight: 600,
			},
			dot: { width: 8, height: 8, borderRadius: 999, flex: "0 0 auto" },
			list: { display: "flex", flexDirection: "column", gap: 18, overflow: "auto", minHeight: 0, paddingRight: 4 },
			group: { display: "flex", flexDirection: "column", gap: 6 },
			groupHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.75 },
			row: {
				outline: "none",
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "8px 10px",
				borderRadius: 8,
				border: "1px solid transparent",
				cursor: "pointer",
				color: "inherit",
				textAlign: "left",
				background: "transparent",
				width: "100%",
				font: "inherit",
			},
			rowCompact: { padding: "4px 10px" },
			rowTitle: { fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
			rowTitleCompact: { fontSize: 12 },
			rowMeta: { fontSize: 11, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
			rowRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.6, flex: "0 0 auto" },
			empty: { fontSize: 12, opacity: 0.5, padding: "8px 2px" },
			error: { fontSize: 12, color: "#ef4444" },
			badge: { fontSize: 10, padding: "1px 6px", borderRadius: 999, border: "1px solid rgba(127,127,127,0.3)", opacity: 0.8 },
			form: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 },
			formTitle: { fontSize: 14, fontWeight: 600, margin: 0 },
			formHint: { fontSize: 12, opacity: 0.55, margin: 0 },
			field: { display: "flex", flexDirection: "column", gap: 6 },
			fieldLabel: { fontSize: 13, fontWeight: 500 },
			fieldDesc: { fontSize: 11, opacity: 0.55 },
			input: {
				width: 96,
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(127,127,127,0.35)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				outline: "none",
			},
			toggleRow: { display: "flex", alignItems: "flex-start", gap: 10 },
			toggle: {
				outline: "none",
				width: 38,
				height: 22,
				borderRadius: 999,
				border: "1px solid rgba(127,127,127,0.4)",
				background: "rgba(127,127,127,0.18)",
				position: "relative",
				cursor: "pointer",
				flex: "0 0 auto",
				padding: 0,
			},
			toggleOn: { background: "rgba(59,130,246,0.85)", borderColor: "rgba(59,130,246,0.9)" },
			knob: { position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: 999, background: "#ffffff", transition: "left .15s ease" },
			knobOn: { left: 18 },
			footer: { display: "flex", alignItems: "center", gap: 12, paddingTop: 4, flexWrap: "wrap" },
			button: {
				outline: "none",
				padding: "6px 12px",
				borderRadius: 6,
				border: "1px solid rgba(127,127,127,0.35)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				cursor: "pointer",
			},
			buttonPrimary: {
				borderColor: "rgba(47,107,255,0.9)",
				background: "rgba(47,107,255,0.92)",
				color: "#ffffff",
				fontWeight: 600,
			},
		};

		function PanelIcon({ size }) {
			return h(
				"svg",
				{
					viewBox: "0 0 16 16",
					width: size,
					height: size,
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.3,
					strokeLinecap: "round",
					"aria-hidden": "true",
				},
				h("circle", { cx: 4, cy: 4, r: 1.6, fill: "currentColor", stroke: "none" }),
				h("circle", { cx: 4, cy: 8, r: 1.6, fill: "currentColor", stroke: "none" }),
				h("circle", { cx: 4, cy: 12, r: 1.6, fill: "currentColor", stroke: "none" }),
				h("path", { d: "M7.5 4h6M7.5 8h6M7.5 12h6" }),
			);
		}

		function Chip({ bucket, count, active, onClick }) {
			const base = active ? { ...styles.chip, ...styles.chipActive } : styles.chip;
			const style = !active && count === 0 ? { ...base, opacity: 0.45 } : base;
			return h(
				"button",
				{ type: "button", onClick, style, "aria-label": bucket.label + " " + count + " 个会话" },
				h("span", { style: { ...styles.dot, background: `var(--bw-${bucket.key}, ${bucket.color})` } }),
				h("span", null, bucket.label),
				h("span", { style: { opacity: 0.55 } }, String(count)),
			);
		}

		function SessionRow({ row, color, onOpen, settings }) {
			const [hover, setHover] = React.useState(false);
			const [focus, setFocus] = React.useState(false);
			const base = settings.compact ? { ...styles.row, ...styles.rowCompact } : styles.row;
			return h(
				"button",
				{
					type: "button",
					onClick: () => onOpen(row),
					onMouseEnter: () => setHover(true),
					onMouseLeave: () => setHover(false),
					onFocus: () => setFocus(true),
					onBlur: () => setFocus(false),
					style: {
						...base,
						...(hover ? { background: "rgba(127,127,127,0.10)" } : null),
						...(focus ? { boxShadow: "inset 0 0 0 2px rgba(77,107,254,0.55)" } : null),
					},
					"aria-label": row.title + " · " + row.workspace,
				},
				h("span", { style: { ...styles.dot, background: color } }),
				h(
					"span",
					{ style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: "1 1 auto" } },
					h("span", { style: settings.compact ? { ...styles.rowTitle, ...styles.rowTitleCompact } : styles.rowTitle }, row.title),
					settings.compact
						? null
						: h("span", { style: styles.rowMeta }, (settings.showWorkspace ? row.workspace + " · " : "") + row.note),
				),
				row.subagents > 0 ? h("span", { style: styles.badge }, row.subagents + " 子智能体") : null,
				h("span", { style: styles.rowRight }, ago(row.updatedAt)),
			);
		}

		function PanelPage({ ctx }) {
			const settings = useSettings();
			const statusTick = useStatusVersion();
			const restore = useScene();
			const model = useModel(ctx, settings, restore.bootSummary ? 1 : 0, statusTick);
			const [filter, setFilter] = React.useState("all");

			// Keep the seven state CSS vars in sync even when the sidebar is
			// disabled — the overview chips/rows read them with fallbacks.
			React.useEffect(() => {
				const colors = settings.stateColors || {};
				for (const [key, hex] of Object.entries(colors)) {
					document.documentElement.style.setProperty(`--bw-${key}`, hex);
				}
			}, [settings.stateColors]);

			const openSession = React.useCallback(
				(row) => {
					acknowledge(row.id);
					const uiWorkspace = service(ctx, "uiWorkspace");
					if (uiWorkspace && typeof uiWorkspace.openSession === "function") uiWorkspace.openSession(row.id);
					scheduleSceneWrite(ctx);
				},
				[ctx],
			);

			const counts = model.counts || {};
			const rows = model.rows || [];
			const visibleBuckets = BUCKETS.filter((bucket) => bucket.key !== "seen" || settings.showSeen);
			const groups = visibleBuckets
				.map((bucket) => ({
					bucket,
					rows: rows.filter((row) => row.bucket === bucket.key && (filter === "all" || filter === bucket.key)),
				}))
				.filter((group) => group.rows.length > 0);

			const summary = restore.bootSummary;
			const banner =
				settings.restoreScene && summary && summary.total > 0
					? h(
							"div",
							{ style: styles.banner, role: "status" },
							h(
								"span",
								{ style: styles.bannerText },
								"已恢复 " +
									stamp(summary.savedAt) +
									" 的现场 · " +
									[
										summary.running ? summary.running + " 个会话上次关闭时仍在运行" : null,
										summary.pending ? summary.pending + " 个在等待审批/回答" : null,
										summary.unread ? summary.unread + " 个完成未读" : null,
									]
										.filter(Boolean)
										.join("，"),
							),
							h("button", { type: "button", onClick: clearScene, style: styles.bannerButton }, "清除恢复"),
						)
					: null;

			const head = h(
				"div",
				null,
				h(
					"div",
					{ style: styles.head },
					h("h2", { style: styles.title }, "会话总览"),
					h("span", { style: styles.subtitle }, "跨工作区的实时状态 · 点击任一行直接打开会话"),
				),
				h(
					"div",
					{ style: { ...styles.chips, marginTop: 12 } },
					h(Chip, {
						bucket: { key: "all", label: "全部", hint: "所有会话" },
						count: rows.length,
						active: filter === "all",
						onClick: () => setFilter("all"),
					}),
					visibleBuckets.map((bucket) =>
						h(Chip, {
							key: bucket.key,
							bucket,
							count: counts[bucket.key] || 0,
							active: filter === bucket.key,
							onClick: () => setFilter(filter === bucket.key ? "all" : bucket.key),
						}),
					),
				),
			);

			if (model.error) {
				return h("div", { style: styles.page }, head, h("div", { style: styles.error }, model.error));
			}

			const body =
				groups.length === 0
					? h("div", { style: styles.empty }, rows.length === 0 ? "还没有可显示的会话。" : "该状态眼下没有会话。")
					: h(
							"div",
							{ style: styles.list },
							groups.map((group) =>
								h(
									"div",
									{ key: group.bucket.key, style: styles.group },
									h(
										"div",
										{ style: styles.groupHead },
										h("span", { style: { ...styles.dot, background: `var(--bw-${group.bucket.key}, ${group.bucket.color})` } }),
										h("span", null, group.bucket.label),
										h("span", { style: { opacity: 0.6 } }, String(group.rows.length)),
										h("span", { style: { opacity: 0.4 } }, group.bucket.hint),
									),
									group.rows.map((row) =>
										h(SessionRow, { key: row.id, row, color: `var(--bw-${group.bucket.key}, ${group.bucket.color})`, onOpen: openSession, settings }),
									),
								),
							),
						);

			return h("div", { style: styles.page }, head, banner, body);
		}

		/**
		 * 插件配置页：注册到插件页的 `plugins.bundle.config`（键为本组合包名），
		 * 因此配置只出现在「插件 → fans会话总览」的详情页里，不会出现在 DSH 设置中。
		 */
		/**
		 * Editable HEX field: keeps a local draft so partial typing is not
		 * reset by the controlled value; commits on blur / Enter.
		 */
		function HexColorInput({ value, label, onCommit }) {
			const [text, setText] = React.useState(value);
			React.useEffect(() => setText(value), [value]);
			const commit = () => {
				const trimmed = text.trim();
				if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
					setText(value);
					return;
				}
				const hex = trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
				onCommit(hex);
				setText(hex);
			};
			return h("input", {
				type: "text",
				value: text,
				spellCheck: false,
				"aria-label": `${label} HEX`,
				placeholder: "#rrggbb",
				onChange: (event) => setText(event.target.value),
				onBlur: commit,
				onKeyDown: (event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						commit();
					}
				},
				style: { ...styles.input, width: 84, fontFamily: "monospace", padding: "3px 6px" },
			});
		}

		function SettingsPage({ view }) {
			const saved = useSettings();
			const [draft, setDraft] = React.useState(() => ({ ...saved }));
			const [justSaved, setJustSaved] = React.useState(false);

			React.useEffect(() => {
				setDraft({ ...saved });
			}, [saved]);

			if (view === "summary") {
				return h("span", null, "侧栏排序/高亮/选中 + 会话总览 + 手动状态修正");
			}

			const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

			const patch = (key, value) => {
				setJustSaved(false);
				setDraft((previous) => ({ ...previous, [key]: value }));
			};

			const save = () => {
				if (!dirty) return;
				updateSettings(draft);
				setJustSaved(true);
			};

			const resetDraft = () => {
				setJustSaved(false);
				setDraft({ ...SETTINGS_DEFAULTS });
			};

			const toggle = (key) =>
				h(
					"button",
					{
						type: "button",
						role: "switch",
						"aria-checked": draft[key] ? "true" : "false",
						onClick: () => patch(key, !draft[key]),
						style: draft[key] ? { ...styles.toggle, ...styles.toggleOn } : styles.toggle,
					},
					h("span", { style: draft[key] ? { ...styles.knob, ...styles.knobOn } : styles.knob }),
				);

			const field = (key, label, desc) =>
				h(
					"div",
					{ style: styles.field },
					h(
						"div",
						{ style: styles.toggleRow },
						toggle(key),
						h("div", null, h("div", { style: styles.fieldLabel }, label), h("div", { style: styles.fieldDesc }, desc)),
					),
				);

			const numberField = (key, label, desc, min, max, step) =>
				h(
					"div",
					{ style: styles.field },
					h("div", { style: styles.fieldLabel }, label),
					h("div", { style: styles.fieldDesc }, desc),
					h("input", {
						type: "number",
						min,
						max,
						step,
						value: String(draft[key]),
						onChange: (event) => patch(key, Number(event.target.value)),
						style: styles.input,
					}),
				);

			const section = (title) =>
				h("p", { style: { ...styles.formHint, fontWeight: 600, margin: "14px 0 2px", opacity: 0.75 } }, title);

			const hexToRgb = (hex) => {
				const m = /^#([0-9a-fA-F]{6})$/.exec(hex || "");
				if (!m) return [148, 163, 184];
				const n = parseInt(m[1], 16);
				return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
			};
			const rgbToHex = (r, g, b) =>
				`#${[r, g, b]
					.map((v) => Math.min(255, Math.max(0, Math.round(Number(v) || 0))).toString(16).padStart(2, "0"))
					.join("")}`;
			const patchColor = (key, hex) => {
				setJustSaved(false);
				setDraft((previous) => ({
					...previous,
					stateColors: { ...previous.stateColors, [key]: hex },
				}));
			};
			const colorCell = (key, label) => {
				const hex = parseHexColor(draft.stateColors?.[key], SETTINGS_DEFAULTS.stateColors[key]);
				const rgb = hexToRgb(hex);
				const onRgb = (index) => (event) => {
					const next = [...rgb];
					next[index] = Number(event.target.value);
					patchColor(key, rgbToHex(next[0], next[1], next[2]));
				};
				return [
					h("input", {
						type: "color",
						"aria-label": `${label} 颜色选择器`,
						value: hex,
						onChange: (event) => patchColor(key, event.target.value.toLowerCase()),
						style: { width: 34, height: 28, padding: 0, border: "none", background: "none", cursor: "pointer" },
					}),
					h("span", { style: { fontSize: 12, opacity: 0.85 } }, label),
					h(HexColorInput, {
						value: hex,
						label,
						onCommit: (next) => patchColor(key, next),
					}),
					...[0, 1, 2].map((index) =>
						h("input", {
							type: "number",
							min: 0,
							max: 255,
							"aria-label": `${label} RGB[${index}]`,
							value: String(rgb[index]),
							onChange: onRgb(index),
							style: { ...styles.input, width: 56, padding: "3px 4px" },
						}),
					),
				];
			};
			const colorGrid = h(
				"div",
				{ style: { display: "grid", gridTemplateColumns: "40px 150px 96px 60px 60px 60px", gap: "5px 10px", alignItems: "center", margin: "4px 0 2px" } },
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "选择器"),
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "状态"),
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "HEX"),
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "R"),
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "G"),
				h("span", { style: { fontSize: 11, opacity: 0.6 } }, "B"),
				...OVERRIDE_PHASES.flatMap((phase) => colorCell(phase, PHASE_LABELS[phase])),
			);
			const resetColors = h(
				"button",
				{
					type: "button",
					onClick: () => patch("stateColors", { ...SETTINGS_DEFAULTS.stateColors }),
					style: { ...styles.bannerButton, flex: "none" },
				},
				"还原默认配色",
			);

			return h(
				"div",
				{ style: styles.form },
				h("h3", { style: styles.formTitle }, "fans会话状态监测总览"),
				h(
					"p",
					{ style: styles.formHint },
					"侧栏排序、状态高亮、当前选中框与会话总览共用同一套状态解析、最终态缓存和手动修正。配置只保存在本机，且只出现在这个插件详情页。",
				),
				section("侧栏"),
				field("orderByActivity", "按最后活动时间排序工作区", "关闭后保持官方顺序。"),
				field("highlightSessionRows", "高亮会话行", "色条、底色、ring、标题色和行尾状态词。"),
				field("highlightBusyWorkspaceHeaders", "高亮工作区标题", "头部底色、竖条和状态徽标。"),
				numberField("intensity", "强调强度", "0–1，默认 0.6。控制底色和 ring 浓度。", 0, 1, 0.05),
				section("会话总览"),
				field("showSeen", "显示「已完成 · 已查看」", "关闭后侧栏和总览都隐藏已查看状态。"),
				field("showWorkspace", "行内显示工作区名", "关闭后每行第二行只显示状态说明。"),
				field("compact", "紧凑模式", "压缩行高并隐藏第二行说明。"),
				section("状态与现场"),
				field("stickyColors", "保留最终状态颜色", "已中断/未查看/已查看跨刷新保留；关闭后只显示实时状态。"),
				numberField("stickyHours", "已完结保留时长", "1–720 小时，从标记「已完结」的时刻起算；其余状态不再按时间过期。", 1, 720, 1),
				numberField("quietRunMinutes", "长时间无输出提示", "0–1440 分钟；只显示提示，不改变「执行中」状态，0 关闭。", 0, 1440, 1),
				field("notifyOnCompletion", "运行停止时播放脉冲", "running → 非 running 时播放一次绿色脉冲。"),
				field(
					"restoreScene",
					"恢复上次关闭时的现场",
					"记录上次在运行 / 等待审批 / 未读完成；只有在没有新的 live 状态时才覆盖。",
				),
				numberField("sceneHours", "现场有效期", "1–720 小时；超过后不再恢复。", 1, 720, 1),
				section("状态配色（七态高亮颜色）"),
				h(
					"div",
					{ style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "2px 0 4px" } },
					h("span", { style: { ...styles.formHint, opacity: 0.65 } }, "选择器 / HEX / RGB 三种方式均可，保存后侧栏与总览同步生效。"),
					resetColors,
				),
				colorGrid,
				h(
					"div",
					{ style: styles.footer },
					h(
						"button",
						{
							type: "button",
							onClick: save,
							disabled: !dirty,
							style: dirty ? { ...styles.button, ...styles.buttonPrimary } : { ...styles.button, opacity: 0.45, cursor: "default" },
						},
						"保存配置",
					),
					h("button", { type: "button", onClick: resetDraft, style: styles.button }, "恢复默认"),
					h("span", { style: { fontSize: 11, opacity: 0.6 } }, dirty ? "有未保存的修改" : justSaved ? "已保存" : "与已保存的设置一致"),
				),
				h("p", { style: styles.formHint }, "「恢复默认」只把表单改回默认值，仍需点「保存配置」才会生效。"),
			);
		}

		// ── 侧栏视图（A）─────────────────────────────────────────────────
		const SIDEBAR_STYLE_ID = "dsh-plugin-session-monitor/sidebar-css";
		const SIDEBAR_SELECTOR = {
			group: '[class*="_groupSection"]',
			projectRow: '[class*="_projectRow"]',
			sessionRow: '[class*="_sessionRow"]',
			time: ':scope > [class*="_time"]',
			header: '[data-row-key^="workspace:"]',
			overflow: '[data-row-key^="overflow:"]',
		};
		const BUSY_ATTR = "data-busy-workspace";
		const LIST_ATTR = "data-busy-list";
		const COUNT_ATTR = "data-busy-count";
		const MULTI_ATTR = "data-busy-multi";
		const LABEL_ATTR = "data-busy-label";
		const STATE_ATTR = "data-busy-state";
		const MARK_ATTR = "data-busy-session";
		const SETTLED_ATTR = "data-busy-settled";
		const INTENSITY_ATTR = "data-busy-intensity";
		const HELD_ATTR = "data-busy-held";
		const PHASE_LABELS = {
			review: "待审核",
			waiting: "待处理",
			running: "执行中",
			interrupted: "已中断",
			unread: "已完成 · 未查看",
			seen: "已完成 · 已查看",
			archived: "已完结",
		};
		const PHASE_RANKS = { review: 7, waiting: 6, running: 5, interrupted: 4, unread: 3, seen: 2, archived: 1 };

		function insertSidebarStyle() {
			const old = document.getElementById(SIDEBAR_STYLE_ID);
			if (old !== null) old.remove();
			const style = document.createElement("style");
			style.id = SIDEBAR_STYLE_ID;
			style.textContent = SIDEBAR_CSS;
			document.head.appendChild(style);
			return () => style.remove();
		}

		let currentSelectedSessionId = null;
		let currentSelectedDomState = null;

		function statusStateOf(row) {
			const dot = row.querySelector('[data-state][aria-hidden="true"]');
			if (dot === null) return null;
			const state = dot.getAttribute("data-state");
			return state === "ongoing" || state === "warning" || state === "done" || state === "idle" ? state : null;
		}

		function setAttr(element, attribute, value) {
			if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
		}

		function dropAttr(element, attribute) {
			if (element.hasAttribute(attribute)) element.removeAttribute(attribute);
		}

		function sessionIdOf(row) {
			const key = row.getAttribute("data-row-key");
			const match = key === null ? null : /^session:(.+)$/.exec(key);
			return match === null ? null : match[1];
		}

		function workspaceIdOf(group) {
			const header = group.querySelector(SIDEBAR_SELECTOR.header);
			const key = header === null ? "" : header.getAttribute("data-row-key") || "";
			const match = /^workspace:(.+)$/.exec(key);
			return match === null ? null : match[1];
		}

		function isSelectedRow(row) {
			if (row.getAttribute("aria-selected") === "true") return true;
			return typeof row.className === "string" && row.className.includes("_selected");
		}

		function applySidebar(ctx) {
			const disposeStyle = insertSidebarStyle();
			const runningWatch = new Map();
			let disposed = false;
			let scheduled = false;
			let observer = null;
			let timer = null;

			const paint = () => {
				if (disposed) return;
				const settings = currentSettings();
				document.documentElement.setAttribute(INTENSITY_ATTR, String(settings.intensity));
				document.documentElement.style.setProperty("--bw-intensity", String(settings.intensity));
				for (const [key, hex] of Object.entries(settings.stateColors || {})) {
					document.documentElement.style.setProperty(`--bw-${key}`, hex);
				}
				const rows = [...document.querySelectorAll(SIDEBAR_SELECTOR.sessionRow)];
				const groups = [...document.querySelectorAll(SIDEBAR_SELECTOR.group)];
				const selectedRow = rows.find(isSelectedRow) ?? null;
				const nextSelectedId = selectedRow === null ? null : sessionIdOf(selectedRow);
				const nextSelectedState = selectedRow === null ? null : statusStateOf(selectedRow);
				if (currentSelectedSessionId !== nextSelectedId || currentSelectedDomState !== nextSelectedState) {
					currentSelectedSessionId = nextSelectedId;
					currentSelectedDomState = nextSelectedState;
					notifyStatus();
				}
				if (!settings.sidebarEnabled) {
					for (const row of rows) {
						dropAttr(row, MARK_ATTR);
						dropAttr(row, LABEL_ATTR);
						dropAttr(row, SETTLED_ATTR);
					}
					for (const group of groups) {
						dropAttr(group, BUSY_ATTR);
						dropAttr(group, HELD_ATTR);
						const header = group.querySelector(SIDEBAR_SELECTOR.projectRow);
						if (header !== null) {
							dropAttr(header, STATE_ATTR);
							dropAttr(header, LABEL_ATTR);
							dropAttr(header, COUNT_ATTR);
							dropAttr(header, MULTI_ATTR);
						}
					}
					return;
				}

				const model = collectLive(ctx);
				const liveById = new Map();
				if (!model.error) for (const live of model.items) liveById.set(live.id, live);
				const phaseById = new Map();
				const liveOf = (id) => liveById.get(id);
				for (const live of model.items) phaseById.set(live.id, resolveStatus(live, settings));

				for (const row of rows) {
					const id = sessionIdOf(row);
					const live = id === null ? undefined : liveOf(id);
					const resolved = id === null ? null : phaseById.get(id);
					let phase = resolved?.bucket ?? null;
					if (phase === "seen" && !settings.showSeen) phase = null;
					const mark = settings.highlightSessionRows ? phase : null;
					if (mark !== null) {
						setAttr(row, MARK_ATTR, mark);
						const subagents = mark === "running" && (live?.subagents ?? 0) > 0 ? `${live.subagents} 子智能体` : null;
						setAttr(row, LABEL_ATTR, subagents === null ? PHASE_LABELS[mark] : `${PHASE_LABELS[mark]} · ${subagents}`);
					} else {
						dropAttr(row, MARK_ATTR);
						dropAttr(row, LABEL_ATTR);
					}

					const key = id ?? row.getAttribute("data-row-key") ?? "";
					const wasRunning = runningWatch.get(key) === true;
					const running = mark === "running";
					if (settings.notifyOnCompletion && wasRunning && !running && mark !== "interrupted") {
						if (row.getAttribute(SETTLED_ATTR) !== "true") {
							row.setAttribute(SETTLED_ATTR, "true");
							const clear = () => {
								row.removeAttribute(SETTLED_ATTR);
								row.removeEventListener("animationend", clear);
							};
							row.addEventListener("animationend", clear, { once: true });
							window.setTimeout(clear, 1400);
						}
					}
					runningWatch.set(key, running);
				}
				for (const key of [...runningWatch.keys()]) {
					if (!rows.some((row) => (sessionIdOf(row) ?? row.getAttribute("data-row-key") ?? "") === key)) runningWatch.delete(key);
				}

				const byParent = new Map();
				for (const group of groups) {
					const workspaceId = workspaceIdOf(group);
					const groupRows = [...group.querySelectorAll(SIDEBAR_SELECTOR.sessionRow)];
					const header = group.querySelector(SIDEBAR_SELECTOR.projectRow);
					let best = null;
					let count = 0;
					for (const row of groupRows) {
						const id = sessionIdOf(row);
						const resolved = id === null ? null : phaseById.get(id);
						let phase = resolved?.bucket ?? null;
						if (phase === "seen" && !settings.showSeen) phase = null;
						if (phase === null) continue;
						const rank = PHASE_RANKS[phase] ?? 0;
						const at = liveOf(id)?.updatedAt ?? 0;
						if (best === null || rank > best.rank || (rank === best.rank && at > best.at)) {
							best = { phase, rank, at };
							count = 1;
						} else if (best !== null && phase === best.phase) {
							count += 1;
						}
					}
					const colored = best !== null && settings.highlightBusyWorkspaceHeaders;
					setAttr(group, BUSY_ATTR, colored ? "true" : "false");
					const overflow = group.querySelector(SIDEBAR_SELECTOR.overflow);
					setAttr(group, HELD_ATTR, overflow?.getAttribute("aria-expanded") === "false" ? "true" : "false");
					if (header !== null) {
						setAttr(header, COUNT_ATTR, String(count));
						setAttr(header, MULTI_ATTR, count > 1 ? "true" : "false");
						setAttr(header, STATE_ATTR, best?.phase ?? "none");
						setAttr(header, LABEL_ATTR, best === null ? "" : PHASE_LABELS[best.phase]);
					}
					const parent = group.parentElement;
					if (parent === null) continue;
					let entries = byParent.get(parent);
					if (entries === undefined) {
						entries = [];
						byParent.set(parent, entries);
					}
					let at = 0;
					for (const row of groupRows) {
						const id = sessionIdOf(row);
						const live = id === null ? undefined : liveOf(id);
						if (live !== undefined) at = Math.max(at, live.updatedAt || 0);
					}
					entries.push({ group, at, workspaceId });
				}

				for (const [parent, entries] of byParent) {
					const children = [...parent.children];
					const onlyGroups = children.length > 1 && children.every((child) => child.matches(SIDEBAR_SELECTOR.group));
					if (!onlyGroups || !settings.orderByActivity) {
						dropAttr(parent, LIST_ATTR);
						for (const entry of entries) entry.group.style.removeProperty("order");
						continue;
					}
					const domIndex = new Map(children.map((child, index) => [child, index]));
					entries.sort((a, b) => {
						const diff = (b.at || 0) - (a.at || 0);
						if (diff !== 0) return diff;
						return (domIndex.get(a.group) ?? 0) - (domIndex.get(b.group) ?? 0);
					});
					setAttr(parent, LIST_ATTR, "true");
					for (let index = 0; index < entries.length; index += 1) {
						entries[index].group.style.setProperty("order", String(index + 1));
					}
				}
			};

			const schedule = () => {
				if (disposed || scheduled) return;
				scheduled = true;
				window.requestAnimationFrame(() => {
					scheduled = false;
					try {
						paint();
					} catch (error) {
						/* A paint failure must not break the host UI */
					}
				});
			};

			observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state", "class", "aria-selected", "data-row-key"] });
			timer = window.setInterval(schedule, 30 * 1000);
			const offSettings = subscribeSettings(schedule);
			const offStatus = subscribeStatus(schedule);
			const sessions = service(ctx, "sessions");
			const workspaces = service(ctx, "workspaces");
			const disposers = [];
			for (const store of [sessions?.list, workspaces?.list]) {
				if (store && typeof store.subscribe === "function") disposers.push(store.subscribe(schedule));
			}
			window.addEventListener("focus", schedule);
			schedule();

			ctx.effect(
				() => () => {
					disposed = true;
					if (observer !== null) observer.disconnect();
					if (timer !== null) window.clearInterval(timer);
					offSettings();
					offStatus();
					for (const dispose of disposers) {
						try {
							dispose();
						} catch (error) {
							/* ignore */
						}
					}
					window.removeEventListener("focus", schedule);
					disposeStyle();
					for (const row of document.querySelectorAll(SIDEBAR_SELECTOR.sessionRow)) {
						dropAttr(row, MARK_ATTR);
						dropAttr(row, LABEL_ATTR);
						dropAttr(row, SETTLED_ATTR);
					}
					for (const group of document.querySelectorAll(SIDEBAR_SELECTOR.group)) {
						dropAttr(group, BUSY_ATTR);
						dropAttr(group, HELD_ATTR);
						group.style.removeProperty("order");
					}
					for (const parent of document.querySelectorAll(`[${LIST_ATTR}]`)) dropAttr(parent, LIST_ATTR);
					document.documentElement.removeAttribute(INTENSITY_ATTR);
					document.documentElement.style.removeProperty("--bw-intensity");
					for (const key of Object.keys(SETTINGS_DEFAULTS.stateColors)) {
						document.documentElement.style.removeProperty(`--bw-${key}`);
					}
				},
				"session-monitor: sidebar",
			);
		}

		/** 手动修正允许的全部状态（与七个展示状态一一对应）。 */
		const OVERRIDE_PHASES = ["review", "waiting", "running", "interrupted", "unread", "seen", "archived"];
		const OVERRIDE_NOTES = {
			review: "手动标记为待审核",
			waiting: "手动标记为待处理",
			running: "手动恢复为执行中",
			interrupted: "手动标记为已中断",
			unread: "手动标记为已完成 · 未查看",
			seen: "手动标记为已完成 · 已查看",
			archived: "手动标记为已完结",
		};

		/** 右键菜单的行内小图标（静态 SVG，currentColor 跟随菜单文字色）。 */
		const MENU_ICONS = {
			mark: '<path d="M9.5 2.5h4v4L6 14l-4-4 7.5-7.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="5" r="1" fill="currentColor"/>',
			review: '<path d="M4 2.5h8M4 13.5h8M5 2.5v2.2c0 1.4 3 2.4 3 3.3s-3 1.9-3 3.3v2.2M11 2.5v2.2c0 1.4-3 2.4-3 3.3s3 1.9 3 3.3v2.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
			waiting: '<circle cx="4" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12" cy="8" r="1.4" fill="currentColor"/>',
			running: '<path d="M5 3.5v9l7-4.5-7-4.5z" fill="currentColor"/>',
			interrupted: '<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
			unread: '<rect x="2.5" y="4" width="11" height="8" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3 5l5 4 5-4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>',
			seen: '<path d="M1.8 8s2.4-4 6.2-4 6.2 4 6.2 4-2.4 4-6.2 4S1.8 8 1.8 8z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/>',
			archived: '<path d="M8 2.2l1.7 3.4 3.8.6-2.7 2.7.6 3.8L8 10.9l-3.4 1.8.6-3.8L2.5 6.2l3.8-.6L8 2.2z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
			clear: '<path d="M3 8a5 5 0 1 1 1.5 3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M3 4.5V8h3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
		};

		function applyMenuIcons(ctx) {
			const slots = service(ctx, "slots");
			if (!slots || typeof slots.inject !== "function") return;
			ctx.effect(() => {
				const disposers = [];
				for (const [name, svg] of Object.entries(MENU_ICONS)) {
					const key = `session-monitor.icon.${name}`;
					disposers.push(
						slots.inject(
							"contextMenu.icon",
							() =>
								slots.register({ name: "contextMenu.icon", key }, () =>
									h("span", {
										style: { display: "inline-flex", width: 14, height: 14, marginRight: 6, flex: "none" },
										dangerouslySetInnerHTML: {
											__html: `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">${svg}</svg>`,
										},
									}),
								),
						),
					);
				}
				return () => {
					for (const dispose of disposers) {
						try {
							dispose();
						} catch (error) {
							/* ignore */
						}
					}
				};
			}, "session-monitor: menu icons");
		}

		/** 撤销手动修正，回到插件自动判定（可由原 sticky / Host 证据恢复原状态）。 */
		function clearCorrection(id) {
			clearOverride(id);
		}

		/** 「已完结」的提前超时后门：清除标记并写入 settled 普通样式。 */
		function clearStateMark(id) {
			clearOverride(id);
			rememberSticky(id, "settled", Date.now());
		}

		function applyManualMenu(ctx) {
			const contextMenus = service(ctx, "contextMenus");
			if (!contextMenus || typeof contextMenus.register !== "function") return;
			ctx.effect(
				() =>
					contextMenus.register({
						id: "session-monitor.correct-status",
						target: "session",
						order: 710,
						observe: () => [service(ctx, "sessions")?.list, service(ctx, "workspaces")?.list].filter(Boolean),
						resolve: ({ sessionId }) => {
							const model = collectLive(ctx);
							const live = model.items.find((item) => item.id === sessionId);
							if (!live) return [];
							const override = overrideFor(sessionId);
							return [
								{
									id: "mark",
									label: "标记状态为",
									icon: { key: "session-monitor.icon.mark" },
									children: OVERRIDE_PHASES.map((phase) => ({
										id: `mark-${phase}`,
										label: PHASE_LABELS[phase],
										icon: { key: `session-monitor.icon.${phase}` },
										run: () => setOverride(sessionId, phase, live.updatedAt),
									})),
								},
								{
									id: "clear",
									label: "清除状态修正",
									icon: { key: "session-monitor.icon.clear" },
									disabled: !override,
									// 撤销手动标记，恢复插件自动判定（之前是青色已查看
									// 就应回到青色，不写 settled）。
									run: () => clearCorrection(sessionId),
								},
								{
									// 「已完结」的提前超时清除后门：只对该状态可用，
									// 其余状态置灰（它们不应被人工剥夺高亮）。
									id: "clear-mark",
									label: "清除状态标记",
									icon: { key: "session-monitor.icon.archived" },
									disabled: override?.phase !== "archived",
									run: () => clearStateMark(sessionId),
								},
							];
						},
					}),
				"session-monitor: manual status corrections",
			);
		}

		function applyPurgeListener() {
			const onPurged = (event) => {
				const id = event?.detail?.id;
				if (typeof id !== "string") return;
				for (const variant of [id, id.startsWith("session-") ? id.slice(8) : `session-${id}`]) {
					forgetSticky(variant);
					clearOverrideQuiet(variant);
					if (scene.boot?.sessions) delete scene.boot.sessions[variant];
					delete scene.seen[variant];
					scene.ack.delete(variant);
				}
				notifyStatus();
			};
			window.addEventListener("dsh-busy-workspace:purged", onPurged);
			return () => window.removeEventListener("dsh-busy-workspace:purged", onPurged);
		}


		const inject = ["slots", "contextMenus", "sessions", "workspaces", "uiSession"];

		function apply(ctx) {
			loadBootScene(currentSettings());
			startRuntime(ctx);
			applySidebar(ctx);
			applyMenuIcons(ctx);
			applyManualMenu(ctx);
			ctx.effect(() => applyPurgeListener(), "session-monitor: purge listener");

			const slots = ctx.slots;
			if (!slots || typeof slots.inject !== "function") return;

			ctx.effect(() => {
				startSceneTracker(ctx);
				return () => {
					if (scene.stop) scene.stop();
				};
			}, "session-monitor: scene tracker");

			ctx.effect(
				() =>
					slots.inject("sidebar.panellist", () =>
						slots.register(
							{ name: "sidebar.panellist", id: PANEL_ID, order: PANEL_ORDER, label: () => "会话总览" },
							PanelIcon,
						),
					),
				"session-monitor: sidebar row",
			);
			ctx.effect(
				() =>
					slots.inject("main", () =>
						slots.register({ name: "main", key: PANEL_ID, inject: () => ({ ctx }) }, PanelPage),
					),
				"session-monitor: main page",
			);
			ctx.effect(
				() =>
					slots.inject("plugins.bundle.config", () =>
						slots.register({ name: "plugins.bundle.config", key: BUNDLE_NAME }, SettingsPage),
					),
				"session-monitor: bundle config page",
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.__test = {
			PanelPage,
			PanelIcon,
			collectLive,
			resolveStatus,
			normalizeSettings,
			readSettings,
			updateSettings,
			rememberSticky,
			forgetSticky,
			setOverride,
			clearOverride,
			SettingsPage,
			BUCKETS,
			PHASE_LABELS,
			MENU_ICONS,
			normalizeOverrides,
			clearCorrection,
			clearStateMark,
			injectRuntime(sessions, bootAt) {
				runtimeSessions.clear();
				for (const [id, value] of Object.entries(sessions || {})) {
					if (value && typeof value === "object") runtimeSessions.set(id, value);
				}
				runtimeBootAt = Number(bootAt) || Date.now();
				runtimeFetchedAt = Date.now();
			},
			clearRuntime() {
				runtimeSessions.clear();
				runtimeFetchedAt = 0;
				runtimeBootAt = 0;
			},
		};
		return module.exports;
	},
});
