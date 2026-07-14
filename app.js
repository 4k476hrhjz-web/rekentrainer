// RekenTrainer — hoofdlogica en schermbesturing

let state = loadState();

const screens = {};
document.querySelectorAll('.screen').forEach(el => { screens[el.id] = el; });
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
}

// ---------- Geluid ----------
let audioCtx = null;
function playTone(freq, duration, type = 'sine', delay = 0) {
  if (!state.soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  } catch (e) { /* audio niet beschikbaar */ }
}
function playCorrectSound() { playTone(660, 0.12); playTone(880, 0.14, 'sine', 0.1); }
function playWrongSound() { playTone(220, 0.2, 'triangle'); }
function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.18, 'sine', i * 0.12));
}

state.soundEnabled = state.soundEnabled !== false;

// ---------- Confetti ----------
function launchConfetti(count = 40) {
  const layer = document.getElementById('confetti-layer');
  const colors = ['#ff3fa4', '#35e6ff', '#a259ff', '#ffd23f', '#2fd66b'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
    const duration = 2 + Math.random() * 1.5;
    piece.style.animationDuration = duration + 's';
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + 1) * 1000);
  }
}

// ---------- Beads (kralen/stippen visual) ----------
function renderBeads(container, n, colorClass = '') {
  container.innerHTML = '';
  if (n <= 0 || n > 20) return;
  const groups = [];
  let remaining = n;
  while (remaining > 0) {
    const take = Math.min(5, remaining);
    groups.push(take);
    remaining -= take;
  }
  groups.forEach(count => {
    const g = document.createElement('div');
    g.className = 'bead-group';
    for (let i = 0; i < 5; i++) {
      const b = document.createElement('div');
      b.className = 'bead' + (i < count ? (colorClass ? ' ' + colorClass : '') : ' ghost');
      g.appendChild(b);
    }
    container.appendChild(g);
  });
}

// ---------- Home screen ----------
function setMascotStage(mascotId, levelId, stage) {
  const mascot = document.getElementById(mascotId);
  if (mascot) mascot.setAttribute('data-stage', stage);
  const level = document.getElementById(levelId);
  if (level) level.textContent = 'Lv' + (stage + 1);
}

function renderHome() {
  setMascotStage('mascot-home', 'mascot-home-level', state.plantStage);
  document.getElementById('streak-count').textContent = state.streak.count;
  const phase = PHASES.find(p => p.id === state.currentPhaseId) || PHASES[0];
  document.getElementById('phase-note').textContent = `Fase ${phase.id}: ${phase.name}`;
  document.getElementById('btn-start-flits').style.display = state.currentPhaseId >= 3 ? 'block' : 'none';

  const badgeRow = document.getElementById('badge-row');
  badgeRow.innerHTML = '';
  const labels = { fase1:'Fase 1', fase2:'Fase 2', fase3:'Fase 3', fase4:'Fase 4', fase5:'Fase 5', fase6:'Fase 6', fase7:'Fase 7', fase8:'Fase 8', streak3:'3 dagen', streak7:'1 week', streak14:'2 weken', streak30:'1 maand' };
  state.badges.slice(-6).forEach(b => {
    const chip = document.createElement('div');
    chip.className = 'badge-chip';
    chip.textContent = '🏅 ' + (labels[b] || b);
    badgeRow.appendChild(chip);
  });
  saveState(state);
}

// ---------- Sessie ----------
let session = null; // { questions: [], index, correctCount, startTime, phase }

const SESSION_TARGET = 20;
const SESSION_MS = 10 * 60 * 1000;

function buildSessionQueue() {
  const phase = PHASES.find(p => p.id === state.currentPhaseId);
  const due = getDueReviewsForToday(state);
  const queue = [];
  // eerst tot 5 herhaal-sommen van eerdere fouten
  due.slice(0, 5).forEach(r => queue.push(Object.assign({}, r.q)));
  while (queue.length < SESSION_TARGET) {
    queue.push(generateQuestion(phase));
  }
  return { queue, phase, dueKeys: due.slice(0, 5).map(r => r.key) };
}

function startSession() {
  const { queue, phase, dueKeys } = buildSessionQueue();
  session = {
    queue,
    dueKeys,
    index: 0,
    correctCount: 0,
    startTime: Date.now(),
    sessionStartTime: Date.now(),
    phase,
    mistakesInRow: 0,
    requeued: []
  };
  showScreen('screen-session');
  renderQuestion();
}

