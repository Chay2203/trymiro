document.addEventListener('DOMContentLoaded', () => {
    requireAuth();

    const user = getUser();
    const emailEl = document.getElementById('nav-user-email');
    if (emailEl && user) emailEl.textContent = user.email;

    // Set default date range (last 7 days)
    setPresetRange(7);
    initCalendar();
    initModeToggle();

    // Preset buttons
    document.querySelectorAll('.dash-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.dataset.range;
            if (range === 'all') {
                document.getElementById('stats-from').value = '';
                document.getElementById('stats-to').value = '';
            } else {
                setPresetRange(parseInt(range));
            }
            updateTriggerLabel();
            loadStats();
            loadRecoveryChart();
        });
    });

    document.getElementById('status-filter').addEventListener('change', loadCheckouts);
    document.getElementById('show-key-form-btn').addEventListener('click', toggleKeyForm);
    document.getElementById('key-form').addEventListener('submit', createApiKey);
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Sidebar & routing
    initSidebarToggle();
    initRouter();
});

/* ===== HASH ROUTER ===== */

const pageLoaded = {};

function initRouter() {
    window.addEventListener('hashchange', () => navigateFromHash());
    navigateFromHash();
}

function navigateFromHash() {
    const hash = location.hash.replace('#', '') || 'overview';
    navigateTo(hash);
}

function navigateTo(pageId) {
    const validPages = ['overview', 'checkouts', 'api-keys'];
    if (!validPages.includes(pageId)) pageId = 'overview';

    // Hide all pages, show target
    document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    // Update sidebar active state
    document.querySelectorAll('.dash-sidebar-link').forEach(a => {
        a.classList.toggle('active', a.dataset.page === pageId);
    });

    // Update hash without triggering hashchange again
    if (location.hash !== '#' + pageId) {
        history.replaceState(null, '', '#' + pageId);
    }

    // Close mobile sidebar
    document.getElementById('dash-sidebar').classList.remove('open');

    // Lazy-load data on first visit
    loadPageData(pageId);
}

function loadPageData(pageId) {
    if (pageId === 'overview') {
        if (!pageLoaded.overview) {
            pageLoaded.overview = true;
            loadStats();
            loadRecoveryChart();
        } else {
            // Redraw chart on revisit (handles resize-while-hidden)
            redrawChartIfVisible();
        }
    } else if (pageId === 'checkouts') {
        if (!pageLoaded.checkouts) {
            pageLoaded.checkouts = true;
            loadCheckouts();
        }
    } else if (pageId === 'api-keys') {
        if (!pageLoaded['api-keys']) {
            pageLoaded['api-keys'] = true;
            loadApiKeys();
        }
    }
}

function redrawChartIfVisible() {
    const canvas = document.getElementById('recovery-chart');
    if (canvas && canvas.style.display !== 'none' && lastChartData) {
        drawChart(canvas, lastChartData);
    }
}

/* ===== MOBILE SIDEBAR ===== */

function initSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('dash-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    // Close sidebar when a link is clicked (mobile)
    document.querySelectorAll('.dash-sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    });
}

/* ===== DATE HELPERS ===== */

function setPresetRange(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    document.getElementById('stats-from').value = fmtISO(from);
    document.getElementById('stats-to').value = fmtISO(to);
    updateTriggerLabel();
}

function fmtISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function fmtDateShort(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function updateTriggerLabel() {
    const fromVal = document.getElementById('stats-from').value;
    const toVal = document.getElementById('stats-to').value;
    const label = document.getElementById('date-trigger-label');
    if (!fromVal && !toVal) {
        label.textContent = 'All time';
    } else {
        const from = new Date(fromVal + 'T00:00:00');
        const to = new Date(toVal + 'T00:00:00');
        label.textContent = fmtDateShort(from) + ' – ' + fmtDateShort(to);
    }
}

/* ===== CUSTOM CALENDAR ===== */

let calViewYear, calViewMonth;
let calSelFrom = null, calSelTo = null;
let calPickingEnd = false;

function initCalendar() {
    const trigger = document.getElementById('date-trigger');
    const dropdown = document.getElementById('cal-dropdown');

    // Init view to current month
    const now = new Date();
    calViewYear = now.getFullYear();
    calViewMonth = now.getMonth();

    // Read initial values
    const fromVal = document.getElementById('stats-from').value;
    const toVal = document.getElementById('stats-to').value;
    if (fromVal) calSelFrom = new Date(fromVal + 'T00:00:00');
    if (toVal) calSelTo = new Date(toVal + 'T00:00:00');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dropdown.classList.toggle('open');
        if (open) {
            // Sync view month to from date
            if (calSelFrom) {
                calViewYear = calSelFrom.getFullYear();
                calViewMonth = calSelFrom.getMonth();
            }
            renderCalendar();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== trigger) {
            dropdown.classList.remove('open');
        }
    });

    document.getElementById('cal-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        calViewMonth--;
        if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
        renderCalendar();
    });

    document.getElementById('cal-next').addEventListener('click', (e) => {
        e.stopPropagation();
        calViewMonth++;
        if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
        renderCalendar();
    });

    document.getElementById('cal-clear').addEventListener('click', (e) => {
        e.stopPropagation();
        calSelFrom = null;
        calSelTo = null;
        calPickingEnd = false;
        renderCalendar();
    });

    document.getElementById('cal-apply').addEventListener('click', (e) => {
        e.stopPropagation();
        if (calSelFrom) document.getElementById('stats-from').value = fmtISO(calSelFrom);
        else document.getElementById('stats-from').value = '';
        if (calSelTo) document.getElementById('stats-to').value = fmtISO(calSelTo);
        else document.getElementById('stats-to').value = '';

        document.querySelectorAll('.dash-preset').forEach(b => b.classList.remove('active'));
        updateTriggerLabel();
        dropdown.classList.remove('open');
        loadStats();
        loadRecoveryChart();
    });

    updateTriggerLabel();
}

