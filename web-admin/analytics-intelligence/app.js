/**
 * Ellie Admin - AI Intelligence Dashboard
 *
 * Firebase callable functions consumed:
 *   getAnalyticsDashboardSnapshot({ summaryLimit? })
 *   rebuildAnalyticsDay({ dayKey })
 *   generateDailyAiIntelligence({ dayKey })
 *   markAiDecisionReviewed({ decisionId, status, note? })
 *
 * This dashboard intentionally consumes aggregate callable responses only.
 * Do not read analytics Firestore collections directly from this client.
 */

import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFunctions,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js';

const FIREBASE_INIT_JSON_URL = '/__/firebase/init.json';
const LOCAL_CONFIG_SCRIPT = 'firebase-config.local.js';

let app;
let auth;
let functions;
let currentUser = null;
let isInitialized = false;

const $ = (id) => document.getElementById(id);
const show = (id) => $(id)?.classList.remove('hidden');
const hide = (id) => $(id)?.classList.add('hidden');
const text = (id, val) => {
  const el = $(id);
  if (el) el.textContent = val;
};

function setMetric(id, value, isPercent = false) {
  const el = $(id);
  if (!el) return;
  if (value === null || value === undefined || Number.isNaN(value)) {
    el.textContent = '-';
    el.classList.add('null-val');
    return;
  }

  el.classList.remove('null-val');
  el.textContent = isPercent ? pct(value) : fmt(value);
}

function pct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function fmt(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

function dayKeyYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

async function loadLocalFirebaseConfig() {
  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LOCAL_CONFIG_SCRIPT;
    script.async = false;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error(`Local Firebase config not found at ${LOCAL_CONFIG_SCRIPT}.`));
    document.head.appendChild(script);
  });

  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;
  throw new Error(`${LOCAL_CONFIG_SCRIPT} loaded but did not set window.__FIREBASE_CONFIG__.`);
}

async function getFirebaseConfig() {
  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;

  try {
    const response = await fetch(FIREBASE_INIT_JSON_URL, { cache: 'no-store' });
    if (response.ok) {
      return await response.json();
    }
  } catch (_error) {
    // Static local servers do not expose Firebase Hosting reserved URLs.
  }

  return loadLocalFirebaseConfig();
}

async function initializeDashboard() {
  try {
    const config = await getFirebaseConfig();
    app = getApps().length ? getApps()[0] : initializeApp(config);
    auth = getAuth(app);
    functions = getFunctions(app);
    isInitialized = true;

    bindEvents();
    observeAuthState();
  } catch (error) {
    showFatalConfigError(error instanceof Error ? error.message : String(error));
  }
}

function callFn(name, data) {
  if (!functions) {
    return Promise.reject(new Error('Firebase Functions is not initialized.'));
  }
  const fn = httpsCallable(functions, name);
  return fn(data).then((r) => r.data);
}

const Api = {
  getDashboardSnapshot: (opts = {}) => callFn('getAnalyticsDashboardSnapshot', opts),
  rebuildDay: (dayKey) => callFn('rebuildAnalyticsDay', { dayKey }),
  generateAi: (dayKey) => callFn('generateDailyAiIntelligence', { dayKey }),
  markDecision: (decisionId, status, note) =>
    callFn('markAiDecisionReviewed', { decisionId, status, ...(note ? { note } : {}) }),
};

function isPermissionDenied(err) {
  return err?.code === 'functions/permission-denied' || err?.code === 'permission-denied';
}

function isUnauthenticated(err) {
  return err?.code === 'functions/unauthenticated' || err?.code === 'unauthenticated';
}

function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    err?.code === 'functions/unavailable' ||
    err?.code === 'functions/deadline-exceeded'
  );
}

function bindEvents() {
  $('btn-signin')?.addEventListener('click', async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        showError(`Sign-in failed: ${error?.message || 'Unknown error'}`);
      }
    }
  });

  $('btn-signout')?.addEventListener('click', async () => {
    if (!auth) return;
    await signOut(auth);
    showSignIn();
  });

  $('btn-refresh')?.addEventListener('click', () => loadDashboard());
  $('btn-retry-offline')?.addEventListener('click', () => loadDashboard());
  $('btn-retry-error')?.addEventListener('click', () => loadDashboard());
  $('btn-empty-rebuild-yesterday')?.addEventListener('click', () => runRebuildYesterday());
  $('btn-rebuild-yesterday')?.addEventListener('click', () => runRebuildYesterday());

  $('btn-rebuild')?.addEventListener('click', async () => {
    const dayKey = $('input-day-key').value.trim();
    if (!validateDayKey(dayKey)) return;
    await runAdminAction(() => Api.rebuildDay(dayKey), `Rebuilt analytics for ${dayKey}.`);
  });

  $('btn-generate')?.addEventListener('click', async () => {
    const dayKey = $('input-day-key').value.trim();
    if (!validateDayKey(dayKey)) return;
    await runAdminAction(
      () => Api.generateAi(dayKey),
      `Regenerated Claude analysis for ${dayKey}.`
    );
  });
}

