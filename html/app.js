'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let fields      = [];
let current     = {};
let original    = {};
let modelKey    = '';
let modelName   = '';
let vehicleClass = null;
let savedModels = {};
let activeTab   = '';
let fieldFilter = '';
let undoStack   = [];
let redoStack   = [];
let collapsedCategories = {};
let lockedFields = {};
let diffOpen   = false;
let livePreview = true;
let guideOpen   = false;
let guideStep   = 0;

const BUILTIN_PRESETS = [
    {
        id: 'race',
        label: 'Race',
        description: 'Track-biased setup with stable aero, strong grip, and clean response.',
        handling: {
            fMass: 1280,
            fInitialDriveForce: 0.31,
            fInitialDriveMaxFlatVel: 235,
            fDriveInertia: 1.0,
            fBrakeForce: 1.28,
            fBrakeBiasFront: 0.64,
            fSteeringLock: 36,
            fTractionCurveMax: 2.95,
            fTractionCurveMin: 2.6,
            fTractionCurveLateral: 25,
            fTractionLossMult: 0.82,
            fSuspensionForce: 7.1,
            fSuspensionCompDamp: 2.0,
            fSuspensionReboundDamp: 2.35,
            fAntiRollBarForce: 1.25,
            fAntiRollBarBiasFront: 0.53,
            fSuspensionRaise: -0.02,
        },
    },
    {
        id: 'drift',
        label: 'Drift',
        description: 'Loose rear grip, more steering angle, and aggressive rotation.',
        handling: {
            fMass: 1220,
            fInitialDriveForce: 0.39,
            fInitialDriveMaxFlatVel: 215,
            fDriveBiasFront: 0.0,
            fDriveInertia: 0.8,
            fBrakeForce: 1.08,
            fBrakeBiasFront: 0.58,
            fSteeringLock: 62,
            fTractionCurveMax: 2.0,
            fTractionCurveMin: 1.25,
            fTractionCurveLateral: 40,
            fTractionLossMult: 1.55,
            fLowSpeedTractionLossMult: 0.35,
            fSuspensionForce: 4.8,
            fSuspensionCompDamp: 1.65,
            fSuspensionReboundDamp: 1.9,
            fAntiRollBarForce: 0.95,
            fAntiRollBarBiasFront: 0.4,
            fSuspensionRaise: -0.03,
        },
    },
    {
        id: 'offroad',
        label: 'Off-Road',
        description: 'Soft travel, stable grip, and predictable behavior over rough terrain.',
        handling: {
            fMass: 2250,
            fInitialDriveForce: 0.24,
            fInitialDriveMaxFlatVel: 170,
            fDriveBiasFront: 0.45,
            fBrakeForce: 0.98,
            fBrakeBiasFront: 0.62,
            fSteeringLock: 40,
            fTractionCurveMax: 2.45,
            fTractionCurveMin: 2.15,
            fTractionCurveLateral: 28,
            fLowSpeedTractionLossMult: 0.25,
            fTractionLossMult: 0.9,
            fSuspensionForce: 2.8,
            fSuspensionCompDamp: 1.35,
            fSuspensionReboundDamp: 1.7,
            fSuspensionUpperLimit: 0.28,
            fSuspensionLowerLimit: -0.32,
            fSuspensionRaise: 0.26,
            fAntiRollBarForce: 0.45,
            fAntiRollBarBiasFront: 0.5,
        },
    },
    {
        id: 'daily',
        label: 'Daily',
        description: 'Comfortable street tune with mild stability and safe manners.',
        handling: {
            fMass: 1550,
            fInitialDriveForce: 0.22,
            fInitialDriveMaxFlatVel: 185,
            fDriveBiasFront: 0.5,
            fBrakeForce: 0.96,
            fBrakeBiasFront: 0.61,
            fSteeringLock: 36,
            fTractionCurveMax: 2.6,
            fTractionCurveMin: 2.3,
            fTractionCurveLateral: 27,
            fTractionLossMult: 1.0,
            fSuspensionForce: 4.2,
            fSuspensionCompDamp: 1.7,
            fSuspensionReboundDamp: 1.9,
            fAntiRollBarForce: 0.8,
            fAntiRollBarBiasFront: 0.5,
            fSuspensionRaise: 0,
        },
    },
];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const overlay      = document.getElementById('hc-overlay');
const vehicleName  = document.getElementById('hc-vehicle-name');
const tabBar       = document.getElementById('hc-tabs');
const fieldsEl     = document.getElementById('hc-fields');
const categoryEmpty = document.getElementById('hc-category-empty');
const bodyCategory  = document.getElementById('hc-body-category');
const classBadge    = document.getElementById('hc-vehicle-name');
const statusEl     = document.getElementById('hc-status');
const btnUndo      = document.getElementById('btn-undo');
const btnRedo      = document.getElementById('btn-redo');
const btnToggleCategory = document.getElementById('btn-toggle-category');
const btnDiff      = document.getElementById('btn-diff');
const btnDiffClose = document.getElementById('btn-diff-close');
const btnExportXml = document.getElementById('btn-export-xml');
const btnExportPreset = document.getElementById('btn-export-preset');
const btnImportPreset = document.getElementById('btn-import-preset');
const presetSelect     = document.getElementById('preset-select');
 const presetNameInput  = document.getElementById('preset-name-input');
