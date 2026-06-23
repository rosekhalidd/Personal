/* ============================================================
   My health dashboard — logic
   Plain JS, no build step. State persists in localStorage.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Config you can edit in one place ---------- */

  // Foods are simple data objects. Add / edit / remove freely.
  const FOODS = [
    { name: '3 eggs / omelette',     protein_grams: 18, emoji: '🥚' },
    { name: '1 tuna can',            protein_grams: 25, emoji: '🐟' },
    { name: 'Chicken breast piece',  protein_grams: 30, emoji: '🍗' },
    { name: 'Cottage cheese',        protein_grams: 13, emoji: '🧀' },
    { name: 'PB toast',              protein_grams: 7,  emoji: '🥜' },
    { name: 'Seafood (eating out)',  protein_grams: 25, emoji: '🦐' },
    { name: 'Yogurt',                protein_grams: 8,  emoji: '🍦' },
  ];

  const PROTEIN_TARGET = 80;     // grams ≈ enough for the day
  const PROTEIN_PORTIONS = 3;    // "2 of 3 done" framing
  const WATER_TARGET = 2000;     // ml
  const WATER_STEP = 250;        // ml per glass
  const WEEK_WORKOUT_TARGET = 4; // Sat / Sun / Tue / Wed

  const STORAGE_KEY = 'health-dashboard-v1';

  /* ---------- Small helpers ---------- */

  const $ = (sel) => document.querySelector(sel);
  const todayKey = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local

  // Monday-based week id, so "this week" is stable.
  function weekKey(d = new Date()) {
    const t = new Date(d);
    const day = (t.getDay() + 6) % 7; // Mon=0 … Sun=6
    t.setDate(t.getDate() - day);
    return t.toLocaleDateString('en-CA');
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  /* ---------- State shape ---------- */

  function freshDay() {
    return {
      date: todayKey(),
      foods: [],            // array of food indexes tapped
      water: 0,             // ml
      meals: { breakfast: false, lunch: false, dinner: false },
      workoutType: null,    // 'strength' | 'calisthenics' | 'rest'
      workoutDone: false,
      habits: { core: false, stretch: false },
      sleep: null,          // hours
    };
  }

  function defaultState() {
    return {
      today: freshDay(),
      history: {},          // date -> day snapshot (saved before reset)
      week: {},             // weekKey -> { bodyweight, lift1, lift2, note }
      scan: {
        date: '2026-06-17',
        weight: 44.4,
        muscle: 17.7,
        target: 24.4,
        fat: 24.3,
        bmi: 18.2,
        next: '',
      },
      lastModified: 0,      // ms timestamp — used to settle sync conflicts
    };
  }

  // Merge a saved/synced blob onto defaults so new fields never break it.
  function normalize(parsed) {
    if (!parsed || typeof parsed !== 'object') return defaultState();
    const base = defaultState();
    return {
      today: Object.assign(base.today, parsed.today || {}),
      history: parsed.history || {},
      week: parsed.week || {},
      scan: Object.assign(base.scan, parsed.scan || {}),
      lastModified: parsed.lastModified || 0,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn('Could not read saved data, starting fresh.', e);
      return defaultState();
    }
  }

  // Persist to this device only (no timestamp bump, no cloud push).
  function saveLocalOnly() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save data.', e);
    }
  }

  // A real edit: stamp it, persist locally, and schedule a cloud push.
  function save() {
    state.lastModified = Date.now();
    saveLocalOnly();
    schedulePush();
  }

  let state = load();

  /* ---------- Daily reset (saves to history first) ---------- */

  function rolloverIfNewDay() {
    if (state.today.date === todayKey()) return;
    // Snapshot the finished day into history, then start fresh.
    if (state.today.date) {
      state.history[state.today.date] = state.today;
    }
    state.today = freshDay();
    save();
  }

  /* ---------- Renderers ---------- */

  function renderHeader() {
    const opts = { weekday: 'long', day: 'numeric', month: 'short' };
    $('#todayLabel').textContent = new Date().toLocaleDateString('en-GB', opts);
  }

  function renderProtein() {
    const total = state.today.foods.reduce(
      (sum, i) => sum + (FOODS[i] ? FOODS[i].protein_grams : 0), 0);
    const pct = clamp(Math.round((total / PROTEIN_TARGET) * 100), 0, 100);
    const portionsDone = clamp(Math.floor(total / (PROTEIN_TARGET / PROTEIN_PORTIONS)), 0, PROTEIN_PORTIONS);

    $('#proteinFill').style.width = pct + '%';
    $('#proteinPortions').textContent = portionsDone + ' of ' + PROTEIN_PORTIONS + ' done';

    const bar = $('#proteinBar');
    bar.setAttribute('aria-valuenow', String(pct));

    const status = $('#proteinStatus');
    if (total >= PROTEIN_TARGET) status.textContent = 'Enough for today ✓';
    else if (total === 0) status.textContent = "Let's get some protein in";
    else status.textContent = 'On the way — keep tapping';

    // Per-food count badges
    document.querySelectorAll('.food').forEach((btn) => {
      const idx = Number(btn.dataset.food);
      const count = state.today.foods.filter((i) => i === idx).length;
      const badge = btn.querySelector('.food__badge');
      if (count > 0) { badge.textContent = '×' + count; badge.hidden = false; }
      else { badge.hidden = true; }
    });

    // Eaten chips (each removable = undo a tap)
    const eaten = $('#eatenList');
    eaten.innerHTML = '';
    state.today.foods.forEach((idx, position) => {
      const f = FOODS[idx];
      if (!f) return;
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML =
        '<span aria-hidden="true">' + f.emoji + '</span>' +
        '<span>' + f.name + '</span>';
      const undo = document.createElement('button');
      undo.className = 'chip__undo';
      undo.type = 'button';
      undo.setAttribute('aria-label', 'Undo ' + f.name);
      undo.textContent = '×';
      undo.addEventListener('click', () => {
        state.today.foods.splice(position, 1);
        save();
        renderProtein();
      });
      chip.appendChild(undo);
      eaten.appendChild(chip);
    });
  }

  function renderWater() {
    const ml = state.today.water;
    const pct = clamp(Math.round((ml / WATER_TARGET) * 100), 0, 100);
    $('#waterFill').style.width = pct + '%';
    $('#waterCount').textContent = (ml / 1000).toFixed(2) + ' of 2 L';
    $('#waterBar').setAttribute('aria-valuenow', String(ml));
  }

  function renderMeals() {
    document.querySelectorAll('[data-meal]').forEach((btn) => {
      const on = !!state.today.meals[btn.dataset.meal];
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  function renderWorkout() {
    document.querySelectorAll('[data-workout]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(state.today.workoutType === btn.dataset.workout));
    });
    const doneBtn = $('#workoutDone');
    doneBtn.setAttribute('aria-pressed', String(state.today.workoutDone));
    doneBtn.textContent = state.today.workoutDone ? 'Done ✓' : 'Mark done';

    const label = $('#workoutState');
    if (!state.today.workoutType) label.textContent = 'Not set';
    else {
      const name = state.today.workoutType.charAt(0).toUpperCase() + state.today.workoutType.slice(1);
      label.textContent = state.today.workoutDone ? name + ' · done' : name;
    }
  }

  function renderHabits() {
    document.querySelectorAll('[data-habit]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(!!state.today.habits[btn.dataset.habit]));
    });
    $('#sleepHours').value = state.today.sleep == null ? '' : state.today.sleep;
  }

  function renderWeek() {
    // Count workouts done across this week's history + today.
    const wk = weekKey();
    let count = 0;
    const days = Object.assign({}, state.history, { [state.today.date]: state.today });
    Object.keys(days).forEach((d) => {
      if (weekKey(new Date(d + 'T00:00:00')) !== wk) return;
      const day = days[d];
      if (day.workoutDone && day.workoutType && day.workoutType !== 'rest') count++;
    });
    count = clamp(count, 0, 99);

    $('#weekWorkoutCount').textContent = count + ' of ' + WEEK_WORKOUT_TARGET;
    $('#weekWorkoutFill').style.width =
      clamp(Math.round((count / WEEK_WORKOUT_TARGET) * 100), 0, 100) + '%';
    $('#weekWorkoutBar').setAttribute('aria-valuenow', String(count));

    // Week range label (Mon–Sun)
    const start = new Date(wk + 'T00:00:00');
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const f = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    $('#weekRange').textContent = f(start) + ' – ' + f(end);

    const w = state.week[wk] || {};
    $('#bodyweight').value = w.bodyweight != null ? w.bodyweight : '';
    $('#lift1').value = w.lift1 || '';
    $('#lift2').value = w.lift2 || '';
    $('#weekNote').value = w.note || '';

    const trend = $('#bwTrend');
    if (w.bodyweight != null) {
      if (w.bodyweight < 46) trend.textContent = (46 - w.bodyweight).toFixed(1) + ' kg to go ↑';
      else if (w.bodyweight > 48) trend.textContent = 'above range';
      else trend.textContent = 'in range ✓';
    } else trend.textContent = '';
  }

  function renderScan() {
    const s = state.scan;
    const fmtDate = (iso) => iso
      ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    $('#scanDate').textContent = fmtDate(s.date);
    $('#scanWeight').textContent = s.weight + ' kg';
    $('#scanFat').textContent = s.fat + '%';
    $('#scanBmi').textContent = s.bmi;
    $('#muscleNow').textContent = s.muscle + ' kg';

    const pct = clamp(Math.round((s.muscle / s.target) * 100), 0, 100);
    $('#muscleFill').style.width = pct + '%';
    $('#muscleBar').setAttribute('aria-valuenow', String(s.muscle));
    $('#muscleBar').setAttribute('aria-valuemax', String(s.target));
    const gap = (s.target - s.muscle).toFixed(1);
    $('#muscleStatus').textContent = gap > 0 ? '+' + gap + ' kg to target' : 'target reached ✓';

    $('#nextScan').value = s.next || '';

    // Pre-fill the edit form
    $('#editScanDate').value = s.date || '';
    $('#editScanWeight').value = s.weight;
    $('#editScanMuscle').value = s.muscle;
    $('#editScanTarget').value = s.target;
    $('#editScanFat').value = s.fat;
    $('#editScanBmi').value = s.bmi;
  }

  function renderAll() {
    renderHeader();
    renderProtein();
    renderWater();
    renderMeals();
    renderWorkout();
    renderHabits();
    renderWeek();
    renderScan();
  }

  /* ---------- Build food buttons ---------- */

  function buildFoodButtons() {
    const wrap = $('#foodButtons');
    FOODS.forEach((f, i) => {
      const btn = document.createElement('button');
      btn.className = 'food';
      btn.type = 'button';
      btn.dataset.food = String(i);
      btn.setAttribute('aria-label', 'Add ' + f.name);
      btn.innerHTML =
        '<span class="food__emoji" aria-hidden="true">' + f.emoji + '</span>' +
        '<span class="food__name">' + f.name + '</span>' +
        '<span class="food__badge" hidden></span>';
      btn.addEventListener('click', () => {
        state.today.foods.push(i);
        save();
        renderProtein();
      });
      wrap.appendChild(btn);
    });
  }

  /* ---------- Wire up interactions ---------- */

  function wireEvents() {
    // Water
    $('#addGlass').addEventListener('click', () => {
      state.today.water = clamp(state.today.water + WATER_STEP, 0, 10000);
      save(); renderWater();
    });
    $('#undoWater').addEventListener('click', () => {
      state.today.water = clamp(state.today.water - WATER_STEP, 0, 10000);
      save(); renderWater();
    });

    // Meals
    document.querySelectorAll('[data-meal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.meal;
        state.today.meals[m] = !state.today.meals[m];
        save(); renderMeals();
      });
    });

    // Workout type
    document.querySelectorAll('[data-workout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.workout;
        state.today.workoutType = (state.today.workoutType === t) ? null : t;
        save(); renderWorkout();
      });
    });
    $('#workoutDone').addEventListener('click', () => {
      state.today.workoutDone = !state.today.workoutDone;
      save(); renderWorkout(); renderWeek();
    });

    // Habits
    document.querySelectorAll('[data-habit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = btn.dataset.habit;
        state.today.habits[h] = !state.today.habits[h];
        save(); renderHabits();
      });
    });

    // Sleep
    const sleepInput = $('#sleepHours');
    const setSleep = (v) => {
      state.today.sleep = (v === '' || v == null || isNaN(v)) ? null : clamp(Number(v), 0, 14);
      save();
    };
    sleepInput.addEventListener('input', () => setSleep(sleepInput.value));
    $('#sleepMinus').addEventListener('click', () => {
      const cur = state.today.sleep == null ? 7 : state.today.sleep;
      state.today.sleep = clamp(cur - 0.5, 0, 14);
      save(); renderHabits();
    });
    $('#sleepPlus').addEventListener('click', () => {
      const cur = state.today.sleep == null ? 7 : state.today.sleep;
      state.today.sleep = clamp(cur + 0.5, 0, 14);
      save(); renderHabits();
    });

    // Week fields (persist per week)
    const wk = () => weekKey();
    const ensureWeek = () => (state.week[wk()] = state.week[wk()] || {});
    $('#saveBodyweight').addEventListener('click', () => {
      const v = $('#bodyweight').value;
      ensureWeek().bodyweight = v === '' ? null : Number(v);
      save(); renderWeek();
    });
    $('#lift1').addEventListener('input', (e) => { ensureWeek().lift1 = e.target.value; save(); });
    $('#lift2').addEventListener('input', (e) => { ensureWeek().lift2 = e.target.value; save(); });
    $('#weekNote').addEventListener('input', (e) => { ensureWeek().note = e.target.value; save(); });

    // Next scan reminder
    $('#nextScan').addEventListener('change', (e) => {
      state.scan.next = e.target.value; save();
    });

    // Edit scan
    $('#saveScan').addEventListener('click', () => {
      const num = (id, fallback) => {
        const v = $(id).value;
        return v === '' ? fallback : Number(v);
      };
      state.scan.date = $('#editScanDate').value || state.scan.date;
      state.scan.weight = num('#editScanWeight', state.scan.weight);
      state.scan.muscle = num('#editScanMuscle', state.scan.muscle);
      state.scan.target = num('#editScanTarget', state.scan.target);
      state.scan.fat = num('#editScanFat', state.scan.fat);
      state.scan.bmi = num('#editScanBmi', state.scan.bmi);
      save(); renderScan();
      $('.edit-scan').removeAttribute('open');
    });

    // Reset today (saves to history first)
    $('#resetToday').addEventListener('click', () => {
      if (!confirm('Reset today? This saves today to history first.')) return;
      if (state.today.date) state.history[state.today.date] = state.today;
      state.today = freshDay();
      save(); renderAll();
    });

    // If the tab was left open across midnight, roll over on focus.
    window.addEventListener('focus', () => {
      rolloverIfNewDay();
      renderAll();
    });
  }

  /* ============================================================
     Cloud sync (Supabase) — optional. The app works fully without
     it; signing in just keeps phone + laptop in sync. Config lives
     in config.js so the keys are easy to set in one place.
     ============================================================ */

  const cfg = window.HEALTH_CONFIG || {};
  let supa = null;       // Supabase client
  let user = null;       // signed-in user, or null
  let pushTimer = null;  // debounce timer for pushes
  let channel = null;    // realtime subscription
  let adopting = false;  // guard so adopting cloud data doesn't re-push

  function syncConfigured() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  }

  function setSyncStatus(text, on) {
    const bar = $('#syncBar');
    const status = $('#syncStatus');
    const btn = $('#syncBtn');
    if (!bar) return;
    bar.hidden = false;
    status.textContent = text;
    bar.classList.toggle('sync-bar--on', !!on);
    btn.textContent = on ? 'Sign out' : 'Sign in to sync';
  }

  async function initCloud() {
    if (!syncConfigured()) return; // leave the sync bar hidden
    supa = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    wireAuthUI();
    const { data } = await supa.auth.getSession();
    await handleSession(data.session);
    supa.auth.onAuthStateChange((_event, session) => { handleSession(session); });
  }

  async function handleSession(session) {
    const next = session ? session.user : null;
    const changed = (next && next.id) !== (user && user.id);
    user = next;
    if (user) {
      setSyncStatus('Synced · ' + user.email, true);
      closeAuthModal();
      if (changed) { await pullCloud(); subscribeCloud(); }
    } else {
      setSyncStatus('Not syncing — this device only', false);
      if (channel) { supa.removeChannel(channel); channel = null; }
    }
  }

  // Adopt a cloud blob into local state and re-render.
  function adopt(blob) {
    adopting = true;
    state = normalize(blob);
    adopting = false;
    rolloverIfNewDay();
    saveLocalOnly();
    renderAll();
  }

  async function pullCloud() {
    if (!user || !supa) return;
    const { data, error } = await supa
      .from('dashboards').select('data, updated_at')
      .eq('user_id', user.id).maybeSingle();
    if (error) { console.warn('Pull failed', error.message); return; }

    if (data && data.data && Object.keys(data.data).length) {
      const cloudTime = data.data.lastModified || 0;
      // Newer side wins. Tie goes to cloud so a fresh device adopts it.
      if (cloudTime >= (state.lastModified || 0)) adopt(data.data);
      else pushCloud();
    } else {
      pushCloud(); // no cloud copy yet — seed it from this device
    }
  }

  function schedulePush() {
    if (!user || !supa || adopting) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushCloud, 700);
  }

  async function pushCloud() {
    if (!user || !supa) return;
    const { error } = await supa.from('dashboards').upsert(
      { user_id: user.id, data: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' });
    if (error) console.warn('Push failed', error.message);
  }

  function subscribeCloud() {
    if (!user || !supa) return;
    if (channel) supa.removeChannel(channel);
    channel = supa.channel('dash-' + user.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dashboards', filter: 'user_id=eq.' + user.id },
        (payload) => {
          const blob = payload.new && payload.new.data;
          if (!blob) return;
          // Only adopt if the other device's copy is genuinely newer.
          if ((blob.lastModified || 0) > (state.lastModified || 0)) adopt(blob);
        })
      .subscribe();
  }

  /* ---------- Auth modal wiring ---------- */

  function openAuthModal() {
    const m = $('#authModal');
    m.hidden = false;
    $('#authStepEmail').hidden = false;
    $('#authMsg').textContent = "Enter your email and we'll send a sign-in link.";
    $('#authEmail').focus();
  }
  function closeAuthModal() {
    const m = $('#authModal');
    if (m) m.hidden = true;
  }

  function wireAuthUI() {
    $('#syncBtn').addEventListener('click', async () => {
      if (user) { await supa.auth.signOut(); }
      else { openAuthModal(); }
    });
    $('#authCancel').addEventListener('click', closeAuthModal);
    $('#authModal').addEventListener('click', (e) => {
      if (e.target === $('#authModal')) closeAuthModal();
    });

    $('#authSend').addEventListener('click', async () => {
      const email = $('#authEmail').value.trim();
      if (!email) { $('#authMsg').textContent = 'Please enter your email.'; return; }
      $('#authSend').disabled = true;
      $('#authMsg').textContent = 'Sending…';
      // Come back to this exact page after clicking the email link.
      const redirect = window.location.origin + window.location.pathname;
      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirect },
      });
      $('#authSend').disabled = false;
      if (error) { $('#authMsg').textContent = 'Could not send: ' + error.message; return; }
      $('#authStepEmail').hidden = true;
      $('#authMsg').textContent =
        'Link sent. Open your email on this device and tap "Sign in" — you\'ll come right back here, synced.';
    });
  }

  /* ---------- Boot ---------- */

  rolloverIfNewDay();
  buildFoodButtons();
  wireEvents();
  renderAll();
  initCloud();
})();