function currentQuestion() {
  return session.queue[session.index];
}

function renderQuestion() {
  if (!session) return;
  if (Date.now() - session.sessionStartTime > SESSION_MS || session.index >= session.queue.length) {
    endSession();
    return;
  }
  const q = currentQuestion();
  document.getElementById('session-phase-label').textContent = `Fase ${session.phase.id}`;
  const pct = Math.min(100, (session.index / SESSION_TARGET) * 100);
  document.getElementById('session-progress').style.width = pct + '%';
  document.getElementById('question-text').textContent = q.text;
  document.getElementById('hint-box').textContent = '';

  const beadsWrap = document.getElementById('beads-wrap');
  beadsWrap.innerHTML = '';
  if (session.phase.id <= 5 && q.a != null && q.b != null) {
    const a = document.createElement('div');
    renderBeads(a, q.a, '');
    const b = document.createElement('div');
    renderBeads(b, q.b, 'blue');
    beadsWrap.appendChild(a);
    beadsWrap.appendChild(b);
  }

  const options = buildOptions(q);
  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, btn));
    grid.appendChild(btn);
  });

  session.questionStart = Date.now();
  session.answered = false;
}

function showSplitHint(q) {
  const hint = document.getElementById('hint-box');
  if (q.symbol === '+' && q.a + q.b > 10 && q.a < 10 && q.b < 10) {
    const toTen = 10 - q.a;
    const rest = q.b - toTen;
    hint.innerHTML = `💡 Handig: ${q.a} + ${toTen} = 10, dan nog + ${rest} = <b>${q.answer}</b>`;
  } else if (q.symbol === '−' && q.a >= 11 && q.a - q.b < 10 * Math.floor(q.a/10)) {
    const toTen = q.a - Math.floor(q.a / 10) * 10;
    const restB = q.b - toTen;
    if (restB > 0) {
      hint.innerHTML = `💡 Handig: ${q.a} − ${toTen} = ${Math.floor(q.a/10)*10}, dan nog − ${restB} = <b>${q.answer}</b>`;
    } else {
      hint.innerHTML = `💡 Antwoord: <b>${q.answer}</b>`;
    }
  } else {
    hint.innerHTML = `💡 Antwoord: <b>${q.answer}</b>`;
  }
}

function handleAnswer(value, btn) {
  if (!session || session.answered) return;
  session.answered = true;
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

  const q = currentQuestion();
  const correct = value === q.answer;
  const ms = Date.now() - session.questionStart;

  if (correct) {
    btn.classList.add('correct');
    playCorrectSound();
    session.correctCount += 1;
    session.mistakesInRow = 0;
    recordAnswer(state, q, true, ms);
    saveState(state);
    setTimeout(() => {
      if (!session) return;
      session.index += 1;
      renderQuestion();
    }, 450);
  } else {
    btn.classList.add('tryagain');
    playWrongSound();
    session.mistakesInRow += 1;
    recordAnswer(state, q, false, ms);
    saveState(state);
    showSplitHint(q);
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
    setTimeout(() => {
      if (!session) return;
      document.querySelectorAll('.option-btn').forEach(b => { b.disabled = false; b.classList.remove('tryagain'); });
      if (session.mistakesInRow >= 2) {
        // makkelijkere som invoegen
        const easier = generateQuestion(PHASES[Math.max(0, session.phase.id - 2)] || PHASES[0]);
        session.queue.splice(session.index + 1, 0, easier);
        session.mistakesInRow = 0;
      }
      session.index += 1;
      renderQuestion();
    }, 1400);
  }
}

function endSession() {
  if (!session) return;
  const finishedSession = session;
  session = null; // voorkomt dubbele afronding door dubbele setTimeout-aanroepen

  clearDueReviews(state, finishedSession.dueKeys);
  const advanced = maybeAdvancePhase(state);
  if (advanced) {
    addPhaseBadgeIfNeeded(state, state.currentPhaseId - 1);
  }
  updateStreakAndPlant(state);
  logSpeedSample(state, finishedSession.phase.id);
  saveState(state);
  showReward(advanced, finishedSession);
}

