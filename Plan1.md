# Plan1 - Web App + Extension Bridge (ChatHub-like UI)

## Goal
Build a standalone web UI that looks/behaves like ChatHub, while keeping the
existing Chrome extension as the bridge that controls AI sites via content
scripts. Users log in to each AI site in normal tabs, and the web UI aggregates
selected AI chats into a single page.

## Non-Goals
- No pure web-only control of AI pages (blocked by browser security).
- No server-side AI aggregation (this plan keeps local/extension control).

## High-Level Architecture
1) Web App (new): UI, layout, selection, prompts, logs.
2) Extension (existing): content scripts + background service worker.
3) Bridge: web page <-> extension messaging (runtime external connections).

```
Web App (chat-hub UI)
  <--runtime.connect (external)-->
Extension background.js
  <--tabs.sendMessage-->
Content scripts on AI sites
  <--DOM injection/response capture-->
AI web pages (user logged in)
```

## What Reuses Existing Code
- `content/*.js`: DOM injection + response capture logic stays.
- `background.js`: tab discovery, sendMessage, response capture stays.
- Only replace `sidepanel/*` UI with Web App UI.

## Step-by-Step Implementation

### 1) Add a Web App
- Create a new static site folder, e.g. `web/`.
- Implement ChatHub-like layout: left panel (AI list), main grid, message bar.
- Implement all current features from `sidepanel/panel.js`:
  - AI selection, status, send, /mutual, /cross, discussion mode.
  - Logs and response rendering.

### 2) Allow Web App to Talk to Extension
- In `manifest.json`, add `externally_connectable`:
  - allow specific origins (e.g. `http://localhost:5173` for dev, and the
    production domain later).
- In `background.js`, add a port-based handler:
  - `chrome.runtime.onConnectExternal` and `chrome.runtime.onMessageExternal`.
  - Prefer `connectExternal` so the web app gets push updates (status/response).

### 3) Define Message Protocol
- Requests from Web App:
  - `SEND_MESSAGE { aiType, message }`
  - `GET_RESPONSE { aiType }`
  - `GET_STATUS` (connected AI list)
  - `NEW_CONVERSATION { aiTypes }`
  - `DISCUSSION_START { topic, participants }`
- Push from Extension -> Web App:
  - `TAB_STATUS_UPDATE { aiType, connected }`
  - `RESPONSE_CAPTURED { aiType, content }`
  - `SEND_RESULT { aiType, success, error }`
  - `NEW_CONVERSATION_RESULTS { results }`

### 4) Security / Pairing
- Add a simple pairing flow:
  - Web App requests a one-time code from extension.
  - Extension shows code in side panel or via `chrome.action` popup.
  - Web App sends code back; extension stores session token in `chrome.storage`.
- This prevents random pages from controlling the extension.

### 5) UI Behavior Mapping
- The web UI mirrors `sidepanel` features:
  - status badges = current `connectedTabs`
  - checkboxes = target AIs
  - input box = message send
  - log area = success/error timeline
  - discussion mode = same state machine, but UI layout updated

### 6) Deployment Options
- Dev: run `web/` locally (e.g. Vite) and add its URL to
  `externally_connectable`.
- Prod: host `web/` on a domain; update `externally_connectable` to only that
  domain.

## Risks and Limitations
- AI site DOM changes can break content scripts (same as current extension).
- Some AI sites block multi-tab automation or require active tab focus.
- Third-party cookies / login states remain user-managed.

## Testing Plan
- Manual:
  - Verify status detection when AI tabs open/close.
  - Send message to 1 AI, then to multiple AIs.
  - /mutual and /cross flows with 2-3 AIs.
  - Discussion mode 2 AIs, with interject and summary.
- Regression:
  - Ensure content script heartbeat/reload still works.
  - Ensure response capture still triggers web UI updates.

## Task Breakdown and Milestones
### Milestone 1 - Protocol and Bridge
- Define message types and payloads (web <-> extension).
- Add `externally_connectable` to `manifest.json` for dev origin.
- Implement `onConnectExternal` and port message routing in `background.js`.
- Add push notifications for status/response to external ports.

### Milestone 2 - Web UI Skeleton
- Create `web/` folder with basic layout (left rail, grid, input bar).
- Implement AI selection state + status badges.
- Implement log panel and message input.

### Milestone 3 - Feature Parity with Sidepanel
- Implement send flow for multi-targets.
- Port `/mutual` and `/cross` parsing and dispatch.
- Port discussion mode state machine and UI.

### Milestone 4 - Pairing and Security
- Add pairing handshake (code + session token).
- Store token in `chrome.storage`.
- Require token for all external requests.

### Milestone 5 - QA and Docs
- Manual test suite per Testing Plan.
- Update README with web UI usage and pairing steps.

## File Map (New/Changed)
- New: `web/` (UI app)
- Update: `manifest.json` (externally_connectable)
- Update: `background.js` (external port handling)
- Keep: `content/*.js` (no changes expected)
