import { createStore, emptyEntry, metList, doneCount } from './store.js';

const cfg = window.OCTOBER_CONFIG || { firebase: null, people: { a: '', b: '' }, coupleId: 'october-2026' };
const root = document.getElementById('app');

// ---------- constants ----------
const CORAL = 'oklch(0.74 0.13 40)', TEAL = 'oklch(0.76 0.1 190)';
const MONO = "'Geist Mono',monospace";
const WDS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GOALS = ['Water', 'No junk', 'Sleep', 'Gym', 'Steps', 'Outside', 'Phone-free meals', 'Gratitude', 'Reading'];
const SCRUB = { water: [0, 3.5, 0.1, 'y'], sleep: [4, 10, 0.25, 'x'], outside: [0, 40, 1, 'x'], steps: [0, 15000, 100, 'x'] };
const LBL = `font-family:${MONO};font-size:10.5px;letter-spacing:.1em;color:#8a8a90`;
const HDR_BTN = `display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:999px;border:1px solid #2a2a2e;background:#161618;color:#c8c8cc;font-family:${MONO};font-size:11px;letter-spacing:.08em;cursor:pointer;transition:transform .15s`;
const TOP = 'max(60px, calc(env(safe-area-inset-top) + 18px))';
const BOTTOM = 'calc(56px + env(safe-area-inset-bottom))';

const clamp = (v) => Math.max(0, Math.min(1, v));
const fr = (v, a, b) => clamp((v - a) / (b - a));
const words = (t) => t.trim() ? t.trim().split(/\s+/).length : 0;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- state ----------
const ui = { pane: 0, dragX: null, drag: null, gx: 50, gy: 50, sheetDay: null, sheetOpen: false };
let pending = false;
// render on the next frame; the timer is a fallback for when the browser pauses frames
const schedule = () => {
  if (pending) return; pending = true;
  const run = () => { if (!pending) return; pending = false; render(); };
  requestAnimationFrame(run); setTimeout(run, 120);
};
const store = createStore(cfg, schedule);
const S = store.s;

