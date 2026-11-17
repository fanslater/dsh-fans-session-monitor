import assert from "node:assert";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const file = "D:/__workspace/__workspace_ai/20261105_DSH插件整理安装/plugins/dsh-fans-session-monitor/lib/client.js";
const store = new Map();
const fakeReact = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children };
  },
  useState(initial) {
    return [typeof initial === "function" ? initial() : initial, () => {}];
  },
  useEffect() {},
  useMemo(factory) {
    return factory();
  },
  useCallback(fn) {
    return fn;
  },
};
let captured;
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(definition) {
        captured = definition.factory((name) => (name === "react" ? fakeReact : {}));
      },
    },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    innerWidth: 1280,
  },
  document: {
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => ({ remove() {} }),
    head: { appendChild() {} },
    body: {},
    documentElement: { setAttribute() {}, removeAttribute() {} },
  },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  console,
};
vm.createContext(sandbox);
sandbox.localStorage = sandbox.window.localStorage;
vm.runInContext(readFileSync(file, "utf8"), sandbox, { filename: file });

const { resolveStatus, normalizeSettings, readSettings, setOverride, clearOverride, SettingsPage, updateSettings, collectLive, rememberSticky, forgetSticky, injectRuntime, clearRuntime, BUCKETS, PHASE_LABELS, MENU_ICONS, normalizeOverrides, clearCorrection, clearStateMark } = captured.__test;

// Every bucket must have a trailing state word; a missing entry renders the
// literal "undefined" on the row (regression: archived had no label).
for (const bucket of BUCKETS) {
  assert.equal(typeof PHASE_LABELS[bucket.key], "string", `missing PHASE_LABELS entry for ${bucket.key}`);
}
const settings = normalizeSettings({});

// All seven manual phases must survive a reload — the loader used to keep only
// running/interrupted, so archived/review/waiting/unread/seen marks vanished
// after a DSH restart while still looking applied in memory.
const rawOverrides = normalizeOverrides({
  version: 1,
  sessions: {
    a: { phase: "archived", at: 1, basisUpdatedAt: 0 },
    b: { phase: "review", at: 2, basisUpdatedAt: 0 },
    c: { phase: "waiting", at: 3, basisUpdatedAt: 0 },
    d: { phase: "running", at: 4, basisUpdatedAt: 0 },
    e: { phase: "interrupted", at: 5, basisUpdatedAt: 0 },
    f: { phase: "unread", at: 6, basisUpdatedAt: 0 },
    g: { phase: "seen", at: 7, basisUpdatedAt: 0 },
    h: { phase: "bogus", at: 8, basisUpdatedAt: 0 },
  },
});
assert.equal(Object.keys(rawOverrides.sessions).length, 7, "all seven phases must survive override normalization");
for (const phase of ["archived", "review", "waiting", "running", "interrupted", "unread", "seen"]) {
  assert.ok(
    Object.values(rawOverrides.sessions).some((entry) => entry.phase === phase),
    `override phase ${phase} was dropped on load`,
  );
}

// State colours: invalid values fall back per-key; valid values normalise.
const colored = normalizeSettings({
  stateColors: { review: "not-a-color", seen: "#0A91B2", waiting: "eab308", running: "#48f" },
});
assert.equal(colored.stateColors.review, "#f97316", "invalid hex must fall back to the default");
assert.equal(colored.stateColors.seen, "#0a91b2");
assert.equal(colored.stateColors.waiting, "#eab308");
assert.equal(colored.stateColors.running, "#4488ff", "3-digit hex expands");
assert.equal(normalizeSettings({}).stateColors.seen, "#00c8c8");

// Long-running tasks are authoritative; elapsed time must not turn them red.
const staleRunning = {
  id: "session-running",
  updatedAt: Date.now() - 3 * 3600 * 1000,
  running: true,
  agentAvailable: true,
  pending: null,
  unread: false,
  subagents: 0,
};
const running = resolveStatus(staleRunning, settings);
assert.equal(running.bucket, "running");
assert.ok(running.note.includes("无新输出"), running.note);

