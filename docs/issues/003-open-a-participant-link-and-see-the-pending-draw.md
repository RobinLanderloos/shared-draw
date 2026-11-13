# Open a participant link and see the pending draw

## Parent

PRD: docs/prd/shared-draw.md (user stories 16, 17, 18, 13, 37, 38, 32)

## State

Completed

## What to build

A participant opens their personal link on any device and sees the title, all options with their odds, all participant names and who has accepted. Wrong or unknown links show the same neutral not-found page.

## Acceptance criteria

- [ ] A valid link returns the draw as seen by that participant, including their own identity
- [ ] Odds are shown per option as 1 in N
- [ ] The response never contains any participant's key
- [ ] An unknown draw id and a wrong key give an identical not-found response
- [ ] The page shows who has accepted and when the pending draw expires
- [ ] The same link works from a different device with no cookie

## Blocked by

- docs/issues/002-create-a-draw-and-receive-personal-links.md