const fieldFilterInput  = document.getElementById('field-filter-input');
const toggleLive       = document.getElementById('toggle-live');
const tooltip      = document.getElementById('hc-tooltip');
const tooltipLabel = document.getElementById('hc-tooltip-label');
const tooltipDesc  = document.getElementById('hc-tooltip-desc');
const tooltipTip   = document.getElementById('hc-tooltip-tip');
const diffPanel    = document.getElementById('hc-diff');
const diffSummary  = document.getElementById('diff-summary');
const diffList     = document.getElementById('diff-list');
const guidePanel   = document.getElementById('hc-guide');
const classHintEl  = document.getElementById('hc-class-hint');
const modalBackdrop = document.getElementById('hc-modal-backdrop');
const modalTitle    = document.getElementById('hc-modal-title');
const modalSubtitle = document.getElementById('hc-modal-subtitle');
const modalTextarea = document.getElementById('hc-modal-textarea');
const modalCopyBtn  = document.getElementById('btn-modal-copy');
const modalDownloadBtn = document.getElementById('btn-modal-download');
const modalSubmitBtn = document.getElementById('btn-modal-submit');
const modalCloseBtn = document.getElementById('btn-modal-close');

let modalMode = '';

// ─── Utilities ────────────────────────────────────────────────────────────────
function setStatus(msg, type = '') {
    statusEl.textContent = msg;
    statusEl.className = type;
}

function round(v, step) {
    if (step >= 1) return Math.round(v);
    const dec = (step.toString().split('.')[1] || '').length;
    return parseFloat(v.toFixed(dec));
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function cloneHandling(data) {
    return JSON.parse(JSON.stringify(data || {}));
}

function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length <= 1;
    btnRedo.disabled = redoStack.length === 0;
}

function isBuiltinPresetValue(value) {
    return typeof value === 'string' && value.startsWith('builtin:');
}

function getBuiltinPreset(value) {
    const id = String(value || '').replace(/^builtin:/, '');
    return BUILTIN_PRESETS.find(preset => preset.id === id) || null;
}

function getPresetLabel(value) {
    const preset = getBuiltinPreset(value);
    return preset ? `Baseline: ${preset.label}` : String(value || '');
}

function updateCategoryHeader() {
    const collapsed = !!collapsedCategories[activeTab];
    bodyCategory.textContent = activeTab ? `CATEGORY: ${activeTab}` : 'CATEGORY';
    btnToggleCategory.textContent = collapsed ? 'EXPAND' : 'COLLAPSE';
    btnToggleCategory.disabled = !activeTab;
}

function updateVehicleClassDisplay() {
    const name = vehicleClass && vehicleClass.name ? vehicleClass.name : 'UNKNOWN CLASS';
    const id = vehicleClass && vehicleClass.id !== undefined ? vehicleClass.id : '';
    const classText = id === '' ? name : `${name} [${id}]`;
    classBadge.textContent = modelName + (modelKey ? ` [${modelKey}]` : '') + ` • ${classText}`;
    classHintEl.textContent = `CLASS HINT: ${getSuggestedFocus(vehicleClass && vehicleClass.id)}`;
}

function getSuggestedFocus(classId) {
    if (classId === undefined || classId === null) return 'None';
    switch (classId) {
        case 0: return 'Balanced Street / Suspension';
        case 1: return 'Sedan Grip / Brakes';
        case 2: return 'SUV Stability / Suspension';
        case 3: return 'Coupes / Engine & Steering';
        case 4: return 'Muscle / Traction & Drivetrain';
        case 5: return 'Classic Grip / Brakes';
        case 6: return 'Sports / Engine & Traction';
        case 7: return 'Super / Aerodynamics & Grip';
        case 8: return 'Bike / Steering & Balance';
        case 9: return 'Off-Road / Suspension';
        case 10: return 'Industrial / Durability';
        case 11: return 'Utility / Suspension';
        case 12: return 'Van / Stability';
        case 13: return 'Cycle / Minimal Tuning';
        case 14: return 'Boat / N/A';
        case 15: return 'Helicopter / N/A';
        case 16: return 'Plane / N/A';
        case 17: return 'Service / Stability';
        case 18: return 'Emergency / Brakes';
        case 19: return 'Military / Durability';
        case 20: return 'Commercial / Stability';
        case 21: return 'Train / N/A';
        default: return 'General Tuning';
    }
}

function updateDiffToggle() {
    btnDiff.textContent = diffOpen ? '⇆ DIFF ON' : '⇆ DIFF';
}

function updateLockStateFromMessage(data) {
    if (data && data.lockedFields && typeof data.lockedFields === 'object') {
        lockedFields = { ...data.lockedFields };
    }
}

function isFieldLocked(key) {
    return !!lockedFields[key];
}

function updateLockButton(button, key) {
    const locked = isFieldLocked(key);
    button.classList.toggle('active', locked);
    button.textContent = locked ? '🔒' : '🔓';
    button.title = locked ? 'Unlock this field' : 'Lock this field';
}

function mergeHandlingWithLocks(base, next) {
    const result = cloneHandling(base);
    for (const f of fields) {
        if (isFieldLocked(f.key)) continue;
        if (next[f.key] !== undefined) result[f.key] = next[f.key];
    }
    return result;
}

function getComparisonSource() {
    const selected = presetSelect.value;
    if (selected) {
        if (isBuiltinPresetValue(selected)) {
            const preset = getBuiltinPreset(selected);
            if (preset) return { label: `Baseline: ${preset.label}`, handling: preset.handling };
        } else if (savedModels[selected]) {
            return { label: selected, handling: savedModels[selected] };
        }
    }
    return { label: 'Stock / original', handling: original };
}

