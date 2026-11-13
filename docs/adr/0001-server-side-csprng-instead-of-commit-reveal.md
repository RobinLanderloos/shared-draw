---
status: accepted
---

# The server picks the result with a CSPRNG, not commit-reveal

A draw's result is chosen once by the server using a cryptographically secure RNG, uniformly over the options, and stored immutably. We considered a commit-reveal protocol between the participants, which would remove the need to trust the host, but it needs an extra round trip and a rule for participants who refuse to reveal (e.g. forfeit on timeout). The app targets friends deciding low-stakes things, where re-flipping is the real threat, not a rigged server.

## Consequences

- Participants must trust whoever hosts the server. The host could in principle edit the code or database to rig a result.
- Commit-reveal can be added later without changing the link and accept flow.
