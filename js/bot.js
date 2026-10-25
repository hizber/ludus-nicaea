// A simple robot opponent: plays one die at a time, picking the move that leaves
// the best-looking board (progress, captures, safe stacks, few exposed singles).
import { allOptions, applyMove, cellOf, posOf, other, OFF } from './rules.js';

const clone = (s) => JSON.parse(JSON.stringify(s));

function evaluate(s, me) {
  const op = other(me);
  const mine = s.counts[me], theirs = s.counts[op];
  let score = 0;
  for (let p = 1; p <= 30; p++) score += mine[p] * p - theirs[p] * p * 0.8;
  score += mine[OFF] * 40 - theirs[OFF] * 32;
  for (let p = 1; p <= 30; p++) {
    if (mine[p] >= 2) score += 3;
    if (mine[p] !== 1) continue;
    // a lone piece the opponent could land on with a single die
    const { r, c } = cellOf(me, p);
    const q = posOf(op, r, c);
    if (!q) continue;
    for (let k = 1; k <= 6; k++) {
      if (q - k >= 0 && theirs[q - k] > 0) { score -= p * 0.45; break; }
    }
  }
  return score;
}

export function chooseMove(s) {
  const me = s.turn;
  let best = null, bestScore = -Infinity;
  for (const o of allOptions(s)) {
    const t = clone(s);
    if (!applyMove(t, me, o.die, o.from, o.to)) continue;
    const sc = evaluate(t, me) + Math.random() * 0.5;
    if (sc > bestScore) { bestScore = sc; best = o; }
  }
  return best;
}
