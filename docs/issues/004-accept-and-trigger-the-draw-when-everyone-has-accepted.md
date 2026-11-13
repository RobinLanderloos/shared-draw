# Accept and trigger the draw when everyone has accepted

## Parent

PRD: docs/prd/shared-draw.md (user stories 19, 20, 24, 25, 26, 30, 45)

## State

Open

## What to build

A participant accepts with one tap. When the last participant accepts, the server picks one option uniformly with a CSPRNG and stores the result permanently. The drawn state never changes afterwards.

## Acceptance criteria

- [ ] Accepting marks only the acting participant as accepted
- [ ] Accepting twice is harmless and returns the current state
- [ ] The draw happens exactly when the last participant accepts, not before
- [ ] The picked option comes from the injected picker in tests and from crypto.randomInt in production
- [ ] A statistical test shows every option is reachable and picks are always valid indexes
- [ ] A drawn draw shows the result, title, options, names and drawn time
- [ ] No transition can leave the drawn state
- [ ] Two racing requests are resolved with the first one winning inside a transaction

## Blocked by

- docs/issues/003-open-a-participant-link-and-see-the-pending-draw.md
