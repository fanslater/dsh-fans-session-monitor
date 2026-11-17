# Changelog

## [1.2.6] — 2026-11-14

- Fixed the two clear actions being conflated: clearing 「已完结」 via
  「清除状态修正」 now restores the plugin's automatic state (e.g. the previous
  cyan 已查看), while only 「清除状态标记」 performs the early-timeout backdoor
  and writes the settled plain style. Regression test distinguishes both.

## [1.2.5] — 2026-11-13

- HEX colour cells are now editable: a local draft keeps partial input, and the
  value commits on blur or Enter (invalid input reverts). Previously the
  controlled field was reset before six valid digits could be typed.
- 「已完成 · 已查看」 final colour set to `#00c8c8` (RGB 0,200,200), the
  user-confirmed cyan; default value, CSS token, overview bucket, docs and
  regression assertion updated together.
- Fixed: a settled (plain, no-highlight) Session marked 「已完成 · 未查看」 and
  then opened fell back to plain instead of 已查看. Viewing now clears the
  settled memory and records seen, with a regression test.

## [1.2.4] — 2026-11-13

- 「已完成 · 已查看」 final cyan set to `#23c5c5` (RGB 35,197,197), the exact
  midpoint between preview steps 4 (`#21baba`) and 5 (`#25d0d0`); G=B keeps the
  hue balanced blue/green. Default colour, CSS token, overview bucket, docs and
  default-colour regression test updated together.

## [1.2.3] — 2026-11-13

- 「已完成 · 已查看」 brightened two cyan scale steps: `#06b6d4` → `#22d3ee`
  → `#67e8f9` (cyan-300). The 状态配色 default value, CSS token, overview
  bucket, docs, and the default-colour regression test all move together.

## [1.2.2] — 2026-11-13

- 「已完成 · 已查看」 brightened one more step from `#0aa4c4` to cyan-500
  `#06b6d4`; the 状态配色 default value, CSS token, overview bucket, docs and
  the default-colour regression test all move together.

## [1.2.1] — 2026-11-13

- Fixed the mass loss of manual marks after a DSH restart: the override loader
  still whitelisted only `running`/`interrupted`, so `archived`/`review`/
  `waiting`/`unread`/`seen` marks looked applied in memory but were silently
  dropped on reload (a restart from the abnormal shutdown surfaced it). All
  seven phases now survive normalization; regression test added.
- 「已完成 · 已查看」 brightened from `#0891b2` to `#0aa4c4`.

## [1.2.0] — 2026-11-12

- Highlight-exit funnel finalised (user decision): AUTOMATIC final states
  (unread/seen/interrupted sticky, scene running/unread, idle seen backfill)
  no longer expire by last-activity time. The ONLY way a Session leaves the
  highlight system is the 「已完结」 funnel — mark it, then either let it
  expire `stickyHours` after the MARK moment or press 「清除状态标记」; both
  fall back to the plain style (settled memory). Automatic states still yield
  to contradictions (new activity, running, pending, unread, viewing).
- 「最终颜色保留时长」 config renamed to 「已完结保留时长」: it now measures
  from the mark moment. Tests updated to the funnel model.

## [1.1.2] — 2026-11-12

- Fixed the 清除标记状态 bounce-back: clearing (or timing out) an 「已完结」
  mark now writes a `settled` sticky, so the Session falls to the PLAIN style
  and STAYS plain instead of bouncing back to the emerald 已查看. A completion
  newer than the settled moment breaks the plain state (unread again) —
  matching the unified funnel: the only ways out of highlighting are marking
  已完结 and letting it time out, or pressing 清除状态标记.
- Renamed the menu item to 「清除状态标记」.
- 「待处理」 recolored back to `#eab308`; 「已完成 · 已查看」 deepened to
  `#0891b2` (swatch round A); English README colour table corrected.

## [1.1.1] — 2026-11-12

- Manual-mark expiry semantics finalised (方案③ + backdoor):
  - 「已完结」 expires `stickyHours` after it was MARKED (independent of
    activity), falling back to the automatic judgment;
  - the other six manual marks never time-expire;
  - AUTOMATIC final states (unread/seen/interrupted sticky) keep expiring
    `stickyHours` after last activity;
  - new right-click item 「清除标记状态」 = the early-timeout-clear backdoor,
    enabled only while the Session is marked 「已完结」 (greyed otherwise).
