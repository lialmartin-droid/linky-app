const DATA_KEY = 'moje_linky_pro_data_v3_stabilni';
const OLD_KEYS = ['moje_linky_pro_data_v2', 'data'];
const STATE_KEY = 'moje_linky_pro_state_v3_stabilni';
const PROD_KEY = 'moje_linky_pro_produced_v3_stabilni';
const OLD_PROD = 'moje_linky_pro_vyroba_v2';
const TWO_PROD_KEY = 'moje_linky_pro_two_hours_v1';
const THEME_KEY = 'moje_linky_pro_theme_v1';
const SHORTCUTS_KEY = 'moje_linky_pro_shortcuts_v1';
const TARGET_KEY = 'moje_linky_pro_target_calculator_v1';
const MAX_SHORTCUTS = 6;

const defaultData = {
  "1": {
    "537": { "varianty": { "537": 32 } },
    "A2": { "varianty": { "A2": 33 } },
    "BM2": { "varianty": { "Q3": 53 } },
    "BM9": { "varianty": { "537": 30 } },
    "MONO": { "varianty": { "G / DJ": 54 } },
    "ŠKODA": { "varianty": { "LA": 10 } }
  },
  "2": {
    "A2 FP": { "varianty": { "Všechny": 45 } },
    "BM3": { "varianty": { "VP": 51 } },
    "BM4": { "varianty": { "XFK": 59 } },
    "Cabrio": { "varianty": { "A2 Tiguan": 54, "A2 asuv": 54, "Hybrid": 48, "A2 phev": 54, "T roc": 48, "A1 phev acuv": 55 } },
    "Coex": { "varianty": { "4 OP": 45, "5 OP": 56 } },
    "Fiat": { "varianty": { "Všechny": 45 } },
    "Q3 nová": { "varianty": { "Petrol": 67, "Diesel": 65, "Tiguan petrol": 61, "Tiguan diesel": 56, "Touran petrol": 60, "Touran diesel": 59 } },
    "Q3 stará": { "varianty": { "Petrol": 57, "Diesel": 55, "NAR": 45, "Tiguan petrol": 61, "Tiguan diesel": 56 } },
    "Q5": { "varianty": { "Všechny": 59 } }
  },
  "4": {},
  "6": {
    "160b": { "varianty": { "160b": 67 } },
    "206": { "varianty": { "206": 48 } },
    "Assy": { "varianty": { "QF": 35 } },
    "BM8": { "varianty": { "ML / VL": 59 } },
    "X2-50": { "varianty": { "X2-50": 54 } }
  }
};

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Aplikace dál funguje i v režimu, ve kterém prohlížeč ukládání blokuje.
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function num(value) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits }).format(value);
}

function sortCs(a, b) {
  return String(a).localeCompare(String(b), 'cs', { numeric: true });
}

function dataFromOld() {
  for (const key of OLD_KEYS) {
    const oldData = load(key, null);
    if (oldData && typeof oldData === 'object') return oldData;
  }
  return null;
}

let data = load(DATA_KEY, null) || dataFromOld() || clone(defaultData);
let state = load(STATE_KEY, { calcTeam: '', calcLine: '', calcVariant: '', lineVariant: {}, calcMode: 'one' });
let produced = load(PROD_KEY, null) || load(OLD_PROD, {});
let twoProduced = load(TWO_PROD_KEY, {});
let shortcuts = load(SHORTCUTS_KEY, {});
let targetInputs = load(TARGET_KEY, { norm: '', period: '60', downtime: '' });

function pKey(team, line, variant) {
  return `${team}||${line}||${variant}`;
}

function lvKey(team, line) {
  return `${team}||${line}`;
}

function hasCombination(team, line, variant) {
  return Boolean(data[team] && data[team][line] && Object.prototype.hasOwnProperty.call(data[team][line].varianty || {}, variant));
}

function normalizeShortcuts() {
  if (!shortcuts || typeof shortcuts !== 'object' || Array.isArray(shortcuts)) shortcuts = {};

  const clean = {};
  for (const [team, entries] of Object.entries(shortcuts)) {
    if (!Array.isArray(entries) || !data[team]) continue;
    const used = new Set();
    const teamEntries = [];

    for (const entry of entries) {
      const line = String(entry?.line ?? '').trim();
      const variant = String(entry?.variant ?? '').trim();
      const key = pKey(team, line, variant);
      if (!line || !variant || used.has(key) || !hasCombination(team, line, variant)) continue;
      used.add(key);
      teamEntries.push({ line, variant });
      if (teamEntries.length === MAX_SHORTCUTS) break;
    }

    if (teamEntries.length) clean[team] = teamEntries;
  }

  shortcuts = clean;
}

