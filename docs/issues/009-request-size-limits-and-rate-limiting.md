# Request size limits and rate limiting

## Parent

PRD: docs/prd/shared-draw.md (user stories 43)

## State

Completed

## What to build

Protect the public endpoints from abuse with a request body size limit and basic per-IP rate limiting, while leaving the number of participants uncapped.

## Acceptance criteria

- [ ] Oversized request bodies are rejected with a clear status
- [ ] Repeated create requests from one IP beyond the limit are rejected with 429
- [ ] Normal use across a group of any size is not blocked
- [ ] The limits are configurable and covered by tests

## Blocked by

- docs/issues/002-create-a-draw-and-receive-personal-links.md
