// API endpoints
const API_BASE = '';

// State
let currentStrategy = '';
let isBotRunning = false;

// Chart instances
let pnlChart = null;
let winLossChart = null;
let profitDistChart = null;

// WebSocket connection
let ws = null;
let wsReconnectTimeout = null;
let botStartTime = null;
let runtimeInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initTheme();
    initWebSocket();
    initBotControls();
    initEditor();
    checkBotStatus();
    loadData();
    setupEventListeners();
    checkSetup();

    // Auto-refresh every 30 seconds
    setInterval(loadData, 30000);
});

// Bootstrap Modal Instance
let settingsModalBS = null;

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    const strategyFilter = document.getElementById('strategyFilter');
    const clearLogsBtn = document.getElementById('clearLogsBtn');

    refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('spin-anim'); // We can add a simple animation class or valid bootstrap utility
        // or just rely on async loading
        refreshBtn.disabled = true;
        loadData().finally(() => {
            refreshBtn.disabled = false;
            icon.classList.remove('spin-anim');
        });
    });

    strategyFilter.addEventListener('change', (e) => {
        currentStrategy = e.target.value;
        loadData();
    });

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            document.getElementById('logContainer').innerHTML = '<div class="text-muted">Logs cleared</div>';
            appendLog('Logs cleared', 'system');
        });
    }

    // Settings Modal
    const settingsEl = document.getElementById('settingsModal');
    if (settingsEl) {
        settingsModalBS = new bootstrap.Modal(settingsEl);

        // Load settings when modal opens
        settingsEl.addEventListener('show.bs.modal', openSettings);

        // Save
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveSettings);
    }

    // Setup Modal
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    if (saveSetupBtn) {
        saveSetupBtn.addEventListener('click', saveInitialSetup);
    }

    // Guide Modal
    const guideModalEl = document.getElementById('guideModal');
    if (guideModalEl) {
        guideModalEl.addEventListener('hidden.bs.modal', () => {
            localStorage.setItem('deriv_trader_guide_seen', 'true');
        });
    }
}

async function checkSetup() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const settings = await response.json();

            // Check if API token is missing
            if (!settings.deriv_api_token) {
                const setupModal = new bootstrap.Modal(document.getElementById('setupModal'));
                setupModal.show();
            } else {
                // If setup is done, check if user has seen the guide
                const guideSeen = localStorage.getItem('deriv_trader_guide_seen');
                if (!guideSeen) {
                    const guideModal = new bootstrap.Modal(document.getElementById('guideModal'));
                    guideModal.show();
                }
            }
        }
    } catch (error) {
        console.error('Failed to check setup:', error);
    }
}