function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('cal-month-label').textContent = monthNames[calViewMonth] + ' ' + calViewYear;

    // Update range display
    document.getElementById('cal-from-display').textContent = calSelFrom ? fmtDateShort(calSelFrom) : '—';
    document.getElementById('cal-to-display').textContent = calSelTo ? fmtDateShort(calSelTo) : '—';

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('span');
        cell.className = 'cal-day cal-day--empty';
        grid.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cal-day';
        cell.textContent = d;

        const date = new Date(calViewYear, calViewMonth, d);
        date.setHours(0, 0, 0, 0);

        // Today
        if (date.getTime() === today.getTime()) cell.classList.add('cal-day--today');

        // Selected start
        if (calSelFrom && date.getTime() === calSelFrom.getTime()) cell.classList.add('cal-day--sel-start');
        // Selected end
        if (calSelTo && date.getTime() === calSelTo.getTime()) cell.classList.add('cal-day--sel-end');
        // In range
        if (calSelFrom && calSelTo && date > calSelFrom && date < calSelTo) cell.classList.add('cal-day--in-range');
        // Single selection (from == to)
        if (calSelFrom && calSelTo && calSelFrom.getTime() === calSelTo.getTime() && date.getTime() === calSelFrom.getTime()) {
            cell.classList.add('cal-day--sel-single');
        }

        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!calPickingEnd) {
                // Picking start
                calSelFrom = date;
                calSelTo = null;
                calPickingEnd = true;
            } else {
                // Picking end
                if (date < calSelFrom) {
                    calSelTo = calSelFrom;
                    calSelFrom = date;
                } else {
                    calSelTo = date;
                }
                calPickingEnd = false;
            }
            renderCalendar();
        });

        grid.appendChild(cell);
    }
}

/* ===== MODE TOGGLE ===== */

function initModeToggle() {
    const toggle = document.getElementById('mode-toggle');
    if (!toggle) return;
    toggle.querySelectorAll('.mode-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggle.querySelectorAll('.mode-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('key-mode').value = btn.dataset.mode;
        });
    });
}

/* ===== FORMAT HELPERS ===== */

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function fmt(n) {
    if (n == null) return '0';
    return Number(n).toLocaleString();
}

function fmtCurrency(n) {
    if (n == null) return '$0.00';
    return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
    if (n == null) return '0%';
    return Number(n).toFixed(1) + '%';
}

function getDateParams() {
    const from = document.getElementById('stats-from').value;
    const to = document.getElementById('stats-to').value;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params;
}

/* ===== DATA LOADING ===== */

