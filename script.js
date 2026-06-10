// ============================================
//  HABIT TRACKER — Full App Logic + Auth
// ============================================

// ─── Auth constants ───────────────────────────
const USERS_KEY    = 'habitTracker_users';    // { email: { name, passwordHash, uid } }
const SESSION_KEY  = 'habitTracker_session';  // current uid
const STORAGE_KEY  = 'habitTracker_v2';       // legacy (unused directly)

function userDataKey(uid) { return `habitTracker_data_${uid}`; }

// ─── Simple hash (not cryptographic — browser-only demo) ─────
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ─── Auth state ──────────────────────────────
let currentUser = null; // { uid, name, email }

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function getSession() { return localStorage.getItem(SESSION_KEY); }
function setSession(uid) { localStorage.setItem(SESSION_KEY, uid); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

async function register(name, email, password) {
  const users = getUsers();
  const key = email.toLowerCase().trim();
  if (users[key]) throw new Error('An account with this email already exists.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  const uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const passwordHash = await hashPassword(password);
  users[key] = { name: name.trim(), email: key, passwordHash, uid };
  saveUsers(users);
  return users[key];
}

async function login(email, password) {
  const users = getUsers();
  const key = email.toLowerCase().trim();
  const user = users[key];
  if (!user) throw new Error('No account found with this email.');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Incorrect password.');
  return user;
}

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
}
function showApp(user) {
  currentUser = user;

  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userEmail').textContent = user.email;

  loadUserData(user.uid);
  applyTheme();
  renderAll();
}

// ─── Per-user data load/save ─────────────────
function loadUserData(uid) {
  const raw = localStorage.getItem(userDataKey(uid));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      state = { habits: [], completions: {}, theme: 'light', ...parsed };
    } catch {}
  } else {
    state = { habits: [], completions: {}, theme: 'light' };
  }
}

// ─── Auth UI wiring ───────────────────────────
function initAuth() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      document.getElementById('loginForm').classList.toggle('hidden', which !== 'login');
      document.getElementById('signupForm').classList.toggle('hidden', which !== 'signup');
      document.getElementById('loginError').textContent = '';
      document.getElementById('signupError').textContent = '';
    });
  });

  // Eye toggles
  document.querySelectorAll('.auth-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁' : '🙈';
    });
  });

  // Login submit
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmit');
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const user = await login(
        document.getElementById('loginEmail').value,
        document.getElementById('loginPassword').value
      );
      setSession(user.uid);
      showApp(user);
    } catch (err) {
      errEl.textContent = err.message;
      // Re-trigger shake animation
      errEl.style.animation = 'none';
      requestAnimationFrame(() => { errEl.style.animation = ''; });
    } finally {
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });

  // Signup submit
  document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('signupSubmit');
    const errEl = document.getElementById('signupError');
    errEl.textContent = '';
    const name     = document.getElementById('signupName').value.trim();
    const email    = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirm  = document.getElementById('signupConfirm').value;
    if (!name)  { errEl.textContent = 'Please enter your name.'; return; }
    if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      const user = await register(name, email, password);
      setSession(user.uid);
      showApp(user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.animation = 'none';
      requestAnimationFrame(() => { errEl.style.animation = ''; });
    } finally {
      btn.disabled = false; btn.textContent = 'Create account';
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    currentUser = null;
    state = { habits: [], completions: {}, theme: 'light' };
    showAuthScreen();
    // Clear form fields
    ['loginEmail','loginPassword','signupName','signupEmail','signupPassword','signupConfirm']
      .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  });

  // Check existing session
  const uid = getSession();
  if (uid) {
    const users = getUsers();
    const user = Object.values(users).find(u => u.uid === uid);
    if (user) { showApp(user); return; }
  }
  showAuthScreen();
}


const EMOJIS = [
  '🏃','💪','📚','🧘','💧','🥗','😴','✍️',
  '🎯','🎵','🌿','🧠','☀️','🚴','🧹','💊',
  '🛌','🥤','🏋️','📝','🎨','🧘‍♂️','🫁','❤️',
];

const COLORS = [
  '#4A7CF7','#22C55E','#F5A623','#EF4444','#A855F7',
  '#06B6D4','#F97316','#14B8A6','#EC4899','#8B5CF6',
];

// ─── State ───────────────────────────────────
let state = {
  habits: [],
  completions: {}, // { 'YYYY-MM-DD': { habitId: bool } }
  theme: 'light',
};

let editingHabitId = null;
let selectedEmoji = EMOJIS[0];
let selectedColor = COLORS[0];

// ─── Storage ─────────────────────────────────
function save() {
  if (!currentUser) return;
  localStorage.setItem(userDataKey(currentUser.uid), JSON.stringify(state));
}
function load() {
  // No-op: per-user data loaded in loadUserData() during auth
}