async function saveInitialSetup() {
    const btn = document.getElementById('saveSetupBtn');
    const tokenInput = document.getElementById('setupApiToken');
    const mongoInput = document.getElementById('setupMongoUri');

    if (!tokenInput.value.trim()) {
        tokenInput.classList.add('is-invalid');
        return;
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const settings = {
        deriv_api_token: tokenInput.value.trim(),
        mongo_uri: mongoInput.value.trim() || 'mongodb://localhost:27017'
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        appendLog('Initial setup completed.', 'success');

        // Hide setup modal
        const setupModalEl = document.getElementById('setupModal');
        const setupModal = bootstrap.Modal.getInstance(setupModalEl);
        setupModal.hide();

        // Show guide immediately after setup
        const guideModal = new bootstrap.Modal(document.getElementById('guideModal'));
        guideModal.show();

        // Reload data to ensure connection works
        loadData();

    } catch (error) {
        console.error('Setup failed:', error);
        alert('Failed to save settings: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function openSettings() {
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const settings = await response.json();
            document.getElementById('settingApiToken').value = settings.deriv_api_token || '';
            document.getElementById('settingMongoUri').value = settings.mongo_uri || '';
            document.getElementById('settingOpenAIKey').value = settings.openai_key || '';
            document.getElementById('settingOpenAIModel').value = settings.openai_model || 'gpt-3.5-turbo';
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        appendLog('Failed to load settings', 'error');
    }
}

function closeSettings() {
    if (settingsModalBS) settingsModalBS.hide();
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const settings = {
        deriv_api_token: document.getElementById('settingApiToken').value,
        mongo_uri: document.getElementById('settingMongoUri').value,
        openai_key: document.getElementById('settingOpenAIKey').value,
        openai_model: document.getElementById('settingOpenAIModel').value
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');

        appendLog('Settings saved.', 'success');

        // Close modal
        if (settingsModalBS) settingsModalBS.hide();

        // Optional: Reload page after delay
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error('Failed to save settings:', error);
        appendLog('Failed to save settings: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function loadData() {
    await Promise.all([
        loadStats(),
        loadTrades(),
        loadSessions()
    ]);
}

async function loadStats() {
    try {
        const url = currentStrategy
            ? `/api/stats?strategy=${currentStrategy}`
            : '/api/stats';

        const response = await fetch(url);
        const stats = await response.json();

        updateStats(stats);
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadTrades() {
    try {
        const url = currentStrategy
            ? `/api/trades?strategy=${currentStrategy}&limit=50`
            : '/api/trades?limit=50';

        const response = await fetch(url);
        const trades = await response.json();

        updateTradesTable(trades);
        updateCharts(trades);
    } catch (error) {
        console.error('Failed to load trades:', error);
        showError('tradesBody', 'Failed to load trades');
    }
}

async function loadSessions() {
    try {
        const response = await fetch('/api/sessions?limit=10');
        const sessions = await response.json();

        updateSessionsList(sessions);
    } catch (error) {
        console.error('Failed to load sessions:', error);
        showError('sessionsList', 'Failed to load sessions');
    }
}

async function checkBotStatus() {
    try {
        const response = await fetch('/api/bot/status');
        if (response.ok) {
            const status = await response.json();
            if (status.running) {
                const startTime = status.start_time ? status.start_time * 1000 : Date.now();
                setBotRunning(true, startTime);
                appendLog('Synced bot status: Running', 'system');
            } else {
                setBotRunning(false);
            }
        }
    } catch (error) {
        console.error('Failed to check bot status:', error);
    }
}

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        updateConnectionStatus(true);
        appendLog('Connected to server', 'system');
    };

    ws.onclose = () => {
        updateConnectionStatus(false);
        appendLog('Disconnected from server', 'error');
        // Try to reconnect
        clearTimeout(wsReconnectTimeout);
        wsReconnectTimeout = setTimeout(initWebSocket, 5000);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'log' || data.type === 'info' || data.type === 'error') {
                appendLog(data.message, data.type);
            }
            // Could handle other message types here (e.g. trade updates)
        } catch (e) {
            console.error('Error parsing WS message:', e);
        }
    };
}

function initBotControls() {
    const startBtn = document.getElementById('startBotBtn');
    const stopBtn = document.getElementById('stopBotBtn');

    startBtn.addEventListener('click', async () => {
        const config = {
            strategy: document.getElementById('configStrategy').value,
            symbol: document.getElementById('configSymbol').value,
            initial_stake: parseFloat(document.getElementById('configInitialStake').value),
            target_profit: parseFloat(document.getElementById('configTargetProfit').value),
            stop_loss: parseFloat(document.getElementById('configStopLoss').value),
            martingale: parseFloat(document.getElementById('configMartingale').value),
            duration: parseInt(document.getElementById('configDuration').value),
            duration_unit: document.getElementById('configDurationUnit').value,
            streak_threshold: parseInt(document.getElementById('configStreakThreshold').value),
            barrier: document.getElementById('configBarrier').value,
            use_trailing_stop: document.getElementById('configUseTrailingStop').checked
        };

        try {
            startBtn.disabled = true;
            appendLog(`Starting bot with strategy: ${config.strategy}...`, 'info');

            const response = await fetch('/api/bot/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText);
            }

            setBotRunning(true);
            appendLog('Bot started successfully', 'success');

        } catch (error) {
            console.error('Failed to start bot:', error);
            appendLog(`Failed to start bot: ${error.message}`, 'error');
            startBtn.disabled = false;
        }
    });

    stopBtn.addEventListener('click', async () => {
        try {
            stopBtn.disabled = true;
            appendLog('Stopping bot...', 'info');

            const response = await fetch('/api/bot/stop', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to stop bot');
            }

            setBotRunning(false);
            appendLog('Bot stopped', 'system');

        } catch (error) {
            console.error('Failed to stop bot:', error);
            appendLog(`Failed to stop bot: ${error.message}`, 'error');
            stopBtn.disabled = false;
        }
    });
}

function setBotRunning(running, startTime = null) {
    isBotRunning = running;
    const startBtn = document.getElementById('startBotBtn');
    const stopBtn = document.getElementById('stopBotBtn');

    // Status Elements
    const botStatusBadge = document.getElementById('botStatusBadge');
    const statusSpinner = document.getElementById('statusSpinner');
    const botStatusText = document.getElementById('botStatusText');

    const inputs = document.querySelectorAll('.config-form input, .config-form select');

    if (running) {
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // Update Badge
        if (botStatusBadge) {
            botStatusBadge.classList.remove('bg-danger');
            botStatusBadge.classList.add('bg-success');
        }
        if (statusSpinner) statusSpinner.classList.remove('d-none');
        if (botStatusText) botStatusText.textContent = 'Running';

        inputs.forEach(input => input.disabled = true);

        // Start runtime timer
        if (startTime) {
            botStartTime = startTime;
        } else {
            botStartTime = Date.now();
        }
        if (runtimeInterval) clearInterval(runtimeInterval); // Clear existing if any
        runtimeInterval = setInterval(updateRuntime, 1000);
    } else {
        startBtn.disabled = false;
        stopBtn.disabled = true;

        // Update Badge
        if (botStatusBadge) {
            botStatusBadge.classList.remove('bg-success');
            botStatusBadge.classList.add('bg-danger');
        }
        if (statusSpinner) statusSpinner.classList.add('d-none');
        if (botStatusText) botStatusText.textContent = 'Stopped';

        inputs.forEach(input => input.disabled = false);

        // Stop runtime timer
        clearInterval(runtimeInterval);
        const liveRuntime = document.getElementById('liveRuntime');
        if (liveRuntime) liveRuntime.textContent = '-';
    }
}

function updateRuntime() {
    if (!botStartTime) return;
    const diff = Math.floor((Date.now() - botStartTime) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    document.getElementById('liveRuntime').textContent = `${h}:${m}:${s}`;
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connectionDot');
    const text = document.getElementById('connectionText');
    if (connected) {
        dot.className = 'connection-dot connected';
        text.textContent = 'Connected';
    } else {
        dot.className = 'connection-dot disconnected';
        text.textContent = 'Disconnected';
    }
}

function appendLog(message, type = 'info') {
    const container = document.getElementById('logContainer');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-message">${message}</span>
    `;

    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;

    // Limit log entries
    while (container.children.length > 500) {
        container.removeChild(container.firstChild);
    }
}

// Initialize Charts
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#cbd5e1',
                    font: {
                        family: 'Inter',
                        size: 12
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            },
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: '#334155' }
            }
        }
    };

    // PnL Over Time Chart
    const pnlCtx = document.getElementById('pnlChart').getContext('2d');
    pnlChart = new Chart(pnlCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative PnL',
                data: [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: (context) => `PnL: $${context.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    });

    // Win/Loss Chart
    const winLossCtx = document.getElementById('winLossChart').getContext('2d');
    winLossChart = new Chart(winLossCtx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Losses'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    '#10b981',
                    '#ef4444'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            family: 'Inter',
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Profit Distribution Chart
    const profitDistCtx = document.getElementById('profitDistChart').getContext('2d');
    profitDistChart = new Chart(profitDistCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Profit',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                tooltip: {
                    callbacks: {
                        label: (context) => `Profit: $${context.parsed.y.toFixed(2)}`
                    }
                }
            }
        }
    });
}