function observeAuthState() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!user) {
      showSignIn();
      return;
    }

    $('identity-label')?.classList.remove('hidden');
    hide('identity-guest');
    text('identity-email', user.email || '(no email)');
    text('identity-uid', user.uid);
    show('btn-signout');
    hide('btn-signin');
    loadDashboard();
  });
}

function hideAllStates() {
  hide('dashboard');
  hide('state-empty');
  hide('state-loading');
  hide('state-restricted');
  hide('state-offline');
  hide('state-error');
  hide('state-signin');
}

function showSignIn() {
  hideAllStates();
  hide('identity-label');
  hide('btn-signout');
  show('identity-guest');
  show('btn-signin');
  show('state-signin');
  $('btn-refresh').disabled = true;
  text('header-subtitle', 'Founder/admin access only');
}

function showLoading() {
  hideAllStates();
  show('state-loading');
  $('btn-refresh').disabled = true;
}

function showRestricted() {
  hideAllStates();
  show('state-restricted');
  $('btn-refresh').disabled = false;
}

function showOffline() {
  hideAllStates();
  show('state-offline');
  $('btn-refresh').disabled = false;
}

function showError(msg) {
  hideAllStates();
  text('state-error-message', msg);
  show('state-error');
  $('btn-refresh').disabled = false;
}

function showEmpty() {
  hideAllStates();
  show('state-empty');
  $('btn-refresh').disabled = false;
  $('input-empty-day-key').value = dayKeyYesterday();
}

function showDashboard() {
  hideAllStates();
  show('dashboard');
  $('btn-refresh').disabled = false;
}

async function loadDashboard() {
  if (!isInitialized || !currentUser) {
    showSignIn();
    return;
  }

  showLoading();
  try {
    const snapshot = await Api.getDashboardSnapshot({ summaryLimit: 14 });

    if (!snapshot.summaries?.length && !snapshot.analyses?.length) {
      showEmpty();
      return;
    }

    renderDashboard(snapshot);
    showDashboard();
  } catch (err) {
    if (isUnauthenticated(err)) {
      showSignIn();
      return;
    }
    if (isPermissionDenied(err)) {
      showRestricted();
      return;
    }
    if (isNetworkError(err)) {
      showOffline();
      return;
    }

    const code = err?.code ?? '';
    const msg =
      code === 'functions/internal'
        ? 'The analytics function returned an internal error. Check deployed function logs and required parameters/secrets.'
        : err?.message || 'An unexpected error occurred.';
    showError(`${msg}${code ? `\n\n(${code})` : ''}`);
  }
}

function renderDashboard(snapshot) {
  const summary = snapshot.summaries?.[0] ?? null;
  const analysis = snapshot.analyses?.[0] ?? null;
  const decisions = (snapshot.decisions ?? [])
    .slice()
    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  renderHeader(summary, analysis);
  renderSummaryCard(analysis);
  renderMissionControl(summary, analysis, decisions);
  renderDecisions(decisions);
  renderDetails(summary);
  renderRealtime(snapshot.realtime ?? []);
  prefillDayKey(summary);
}

function severityOrder(severity) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[severity] ?? 4;
}

function renderHeader(summary, analysis) {
  if (!summary && !analysis) {
    text('header-subtitle', 'No reports available');
    return;
  }
  const date = (summary?.dayKey ?? analysis?.dayKey ?? '').replace(/-/g, '-');
  const model = analysis ? analysis.model : '';
  const status = analysis ? analysis.status : '';
  text('header-subtitle', [date, model, status].filter(Boolean).join(' · '));
}

function renderSummaryCard(analysis) {
  if (!analysis) {
    text(
      'summary-text',
      'No AI analysis available yet. Rebuild a day or regenerate Claude analysis.'
    );
    hide('summary-status-chip');
    hide('summary-fallback-msg');
    return;
  }

  text('summary-text', analysis.executiveSummary || 'No summary.');

  const chip = $('summary-status-chip');
  chip.className = 'chip';
  if (analysis.status === 'completed') {
    chip.textContent = 'Completed';
    chip.classList.add('chip-completed');
  } else {
    chip.textContent = 'Fallback';
    chip.classList.add('chip-fallback');
  }
  show('summary-status-chip');

  if (analysis.status === 'fallback' && analysis.errorMessage) {
    text('summary-fallback-msg', `Warning: ${analysis.errorMessage}`);
    show('summary-fallback-msg');
  } else {
    hide('summary-fallback-msg');
  }
}

