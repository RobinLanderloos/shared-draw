---
status: accepted
---

# The reveal animation plays on each participant's first view, tracked on the server

Participants rarely have the page open at the same time, so the reveal is not a live broadcast. The server records a `revealed_at` timestamp per participant when they first load the drawn result, and only that first view plays the animation. Later views show the result statically. We rejected a synchronized live reveal (it assumes everyone is online at once) and a client-side "seen" flag (lost when storage is cleared, and it would replay on every new device).

## Consequences

- The animation is cosmetic: the result is already stored when the draw happens.
- Live updates over server-sent events are optional and only keep an open page current.