// ─── Date helpers ─────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}
function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}
function dayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'short' });
}
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
function last30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── Habit logic ─────────────────────────────
function isCompleted(habitId, dateStr) {
  return !!(state.completions[dateStr] && state.completions[dateStr][habitId]);
}

function toggleCompletion(habitId, dateStr) {
  if (!state.completions[dateStr]) state.completions[dateStr] = {};
  state.completions[dateStr][habitId] = !state.completions[dateStr][habitId];
  save();
  renderAll();
}

function getStreak(habitId) {
  let streak = 0;
  let d = new Date();
  // If today not done yet, start from yesterday
  if (!isCompleted(habitId, today())) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (isCompleted(habitId, ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function getBestStreak(habitId) {
  const dates = Object.keys(state.completions).sort();
  if (!dates.length) return 0;
  let best = 0, cur = 0;
  let prevDate = null;
  for (const ds of dates) {
    if (!state.completions[ds][habitId]) { cur = 0; prevDate = null; continue; }
    if (!prevDate) { cur = 1; }
    else {
      const diff = (new Date(ds) - new Date(prevDate)) / 86400000;
      cur = diff === 1 ? cur + 1 : 1;
    }
    best = Math.max(best, cur);
    prevDate = ds;
  }
  return best;
}

function getCompletionRate(habitId, days) {
  if (!days.length) return 0;
  const done = days.filter(d => isCompleted(habitId, d)).length;
  return Math.round((done / days.length) * 100);
}

function getTodayStats() {
  const t = today();
  const done = state.habits.filter(h => isCompleted(h.id, t)).length;
  return { done, total: state.habits.length };
}

function getOverallBestStreak() {
  return state.habits.reduce((max, h) => Math.max(max, getBestStreak(h.id)), 0);
}

function getAllTimeCompletions() {
  let total = 0;
  for (const dateMap of Object.values(state.completions)) {
    total += Object.values(dateMap).filter(Boolean).length;
  }
  return total;
}

function getPerfectDays() {
  if (!state.habits.length) return 0;
  return Object.entries(state.completions).filter(([date, map]) =>
    state.habits.every(h => map[h.id])
  ).length;
}

function getWeekRate() {
  const days = last7Days();
  if (!state.habits.length) return 0;
  const possible = state.habits.length * days.length;
  const done = days.reduce((sum, d) =>
    sum + state.habits.filter(h => isCompleted(h.id, d)).length, 0
  );
  return possible ? Math.round((done / possible) * 100) : 0;
}

// ─── Render: Sidebar Habit List ───────────────
function renderSidebarList() {
  const list = document.getElementById('habitList');
  list.innerHTML = '';
  if (!state.habits.length) { list.innerHTML = '<li style="padding:6px 10px;font-size:.8rem;color:var(--text-3)">No habits added</li>'; return; }
  state.habits.forEach(h => {
    const streak = getStreak(h.id);
    const li = document.createElement('li');
    li.className = 'habit-list-item';
    li.innerHTML = `
      <span class="h-icon">${h.icon}</span>
      <span class="h-name">${escHtml(h.name)}</span>
      ${streak > 0 ? `<span class="h-streak">🔥${streak}</span>` : ''}
    `;
    li.addEventListener('click', () => openEditModal(h.id));
    list.appendChild(li);
  });
}

// ─── Render: Today View ───────────────────────
function renderToday() {
  const grid = document.getElementById('todayGrid');
  const { done, total } = getTodayStats();

  document.getElementById('todayCompletedCount').textContent = done;
  document.getElementById('todayTotalCount').textContent = total;

  // Ring
  const pct = total ? (done / total) * 100 : 0;
  const ring = document.getElementById('ringFill');
  const circ = 2 * Math.PI * 15.9;
  ring.style.strokeDasharray = `${(pct / 100) * circ} ${circ}`;

  // Date
  const now = new Date();
  document.getElementById('todayDate').textContent =
    now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }).toUpperCase();

  // Cards
  const empty = document.getElementById('emptyToday');
  if (!state.habits.length) {
    empty.style.display = 'flex';
    // Remove any existing cards
    grid.querySelectorAll('.habit-card').forEach(c => c.remove());
    return;
  }
  empty.style.display = 'none';
  grid.querySelectorAll('.habit-card').forEach(c => c.remove());

  state.habits.forEach(h => {
    const t = today();
    const done = isCompleted(h.id, t);
    const streak = getStreak(h.id);
    const card = document.createElement('div');
    card.className = `habit-card${done ? ' done' : ''}`;
    card.setAttribute('data-id', h.id);
    card.style.setProperty('--h-color', h.color);

    card.innerHTML = `
      <div class="habit-card-icon" style="background:${h.color}20">${h.icon}</div>
      <div class="habit-card-body">
        <p class="habit-card-name">${escHtml(h.name)}</p>
        <div class="habit-streak ${streak >= 3 ? 'hot' : ''}">
          ${streak > 0 ? `<span class="streak-flame">🔥</span> ${streak}-day streak` : 'Start your streak!'}
        </div>
      </div>
      <div class="habit-check">${done ? '✓' : ''}</div>
      <button class="habit-edit-btn" data-id="${h.id}" title="Edit">✎</button>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.habit-edit-btn')) return;
      toggleCompletion(h.id, t);
    });
    card.querySelector('.habit-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(h.id);
    });

    grid.appendChild(card);
  });
}

// ─── Render: Stats View ───────────────────────
function renderStats() {
  document.getElementById('statBestStreak').innerHTML =
    `${getOverallBestStreak()} <span class="flame-icon">🔥</span>`;
  document.getElementById('statWeekRate').textContent = `${getWeekRate()}%`;
  document.getElementById('statAllTime').textContent = getAllTimeCompletions();
  document.getElementById('statPerfectDays').textContent = getPerfectDays();

  renderChart();
  renderBreakdown();
}

function renderChart() {
  const days = last7Days();
  const barsEl = document.getElementById('chartBars');
  const labelsEl = document.getElementById('chartLabels');
  barsEl.innerHTML = ''; labelsEl.innerHTML = '';

  const t = today();
  const maxVal = state.habits.length || 1;

  days.forEach(d => {
    const done = state.habits.filter(h => isCompleted(h.id, d)).length;
    const pct = (done / maxVal) * 100;

    const group = document.createElement('div');
    group.className = 'chart-bar-group';

    const bar = document.createElement('div');
    bar.className = `chart-bar ${done > 0 ? 'filled' : 'empty'}`;
    bar.style.height = `${Math.max(pct, 3)}%`;
    bar.innerHTML = `<div class="chart-bar-tooltip">${done}/${state.habits.length}</div>`;

    group.appendChild(bar);
    barsEl.appendChild(group);

    const label = document.createElement('div');
    label.className = `chart-label${d === t ? ' today' : ''}`;
    label.textContent = d === t ? 'Today' : dayName(d);
    labelsEl.appendChild(label);
  });
}

function renderBreakdown() {
  const el = document.getElementById('habitBreakdownList');
  el.innerHTML = '';
  if (!state.habits.length) {
    el.innerHTML = '<p style="font-size:.875rem;color:var(--text-3);padding:16px 0">No habits to show.</p>';
    return;
  }
  const days = last7Days();
  state.habits.forEach(h => {
    const rate = getCompletionRate(h.id, days);
    const streak = getStreak(h.id);
    const row = document.createElement('div');
    row.className = 'breakdown-item';
    row.innerHTML = `
      <span class="breakdown-icon">${h.icon}</span>
      <span class="breakdown-name">${escHtml(h.name)}</span>
      <div class="breakdown-bar-bg">
        <div class="breakdown-bar-fill" style="width:${rate}%;background:${h.color}"></div>
      </div>
      <span class="breakdown-rate">${rate}%</span>
      ${streak > 0 ? `<span class="breakdown-streak">🔥${streak}</span>` : '<span class="breakdown-streak" style="color:var(--text-3)">—</span>'}
    `;
    el.appendChild(row);
  });
}

// ─── Render: History View ────────────────────
function renderHistory() {
  renderHeatmap();
  renderLog();
}

function renderHeatmap() {
  const el = document.getElementById('heatmap');
  el.innerHTML = '';
  const days = last30Days();
  days.forEach(d => {
    const done = state.habits.filter(h => isCompleted(h.id, d)).length;
    const total = state.habits.length;
    let level = 0;
    if (total > 0) {
      const pct = done / total;
      if (pct > 0)      level = 1;
      if (pct >= .5)    level = 2;
      if (pct >= .75)   level = 3;
      if (pct === 1)    level = 4;
    }
    const cell = document.createElement('div');
    cell.className = `hm-cell heatmap-${level}`;
    cell.title = `${dateLabel(d)}: ${done}/${total} habits`;
    el.appendChild(cell);
  });
}

function renderLog() {
  const el = document.getElementById('historyLog');
  el.innerHTML = '';
  const days = last30Days().reverse();
  days.forEach(d => {
    const done = state.habits.filter(h => isCompleted(h.id, d)).length;
    const total = state.habits.length;
    if (total === 0) return;
    const pct = total ? (done / total) * 100 : 0;
    const isPerfect = done === total && total > 0;
    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML = `
      <span class="log-date">${dateLabel(d)}</span>
      <span class="log-done">${done}</span>
      <span class="log-total"> / ${total}</span>
      <div class="log-bar-bg"><div class="log-bar-fill" style="width:${pct}%"></div></div>
      ${isPerfect ? '<span class="log-perfect">✦ Perfect</span>' : '<span class="log-perfect"></span>'}
    `;
    el.appendChild(row);
  });
  if (!el.children.length) {
    el.innerHTML = '<p style="font-size:.875rem;color:var(--text-3);padding:8px 0">No history yet.</p>';
  }
}

// ─── Render All ───────────────────────────────
function renderAll() {
  renderSidebarList();
  renderToday();
  renderStats();
  renderHistory();
}

// ─── Navigation ───────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    renderAll();
  });
});

// ─── Theme Toggle ─────────────────────────────
document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  save();
});
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.getElementById('themeToggle').querySelector('.theme-icon').textContent =
    state.theme === 'dark' ? '☀️' : '🌙';
}

// ─── Modal ────────────────────────────────────
function openAddModal() {
  editingHabitId = null;
  selectedEmoji = EMOJIS[0];
  selectedColor = COLORS[0];
  document.getElementById('habitNameInput').value = '';
  document.getElementById('modalTitle').textContent = 'New Habit';
  document.getElementById('deleteHabitBtn').style.display = 'none';
  buildEmojiGrid();
  buildColorGrid();
  openModal();
}

function openEditModal(id) {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  editingHabitId = id;
  selectedEmoji = habit.icon;
  selectedColor = habit.color;
  document.getElementById('habitNameInput').value = habit.name;
  document.getElementById('modalTitle').textContent = 'Edit Habit';
  document.getElementById('deleteHabitBtn').style.display = 'block';
  buildEmojiGrid();
  buildColorGrid();
  openModal();
}

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('habitNameInput').focus(), 100);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function buildEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `emoji-btn${e === selectedEmoji ? ' selected' : ''}`;
    btn.textContent = e;
    btn.addEventListener('click', () => {
      selectedEmoji = e;
      grid.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('selected', b.textContent === e));
    });
    grid.appendChild(btn);
  });
}

function buildColorGrid() {
  const grid = document.getElementById('colorGrid');
  grid.innerHTML = '';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-btn${c === selectedColor ? ' selected' : ''}`;
    btn.style.background = c;
    btn.title = c;
    btn.addEventListener('click', () => {
      selectedColor = c;
      grid.querySelectorAll('.color-btn').forEach(b => b.classList.toggle('selected', b.style.background === c || b.style.backgroundColor === c));
    });
    grid.appendChild(btn);
  });
}

document.getElementById('openAddHabit').addEventListener('click', openAddModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('saveHabit').addEventListener('click', () => {
  const name = document.getElementById('habitNameInput').value.trim();
  if (!name) { document.getElementById('habitNameInput').focus(); return; }

  if (editingHabitId) {
    const habit = state.habits.find(h => h.id === editingHabitId);
    if (habit) { habit.name = name; habit.icon = selectedEmoji; habit.color = selectedColor; }
  } else {
    state.habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name,
      icon: selectedEmoji,
      color: selectedColor,
      createdAt: today(),
    });
  }
  save();
  renderAll();
  closeModal();
});

