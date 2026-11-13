---
status: accepted
---

# The draw happens only when everyone accepts, and a drawn result never changes

A draw moves from `pending` to `drawn` only when every participant has accepted (the creator counts as accepted at creation). Any decline ends it, and pending draws expire after 7 days. Once `drawn`, the result is final: no redraw, and a rematch is a new draw. We rejected a creator-triggered draw or a quorum or majority rule, because whoever decides who is "in" can pick the moment when the people they dislike haven't answered yet, which brings back the manipulation the app exists to prevent.

## Consequences

- One unresponsive participant blocks the draw. The creator can cancel and start a new draw without them.
- If two requests race (for example a cancel and the last accept), the first one processed wins.