function now() {
  if (S.demoNow) return S.demoNow;
  const q = new URLSearchParams(location.search).get('now');
  return q ? new Date(q) : new Date();
}
function octDay(dt) {
  const y = dt.getFullYear(), m = dt.getMonth();
  if (y < 2026 || (y === 2026 && m < 9)) return 0;
  if (y > 2026 || m > 9) return 32;
  return dt.getDate();
}
const wd = (d) => new Date(2026, 9, d).getDay();
const weekStart = (d) => Math.max(1, d - (wd(d) + 6) % 7);
const E = (w, d) => store.entry(w, d);
const P = (w, d) => E(w, d) || emptyEntry();
function weekSum(w, t, f) { let n = 0; for (let d = weekStart(t); d <= t; d++) { const e = E(w, d); if (e) n += f(e); } return n; }
function monthCheats(w, t) { let n = 0; for (let d = 1; d <= Math.min(t, 31); d++) { const e = E(w, d); if (e && e.junk === 'cheat') n++; } return n; }
const logged = (w, d) => !!(E(w, d) && E(w, d).updatedAt);
const ids = () => { const self = S.role; return { self, other: self === 'a' ? 'b' : 'a' }; };
const col = (w) => ((w === 'a') !== !!S.settings.swapColors ? CORAL : TEAL);
const timeStr = (ms) => { const t = new Date(ms); let h = t.getHours(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(t.getMinutes()).padStart(2, '0')} ${ap}`; };

// ---------- small render helpers ----------
const span = (t, c) => `<span style="color:${c}">${esc(t)}</span>`;
function pill(label, on, c, act, disabled) {
  return `<button data-act="pill" data-k="${act}" ${disabled ? 'disabled' : ''} style="flex:1;min-width:0;height:40px;border-radius:999px;padding:0 10px;font-family:Geist,system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:-0.01em;background:${on ? c : 'transparent'};color:${on ? '#0b0b0c' : '#c8c8cc'};border:1px solid ${on ? c : '#333337'};opacity:${disabled ? 0.35 : 1};cursor:${disabled ? 'not-allowed' : 'pointer'};transition:background .18s, color .18s, border-color .18s, transform .12s;white-space:nowrap">${esc(label)}</button>`;
}
function glow(key, c) {
  const on = ui.drag === key;
  return `<div class="glow" style="position:absolute;inset:0;pointer-events:none;opacity:${on ? 1 : 0};transition:${on ? 'opacity .15s ease-out' : 'opacity .7s ease-out'};background:radial-gradient(circle at ${ui.gx}% ${ui.gy}%, color-mix(in oklch, ${c} 70%, transparent) 0%, color-mix(in oklch, ${c} 22%, transparent) 30%, transparent 65%)"></div>`;
}
function ticks(f, c, n, tgt) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1), isT = Math.abs(x - tgt) < 0.5 / (n - 1);
    h += `<span style="flex:none;width:${isT ? 2 : 1.5}px;height:${isT ? 22 : (i % 5 === 0 ? 14 : 8)}px;border-radius:1px;background:${x <= f + 0.001 ? c : (isT ? '#8a8a90' : '#333337')};transition:background .12s"></span>`;
  }
  return h;
}
const head = (f) => `<span class="head" style="position:absolute;left:calc(${f * 100}% - 1px);bottom:-3px;width:2px;height:30px;background:#f2f2f0;border-radius:2px;pointer-events:none;transition:${ui.drag ? 'none' : 'left .3s ease'}"></span>`;
const tint = (c, pad = '14px 16px') => `background:color-mix(in oklch, ${c} 14%, #141416);border-radius:18px;padding:${pad};display:flex;flex-direction:column;gap:8px;transition:background .3s`;

// ---------- Today ----------
function todayPane(today) {
  const { self, other } = ids();
  const p = P(self, today), o = P(other, today), ol = logged(other, today);
  const SC = col(self), OC = col(other);
  const oName = other === 'b' ? 'her' : 'him', oSub = other === 'b' ? 'She' : 'He', oPos = other === 'b' ? 'her' : 'his';
  const n0 = now(), night = n0.getHours() >= 21;
  const DM = '#6b6b70', WT = '#f2f2f0';
  const oTxt = (v) => ol ? v : '—';
  const ot = `display:flex;align-items:center;gap:6px;font-family:${MONO};font-size:11px;color:${ol ? OC : '#55555a'}`;
  const od = `<span style="width:6px;height:6px;border-radius:50%;flex:none;background:${ol ? OC : 'transparent'};box-shadow:${ol ? 'none' : `inset 0 0 0 1px ${OC}`}"></span>`;
  const oRow = (v, extra = '') => `<div style="${ot}${extra}">${od}<span style="white-space:nowrap">${oName} ${esc(v)}</span></div>`;

  // summary sentence
  const met = metList(p), n = met.filter(Boolean).length, on = doneCount(o), left = Math.max(0, 2.5 - p.water);
  let sum = '';
  if (today === 1) sum += span('Day one. ', WT);
  if (today === 31) sum += span('Last day. ', WT);
  if (night) sum += span('Evening check-in. ', WT);
  if (n === 9) sum += span('All 9 closed', WT) + span(', go be smug somewhere quiet', DM);
  else {
    sum += span("You've closed ", DM) + span(`${n} of 9`, WT);
    if (night) sum += span('. Still open: ', DM) + span(GOALS.filter((_, i) => !met[i]).map(g => g.toLowerCase()).join(', '), WT);
    else if (left > 0.01) sum += span(', with ', DM) + span(`${left.toFixed(1)} L`, WT) + span(' of water to go', DM);
  }
  if (!ol) sum += span(`. ${oSub} hasn't logged yet today`, DM) + span(', a note might help.', DM);
  else {
    const hl = o.pages >= 10 ? `read ${oPos} 10 pages` : o.outside >= 20 ? `had ${oPos} 20 minutes of sun` : o.water >= 2.5 ? `finished ${oPos} water` : null;
    sum += span(`. ${oSub}'s on `, DM) + span(`${on} of 9`, OC);
    if (hl) sum += span(' and has already ', DM) + span(hl, OC);
    sum += span('.', DM);
  }

  const wN = words(p.note);
  const cheatsUsed = monthCheats(self, today), cheatsOut = cheatsUsed >= 3 && p.junk !== 'cheat';
  const gymWk = weekSum(self, today, e => e.gym ? 1 : 0), runWk = weekSum(self, today, e => e.run ? 1 : 0);
  const pagesWk = weekSum(self, today, e => e.pages || 0);
  const oGymWk = weekSum(other, today, e => e.gym ? 1 : 0);
  const mealsN = p.meals.filter(Boolean).length, gratN = p.grat.filter(g => g.trim()).length;
  const oBar = (f) => `<div style="height:100%;width:${ol ? f * 100 : 0}%;background:${OC};border-radius:2px;transition:width .4s ease"></div>`;
  const sl = fr(p.sleep, 4, 10), ou = fr(p.outside, 0, 40), st = fr(p.steps, 0, 15000);
  const ring = (on) => `box-shadow:${on ? `inset 0 0 0 1px ${SC}` : 'none'};transition:box-shadow .3s`;
  const wheel = [-2, -1, 0, 1, 2].map(k => {
    const v = p.pages + k, a = Math.abs(k), h = a === 0 ? 46 : a === 1 ? 24 : 18;
    return `<span style="display:block;height:${h}px;line-height:${h}px;font-size:${a === 0 ? 42 : a === 1 ? 20 : 14}px;font-weight:500;letter-spacing:-0.04em;font-variant-numeric:tabular-nums;color:${a === 0 && p.pages >= 10 ? SC : '#f2f2f0'};opacity:${a === 0 ? 1 : a === 1 ? 0.35 : 0.12};filter:${a === 2 ? 'blur(1px)' : 'none'}">${v < 0 ? '&nbsp;' : String(v).padStart(2, '0')}</span>`;
  }).join('');

  const strip = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1; let fs = 0, fo = 0;
    if (d <= today) { fs = E(self, d) ? doneCount(E(self, d)) / 9 : 0; fo = logged(other, d) ? doneCount(E(other, d)) / 9 : 0; }
    const bar = (f, c) => `<span style="height:3px;width:${f * 100}%;background:${c};border-radius:2px;transition:width .4s ease"></span>`;
    return `<div style="flex:1;min-width:0;height:32px;border-radius:4px;background:${d > today ? '#111113' : '#1a1a1d'};box-sizing:border-box;border:1px solid ${d === today ? '#f2f2f0' : 'transparent'};display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:0 1.5px 3px">${bar(fs, SC)}${bar(fo, OC)}</div>`;
  }).join('');

  const offline = !S.online || S.forceOffline;
  const dotIcon = [1, 1, 0, 1, 0, 0, 0, 0, 0].map(b => `<span style="width:3px;height:3px;border-radius:50%;background:${b ? '#f2f2f0' : '#55555a'}"></span>`).join('');

  return `
  <div class="scroll pane" style="flex:0 0 50%;min-width:0;height:100%;overflow-y:auto;overflow-x:hidden">
    <div style="padding:${TOP} 16px 0;display:flex;align-items:flex-end;justify-content:space-between">
      <div style="display:flex;align-items:baseline;gap:2px">
        <span style="font-size:58px;font-weight:500;letter-spacing:-0.045em;line-height:.9">${String(today).padStart(2, '0')}</span>
        <span style="font-size:58px;font-weight:500;letter-spacing:-0.045em;line-height:.9;color:#34343a">/31</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <button data-act="goCal" style="${HDR_BTN}"><span style="display:grid;grid-template-columns:repeat(3,3px);gap:2px">${dotIcon}</span>CALENDAR</button>
        <span style="font-family:${MONO};font-size:11px;letter-spacing:.06em;color:#8a8a90">${WDS[wd(today)]} · OCT ${today}${night ? ' · ' + timeStr(n0.getTime()).toUpperCase() : ''}</span>
      </div>
    </div>
    ${offline ? `<div style="margin:14px 16px 0;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#161618;font-family:${MONO};font-size:10.5px;letter-spacing:.06em;color:#a0a0a6"><span style="width:6px;height:6px;border-radius:50%;background:#8a8a90"></span>OFFLINE · SAVED ON THIS PHONE, SYNCS WHEN BACK</div>` : ''}
    <div style="padding:0 16px ${BOTTOM};display:flex;flex-direction:column;gap:10px">
      <p style="margin:16px 0 8px;font-size:21px;line-height:1.28;letter-spacing:-0.015em;font-weight:500;text-wrap:pretty">${sum}</p>

      <div style="${tint(OC)}">
        <div style="display:flex;justify-content:space-between;${LBL};text-transform:uppercase"><span style="white-space:nowrap">From ${oName}</span><span>${o.note && ol ? esc(o.noteAt ? timeStr(o.noteAt) : '') : ''}</span></div>
        <div style="font-size:15px;line-height:1.4;text-wrap:pretty;color:${o.note ? '#f2f2f0' : '#6b6b70'}">${o.note ? esc(o.note) : `No note from ${oName} yet today.`}</div>
      </div>
      <div style="${tint(SC)}">
        <div style="display:flex;justify-content:space-between;${LBL};text-transform:uppercase"><span style="white-space:nowrap">Your note for ${oName}</span><span style="white-space:nowrap"><span style="color:${wN >= 90 ? SC : '#8a8a90'}">${wN >= 100 ? '100/100 · limit' : `${wN}/100 words`}</span></span></div>
        <textarea data-input="note" data-value="${esc(p.note)}" rows="3" placeholder="Leave ${oName} something small for today" style="background:transparent;border:0;outline:none;resize:none;color:#f2f2f0;font-family:Geist,system-ui,sans-serif;font-size:15px;line-height:1.4;padding:0;margin:0"></textarea>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
        <div data-scrub="water" style="grid-row:span 2;position:relative;overflow:hidden;background:#161618;border-radius:22px;min-height:250px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ns-resize">
          <div class="fill" style="position:absolute;left:0;right:0;bottom:0;height:${fr(p.water, 0, 3.5) * 100}%;background:color-mix(in oklch, ${SC} 24%, #161618);border-top:2px solid ${SC};transition:${ui.drag === 'water' ? 'none' : 'height .45s cubic-bezier(.2,.8,.2,1)'}"></div>
          <div style="position:absolute;right:14px;width:28px;bottom:71.4%;border-top:1px dashed #55555a"></div>
          ${glow('water', SC)}
          <div style="position:relative;padding:14px 16px;display:flex;flex-direction:column;height:100%;box-sizing:border-box">
            <div style="${LBL}">WATER</div>
            <div style="margin-top:4px;display:flex;align-items:baseline;gap:3px"><span style="font-size:48px;font-weight:500;letter-spacing:-0.045em;font-variant-numeric:tabular-nums">${p.water.toFixed(1)}</span><span style="font-size:17px;color:#6b6b70">/2.5 L</span></div>
            <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px">
              ${oRow(oTxt(`${o.water.toFixed(1)} L`))}
              <div style="height:3px;background:#2a2a2e;border-radius:2px;overflow:hidden">${oBar(fr(o.water, 0, 2.5))}</div>
            </div>
          </div>
        </div>

        <div style="background:#161618;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;${LBL}"><span>NO JUNK</span><span style="white-space:nowrap">${cheatsOut ? 'no cheats left' : `cheats ${cheatsUsed}/3`}</span></div>
          <div style="display:flex;gap:6px">${pill('Clean', p.junk === 'clean', SC, 'junk:clean')}${pill('Cheat', p.junk === 'cheat', SC, 'junk:cheat', cheatsOut)}</div>
          ${oRow(ol ? (o.junk === 'cheat' ? 'had a cheat meal' : 'clean so far') : '—')}
        </div>

        <div data-scrub="sleep" style="position:relative;overflow:hidden;background:#161618;border-radius:22px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ew-resize">
          ${glow('sleep', SC)}
          <div style="position:relative;padding:14px;display:flex;flex-direction:column;gap:8px">
            <div style="${LBL}">SLEEP</div>
            <div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:30px;font-weight:500;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">${p.sleep}</span><span style="font-size:14px;color:#6b6b70">hrs</span></div>
            <div data-ruler="1" style="position:relative;height:24px;display:flex;align-items:flex-end;justify-content:space-between">${ticks(sl, SC, 25, 0.5)}${head(sl)}</div>
            ${oRow(oTxt(`${o.sleep} hrs`))}
          </div>
        </div>
      </div>

      <div data-scrub="outside" style="position:relative;overflow:hidden;background:#161618;border-radius:22px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ew-resize">
        ${glow('outside', SC)}
        <div style="position:relative;padding:14px 16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:8px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <div style="${LBL}">OUTSIDE</div>
              <div style="display:flex;align-items:baseline;gap:3px"><span style="font-size:40px;font-weight:500;letter-spacing:-0.045em;font-variant-numeric:tabular-nums;line-height:1">${p.outside}</span><span style="font-size:16px;color:#6b6b70">/20 min</span></div>
            </div>
            ${oRow(oTxt(`${o.outside} min`))}
          </div>
          <div data-ruler="1" style="position:relative;height:28px;display:flex;align-items:flex-end;justify-content:space-between">${ticks(ou, SC, 41, 0.5)}${head(ou)}</div>
          <div style="height:3px;background:#2a2a2e;border-radius:2px;overflow:hidden">${oBar(fr(o.outside, 0, 40))}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:10px">
        <div style="background:#161618;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;${LBL}"><span>GYM</span><span style="white-space:nowrap">${gymWk >= 4 ? 'week done' : `${gymWk}/4 this wk`}</span></div>
          <div style="display:flex;gap:6px">${pill('Gym', p.gym, SC, 'gym')}${pill('Run', p.run, SC, 'run')}</div>
          <div style="font-family:${MONO};font-size:11px;color:#6b6b70">${runWk >= 3 ? `runs ${runWk}/3 · done` : `runs ${runWk}/3 this wk`}</div>
          ${oRow(ol ? `${o.gym ? 'gym' : 'rest'}${o.run ? ' + run' : ''} · ${oGymWk}/4` : '—')}
        </div>
        <div data-scrub="steps" style="position:relative;overflow:hidden;background:#161618;border-radius:22px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ew-resize">
          ${glow('steps', SC)}
          <div style="position:relative;padding:14px;display:flex;flex-direction:column;gap:8px">
            <div style="${LBL}">STEPS</div>
            <div style="display:flex;align-items:baseline;gap:3px"><span style="font-size:30px;font-weight:500;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">${(p.steps / 1000).toFixed(1)}k</span><span style="font-size:14px;color:#6b6b70">/10k</span></div>
            <div data-ruler="1" style="position:relative;height:24px;display:flex;align-items:flex-end;justify-content:space-between">${ticks(st, SC, 16, 2 / 3)}${head(st)}</div>
            ${oRow(oTxt(`${(o.steps / 1000).toFixed(1)}k`))}
          </div>
        </div>
      </div>

      <div style="background:#161618;border-radius:22px;padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;${LBL}"><span>PHONE-FREE MEALS</span><span style="white-space:nowrap">${mealsN}/3</span></div>
        <div style="display:flex;gap:6px">${['Breakfast', 'Lunch', 'Dinner'].map((m, i) => pill(m, p.meals[i], SC, `meal:${i}`)).join('')}</div>
        ${oRow(oTxt(`${o.meals.filter(Boolean).length}/3 phone-free`))}
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);gap:10px">
        <div data-wheel="1" style="background:#161618;border-radius:22px;${ring(night && p.pages < 10)};position:relative;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ns-resize">
          ${glow('pages', SC)}
          <div style="position:relative;padding:14px;display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;justify-content:space-between;${LBL}"><span>READ</span><span style="white-space:nowrap">${pagesWk}/50 wk</span></div>
            <div style="display:flex;flex-direction:column;align-items:center;margin:2px 0">${wheel}</div>
            <div style="text-align:center;font-family:${MONO};font-size:10.5px;letter-spacing:.08em;color:#6b6b70">PAGES · /10</div>
            ${oRow(oTxt(`${o.pages} pages`), ';justify-content:center;margin-top:4px')}
          </div>
        </div>
        <div style="background:#161618;border-radius:22px;${ring(night && gratN < 3)};padding:14px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;${LBL}"><span>GRATITUDE</span><span style="white-space:nowrap">${gratN}/3</span></div>
          ${p.grat.map((g, i) => `<div style="display:flex;align-items:baseline;gap:8px;border-bottom:1px solid #26262a;padding-bottom:6px"><span style="font-family:${MONO};font-size:10.5px;color:#55555a">0${i + 1}</span><input data-input="grat" data-i="${i}" data-value="${esc(g)}" placeholder="Tonight…" maxlength="80" enterkeyhint="next" style="flex:1;min-width:0;background:transparent;border:0;outline:none;color:#f2f2f0;font-family:Geist,system-ui,sans-serif;font-size:14px;padding:0"></div>`).join('')}
          ${oRow(oTxt(`${o.grat.filter(g => g.trim()).length}/3 written`))}
        </div>
      </div>

      <div data-act="goCal" style="margin-top:8px;display:flex;flex-direction:column;gap:10px;cursor:pointer">
        <div style="display:flex;justify-content:space-between;${LBL}"><span>OCTOBER →</span><span style="display:flex;gap:10px"><span style="color:${SC}">● you</span><span style="color:${OC}">● ${oName}</span></span></div>
        <div style="display:flex;gap:3px">${strip}</div>
      </div>
    </div>
  </div>`;
}