// Update Charts with Trade Data
function updateCharts(trades) {
    if (!trades || trades.length === 0) return;

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Update PnL Chart
    const pnlLabels = [];
    const pnlData = [];

    sortedTrades.forEach((trade, index) => {
        pnlLabels.push(`#${index + 1}`);
        pnlData.push(trade.total_pnl);
    });

    pnlChart.data.labels = pnlLabels;
    pnlChart.data.datasets[0].data = pnlData;
    pnlChart.update();

    // Update Win/Loss Chart
    const wins = sortedTrades.filter(t => t.profit >= 0).length;
    const losses = sortedTrades.filter(t => t.profit < 0).length;

    winLossChart.data.datasets[0].data = [wins, losses];
    winLossChart.update();

    // Update Profit Distribution Chart
    const profitLabels = [];
    const profitData = [];
    const profitColors = [];
    const profitBorders = [];

    sortedTrades.slice(-20).forEach((trade, index) => {
        profitLabels.push(`#${sortedTrades.length - 19 + index}`);
        profitData.push(trade.profit);

        if (trade.profit >= 0) {
            profitColors.push('rgba(16, 185, 129, 0.7)');
            profitBorders.push('#10b981');
        } else {
            profitColors.push('rgba(239, 68, 68, 0.7)');
            profitBorders.push('#ef4444');
        }
    });

    profitDistChart.data.labels = profitLabels;
    profitDistChart.data.datasets[0].data = profitData;
    profitDistChart.data.datasets[0].backgroundColor = profitColors;
    profitDistChart.data.datasets[0].borderColor = profitBorders;
    profitDistChart.update();
}