function showReward(advanced, finishedSession) {
  setMascotStage('mascot-reward', 'mascot-reward-level', state.plantStage);
  document.getElementById('reward-title').textContent = advanced ? 'Nieuwe fase ontgrendeld! 🚀' : 'Goed gedaan! 🎉';
  document.getElementById('reward-text').textContent = advanced
    ? `Je gaat door naar fase ${state.currentPhaseId}: ${PHASES.find(p => p.id === state.currentPhaseId).name}`
    : `Sessie voltooid: ${finishedSession.correctCount} van de ${finishedSession.index} goed.`;

  const badgeRow = document.getElementById('reward-badges');
  badgeRow.innerHTML = '';
  const labels = { fase1:'Fase 1', fase2:'Fase 2', fase3:'Fase 3', fase4:'Fase 4', fase5:'Fase 5', fase6:'Fase 6', fase7:'Fase 7', fase8:'Fase 8', streak3:'3 dagen', streak7:'1 week', streak14:'2 weken', streak30:'1 maand' };
  const recent = state.badges.slice(-3);
  recent.forEach(b => {
    const chip = document.createElement('div');
    chip.className = 'badge-chip';
    chip.textContent = '🏅 ' + (labels[b] || b);
    badgeRow.appendChild(chip);
  });

  showScreen('screen-reward');
  launchConfetti(advanced ? 70 : 40);
  playFanfare();
}

// ---------- Flitssommen ----------
let flits = null;
const FLITS_DURATION = 120;

function startFlits() {
  flits = { score: 0, timeLeft: FLITS_DURATION, interval: null };
  document.getElementById('flits-score').textContent = '0';
  document.getElementById('flits-time').textContent = FLITS_DURATION;
  document.getElementById('flits-record').textContent = state.flitsBestScore;
  showScreen('screen-flits');
  nextFlitsQuestion();
  flits.interval = setInterval(() => {
    flits.timeLeft -= 1;
    document.getElementById('flits-time').textContent = flits.timeLeft;
    if (flits.timeLeft <= 0) endFlits();
  }, 1000);
}

function nextFlitsQuestion() {
  const phase = PHASES[7]; // fase 8: mixAll
  const q = generateQuestion(phase);
  flits.currentQ = q;
  document.getElementById('flits-question-text').textContent = q.text;
  const options = buildOptions(q);
  const grid = document.getElementById('flits-options-grid');
  grid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleFlitsAnswer(opt, btn));
    grid.appendChild(btn);
  });
}

function handleFlitsAnswer(value, btn) {
  if (!flits) return;
  const q = flits.currentQ;
  if (value === q.answer) {
    btn.classList.add('correct');
    playCorrectSound();
    flits.score += 1;
    document.getElementById('flits-score').textContent = flits.score;
    setTimeout(nextFlitsQuestion, 200);
  } else {
    btn.classList.add('tryagain');
    playWrongSound();
    setTimeout(() => { btn.classList.remove('tryagain'); }, 300);
  }
}

function endFlits() {
  clearInterval(flits.interval);
  const isRecord = flits.score > state.flitsBestScore;
  if (isRecord) state.flitsBestScore = flits.score;
  saveState(state);
  setMascotStage('mascot-reward', 'mascot-reward-level', state.plantStage);
  document.getElementById('reward-title').textContent = isRecord ? 'Nieuw record! ⚡🏆' : 'Flitssommen klaar!';
  document.getElementById('reward-text').textContent = `Je had ${flits.score} sommen goed in 2 minuten. Record: ${state.flitsBestScore}.`;
  document.getElementById('reward-badges').innerHTML = '';
  showScreen('screen-reward');
  if (isRecord) launchConfetti(80);
  playFanfare();
  flits = null;
}

// ---------- Ouderscherm ----------
function renderGateQuestion() {
  const a = Math.floor(Math.random() * 8) + 12;
  const b = Math.floor(Math.random() * 6) + 3;
  window._gateAnswer = a * b;
  document.getElementById('gate-question').textContent = `Wat is ${a} × ${b}?`;
  document.getElementById('gate-input').value = '';
  document.getElementById('gate-error').textContent = '';
}