// An explicit manual correction is shared by both surfaces.
const idle = { ...staleRunning, running: false, updatedAt: Date.now() };
setOverride("session-running", "interrupted", idle.updatedAt);
assert.equal(resolveStatus(idle, settings).bucket, "interrupted");
clearOverride("session-running");
assert.equal(resolveStatus(idle, settings).bucket, "seen");

// Old idle sessions keep the seen highlight under the unified funnel: the
// only way out of highlighting is marking 已完结 and letting it time out or
// clearing it manually.
const oldIdle = { ...idle, id: "session-old", updatedAt: Date.now() - 3 * 24 * 3600 * 1000 };

// Unread must persist across repaints; only selecting it or a recorded
// scene seenAt may promote it to seen.
rememberSticky("session-memory-unread", "unread", Date.now());
const memoryUnread = { ...idle, id: "session-memory-unread", running: false, unread: false, selected: false };
assert.equal(resolveStatus(memoryUnread, settings).bucket, "unread");
assert.equal(resolveStatus({ ...memoryUnread, selected: true }, settings).bucket, "seen");
assert.equal(resolveStatus(oldIdle, settings).bucket, "seen");
const oldUnread = { ...oldIdle, unread: true };
assert.equal(resolveStatus(oldUnread, settings).bucket, "unread");

// The selected row's official data-state is a direct renderer fact.
const selectedLive = { ...idle, id: "session-selected", running: false, selected: true, domState: "ongoing" };
assert.equal(resolveStatus(selectedLive, settings).bucket, "running");

// Host-completed turns: seen evidence must be NEWER than the completion.
// A sticky "seen" left over from a PREVIOUS turn must not swallow a fresh
// completion — the user reported exactly this false grey "已查看".
const turnDone = Date.now() - 5 * 60 * 1000;
const completedLive = {
  ...idle,
  id: "session-fresh-done",
  running: false,
  updatedAt: turnDone,
  unread: false,
  selected: false,
};
injectRuntime({ "session-fresh-done": { running: false, agentAvailable: true, lastTurn: "completed", lastTurnEndAt: turnDone } }, Date.now() - 60 * 1000);
forgetSticky("session-fresh-done");
assert.equal(resolveStatus(completedLive, settings).bucket, "unread", "fresh completion without read evidence must be unread");
// Selecting it promotes to seen and records a sticky AFTER the completion.
assert.equal(resolveStatus({ ...completedLive, selected: true }, settings).bucket, "seen");
assert.equal(resolveStatus({ ...completedLive, selected: false }, settings).bucket, "seen", "sticky seen written after the completion keeps it seen");
// A NEW turn completes after the sticky seen was recorded: must be unread again.
const secondTurnEnd = Date.now() - 60 * 1000;
injectRuntime({ "session-fresh-done": { running: false, agentAvailable: true, lastTurn: "completed", lastTurnEndAt: secondTurnEnd } }, Date.now());
assert.equal(
  resolveStatus({ ...completedLive, updatedAt: secondTurnEnd }, settings).bucket,
  "unread",
  "a new completion after a previous seen must be unread, not grey",
);
clearRuntime();

// Flip-back regression: the client snapshot's updatedAt can lag the Host's
// turn-end timestamp. Viewing must write the sticky at completion time so the
// NEXT paint (selection moved elsewhere) still passes its own freshness check.
const lagEnd = Date.now() - 60 * 1000;
const laggedLive = { ...completedLive, id: "session-lag", updatedAt: lagEnd - 40, running: false, unread: false };
injectRuntime({ "session-lag": { running: false, agentAvailable: true, lastTurn: "completed", lastTurnEndAt: lagEnd } }, Date.now());
forgetSticky("session-lag");
assert.equal(resolveStatus({ ...laggedLive, selected: true }, settings).bucket, "seen");
assert.equal(
  resolveStatus({ ...laggedLive, selected: false }, settings).bucket,
  "seen",
  "sticky written at completion time must survive the selection moving away",
);
clearRuntime();