function normalize() {
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = clone(defaultData);
  if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
  if (!state.lineVariant || typeof state.lineVariant !== 'object' || Array.isArray(state.lineVariant)) state.lineVariant = {};
  if (state.calcMode !== 'two') state.calcMode = 'one';
  if (!produced || typeof produced !== 'object' || Array.isArray(produced)) produced = {};
  if (!twoProduced || typeof twoProduced !== 'object' || Array.isArray(twoProduced)) twoProduced = {};
  if (!targetInputs || typeof targetInputs !== 'object' || Array.isArray(targetInputs)) targetInputs = { norm: '', period: '60', downtime: '' };

  for (const team of Object.keys(defaultData)) {
    if (!data[team]) data[team] = {};
  }

  for (const [team, lineList] of Object.entries(data)) {
    if (!lineList || typeof lineList !== 'object' || Array.isArray(lineList)) data[team] = {};
    for (const [line, lineData] of Object.entries(data[team])) {
      if (!lineData || typeof lineData !== 'object' || Array.isArray(lineData)) data[team][line] = { varianty: {} };
      if (!data[team][line].varianty || typeof data[team][line].varianty !== 'object') data[team][line].varianty = {};
    }
  }

  normalizeShortcuts();
  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
  save(SHORTCUTS_KEY, shortcuts);
  save(TARGET_KEY, targetInputs);
}

normalize();

const calc = {
  team: document.getElementById('calcTeam'),
  teamButtons: document.getElementById('calcTeamButtons'),
  line: document.getElementById('calcLine'),
  variant: document.getElementById('calcVariant'),
  produced: document.getElementById('produced'),
  firstHour: document.getElementById('producedFirstHour'),
  secondHour: document.getElementById('producedSecondHour')
};

const targetCalc = {
  norm: document.getElementById('targetNorm'),
  period: document.getElementById('targetPeriod'),
  downtime: document.getElementById('targetDowntime'),
  result: document.getElementById('targetResult'),
  detail: document.getElementById('targetDetail'),
  card: document.getElementById('targetResultCard'),
  useCurrent: document.getElementById('useCurrentNorm')
};

const mgr = {
  quickTeam: document.getElementById('quickTeam'),
  quickLine: document.getElementById('quickLine'),
  quickVariant: document.getElementById('quickVariant'),
  quickList: document.getElementById('shortcutManagerList'),
  teamSel: document.getElementById('teamSel'),
  teamName: document.getElementById('teamName'),
  lineTeam: document.getElementById('lineTeam'),
  lineSel: document.getElementById('lineSel'),
  lineName: document.getElementById('lineName'),
  varTeam: document.getElementById('varTeam'),
  varLine: document.getElementById('varLine'),
  varSel: document.getElementById('varSel'),
  varName: document.getElementById('varName'),
  varNorm: document.getElementById('varNorm')
};

function teams() {
  return Object.keys(data).sort(sortCs);
}

function lines(team) {
  return Object.keys(data[team] || {}).sort(sortCs);
}

function variants(team, line) {
  return Object.keys(((data[team] || {})[line] || {}).varianty || {}).sort(sortCs);
}

function setOptions(select, items, label = (item) => item, keep = '') {
  const previous = keep || select.value;
  select.innerHTML = '';
  items.forEach((item) => select.add(new Option(label(item), item)));
  if (items.includes(previous)) select.value = previous;
  else if (items.length) select.value = items[0];
}

function currentKey() {
  return pKey(state.calcTeam, state.calcLine, state.calcVariant);
}

function currentNorm() {
  return num((((data[state.calcTeam] || {})[state.calcLine] || {}).varianty || {})[state.calcVariant]);
}

function teamShortcuts(team) {
  return Array.isArray(shortcuts[team]) ? shortcuts[team] : [];
}

function saveShortcuts() {
  normalizeShortcuts();
  save(SHORTCUTS_KEY, shortcuts);
}

function renderActiveSelection() {
  const box = document.getElementById('activeSelection');
  const norm = currentNorm();
  if (!state.calcTeam || !state.calcLine || !state.calcVariant) {
    box.textContent = `Tým ${state.calcTeam || '—'} · vyber linku a variantu`;
    return;
  }
  box.textContent = `Tým ${state.calcTeam} · ${state.calcLine} / ${state.calcVariant} · ${norm || '—'} ks/h`;
}