- 配色 config UI rebuilt as an aligned grid (选择器/状态/HEX/R/G/B columns)
  with a dedicated 「还原默认配色」 button; native colour popup kept.

## [1.1.0] — 2026-11-12

- New 「状态配色」 section on the plugin page: all seven state colours are
  configurable with a native colour picker, a HEX text field, and decimal
  R/G/B fields; defaults are the settled palette. Custom colours apply to the
  sidebar rows, workspace headers, and the overview (chips, group dots, row
  colours) through the shared `--bw-*` CSS variables.
- Fixed a v1.0.11 regression that made 「标记状态为」 silently useless on
  Sessions idle longer than `stickyHours`: the retention expiry had been
  applied to manual overrides too, instantly wiping any mark on an old
  Session. Manual pins are explicit human decisions — they are NOT
  time-expired; they only yield to contradictions (new activity, running,
  pending, unread, viewing for unread) or 「清除状态修正」. The automatic
  final states (unread/seen/interrupted) keep the `stickyHours` expiry.

## [1.0.11] — 2026-11-12

- 「待处理」 reverted to the original yellow `#eab308` (lemon `#facc15` was too
  light); 「待审核」 keeps the orange `#f97316`.
- 「已完成 · 已查看」 recolored to a deeper cyan `#0891b2` (user picked A from
  the swatch sheet); English README colour table fixed (it still showed
  `#10b981` from an earlier miss).
- 「已完结」 manual pins now expire after `stickyHours` like every other final
  state, falling back to the plain Session style; regression test added.

## [1.0.10] — 2026-11-12

- 「待审核」 recolored from amber `#f59e0b` to orange `#f97316` and 「待处理」
  from yellow `#eab308` to lemon `#facc15` (scheme A), pulling the two
  need-action states apart in hue and lightness while keeping the warm
  attention family. Sidebar CSS vars, overview buckets, and docs updated
  together.

## [1.0.9] — 2026-11-12

- 「已完成 · 已查看」 recolored to cyan-500 `#06b6d4` (user picked the
  recommended shade after trying `#00c8c8`), keeping the completion family on
  the same 500-weight palette as the other six states.

## [1.0.8] — 2026-11-12