// ---------- Calendar ----------
function calendarPane(today, finished) {
  const { self, other } = ids();
  const SC = col(self), OC = col(other), oName = other === 'b' ? 'her' : 'him';
  const DM = '#6b6b70', WT = '#f2f2f0';
  const t = Math.min(today, 31);
  const dotSt = (ok, future, c) => `<span style="width:4px;height:4px;border-radius:50%;background:${ok ? c : future ? 'transparent' : '#2c2c30'};box-shadow:${future ? 'inset 0 0 0 1px #26262a' : 'none'}"></span>`;
  let cells = '';
  const lead = (wd(1) + 6) % 7;
  for (let i = 0; i < lead; i++) cells += `<span style="visibility:hidden"></span>`;
  for (let d = 1; d <= 31; d++) {
    const future = d > today, isToday = d === today, isSel = d === ui.sheetDay;
    const ms = E(self, d) ? metList(E(self, d)) : Array(9).fill(false);
    const mo = logged(other, d) ? metList(E(other, d)) : Array(9).fill(false);
    cells += `<button class="cal-cell" data-act="cell" data-day="${d}" ${future ? 'disabled' : ''} style="height:54px;border-radius:10px;border:1px solid ${isSel ? '#f2f2f0' : isToday ? '#8a8a90' : 'transparent'};background:${future ? '#0f0f11' : '#161618'};padding:6px;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;cursor:${future ? 'default' : 'pointer'};box-sizing:border-box;min-width:0;transition:transform .12s, border-color .2s">
      <span style="font-family:${MONO};font-size:10.5px;color:${future ? '#3a3a3e' : isToday ? '#f2f2f0' : '#a0a0a6'};text-align:left;padding-left:1px">${d}</span>
      <span style="display:flex;gap:3px;justify-content:center">
        <span style="display:grid;grid-template-columns:repeat(3,4px);gap:1.5px">${ms.map(ok => dotSt(ok && !future, future, SC)).join('')}</span>
        <span style="display:grid;grid-template-columns:repeat(3,4px);gap:1.5px">${mo.map(ok => dotSt(ok && !future, future, OC)).join('')}</span>
      </span></button>`;
  }
  let bothWater = 0;
  for (let d = 1; d < Math.min(today, 32); d++) if (P(self, d).water >= 2.5 && P(other, d).water >= 2.5) bothWater++;
  const myCheats = monthCheats(self, t), oCheats = monthCheats(other, t);
  const cheatsLeft = (3 - Math.min(3, myCheats)) + (3 - Math.min(3, oCheats));
  let cal;
  if (finished) {
    let closed = 0; for (let d = 1; d <= 31; d++) { closed += E(self, d) ? doneCount(E(self, d)) : 0; closed += logged(other, d) ? doneCount(E(other, d)) : 0; }
    cal = span("October's done. ", WT) + span('Between you, ', DM) + span(`${closed} of 558`, WT) + span(' goals closed, and water kept together on ', DM) + span(`${bothWater} days`, WT) + span('.', DM);
  } else if (today === 1) cal = span('Day one. ', WT) + span('The grid fills in as you both go. Nothing to catch up on.', DM);
  else if (today === 31) cal = span('Last day. ', WT) + span('You both kept water on ', DM) + span(`${bothWater} days`, WT) + span('. One more and October is done.', DM);
  else cal = span('You both kept water on ', DM) + span(`${bothWater} days`, WT) + span(', and there ', DM) + span(cheatsLeft === 1 ? 'is 1 cheat meal' : `are ${cheatsLeft} cheat meals`, WT) + span(' left between you.', DM);

  const cs = (c) => `font-family:${MONO};font-size:13px;color:${c};text-align:right`;
  const wk = (w, f) => weekSum(w, t, f);
  const counters = [
    ['Gym this week', `${wk(self, e => e.gym ? 1 : 0)}/4`, `${wk(other, e => e.gym ? 1 : 0)}/4`],
    ['Runs this week', `${wk(self, e => e.run ? 1 : 0)}/3`, `${wk(other, e => e.run ? 1 : 0)}/3`],
    ['Pages this week', `${wk(self, e => e.pages || 0)}/50`, `${wk(other, e => e.pages || 0)}/50`],
    ['Cheat meals', `${Math.min(3, myCheats)}/3`, `${Math.min(3, oCheats)}/3`]
  ].map(([name, s, o]) => `<div style="display:grid;grid-template-columns:1fr 64px 64px;align-items:center;padding:10px 0;border-bottom:1px solid #222226;font-size:14px"><span style="color:#c8c8cc">${name}</span><span style="${cs(SC)}">${s}</span><span style="${cs(OC)}">${o}</span></div>`).join('');

  const legendDots = Array.from({ length: 9 }, (_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i === 0 ? '#f2f2f0' : '#44444a'}"></span>`).join('');
  const syncLine = S.mode === 'firebase'
    ? (S.authError ? `SYNC ISSUE · ${esc(S.authError).toUpperCase()}` : `SYNCING · ${esc(S.email || '')}`)
    : S.mode === 'demo' ? 'DEMO DATA · NOTHING IS SAVED' : (S.authError === 'sync-unavailable' ? 'COULD NOT REACH SYNC · SAVED ON THIS PHONE' : 'THIS PHONE ONLY · NOT SYNCING');

  return `
  <div class="scroll pane" style="flex:0 0 ${finished ? '100%' : '50%'};min-width:0;height:100%;overflow-y:auto;overflow-x:hidden">
    <div style="padding:${TOP} 16px ${BOTTOM};display:flex;flex-direction:column;gap:18px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between">
        <div style="font-size:44px;font-weight:500;letter-spacing:-0.045em;line-height:.95">October</div>
        ${finished ? '' : `<button data-act="goToday" style="${HDR_BTN}">← TODAY</button>`}
      </div>
      <p style="margin:0;font-size:19px;line-height:1.3;font-weight:500;letter-spacing:-0.01em;text-wrap:pretty">${cal}</p>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;font-family:${MONO};font-size:10.5px;color:#55555a;text-align:center"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${cells}</div>
      </div>
      <div style="background:#161618;border-radius:18px;padding:14px 16px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center">
        <div style="display:grid;grid-template-columns:repeat(3,7px);gap:3px">${legendDots}</div>
        <div style="font-family:${MONO};font-size:10.5px;line-height:1.6;color:#8a8a90;letter-spacing:.02em">WATER · NO JUNK · SLEEP<br>GYM · STEPS · OUTSIDE<br>PHONE-FREE · GRATITUDE · READ</div>
      </div>
      <div style="background:#161618;border-radius:18px;padding:6px 16px;display:flex;flex-direction:column">
        <div style="display:grid;grid-template-columns:1fr 64px 64px;padding:10px 0 4px;font-family:${MONO};font-size:10.5px;letter-spacing:.08em;color:#55555a"><span></span><span style="text-align:right">YOU</span><span style="text-align:right;text-transform:uppercase">${oName}</span></div>
        ${counters}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button data-act="swap" style="${HDR_BTN}"><span style="width:6px;height:6px;border-radius:50%;background:${SC}"></span><span style="width:6px;height:6px;border-radius:50%;background:${OC};margin-left:-6px"></span>SWAP COLOURS</button>
          ${S.mode === 'firebase' ? `<button data-act="signout" style="${HDR_BTN}">SIGN OUT</button>` : ''}
        </div>
        <div style="font-family:${MONO};font-size:10.5px;letter-spacing:.06em;color:#55555a">${syncLine}</div>
      </div>
    </div>
  </div>`;
}

// ---------- Day sheet ----------
function daySheet() {
  const d = ui.sheetDay, { self, other } = ids();
  const SC = col(self), OC = col(other), oSub = other === 'b' ? 'She' : 'He', oName = other === 'b' ? 'her' : 'him';
  const val = (e, g) => {
    switch (g) {
      case 0: return `${e.water.toFixed(1)} L`;
      case 1: return e.junk || '—';
      case 2: return `${e.sleep} h`;
      case 3: return e.gym ? (e.run ? 'gym + run' : 'gym') : 'rest';
      case 4: return `${(e.steps / 1000).toFixed(1)}k`;
      case 5: return `${e.outside} min`;
      case 6: return `${e.meals.filter(Boolean).length}/3`;
      case 7: return `${e.grat.filter(x => x.trim()).length}/3`;
      default: return `${e.pages} pp`;
    }
  };
  const cell = (w, g, c) => {
    const e = logged(w, d) ? E(w, d) : null, ok = e ? metList(e)[g] : false;
    return `<span style="display:flex;align-items:center;justify-content:flex-end;gap:6px;font-family:${MONO};font-size:12.5px;color:${ok ? c : '#6b6b70'}"><span style="width:6px;height:6px;border-radius:50%;flex:none;background:${ok ? c : 'transparent'};box-shadow:${ok ? 'none' : 'inset 0 0 0 1px #44444a'}"></span>${e ? esc(val(e, g)) : '—'}</span>`;
  };
  const cnt = (w) => logged(w, d) ? doneCount(E(w, d)) : 0;
  const rows = GOALS.map((name, g) => `<div style="display:grid;grid-template-columns:1fr 84px 84px;align-items:center;padding:10px 0;border-bottom:1px solid #222226"><span style="font-size:14px;color:#c8c8cc">${name}</span>${cell(self, g, SC)}${cell(other, g, OC)}</div>`).join('');
  const note = (w) => { const e = E(w, d); return e && e.note ? `<span style="font-size:14px;line-height:1.4;text-wrap:pretty">${esc(e.note)}</span>` : `<span style="font-size:14px;line-height:1.4;color:#6b6b70">Nothing written.</span>`; };
  const grat = (w, c) => { const g = (E(w, d)?.grat || []).filter(x => x.trim()); return g.length ? g.map(x => `<span style="font-size:13.5px;line-height:1.35;color:#f2f2f0;border-left:2px solid ${c};padding-left:8px">${esc(x)}</span>`).join('') : `<span style="font-size:13.5px;color:#6b6b70;border-left:2px solid #2a2a2e;padding-left:8px">—</span>`; };
  const open = ui.sheetOpen;
  return `
  <div data-act="closeSheet" style="position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:${open ? 1 : 0};transition:opacity .35s ease;z-index:5"></div>
  <div class="sheet scroll" data-noswipe="1" style="position:absolute;left:0;right:0;bottom:0;max-height:88%;overflow-y:auto;background:#111113;border-radius:28px 28px 0 0;box-shadow:0 -1px 0 #26262a;transform:${open ? 'translateY(0)' : 'translateY(100%)'};transition:transform .42s cubic-bezier(.2,.8,.2,1);z-index:6">
    <div style="display:flex;justify-content:center;padding:10px 0 4px"><span style="width:38px;height:4px;border-radius:2px;background:#3a3a3e"></span></div>
    <div style="padding:8px 16px calc(36px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:flex-end;justify-content:space-between">
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="font-size:52px;font-weight:500;letter-spacing:-0.045em;line-height:.9">${d}</span>
          <span style="font-size:20px;font-weight:500;letter-spacing:-0.02em;color:#55555a">${WDL[wd(d)]}</span>
        </div>
        <button class="close-x" data-act="closeSheet" style="width:34px;height:34px;border-radius:50%;border:1px solid #2a2a2e;background:#1c1c1f;color:#c8c8cc;font-size:15px;cursor:pointer">✕</button>
      </div>
      <div style="display:flex;gap:14px;font-family:${MONO};font-size:11px"><span style="color:${SC}">● you ${cnt(self)}/9</span><span style="color:${OC}">● ${oName} ${cnt(other)}/9</span><span style="margin-left:auto;color:#55555a">READ-ONLY</span></div>
      <div style="background:#161618;border-radius:18px;padding:4px 16px">${rows}</div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
        <div style="${tint(SC, '14px')}"><span style="${LBL}">YOU WROTE</span>${note(self)}</div>
        <div style="${tint(OC, '14px')}"><span style="${LBL};text-transform:uppercase">${oSub} wrote</span>${note(other)}</div>
      </div>
      <div style="background:#161618;border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <span style="${LBL}">GRATITUDE</span>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px">
          <div style="display:flex;flex-direction:column;gap:6px">${grat(self, SC)}</div>
          <div style="display:flex;flex-direction:column;gap:6px">${grat(other, OC)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- screens outside the month / auth ----------
function shell(inner) {
  return `<div class="scroll" style="height:100%;overflow-y:auto;padding:${TOP} 16px ${BOTTOM};box-sizing:border-box;display:flex;flex-direction:column;gap:18px">${inner}</div>`;
}
function beforeScreen() {
  const n0 = now(), start = new Date(2026, 9, 1);
  const days = Math.max(1, Math.ceil((start - new Date(n0.getFullYear(), n0.getMonth(), n0.getDate())) / 864e5));
  const { self, other } = ids(), oName = other === 'b' ? 'her' : 'him';
  const rules = [['WATER', '2.5 L · black coffee ok'], ['NO JUNK', '3 cheat meals a month'], ['SLEEP', '7 to 8 hours'], ['GYM', '4 a week · 3 with a run'], ['STEPS', '10,000'], ['OUTSIDE', '20 minutes'], ['PHONE-FREE', 'every meal'], ['GRATITUDE', '3 things at night'], ['READ', '10 pages · or 50 a week']];
  return shell(`
    <div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:58px;font-weight:500;letter-spacing:-0.045em;line-height:.9">${String(days).padStart(2, '0')}</span><span style="font-size:58px;font-weight:500;letter-spacing:-0.045em;line-height:.9;color:#34343a">${days === 1 ? 'day' : 'days'}</span></div>
    <p style="margin:0;font-size:21px;line-height:1.28;letter-spacing:-0.015em;font-weight:500;text-wrap:pretty">${span(days === 1 ? 'October starts tomorrow. ' : `October starts in ${days} days. `, '#f2f2f0')}${span('Nine goals, thirty-one days, you and ' + oName + '.', '#6b6b70')}</p>
    <div style="background:#161618;border-radius:18px;padding:6px 16px">${rules.map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #222226"><span style="${LBL}">${k}</span><span style="font-size:14px;color:#c8c8cc;text-align:right">${v}</span></div>`).join('')}</div>
    <div style="display:flex;gap:14px;font-family:${MONO};font-size:11px"><span style="color:${col(self)}">● you</span><span style="color:${col(other)}">● ${oName}</span></div>`);
}
function authScreen() {
  const msg = S.auth === 'loading' ? 'Opening October…'
    : S.auth === 'denied' ? `This October is for two, and ${esc(S.email || 'this account')} isn't one of them.`
      : 'Sign in with Google to start. Only the two of you can get in.';
  return shell(`
    <div style="font-size:44px;font-weight:500;letter-spacing:-0.045em;line-height:.95">October</div>
    <p style="margin:0;font-size:21px;line-height:1.28;letter-spacing:-0.015em;font-weight:500;color:#c8c8cc;text-wrap:pretty">${msg}</p>
    ${S.auth === 'signin' ? `<button data-act="signin" style="height:48px;border-radius:999px;border:0;background:#f2f2f0;color:#0b0b0c;font-family:Geist,system-ui,sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:transform .12s">Continue with Google</button>` : ''}
    ${S.auth === 'denied' ? `<button data-act="signout" style="${HDR_BTN};align-self:flex-start">USE ANOTHER ACCOUNT</button>` : ''}
    ${S.authError ? (S.authError.includes(' ')
      ? `<div style="font-size:15px;line-height:1.4;color:#c8c8cc">${esc(S.authError)}</div>`
      : `<div style="font-family:${MONO};font-size:10.5px;letter-spacing:.06em;color:#8a8a90">${esc(S.authError).toUpperCase()}</div>`) : ''}`);
}

// ---------- render ----------
function view() {
  const base = 'position:relative;width:100%;height:100%;overflow:hidden;background:#0b0b0c;color:#f2f2f0;font-family:Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased';
  if (S.mode === 'firebase' && S.auth !== 'ready') return `<div style="${base}">${authScreen()}</div>`;
  const today = octDay(now());
  if (today === 0) return `<div style="${base}">${beforeScreen()}</div>`;
  if (today === 32) return `<div data-root="1" style="${base}"><div style="display:flex;width:100%;height:100%">${calendarPane(32, true)}</div>${ui.sheetDay != null ? daySheet() : ''}</div>`;
  const pd = (on) => `<span style="width:${on ? 16 : 6}px;height:6px;border-radius:3px;background:${on ? '#f2f2f0' : '#3a3a3e'};transition:all .3s ease"></span>`;
  return `<div data-root="1" style="${base}">
    <div class="track" style="display:flex;width:200%;height:100%;transform:translateX(calc(${-ui.pane * 50}% + ${ui.dragX || 0}px));transition:${ui.dragX != null ? 'none' : 'transform .5s cubic-bezier(.2,.8,.2,1)'};touch-action:pan-y">
      ${todayPane(today)}${calendarPane(today, false)}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;justify-content:center;gap:6px;pointer-events:none">${pd(ui.pane === 0)}${pd(ui.pane === 1)}</div>
    ${ui.sheetDay != null ? daySheet() : ''}
  </div>`;
}

// Minimal DOM morph: keeps nodes (and focus, scroll, pointer capture) alive across renders.
const tpl = document.createElement('template');
function morph(a, b) {
  if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  const aa = a.attributes, ba = b.attributes;
  for (let i = aa.length - 1; i >= 0; i--) if (!b.hasAttribute(aa[i].name)) a.removeAttribute(aa[i].name);
  for (let i = 0; i < ba.length; i++) if (a.getAttribute(ba[i].name) !== ba[i].value) a.setAttribute(ba[i].name, ba[i].value);
  if (a.tagName === 'BUTTON') a.disabled = b.hasAttribute('disabled');
  const ac = a.childNodes, bc = Array.from(b.childNodes);
  for (let i = 0; i < bc.length; i++) {
    const x = ac[i], y = bc[i];
    if (!x) { a.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
    morph(x, y);
  }
  while (ac.length > bc.length) a.removeChild(a.lastChild);
}
function render() {
  tpl.innerHTML = `<div id="app">${view()}</div>`;
  morph(root, tpl.content.firstChild);
  root.querySelectorAll('[data-value]').forEach(el => {
    if (el !== document.activeElement && el.value !== el.dataset.value) el.value = el.dataset.value;
  });
}

// ---------- interactions ----------
const canEdit = () => { const t = octDay(now()); return t >= 1 && t <= 31 && (S.mode !== 'firebase' || S.auth === 'ready'); };
const todayNum = () => octDay(now());
const mine = () => P(S.role, todayNum());
const set = (patch) => { if (canEdit()) store.update(todayNum(), patch); };

function go(pane) { ui.pane = pane; ui.dragX = null; schedule(); }
function openSheet(d) {
  ui.sheetDay = d; ui.sheetOpen = false; render();
  const sheet = root.querySelector('.sheet'); if (sheet) sheet.getBoundingClientRect(); // commit the off-screen position so the slide-up animates
  ui.sheetOpen = true; render();
}
let sheetT;
function closeSheet() { ui.sheetOpen = false; schedule(); clearTimeout(sheetT); sheetT = setTimeout(() => { ui.sheetDay = null; schedule(); }, 380); }

function track(e, move) {
  e.preventDefault(); move(e);
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); ui.drag = null; schedule(); };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
function gpos(ev, tile) { const r = tile.getBoundingClientRect(); ui.gx = (ev.clientX - r.left) / r.width * 100; ui.gy = (ev.clientY - r.top) / r.height * 100; }

root.addEventListener('pointerdown', (e) => {
  const scrubTile = e.target.closest('[data-scrub]');
  if (scrubTile && canEdit()) {
    const key = scrubTile.dataset.scrub, [min, max, step, axis] = SCRUB[key];
    track(e, (ev) => {
      const ref = scrubTile.querySelector('[data-ruler]') || scrubTile, r = ref.getBoundingClientRect();
      const f = clamp(axis === 'y' ? 1 - (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width);
      const v = Math.round(Math.round((min + f * (max - min)) / step) * step * 100) / 100;
      ui.drag = key; gpos(ev, scrubTile);
      if (mine()[key] !== v) set({ [key]: v }); else schedule();
    });
    return;
  }
  const wheelTile = e.target.closest('[data-wheel]');
  if (wheelTile && canEdit()) {
    const y0 = e.clientY, v0 = mine().pages;
    track(e, (ev) => {
      const v = Math.max(0, Math.min(60, v0 + Math.round((y0 - ev.clientY) / 14)));
      ui.drag = 'pages'; gpos(ev, wheelTile);
      if (mine().pages !== v) set({ pages: v }); else schedule();
    });
    return;
  }
  // pane swipe
  if (!root.querySelector('.track') || ui.sheetDay != null || e.target.closest('[data-noswipe],button,input,textarea')) return;
  const x0 = e.clientX, y0 = e.clientY, W = root.clientWidth || 390;
  let mode = null;
  const move = (ev) => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (!mode) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) mode = 'x'; else if (Math.abs(dy) > 8) mode = 'y'; }
    if (mode !== 'x') return;
    let v = dx;
    if ((ui.pane === 0 && dx > 0) || (ui.pane === 1 && dx < 0)) v = dx * 0.25;
    ui.dragX = Math.max(-W, Math.min(W, v)); schedule();
  };
  const up = (ev) => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (mode !== 'x') return;
    const dx = ev.clientX - x0;
    if (ui.pane === 0 && dx < -60) go(1); else if (ui.pane === 1 && dx > 60) go(0); else { ui.dragX = null; schedule(); }
    // a horizontal swipe should not also fire the strip's click
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
});
let suppressClick = false;

