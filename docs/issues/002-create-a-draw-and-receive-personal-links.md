# Create a draw and receive personal links

## Parent

PRD: docs/prd/shared-draw.md (user stories 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 39, 40)

## State

Completed

## What to build

A creator fills in a title, their own name, 2 to 10 options and the other participants' names, and receives one personal link per participant including their own. Covers domain validation, persistence, the create endpoint and the Dutch create page.

## Acceptance criteria

- [ ] Creating a draw with valid input returns a draw id and one link per participant, each with a distinct unguessable key
- [ ] Fewer than 2 or more than 10 options is rejected
- [ ] Duplicate options (ignoring case and surrounding whitespace) and empty options are rejected
- [ ] Option labels over 100 characters are rejected
- [ ] Duplicate or empty participant names are rejected
- [ ] The creator is stored as accepted at creation, all others as not accepted
- [ ] The create page shows the links with copy buttons and stores the creator's link in a cookie
- [ ] All user-facing text comes from one Dutch strings file

## Blocked by

- docs/issues/001-project-scaffold-with-health-endpoint-and-docker-image.md