function renderDiffPanel() {
    if (!diffOpen) return;

    const source = getComparisonSource();
    const compare = source.handling || {};
    const total = fields.length;
    let changed = 0;

    diffSummary.textContent = `Comparing current values against ${source.label}. Fields with differences are highlighted.`;
    diffList.innerHTML = '';

    if (!fields.length) {
        diffList.innerHTML = '<div class="diff-empty">No fields available to compare.</div>';
        return;
    }

    for (const f of fields) {
        const currentValue = current[f.key];
        const compareValue = compare[f.key];
        const currentText = currentValue === undefined ? '—' : String(currentValue);
        const compareText = compareValue === undefined ? '—' : String(compareValue);
        const mismatch = currentValue !== compareValue;
        if (mismatch) changed++;

        const row = document.createElement('div');
        row.className = 'diff-row' + (mismatch ? ' changed' : '');
        row.innerHTML = `
            <div class="diff-row-header">
                <div class="diff-row-label">${f.label}</div>
                <div class="diff-row-cat">${f.cat}</div>
            </div>
            <div class="diff-values">
                <div class="diff-value current ${mismatch ? 'mismatch' : ''}"><span>Current</span>${currentText}</div>
                <div class="diff-value compare ${mismatch ? 'mismatch' : ''}"><span>${source.label}</span>${compareText}</div>
            </div>
        `;
        diffList.appendChild(row);
    }

    diffSummary.textContent = `Comparing current values against ${source.label}. ${changed} of ${total} fields differ.`;
}

function setDiffOpen(nextState) {
    diffOpen = !!nextState;
    diffPanel.classList.toggle('hidden', !diffOpen);
    updateDiffToggle();
    renderDiffPanel();
}

function updateDeltaDisplay(deltaEl, value, originalValue, step) {
    const decimals = Math.max(0, (String(step).split('.')[1] || '').length);
    const delta = round((value ?? 0) - (originalValue ?? 0), step);
    if (delta === 0) {
        deltaEl.className = 'hc-field-delta clean';
        deltaEl.textContent = 'No change';
        return;
    }
    deltaEl.className = 'hc-field-delta dirty';
    deltaEl.textContent = (delta > 0 ? '+' : '') + delta.toFixed(decimals);
}

function pushUndoSnapshot() {
    const snapshot = cloneHandling(current);
    const previous = undoStack[undoStack.length - 1];
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    undoStack.push(snapshot);
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
}

function setCurrentHandling(next, options = {}) {
    current = cloneHandling(next);
    renderFields();
    if (options.pushHistory !== false) pushUndoSnapshot();
}

function applyCurrentHandling(next, options = {}) {
    setCurrentHandling(mergeHandlingWithLocks(current, next), options);
    return nuiFetch('applyAll', { handling: current });
}

function undoChange() {
    if (undoStack.length <= 1) return;
    redoStack.push(cloneHandling(current));
    undoStack.pop();
    current = cloneHandling(undoStack[undoStack.length - 1]);
    renderFields();
    nuiFetch('applyAll', { handling: current });
    updateHistoryButtons();
    setStatus('Undo applied.', 'ok');
}

function redoChange() {
    if (redoStack.length === 0) return;
    const snapshot = redoStack.pop();
    current = cloneHandling(snapshot);
    undoStack.push(cloneHandling(snapshot));
    renderFields();
    nuiFetch('applyAll', { handling: current });
    updateHistoryButtons();
    setStatus('Redo applied.', 'ok');
}

function setCategoryCollapsed(cat, collapsed) {
    if (!cat) return;
    collapsedCategories[cat] = collapsed;
    updateCategoryHeader();
    renderFields();
}

function isCategoryCollapsed(cat) {
    return !!collapsedCategories[cat];
}