function renderQuickLinks() {
  const grid = document.getElementById('quickLinksGrid');
  const empty = document.getElementById('quickLinksEmpty');
  const list = teamShortcuts(state.calcTeam);
  grid.innerHTML = '';
  empty.hidden = list.length > 0;

  list.forEach((entry) => {
    const norm = num(data[state.calcTeam][entry.line].varianty[entry.variant]);
    const button = document.createElement('button');
    const active = entry.line === state.calcLine && entry.variant === state.calcVariant;
    button.type = 'button';
    button.className = `quick-link${active ? ' active' : ''}`;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${entry.line}, ${entry.variant}, norma ${norm} kusů za hodinu`);
    button.innerHTML = `<span class="quick-link-content"><span class="quick-link-line">${esc(entry.line)}</span><span class="quick-link-variant">${esc(entry.variant)}</span><span class="quick-link-norm">${norm} ks/h</span></span>`;
    button.addEventListener('click', () => activateShortcut(state.calcTeam, entry.line, entry.variant, true));
    grid.appendChild(button);
  });
}

function activateShortcut(team, line, variant, focusInput = false) {
  if (!hasCombination(team, line, variant)) return;
  state.calcTeam = team;
  state.calcLine = line;
  state.calcVariant = variant;
  state.lineVariant[lvKey(team, line)] = variant;
  refreshCalc(true, true, true);
  document.getElementById('selectionDetails').open = false;
  if (focusInput) setCalcMode(state.calcMode, true);
}

function renderCalcTeamButtons() {
  calc.teamButtons.innerHTML = '';
  teams().forEach((team) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'team-button';
    button.textContent = team;
    button.setAttribute('aria-label', `Tým ${team}`);
    button.setAttribute('aria-pressed', String(team === state.calcTeam));
    button.addEventListener('click', () => {
      if (state.calcTeam === team) return;
      calc.team.value = team;
      state.calcTeam = team;
      state.calcLine = '';
      state.calcVariant = '';
      refreshCalc(true, false, false);
    });
    calc.teamButtons.appendChild(button);
  });
}

function loadProductionInputs() {
  if (!state.calcTeam || !state.calcLine || !state.calcVariant) {
    calc.produced.value = '';
    calc.firstHour.value = '';
    calc.secondHour.value = '';
    return;
  }

  const key = currentKey();
  const pair = twoProduced[key] || {};
  calc.produced.value = produced[key] ?? '';
  calc.firstHour.value = pair.first ?? '';
  calc.secondHour.value = pair.second ?? '';
}

function refreshCurrentNormButton() {
  const norm = currentNorm();
  targetCalc.useCurrent.textContent = norm ? `Použít aktivní normu (${norm} ks/h)` : 'Použít aktivní normu';
  targetCalc.useCurrent.disabled = !norm;
}

function refreshCalc(keepTeam = true, keepLine = true, keepVariant = true) {
  const teamList = teams();
  setOptions(calc.team, teamList, (team) => `Tým ${team}`, keepTeam ? state.calcTeam : '');
  state.calcTeam = calc.team.value || '';

  const lineList = lines(state.calcTeam);
  setOptions(calc.line, lineList, (line) => line, keepLine ? state.calcLine : '');
  state.calcLine = calc.line.value || '';

  const variantList = variants(state.calcTeam, state.calcLine);
  const savedVariant = state.lineVariant[lvKey(state.calcTeam, state.calcLine)] || state.calcVariant;
  setOptions(calc.variant, variantList, (variant) => variant, keepVariant ? savedVariant : '');
  state.calcVariant = calc.variant.value || '';

  if (state.calcVariant) state.lineVariant[lvKey(state.calcTeam, state.calcLine)] = state.calcVariant;

  loadProductionInputs();
  renderCalcTeamButtons();
  renderActiveSelection();
  renderQuickLinks();
  save(STATE_KEY, state);
  calcResult();
  calcTwoHour();
  refreshCurrentNormButton();
}

calc.team.addEventListener('change', () => {
  state.calcTeam = calc.team.value;
  state.calcLine = '';
  state.calcVariant = '';
  refreshCalc(true, false, false);
});

calc.line.addEventListener('change', () => {
  state.calcLine = calc.line.value;
  state.calcVariant = '';
  refreshCalc(true, true, true);
});

calc.variant.addEventListener('change', () => {
  state.calcVariant = calc.variant.value;
  if (state.calcVariant) state.lineVariant[lvKey(state.calcTeam, state.calcLine)] = state.calcVariant;
  loadProductionInputs();
  save(STATE_KEY, state);
  renderActiveSelection();
  renderQuickLinks();
  calcResult();
  calcTwoHour();
  refreshCurrentNormButton();
});

calc.produced.addEventListener('input', () => {
  if (state.calcTeam && state.calcLine && state.calcVariant) {
    produced[currentKey()] = calc.produced.value;
    save(PROD_KEY, produced);
  }
  calcResult();
});

function saveTwoHourInputs() {
  if (state.calcTeam && state.calcLine && state.calcVariant) {
    twoProduced[currentKey()] = {
      first: calc.firstHour.value,
      second: calc.secondHour.value
    };
    save(TWO_PROD_KEY, twoProduced);
  }
  calcTwoHour();
}

calc.firstHour.addEventListener('input', saveTwoHourInputs);
calc.secondHour.addEventListener('input', saveTwoHourInputs);

function calcResult() {
  const norm = currentNorm();
  const normaBox = document.getElementById('normaBox');
  const result = document.getElementById('result');
  const detail = document.getElementById('detail');
  const resultCard = document.getElementById('resultCard');

  normaBox.textContent = norm ? `Norma: ${norm} ks / hod` : 'Norma: —';
  resultCard.classList.remove('flash-red', 'flash-green', 'is-bad', 'is-ok');

  if (!state.calcTeam || !state.calcLine || !state.calcVariant) {
    result.className = 'result muted';
    result.textContent = 'Nejdřív vyber tým, linku a variantu.';
    detail.innerHTML = '';
    return;
  }

  if (!norm) {
    result.className = 'result warn';
    result.textContent = 'Tato varianta nemá nastavenou normu.';
    detail.innerHTML = '';
    return;
  }

  if (calc.produced.value === '') {
    result.className = 'result muted';
    result.textContent = 'Zadej počet vyrobených kusů.';
    detail.innerHTML = '';
    return;
  }

  const made = Math.max(0, num(calc.produced.value));
  const workedMinutes = made * (60 / norm);
  const downtime = Math.max(0, Math.round(60 - workedMinutes));
  const performance = (made / norm) * 100;

  void resultCard.offsetWidth;
  if (performance < 86) {
    resultCard.classList.add('flash-red', 'is-bad');
    result.className = 'result bad';
  } else {
    resultCard.classList.add('flash-green', 'is-ok');
    result.className = 'result ok';
  }

  result.innerHTML = `${workedMinutes > 60 ? 'Překročeno' : `Prostoj: ${downtime} min`}<br>Výkon: ${performance.toFixed(1)} %`;
  detail.innerHTML = [
    `<span class="badge"><strong>Tým:</strong> ${esc(state.calcTeam)}</span>`,
    `<span class="badge"><strong>Linka:</strong> ${esc(state.calcLine)}</span>`,
    `<span class="badge"><strong>Varianta:</strong> ${esc(state.calcVariant)}</span>`,
    `<span class="badge"><strong>Norma:</strong> ${norm} ks/hod</span>`
  ].join('');
}

function minuteMarker(value) {
  const rounded = Math.min(60, Math.max(0, Math.round(value)));
  return String(rounded).padStart(2, '0');
}

function calcTwoHour() {
  const norm = currentNorm();
  const firstMarker = document.getElementById('firstHourMarker');
  const secondMarker = document.getElementById('secondHourMarker');
  const hint = document.getElementById('twoHourHint');

  if (!state.calcTeam || !state.calcLine || !state.calcVariant) {
    firstMarker.textContent = 'od ..:—';
    secondMarker.textContent = 'do ..:—';
    hint.textContent = 'Nejdřív vyber tým, linku a variantu.';
    return;
  }

  if (!norm) {
    firstMarker.textContent = 'od ..:—';
    secondMarker.textContent = 'do ..:—';
    hint.textContent = 'Tato varianta nemá nastavenou normu.';
    return;
  }

  hint.textContent = 'Enter přesune kurzor z první hodiny rovnou do druhé.';

  if (calc.firstHour.value === '') firstMarker.textContent = 'od ..:—';
  else {
    const firstWorked = Math.max(0, num(calc.firstHour.value)) * (60 / norm);
    firstMarker.textContent = `od ..:${minuteMarker(firstWorked)}`;
  }

  if (calc.secondHour.value === '') secondMarker.textContent = 'do ..:—';
  else {
    const secondWorked = Math.max(0, num(calc.secondHour.value)) * (60 / norm);
    secondMarker.textContent = `do ..:${minuteMarker(60 - secondWorked)}`;
  }
}

function setCalcMode(mode, focusInput = false) {
  const selectedMode = mode === 'two' ? 'two' : 'one';
  state.calcMode = selectedMode;

  document.querySelectorAll('[data-calc-mode]').forEach((button) => {
    const active = button.dataset.calcMode === selectedMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  document.querySelectorAll('[data-mode-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.modePanel !== selectedMode;
  });

  save(STATE_KEY, state);

  if (focusInput) {
    const input = selectedMode === 'two' ? calc.firstHour : calc.produced;
    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 20);
  }
}

document.querySelectorAll('[data-calc-mode]').forEach((button) => {
  button.addEventListener('click', () => setCalcMode(button.dataset.calcMode, true));
});

document.getElementById('clearOneHour').addEventListener('click', () => {
  calc.produced.value = '';
  if (state.calcTeam && state.calcLine && state.calcVariant) {
    produced[currentKey()] = '';
    save(PROD_KEY, produced);
  }
  calcResult();
  calc.produced.focus();
});

document.getElementById('clearTwoHours').addEventListener('click', () => {
  calc.firstHour.value = '';
  calc.secondHour.value = '';
  saveTwoHourInputs();
  calc.firstHour.focus();
});

calc.firstHour.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    calc.secondHour.focus();
    calc.secondHour.select();
  }
});

for (const input of [calc.produced, calc.firstHour, calc.secondHour]) {
  input.addEventListener('focus', () => input.select());
}

document.getElementById('openSelection').addEventListener('click', () => {
  const details = document.getElementById('selectionDetails');
  details.open = true;
  window.setTimeout(() => calc.line.focus(), 0);
});

document.getElementById('manageQuickLinks').addEventListener('click', () => {
  showPage('management');
  window.setTimeout(() => {
    const details = document.getElementById('quickDetails');
    details.open = true;
    mgr.quickTeam.focus();
  }, 0);
});

function addShortcut(team, line, variant) {
  if (!hasCombination(team, line, variant)) {
    alert('Vyber platnou linku a variantu.');
    return false;
  }

  const list = teamShortcuts(team);
  if (list.some((entry) => entry.line === line && entry.variant === variant)) {
    alert('Tato rychlá linka už je uložená.');
    return false;
  }

  if (list.length >= MAX_SHORTCUTS) {
    alert(`Pro tým můžeš uložit nejvýše ${MAX_SHORTCUTS} rychlých linek.`);
    return false;
  }

  if (!shortcuts[team]) shortcuts[team] = [];
  shortcuts[team].push({ line, variant });
  saveShortcuts();
  renderQuickLinks();
  renderShortcutManager();
  return true;
}

function removeShortcut(team, index) {
  if (!Array.isArray(shortcuts[team])) return;
  shortcuts[team].splice(index, 1);
  if (!shortcuts[team].length) delete shortcuts[team];
  saveShortcuts();
  renderQuickLinks();
  renderShortcutManager();
}

function moveShortcut(team, index, direction) {
  const list = teamShortcuts(team);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
  shortcuts[team] = list;
  saveShortcuts();
  renderQuickLinks();
  renderShortcutManager();
}

document.getElementById('addCurrentShortcut').addEventListener('click', () => {
  if (addShortcut(state.calcTeam, state.calcLine, state.calcVariant)) {
    document.getElementById('selectionDetails').open = false;
  }
});

document.getElementById('addQuickShortcut').addEventListener('click', () => {
  addShortcut(mgr.quickTeam.value, mgr.quickLine.value, mgr.quickVariant.value);
});

function loadTargetInputs() {
  targetCalc.norm.value = targetInputs.norm ?? '';
  targetCalc.period.value = targetInputs.period ?? '60';
  targetCalc.downtime.value = targetInputs.downtime ?? '';
}

function saveTargetInputs() {
  targetInputs = {
    norm: targetCalc.norm.value,
    period: targetCalc.period.value,
    downtime: targetCalc.downtime.value
  };
  save(TARGET_KEY, targetInputs);
  calcTargetResult();
}

function calcTargetResult() {
  const norm = Math.max(0, num(targetCalc.norm.value));
  const period = Math.max(0, num(targetCalc.period.value));
  const downtime = Math.max(0, num(targetCalc.downtime.value));
  targetCalc.card.classList.remove('is-bad', 'is-ok');

  if (!norm || !period || targetCalc.downtime.value === '') {
    targetCalc.result.className = 'result muted';
    targetCalc.result.textContent = 'Zadej normu a čas prostoje.';
    targetCalc.detail.textContent = 'Můžeš použít aktivní normu, nebo zadat vlastní.';
    return;
  }

  if (downtime > period) {
    targetCalc.card.classList.add('is-bad');
    targetCalc.result.className = 'result bad';
    targetCalc.result.textContent = 'Prostoj je delší než celé období.';
    targetCalc.detail.textContent = 'Oprav délku období nebo čas prostoje.';
    return;
  }

  const remainingMinutes = period - downtime;
  const exactPieces = norm * (remainingMinutes / 60);
  const requiredPieces = Math.max(0, Math.ceil(exactPieces - Number.EPSILON));
  targetCalc.card.classList.add('is-ok');
  targetCalc.result.className = 'result ok';
  targetCalc.result.innerHTML = `Udělat nejméně: ${formatNumber(requiredPieces, 0)} ks`;
  targetCalc.detail.innerHTML = `Zbývá <strong>${formatNumber(remainingMinutes, 1)} min</strong> z ${formatNumber(period, 1)} min. Přesný přepočet je ${formatNumber(exactPieces)} ks.`;
}

for (const input of [targetCalc.norm, targetCalc.period, targetCalc.downtime]) {
  input.addEventListener('input', saveTargetInputs);
  input.addEventListener('focus', () => input.select());
}

targetCalc.useCurrent.addEventListener('click', () => {
  const norm = currentNorm();
  if (!norm) return;
  targetCalc.norm.value = norm;
  saveTargetInputs();
  targetCalc.downtime.focus();
});

document.getElementById('resetTargetCalculator').addEventListener('click', () => {
  targetCalc.norm.value = '';
  targetCalc.period.value = '60';
  targetCalc.downtime.value = '';
  saveTargetInputs();
  targetCalc.norm.focus();
});

function refreshManagers(preserve = true) {
  const teamList = teams();

  setOptions(mgr.quickTeam, teamList, (team) => `Tým ${team}`, preserve ? mgr.quickTeam.value : state.calcTeam);
  refreshQuickLineManager(preserve);

  setOptions(mgr.teamSel, teamList, (team) => `Tým ${team}`, preserve ? mgr.teamSel.value : state.calcTeam);
  mgr.teamName.value = mgr.teamSel.value || '';

  setOptions(mgr.lineTeam, teamList, (team) => `Tým ${team}`, preserve ? mgr.lineTeam.value : state.calcTeam);
  refreshLineManager(preserve);

  setOptions(mgr.varTeam, teamList, (team) => `Tým ${team}`, preserve ? mgr.varTeam.value : state.calcTeam);
  refreshVarLineManager(preserve);
  renderOverview();
}

function refreshQuickLineManager(preserve = true) {
  const team = mgr.quickTeam.value;
  setOptions(mgr.quickLine, lines(team), (line) => line, preserve ? mgr.quickLine.value : state.calcLine);
  refreshQuickVariantManager(preserve);
  renderShortcutManager();
}

function refreshQuickVariantManager(preserve = true) {
  const team = mgr.quickTeam.value;
  const line = mgr.quickLine.value;
  setOptions(mgr.quickVariant, variants(team, line), (variant) => variant, preserve ? mgr.quickVariant.value : state.calcVariant);
}

function renderShortcutManager() {
  const team = mgr.quickTeam.value;
  const list = teamShortcuts(team);
  mgr.quickList.innerHTML = '';

  if (!list.length) {
    mgr.quickList.innerHTML = '<p class="shortcut-manager-empty">Pro tento tým zatím nemáš žádné rychlé linky.</p>';
    return;
  }

  list.forEach((entry, index) => {
    const norm = num(data[team][entry.line].varianty[entry.variant]);
    const row = document.createElement('div');
    row.className = 'shortcut-manager-row';
    row.innerHTML = `<div class="shortcut-manager-name"><strong>${esc(entry.line)}</strong><span>${esc(entry.variant)} · ${norm} ks/h</span></div>`;

    const up = document.createElement('button');
    up.type = 'button';
    up.textContent = '↑';
    up.disabled = index === 0;
    up.setAttribute('aria-label', `Posunout ${entry.line} nahoru`);
    up.addEventListener('click', () => moveShortcut(team, index, -1));

    const down = document.createElement('button');
    down.type = 'button';
    down.textContent = '↓';
    down.disabled = index === list.length - 1;
    down.setAttribute('aria-label', `Posunout ${entry.line} dolů`);
    down.addEventListener('click', () => moveShortcut(team, index, 1));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-shortcut';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Odebrat ${entry.line} z rychlých linek`);
    remove.addEventListener('click', () => removeShortcut(team, index));

    row.append(up, down, remove);
    mgr.quickList.appendChild(row);
  });
}