function updateStats(stats) {
    const totalPnL = stats.total_pnl || 0;
    const totalTrades = stats.total_trades || 0;
    const winningTrades = stats.winning_trades || 0;
    const avgProfit = stats.avg_profit || 0;

    const winRate = totalTrades > 0
        ? ((winningTrades / totalTrades) * 100).toFixed(1)
        : 0;

    // Update DOM
    const totalPnLEl = document.getElementById('totalPnL');
    totalPnLEl.textContent = formatCurrency(totalPnL);
    totalPnLEl.className = 'card-title fw-bold ' + (totalPnL >= 0 ? 'text-success' : 'text-danger');

    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('winRate').textContent = winRate + '%';

    const avgProfitEl = document.getElementById('avgProfit');
    avgProfitEl.textContent = formatCurrency(avgProfit);
    avgProfitEl.className = 'card-title fw-bold ' + (avgProfit >= 0 ? 'text-success' : 'text-danger');
}

function updateTradesTable(trades) {
    const tbody = document.getElementById('tradesBody');
    const tradeCount = document.getElementById('tradeCount');

    if (!trades || trades.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-4 d-block mb-2"></i>
                    No trades found
                </td>
            </tr>
        `;
        if (tradeCount) tradeCount.textContent = '0 trades';
        return;
    }

    if (tradeCount) tradeCount.textContent = `${trades.length} trades`;

    tbody.innerHTML = trades.map(trade => `
        <tr>
            <td>${formatTime(trade.timestamp)}</td>
            <td><span class="badge bg-secondary">${formatStrategy(trade.strategy)}</span></td>
            <td>${trade.contract_type}</td>
            <td>${formatCurrency(trade.stake)}</td>
            <td class="${trade.profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                ${formatCurrency(trade.profit)}
            </td>
            <td>${formatCurrency(trade.total_pnl)}</td>
            <td>
                <span class="badge ${trade.profit >= 0 ? 'bg-success' : 'bg-danger'}">
                    ${trade.profit >= 0 ? 'Won' : 'Lost'}
                </span>
            </td>
        </tr>
    `).join('');
}

function updateSessionsList(sessions) {
    const container = document.getElementById('sessionsList');
    const sessionCount = document.getElementById('sessionCount');

    if (!sessions || sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="bi bi-inbox fs-4 d-block mb-2"></i>
                No sessions found
            </div>
        `;
        if (sessionCount) sessionCount.textContent = '0 sessions';
        return;
    }

    if (sessionCount) sessionCount.textContent = `${sessions.length} sessions`;

    container.innerHTML = '<div class="list-group list-group-flush">' + sessions.map(session => {
        const winRate = session.total_trades > 0
            ? ((session.winning_trades / session.total_trades) * 100).toFixed(1)
            : 0;

        return `
            <div class="list-group-item bg-transparent">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold text-capitalize">${formatStrategy(session.strategy)}</span>
                    <small class="text-muted">${formatDate(session.start_time)}</small>
                </div>
                <div class="row g-2 text-small" style="font-size: 0.85rem;">
                    <div class="col-6 d-flex justify-content-between">
                        <span class="text-muted">PnL:</span>
                        <span class="fw-bold ${session.total_pnl >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatCurrency(session.total_pnl)}
                        </span>
                    </div>
                    <div class="col-6 d-flex justify-content-between">
                        <span class="text-muted">Trades:</span>
                        <span>${session.total_trades}</span>
                    </div>
                    <div class="col-6 d-flex justify-content-between">
                        <span class="text-muted">Win Rate:</span>
                        <span>${winRate}%</span>
                    </div>
                    <div class="col-6 d-flex justify-content-between">
                        <span class="text-muted">Max PnL:</span>
                        <span>${formatCurrency(session.max_pnl)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') + '</div>';
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div>${message}</div>
        </div>
    `;
}

// Utility functions
function formatCurrency(value) {
    if (value === null || value === undefined) return '$0.00';
    const num = parseFloat(value);
    const sign = num >= 0 ? '+' : '';
    return sign + '$' + Math.abs(num).toFixed(2);
}

function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// AI Strategy Button
const aiStrategyBtn = document.getElementById('aiStrategyBtn');
if (aiStrategyBtn) {
    aiStrategyBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('aiStrategyModal'));
        document.getElementById('aiStrategyPrompt').value = '';
        document.getElementById('aiStrategyError').classList.add('d-none');
        modal.show();
    });
}

