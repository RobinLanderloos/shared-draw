# Live page updates via server-sent events

## Parent

PRD: docs/prd/shared-draw.md (user stories 31)

## State

Open

## What to build

An open draw page updates by itself when another participant accepts, declines, or the draw happens, using a per-draw event stream authenticated by the participant key. The app still works fully without it.

## Acceptance criteria

- [ ] A connected client receives a changed event after any state change
- [ ] The stream requires a valid participant key and otherwise behaves like not-found
- [ ] On a changed event the page refetches and re-renders
- [ ] If the stream fails, the page still works through manual reload

## Blocked by

- docs/issues/006-decline-and-cancel.md