function refreshLineManager(preserve = true) {
  const team = mgr.lineTeam.value;
  setOptions(mgr.lineSel, lines(team), (line) => line, preserve ? mgr.lineSel.value : '');
  mgr.lineName.value = mgr.lineSel.value || '';
}

function refreshVarLineManager(preserve = true) {
  const team = mgr.varTeam.value;
  setOptions(mgr.varLine, lines(team), (line) => line, preserve ? mgr.varLine.value : '');
  refreshVarManager(preserve);
}

function refreshVarManager(preserve = true) {
  const team = mgr.varTeam.value;
  const line = mgr.varLine.value;
  setOptions(mgr.varSel, variants(team, line), (variant) => variant, preserve ? mgr.varSel.value : '');
  const variant = mgr.varSel.value;
  mgr.varName.value = variant || '';
  mgr.varNorm.value = variant && data[team] && data[team][line] ? data[team][line].varianty[variant] : '';
}

mgr.quickTeam.addEventListener('change', () => refreshQuickLineManager(false));
mgr.quickLine.addEventListener('change', () => refreshQuickVariantManager(false));
mgr.quickVariant.addEventListener('change', () => refreshQuickVariantManager(true));
mgr.teamSel.addEventListener('change', () => {
  mgr.teamName.value = mgr.teamSel.value || '';
});
mgr.lineTeam.addEventListener('change', () => refreshLineManager(false));
mgr.lineSel.addEventListener('change', () => {
  mgr.lineName.value = mgr.lineSel.value || '';
});
mgr.varTeam.addEventListener('change', () => refreshVarLineManager(false));
mgr.varLine.addEventListener('change', () => refreshVarManager(false));
mgr.varSel.addEventListener('change', () => refreshVarManager(true));

