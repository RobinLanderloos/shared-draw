export type DrawState = "pending" | "drawn" | "declined" | "cancelled" | "expired";

export interface Participant {
  name: string;
  key: string;
  isCreator: boolean;
  acceptedAt?: Date;
  revealedAt?: Date;
}

export interface Draw {
  id: string;
  title: string;
  state: DrawState;
  options: string[];
  participants: Participant[];
  createdAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  drawnAt?: Date;
  pickedIndex?: number;
}

export interface NewDraw {
  title: string;
  creatorName: string;
  participantNames: string[];
  options: string[];
}

export interface CreateDeps {
  now: () => Date;
  newId: () => string;
  newKey: () => string;
}

export type CreateError =
  | "too_few_options"
  | "too_many_options"
  | "duplicate_option"
  | "empty_option"
  | "option_too_long"
  | "empty_title"
  | "empty_name"
  | "duplicate_name"
  | "no_participants";

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const MAX_LABEL_LENGTH = 100;
export const PENDING_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const norm = (s: string) => s.trim().toLowerCase();

export function createDraw(
  input: NewDraw,
  deps: CreateDeps,
): { ok: true; draw: Draw } | { ok: false; error: CreateError } {
  const fail = (error: CreateError) => ({ ok: false as const, error });
  const title = input.title.trim();
  const options = input.options.map((o) => o.trim());
  const names = [input.creatorName, ...input.participantNames].map((n) => n.trim());

  if (!title) return fail("empty_title");
  if (options.length < MIN_OPTIONS) return fail("too_few_options");
  if (options.length > MAX_OPTIONS) return fail("too_many_options");
  if (options.some((o) => o === "")) return fail("empty_option");
  if (options.some((o) => o.length > MAX_LABEL_LENGTH)) return fail("option_too_long");
  if (new Set(options.map(norm)).size !== options.length) return fail("duplicate_option");
  if (names.some((n) => n === "")) return fail("empty_name");
  if (new Set(names.map(norm)).size !== names.length) return fail("duplicate_name");
  if (input.participantNames.length === 0) return fail("no_participants");

  const now = deps.now();
  return {
    ok: true,
    draw: {
      id: deps.newId(),
      title,
      state: "pending",
      options,
      participants: names.map((name, i) => ({
        name,
        key: deps.newKey(),
        isCreator: i === 0,
        acceptedAt: i === 0 ? now : undefined,
      })),
      createdAt: now,
      expiresAt: new Date(now.getTime() + PENDING_LIFETIME_MS),
    },
  };
}

export type TransitionError = "unknown_participant" | "not_pending" | "not_creator";
export type TransitionResult = { ok: true; draw: Draw } | { ok: false; error: TransitionError };

const reject = (error: TransitionError) => ({ ok: false as const, error });

/** Picks an index in [0, optionCount). Injected so the domain stays deterministic. */
export type Picker = (optionCount: number) => number;

export function accept(draw: Draw, key: string, pick: Picker, now: Date): TransitionResult {
  const me = draw.participants.find((p) => p.key === key);
  if (!me) return reject("unknown_participant");
  if (me.acceptedAt && (draw.state === "pending" || draw.state === "drawn")) {
    return { ok: true, draw };
  }
  if (draw.state !== "pending") return reject("not_pending");

  const participants = draw.participants.map((p) => (p.key === key ? { ...p, acceptedAt: now } : p));
  if (participants.every((p) => p.acceptedAt)) {
    const pickedIndex = pick(draw.options.length);
    return { ok: true, draw: { ...draw, participants, state: "drawn", pickedIndex, drawnAt: now, endedAt: now } };
  }
  return { ok: true, draw: { ...draw, participants } };
}

export function decline(draw: Draw, key: string, now: Date): TransitionResult {
  if (!draw.participants.some((p) => p.key === key)) return reject("unknown_participant");
  if (draw.state !== "pending") return reject("not_pending");
  return { ok: true, draw: { ...draw, state: "declined", endedAt: now } };
}

export function cancel(draw: Draw, key: string, now: Date): TransitionResult {
  const me = draw.participants.find((p) => p.key === key);
  if (!me) return reject("unknown_participant");
  if (!me.isCreator) return reject("not_creator");
  if (draw.state !== "pending") return reject("not_pending");
  return { ok: true, draw: { ...draw, state: "cancelled", endedAt: now } };
}

export function expire(draw: Draw, now: Date): Draw {
  if (draw.state === "pending" && now >= draw.expiresAt) {
    return { ...draw, state: "expired", endedAt: draw.expiresAt };
  }
  return draw;
}

export function reveal(draw: Draw, key: string, now: Date): { draw: Draw; reveal: boolean } {
  const me = draw.participants.find((p) => p.key === key);
  if (draw.state !== "drawn" || !me || me.revealedAt) return { draw, reveal: false };
  return {
    draw: { ...draw, participants: draw.participants.map((p) => (p.key === key ? { ...p, revealedAt: now } : p)) },
    reveal: true,
  };
}