// Generate Action
const generateBtn = document.getElementById('generateStrategyBtn');
if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
        const prompt = document.getElementById('aiStrategyPrompt').value.trim();
        const mode = document.getElementById('aiStrategyMode').value;
        const model = document.getElementById('aiStrategyModel').value;
        if (!prompt) return;

        const btn = document.getElementById('generateStrategyBtn');
        const originalText = btn.innerHTML;
        const errorEl = document.getElementById('aiStrategyError');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
        errorEl.classList.add('d-none');

        try {
            const response = await fetch('/api/analytics/generate-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, mode, model })
            });

            if (response.ok) {
                const data = await response.json();
                if (editor) {
                    editor.setValue(data.reply);

                    // Update language based on mode
                    const model = editor.getModel();
                    if (mode === 'dbot') {
                        monaco.editor.setModelLanguage(model, 'xml');
                        // Add Tag
                        const tagsEl = document.getElementById('strategyTagsInput'); // For saving
                        if (tagsEl) tagsEl.value = 'dbot';
                    } else {
                        monaco.editor.setModelLanguage(model, 'javascript');
                        const tagsEl = document.getElementById('strategyTagsInput'); // For saving
                        if (tagsEl) tagsEl.value = '';
                    }

                    appendLog('Strategy generated by AI (' + mode + ')', 'success');

                    // Close modal
                    const modalEl = document.getElementById('aiStrategyModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();
                }
            } else {
                const errText = await response.text();
                throw new Error(errText);
            }
        } catch (e) {
            errorEl.textContent = 'Error: ' + e.message;
            errorEl.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

// Download Strategy
const downloadBtn = document.getElementById('downloadStrategyBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        if (!editor) return;

        const content = editor.getValue();
        let name = document.getElementById('currentStrategyName').textContent.trim();
        if (name === 'Untitled') name = 'strategy';

        // Determine extension
        let ext = '.js';
        if (content.includes('<xml') && content.includes('block')) {
            ext = '.xml';
        }

        if (!name.endsWith(ext)) {
            name += ext;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

// Editor State
let editor = null;
const defaultScript = `// Custom Strategy Script
// Available globals: log(msg), buy(contractType, amount), onTick(quote)
// config: getInitialStake(), getSymbol()

function onTick(quote) {
    log("Tick: " + quote);

    // Example: Buy CALL if quote ends in 5
    // if (quote.toString().endsWith('5')) {
    //    buy("CALL", getInitialStake());
    // }
}
`;

function initEditor() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: defaultScript,
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true
        });
    });

    // View Switching
    const openEditorBtn = document.getElementById('openEditorBtn');
    if (openEditorBtn) {
        openEditorBtn.addEventListener('click', () => {
            console.log('Open Editor Clicked');
            appendLog('Opening Editor...', 'system');
            const dashboard = document.getElementById('dashboardView');
            const editorView = document.getElementById('editorView');

            if (dashboard) dashboard.classList.add('d-none');
            if (editorView) editorView.classList.remove('d-none');

            if (editor) {
                editor.layout();
            } else {
                console.warn('Monaco editor instance not ready yet');
            }
        });
    }

    const closeEditorBtn = document.getElementById('closeEditorBtn');
    if (closeEditorBtn) {
        closeEditorBtn.addEventListener('click', () => {
            console.log('Close Editor Clicked');
            document.getElementById('editorView').classList.add('d-none');
            document.getElementById('dashboardView').classList.remove('d-none');
        });
    }

    // Run Script Button
    const runScriptBtn = document.getElementById('runScriptBtn');
    if (runScriptBtn) {
        runScriptBtn.addEventListener('click', async () => {
            if (!editor) return;
            const script = editor.getValue();

            // Auto-select Custom strategy in dropdown
            const stratSelect = document.getElementById('configStrategy');
            if (stratSelect) stratSelect.value = 'custom';

            await startBotWithScript(script);
        });
    }

    // Strategy Management
    loadSavedStrategies();

    const saveStrategyBtn = document.getElementById('saveStrategyBtn');
    if (saveStrategyBtn) {
        saveStrategyBtn.addEventListener('click', () => {
            // Pre-fill modal if strategy loaded
            const nameEl = document.getElementById('currentStrategyName');
            if (nameEl && nameEl.textContent !== 'Untitled') {
                document.getElementById('strategyNameInput').value = nameEl.textContent.replace('.js', '');
                // Could fill tags here if we improved state management, 
                // but for now we'll just leave them empty or as-is to allow adding new ones.
            }
            const saveModal = new bootstrap.Modal(document.getElementById('saveStrategyModal'));
            saveModal.show();
        });
    }

    const confirmSaveBtn = document.getElementById('confirmSaveStrategyBtn');
    if (confirmSaveBtn) {
        confirmSaveBtn.addEventListener('click', saveCurrentStrategy);
    }

    const newStrategyBtn = document.getElementById('newStrategyBtn');
    if (newStrategyBtn) {
        newStrategyBtn.addEventListener('click', () => {
            if (editor) editor.setValue(defaultScript);
            document.getElementById('currentStrategyName').textContent = 'Untitled';
            const tagsEl = document.getElementById('currentStrategyTags');
            if (tagsEl) tagsEl.classList.add('d-none');
        });
    }

    // Journal Logic
    setupJournal();

    // Analytics Logic
    setupAnalytics();
}