function addTeam() {
  const name = mgr.teamName.value.trim();
  if (!name) return alert('Zadej název týmu.');
  if (data[name]) return alert('Tento tým už existuje.');
  data[name] = {};
  save(DATA_KEY, data);
  refreshCalc(false, false, false);
  refreshManagers(false);
}

function renameTeam() {
  const oldName = mgr.teamSel.value;
  const name = mgr.teamName.value.trim();
  if (!oldName || !name) return;
  if (name !== oldName && data[name]) return alert('Tento tým už existuje.');

  if (name !== oldName) {
    data[name] = data[oldName];
    delete data[oldName];
    renameKeys(oldName, null, null, name, null, null);
    if (state.calcTeam === oldName) state.calcTeam = name;
  }

  save(DATA_KEY, data);
  save(STATE_KEY, state);
  refreshCalc(true, true, true);
  refreshManagers(false);
}

function deleteTeam() {
  const team = mgr.teamSel.value;
  if (!team) return;
  if (!confirm(`Smazat tým ${team} včetně všech linek a variant?`)) return;

  delete data[team];
  delete shortcuts[team];
  Object.keys(produced).forEach((key) => {
    if (key.startsWith(`${team}||`)) delete produced[key];
  });
  Object.keys(twoProduced).forEach((key) => {
    if (key.startsWith(`${team}||`)) delete twoProduced[key];
  });
  Object.keys(state.lineVariant).forEach((key) => {
    if (key.startsWith(`${team}||`)) delete state.lineVariant[key];
  });

  if (state.calcTeam === team) {
    state.calcTeam = '';
    state.calcLine = '';
    state.calcVariant = '';
  }

  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
  saveShortcuts();
  refreshCalc(false, false, false);
  refreshManagers(false);
}

