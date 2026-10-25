// Ludus Duodecim Scriptorum — rules as presented on the İznik Museum panel.
//
// Board: 3 rows x 12 cells. Row 0 is Player A's near row, row 2 is Player B's.
// Each player travels a 30-cell path:
//   1–6   (1a–6a / 1b–6b): own row, first half  — entry cells
//   7–12               : own row, second half
//   13–24              : middle row, back across
//   25–30              : opponent's row, first half — the home cells
// B's path is A's path rotated 180°, so entry cells are private and the
// home cells of one player are cells 7–12 of the other.

export const N = 15;          // pieces per player
export const OFF = 31;        // borne off
export const OUT_CHANCE = 0.07; // chance a die jumps the rim and falls off the board

export const other = (p) => (p === 'A' ? 'B' : 'A');

export function cellOf(player, pos) {
  let r, c;
  if (pos <= 12) { r = 0; c = pos - 1; }
  else if (pos <= 24) { r = 1; c = 24 - pos; }
  else { r = 2; c = pos - 25; }
  if (player === 'B') { r = 2 - r; c = 11 - c; }
  return { r, c };
}

export function posOf(player, r, c) {
  if (player === 'B') { r = 2 - r; c = 11 - c; }
  if (r === 0) return c + 1;
  if (r === 1) return 24 - c;
  return c <= 5 ? c + 25 : null;
}

export function cellLabel(player, pos) {
  if (pos >= 1 && pos <= 6) return `${pos}${player === 'A' ? 'a' : 'b'}`;
  return String(pos);
}

export function newGame() {
  const mk = () => { const a = new Array(32).fill(0); a[0] = N; return a; };
  return {
    counts: { A: mk(), B: mk() },
    turn: null,
    phase: 'waiting',   // waiting | roll | move | ending | over
    dice: [],
    winner: null,
    seq: 0,
    started: false,
  };
}

export function oppAt(s, me, pos) {
  const { r, c } = cellOf(me, pos);
  const op = other(me);
  const p = posOf(op, r, c);
  return p ? s.counts[op][p] : 0;
}

export function allHome(s, me) {
  let n = 0;
  for (let p = 25; p <= OFF; p++) n += s.counts[me][p];
  return n === N;
}

export function movesForDie(s, me, die) {
  const res = [];
  const cnt = s.counts[me];
  const v = die.v;
  if (die.out) {
    // Rule 3: a die that fell off the board forces a move backwards.
    for (let p = 1; p <= 30; p++) {
      if (!cnt[p]) continue;
      const to = p - v;
      if (to >= 1 && oppAt(s, me, to) < 2) res.push({ from: p, to });
    }
    return res;
  }
  if (cnt[0] > 0) {
    // Rules 1, 5, 6: all waiting pieces must enter on cells 1–6 before advancing.
    if (oppAt(s, me, v) < 2) res.push({ from: 0, to: v });
    return res;
  }
  const home = allHome(s, me);
  let lowest = OFF;
  for (let p = 1; p <= 30; p++) if (cnt[p]) { lowest = p; break; }
  for (let p = 1; p <= 30; p++) {
    if (!cnt[p]) continue;
    const to = p + v;
    if (to <= 30) {
      if (oppAt(s, me, to) < 2) res.push({ from: p, to });
    } else if (home && (to === OFF || p === lowest)) {
      // Rule 7: bearing off once all 15 stand on 25–30.
      res.push({ from: p, to: OFF });
    }
  }
  return res;
}

export function allOptions(s) {
  const me = s.turn;
  const out = [];
  s.dice.forEach((d, i) => {
    if (d.used) return;
    for (const m of movesForDie(s, me, d)) out.push({ ...m, die: i });
  });
  return out;
}

export function anyMoves(s) {
  return s.phase === 'move' && allOptions(s).length > 0;
}

export function rollDice(s, rand = Math.random) {
  s.dice = [0, 1, 2].map(() => ({
    v: 1 + Math.floor(rand() * 6),
    out: rand() < OUT_CHANCE,
    used: false,
  }));
  s.phase = 'move';
  return s.dice;
}

export function applyMove(s, me, dieIdx, from, to) {
  const die = s.dice[dieIdx];
  if (!die || die.used || s.turn !== me || s.phase !== 'move') return null;
  if (!movesForDie(s, me, die).some((m) => m.from === from && m.to === to)) return null;
  const cnt = s.counts[me];
  cnt[from]--;
  let hit = null;
  if (to !== OFF && oppAt(s, me, to) === 1) {
    // Rule 5: a lone opposing piece is taken off and must re-enter on 1–6.
    const { r, c } = cellOf(me, to);
    const op = other(me);
    const p = posOf(op, r, c);
    s.counts[op][p]--;
    s.counts[op][0]++;
    hit = { player: op, pos: p };
  }
  cnt[to]++;
  die.used = true;
  if (cnt[OFF] === N) { s.winner = me; s.phase = 'over'; }
  return { type: 'move', player: me, from, to, die: dieIdx, hit };
}
