# Shared Draw (Samen loten)

Decide something together without anyone being able to re-flip. A creator enters 2–10 options and
names the participants; everyone gets a personal link. When **everyone** accepts, the server picks
one option once (CSPRNG) and the result is permanent. Each participant sees an animated reveal on
their first view. UI is in Dutch.

- Design decisions: `docs/adr/`, requirements: `docs/prd/shared-draw.md`, work items: `docs/issues/`.
- Stack: Node + TypeScript, Hono, SQLite (better-sqlite3), plain HTML/JS.

```
npm install
npm test          # vitest
npm start         # http://localhost:3000, DB at ./data/draw.db (override with DB_PATH, PORT)
```

Docker: `docker build -t shared-draw .`, mount a volume on `/data`.