function addLine() {
  const team = mgr.lineTeam.value;
  const name = mgr.lineName.value.trim();
  if (!team || !name) return alert('Vyber tým a zadej linku.');
  if (data[team][name]) return alert('Tato linka už existuje.');

  data[team][name] = { varianty: {} };
  save(DATA_KEY, data);
  state.calcTeam = team;
  state.calcLine = name;
  state.calcVariant = '';
  refreshCalc(true, true, false);
  refreshManagers(false);
}

function renameLine() {
  const team = mgr.lineTeam.value;
  const oldName = mgr.lineSel.value;
  const name = mgr.lineName.value.trim();
  if (!team || !oldName || !name) return;
  if (name !== oldName && data[team][name]) return alert('Tato linka už existuje.');

  if (name !== oldName) {
    data[team][name] = data[team][oldName];
    delete data[team][oldName];
    renameKeys(team, oldName, null, team, name, null);
    if (state.calcTeam === team && state.calcLine === oldName) state.calcLine = name;
  }

  save(DATA_KEY, data);
  save(STATE_KEY, state);
  refreshCalc(true, true, true);
  refreshManagers(false);
}

function deleteLine() {
  const team = mgr.lineTeam.value;
  const line = mgr.lineSel.value;
  if (!team || !line) return;
  if (!confirm(`Smazat linku ${line}?`)) return;

  delete data[team][line];
  if (Array.isArray(shortcuts[team])) shortcuts[team] = shortcuts[team].filter((entry) => entry.line !== line);
  Object.keys(produced).forEach((key) => {
    if (key.startsWith(`${team}||${line}||`)) delete produced[key];
  });
  Object.keys(twoProduced).forEach((key) => {
    if (key.startsWith(`${team}||${line}||`)) delete twoProduced[key];
  });
  delete state.lineVariant[lvKey(team, line)];

  if (state.calcTeam === team && state.calcLine === line) {
    state.calcLine = '';
    state.calcVariant = '';
  }

  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
  saveShortcuts();
  refreshCalc(true, false, false);
  refreshManagers(false);
}