async function loadStats() {
    const params = getDateParams();

    const res = await apiFetch('/dashboard/stats?' + params.toString());
    if (!res) return;
    const s = await res.json();

    document.getElementById('stat-total-checkouts').textContent = fmt(s.total_checkouts);
    document.getElementById('stat-pending').textContent = fmt(s.pending_count);
    document.getElementById('stat-recovery-attempted').textContent = fmt(s.recovery_attempted_count);
    document.getElementById('stat-recovered').textContent = fmt(s.recovered_count);
    document.getElementById('stat-converted').textContent = fmt(s.converted_count);
    document.getElementById('stat-total-value').textContent = fmtCurrency(s.total_cart_value);
    document.getElementById('stat-pending-revenue').textContent = fmtCurrency(s.pending_revenue);
    document.getElementById('stat-recovered-revenue').textContent = fmtCurrency(s.recovered_revenue);
    document.getElementById('stat-conversion-rate').textContent = fmtPct(s.conversion_rate);
    document.getElementById('stat-recovery-rate').textContent = fmtPct(s.recovery_success_rate);

    // Update channel stats
    document.getElementById('ch-text-sent').textContent = fmt(s.recovery_attempted_count);
    document.getElementById('ch-text-recovered').textContent = fmt(s.recovered_count);
    document.getElementById('ch-live-called').textContent = fmt(s.recovery_attempted_count);
    document.getElementById('ch-live-recovered').textContent = fmt(s.recovered_count);
}

let lastChartData = null;

async function loadRecoveryChart() {
    const params = getDateParams();
    const res = await apiFetch('/dashboard/recovery-chart?' + params.toString());
    if (!res) return;
    const data = await res.json();

    const canvas = document.getElementById('recovery-chart');
    const empty = document.getElementById('chart-empty');
    const legend = document.getElementById('chart-legend');

    if (!data.length) {
        canvas.style.display = 'none';
        legend.style.display = 'none';
        empty.style.display = 'flex';
        lastChartData = null;
        return;
    }

    empty.style.display = 'none';
    canvas.style.display = 'block';
    legend.style.display = 'flex';

    lastChartData = data;
    drawChart(canvas, data);
}

