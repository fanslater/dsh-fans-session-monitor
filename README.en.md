**English** | [简体中文](./README.md)

# fans Session Monitor Overview

Merges the previous two fans plugins into one:

- **fans Workspace Session Order & Highlight** — sidebar ordering, six-state highlighting, selection frame;
- **fans Session Overview** — cross-workspace buckets, counts, filters, click-to-open, shutdown scene.

The sidebar and overview share one status resolver, final-state cache (sticky), manual-correction store (override), configuration page, and scene policy, so the same Session cannot show two different states in the two views.

## Features

### Sidebar

- order workspaces by their newest Session activity;
- seven states: review, waiting, running, interrupted, completed unread, completed seen, archived (concluded);
- 3px state bar, tinted background, inset ring, title mix, trailing state word;
- workspace header uses the strongest state and shows `N × state`;
- current selection: 2px violet edge border with 12% violet fill, state colours preserved;
- green settle pulse when a run stops.

### Overview

- six buckets with counts and filters;
- click a Session to open it;
- shutdown scene for previous review/waiting/running/unread states;
- configurable scene lifetime;
- Sessions older than `stickyHours` are excluded from the six-state buckets.

## Six states

| State | Colour | Trigger |
|---|---|---|
| **Review** | `#f97316` | `pendingInteraction.kind = approval / plan-review`, or a scene entry waiting for approval/plan confirmation |
| **Waiting** | `#eab308` | `pendingInteraction.kind = question`, or a scene entry waiting for your answer |
| **Running** | `#3b82f6` | Host Agent is running; or `sessionStatus.running=true` with a live Agent; or the selected row's DOM `data-state="ongoing"` |
| **Interrupted** | `#ef4444` | Host `turn/end` is `interrupted`, `aborted` (including a user stop), `blocked`, `error`, or `max-tokens`; an open turn across a Host restart; a non-selected scene `running` without Host completed evidence; or a manual mark |
| **Completed · unread** | `#22c55e` | DSH `completionUnread`; Host `completed / forked` without seen evidence; scene unread; sticky unread persists until selected/read |
| **Completed · seen** | `#00c8c8` | the Session was selected (or scene/sticky `seenAt` evidence); within `stickyHours` |
| **Archived (concluded)** | `#94a3b8` | **manual only**: right-click → 「标记会话为已完结」; new activity, running, pending, or unread auto-clears it |

Elapsed time is never used to infer interruption. Long-running work only adds `running · N minutes without output`.

### Priority

```text
review > waiting > running > interrupted > unread > seen > archived
```

### Expiry

- final states (interrupted/unread/seen) lose highlighting after `stickyHours`;
- the sidebar keeps a plain Session row without a state bar/background/state word;
- the overview skips these `bucket = null` Sessions;
- turning off `stickyColors` hides final colours and keeps only live states.

## Configuration

Registered only at `plugins.bundle.config`, never in DSH Settings. The only actions are:

```text
[Save configuration] [Restore defaults]
```

| Option | Default | Meaning |
|---|---:|---|
| Order workspaces by last activity | on | off keeps the official order |
| Highlight Session rows | on | bar, tint, ring, title colour, trailing state word |
| Highlight workspace headers | on | header tint, bar, badge |
| Intensity | `0.6` | `0–1`, controls tint/ring strength |
| Show “completed · seen” | on | hides seen rows in both views when off |
| Show workspace name | on | second line includes workspace name |
| Compact mode | off | lower row height and hide second line |
| Keep final state colours | on | interrupted/unread/seen survive refresh |
| Final colour retention | `24` h | `1–720`, measured from last activity |
| Quiet-run hint | `30` min | `0–1440`; hint only, never changes running, 0 disables |
| Settle pulse | on | one green pulse on running → non-running |
| Restore shutdown scene | on | restores review/waiting/running/unread |
| Scene lifetime | `72` h | `1–720` |

## Shared consistency

- both views call the same `resolveStatus()`;
- both use the same sticky, override, scene, and Host runtime;
- the selected row's DOM `data-state` is the direct renderer fact for the current Session;
- the sidebar shows all Session rows; the overview only shows six-state Sessions and skips `bucket = null`;
- that is a display-set difference, not two states for one Session.

## Data migration

On first load the plugin reads and merges:

- `dsh-plugin-busy-workspace:settings:v2`
- `dsh-plugin-busy-workspace:state:v2`
- `dsh-session-overview.settings`
- `dsh-session-overview.scene.v1`

New keys:

- `dsh-plugin-session-monitor:settings:v1`
- `dsh-plugin-session-monitor:state:v1`
- `dsh-plugin-session-monitor:overrides:v1`

Old keys are kept for one release. Legacy A sticky `interrupted` records produced by the removed timeout heuristic are discarded.

## Relationship with the recycle-bin plugin

The recycle bin remains independent: **fans Session Recycle Bin**
(`dsh-fans-session-recycle`). This plugin contains no recycle-bin code, options, or
Host route. After a permanent delete, B emits `dsh-busy-workspace:purged` and this plugin
clears the matching sticky/override/scene record.

## Manual status correction

Right-click any Session row in the sidebar to open the context menu registered by this
plugin:

| Menu item | Shown when | Effect |
|---|---|---|
| Clear status correction | the Session has a correction record | removes the manual mark, back to automatic resolution |
| Mark as interrupted | current state is not interrupted and the resolution is not authoritative live | moves a stuck Session into interrupted |
| Restore to running | current state is not running | fixes a wrong mark, back to the running bucket |

Corrections are stored in the shared override store
(`dsh-plugin-session-monitor:overrides:v1`) and apply to both the sidebar and the
overview; the corrected row reads `manually marked interrupted` or `manually restored to
running`.

A correction **expires automatically** (no manual clear needed) as soon as any of these
holds — the Session has clearly moved on:

- the Session produced new activity (last activity newer than the correction's basis
  time);
- it entered a live running state;
- a pending approval / question interaction appeared;
- a completion-unread mark appeared.

## Known limits

- Host runtime covers live Sessions only; a non-selected inactive Session can still use
  the scene `running` fallback;
- a Host `completed` Session without `seenAt` evidence is shown as unread to avoid
  calling a just-finished Session seen; an older already-read Session could turn green
  again inside the retention window;
- review/waiting distinction depends on `pendingInteraction.kind`; a selected warning row
  without a kind falls back to review;
- manual correction lives in the sidebar row context menu and supports only
  `mark as interrupted` / `restore to running` / `clear status correction`.

## Verification

```bash
node --check lib/client.js
node --check lib/index.js
node test/run.mjs
```