function addVariant() {
  const team = mgr.varTeam.value;
  const line = mgr.varLine.value;
  const variant = mgr.varName.value.trim();
  const norm = num(mgr.varNorm.value);
  if (!team || !line || !variant) return alert('Vyber tým, linku a zadej variantu.');
  if (data[team][line].varianty[variant] !== undefined) return alert('Tato varianta už existuje.');

  data[team][line].varianty[variant] = norm;
  state.calcTeam = team;
  state.calcLine = line;
  state.calcVariant = variant;
  state.lineVariant[lvKey(team, line)] = variant;
  save(DATA_KEY, data);
  save(STATE_KEY, state);
  refreshCalc(true, true, true);
  refreshManagers(false);
}

function saveVariant() {
  const team = mgr.varTeam.value;
  const line = mgr.varLine.value;
  const oldVariant = mgr.varSel.value;
  const variant = mgr.varName.value.trim();
  const norm = num(mgr.varNorm.value);
  if (!team || !line || !oldVariant || !variant) return alert('Vyber variantu a zadej název.');
  if (variant !== oldVariant && data[team][line].varianty[variant] !== undefined) return alert('Tato varianta už existuje.');

  delete data[team][line].varianty[oldVariant];
  data[team][line].varianty[variant] = norm;
  if (variant !== oldVariant) renameKeys(team, line, oldVariant, team, line, variant);

  if (state.calcTeam === team && state.calcLine === line) {
    state.calcVariant = variant;
    state.lineVariant[lvKey(team, line)] = variant;
  }

  save(DATA_KEY, data);
  save(STATE_KEY, state);
  refreshCalc(true, true, true);
  refreshManagers(false);
}

function deleteVariant() {
  const team = mgr.varTeam.value;
  const line = mgr.varLine.value;
  const variant = mgr.varSel.value;
  if (!team || !line || !variant) return;
  if (!confirm(`Smazat variantu ${variant}?`)) return;

  delete data[team][line].varianty[variant];
  if (Array.isArray(shortcuts[team])) shortcuts[team] = shortcuts[team].filter((entry) => !(entry.line === line && entry.variant === variant));
  delete produced[pKey(team, line, variant)];
  delete twoProduced[pKey(team, line, variant)];
  if (state.lineVariant[lvKey(team, line)] === variant) delete state.lineVariant[lvKey(team, line)];
  if (state.calcTeam === team && state.calcLine === line && state.calcVariant === variant) state.calcVariant = '';

  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
  saveShortcuts();
  refreshCalc(true, true, false);
  refreshManagers(false);
}

function renamedProductionMap(source, oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant) {
  const renamed = {};
  for (const [key, value] of Object.entries(source)) {
    let [team, line, variant] = key.split('||');
    if ((oldTeam === null || team === oldTeam) && (oldLine === null || line === oldLine) && (oldVariant === null || variant === oldVariant)) {
      if (newTeam !== null) team = newTeam;
      if (newLine !== null) line = newLine;
      if (newVariant !== null) variant = newVariant;
    }
    renamed[pKey(team, line, variant)] = value;
  }
  return renamed;
}

