---
status: accepted
---

# Participants are identified by personal secret links, with no accounts

Each participant of a draw (the creator included) gets their own unguessable link, `/d/<id>?key=<participantKey>`, and the link is their identity. Cookies are only a convenience, so opening the link on another device gives the same identity. We rejected accounts (too much friction for a quick decision) and cookie-only identity (lost on a new device, and it lets a creator on a new device act as a stranger).

## Consequences

- Anyone holding a link can act as that participant, so forwarding a link hands over the identity.
- The creator generates and distributes every link, so they can open one and accept for someone else. A participant's accept is a social consent step, not a cryptographic one. This does not affect fairness of the outcome, since the server still picks randomly (see ADR-0001).
