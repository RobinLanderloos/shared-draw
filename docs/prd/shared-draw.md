# Shared Draw

## Problem Statement

When friends who are not in the same place want to decide something with a coin flip, nobody can verify that the flip was fair. Whoever flips can redo it until they get the result they want, and the others have to take their word for it. A coin flip is also limited to two options, while real decisions often have three or more (where to eat, who goes first, which game to play).

## Solution

A small web app where one person (the **creator**) writes down 2 to 10 **options** and names the **participants**. The app generates a personal link for each participant. Each participant opens their link, sees the options, their odds and who else takes part, and either accepts or declines. Once **every** participant has accepted, the server performs a single **draw**: it picks one option uniformly at random and stores the result permanently. Nobody can redo or change it. Each participant sees an animated reveal the first time they open the page after the draw, even if that is days later. The interface is in Dutch.

## User Stories

1. As a creator, I want to enter a short title for what we are deciding, so that participants know what the draw is about.
2. As a creator, I want to enter between 2 and 10 options, so that the draw can choose between more than two things.
3. As a creator, I want duplicate options to be rejected (ignoring case and surrounding whitespace), so that I cannot accidentally or deliberately skew the odds.
4. As a creator, I want empty options to be rejected, so that the draw never lands on a blank result.
5. As a creator, I want an option label to be limited to 100 characters, so that the page stays readable.
6. As a creator, I want to enter my own name, so that other participants know who started the draw.
7. As a creator, I want to add any number of other participants, each with a required name, so that I can decide things with a whole group.
8. As a creator, I want participant names to be unique within a draw, so that links and results are not ambiguous.
9. As a creator, I want a personal link for myself and one for each participant, so that everyone has their own identity without creating an account.
10. As a creator, I want a copy button next to each link, so that I can send them quickly in a chat.
11. As a creator, I want to be counted as having accepted from the start, so that I do not have to confirm my own draw.
12. As a creator, I want my own link to be shown right after creating the draw and kept in a cookie, so that I can find my way back.
13. As a creator, I want to see who has accepted and who has not, so that I can nudge people who have not answered.
14. As a creator, I want to cancel a draw while it is still pending, so that I can start over with different options or people.
15. As a creator, I want a cancelled draw to stop working for everyone, so that nobody can accept it afterwards.
16. As a participant, I want to open my link on any device and be recognized, so that I am not tied to one browser.
17. As a participant, I want to see the title, the full list of options and each option's odds (for example "1 op 4") before accepting, so that I know exactly what I agree to.
18. As a participant, I want to see the names of all participants and who has accepted, so that I know who takes part.
19. As a participant, I want to accept with a single tap, so that the flow stays as simple as sharing a link.
20. As a participant, I want accepting to be safe to repeat, so that a double tap or reload does not cause an error.
21. As a participant, I want to decline, so that I can reject options I do not agree with.
22. As a participant, I want a decline to end the draw for everyone, so that no result is produced without everybody's consent.
23. As a participant, I want to be told if the draw was already declined, cancelled or expired when I open my link, so that I understand why nothing happens.
24. As a participant, I want the draw to happen automatically when the last participant accepts, so that nobody has to trigger it.
25. As a participant, I want the result to be picked by the server and stored, so that no participant can redo it until they get what they want.
26. As a participant, I want every option to have exactly the same chance, so that the draw is fair.
27. As a participant, I want to see an animated reveal the first time I open the page after the draw, so that the moment feels like an event.
28. As a participant, I want the animation to play on my first view even if I open the link days after the draw, so that being offline at the time does not cost me the reveal.
29. As a participant, I want later visits to show the result statically, so that reloading does not replay the animation or change anything.
30. As a participant, I want to see the result together with the title, the options, all names and the time of the draw, so that I can show it to others as proof.
31. As a participant, I want the page to update by itself when someone else accepts or the draw happens, so that I do not have to reload while I wait.
32. As a participant, I want to see a countdown or date for when a pending draw expires, so that I know how long I have to respond.
33. As a participant, I want a pending draw to expire after 7 days, so that stale draws do not stay open forever.
34. As a participant, I want an expired draw to say so clearly, so that I know to ask for a new one.
35. As a participant, I want the result to remain viewable for 30 days after the draw, so that I can check it later.
36. As a participant, I want old results to be deleted after 30 days, so that my data is not kept forever.
37. As a participant, I want an unknown or wrong link to show a neutral "not found" page, so that nothing leaks about which draws exist.
38. As a participant, I want my link key to be unguessable, so that other people cannot act as me.
39. As a participant, I want the interface to be in Dutch, so that it is natural for my group.
40. As a participant, I want the page to work well on a phone, so that I can respond from wherever I am.
41. As a host, I want the app to run as one small Docker container with a single SQLite file, so that it is easy to deploy and back up.
42. As a host, I want a health endpoint, so that I can check the app is running.
43. As a host, I want request size limits and basic rate limiting, so that the public endpoint cannot be abused easily.
44. As a host, I want expired and old draws to be cleaned up automatically, so that the database stays small.
45. As a participant, I want two simultaneous actions (for example a cancel and the last accept) to be resolved cleanly with the first one winning, so that the result is never ambiguous.

## Implementation Decisions