function renderMissionControl(summary, analysis, decisions) {
  if (!summary) {
    [
      'metric-dau',
      'metric-events',
      'metric-onboarding',
      'metric-voice',
      'metric-offline',
      'metric-api-error',
      'metric-cold-start',
      'metric-paywall',
    ].forEach((id) => setMetric(id, null));
    text('metric-top-alert', analysis?.executiveSummary || 'No report available.');
    return;
  }

  setMetric('metric-dau', summary.uniqueActorCount);
  setMetric('metric-events', summary.eventCount);
  setMetric('metric-onboarding', summary.onboarding?.conversionRate, true);
  setMetric('metric-voice', summary.voice?.successRate, true);
  setMetric('metric-offline', summary.offline?.unsupportedQuestions);
  setMetric('metric-api-error', summary.quality?.apiErrorRate, true);
  setMetric(
    'metric-cold-start',
    summary.quality?.avgColdStartMs ? `${Math.round(summary.quality.avgColdStartMs)} ms` : null
  );
  setMetric('metric-paywall', summary.revenue?.ctaToPurchaseRate, true);

  const topDecision = decisions[0];
  const alert = topDecision
    ? `${topDecision.severity.toUpperCase()}: ${topDecision.title}`
    : analysis?.executiveSummary || 'No open AI decisions.';
  text('metric-top-alert', alert);
}

function renderDecisions(decisions) {
  const container = $('decision-queue');
  container.innerHTML = '';

  if (!decisions.length) {
    show('decision-queue-empty');
    return;
  }
  hide('decision-queue-empty');

  decisions.forEach((decision) => {
    container.appendChild(buildDecisionCard(decision));
  });
}

function buildDecisionCard(decision) {
  const card = document.createElement('article');
  card.className = `decision-card ${escAttr(decision.severity)}`;
  card.id = `decision-${escAttr(decision.id)}`;

  const typeLabel = String(decision.type || 'decision').replace(/_/g, ' ');
  const evidenceRows = Object.entries(decision.evidence ?? {})
    .slice(0, 6)
    .map(([key, val]) => {
      const display = Array.isArray(val) ? val.join(', ') : String(val ?? '-');
      return `<tr><td>${escHtml(key)}</td><td>${escHtml(display)}</td></tr>`;
    })
    .join('');

  card.innerHTML = `
    <div class="decision-header">
      <span class="decision-title">${escHtml(decision.title || 'Untitled decision')}</span>
      <span class="chip chip-${escAttr(decision.severity)}">${escHtml(decision.severity || 'unknown')}</span>
    </div>
    <div class="decision-meta">${escHtml(typeLabel)} · ${escHtml(decision.dayKey || '-')}</div>
    <p class="decision-observation">${escHtml(decision.observation || '-')}</p>
    <div class="decision-action-label">Recommended action</div>
    <p class="decision-action-text">${escHtml(decision.recommendedAction || '-')}</p>
    ${evidenceRows ? `<table class="evidence-table"><tbody>${evidenceRows}</tbody></table>` : ''}
    <div class="decision-actions">
      <button class="btn-action accept" data-action="accepted">Accept</button>
      <button class="btn-action" data-action="reviewed">Mark reviewed</button>
      <button class="btn-action dismiss" data-action="dismissed">Dismiss</button>
    </div>
    <div class="decision-inline-error hidden" id="decision-err-${escAttr(decision.id)}"></div>
  `;

  card.querySelectorAll('.btn-action').forEach((button) => {
    button.addEventListener('click', () =>
      handleDecisionAction(decision.id, button.dataset.action)
    );
  });

  return card;
}

