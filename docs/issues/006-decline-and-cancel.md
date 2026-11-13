# Decline and cancel

## Parent

PRD: docs/prd/shared-draw.md (user stories 14, 15, 21, 22, 23)

## State

Open

## What to build

A participant can decline, which ends the draw for everyone. The creator can cancel while the draw is pending. Both end states are shown clearly to every participant.

## Acceptance criteria

- [ ] Declining a pending draw moves it to declined for everyone
- [ ] Only the creator can cancel, and only while pending
- [ ] Accepting after decline, cancel or expiry is rejected with the current state
- [ ] Declining or cancelling after the draw is rejected and the result is unchanged
- [ ] Each participant's page explains whether the draw was declined or cancelled
- [ ] A race between cancel and the last accept is resolved with the first request winning

## Blocked by

- docs/issues/004-accept-and-trigger-the-draw-when-everyone-has-accepted.md
