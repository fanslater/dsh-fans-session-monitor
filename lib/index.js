/**
 * Host half of dsh-fans-session-monitor.
 *
 * The client owns the sidebar and overview. This half exposes one narrow,
 * token-gated read-only route for the evidence the renderer cannot see:
 * Host boot time plus the last turn boundary of currently active Sessions.
 * It never returns session content, titles, prompts, or tool results.
 *
 * @module dsh-fans-session-monitor
 */

const ROUTE = "/session-monitor/runtime";
const CLIENT_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
let registeredToken = null;

/** Host services needed before the route can be registered. */
export const inject = ["webServer"];

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function bootInfo() {
  return {
    bootAt: Date.now() - Math.floor(process.uptime() * 1000),
    pid: process.pid,
  };
}

function turnStateOf(session) {
  const log = Array.isArray(session?.log) ? session.log : [];
  let lastStart = null;
  let lastEnd = null;
  for (const event of log) {
    if (event?.type === "turn/start") lastStart = event;
    else if (event?.type === "turn/end") lastEnd = event;
  }
  const open = lastStart !== null && (lastEnd === null || lastStart.seq > lastEnd.seq);
  const reason = lastEnd?.data?.reason?.kind;
  const abortCause = lastEnd?.data?.reason?.reason?.kind;
  let lastTurn = "none";
  if (open) lastTurn = "open";
  else if (
    reason === "interrupted" ||
    reason === "aborted" ||
    reason === "blocked" ||
    reason === "error" ||
    reason === "max-tokens"
  ) {
    lastTurn = "interrupted";
  } else if (lastEnd !== null) {
    // completed and forked turns are settled completions.
    lastTurn = "completed";
  }
  return {
    lastTurn,
    lastReason: reason ?? null,
    lastAbortCause: abortCause ?? null,
    lastEventAt: Number(log.at(-1)?.time) || 0,
    lastTurnEndAt: Number(lastEnd?.time) || 0,
  };
}

function runState(ctx, ids) {
  const sessions = ctx.get("sessions") ?? ctx.sessions;
  const agents = ctx.get("agents") ?? ctx.agents;
  const out = {};
  for (const id of ids) {
    let session;
    try {
      session = sessions?.get?.(id);
    } catch {
      session = undefined;
    }
    if (session === undefined) continue;
    let agent;
    try {
      agent = agents?.get?.(id);
    } catch {
      agent = undefined;
    }
    const turn = turnStateOf(session);
    out[id] = {
      running: agent?.status === "running",
      agentAvailable: agent !== undefined,
      ...turn,
    };
  }
  return out;
}

function handle(ctx, req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, message: "只接受 POST" });
    return;
  }
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 64 * 1024) req.destroy();
  });
  req.on("end", () => {
    let request;
    try {
      request = JSON.parse(body);
    } catch {
      sendJson(res, 400, { ok: false, message: "请求不是合法 JSON" });
      return;
    }
    if (request === null || typeof request !== "object") {
      sendJson(res, 400, { ok: false, message: "请求不是合法对象" });
      return;
    }
    if (request.action === "register") {
      if (typeof request.token !== "string" || !CLIENT_TOKEN.test(request.token)) {
        sendJson(res, 400, { ok: false, message: "令牌不合法" });
        return;
      }
      registeredToken = request.token;
      sendJson(res, 200, { ok: true });
      return;
    }
    const provided =
      (typeof request.token === "string" ? request.token : null) ??
      req.headers["x-session-monitor-token"];
    if (provided === null || provided !== registeredToken) {
      sendJson(res, 403, { ok: false, message: "无效的状态监测令牌" });
      return;
    }
    if (request.action !== "run-state" || !Array.isArray(request.sessionIds) || request.sessionIds.length > 200) {
      sendJson(res, 400, { ok: false, message: "请求参数不合法" });
      return;
    }
    const ids = [...new Set(request.sessionIds)].filter(
      (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(id),
    );
    sendJson(res, 200, { ok: true, ...bootInfo(), sessions: runState(ctx, ids) });
  });
}

export function apply(ctx) {
  const webServer = ctx.get("webServer") ?? ctx.webServer;
  if (webServer === undefined || webServer === null) {
    ctx.logger?.warn?.("session-monitor: webServer unavailable; runtime route disabled");
    return;
  }
  ctx.effect(
    () =>
      webServer.register({
        kind: "exact",
        path: ROUTE,
        handler: (req, res) => handle(ctx, req, res),
      }),
    "session-monitor: runtime route",
  );
  ctx.logger?.info?.("session-monitor: token-gated runtime route registered");
}

export const name = "session-monitor";