function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64Utf8(text) {
    const binary = atob(text);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function setModalVisible(visible) {
    modalBackdrop.classList.toggle('hidden', !visible);
    if (visible) {
        setTimeout(() => modalTextarea.focus(), 0);
    }
}

function openExportModal(content, filename) {
    modalMode = 'export';
    modalTitle.textContent = 'Export Preset';
    modalSubtitle.textContent = 'Copy the JSON or download it as a file.';
    modalTextarea.value = content;
    modalTextarea.placeholder = '';
    modalSubmitBtn.textContent = 'CLOSE';
    modalCopyBtn.classList.remove('hidden');
    modalDownloadBtn.classList.remove('hidden');
    modalCopyBtn.textContent = 'COPY';
    modalDownloadBtn.textContent = 'DOWNLOAD';
    modalTextarea.dataset.filename = filename || 'preset.json';
    setModalVisible(true);
}

function openImportModal() {
    modalMode = 'import';
    modalTitle.textContent = 'Import Preset';
    modalSubtitle.textContent = 'Paste JSON or Base64 data, then import it into the current vehicle.';
    modalTextarea.value = '';
    modalTextarea.placeholder = 'Paste preset JSON or Base64 data here...';
    modalSubmitBtn.textContent = 'IMPORT';
    modalCopyBtn.classList.add('hidden');
    modalDownloadBtn.classList.add('hidden');
    setModalVisible(true);
}

function closeModal() {
    modalMode = '';
    setModalVisible(false);
}

async function exportModalCopy() {
    const ok = await copyText(modalTextarea.value);
    setStatus(ok ? 'Copied export data to clipboard.' : 'Clipboard copy failed.', ok ? 'ok' : 'error');
}

function exportModalDownload() {
    const filename = modalTextarea.dataset.filename || 'preset.json';
    downloadText(filename, modalTextarea.value, 'application/json');
    setStatus('Export downloaded.', 'ok');
}

function importModalSubmit() {
    const blob = modalTextarea.value.trim();
    if (!blob) {
        setStatus('Paste preset data before importing.', 'error');
        return;
    }

    let payload;
    try {
        payload = decodePresetBlob(blob);
    } catch (err) {
        setStatus('Invalid preset data.', 'error');
        return;
    }

    const handling = extractHandlingPayload(payload);
    if (!handling) {
        setStatus('Preset data did not contain handling values.', 'error');
        return;
    }

    const name = (payload && payload.presetName ? String(payload.presetName) : presetNameInput.value.trim() || modelName || 'Imported Preset').trim();
    const saveModelKey = modelKey || (payload && payload.modelKey ? String(payload.modelKey) : '');

    applyCurrentHandling(handling).then(async () => {
        if (name) {
            savedModels[name] = { _modelKey: saveModelKey, ...current };
            presetNameInput.value = name;
            refreshPresetDropdown();
            presetSelect.value = name;
            await nuiFetch('saveHandling', { presetName: name, modelKey: saveModelKey, handling: current });
        }

        setStatus(`Imported preset${name ? `: ${name}` : ''}.`, 'ok');
        closeModal();
    });
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatHandlingValue(value, step) {
    const decimals = Math.max(0, (String(step).split('.')[1] || '').length);
    const output = round(Number(value) || 0, step);
    return decimals > 0 ? output.toFixed(decimals) : String(Math.round(output));
}

function buildHandlingMetaXml(name, handling) {
    const handlingName = escapeXml(name || modelName || modelKey || 'CUSTOM_HANDLING');
    const items = fields
        .map(f => {
            const value = handling[f.key];
            if (value === undefined || value === null || Number.isNaN(Number(value))) return null;
            return `    <${f.key} value="${escapeXml(formatHandlingValue(value, f.step))}" />`;
        })
        .filter(Boolean)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<HandlingData>\n  <Item type="CHandlingData">\n    <handlingName>${handlingName}</handlingName>\n${items}\n  </Item>\n</HandlingData>\n`;
}

function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}

async function copyText(content) {
    try {
        await navigator.clipboard.writeText(content);
        return true;
    } catch (err) {
        return false;
    }
}

function extractHandlingPayload(input) {
    if (!input || typeof input !== 'object') return null;
    if (input.handling && typeof input.handling === 'object') return input.handling;
    const out = {};
    for (const f of fields) {
        if (input[f.key] !== undefined) out[f.key] = input[f.key];
    }
    return Object.keys(out).length > 0 ? out : null;
}

function decodePresetBlob(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
    return JSON.parse(fromBase64Utf8(raw));
}

// ─── NUI communication ────────────────────────────────────────────────────────
const RESOURCE_NAME = (typeof GetParentResourceName === 'function')
    ? GetParentResourceName()
    : 'dg-handlingcontrol';

function nuiFetch(event, data) {
    return fetch(`https://${RESOURCE_NAME}/${event}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    }).then(r => r.json()).catch(() => null);
}

function sendApplyField(f, val, isInt) {
    nuiFetch('applyField', { field: f.key, value: val, isInt: !!isInt });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
let tooltipVisible = false;

function showTooltip(f, e) {
    tooltipLabel.textContent = f.label;
    tooltipDesc.textContent  = f.desc || '';
    tooltipTip.textContent   = f.tip  || '';
    tooltipTip.style.display = f.tip ? '' : 'none';
    tooltip.classList.remove('hidden');
    tooltipVisible = true;
    positionTooltip(e);
}

function hideTooltip() {
    tooltip.classList.add('hidden');
    tooltipVisible = false;
}

function positionTooltip(e) {
    if (!tooltipVisible) return;
    const tw = tooltip.offsetWidth  || 380;
    const th = tooltip.offsetHeight || 140;
    let x = e.clientX + 18;
    let y = e.clientY + 12;
    if (x + tw > window.innerWidth  - 10) x = e.clientX - tw - 18;
    if (y + th > window.innerHeight - 10) y = e.clientY - th - 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
}

document.addEventListener('mousemove', e => { if (tooltipVisible) positionTooltip(e); });

// ─── Build UI ─────────────────────────────────────────────────────────────────
function buildUI() {
    const cats = [];
    for (const f of fields) {
        if (!cats.includes(f.cat)) cats.push(f.cat);
    }
    tabBar.innerHTML = '';
    for (const cat of cats) {
        const btn = document.createElement('button');
        btn.className = 'hc-tab' + (cat === activeTab ? ' active' : '');
        btn.textContent = cat;
        btn.dataset.cat = cat;
        btn.addEventListener('click', () => switchTab(cat));
        tabBar.appendChild(btn);
    }
    renderFields();
}

function switchTab(cat) {
    activeTab = cat;
    document.querySelectorAll('.hc-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.cat === cat);
    });
    renderFields();
    if (guideOpen) applyGuideHighlights();
}

function renderFields() {
    fieldsEl.innerHTML = '';
    const needle = fieldFilter.trim().toLowerCase();
    const visible = fields.filter(f => {
        if (f.cat !== activeTab) return false;
        if (!needle) return true;
        return [f.key, f.label, f.cat, f.desc, f.tip].some(v => String(v || '').toLowerCase().includes(needle));
    });
    updateCategoryHeader();
    if (isCategoryCollapsed(activeTab)) {
        fieldsEl.classList.add('hidden');
        categoryEmpty.classList.remove('hidden');
        categoryEmpty.textContent = needle ? 'This category is collapsed.' : `The ${activeTab} category is collapsed.`;
        return;
    }
    fieldsEl.classList.remove('hidden');
    categoryEmpty.classList.add('hidden');
    for (const f of visible) {
        fieldsEl.appendChild(buildFieldCard(f));
    }
    if (guideOpen) applyGuideHighlights();
    renderDiffPanel();
}

function buildFieldCard(f) {
    const val   = current[f.key] ?? 0;
    const orig  = original[f.key] ?? val;
    const isInt = f.getter === 'GetVehicleHandlingInt';

    const card = document.createElement('div');
    card.className = 'hc-field' + (val !== orig ? ' dirty' : '');
    card.id = 'field-card-' + f.key;

    // Tooltip on hover
    card.addEventListener('mouseenter', e => showTooltip(f, e));
    card.addEventListener('mouseleave', hideTooltip);

    const label = document.createElement('div');
    label.className = 'hc-field-label';
    label.textContent = f.label;

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'hc-field-reset';
    resetBtn.title = 'Reset this field to the original value';
    resetBtn.textContent = '↺';

    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'hc-field-reset hc-field-lock';
    updateLockButton(lockBtn, f.key);
    lockBtn.addEventListener('click', () => {
        lockedFields[f.key] = !isFieldLocked(f.key);
        updateLockButton(lockBtn, f.key);
        if (guideOpen) applyGuideHighlights();
        renderDiffPanel();
        setStatus(`${f.label} ${isFieldLocked(f.key) ? 'locked' : 'unlocked'}.`, 'ok');
    });

    const labelRow = document.createElement('div');
    labelRow.className = 'hc-field-label-row';
    labelRow.appendChild(label);
    labelRow.appendChild(resetBtn);
    labelRow.appendChild(lockBtn);
    card.appendChild(labelRow);

    const delta = document.createElement('div');
    delta.className = 'hc-field-delta' + (val !== orig ? ' dirty' : ' clean');
    updateDeltaDisplay(delta, val, orig, f.step);
    card.appendChild(delta);

    const row = document.createElement('div');
    row.className = 'hc-field-row';

    const btnMinus = document.createElement('button');
    btnMinus.className = 'hc-step';
    btnMinus.textContent = '−';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.className = 'hc-slider';
    slider.min   = f.min;
    slider.max   = f.max;
    slider.step  = f.step;
    slider.value = clamp(val, f.min, f.max);

    const num = document.createElement('input');
    num.type  = 'number';
    num.className = 'hc-num';
    num.min   = f.min;
    num.max   = f.max;
    num.step  = f.step;
    num.value = round(val, f.step);

    const btnPlus = document.createElement('button');
    btnPlus.className = 'hc-step';
    btnPlus.textContent = '+';

    // Guard flag — prevents programmatic value assignments from re-firing events
    let syncing = false;

    function setInputs(v) {
        syncing = true;
        slider.value = v;
        num.value = v;
        syncing = false;
    }

    function syncFromSlider() {
        if (syncing) return;
        const v = round(parseFloat(slider.value), f.step);
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    }

    function syncFromNum() {
        if (syncing) return;
        let v = round(clamp(parseFloat(num.value) || 0, f.min, f.max), f.step);
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    }

    slider.addEventListener('input', syncFromSlider);
    // Use 'change' only on blur (user leaves the field) or Enter key —
    // NOT on programmatic assignment, which CEF can re-fire as a change event.
    num.addEventListener('change', syncFromNum);
    num.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); syncFromNum(); } });

    resetBtn.addEventListener('click', () => {
        const v = orig;
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    });

    function setNumeric(v) {
        setInputs(v);
        current[f.key] = v;
        updateDirty(f.key, card);
        updateDeltaDisplay(delta, v, orig, f.step);
        pushUndoSnapshot();
        if (livePreview) sendApplyField(f, v, isInt);
    }

    btnMinus.addEventListener('click', () => {
        setNumeric(round(clamp((current[f.key] ?? 0) - f.step, f.min, f.max), f.step));
    });

    btnPlus.addEventListener('click', () => {
        setNumeric(round(clamp((current[f.key] ?? 0) + f.step, f.min, f.max), f.step));
    });

    row.appendChild(btnMinus);
    row.appendChild(slider);
    row.appendChild(num);
    row.appendChild(btnPlus);
    card.appendChild(row);

    const meta = document.createElement('div');
    meta.className = 'hc-field-meta';
    meta.innerHTML = `<span>MIN ${f.min}</span><span>STEP ${f.step}</span><span>MAX ${f.max}</span>`;
    card.appendChild(meta);

    return card;
}