function drawChart(canvas, data) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 240 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '240px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 240;
    const pad = { top: 20, right: 20, bottom: 36, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...data.map(d => Math.max(d.total, d.recovered)), 1);
    const yTicks = 5;

    ctx.strokeStyle = 'rgba(107,114,128,0.1)';
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= yTicks; i++) {
        const y = pad.top + (chartH / yTicks) * i;
        const val = Math.round(maxVal - (maxVal / yTicks) * i);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
        ctx.fillText(val, pad.left - 8, y + 4);
    }

    if (data.length === 1) {
        const barW = Math.min(60, chartW * 0.3);
        const x = pad.left + chartW / 2;
        const totalH = (data[0].total / maxVal) * chartH;
        ctx.fillStyle = 'rgba(149,211,186,0.35)';
        roundedRect(ctx, x - barW / 2 - 2, pad.top + chartH - totalH, barW, totalH, 4);
        const recH = (data[0].recovered / maxVal) * chartH;
        ctx.fillStyle = '#064E3B';
        roundedRect(ctx, x - barW / 2 + 2, pad.top + chartH - recH, barW - 4, recH, 4);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatDateLabel(data[0].day), x, h - pad.bottom + 16);
        return;
    }

    const stepX = chartW / (data.length - 1);

    // Total area
    ctx.beginPath();
    data.forEach((d, i) => {
        const x = pad.left + stepX * i;
        const y = pad.top + chartH - (d.total / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + stepX * (data.length - 1), pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(149,211,186,0.2)';
    ctx.fill();

    // Total line
    ctx.beginPath();
    data.forEach((d, i) => {
        const x = pad.left + stepX * i;
        const y = pad.top + chartH - (d.total / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#95d3ba';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Recovered area
    ctx.beginPath();
    data.forEach((d, i) => {
        const x = pad.left + stepX * i;
        const y = pad.top + chartH - (d.recovered / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + stepX * (data.length - 1), pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(6,78,59,0.15)';
    ctx.fill();

    // Recovered line
    ctx.beginPath();
    data.forEach((d, i) => {
        const x = pad.left + stepX * i;
        const y = pad.top + chartH - (d.recovered / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#064E3B';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots
    data.forEach((d, i) => {
        const x = pad.left + stepX * i;
        const y = pad.top + chartH - (d.recovered / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#064E3B';
        ctx.fill();
    });

    // X labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const maxLabels = Math.min(data.length, 10);
    const labelStep = Math.max(1, Math.floor(data.length / maxLabels));
    data.forEach((d, i) => {
        if (i % labelStep !== 0 && i !== data.length - 1) return;
        const x = pad.left + stepX * i;
        ctx.fillText(formatDateLabel(d.day), x, h - pad.bottom + 16);
    });
}

function roundedRect(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function formatDateLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ===== CHECKOUTS ===== */

async function loadCheckouts() {
    const status = document.getElementById('status-filter').value;
    const params = new URLSearchParams({ limit: '20' });
    if (status) params.set('status', status);

    const res = await apiFetch('/dashboard/recent?' + params.toString());
    if (!res) return;
    const rows = await res.json();
    const tbody = document.getElementById('checkouts-tbody');

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="dash-table-empty">
            <div class="dash-empty-inline">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" stroke="var(--primary-fixed-dim)" stroke-width="2" stroke-dasharray="4 3"/>
                    <path d="M14 20h12M20 14v12" stroke="var(--primary-container)" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p class="dash-empty-title">No abandoned carts yet</p>
                <p class="dash-empty-sub">When shoppers leave items behind, they'll appear here. Time to drive some traffic!</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.email || '-')}</td>
            <td>${escapeHtml(r.phone || '-')}</td>
            <td>${fmtCurrency(r.cart_value)}</td>
            <td><span class="dash-status dash-status--${r.status}">${escapeHtml(r.status)}</span></td>
            <td>${new Date(r.captured_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

/* ===== API KEYS ===== */

async function loadApiKeys() {
    const res = await apiFetch('/dashboard/api-keys');
    if (!res) return;
    const keys = await res.json();
    const tbody = document.getElementById('keys-tbody');

    if (!keys.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="dash-table-empty">
            <div class="dash-empty-inline">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="8" y="14" width="24" height="14" rx="3" stroke="var(--primary-fixed-dim)" stroke-width="2"/>
                    <circle cx="16" cy="21" r="3" stroke="var(--primary-container)" stroke-width="2"/>
                    <path d="M19 21h9" stroke="var(--primary-container)" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="24" cy="21" r="1" fill="var(--primary-container)"/>
                </svg>
                <p class="dash-empty-title">No API keys created</p>
                <p class="dash-empty-sub">Create your first key to start capturing abandoned checkouts from your store.</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = keys.map(k => `
        <tr>
            <td>${escapeHtml(k.shop)}</td>
            <td><span class="dash-mode dash-mode--${k.mode}">${k.mode}</span></td>
            <td>${new Date(k.created_at).toLocaleDateString()}</td>
            <td><button class="dash-btn dash-btn--danger" onclick="deleteKey('${k.id}')">Delete</button></td>
        </tr>
    `).join('');
}

function toggleKeyForm() {
    const form = document.getElementById('key-form');
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

async function createApiKey(e) {
    e.preventDefault();
    const shop = document.getElementById('key-shop').value.trim();
    const mode = document.getElementById('key-mode').value;
    if (!shop) return;

    const res = await apiFetch('/dashboard/api-keys', {
        method: 'POST',
        body: JSON.stringify({ shop, mode })
    });
    if (!res) return;

    if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create key');
        return;
    }

    const data = await res.json();
    document.getElementById('key-form').style.display = 'none';
    document.getElementById('key-shop').value = '';

    const banner = document.getElementById('key-banner');
    const keyDisplay = document.getElementById('key-banner-value');
    keyDisplay.textContent = data.key;
    banner.style.display = 'flex';

    loadApiKeys();
}

function copyKeyFromBanner() {
    const key = document.getElementById('key-banner-value').textContent;
    navigator.clipboard.writeText(key);
    const btn = document.querySelector('#key-banner .dash-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
}

function showConfirmModal({ title, desc, confirmLabel, onConfirm }) {
    const overlay = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title || 'Are you sure?';
    document.getElementById('modal-desc').textContent = desc || 'This action cannot be undone.';
    document.getElementById('modal-confirm').textContent = confirmLabel || 'Delete';
    overlay.classList.add('open');

    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');

    function cleanup() {
        overlay.classList.remove('open');
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        overlay.replaceWith(overlay.cloneNode(true));
    }

    document.getElementById('modal-cancel').addEventListener('click', cleanup);
    document.getElementById('modal-confirm').addEventListener('click', () => {
        cleanup();
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });
}

async function deleteKey(id) {
    showConfirmModal({
        title: 'Delete API Key?',
        desc: 'This action cannot be undone. The key will stop working immediately.',
        confirmLabel: 'Delete',
        onConfirm: async () => {
            const res = await apiFetch('/dashboard/api-keys/' + id, { method: 'DELETE' });
            if (!res) return;
            document.getElementById('key-banner').style.display = 'none';
            loadApiKeys();
        }
    });
}