async function handleDecisionAction(decisionId, status) {
  const card = $(`decision-${decisionId}`);
  const errEl = $(`decision-err-${decisionId}`);
  if (!card || !status) return;

  const buttons = card.querySelectorAll('.btn-action');
  buttons.forEach((button) => {
    button.disabled = true;
  });
  errEl?.classList.add('hidden');

  try {
    await Api.markDecision(decisionId, status);
    card.remove();
    if (!$('decision-queue').children.length) {
      show('decision-queue-empty');
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = err?.message || 'Action failed. Please try again.';
      errEl.classList.remove('hidden');
    }
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function renderDetails(summary) {
  if (!summary) return;

  const onboarding = summary.onboarding ?? {};
  text('d-ob-started', fmt(onboarding.started));
  text('d-ob-completed', fmt(onboarding.completed));
  text('d-ob-conv', pct(onboarding.conversionRate));
  const worstDrop = onboarding.dropOffs?.[0];
  text('d-ob-dropoff', worstDrop ? `${worstDrop.step} (${pct(worstDrop.dropOffRate)})` : '-');

  const voice = summary.voice ?? {};
  text('d-v-sessions', fmt(voice.sessionsStarted));
  text('d-v-succeeded', fmt(voice.succeeded));
  text('d-v-failed', fmt(voice.failed));
  text('d-v-error-rate', pct(voice.errorRate));
  text(
    'd-v-latency',
    voice.avgLatencyMs !== null && voice.avgLatencyMs !== undefined
      ? `${Math.round(voice.avgLatencyMs)} ms`
      : '-'
  );
  text('d-v-intent', voice.topIntents?.[0]?.intent ?? '-');

  const revenue = summary.revenue ?? {};
  text('d-r-views', fmt(revenue.paywallViews));
  text('d-r-clicks', fmt(revenue.ctaClicks));
  text('d-r-taps', fmt(revenue.subscribeTaps));
  text('d-r-purchases', fmt(revenue.purchases));
  text('d-r-trials', fmt(revenue.trials));
  text('d-r-conv', pct(revenue.ctaToPurchaseRate));

  const offline = summary.offline ?? {};
  text('d-o-handled', fmt(offline.handledAnswers));
  text('d-o-unsupported', fmt(offline.unsupportedQuestions));
  text('d-o-top', offline.topUnsupportedIntents?.[0]?.intent ?? '-');

  const quality = summary.quality ?? {};
  text('d-q-errors', fmt(quality.errorEvents));
  text('d-q-api-rate', pct(quality.apiErrorRate));
  text(
    'd-q-cold-start',
    quality.avgColdStartMs !== null && quality.avgColdStartMs !== undefined
      ? `${Math.round(quality.avgColdStartMs)} ms`
      : '-'
  );
}

function renderRealtime(realtime) {
  const container = $('realtime-list');
  if (!container) return;

  container.innerHTML = '';
  if (!Array.isArray(realtime) || realtime.length === 0) {
    container.innerHTML =
      '<li><span>No realtime rows returned</span><span class="val">-</span></li>';
    return;
  }

  realtime.slice(0, 3).forEach((row) => {
    const item = document.createElement('li');
    const dayKey = row?.dayKey ?? 'today';
    const totalEvents = row?.totalEvents ?? 0;
    item.innerHTML = `<span>${escHtml(dayKey)}</span><span class="val">${escHtml(fmt(totalEvents))} events</span>`;
    container.appendChild(item);
  });
}

function prefillDayKey(summary) {
  $('input-day-key').value = summary?.dayKey ?? dayKeyYesterday();
}

async function runRebuildYesterday() {
  const dayKey = dayKeyYesterday();
  const input = $('input-day-key') || $('input-empty-day-key');
  if (input) input.value = dayKey;
  await runAdminAction(() => Api.rebuildDay(dayKey), `Rebuilt analytics for ${dayKey}.`);
}

async function runAdminAction(fn, successMsg) {
  const banner = $('admin-banner') || $('empty-admin-banner');
  const buttons = [
    'btn-rebuild',
    'btn-generate',
    'btn-rebuild-yesterday',
    'btn-empty-rebuild-yesterday',
  ]
    .map((id) => $(id))
    .filter(Boolean);

  buttons.forEach((button) => {
    button.disabled = true;
  });
  if (banner) {
    banner.className = 'admin-banner hidden';
    banner.textContent = '';
  }

  try {
    await fn();
    if (banner) {
      banner.className = 'admin-banner success';
      banner.textContent = `${successMsg} Refreshing dashboard...`;
      banner.classList.remove('hidden');
    }
    await loadDashboard();
  } catch (err) {
    if (banner) {
      banner.className = 'admin-banner error';
      banner.textContent = err?.message || 'Action failed.';
      banner.classList.remove('hidden');
    } else {
      showError(err?.message || 'Action failed.');
    }
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function validateDayKey(dayKey) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return true;
  window.alert('Enter a valid date in YYYY-MM-DD format.');
  $('input-day-key')?.focus();
  return false;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(str) {
  return String(str ?? '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function showFatalConfigError(msg) {
  document.body.innerHTML = `
    <main class="fatal-config">
      <section class="fatal-card">
        <p class="fatal-icon">Config</p>
        <h1>Firebase config missing</h1>
        <p>${escHtml(msg)}</p>
        <p>Local preview needs <code>${LOCAL_CONFIG_SCRIPT}</code>. Firebase Hosting uses <code>${FIREBASE_INIT_JSON_URL}</code>.</p>
      </section>
    </main>`;
}

initializeDashboard();