Glossary (use these terms consistently): **draw**, **option**, **participant**, **creator** (the participant who wrote the options), **participant link** (a participant's identity), **accept**, **decline**, **cancel**, **reveal**.

Decisions already recorded as ADRs (not repeated in full here):

- ADR-0001: the server picks the result with a CSPRNG (`crypto.randomInt`), uniformly over the options. No commit-reveal.
- ADR-0002: no accounts; each participant, creator included, is identified by an unguessable key in their personal link. The creator holds every link, so accept is social consent.
- ADR-0003: unanimous acceptance, any decline ends the draw, the `drawn` state is immutable, no redraw.
- ADR-0004: the reveal animation is tracked per participant on the server (`revealed_at`) and plays only on that participant's first view of the result.

Modules to build:

- **Draw domain (deep module, pure).** Encapsulates the state machine and all rules: validating a new draw (option count 2 to 10, trimmed and case-insensitive duplicate rejection, non-empty labels of at most 100 characters, unique non-empty participant names), and the transitions `accept`, `decline`, `cancel`, `expire`, and `markRevealed`. It takes the current draw plus an acting participant and returns the new draw or a typed rejection. The random pick is injected as a function so the domain stays deterministic under test. States are `pending`, `drawn`, `declined`, `cancelled`, `expired`. The only path to `drawn` is the last participant accepting. Nothing leaves `drawn`.
- **Picker.** A tiny module wrapping `crypto.randomInt` to pick an index uniformly. Injected into the domain.
- **Repository (SQLite via better-sqlite3).** Persists draws, options and participants. Transitions are applied inside a transaction that re-checks the current state, so the first of two racing requests wins and the other gets a "no longer pending" rejection. Also provides lookups by draw id plus participant key, and the sweep operations for expiry and retention. Keys are stored hashed or compared in constant time; lookups of an unknown draw and of a wrong key return the same "not found".
- **HTTP API (Hono).** JSON endpoints: create a draw, fetch a draw as seen by a participant (identified by the key), accept, decline, cancel (creator only), plus a health endpoint. Fetching a drawn result for a participant whose `revealed_at` is empty returns a `reveal: true` flag and sets `revealed_at` in the same operation, so the animation plays exactly once per participant. Responses never include other participants' keys.
- **Live updates.** A server-sent events stream per draw, authenticated by the participant key, that pushes a "changed" event so open pages refetch. Optional polish: the app must work correctly without it.
- **Sweeper.** A periodic job that expires pending draws older than 7 days and deletes drawn results 30 days after the draw. Also deletes declined and cancelled draws after 30 days.
- **Frontend.** Plain HTML and JS served by the same process. A create page, and one draw page whose view depends on state and on whether the participant has accepted. Contains the reveal animation, copy-link buttons and the odds display. All user-facing text lives in a single Dutch strings file.
- **Deployment.** One Docker image, SQLite file on a mounted volume, served behind Traefik at `draw-lots.lankrui.be` without the Authentik middleware.

Schema outline: a `draws` table (id, title, state, created_at, expires_at, drawn_at, picked option reference), an `options` table (draw, position, label), and a `participants` table (draw, name, key, is_creator, accepted_at, revealed_at). Ids and keys are long random URL-safe strings generated with a CSPRNG.

API behavior notes:

- Create returns the draw id and one link per participant (the creator's included). This is the only time the keys are returned in bulk.
- Accept and decline are idempotent for the acting participant. A decline after the draw, or an accept after cancel, expiry or decline, is rejected with the current state.
- Option odds are derived (1 / option count) and shown in the UI, not stored.

## Testing Decisions

A good test exercises external behavior through the module's public interface and does not depend on how it is implemented internally. Tests assert on the result a caller sees (returned state or rejection, HTTP status and body), never on private helpers or table layout.

Modules with tests:

- **Draw domain:** the main target, tested exhaustively with a fake picker. Covers validation rules, every state transition, the unanimous rule, decline and cancel behavior, idempotent accept, immutability of `drawn`, the picked option coming from the injected picker, and reveal marking.
- **Picker:** a statistical sanity test that a large number of picks over N options lands on every option and stays within a loose tolerance, plus a test that results are always valid indexes.
- **Repository:** against a real in-memory SQLite database, covering persistence round trips, the racing-transition guarantee (first wins), wrong key versus unknown draw returning the same result, and the sweeper's expiry and retention behavior using an injected clock.
- **HTTP API:** integration tests driving the Hono app in-process with an in-memory database, covering the full flow (create, accept all, drawn, reveal once, static afterwards), decline, cancel, authorization (creator-only cancel, wrong key), and that keys of other participants never appear in responses.

Not tested directly: the frontend rendering and animation (verified manually on the deployed app), the SSE stream beyond a basic "event arrives after a change" check, and the Docker and Traefik configuration (verified by the deployment check).

Prior art: the repository is new, so there is none. Tests follow the TDD workflow with a vertical slice per behavior.

## Out of Scope

- Commit-reveal or any other way of removing trust in the host (see ADR-0001).
- User accounts, logins or passwords.
- Letting participants add or change options, or veto single options.
- Quorum, majority or creator-triggered draws, and redraws.
- Weighted options or non-uniform odds.
- A history or dashboard of past draws per person.
- Notifications (email, push). Links are shared by the creator in their own chat app.
- Languages other than Dutch, though strings stay in one file so this is easy later.
- A cap on the number of participants (only a request-size limit applies).

## Further Notes

- Result retention is 30 days after the draw; pending draws live for 7 days.
- Because the creator knows every link, the app should state plainly in its footer or help text that sharing a link gives that person the participant's identity.
- The planned module list was decided without a check-in because the user asked for the whole chain (PRD, issues, TDD, deploy) to run without intervention. The test targets above are the four modules listed, chosen because they hold all the behavior that matters.
