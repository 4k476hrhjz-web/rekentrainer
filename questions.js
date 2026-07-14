// Vraaggeneratie per fase en de leerlijn-definitie.

const PHASES = [
  { id: 1, name: 'Optellen tot 10', type: 'add', max: 10, crossTen: false },
  { id: 2, name: 'Aftrekken tot 10', type: 'sub', max: 10, crossTen: false },
  { id: 3, name: 'Optellen & aftrekken tot 10', type: 'mix10', max: 10, crossTen: false },
  { id: 4, name: 'Optellen tot 20', type: 'add', max: 20, crossTen: false },
  { id: 5, name: 'Aftrekken tot 20', type: 'sub', max: 20, crossTen: false },
  { id: 6, name: 'Optellen over het tiental', type: 'add', max: 20, crossTen: true },
  { id: 7, name: 'Aftrekken over het tiental', type: 'sub', max: 20, crossTen: true },
  { id: 8, name: 'Flitssommen tot 20', type: 'mixAll', max: 20, crossTen: null }
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Genereert een optelsom a + b = answer, met of zonder tientaloverschrijding
function genAddition(max, crossTen) {
  let a, b;
  if (crossTen === true) {
    // a + b >= 11 en a,b < 10 (echte tientaloverschrijding, bv 8+5)
    do {
      a = randInt(2, 9);
      b = randInt(2, 9);
    } while (a + b < 11 || a + b > max || a + b <= 10);
  } else if (crossTen === false) {
    if (max === 10) {
      a = randInt(1, 9);
      b = randInt(1, 9 - a) || 1;
      if (a + b > 10) b = 10 - a;
    } else {
      // tot 20, zonder tientaloverschrijding: tiental + eenheid, bv 12+5, 10+7
      const tens = randInt(1, 1) * 10; // altijd 10
      const ones = randInt(0, 9);
      a = tens + ones;
      b = randInt(0, 9 - ones);
      if (b === 0) b = 1;
    }
  } else {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
  }
  return { a, b, answer: a + b, symbol: '+', text: `${a} + ${b} = __` };
}

// Genereert een aftreksom a - b = answer
function genSubtraction(max, crossTen) {
  let a, b;
  if (crossTen === true) {
    // aftrekken met tientaloverschrijding: a is 11-19, b groter dan eenheden van a
    do {
      a = randInt(11, 19);
      const ones = a % 10;
      b = randInt(ones + 1, 9);
    } while (b >= a);
  } else if (crossTen === false) {
    if (max === 10) {
      a = randInt(2, 10);
      b = randInt(1, a - 1);
    } else {
      // tot 20 zonder tientaloverschrijding: eenheden van a >= b
      a = randInt(11, 19);
      const ones = a % 10;
      b = randInt(0, ones);
      if (b === 0 && ones === 0) b = 0;
    }
  } else {
    a = randInt(2, max);
    b = randInt(1, a - 1);
  }
  return { a, b, answer: a - b, symbol: '−', text: `${a} − ${b} = __` };
}

function genMix10() {
  return Math.random() < 0.5 ? genAddition(10, false) : genSubtraction(10, false);
}

function genMixAll() {
  const r = Math.random();
  if (r < 0.25) return genAddition(20, false);
  if (r < 0.5) return genAddition(20, true);
  if (r < 0.75) return genSubtraction(20, false);
  return genSubtraction(20, true);
}

function genSplit(max) {
  const answer = randInt(3, max);
  const a = randInt(1, answer - 1);
  const b = answer - a;
  return { a, b, answer, symbol: 'split', text: `${answer} = __ + __`, splitTarget: answer, splitA: a, splitB: b };
}

// Genereert een unieke vraag voor een gegeven fase
function generateQuestion(phase) {
  let q;
  switch (phase.type) {
    case 'add': q = genAddition(phase.max, phase.crossTen); break;
    case 'sub': q = genSubtraction(phase.max, phase.crossTen); break;
    case 'mix10': q = genMix10(); break;
    case 'mixAll': q = genMixAll(); break;
    default: q = genAddition(10, false);
  }
  q.phaseId = phase.id;
  q.key = `${q.symbol}_${q.a}_${q.b}`;
  return q;
}

// Genereert plausibele foute antwoorden rond het juiste antwoord
function makeDistractors(answer, count = 3, maxBound = 20) {
  const set = new Set();
  const candidates = [answer - 2, answer - 1, answer + 1, answer + 2, answer - 3, answer + 3];
  for (const c of candidates) {
    if (c >= 0 && c <= maxBound && c !== answer) set.add(c);
    if (set.size >= count) break;
  }
  while (set.size < count) {
    const c = randInt(Math.max(0, answer - 5), answer + 5);
    if (c !== answer && c >= 0) set.add(c);
  }
  return Array.from(set).slice(0, count);
}

function buildOptions(q) {
  const bound = q.a && q.b ? Math.max(q.a, q.b) + 10 : 25;
  const distractors = makeDistractors(q.answer, 3, bound);
  const opts = [...distractors, q.answer];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}