// Manual 已完结 (archived): right-click mark, grey terminal state; new
// activity, running, pending, or unread auto-clears it like other overrides.
forgetSticky("session-arch");
setOverride("session-arch", "archived", Date.now());
const archLive = { ...idle, id: "session-arch", running: false, unread: false, selected: false };
const archived = resolveStatus(archLive, settings);
assert.equal(archived.bucket, "archived");
assert.equal(archived.note, "手动标记为已完结");
assert.equal(archived.source, "manual");
const afterActivity = resolveStatus({ ...archLive, updatedAt: Date.now() + 5000 }, settings);
assert.notEqual(afterActivity.bucket, "archived", "new activity must clear the archived override");
clearOverride("session-arch");

// 「已完结」 pins are explicit human decisions: they HOLD even on long-idle
// Sessions (stickyHours expiry only governs AUTOMATIC final states, not
// manual marks). Only contradictions or 清除状态修正 remove them.
setOverride("session-arch-old", "archived", Date.now() - 2 * 24 * 3600 * 1000);
const archOld = { ...idle, id: "session-arch-old", running: false, unread: false, selected: false, updatedAt: Date.now() - 2 * 24 * 3600 * 1000 };
const pinnedArchOld = resolveStatus(archOld, settings);
assert.equal(pinnedArchOld.source, "manual", "a manual mark on an old session must hold");
assert.equal(pinnedArchOld.bucket, "archived");
clearOverride("session-arch-old");

// 方案③: 「已完结」 expires stickyHours after it was MARKED (override.at),
// independent of activity — an old mark on a fresh session still expires.
setOverride("session-arch-exp", "archived", Date.now(), Date.now() - 2 * 24 * 3600 * 1000);
const archExpLive = { ...idle, id: "session-arch-exp", running: false, unread: false, selected: false, updatedAt: Date.now() };
const expiredMark = resolveStatus(archExpLive, settings);
assert.notEqual(expiredMark.source, "manual", "an expired 已完结 mark must be cleared");
assert.notEqual(expiredMark.bucket, "archived");
clearOverride("session-arch-exp");

// The other six manual marks NEVER time-expire, even when marked long ago.
setOverride("session-int-old", "interrupted", Date.now(), Date.now() - 2 * 24 * 3600 * 1000);
const intOld = { ...idle, id: "session-int-old", running: false, unread: false, selected: false, updatedAt: Date.now() };
const pinnedInt = resolveStatus(intOld, settings);
assert.equal(pinnedInt.source, "manual", "non-archived manual marks never time-expire");
assert.equal(pinnedInt.bucket, "interrupted");
clearOverride("session-int-old");