function setupAnalytics() {
    const analyticsTabBtn = document.querySelector('button[data-bs-target="#analyticsTab"]');
    if (analyticsTabBtn) {
        analyticsTabBtn.addEventListener('shown.bs.tab', () => {
            loadCashFlowChart();
            loadTradeReport();
        });
    }

    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', runAIAnalysis);
    }
}

let cashFlowChartInstance = null;

async function loadCashFlowChart() {
    try {
        const response = await fetch('/api/analytics/cashflow');
        if (!response.ok) return;
        const data = await response.json();

        const ctx = document.getElementById('cashFlowChart').getContext('2d');

        if (cashFlowChartInstance) {
            cashFlowChartInstance.destroy();
        }

        if (!data || data.length === 0) return;

        cashFlowChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: 'Balance ($)',
                    data: data.map(d => d.balance),
                    borderColor: '#0d6efd',
                    tension: 0.4,
                    fill: {
                        target: 'origin',
                        above: 'rgba(13, 110, 253, 0.1)',   // Area will be red above the origin
                        below: 'rgba(220, 53, 69, 0.1)'    // And blue below the origin
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false }
                }
            }
        });

        // Theme sync
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        updateChartsTheme(currentTheme);

    } catch (e) {
        console.error("Chart load failed", e);
    }
}

async function loadTradeReport() {
    try {
        const response = await fetch('/api/analytics/report');
        if (!response.ok) return;
        const report = await response.json();

        document.getElementById('metricWinRate').textContent = report.win_rate.toFixed(1) + '%';
        document.getElementById('metricProfitFactor').textContent = report.profit_factor.toFixed(2);
        document.getElementById('metricAvgWin').textContent = '$' + report.avg_win.toFixed(2);
        document.getElementById('metricAvgLoss').textContent = '$' + report.avg_loss.toFixed(2);

    } catch (e) {
        console.error("Report load failed", e);
    }
}

async function runAIAnalysis() {
    const inputEl = document.getElementById('aiPromptInput');
    const prompt = inputEl.value.trim();
    if (!prompt) return;

    const outputEl = document.getElementById('aiChatOutput');
    const btn = document.getElementById('aiAnalyzeBtn');

    // Add user message
    outputEl.innerHTML += `
        <div class="d-flex justify-content-end mb-3">
            <div class="bg-primary text-white p-2 rounded-3 small" style="max-width: 80%;">${prompt}</div>
        </div>
    `;
    outputEl.scrollTop = outputEl.scrollHeight;

    inputEl.value = '';
    btn.disabled = true;

    // Loading indicator
    const loadingId = 'ai-loading-' + Date.now();
    outputEl.innerHTML += `
        <div id="${loadingId}" class="d-flex justify-content-start mb-3">
            <div class="bg-body-secondary p-2 rounded-3 small text-muted">
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Analyzing data...
            </div>
        </div>
    `;
    outputEl.scrollTop = outputEl.scrollHeight;

    try {
        const response = await fetch('/api/analytics/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (response.ok) {
            const data = await response.json();
            // Render markdown (simple replacement for now, or use a library if available. For now just text)
            // A simple robust replacement for bolding and lists
            let formattedReply = data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            outputEl.innerHTML += `
                <div class="d-flex justify-content-start mb-3">
                    <div class="bg-body-tertiary p-3 rounded-3 small border" style="max-width: 90%;">
                        ${formattedReply}
                    </div>
                </div>
            `;
        } else {
            const errText = await response.text();
            outputEl.innerHTML += `
                <div class="d-flex justify-content-start mb-3">
                    <div class="bg-danger-subtle text-danger p-2 rounded-3 small">
                        Error: ${errText}
                    </div>
                </div>
            `;
        }
    } catch (error) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        outputEl.innerHTML += `
            <div class="d-flex justify-content-start mb-3">
                <div class="bg-danger-subtle text-danger p-2 rounded-3 small">
                    Error: ${error.message}
                </div>
            </div>
        `;
    } finally {
        btn.disabled = false;
        outputEl.scrollTop = outputEl.scrollHeight;
    }
}

function setupJournal() {
    const newJournalBtn = document.getElementById('newJournalBtn');
    if (newJournalBtn) {
        newJournalBtn.addEventListener('click', () => {
            document.getElementById('journalTitle').value = '';
            document.getElementById('journalTags').value = '';
            document.getElementById('journalContent').value = '';
            const modal = new bootstrap.Modal(document.getElementById('journalModal'));
            modal.show();
        });
    }

    const saveJournalBtn = document.getElementById('saveJournalBtn');
    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', saveJournalEntry);
    }

    // Load journal when tab is clicked
    const journalTabBtn = document.querySelector('button[data-bs-target="#journalTab"]');
    if (journalTabBtn) {
        journalTabBtn.addEventListener('shown.bs.tab', loadJournalEntries);
    }
}