function renameShortcuts(oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant) {
  const renamed = {};
  for (const [teamKey, entries] of Object.entries(shortcuts)) {
    for (const entry of entries) {
      let team = teamKey;
      let line = entry.line;
      let variant = entry.variant;
      if ((oldTeam === null || team === oldTeam) && (oldLine === null || line === oldLine) && (oldVariant === null || variant === oldVariant)) {
        if (newTeam !== null) team = newTeam;
        if (newLine !== null) line = newLine;
        if (newVariant !== null) variant = newVariant;
      }
      if (!renamed[team]) renamed[team] = [];
      renamed[team].push({ line, variant });
    }
  }
  shortcuts = renamed;
  saveShortcuts();
}

function renameKeys(oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant) {
  produced = renamedProductionMap(produced, oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant);
  twoProduced = renamedProductionMap(twoProduced, oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant);

  const renamedLineVariants = {};
  for (const [key, savedVariant] of Object.entries(state.lineVariant)) {
    let [team, line] = key.split('||');
    let variant = savedVariant;
    if ((oldTeam === null || team === oldTeam) && (oldLine === null || line === oldLine)) {
      if (newTeam !== null) team = newTeam;
      if (newLine !== null) line = newLine;
      if (oldVariant !== null && variant === oldVariant && newVariant !== null) variant = newVariant;
    }
    renamedLineVariants[lvKey(team, line)] = variant;
  }
  state.lineVariant = renamedLineVariants;
  renameShortcuts(oldTeam, oldLine, oldVariant, newTeam, newLine, newVariant);

  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
}

function renderOverview() {
  let html = '';
  for (const team of teams()) {
    html += `<div class="item"><h3>Tým ${esc(team)}</h3>`;
    const lineList = lines(team);
    if (!lineList.length) html += '<p class="muted">Zatím bez linek/projektů.</p>';
    for (const line of lineList) {
      html += `<p><strong>${esc(line)}</strong></p>`;
      for (const variant of variants(team, line)) {
        html += `<span class="badge">${esc(variant)}: <strong>${esc(data[team][line].varianty[variant])}</strong> ks/hod</span>`;
      }
    }
    html += '</div>';
  }
  document.getElementById('overview').innerHTML = html || '<p class="muted">Zatím nejsou žádná data.</p>';
}

function currentTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch (error) {
    return 'dark';
  }
}

function applyTheme(theme, persist = true) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = selected;
  document.getElementById('themeIcon').textContent = selected === 'dark' ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = selected === 'dark' ? 'Světlý' : 'Tmavý';
  document.getElementById('themeToggle').setAttribute('aria-label', selected === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim');
  document.getElementById('themeColor').setAttribute('content', selected === 'dark' ? '#0d0f12' : '#edf1f5');
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, selected);
    } catch (error) {
      // Bezpečný pád při zablokovaném localStorage.
    }
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
});

function showPage(pageName) {
  const pages = ['calculator', 'targets', 'management', 'overview', 'backup'];
  const targetPage = pages.includes(pageName) ? pageName : 'calculator';
  document.querySelectorAll('[data-page]').forEach((page) => {
    page.hidden = page.dataset.page !== targetPage;
  });
  document.querySelectorAll('[data-page-target]').forEach((button) => {
    const active = button.dataset.pageTarget === targetPage;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-page-target]').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.pageTarget));
});

function exportBackup() {
  const backup = {
    app: 'Moje Linky PRO',
    version: 6,
    created: new Date().toISOString(),
    data,
    state,
    produced,
    twoProduced,
    shortcuts,
    targetInputs,
    theme: document.body.dataset.theme
  };
  document.getElementById('backupBox').value = JSON.stringify(backup, null, 2);
}

function importBackup() {
  const raw = document.getElementById('backupBox').value.trim();
  if (!raw) return alert('Nejdřív vlož zálohu.');

  try {
    const backup = JSON.parse(raw);
    if (!backup.data) return alert('Záloha neobsahuje data.');
    if (!confirm('Načíst zálohu? Aktuální data se přepíšou.')) return;

    data = backup.data;
    state = backup.state || backup.stav || { calcTeam: '', calcLine: '', calcVariant: '', lineVariant: backup.stavLinek || {}, calcMode: 'one' };
    produced = backup.produced || backup.vyroba || {};
    twoProduced = backup.twoProduced || {};
    shortcuts = backup.shortcuts || backup.quickLinks || {};
    targetInputs = backup.targetInputs || { norm: '', period: '60', downtime: '' };
    normalize();
    if (backup.theme) applyTheme(backup.theme);
    loadTargetInputs();
    refreshCalc(true, true, true);
    setCalcMode(state.calcMode, false);
    refreshManagers(false);
    calcTargetResult();
    alert('Záloha byla načtena.');
  } catch (error) {
    alert('Zálohu se nepodařilo načíst.');
  }
}

function copyBackup() {
  const box = document.getElementById('backupBox');
  if (!box.value) exportBackup();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(box.value).catch(() => {
      box.focus();
      box.select();
      document.execCommand('copy');
    });
  } else {
    box.focus();
    box.select();
    document.execCommand('copy');
  }
}

applyTheme(currentTheme(), false);
loadTargetInputs();
refreshCalc(true, true, true);
setCalcMode(state.calcMode, false);
refreshManagers(false);
calcTargetResult();
showPage('calculator');
