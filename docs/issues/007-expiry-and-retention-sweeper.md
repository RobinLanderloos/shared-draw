# Expiry and retention sweeper

## Parent

PRD: docs/prd/shared-draw.md (user stories 33, 34, 35, 36, 44)

## State

Open

## What to build

Pending draws expire after 7 days. Drawn results and declined or cancelled draws are deleted 30 days after they ended. A periodic sweeper applies both rules using an injectable clock.

## Acceptance criteria

- [ ] A pending draw older than 7 days becomes expired and cannot be accepted
- [ ] An expired draw page says so clearly
- [ ] A drawn result is still viewable 29 days after the draw and gone after 30
- [ ] Declined, cancelled and expired draws are deleted 30 days after they ended
- [ ] The sweeper runs periodically in the running app and is covered by tests with a fake clock

## Blocked by

- docs/issues/006-decline-and-cancel.md
