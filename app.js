const DATA_KEY = 'moje_linky_pro_data_v3_stabilni';
const OLD_KEYS = ['moje_linky_pro_data_v2', 'data'];
const STATE_KEY = 'moje_linky_pro_state_v3_stabilni';
const PROD_KEY = 'moje_linky_pro_produced_v3_stabilni';
const OLD_PROD = 'moje_linky_pro_vyroba_v2';
const TWO_PROD_KEY = 'moje_linky_pro_two_hours_v1';
const THEME_KEY = 'moje_linky_pro_theme_v1';

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

function normalize() {
  if (!state || typeof state !== 'object') state = {};
  if (!state.lineVariant || typeof state.lineVariant !== 'object') state.lineVariant = {};
  if (state.calcMode !== 'two') state.calcMode = 'one';
  if (!produced || typeof produced !== 'object') produced = {};
  if (!twoProduced || typeof twoProduced !== 'object') twoProduced = {};

  for (const team of Object.keys(defaultData)) {
    if (!data[team]) data[team] = {};
  }

  for (const [team, lineList] of Object.entries(data)) {
    if (!lineList || typeof lineList !== 'object') data[team] = {};
    for (const [line, lineData] of Object.entries(data[team])) {
      if (!lineData || typeof lineData !== 'object') data[team][line] = { varianty: {} };
      if (!data[team][line].varianty) data[team][line].varianty = {};
    }
  }

  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
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

const mgr = {
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

function pKey(team, line, variant) {
  return `${team}||${line}||${variant}`;
}

function lvKey(team, line) {
  return `${team}||${line}`;
}

function currentKey() {
  return pKey(state.calcTeam, state.calcLine, state.calcVariant);
}

function currentNorm() {
  return num((((data[state.calcTeam] || {})[state.calcLine] || {}).varianty || {})[state.calcVariant]);
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
  save(STATE_KEY, state);
  calcResult();
  calcTwoHour();
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
  calcResult();
  calcTwoHour();
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
    const target = selectedMode === 'two' ? calc.firstHour : calc.produced;
    window.setTimeout(() => {
      target.focus();
      target.select();
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

function refreshManagers(preserve = true) {
  const teamList = teams();
  setOptions(mgr.teamSel, teamList, (team) => `Tým ${team}`, preserve ? mgr.teamSel.value : state.calcTeam);
  mgr.teamName.value = mgr.teamSel.value || '';

  setOptions(mgr.lineTeam, teamList, (team) => `Tým ${team}`, preserve ? mgr.lineTeam.value : state.calcTeam);
  refreshLineManager(preserve);

  setOptions(mgr.varTeam, teamList, (team) => `Tým ${team}`, preserve ? mgr.varTeam.value : state.calcTeam);
  refreshVarLineManager(preserve);
  renderOverview();
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
  mgr.varNorm.value = variant ? data[team][line].varianty[variant] : '';
}

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
  delete produced[pKey(team, line, variant)];
  delete twoProduced[pKey(team, line, variant)];
  if (state.lineVariant[lvKey(team, line)] === variant) delete state.lineVariant[lvKey(team, line)];
  if (state.calcTeam === team && state.calcLine === line && state.calcVariant === variant) state.calcVariant = '';

  save(DATA_KEY, data);
  save(PROD_KEY, produced);
  save(TWO_PROD_KEY, twoProduced);
  save(STATE_KEY, state);
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
  const targetPage = ['calculator', 'management', 'overview', 'backup'].includes(pageName) ? pageName : 'calculator';
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
    version: 5,
    created: new Date().toISOString(),
    data,
    state,
    produced,
    twoProduced,
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
    normalize();
    if (backup.theme) applyTheme(backup.theme);
    refreshCalc(true, true, true);
    setCalcMode(state.calcMode, false);
    refreshManagers(false);
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
refreshCalc(true, true, true);
setCalcMode(state.calcMode, false);
refreshManagers(false);
showPage('calculator');