// Settled lifecycle: 已完结 cleared (manually or by timeout) must fall to the
// PLAIN style and stay there — not bounce back to the emerald seen.
const settleEnd = Date.now() - 3 * 60 * 1000;
injectRuntime({ "session-settle": { running: false, agentAvailable: true, lastTurn: "completed", lastTurnEndAt: settleEnd } }, Date.now());
forgetSticky("session-settle");
const settleLive = { ...completedLive, id: "session-settle", updatedAt: settleEnd, running: false, unread: false };
assert.equal(resolveStatus(settleLive, settings).bucket, "unread");
assert.equal(resolveStatus({ ...settleLive, selected: true }, settings).bucket, "seen");
setOverride("session-settle", "archived", settleLive.updatedAt);
assert.equal(resolveStatus(settleLive, settings).bucket, "archived");
// 清除状态标记 → settled memory → plain even though Host still says completed
clearOverride("session-settle");
rememberSticky("session-settle", "settled", settleEnd);
assert.equal(resolveStatus(settleLive, settings).bucket, null, "settled session must stay plain");
assert.equal(resolveStatus({ ...settleLive, selected: false, updatedAt: settleEnd }, settings).bucket, null);
// Opening a settled row alone must NOT re-highlight it.
assert.equal(resolveStatus({ ...settleLive, selected: true }, settings).bucket, null);
// Manual marks still win over settled (any of the seven phases).
setOverride("session-settle", "archived", settleLive.updatedAt);
assert.equal(resolveStatus({ ...settleLive, selected: true }, settings).bucket, "archived");
clearOverride("session-settle");
rememberSticky("session-settle", "settled", settleEnd);
setOverride("session-settle", "review", settleLive.updatedAt);
assert.equal(resolveStatus({ ...settleLive, selected: true }, settings).bucket, "review");
clearOverride("session-settle");
rememberSticky("session-settle", "settled", settleEnd);
// Automatic contradictions still beat settled.
assert.equal(resolveStatus({ ...settleLive, unread: true }, settings).bucket, "unread");
assert.equal(resolveStatus({ ...settleLive, running: true }, settings).bucket, "running");
// New activity breaks settled and falls back to automatic judgment.
const afterActivitySettled = resolveStatus({ ...settleLive, updatedAt: settleEnd + 1000 }, settings);
assert.notEqual(afterActivitySettled.bucket, null, "new activity after settling must leave the plain state");
assert.notEqual(afterActivitySettled.source, "settled", "new activity must not stay in settled");
forgetSticky("session-settle");
// A NEW completion after settling breaks the plain state.
const newEnd = Date.now() - 30 * 1000;
injectRuntime({ "session-settle": { running: false, agentAvailable: true, lastTurn: "completed", lastTurnEndAt: newEnd } }, Date.now());
assert.equal(
  resolveStatus({ ...settleLive, updatedAt: newEnd }, settings).bucket,
  "unread",
  "a new completion after settling must show unread again",
);
clearOverride("session-settle");
clearRuntime();

// 清除状态修正 vs 清除状态标记 must differ:
// - correction restores the previous automatic/seen highlight;
// - mark-clear is the early-timeout backdoor and writes settled plain.
const clearLive = {
  ...idle,
  id: "session-clear-kinds",
  running: false,
  unread: false,
  selected: false,
  updatedAt: Date.now() - 1000,
};
rememberSticky("session-clear-kinds", "seen", Date.now() - 500);
setOverride("session-clear-kinds", "archived", clearLive.updatedAt);
assert.equal(resolveStatus(clearLive, settings).bucket, "archived");
clearCorrection("session-clear-kinds");
assert.equal(resolveStatus(clearLive, settings).bucket, "seen", "清除状态修正 must restore the previous seen highlight");
setOverride("session-clear-kinds", "archived", clearLive.updatedAt);
assert.equal(resolveStatus(clearLive, settings).bucket, "archived");
clearStateMark("session-clear-kinds");
assert.equal(resolveStatus(clearLive, settings).bucket, null, "清除状态标记 is the early timeout and becomes plain");
forgetSticky("session-clear-kinds");

// The unified manual menu marks ANY of the seven states via override.
setOverride("session-mark-any", "review", Date.now());const markedReview = resolveStatus({ ...idle, id: "session-mark-any", running: false, unread: false }, settings);
assert.equal(markedReview.bucket, "review");
assert.equal(markedReview.note, "手动标记为待审核");
assert.equal(markedReview.source, "manual");
clearOverride("session-mark-any");
setOverride("session-mark-any", "seen", Date.now());
assert.equal(resolveStatus({ ...idle, id: "session-mark-any", running: false, unread: false }, settings).bucket, "seen");
clearOverride("session-mark-any");

// Opening a Session clears a manual "unread" pin: viewing contradicts unread.
setOverride("session-pin-unread", "unread", Date.now());
const pinnedUnread = { ...idle, id: "session-pin-unread", running: false, unread: false, selected: false };
assert.equal(resolveStatus(pinnedUnread, settings).bucket, "unread");
assert.equal(
  resolveStatus({ ...pinnedUnread, selected: true }, settings).bucket,
  "seen",
  "viewing a manually-pinned unread Session must flip it to seen",
);

