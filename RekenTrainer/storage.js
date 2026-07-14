// Alle voortgang wordt lokaal op het apparaat bewaard (localStorage). Geen server, geen account.

const STORAGE_KEY = 'rekentrainer_state_v1';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultState() {
  return {
    currentPhaseId: 1,
    phaseStats: {},        // { [phaseId]: { history: [{correct, ms}], completed: bool } }
    dueReviews: [],         // [{ key, phaseId, q, dueDate }]
    wrongCounts: {},         // { key: { text, count } }
    streak: { count: 0, lastSessionDate: null },
    badges: [],
    plantStage: 0,
    flitsBestScore: 0,
    totalSessions: 0,
    speedLog: []             // [{ date, avgMs }] weekly-ish samples for dashboard
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function recordAnswer(state, question, correct, ms) {
  const phaseId = question.phaseId;
  if (!state.phaseStats[phaseId]) state.phaseStats[phaseId] = { history: [], completed: false };
  const hist = state.phaseStats[phaseId].history;
  hist.push({ correct, ms });
  if (hist.length > 30) hist.shift();

  if (!correct) {
    const wc = state.wrongCounts[question.key] || { text: question.text, count: 0 };
    wc.count += 1;
    wc.text = question.text;
    state.wrongCounts[question.key] = wc;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    state.dueReviews.push({ key: question.key, phaseId, q: question, dueDate });
  }
}

function phaseProgress(state, phaseId) {
  const stats = state.phaseStats[phaseId];
  if (!stats || stats.history.length === 0) return { pct: 0, avgMs: null, ready: false, count: 0 };
  const hist = stats.history;
  const correctCount = hist.filter(h => h.correct).length;
  const pct = correctCount / hist.length;
  const avgMs = hist.reduce((sum, h) => sum + h.ms, 0) / hist.length;
  const ready = hist.length >= 20 && pct >= 0.9 && avgMs <= 8000;
  return { pct, avgMs, ready, count: hist.length };
}

function maybeAdvancePhase(state) {
  const prog = phaseProgress(state, state.currentPhaseId);
  if (prog.ready && state.currentPhaseId < 8) {
    if (state.phaseStats[state.currentPhaseId]) state.phaseStats[state.currentPhaseId].completed = true;
    state.currentPhaseId += 1;
    return true;
  }
  return false;
}

function updateStreakAndPlant(state) {
  const today = todayStr();
  if (state.streak.lastSessionDate === today) {
    // al geteld vandaag
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (state.streak.lastSessionDate === yStr) {
      state.streak.count += 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.lastSessionDate = today;
  }
  state.totalSessions += 1;
  state.plantStage = Math.min(5, Math.floor(state.totalSessions / 3));

  const streakBadges = [3, 7, 14, 30];
  streakBadges.forEach(n => {
    const id = `streak${n}`;
    if (state.streak.count >= n && !state.badges.includes(id)) {
      state.badges.push(id);
    }
  });
}

function addPhaseBadgeIfNeeded(state, completedPhaseId) {
  const id = `fase${completedPhaseId}`;
  if (!state.badges.includes(id)) state.badges.push(id);
}

function getDueReviewsForToday(state) {
  const today = todayStr();
  return state.dueReviews.filter(r => r.dueDate <= today);
}

function clearDueReviews(state, keys) {
  state.dueReviews = state.dueReviews.filter(r => !keys.includes(r.key));
}

function topWrongSums(state, n = 10) {
  return Object.entries(state.wrongCounts)
    .map(([key, v]) => ({ key, text: v.text, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function logSpeedSample(state, phaseId) {
  const prog = phaseProgress(state, phaseId);
  if (prog.avgMs != null) {
    state.speedLog.push({ date: todayStr(), avgMs: Math.round(prog.avgMs) });
    if (state.speedLog.length > 60) state.speedLog.shift();
  }
}