root.addEventListener('click', (e) => {
  if (suppressClick) return;
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const a = el.dataset.act;
  if (a === 'goCal') go(1);
  else if (a === 'goToday') go(0);
  else if (a === 'closeSheet') closeSheet();
  else if (a === 'swap') store.setSwap(!S.settings.swapColors);
  else if (a === 'signin') store.signIn();
  else if (a === 'signout') store.signOut();
  else if (a === 'cell') { const d = +el.dataset.day; if (d === todayNum()) go(0); else openSheet(d); }
  else if (a === 'pill') {
    const k = el.dataset.k, p = mine();
    if (k === 'junk:clean') set({ junk: 'clean' });
    else if (k === 'junk:cheat') set({ junk: 'cheat' });
    else if (k === 'gym') set(p.gym ? { gym: false, run: false } : { gym: true });
    else if (k === 'run') set(p.run ? { run: false } : { run: true, gym: true });
    else if (k.startsWith('meal:')) { const m = [...p.meals]; const i = +k.slice(5); m[i] = !m[i]; set({ meals: m }); }
  }
});

root.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.input === 'note') {
    if (words(el.value) > 100) { el.value = mine().note; return; }
    set({ note: el.value, noteAt: el.value.trim() ? Date.now() : null });
  } else if (el.dataset.input === 'grat') {
    const g = [...mine().grat]; g[+el.dataset.i] = el.value.slice(0, 80); set({ grat: g });
  }
});
root.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset.input === 'grat') {
    e.preventDefault();
    const next = root.querySelector(`[data-input="grat"][data-i="${+e.target.dataset.i + 1}"]`);
    if (next) next.focus(); else e.target.blur();
  }
});

// re-render each minute so the day, night mode and countdown roll over on their own
setInterval(schedule, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });

store.init();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !new URLSearchParams(location.search).has('nosw')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