function updateDirty(key, card) {
    card.classList.toggle('dirty', current[key] !== original[key]);
}

// ─── Preset dropdown ──────────────────────────────────────────────────────────
function refreshPresetDropdown() {
    presetSelect.innerHTML = '<option value="">— Load Preset —</option>';

    const baselineGroup = document.createElement('optgroup');
    baselineGroup.label = 'Built-in Baselines';
    for (const preset of BUILTIN_PRESETS) {
        const opt = document.createElement('option');
        opt.value = `builtin:${preset.id}`;
        opt.textContent = `Baseline: ${preset.label}`;
        opt.title = preset.description;
        baselineGroup.appendChild(opt);
    }
    presetSelect.appendChild(baselineGroup);

    const savedGroup = document.createElement('optgroup');
    savedGroup.label = 'Saved Presets';
    for (const [key, data] of Object.entries(savedModels)) {
        const opt = document.createElement('option');
        opt.value = key;
        const isThisModel = data && data._modelKey === modelKey;
        opt.textContent = key + (isThisModel ? ' ★' : '');
        savedGroup.appendChild(opt);
    }
    presetSelect.appendChild(savedGroup);
}

// ─────────────────────────────────────────────────────────────────────────────
//  STEP-BY-STEP TUNING GUIDE
// ─────────────────────────────────────────────────────────────────────────────
const GUIDE_STEPS = [
    {
        title: '1. Engine Basics',
        goal: 'Set the foundation: how heavy, how powerful, and how fast your vehicle is.',
        instructions: `Start here before touching anything else. Mass affects everything. Drive Force is your engine power. Max Speed is the hard ceiling.\n\nFor a performance tune: keep Mass realistic, raise Drive Force gradually until the car feels strong but not wheel-spiny, then set Max Speed to match your intended top speed.`,
        cat: 'Engine',
        fields: ['fMass', 'fInitialDriveForce', 'fInitialDriveMaxFlatVel'],
    },
    {
        title: '2. Drivetrain & Gearing',
        goal: 'Choose your drivetrain type and tune gear response for optimal power delivery.',
        instructions: `Drive Bias Front decides if the car is RWD, FWD, or AWD. Set this before anything else.\n\n• RWD (0.0): sporty, drifty, needs traction tuning.\n• AWD (0.45–0.55): balanced all-around.\n• FWD (1.0): stable but understeers.\n\nMore gears = wider power band. Lower inertia = snappier throttle.`,
        cat: 'Engine',
        fields: ['fDriveBiasFront', 'nInitialDriveGears', 'fDriveInertia', 'fClutchChangeRateScaleUpShift', 'fClutchChangeRateScaleDownShift'],
    },
    {
        title: '3. Brakes',
        goal: 'Match stopping power to engine power. Set front/rear bias correctly.',
        instructions: `Brake Force should scale with your Drive Force — a powerful engine needs powerful brakes.\n\n• Bias: 0.6–0.7 front is a classic performance bias. Lower = rear-heavy (spin risk). Higher = stable but understeers under braking.\n• Handbrake: higher for drift initiation, lower for grip racing.`,
        cat: 'Brakes',
        fields: ['fBrakeForce', 'fBrakeBiasFront', 'fHandBrakeForce'],
    },
    {
        title: '4. Steering',
        goal: 'Dial in how responsive and tight the steering feels at all speeds.',
        instructions: `Steering Lock is how far the wheels physically turn.\n• Drift cars: 55–65° for massive angle.\n• Track cars: 30–38° for high-speed stability.\n• Street: 35–42°.\n\nIf the car turns too slowly, raise Steering Lock. If it's twitchy at speed, lower it. Keep Lock Ratio near 0.5 for a natural progressive feel.`,
        cat: 'Steering',
        fields: ['fSteeringLock', 'fSteeringLockRatio'],
    },
    {
        title: '5. Traction Curve',
        goal: 'Set how much grip the tyres have and how they behave when sliding.',
        instructions: `This is the most technical section. Think in layers:\n\n1. TractionCurveMax — grip before sliding. Raise for more grip.\n2. TractionCurveMin — grip DURING a slide. Keep close to Max for predictable recovery. Large gap = snappy oversteer.\n3. TractionCurveLateral — slip angle before peak grip. Higher = more forgiving.\n4. LowSpeedTractionLoss — wheelspin off the line. Near 0 for launch traction, raise for burnout feel.`,
        cat: 'Traction',
        fields: ['fTractionCurveMax', 'fTractionCurveMin', 'fTractionCurveLateral', 'fLowSpeedTractionLossMult', 'fTractionBiasFront', 'fTractionLossMult'],
    },
    {
        title: '6. Suspension Springs & Ride Height',
        goal: 'Set spring stiffness and how high the car sits off the ground.',
        instructions: `Suspension Force = spring stiffness. This is the single biggest factor in how the car feels overall.\n\n• Race/track: 8–14. Stiff, flat, responsive.\n• Street performance: 4–7. Balanced.\n• Off-road/truck: 2–4. Soft and compliant.\n\nRide Height (Suspension Raise): negative slams it, positive raises for off-road. Lowering reduces center of gravity.`,
        cat: 'Suspension',
        fields: ['fSuspensionForce', 'fSuspensionRaise', 'fSuspensionBiasFront', 'fSuspensionUpperLimit', 'fSuspensionLowerLimit'],
    },
    {
        title: '7. Dampers & Roll Control',
        goal: 'Control body movement — bounce, dive, and lean in corners.',
        instructions: `Compression Damping = how fast suspension collapses on bumps (controls dive under braking).\nRebound Damping = how fast it extends back (controls bounce-back after a bump).\n\nKeep Comp and Rebound within 0.3–0.5 of each other for most setups.\n\nAnti-Roll Bar Force: raise it for a flatter, more grippy feel in corners. Anti-Roll Bias shifted front = understeer, rear = oversteer.`,
        cat: 'Suspension',
        fields: ['fSuspensionCompDamp', 'fSuspensionReboundDamp', 'fAntiRollBarForce', 'fAntiRollBarBiasFront', 'fRollCentreHeightFront', 'fRollCentreHeightRear'],
    },
    {
        title: '8. Damage & Final Save',
        goal: 'Set vehicle durability, test drive, then save your permanent preset.',
        instructions: `Admin/special vehicle: set all damage multipliers to 0 (god-mode hull).\nRealistic: leave at 1.0.\nTough vehicle: 0.3–0.5.\n\nOnce satisfied:\n1. Test drive the car.\n2. Return and click ↻ REFRESH to re-read live values.\n3. Fine-tune anything that still feels off.\n4. Click 💾 SAVE — the preset will auto-apply every time you enter this vehicle model.`,
        cat: 'Damage',
        fields: ['fCollisionDamageMult', 'fWeaponDamageMult', 'fDeformationDamageMult', 'fEngineDamageMult'],
    },
];

