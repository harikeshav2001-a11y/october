// Data layer: local-first entries, optional Firebase sync, demo scenarios.
export const DAYS = 31;
export const emptyEntry = () => ({
  water: 0, sleep: 0, outside: 0, steps: 0, pages: 0, gym: false, run: false, junk: null,
  meals: [false, false, false], grat: ['', '', ''], note: '', noteAt: null, updatedAt: null
});

export function metList(p) {
  return [p.water >= 2.5, p.junk === 'clean', p.sleep >= 7, !!p.gym, p.steps >= 10000, p.outside >= 20,
    p.meals.every(Boolean), p.grat.every(g => g.trim()), p.pages >= 10];
}
export const doneCount = (p) => metList(p).filter(Boolean).length;

const KEY = 'october26:v1';
const FB = '10.12.2';

export function createStore(cfg, onChange) {
  const s = {
    mode: 'local',            // 'local' | 'firebase' | 'demo'
    auth: 'ready',            // 'loading' | 'signin' | 'denied' | 'ready'
    authError: null,
    role: 'a',
    entries: { a: {}, b: {} },
    settings: { swapColors: false },
    online: navigator.onLine,
    forceOffline: false,
    email: null
  };
  let fb = null;
  const timers = {};

  const loadCache = () => {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c) { s.entries = c.entries || s.entries; s.settings = { ...s.settings, ...c.settings }; s.role = c.role || 'a'; }
    } catch (e) { /* private mode or corrupt cache: start empty */ }
  };
  const saveCache = () => {
    if (s.mode === 'demo') return;
    try { localStorage.setItem(KEY, JSON.stringify({ entries: s.entries, settings: s.settings, role: s.role })); } catch (e) { }
  };

  function entry(role, day) { return s.entries[role][day] || null; }

  function update(day, patch) {
    const cur = s.entries[s.role][day] || emptyEntry();
    s.entries[s.role][day] = { ...cur, ...patch, updatedAt: Date.now() };
    saveCache();
    onChange();
    if (fb) {
      clearTimeout(timers[day]);
      timers[day] = setTimeout(() => fb.writeEntry(day, s.entries[s.role][day]), 600);
    }
  }

  function setSwap(v) {
    s.settings.swapColors = v; saveCache(); onChange();
    if (fb) fb.writeSettings(s.settings);
  }

  addEventListener('online', () => { s.online = true; onChange(); });
  addEventListener('offline', () => { s.online = false; onChange(); });

  async function startFirebase() {
    s.mode = 'firebase'; s.auth = 'loading'; onChange();
    const [app, auth, fs] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FB}/firebase-firestore.js`)
    ]);
    const fapp = app.initializeApp(cfg.firebase);
    const fauth = auth.getAuth(fapp);
    await auth.setPersistence(fauth, auth.browserLocalPersistence).catch(() => { });
    const db = fs.initializeFirestore(fapp, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    const couple = fs.doc(db, 'couples', cfg.coupleId);
    const col = fs.collection(couple, 'entries');
    let unsub = [];

    const people = { a: (cfg.people.a || '').toLowerCase(), b: (cfg.people.b || '').toLowerCase() };
    auth.getRedirectResult(fauth).catch(e => { s.authError = e.code || String(e); onChange(); });

    auth.onAuthStateChanged(fauth, (user) => {
      unsub.forEach(u => u()); unsub = [];
      if (!user) { s.auth = 'signin'; s.email = null; onChange(); return; }
      const email = (user.email || '').toLowerCase();
      s.email = email;
      const role = email === people.a ? 'a' : email === people.b ? 'b' : null;
      if (!role) { s.auth = 'denied'; onChange(); return; }
      if (s.role !== role) { s.role = role; }
      s.auth = 'ready'; saveCache(); onChange();
      unsub.push(fs.onSnapshot(col, (snap) => {
        snap.docChanges().forEach(ch => {
          const d = ch.doc.data(); const [r, dayS] = ch.doc.id.split('_'); const day = +dayS;
          if (!s.entries[r] || !day) return;
          const local = s.entries[r][day];
          // never let an older server copy overwrite an edit still waiting in the debounce
          if (r === s.role && local && local.updatedAt > (d.updatedAt || 0)) return;
          s.entries[r][day] = { ...emptyEntry(), ...d };
        });
        saveCache(); onChange();
      }, (e) => { s.authError = e.code || String(e); onChange(); }));
      unsub.push(fs.onSnapshot(couple, (snap) => {
        const d = snap.data();
        if (d && typeof d.swapColors === 'boolean') { s.settings.swapColors = d.swapColors; saveCache(); onChange(); }
      }, () => { }));
    });

    fb = {
      writeEntry: (day, e) => fs.setDoc(fs.doc(col, `${s.role}_${day}`), { ...e, role: s.role, day }).catch(err => { s.authError = err.code || String(err); onChange(); }),
      writeSettings: (st) => fs.setDoc(couple, { swapColors: st.swapColors }, { merge: true }).catch(() => { }),
      signIn: async () => {
        const provider = new auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        s.authError = null;
        try { await auth.signInWithPopup(fauth, provider); }
        catch (e) {
          if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') await auth.signInWithRedirect(fauth, provider);
          else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') { s.authError = e.code || String(e); onChange(); }
        }
      },
      signOut: () => auth.signOut(fauth)
    };
  }

  function init() {
    const q = new URLSearchParams(location.search);
    if (q.get('demo')) { s.mode = 'demo'; loadDemo(s, q.get('demo'), q.get('phone') === 'hers' ? 'b' : 'a'); return; }
    loadCache();
    if (cfg.firebase && cfg.firebase.apiKey) {
      startFirebase().catch(e => {
        // SDK could not load (offline on first open): keep working locally
        s.authError = 'sync-unavailable'; s.auth = 'ready'; s.mode = 'local'; onChange();
      });
    }
  }

  return {
    s, init, entry, update, setSwap,
    signIn: () => fb && fb.signIn(),
    signOut: () => fb && fb.signOut()
  };
}

// ---------- demo scenarios (mirror the Claude Design prototype) ----------
function rnd(d, w, g) { const x = Math.sin(d * 12.9898 + g * 78.233 + (w === 'b' ? 3.7 : 0)) * 43758.5453; return x - Math.floor(x); }
const histMet = (d, w, g) => rnd(d, w, g) < (w === 'b' ? 0.72 : 0.64);
const NOTES = {
  a: ['Your hair looked unreal today. That is the whole note.', 'I stole one of your almonds. Sorry. Not sorry.', 'Tea is on the counter. Drink it warm this time.', 'Proud of you for skipping the samosa. I saw that.', 'You were right about the walk. I felt better after.'],
  b: ['Water before coffee, mister.', 'You snore like a tiny tractor. Still like you.', 'Thank you for folding the laundry without being asked.', 'Early night tonight? I miss you on the couch.', 'Run with me tomorrow. Slow pace, promise.']
};
const GRAT = {
  a: [['Rain on the window', 'Good dal at lunch', 'Her laugh'], ['A quiet commute', 'Finished the chapter', 'Cold water after the gym'], ['Mum called', 'Sunset on the terrace', 'Clean sheets']],
  b: [['Morning light', 'A kind email', 'His bad jokes'], ['The long walk', 'Mango season', 'Slept straight through'], ['My sister', 'A good stretch', 'Quiet dinner together']]
};
function histEntry(d, w, cheats) {
  const ok = (g) => histMet(d, w, g), r = (g) => rnd(d, w, g + 20);
  let junk = 'clean';
  if (!ok(1)) { if (cheats[w] < 2) { junk = 'cheat'; cheats[w]++; } else junk = null; }
  const gl = GRAT[w][(d + (w === 'b' ? 1 : 0)) % 3];
  return {
    ...emptyEntry(),
    water: +(ok(0) ? 2.5 + r(0) * 0.5 : 1.2 + r(0) * 1.1).toFixed(1),
    junk,
    sleep: ok(2) ? 7 + Math.round(r(2) * 4) * 0.25 : 5.5 + Math.round(r(2) * 5) * 0.25,
    gym: ok(3), run: ok(3) && r(3) > 0.4,
    steps: Math.round((ok(4) ? 10000 + r(4) * 3000 : 4000 + r(4) * 5000) / 100) * 100,
    outside: ok(5) ? 20 + Math.round(r(5) * 25) : Math.round(r(5) * 18),
    meals: ok(6) ? [true, true, true] : [true, r(6) > 0.5, false],
    grat: ok(7) ? [...gl] : [gl[0], r(7) > 0.5 ? gl[1] : '', ''],
    pages: ok(8) ? 10 + Math.round(r(8) * 12) : Math.round(r(8) * 8),
    note: NOTES[w][(d + (w === 'b' ? 2 : 0)) % 5], noteAt: new Date(2026, 9, d, 8, 12).getTime(),
    updatedAt: new Date(2026, 9, d, 22, 0).getTime()
  };
}
function loadDemo(s, scn, self) {
  const other = self === 'a' ? 'b' : 'a';
  const today = scn === 'dayOne' ? 1 : scn === 'lastDay' ? 31 : 15;
  const cheats = { a: 0, b: 0 };
  for (let d = 1; d < today; d++) { s.entries.a[d] = histEntry(d, 'a', cheats); s.entries.b[d] = histEntry(d, 'b', cheats); }
  const at = new Date(2026, 9, today, 8, 12).getTime();
  let A = { ...emptyEntry(), water: 1.8, sleep: 7.5, outside: 14, steps: 6200, pages: 6, gym: true, run: false, junk: 'clean', meals: [true, true, false], grat: ['Slow coffee on the balcony', '', ''], note: 'Left the last mango for you. Eat it before I change my mind.', noteAt: at, updatedAt: at };
  let B = { ...emptyEntry(), water: 2.1, sleep: 8, outside: 20, steps: 4300, pages: 10, gym: true, run: true, junk: 'clean', meals: [true, false, false], grat: ['Sunlight at 7am', 'His terrible singing', ''], note: 'Proud of you for the run yesterday. Water first today, ok?', noteAt: at, updatedAt: at };
  const d = { a: A, b: B };
  let otherLogged = true;
  if (scn === 'dayOne') { d[self] = { ...emptyEntry(), water: 0.5, sleep: 7, steps: 800, junk: 'clean', meals: [true, false, false], updatedAt: at }; otherLogged = false; }
  if (scn === 'otherNotLogged') otherLogged = false;
  if (scn === 'allDone') d[self] = { ...d[self], water: 2.6, sleep: 7.5, outside: 24, steps: 10400, pages: 12, gym: true, run: true, junk: 'clean', meals: [true, true, true], grat: ['Slow coffee on the balcony', 'A clean PR at the gym', 'Dinner on the floor, no phones'] };
  if (scn === 'cheatsUsed') {
    for (let x = 1; x < today; x++) if (s.entries[self][x].junk === 'cheat') s.entries[self][x].junk = null;
    [2, 6, 11].forEach(x => { s.entries[self][x].junk = 'cheat'; });
  }
  if (scn === 'night') d[self] = { ...d[self], water: 2.5, sleep: 7.5, outside: 22, steps: 10200, pages: 0, grat: ['', '', ''], meals: [true, true, true] };
  s.entries[self][today] = d[self];
  if (otherLogged) s.entries[other][today] = d[other];
  s.role = self;
  s.forceOffline = scn === 'offline';
  s.demoNow = new Date(2026, 9, today, scn === 'night' ? 21 : 14, scn === 'night' ? 40 : 5);
}