async function loadJournalEntries() {
    try {
        const container = document.getElementById('journalList');
        // Simple loading state
        // container.innerHTML = '<div class="text-center text-muted">Loading...</div>';

        const response = await fetch('/api/journal/list?limit=50');
        if (response.ok) {
            const entries = await response.json();

            if (!entries || entries.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-5 text-muted">
                        <i class="bi bi-journal-album fs-1 mb-3 d-block"></i>
                        No journal entries yet. Write one!
                    </div>
                `;
                return;
            }

            container.innerHTML = entries.map(entry => {
                const tagsHtml = entry.tags && entry.tags.length > 0
                    ? entry.tags.map(t => `<span class="badge bg-secondary me-1" style="font-size: 0.7rem;">${t}</span>`).join('')
                    : '';
                const dateStr = new Date(entry.created_at).toLocaleString();

                return `
                <div class="card mb-3 shadow-sm border-0">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0 fw-bold text-primary">${entry.title}</h5>
                            <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteJournalEntry('${entry.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="mb-3 text-muted small">
                            <i class="bi bi-calendar3 me-1"></i> ${dateStr}
                            <span class="ms-2">${tagsHtml}</span>
                        </div>
                        <div class="card-text text-break" style="white-space: pre-wrap;">${entry.content}</div>
                    </div>
                </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load journal entries:', error);
    }
}

async function saveJournalEntry() {
    const title = document.getElementById('journalTitle').value.trim();
    const content = document.getElementById('journalContent').value.trim();
    const tagsStr = document.getElementById('journalTags').value;

    if (!title || !content) {
        alert('Title and Content are required');
        return;
    }

    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const btn = document.getElementById('saveJournalBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Saving...';

        const response = await fetch('/api/journal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, tags })
        });

        if (response.ok) {
            appendLog('Journal entry saved', 'success');

            // Close modal
            const modalEl = document.getElementById('journalModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reload list
            loadJournalEntries();
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error(error);
        alert('Failed to save journal entry');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Entry';
    }
}

window.deleteJournalEntry = async function (id) {
    if (!confirm('Delete this entry?')) return;
    try {
        const response = await fetch(`/api/journal/delete?id=${id}`, { method: 'POST' });
        if (response.ok) {
            loadJournalEntries();
        }
    } catch (e) {
        console.error(e);
    }
};

async function loadSavedStrategies() {
    try {
        const response = await fetch('/api/strategies/list');
        if (response.ok) {
            const strategies = await response.json();
            const container = document.getElementById('strategyList');
            if (container) {
                if (!strategies || strategies.length === 0) {
                    container.innerHTML = '<div class="text-center p-4 text-muted small">No strategies found</div>';
                    return;
                }

                container.innerHTML = strategies.map(strat => {
                    const tagsHtml = strat.tags && strat.tags.length > 0
                        ? strat.tags.map(t => `<span class="badge text-bg-secondary" style="font-size: 0.65rem;">${t}</span>`).join(' ')
                        : '';

                    return `
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-start p-2 strategy-item" role="button" onclick="loadStrategyContent('${strat.name}')">
                        <div class="ms-2 me-auto text-truncate" style="max-width: 140px;">
                            <div class="fw-bold text-truncate" title="${strat.name}">${strat.name}</div>
                            <div class="mt-1">${tagsHtml}</div>
                        </div>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-sm btn-link text-danger p-0 ms-2" title="Delete" onclick="deleteStrategy(event, '${strat.name}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load strategies:', error);
    }
}

// Make globally available for inline onclick
window.loadStrategyContent = async function (name) {
    try {
        // Highlight active item
        document.querySelectorAll('.strategy-item').forEach(el => el.classList.remove('active'));
        // (Simple active state setting would require finding the specific element, 
        // can implement if we pass 'this' or ID later, for now just load content)

        appendLog(`Loading strategy: ${name}...`, 'system');
        const response = await fetch(`/api/strategies/get?name=${encodeURIComponent(name)}`);
        if (response.ok) {
            const content = await response.text();
            if (editor) {
                editor.setValue(content);
                // Update header Info
                document.getElementById('currentStrategyName').textContent = name;

                // Fetch stats/meta again to get tags? Or just update form list...
                // For now, we don't have tags in the GET response content, only in list.
                // We'll trust the user to reload list or see it in sidebar.

                appendLog(`Strategy loaded`, 'success');
            }
        } else {
            throw new Error('Strategy not found');
        }
    } catch (error) {
        console.error('Failed to load strategy content:', error);
        appendLog(`Failed to load strategy: ${error.message}`, 'error');
    }
};

window.deleteStrategy = async function (event, name) {
    event.stopPropagation(); // Prevent loading
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
        const response = await fetch(`/api/strategies/delete?name=${encodeURIComponent(name)}`, {
            method: 'POST' // or DELETE
        });

        if (response.ok) {
            appendLog(`Deleted strategy: ${name}`, 'success');
            if (document.getElementById('currentStrategyName').textContent === name) {
                document.getElementById('currentStrategyName').textContent = 'Untitled';
                editor.setValue(defaultScript);
            }
            loadSavedStrategies();
        } else {
            throw new Error('Failed to delete');
        }
    } catch (error) {
        console.error('Failed to delete strategy:', error);
        alert('Failed to delete strategy');
    }
};

async function saveCurrentStrategy() {
    const nameInput = document.getElementById('strategyNameInput');
    const tagsInput = document.getElementById('strategyTagsInput');

    const name = nameInput.value.trim();
    if (!name) {
        alert('Please enter a strategy name');
        return;
    }

    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (!editor) return;
    const content = editor.getValue();

    const btn = document.getElementById('confirmSaveStrategyBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const response = await fetch('/api/strategies/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content, tags })
        });

        if (response.ok) {
            appendLog(`Strategy saved: ${name}`, 'success');
            document.getElementById('currentStrategyName').textContent = name.endsWith('.js') ? name : name + '.js';

            // Reload list
            await loadSavedStrategies();

            // Hide modal
            const modalEl = document.getElementById('saveStrategyModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Failed to save strategy:', error);
        alert('Failed to save strategy');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function startBotWithScript(script) {
    const runScriptBtn = document.getElementById('runScriptBtn');

    // Get base config but override strategy
    const config = getBotConfig();
    config.strategy = 'custom';
    config.script = script;

    try {
        if (runScriptBtn) runScriptBtn.disabled = true;
        appendLog(`Starting Custom Strategy...`, 'info');

        const response = await fetch('/api/bot/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
        }

        setBotRunning(true);
        appendLog('Custom Strategy started', 'success');

    } catch (error) {
        console.error('Failed to start bot:', error);
        appendLog(`Failed to start bot: ${error.message}`, 'error');
    } finally {
        if (runScriptBtn) runScriptBtn.disabled = false;
    }
}

function getBotConfig() {
    return {
        strategy: document.getElementById('configStrategy').value,
        symbol: document.getElementById('configSymbol').value,
        initial_stake: parseFloat(document.getElementById('configInitialStake').value),
        target_profit: parseFloat(document.getElementById('configTargetProfit').value),
        stop_loss: parseFloat(document.getElementById('configStopLoss').value),
        martingale: parseFloat(document.getElementById('configMartingale').value),
        duration: parseInt(document.getElementById('configDuration').value),
        duration_unit: document.getElementById('configDurationUnit').value,
        streak_threshold: parseInt(document.getElementById('configStreakThreshold').value),
        barrier: document.getElementById('configBarrier').value,
        use_trailing_stop: document.getElementById('configUseTrailingStop').checked
    };
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatStrategy(strategy) {
    if (!strategy) return '-';
    return strategy
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Theme Management
function initTheme() {
    const toggleBtn = document.getElementById('themeToggleBtn');

    // Initial UI Sync
    updateThemeUI(document.documentElement.getAttribute('data-bs-theme'));

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            setTheme(newTheme);
        });
    }
}

function setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (save) {
        localStorage.setItem('deriv-theme', theme);
    }
    updateThemeUI(theme);
    updateChartsTheme(theme);
}

function updateThemeUI(theme) {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'bi bi-sun-fill';
        toggleBtn.title = 'Switch to Light Mode';
    } else {
        icon.className = 'bi bi-moon-stars-fill';
        toggleBtn.title = 'Switch to Dark Mode';
    }
}

function updateChartsTheme(theme) {
    const isDark = theme === 'dark';

    // Colors
    const textColor = isDark ? '#cbd5e1' : '#64748b'; // slate-300 vs slate-500
    const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 vs slate-200

    const updateChart = (chart) => {
        if (!chart) return;

        // Update scales
        if (chart.options.scales.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
        }
        if (chart.options.scales.y) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }

        // Update Legend
        if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }

        chart.update('none'); // Update without animation for theme switch
    };

    updateChart(pnlChart);
    updateChart(winLossChart);
    updateChart(profitDistChart);
}
