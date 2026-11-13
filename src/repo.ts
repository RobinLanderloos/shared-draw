import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import type { Draw, DrawState, Participant } from "./domain";

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const hashKey = (raw: string) => createHash("sha256").update(raw).digest("hex");

const toMs = (d?: Date) => (d ? d.getTime() : null);
const toDate = (ms: number | null) => (ms === null ? undefined : new Date(ms));

export function openRepo(path: string) {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  if (path !== ":memory:") db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS draws (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, state TEXT NOT NULL,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
      ended_at INTEGER, drawn_at INTEGER, picked_index INTEGER
    );
    CREATE TABLE IF NOT EXISTS options (
      draw_id TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
      position INTEGER NOT NULL, label TEXT NOT NULL, PRIMARY KEY (draw_id, position)
    );
    CREATE TABLE IF NOT EXISTS participants (
      draw_id TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
      position INTEGER NOT NULL, name TEXT NOT NULL, key_hash TEXT NOT NULL,
      is_creator INTEGER NOT NULL, accepted_at INTEGER, revealed_at INTEGER,
      PRIMARY KEY (draw_id, position)
    );
    CREATE INDEX IF NOT EXISTS participants_key ON participants(draw_id, key_hash);
  `);

  const load = (id: string): Draw | undefined => {
    const d = db.prepare("SELECT * FROM draws WHERE id = ?").get(id) as any;
    if (!d) return undefined;
    const options = db.prepare("SELECT label FROM options WHERE draw_id = ? ORDER BY position").all(id) as { label: string }[];
    const ps = db.prepare("SELECT * FROM participants WHERE draw_id = ? ORDER BY position").all(id) as any[];
    return {
      id: d.id,
      title: d.title,
      state: d.state as DrawState,
      options: options.map((o) => o.label),
      participants: ps.map(
        (p): Participant => ({
          name: p.name,
          key: p.key_hash,
          isCreator: !!p.is_creator,
          acceptedAt: toDate(p.accepted_at),
          revealedAt: toDate(p.revealed_at),
        }),
      ),
      createdAt: new Date(d.created_at),
      expiresAt: new Date(d.expires_at),
      endedAt: toDate(d.ended_at),
      drawnAt: toDate(d.drawn_at),
      pickedIndex: d.picked_index ?? undefined,
    };
  };

  const save = (draw: Draw) => {
    db.prepare(
      "UPDATE draws SET state=?, ended_at=?, drawn_at=?, picked_index=? WHERE id=?",
    ).run(draw.state, toMs(draw.endedAt), toMs(draw.drawnAt), draw.pickedIndex ?? null, draw.id);
    const upd = db.prepare("UPDATE participants SET accepted_at=?, revealed_at=? WHERE draw_id=? AND position=?");
    draw.participants.forEach((p, i) => upd.run(toMs(p.acceptedAt), toMs(p.revealedAt), draw.id, i));
  };

  const insert = db.transaction((draw: Draw) => {
    db.prepare(
      "INSERT INTO draws (id,title,state,created_at,expires_at,ended_at,drawn_at,picked_index) VALUES (?,?,?,?,?,?,?,?)",
    ).run(draw.id, draw.title, draw.state, draw.createdAt.getTime(), draw.expiresAt.getTime(), toMs(draw.endedAt), toMs(draw.drawnAt), draw.pickedIndex ?? null);
    draw.options.forEach((label, i) => db.prepare("INSERT INTO options VALUES (?,?,?)").run(draw.id, i, label));
    draw.participants.forEach((p, i) =>
      db.prepare("INSERT INTO participants VALUES (?,?,?,?,?,?,?)").run(
        draw.id, i, p.name, hashKey(p.key), p.isCreator ? 1 : 0, toMs(p.acceptedAt), toMs(p.revealedAt),
      ),
    );
  });

  return {
    insert: (draw: Draw): void => insert(draw),

    /** Finds a draw as seen by one participant. Unknown draw and wrong key are indistinguishable. */
    find(drawId: string, rawKey: string): { draw: Draw; me: Participant } | undefined {
      const draw = load(drawId);
      if (!draw) return undefined;
      const h = hashKey(rawKey);
      const me = draw.participants.find((p) => p.key === h);
      return me ? { draw, me } : undefined;
    },

    /** Runs fn on the current draw inside a transaction and persists the draw it returns. */
    mutate<T>(drawId: string, fn: (draw: Draw) => { draw: Draw; value: T }): T | undefined {
      return db.transaction((): T | undefined => {
        const cur = load(drawId);
        if (!cur) return undefined;
        const { draw, value } = fn(cur);
        save(draw);
        return value;
      })();
    },

    /** Expires old pending draws and deletes ended draws past the retention period. */
    sweep(now: Date): void {
      db.transaction(() => {
        db.prepare("UPDATE draws SET state='expired', ended_at=expires_at WHERE state='pending' AND expires_at <= ?").run(now.getTime());
        db.prepare("DELETE FROM draws WHERE ended_at IS NOT NULL AND ended_at + ? <= ?").run(RETENTION_MS, now.getTime());
      })();
    },

    close: () => db.close(),
  };
}

export type Repo = ReturnType<typeof openRepo>;