// Regression: a settled (plain, no-highlight) Session marked unread, then
// opened, must become seen — not fall back to the plain settled row.
rememberSticky("session-pin-settled", "settled", Date.now() - 1000);
setOverride("session-pin-settled", "unread", Date.now());
const settledPinned = {
  ...idle,
  id: "session-pin-settled",
  running: false,
  unread: false,
  selected: false,
  updatedAt: Date.now() - 5000,
};
assert.equal(resolveStatus(settledPinned, settings).bucket, "unread");
assert.equal(
  resolveStatus({ ...settledPinned, selected: true }, settings).bucket,
  "seen",
  "opening a pinned unread Session must clear settled and show seen",
);

// Menu icon slot registrations must cover every menu icon key.
const iconKeys = Object.keys(captured.__test.MENU_ICONS ?? {});
for (const phase of ["review", "waiting", "running", "interrupted", "unread", "seen", "archived"]) {
  assert.ok(iconKeys.includes(phase), `missing menu icon for ${phase}`);
}
assert.ok(iconKeys.includes("mark") && iconKeys.includes("clear"), "menu parent/clear icons missing");

// Invalidation matrix: every manual phase must yield to real evidence —
// new activity, running, pending, or unread each clears the pin.
for (const phase of ["review", "waiting", "running", "interrupted", "unread", "seen", "archived"]) {
  const id = `pin-${phase}`;
  const base = { ...idle, id, running: false, unread: false, pending: null, selected: false };
  setOverride(id, phase, Date.now());
  assert.equal(resolveStatus(base, settings).source, "manual", `${phase} pin should hold without contradictions`);
  clearOverride(id);

  // new activity clears it
  setOverride(id, phase, Date.now());
  assert.notEqual(
    resolveStatus({ ...base, updatedAt: Date.now() + 60000 }, settings).source,
    "manual",
    `${phase} pin must clear on new activity`,
  );
  clearOverride(id);

  // running clears it
  setOverride(id, phase, Date.now());
  assert.notEqual(
    resolveStatus({ ...base, running: true }, settings).source,
    "manual",
    `${phase} pin must clear when the Session runs`,
  );
  clearOverride(id);

  // pending clears it
  setOverride(id, phase, Date.now());
  assert.notEqual(
    resolveStatus({ ...base, pending: "question" }, settings).source,
    "manual",
    `${phase} pin must clear when a pending interaction appears`,
  );
  clearOverride(id);

  // unread clears it
  setOverride(id, phase, Date.now());
  assert.notEqual(
    resolveStatus({ ...base, unread: true }, settings).source,
    "manual",
    `${phase} pin must clear when unread appears`,
  );
  clearOverride(id);
}

// A stale raw session.running must not override an explicit status running:false.
const staleRawCtx = {
  get: (name) => {
    if (name === "sessions") return { list: { getSnapshot: () => ({ byId: { "session-stale": { title: "测试会话效果", updatedAt: Date.now(), blank: false, origin: "main", running: true, agentAvailable: true } } }) } };
    if (name === "workspaces") return { list: { getSnapshot: () => ({ items: [{ workspaceId: "w1", title: "工作区", sessionIds: ["session-stale"] }], archivedSessionIds: [] }) } };
    if (name === "uiSession") return { sessionStatus: { getSnapshot: () => new Map([["session-stale", { running: false, pendingInteraction: null, completionUnread: false }]]) } };
    return undefined;
  },
};
assert.equal(collectLive(staleRawCtx).items[0].running, false);