function checkGate() {
  const val = parseInt(document.getElementById('gate-input').value, 10);
  if (val === window._gateAnswer) {
    renderDashboard();
    showScreen('screen-parent-dashboard');
  } else {
    document.getElementById('gate-error').textContent = 'Niet helemaal — probeer nog eens.';
    renderGateQuestion();
  }
}

function renderDashboard() {
  const phaseList = document.getElementById('phase-list');
  phaseList.innerHTML = '';
  PHASES.forEach(p => {
    const prog = phaseProgress(state, p.id);
    const row = document.createElement('div');
    row.className = 'phase-row';
    const dotClass = p.id < state.currentPhaseId ? 'done' : (p.id === state.currentPhaseId ? 'current' : '');
    row.innerHTML = `<span class="phase-dot ${dotClass}"></span><span>Fase ${p.id}: ${p.name} ${p.id === state.currentPhaseId ? `— ${Math.round(prog.pct*100)}% goed` : ''}</span>`;
    phaseList.appendChild(row);
  });

  const select = document.getElementById('phase-select');
  select.innerHTML = '';
  PHASES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `Fase ${p.id}: ${p.name}`;
    if (p.id === state.currentPhaseId) opt.selected = true;
    select.appendChild(opt);
  });

  const wrongList = document.getElementById('wrong-list');
  wrongList.innerHTML = '';
  const top = topWrongSums(state, 10);
  if (top.length === 0) {
    wrongList.innerHTML = '<li>Nog geen gegevens.</li>';
  } else {
    top.forEach(w => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${w.text}</span><span>${w.count}×</span>`;
      wrongList.appendChild(li);
    });
  }

  renderSpeedChart();
  document.getElementById('sound-toggle').checked = state.soundEnabled;
}

function renderSpeedChart() {
  const svg = document.getElementById('speed-chart');
  svg.innerHTML = '';
  const data = state.speedLog.slice(-15);
  if (data.length < 2) {
    svg.innerHTML = '<text x="150" y="70" font-size="14" text-anchor="middle" fill="#a08a6e">Nog niet genoeg data</text>';
    return;
  }
  const w = 300, h = 140, pad = 10;
  const maxMs = Math.max(...data.map(d => d.avgMs), 1000);
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.avgMs / maxMs) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const ns = 'http://www.w3.org/2000/svg';
  const polyline = document.createElementNS(ns, 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', '#ff9f45');
  polyline.setAttribute('stroke-width', '3');
  svg.appendChild(polyline);
  data.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (d.avgMs / maxMs) * (h - pad * 2);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
    c.setAttribute('fill', '#ff7e26');
    svg.appendChild(c);
  });
}

// ---------- Events ----------
document.getElementById('btn-start-session').addEventListener('click', startSession);
document.getElementById('btn-start-flits').addEventListener('click', startFlits);
document.getElementById('btn-session-exit').addEventListener('click', () => { session = null; renderHome(); showScreen('screen-home'); });
document.getElementById('btn-flits-exit').addEventListener('click', () => { if (flits) clearInterval(flits.interval); flits = null; renderHome(); showScreen('screen-home'); });
document.getElementById('btn-reward-home').addEventListener('click', () => { renderHome(); showScreen('screen-home'); });
document.getElementById('btn-parent').addEventListener('click', () => { renderGateQuestion(); showScreen('screen-parent-gate'); });
document.getElementById('btn-gate-exit').addEventListener('click', () => showScreen('screen-home'));
document.getElementById('btn-gate-check').addEventListener('click', checkGate);
document.getElementById('gate-input').addEventListener('keydown', e => { if (e.key === 'Enter') checkGate(); });
document.getElementById('btn-dash-exit').addEventListener('click', () => { renderHome(); showScreen('screen-home'); });
document.getElementById('phase-select').addEventListener('change', e => {
  state.currentPhaseId = parseInt(e.target.value, 10);
  saveState(state);
  renderDashboard();
});
document.getElementById('sound-toggle').addEventListener('change', e => {
  state.soundEnabled = e.target.checked;
  saveState(state);
});
document.getElementById('btn-reset-all').addEventListener('click', () => {
  if (confirm('Weet je zeker dat je alle voortgang wilt wissen?')) {
    state = defaultState();
    state.soundEnabled = true;
    saveState(state);
    renderDashboard();
    renderHome();
  }
});

// ---------- Init ----------
renderHome();
showScreen('screen-home');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