document.getElementById('deleteHabitBtn').addEventListener('click', () => {
  if (!editingHabitId) return;
  if (!confirm('Delete this habit and all its history?')) return;
  state.habits = state.habits.filter(h => h.id !== editingHabitId);
  // Clean completions
  for (const date of Object.keys(state.completions)) {
    delete state.completions[date][editingHabitId];
  }
  save();
  renderAll();
  closeModal();
});

// Enter key in name input
document.getElementById('habitNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('saveHabit').click();
});

// ─── Utility ─────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Seed sample data (first run) ────────────
function seedSampleData() {
  if (state.habits.length) return;
  const samples = [
    { name: 'Morning Run', icon: '🏃', color: COLORS[0] },
    { name: 'Read 20 pages', icon: '📚', color: COLORS[1] },
    { name: 'Drink 2L water', icon: '💧', color: COLORS[5] },
    { name: 'Meditate', icon: '🧘', color: COLORS[4] },
  ];
  samples.forEach(s => {
    state.habits.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: s.name, icon: s.icon, color: s.color,
      createdAt: today(),
    });
  });
  // Seed some completions for last 7 days
  const days = last7Days();
  days.forEach((d, i) => {
    state.completions[d] = {};
    state.habits.forEach((h, j) => {
      // Stagger completions for realistic look
      state.completions[d][h.id] = (i + j) % 3 !== 0;
    });
  });
  save();
}

// ─── Init ─────────────────────────────────────
// Auth runs first; app init happens inside showApp()
initAuth();