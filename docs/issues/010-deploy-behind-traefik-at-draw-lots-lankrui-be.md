# Deploy behind Traefik at draw-lots.lankrui.be

## Parent

PRD: docs/prd/shared-draw.md (user stories 41)

## State

Completed

## What to build

Build and run the container on the stackwise server over SSH, add the Traefik routing for draw-lots.lankrui.be without the Authentik middleware, and verify the complete flow on the live URL.

## Acceptance criteria

- [ ] The container runs with a persistent volume for the SQLite file
- [ ] Traefik routes draw-lots.lankrui.be to it over HTTPS with no Authentik middleware
- [ ] A full flow (create, accept as all participants, drawn, reveal once) works on the live URL
- [ ] Existing Traefik routes and the Authentik setup are unchanged and still work
- [ ] A backup of any edited Traefik file exists before changes

## Blocked by

- docs/issues/005-reveal-animation-on-each-participants-first-view.md
- docs/issues/006-decline-and-cancel.md
- docs/issues/007-expiry-and-retention-sweeper.md
- docs/issues/009-request-size-limits-and-rate-limiting.md
