# Reveal animation on each participant's first view

## Parent

PRD: docs/prd/shared-draw.md (user stories 27, 28, 29)

## State

Open

## What to build

The first time a participant loads the drawn result, they get an animated reveal and the server records revealed_at for them. Later views show the result statically. Works even if the participant opens the link days after the draw.

## Acceptance criteria

- [ ] The first fetch of a drawn result for a participant returns reveal true and records revealed_at
- [ ] Every later fetch for that participant returns reveal false
- [ ] Reveal state is tracked independently per participant
- [ ] The page plays the animation only when reveal is true and lands on the stored result
- [ ] Opening the link on a second device after the first reveal shows the result statically

## Blocked by

- docs/issues/004-accept-and-trigger-the-draw-when-everyone-has-accepted.md