function openGuide() {
    guideOpen = true;
    guideStep = 0;
    guidePanel.classList.remove('hidden');
    renderGuideStep();
}

function closeGuide() {
    guideOpen = false;
    guidePanel.classList.add('hidden');
    clearGuideHighlights();
    setStatus('Ready. Hover a field for a detailed description.', '');
}

function renderGuideStep() {
    const step = GUIDE_STEPS[guideStep];

    document.getElementById('guide-step-badge').textContent = `STEP ${guideStep + 1} / ${GUIDE_STEPS.length}`;
    document.getElementById('guide-title').textContent = step.title;
    document.getElementById('guide-goal').textContent = step.goal;
    document.getElementById('guide-instructions').textContent = step.instructions;

    // Field reference list (clickable — jump to field)
    const list = document.getElementById('guide-fields-list');
    list.innerHTML = '';
    for (const key of step.fields) {
        const f = fields.find(x => x.key === key);
        if (!f) continue;
        const ref = document.createElement('div');
        ref.className = 'guide-field-ref';
        ref.innerHTML = `<div class="guide-field-ref-label">${f.label}</div><div class="guide-field-ref-tip">${f.tip || ''}</div>`;
        ref.addEventListener('click', () => jumpToField(f));
        list.appendChild(ref);
    }

    // Progress dots
    const dotsEl = document.getElementById('guide-dots');
    dotsEl.innerHTML = '';
    for (let i = 0; i < GUIDE_STEPS.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'guide-dot' + (i === guideStep ? ' active' : '');
        dot.title = GUIDE_STEPS[i].title;
        dot.addEventListener('click', () => { guideStep = i; renderGuideStep(); });
        dotsEl.appendChild(dot);
    }

    // Switch to the step's category tab
    if (step.cat !== activeTab) switchTab(step.cat);
    if (isCategoryCollapsed(step.cat)) setCategoryCollapsed(step.cat, false);
    else { renderFields(); applyGuideHighlights(); }

    setStatus(`Guide Step ${guideStep + 1}/${GUIDE_STEPS.length}: ${step.title} — highlighted fields are your focus.`, '');
}