// A live agent whose list summary says running=true wins over a transient
// sessionStatus.running=false (the current-session startup race).
const activeAgentCtx = {
  get: (name) => {
    if (name === "sessions") return { list: { getSnapshot: () => ({ byId: { "session-live": { title: "当前会话", updatedAt: Date.now(), blank: false, origin: "main", running: true, agentAvailable: true } } }) } };
    if (name === "workspaces") return { list: { getSnapshot: () => ({ items: [{ workspaceId: "w1", title: "工作区", sessionIds: ["session-live"] }], archivedSessionIds: [] }) } };
    if (name === "uiSession") return { sessionStatus: { getSnapshot: () => new Map([["session-live", { running: true, pendingInteraction: null, completionUnread: false }]]) } };
    return undefined;
  },
};
assert.equal(collectLive(activeAgentCtx).items[0].running, true);

// No live Agent means no "running", even if a stale status map still says true.
const noAgentCtx = {
  get: (name) => {
    if (name === "sessions") return { list: { getSnapshot: () => ({ byId: { "session-ghost": { title: "无 Agent 会话", updatedAt: Date.now(), blank: false, origin: "main", running: true, agentAvailable: false } } }) } };
    if (name === "workspaces") return { list: { getSnapshot: () => ({ items: [{ workspaceId: "w1", title: "工作区", sessionIds: ["session-ghost"] }], archivedSessionIds: [] }) } };
    if (name === "uiSession") return { sessionStatus: { getSnapshot: () => new Map([["session-ghost", { running: true, pendingInteraction: null, completionUnread: false }]]) } };
    return undefined;
  },
};
assert.equal(collectLive(noAgentCtx).items[0].running, false);

// Old A/C settings migrate into the monitor settings key.
store.clear();
store.set("dsh-session-overview.settings", JSON.stringify({ showSeen: false, sceneHours: 48, restoreScene: true }));
store.set("dsh-plugin-busy-workspace:settings:v2", JSON.stringify({ highlightRunningSessions: false, stickyHours: 12, intensity: 0.3 }));
const migrated = readSettings();
assert.equal(migrated.showSeen, false);
assert.equal(migrated.highlightSessionRows, false);
assert.equal(migrated.stickyHours, 12);
assert.equal(migrated.intensity, 0.3);
assert.equal(migrated.sceneHours, 48);

const texts = (node, out = []) => {
  if (node === null || node === undefined || node === false) return out;
  if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return out; }
  if (Array.isArray(node)) { for (const item of node) texts(item, out); return out; }
  if (typeof node === "object" && node.children !== undefined) texts(node.children, out);
  return out;
};
const page = texts(SettingsPage({ view: "page" })).join(" ");
for (const needle of ["fans会话状态监测总览", "高亮会话行", "长时间无输出提示", "保存配置", "恢复默认"]) {
  assert.ok(page.includes(needle), `config missing ${needle}`);
}

const panelCtx = {
  get: (name) => {
    if (name === "sessions") {
      return {
        list: {
          getSnapshot: () => ({
            phase: "ready",
            byId: {
              "session-idle": { title: "长任务", updatedAt: Date.now(), blank: false, origin: "main", running: false, agentAvailable: false },
            },
          }),
          subscribe: () => () => {},
        },
      };
    }
    if (name === "workspaces") {
      return {
        list: {
          getSnapshot: () => ({
            items: [{ workspaceId: "w1", title: "工作区 A", sessionIds: ["session-idle"] }],
            archivedSessionIds: [],
          }),
          subscribe: () => () => {},
        },
      };
    }
    if (name === "uiSession") {
      return {
        sessionStatus: {
          getSnapshot: () => new Map([["session-idle", { running: false, pendingInteraction: null, completionUnread: false }]]),
          subscribe: () => () => {},
        },
      };
    }
    return undefined;
  },
};
updateSettings({ showSeen: true });
const panelPage = texts(captured.__test.PanelPage({ ctx: panelCtx })).join(" ");
for (const needle of ["会话总览", "已完成 · 已查看"]) {
  assert.ok(panelPage.includes(needle), `panel missing ${needle}`);
}
console.log("session monitor checks passed");