- 「已完成 · 已查看」 recolored to cyan `#00c8c8` (user-selected from the
  #00ffff family) to stand apart from the bright-green unread state.
- Added an invalidation-matrix regression test: every manual phase (all seven)
  must yield to new activity, running, pending interactions, and unread —
  locking the 举一反三 audit into the suite.

## [1.0.7] — 2026-11-12

- Opening a Session now clears a manual 「已完成 · 未查看」 pin: viewing directly
  contradicts unread, so the row flips to the automatic 已查看 instead of the
  mark persisting forever. Other manual marks (执行中/已中断/已完结/…) still hold
  until new activity, running, pending, unread, or 清除状态修正.

## [1.0.6] — 2026-11-12

- Manual corrections became a unified ops feature: right-click any live
  Session → 「标记状态为」 submenu covering all seven states (待审核 / 待处理 /
  执行中 / 已中断 / 已完成·未查看 / 已完成·已查看 / 已完结), plus an always-visible
  「清除状态修正」 (disabled when no correction exists) that restores the plugin's
  own automatic judgment. Every menu entry carries a matching inline icon via
  the `contextMenu.icon` keyed slot.
- 「已完成 · 已查看」 toned down from emerald `#10b981` to a darker blue-green
  `#0d9488` to stay clearly distinct from the bright-green unread state.
- Fixed the trailing state word rendering the literal `undefined` for the
  archived state (`PHASE_LABELS` lacked the entry); a guard test now asserts
  every bucket has a label and every menu icon key exists.

## [1.0.5] — 2026-11-12

- Fixed the grey→green flip-back: the seen sticky is now recorded at the Host
  completion time (`max(updatedAt, lastTurnEndAt)`), so moving the selection to
  another Session no longer makes a just-viewed Session flip back to green
  unread when the client snapshot's updatedAt lags the Host turn-end.
- New state model for completions:
  - 「已完成 · 未查看」 stays bright green `#22c55e`;
  - 「已完成 · 已查看」 is now a near-green emerald `#10b981` instead of grey,
    keeping the completion family visually together;
  - new manual-only state 「已完结」 (grey `#94a3b8`, same muted look as the
    old grey seen): right-click a Session → 「标记会话为已完结」. New activity,
    running, pending, or unread auto-clears it like other manual corrections.
- Overview buckets, priority order, and workspace-header aggregation include
  「已完结」 at the lowest priority.

## [1.0.4] — 2026-11-11

- Fixed a false grey “已完成 · 已查看” on a freshly completed Session: seen
  evidence (a sticky `seen` or a scene `seenAt`) recorded for a PREVIOUS turn
  no longer swallows a NEW completion. The resolver now compares read evidence
  against the Host `lastTurnEndAt`; a completion newer than every read record
  shows green “已完成 · 未查看” until the row is selected or re-read.
- One-time sticky rebuild (`seenEpoch`): `seen` records written before this fix
  are dropped on first load, so Sessions already mislabelled grey turn green;
  genuinely viewed Sessions recover grey via the idle backfill or the next
  selection.

## [1.0.3] — 2026-11-10

- Renamed the package to `dsh-fans-session-monitor`; the display name is now
  **fans会话状态监测总览**. The client bundle registration id and the
  config-page key follow the new name, while the `localStorage` keys, slot ids
  and DOM attributes are unchanged — saved settings, sticky colours and manual
  overrides carry over.
- Installed from a packed tarball (`file:`) instead of a link to the source
  directory.

---

## [1.0.2] — 2026-11-08

- Fixed the stale `session.running` false positive: an idle Session that still
  had its list-level `running` flag set no longer showed blue “执行中”.
  Running now requires Host Agent `running`, explicit live
  `sessionStatus.running` with an available Agent, or the selected row's own
  `data-state="ongoing"`.
- Host `turnStateOf` now distinguishes settled turns from failures:
  `interrupted`, `aborted` (including a user stop), `blocked`, `error`, and
  `max-tokens` are interrupted; `completed` and `forked` are settled
  completions.
- A completed turn wins over a stale shutdown-scene `running`, so it shows
  green unread instead of red; selecting it promotes it to grey seen.
- Unread sticky state is no longer silently promoted to seen on the next paint;
  only selecting the row or a recorded `seenAt` does that.
- Host interrupted evidence now wins even when the live status also reports
  completion-unread.
- A selected row's stale scene `running` no longer paints the open conversation
  red.

## [1.0.1] — 2026-11-08

- Fixed a false “已中断” on a Session that was actually running: the client now
  prefers `session.running` (and Host runtime `running`) before the shutdown
  scene, and a scene `running` entry no longer paints red without positive
  current-turn evidence.
- Restored the `stickyHours` expiry for idle final states: old “已完成 ·
  已查看” rows lose the grey frame/bold title and are excluded from the
  six-state bucket/count after the retention window.
- Added regression tests for old idle/unread Sessions and the running-vs-scene
  precedence.

## [1.0.0] — 2026-11-07

- Merged `dsh-plugin-busy-workspace` (sidebar ordering/highlight/selection) and
  `dsh-session-overview` (six-bucket overview) into one plugin:
  **fans工作区会话状态监测** / `dsh-plugin-session-monitor`.
- One shared status resolver, sticky final-state store, and manual-correction
  store for both the sidebar and overview.
- Removed the elapsed-time “interrupted” heuristic. A running Session remains
  running regardless of how long it has been quiet.
- Added a token-gated Host runtime route for boot time and last-turn metadata;
  an open turn across a Host restart can be classified as interrupted from
  positive evidence.
- Added a neutral “长时间无输出” hint that never changes the running state.
- Added manual correction actions (`标记为已中断`, `恢复为执行中`,
  `清除状态修正`) backed by one shared override store.
- Migrated A/C settings, sticky state, and scene into the new keys.
- Restored the final-state expiry for idle “seen” Sessions: after
  `stickyHours`, old Sessions no longer receive a grey frame, bold title, or
  six-state bucket; only Sessions inside the retention window are highlighted.
- Configuration page merged; only `保存配置` and `恢复默认` actions.
- The recycle-bin plugin `dsh-plugin-session-recycle` remains independent and
  unchanged.