function applyGuideHighlights() {
    document.querySelectorAll('.hc-field.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
    if (!guideOpen) return;
    const step = GUIDE_STEPS[guideStep];
    for (const key of step.fields) {
        const card = document.getElementById('field-card-' + key);
        if (card) card.classList.add('guide-highlight');
    }
}

function clearGuideHighlights() {
    document.querySelectorAll('.hc-field.guide-highlight').forEach(el => el.classList.remove('guide-highlight'));
}

function jumpToField(f) {
    if (f.cat !== activeTab) {
        switchTab(f.cat);
        setTimeout(() => {
            const card = document.getElementById('field-card-' + f.key);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
    } else {
        const card = document.getElementById('field-card-' + f.key);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

document.getElementById('btn-guide').addEventListener('click', () => {
    if (guideOpen) closeGuide();
    else openGuide();
});

document.getElementById('btn-guide-next').addEventListener('click', () => {
    if (guideStep < GUIDE_STEPS.length - 1) { guideStep++; renderGuideStep(); }
    else closeGuide();
});

document.getElementById('btn-guide-prev').addEventListener('click', () => {
    if (guideStep > 0) { guideStep--; renderGuideStep(); }
});

btnDiff.addEventListener('click', () => {
    setDiffOpen(!diffOpen);
});

btnDiffClose.addEventListener('click', () => {
    setDiffOpen(false);
});

btnUndo.addEventListener('click', undoChange);
btnRedo.addEventListener('click', redoChange);
btnToggleCategory.addEventListener('click', () => {
    if (!activeTab) return;
    setCategoryCollapsed(activeTab, !isCategoryCollapsed(activeTab));
});

btnExportXml.addEventListener('click', async () => {
    if (!current || Object.keys(current).length === 0) {
        setStatus('Nothing to export yet.', 'error');
        return;
    }
    const exportName = presetNameInput.value.trim() || modelName || modelKey || 'HANDLING';
    const xml = buildHandlingMetaXml(exportName, current);
    await copyText(xml);
    downloadText(`handling-${(exportName || 'custom').replace(/[^a-z0-9_-]+/gi, '_')}.meta.xml`, xml, 'application/xml');
    setStatus('handling.meta XML copied and downloaded.', 'ok');
});

btnExportPreset.addEventListener('click', async () => {
    if (!current || Object.keys(current).length === 0) {
        setStatus('Nothing to export yet.', 'error');
        return;
    }
    const payload = {
        version: 1,
        presetName: presetNameInput.value.trim() || modelName || 'Custom Preset',
        modelKey: modelKey || '',
        modelName: modelName || '',
        handling: cloneHandling(current),
    };
    const json = JSON.stringify(payload, null, 2);
    openExportModal(json, `${(payload.presetName || 'preset').replace(/[^a-z0-9_-]+/gi, '_')}.json`);
    setStatus('Export ready. Copy or download from the modal.', 'ok');
});

btnImportPreset.addEventListener('click', async () => {
    openImportModal();
    setStatus('Paste preset data in the modal, then import it.', 'ok');
});

fieldFilterInput.addEventListener('input', () => {
    fieldFilter = fieldFilterInput.value || '';
    renderFields();
});

modalCloseBtn.addEventListener('click', closeModal);
modalCopyBtn.addEventListener('click', exportModalCopy);
modalDownloadBtn.addEventListener('click', exportModalDownload);
modalSubmitBtn.addEventListener('click', () => {
    if (modalMode === 'export') {
        closeModal();
        return;
    }
    importModalSubmit();
});

modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
});

// ─── Button handlers ──────────────────────────────────────────────────────────
function doClose() {
    overlay.classList.add('hidden');
    closeGuide();
    nuiFetch('close');
}

document.getElementById('btn-close').addEventListener('click', doClose);

document.getElementById('btn-read-live').addEventListener('click', async () => {
    setStatus('Reading live values…', 'warn');
    const live = await nuiFetch('readFields');
    if (live && Object.keys(live).length > 0) {
        current = mergeHandlingWithLocks(current, live);
        renderFields();
        pushUndoSnapshot();
        setStatus('Live values refreshed.', 'ok');
    } else {
        setStatus('Not in a vehicle.', 'error');
    }
});

document.getElementById('btn-reset-default').addEventListener('click', async () => {
    setStatus('Resetting to defaults…', 'warn');
    const defaults = await nuiFetch('resetToDefault');
    if (defaults && Object.keys(defaults).length > 0) {
        current = mergeHandlingWithLocks(current, defaults);
        renderFields();
        pushUndoSnapshot();
        setStatus('Handling reset to GTA defaults.', 'ok');
    } else {
        setStatus('Not in a vehicle — cannot reset.', 'error');
    }
});

document.getElementById('btn-apply-all').addEventListener('click', async () => {
    setStatus('Applying all…', 'warn');
    await nuiFetch('applyAll', { handling: current });
    setStatus('All handling values applied to vehicle.', 'ok');
});

document.getElementById('btn-save-preset').addEventListener('click', async () => {
    const name = presetNameInput.value.trim();
    if (!name) { setStatus('Enter a preset name before saving.', 'error'); presetNameInput.focus(); return; }
    if (!modelKey) { setStatus('No vehicle model to save for.', 'error'); return; }
    setStatus('Saving preset…', 'warn');
    savedModels[name] = { _modelKey: modelKey, ...current };
    await nuiFetch('saveHandling', { presetName: name, modelKey, handling: current });
    refreshPresetDropdown();
    // Select the just-saved entry in the dropdown
    presetSelect.value = name;
    setStatus(`Preset "${name}" saved.`, 'ok');
});

document.getElementById('btn-delete-preset').addEventListener('click', async () => {
    const key = presetSelect.value;
    if (isBuiltinPresetValue(key)) { setStatus('Built-in baselines cannot be deleted.', 'error'); return; }
    if (!key) { setStatus('Select a preset to delete.', 'error'); return; }
    delete savedModels[key];
    await nuiFetch('deleteHandling', { modelKey: key });
    refreshPresetDropdown();
    setStatus(`Preset deleted: ${key}.`, 'ok');
});

presetSelect.addEventListener('change', async () => {
    const key = presetSelect.value;
    // Populate the name input with the selected preset's name
    if (key && !isBuiltinPresetValue(key)) presetNameInput.value = key;
    if (!key) return;

    const builtin = getBuiltinPreset(key);
    const entry = builtin ? builtin.handling : savedModels[key];
    if (!entry) return;

    current = mergeHandlingWithLocks(current, entry);
    renderFields();
    pushUndoSnapshot();
    await nuiFetch('applyAll', { handling: current });
    setStatus(`${builtin ? 'Baseline' : 'Preset'} loaded & applied: ${builtin ? builtin.label : key}.`, 'ok');
});

toggleLive.addEventListener('change', () => {
    livePreview = toggleLive.checked;
});

// ─── NUI Message handler ──────────────────────────────────────────────────────
window.addEventListener('message', function(e) {
    const d = e.data;
    if (!d || !d.type) return;

    switch (d.type) {
        case 'open': {
            fields      = d.fields   || [];
            current     = d.current  || {};
            original    = { ...current };
            modelKey    = d.modelKey  || '';
            modelName   = d.modelName || 'UNKNOWN';
            vehicleClass = d.vehicleClass || null;
            savedModels = {};
            collapsedCategories = {};
            lockedFields = {};

            if (d.savedMap) savedModels = d.savedMap;

            activeTab = fields.length > 0 ? fields[0].cat : '';
            guideOpen = false;
            guidePanel.classList.add('hidden');
            diffOpen = false;
            diffPanel.classList.add('hidden');
            undoStack = [cloneHandling(current)];
            redoStack = [];
            fieldFilter = '';
            fieldFilterInput.value = '';

            // Pre-fill name input with a sensible default for this vehicle
            presetNameInput.value = modelName + (modelKey ? ' [' + modelKey + ']' : '');

            updateVehicleClassDisplay();
            overlay.classList.remove('hidden');
            buildUI();
            refreshPresetDropdown();
            updateHistoryButtons();
            updateCategoryHeader();
            updateDiffToggle();
            setStatus('Ready. Hover any field for a detailed description. Use 📋 GUIDE for step-by-step tuning.', '');
            break;
        }
        case 'close': {
            overlay.classList.add('hidden');
            closeGuide();
            break;
        }
    }
});

// Escape key to close
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        doClose();
    }
});
