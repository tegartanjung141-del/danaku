/* ============================================
   DompetKu - Financial Management App Logic
   ============================================ */

(function () {
    'use strict';

    // ========== Constants ==========
    const STORAGE_KEY = 'dompetku_data';
    const ICONS = ['🍔', '🚗', '🏠', '💡', '👕', '🎮', '📚', '🏥', '✈️', '🎬', '💰', '📱', '🎁', '🏋️', '🛒', '☕', '💳', '🎓', '🐾', '💼'];
    const COLORS = [
        '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#ef4444',
        '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
        '#6d28d9', '#be185d', '#0d9488', '#0369a1', '#b45309'
    ];

    const DEFAULT_CATEGORIES = [
        { id: 'c1', name: 'Makanan & Minuman', icon: '🍔', color: '#ef4444', type: 'expense' },
        { id: 'c2', name: 'Transportasi', icon: '🚗', color: '#f97316', type: 'expense' },
        { id: 'c3', name: 'Belanja', icon: '🛒', color: '#a855f7', type: 'expense' },
        { id: 'c4', name: 'Tagihan', icon: '💡', color: '#eab308', type: 'expense' },
        { id: 'c5', name: 'Hiburan', icon: '🎮', color: '#ec4899', type: 'expense' },
        { id: 'c6', name: 'Kesehatan', icon: '🏥', color: '#10b981', type: 'expense' },
        { id: 'c7', name: 'Pendidikan', icon: '🎓', color: '#3b82f6', type: 'expense' },
        { id: 'c8', name: 'Gaji', icon: '💰', color: '#22c55e', type: 'income' },
        { id: 'c9', name: 'Freelance', icon: '💼', color: '#06b6d4', type: 'income' },
        { id: 'c10', name: 'Investasi', icon: '📈', color: '#6366f1', type: 'income' },
        { id: 'c11', name: 'Hadiah', icon: '🎁', color: '#f59e0b', type: 'income' },
    ];

    const CURRENCY_SYMBOLS = { IDR: 'Rp', USD: '$', EUR: '€' };

    // ========== State ==========
    let state = {
        transactions: [],
        categories: [...DEFAULT_CATEGORIES],
        settings: {
            darkMode: false,
            currency: 'IDR',
        }
    };

    let charts = {};
    let confirmCallback = null;

    // ========== DOM Refs ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ========== Utility ==========
    function genId() {
        return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function formatCurrency(amount) {
        const sym = CURRENCY_SYMBOLS[state.settings.currency] || 'Rp';
        if (state.settings.currency === 'IDR') {
            return sym + ' ' + amount.toLocaleString('id-ID');
        }
        return sym + ' ' + amount.toLocaleString('en-US', { minimumFractionDigits: 0 });
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatDateShort(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    function showToast(message, type = 'success') {
        const container = $('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Selamat Pagi! ☀️';
        if (hour < 15) return 'Selamat Siang! 🌤️';
        if (hour < 18) return 'Selamat Sore! 🌅';
        return 'Selamat Malam! 🌙';
    }

    // ========== Storage ==========
    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save data', e);
        }
    }

    function loadData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                state.transactions = parsed.transactions || [];
                state.categories = parsed.categories || [...DEFAULT_CATEGORIES];
                state.settings = { ...state.settings, ...parsed.settings };
            }
        } catch (e) {
            console.error('Failed to load data', e);
        }
    }

    // ========== Navigation ==========
    function initNavigation() {
        $$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateTo(page);
            });
        });

        $('#view-all-transactions').addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('transactions');
        });

        // Mobile
        $('#hamburger').addEventListener('click', () => {
            $('#sidebar').classList.toggle('open');
            $('#hamburger').classList.toggle('open');
        });

        // FAB
        $('#fab-add').addEventListener('click', () => openTransactionModal());
    }

    function navigateTo(page) {
        $$('.page').forEach(p => p.classList.remove('active'));
        $$('.nav-item').forEach(n => n.classList.remove('active'));

        $(`#page-${page}`).classList.add('active');
        $(`#nav-${page}`).classList.add('active');

        // Close mobile sidebar
        $('#sidebar').classList.remove('open');
        $('#hamburger').classList.remove('open');

        // Refresh page data
        if (page === 'dashboard') renderDashboard();
        if (page === 'transactions') renderTransactions();
        if (page === 'categories') renderCategories();
        if (page === 'reports') renderReports();
    }

    // ========== Dashboard ==========
    function renderDashboard() {
        $('#greeting').textContent = getGreeting();

        const filterVal = $('#month-filter').value;
        let txs = [...state.transactions];

        if (filterVal !== 'all') {
            const [y, m] = filterVal.split('-');
            txs = txs.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() === parseInt(y) && d.getMonth() === parseInt(m);
            });
        }

        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const balance = income - expense;

        animateValue($('#total-balance'), balance);
        animateValue($('#total-income'), income);
        animateValue($('#total-expense'), expense);
        $('#total-count').textContent = txs.length;

        populateMonthFilter();
        renderRecentTransactions();
        renderCashflowChart();
        renderCategoryChart();
    }

    function animateValue(el, target) {
        el.textContent = formatCurrency(target);
    }

    function populateMonthFilter() {
        const select = $('#month-filter');
        const currentVal = select.value;
        const months = new Set();

        state.transactions.forEach(t => {
            const d = new Date(t.date);
            months.add(`${d.getFullYear()}-${d.getMonth()}`);
        });

        const sorted = Array.from(months).sort().reverse();
        select.innerHTML = '<option value="all">Semua</option>';
        sorted.forEach(m => {
            const [y, mo] = m.split('-');
            const d = new Date(parseInt(y), parseInt(mo));
            const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            select.innerHTML += `<option value="${m}" ${m === currentVal ? 'selected' : ''}>${label}</option>`;
        });
    }

    function renderRecentTransactions() {
        const list = $('#recent-transaction-list');
        const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        if (recent.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>Belum ada transaksi</p>
                <span>Tambahkan transaksi pertamamu!</span>
            </div>`;
            return;
        }

        list.innerHTML = recent.map(t => createTransactionHTML(t)).join('');
        attachTransactionActions(list);
    }

    function createTransactionHTML(t) {
        const cat = state.categories.find(c => c.id === t.categoryId);
        const icon = cat ? cat.icon : '💰';
        const color = cat ? cat.color : '#6366f1';
        const catName = cat ? cat.name : 'Lainnya';

        return `
        <div class="transaction-item" data-id="${t.id}">
            <div class="tx-icon" style="background: ${color}20; color: ${color}">${icon}</div>
            <div class="tx-details">
                <div class="tx-desc">${escapeHtml(t.description)}</div>
                <div class="tx-meta">
                    <span>${catName}</span>
                    <span>•</span>
                    <span>${formatDate(t.date)}</span>
                </div>
            </div>
            <span class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
            <div class="tx-actions">
                <button class="tx-action-btn edit" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="tx-action-btn delete" title="Hapus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function attachTransactionActions(container) {
        container.querySelectorAll('.tx-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.transaction-item').dataset.id;
                openTransactionModal(id);
            });
        });
        container.querySelectorAll('.tx-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.transaction-item').dataset.id;
                showConfirm('Apakah kamu yakin ingin menghapus transaksi ini?', () => {
                    deleteTransaction(id);
                });
            });
        });
    }

    // ========== Charts ==========
    function getChartTextColor() {
        return state.settings.darkMode ? '#94a3b8' : '#64748b';
    }

    function getChartGridColor() {
        return state.settings.darkMode ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.05)';
    }

    function renderCashflowChart() {
        const ctx = $('#chart-cashflow');
        if (!ctx) return;

        if (charts.cashflow) charts.cashflow.destroy();

        const last7 = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            last7.push(d.toISOString().split('T')[0]);
        }

        const incomeData = last7.map(day =>
            state.transactions.filter(t => t.date === day && t.type === 'income').reduce((s, t) => s + t.amount, 0)
        );
        const expenseData = last7.map(day =>
            state.transactions.filter(t => t.date === day && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        );

        charts.cashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7.map(d => formatDateShort(d)),
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Pengeluaran',
                        data: expenseData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#ef4444'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: getChartTextColor(), font: { family: 'Inter', size: 12 } }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: getChartTextColor(), font: { family: 'Inter', size: 11 } },
                        grid: { color: getChartGridColor() }
                    },
                    y: {
                        ticks: {
                            color: getChartTextColor(),
                            font: { family: 'Inter', size: 11 },
                            callback: (v) => formatCurrency(v)
                        },
                        grid: { color: getChartGridColor() }
                    }
                }
            }
        });
    }

    function renderCategoryChart() {
        const ctx = $('#chart-category');
        if (!ctx) return;

        if (charts.category) charts.category.destroy();

        const expenseByCategory = {};
        state.transactions.filter(t => t.type === 'expense').forEach(t => {
            if (!expenseByCategory[t.categoryId]) expenseByCategory[t.categoryId] = 0;
            expenseByCategory[t.categoryId] += t.amount;
        });

        const entries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);

        if (entries.length === 0) {
            charts.category = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Belum ada data'],
                    datasets: [{ data: [1], backgroundColor: [getChartGridColor()], borderWidth: 0 }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { labels: { color: getChartTextColor(), font: { family: 'Inter' } } }
                    }
                }
            });
            return;
        }

        const labels = entries.map(([id]) => {
            const cat = state.categories.find(c => c.id === id);
            return cat ? cat.name : 'Lainnya';
        });
        const data = entries.map(([, v]) => v);
        const colors = entries.map(([id]) => {
            const cat = state.categories.find(c => c.id === id);
            return cat ? cat.color : '#6366f1';
        });

        charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: state.settings.darkMode ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: getChartTextColor(), font: { family: 'Inter', size: 11 }, padding: 12 }
                    }
                }
            }
        });
    }

    // ========== Transactions Page ==========
    function renderTransactions() {
        const list = $('#full-transaction-list');
        let txs = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Apply filters
        const search = $('#search-transactions').value.toLowerCase();
        const typeFilter = $('#filter-type').value;
        const catFilter = $('#filter-category').value;

        if (search) {
            txs = txs.filter(t => t.description.toLowerCase().includes(search));
        }
        if (typeFilter !== 'all') {
            txs = txs.filter(t => t.type === typeFilter);
        }
        if (catFilter !== 'all') {
            txs = txs.filter(t => t.categoryId === catFilter);
        }

        if (txs.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p>Tidak ada transaksi</p>
                <span>${search || typeFilter !== 'all' || catFilter !== 'all' ? 'Coba ubah filter pencarian' : 'Klik "Tambah Transaksi" untuk memulai'}</span>
            </div>`;
            return;
        }

        list.innerHTML = txs.map(t => createTransactionHTML(t)).join('');
        attachTransactionActions(list);
        populateCategoryFilter();
    }

    function populateCategoryFilter() {
        const select = $('#filter-category');
        const currentVal = select.value;
        select.innerHTML = '<option value="all">Semua Kategori</option>';
        state.categories.forEach(c => {
            select.innerHTML += `<option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>${c.icon} ${c.name}</option>`;
        });
    }

    // ========== Transaction Modal ==========
    function openTransactionModal(editId) {
        const modal = $('#modal-transaction');
        const form = $('#form-transaction');
        const title = $('#modal-transaction-title');

        form.reset();
        populateTransactionCategorySelect('expense');

        if (editId) {
            const tx = state.transactions.find(t => t.id === editId);
            if (!tx) return;
            title.textContent = 'Edit Transaksi';
            $('#tx-id').value = tx.id;
            $('#tx-amount').value = tx.amount;
            $('#tx-description').value = tx.description;
            $('#tx-date').value = tx.date;

            // Set type
            $$('.type-toggle .type-btn').forEach(b => b.classList.remove('active'));
            $(`#type-${tx.type}`).classList.add('active');
            populateTransactionCategorySelect(tx.type);
            $('#tx-category').value = tx.categoryId;
        } else {
            title.textContent = 'Tambah Transaksi';
            $('#tx-id').value = '';
            $('#tx-date').value = new Date().toISOString().split('T')[0];
            // Default to expense
            $$('.type-toggle .type-btn').forEach(b => b.classList.remove('active'));
            $('#type-expense').classList.add('active');
        }

        modal.classList.add('active');
    }

    function populateTransactionCategorySelect(type) {
        const select = $('#tx-category');
        select.innerHTML = '<option value="">Pilih kategori</option>';
        state.categories.filter(c => c.type === type).forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
        });
    }

    function closeTransactionModal() {
        $('#modal-transaction').classList.remove('active');
    }

    function saveTransaction(e) {
        e.preventDefault();

        const id = $('#tx-id').value;
        const activeType = $('.type-toggle .type-btn.active');
        const type = activeType ? activeType.dataset.type : 'expense';
        const amount = parseInt($('#tx-amount').value);
        const categoryId = $('#tx-category').value;
        const description = $('#tx-description').value.trim();
        const date = $('#tx-date').value;

        if (!amount || !categoryId || !description || !date) {
            showToast('Lengkapi semua field!', 'error');
            return;
        }

        if (id) {
            const idx = state.transactions.findIndex(t => t.id === id);
            if (idx !== -1) {
                state.transactions[idx] = { id, type, amount, categoryId, description, date };
                showToast('Transaksi berhasil diperbarui');
            }
        } else {
            state.transactions.push({ id: genId(), type, amount, categoryId, description, date });
            showToast('Transaksi berhasil ditambahkan');
        }

        saveData();
        closeTransactionModal();
        refreshCurrentPage();
    }

    function deleteTransaction(id) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveData();
        showToast('Transaksi berhasil dihapus');
        refreshCurrentPage();
    }

    // ========== Categories ==========
    function renderCategories() {
        const grid = $('#categories-grid');

        if (state.categories.length === 0) {
            grid.innerHTML = `<div class="empty-state">
                <p>Belum ada kategori</p>
                <span>Klik "Tambah Kategori" untuk memulai</span>
            </div>`;
            return;
        }

        grid.innerHTML = state.categories.map(c => `
            <div class="category-card" data-id="${c.id}">
                <div class="cat-icon-wrapper" style="background: ${c.color}20; color: ${c.color}">${c.icon}</div>
                <div class="cat-info">
                    <div class="cat-name">${escapeHtml(c.name)}</div>
                    <span class="cat-type-badge ${c.type}">${c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
                </div>
                <div class="cat-actions">
                    <button class="cat-action-btn edit" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="cat-action-btn delete" title="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Category actions
        grid.querySelectorAll('.cat-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.category-card').dataset.id;
                openCategoryModal(id);
            });
        });

        grid.querySelectorAll('.cat-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.category-card').dataset.id;
                const txCount = state.transactions.filter(t => t.categoryId === id).length;
                const msg = txCount > 0
                    ? `Kategori ini memiliki ${txCount} transaksi. Hapus kategori beserta transaksinya?`
                    : 'Apakah kamu yakin ingin menghapus kategori ini?';
                showConfirm(msg, () => {
                    deleteCategory(id);
                });
            });
        });
    }

    function openCategoryModal(editId) {
        const modal = $('#modal-category');
        const form = $('#form-category');
        const title = $('#modal-category-title');

        form.reset();
        renderIconPicker();
        renderColorPicker();

        if (editId) {
            const cat = state.categories.find(c => c.id === editId);
            if (!cat) return;
            title.textContent = 'Edit Kategori';
            $('#cat-id').value = cat.id;
            $('#cat-name').value = cat.name;

            // Set type
            $$('#form-category .type-btn').forEach(b => b.classList.remove('active'));
            $(`#cat-type-${cat.type}`).classList.add('active');

            // Set icon
            $$('.icon-option').forEach(o => {
                o.classList.toggle('active', o.dataset.icon === cat.icon);
            });

            // Set color
            $$('.color-option').forEach(o => {
                o.classList.toggle('active', o.dataset.color === cat.color);
            });
        } else {
            title.textContent = 'Tambah Kategori';
            $('#cat-id').value = '';
            $$('#form-category .type-btn').forEach(b => b.classList.remove('active'));
            $('#cat-type-expense').classList.add('active');
        }

        modal.classList.add('active');
    }

    function renderIconPicker() {
        const picker = $('#icon-picker');
        picker.innerHTML = ICONS.map((icon, i) =>
            `<div class="icon-option ${i === 0 ? 'active' : ''}" data-icon="${icon}">${icon}</div>`
        ).join('');

        picker.querySelectorAll('.icon-option').forEach(opt => {
            opt.addEventListener('click', () => {
                picker.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    function renderColorPicker() {
        const picker = $('#color-picker');
        picker.innerHTML = COLORS.map((color, i) =>
            `<div class="color-option ${i === 0 ? 'active' : ''}" data-color="${color}" style="background: ${color}"></div>`
        ).join('');

        picker.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                picker.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    function closeCategoryModal() {
        $('#modal-category').classList.remove('active');
    }

    function saveCategory(e) {
        e.preventDefault();

        const id = $('#cat-id').value;
        const activeType = $('#form-category .type-btn.active');
        const type = activeType ? activeType.dataset.type : 'expense';
        const name = $('#cat-name').value.trim();
        const activeIcon = $('.icon-option.active');
        const icon = activeIcon ? activeIcon.dataset.icon : '💰';
        const activeColor = $('.color-option.active');
        const color = activeColor ? activeColor.dataset.color : '#6366f1';

        if (!name) {
            showToast('Nama kategori harus diisi!', 'error');
            return;
        }

        if (id) {
            const idx = state.categories.findIndex(c => c.id === id);
            if (idx !== -1) {
                state.categories[idx] = { id, name, icon, color, type };
                showToast('Kategori berhasil diperbarui');
            }
        } else {
            state.categories.push({ id: genId(), name, icon, color, type });
            showToast('Kategori berhasil ditambahkan');
        }

        saveData();
        closeCategoryModal();
        renderCategories();
    }

    function deleteCategory(id) {
        state.categories = state.categories.filter(c => c.id !== id);
        state.transactions = state.transactions.filter(t => t.categoryId !== id);
        saveData();
        showToast('Kategori berhasil dihapus');
        renderCategories();
    }

    // ========== Reports ==========
    function renderReports() {
        const days = parseInt($('#report-period').value);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const txs = state.transactions.filter(t => new Date(t.date) >= cutoff);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        $('#avg-income').textContent = formatCurrency(Math.round(income / days));
        $('#avg-expense').textContent = formatCurrency(Math.round(expense / days));

        const expenses = txs.filter(t => t.type === 'expense');
        const highest = expenses.length > 0 ? Math.max(...expenses.map(t => t.amount)) : 0;
        $('#highest-expense').textContent = formatCurrency(highest);

        // Top Category
        const catSums = {};
        expenses.forEach(t => {
            if (!catSums[t.categoryId]) catSums[t.categoryId] = 0;
            catSums[t.categoryId] += t.amount;
        });
        const topCatId = Object.entries(catSums).sort((a, b) => b[1] - a[1])[0];
        if (topCatId) {
            const cat = state.categories.find(c => c.id === topCatId[0]);
            $('#top-category').textContent = cat ? cat.name : '-';
        } else {
            $('#top-category').textContent = '-';
        }

        renderTrendChart(days);
        renderDistributionChart(days);
        renderTopCategoriesChart(days);
    }

    function renderTrendChart(days) {
        const ctx = $('#chart-trend');
        if (!ctx) return;
        if (charts.trend) charts.trend.destroy();

        const labels = [];
        const incomeData = [];
        const expenseData = [];
        const today = new Date();

        const step = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 7 : 30;
        const points = days <= 7 ? days : days <= 30 ? 30 : days <= 90 ? 13 : 12;

        for (let i = points - 1; i >= 0; i--) {
            const end = new Date(today);
            end.setDate(end.getDate() - i * step);
            const start = new Date(end);
            start.setDate(start.getDate() - step + 1);

            labels.push(formatDateShort(end.toISOString().split('T')[0]));

            const periodTxs = state.transactions.filter(t => {
                const d = new Date(t.date);
                return d >= start && d <= end;
            });

            incomeData.push(periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
            expenseData.push(periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
        }

        charts.trend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Pemasukan',
                        data: incomeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                    {
                        label: 'Pengeluaran',
                        data: expenseData,
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderRadius: 6,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { labels: { color: getChartTextColor(), font: { family: 'Inter', size: 12 } } }
                },
                scales: {
                    x: {
                        ticks: { color: getChartTextColor(), font: { family: 'Inter', size: 10 }, maxRotation: 45 },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: getChartTextColor(),
                            font: { family: 'Inter', size: 11 },
                            callback: (v) => formatCurrency(v)
                        },
                        grid: { color: getChartGridColor() }
                    }
                }
            }
        });
    }

    function renderDistributionChart(days) {
        const ctx = $('#chart-distribution');
        if (!ctx) return;
        if (charts.distribution) charts.distribution.destroy();

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const catSums = {};
        state.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= cutoff).forEach(t => {
            if (!catSums[t.categoryId]) catSums[t.categoryId] = 0;
            catSums[t.categoryId] += t.amount;
        });

        const entries = Object.entries(catSums).sort((a, b) => b[1] - a[1]).slice(0, 8);

        if (entries.length === 0) {
            charts.distribution = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Belum ada data'],
                    datasets: [{ data: [1], backgroundColor: [getChartGridColor()], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: getChartTextColor() } } } }
            });
            return;
        }

        charts.distribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: entries.map(([id]) => {
                    const cat = state.categories.find(c => c.id === id);
                    return cat ? cat.name : 'Lainnya';
                }),
                datasets: [{
                    data: entries.map(([, v]) => v),
                    backgroundColor: entries.map(([id]) => {
                        const cat = state.categories.find(c => c.id === id);
                        return cat ? cat.color : '#6366f1';
                    }),
                    borderWidth: 2,
                    borderColor: state.settings.darkMode ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: getChartTextColor(), font: { family: 'Inter', size: 11 }, padding: 12 }
                    }
                }
            }
        });
    }

    function renderTopCategoriesChart(days) {
        const ctx = $('#chart-top-categories');
        if (!ctx) return;
        if (charts.topCategories) charts.topCategories.destroy();

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const catSums = {};
        state.transactions.filter(t => t.type === 'expense' && new Date(t.date) >= cutoff).forEach(t => {
            if (!catSums[t.categoryId]) catSums[t.categoryId] = 0;
            catSums[t.categoryId] += t.amount;
        });

        const entries = Object.entries(catSums).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (entries.length === 0) {
            charts.topCategories = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Belum ada data'],
                    datasets: [{ data: [0], backgroundColor: [getChartGridColor()] }]
                },
                options: { responsive: true, maintainAspectRatio: true, indexAxis: 'y', plugins: { legend: { display: false } } }
            });
            return;
        }

        charts.topCategories = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: entries.map(([id]) => {
                    const cat = state.categories.find(c => c.id === id);
                    return cat ? `${cat.icon} ${cat.name}` : 'Lainnya';
                }),
                datasets: [{
                    data: entries.map(([, v]) => v),
                    backgroundColor: entries.map(([id]) => {
                        const cat = state.categories.find(c => c.id === id);
                        return cat ? cat.color : '#6366f1';
                    }),
                    borderRadius: 8,
                    borderSkipped: false,
                    barThickness: 28
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: getChartTextColor(), font: { family: 'Inter' }, callback: (v) => formatCurrency(v) },
                        grid: { color: getChartGridColor() }
                    },
                    y: {
                        ticks: { color: getChartTextColor(), font: { family: 'Inter', size: 12 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // ========== Settings ==========
    function initSettings() {
        // Dark Mode
        const darkToggle = $('#toggle-dark-mode');
        darkToggle.checked = state.settings.darkMode;
        applyDarkMode(state.settings.darkMode);

        darkToggle.addEventListener('change', () => {
            state.settings.darkMode = darkToggle.checked;
            applyDarkMode(state.settings.darkMode);
            saveData();
            // Re-render charts
            refreshCurrentPage();
        });

        // Currency
        const currencySelect = $('#currency-select');
        currencySelect.value = state.settings.currency;
        currencySelect.addEventListener('change', () => {
            state.settings.currency = currencySelect.value;
            saveData();
            refreshCurrentPage();
            showToast('Mata uang berhasil diubah');
        });

        // Clear Data
        $('#btn-clear-data').addEventListener('click', () => {
            showConfirm('Apakah kamu yakin ingin menghapus SEMUA data? Tindakan ini tidak bisa dibatalkan!', () => {
                state.transactions = [];
                state.categories = [...DEFAULT_CATEGORIES];
                saveData();
                refreshCurrentPage();
                showToast('Semua data berhasil dihapus', 'info');
            });
        });

        // Export JSON
        $('#btn-export-json').addEventListener('click', exportJSON);

        // Import
        $('#import-file').addEventListener('change', importJSON);

        // Export CSV
        $('#btn-export-data').addEventListener('click', exportCSV);
    }

    function applyDarkMode(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }

    // ========== Export / Import ==========
    function exportCSV() {
        if (state.transactions.length === 0) {
            showToast('Tidak ada data untuk diekspor', 'error');
            return;
        }

        let csv = 'Tanggal,Tipe,Kategori,Deskripsi,Jumlah\n';
        state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
            const cat = state.categories.find(c => c.id === t.categoryId);
            const catName = cat ? cat.name : 'Lainnya';
            csv += `"${t.date}","${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}","${catName}","${t.description}",${t.type === 'income' ? '' : '-'}${t.amount}\n`;
        });

        downloadFile(csv, 'dompetku_transactions.csv', 'text/csv');
        showToast('Data berhasil diekspor ke CSV');
    }

    function exportJSON() {
        const data = JSON.stringify(state, null, 2);
        downloadFile(data, 'dompetku_backup.json', 'application/json');
        showToast('Data berhasil diekspor ke JSON');
    }

    function importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const data = JSON.parse(event.target.result);
                if (data.transactions && data.categories) {
                    state.transactions = data.transactions;
                    state.categories = data.categories;
                    if (data.settings) state.settings = { ...state.settings, ...data.settings };
                    saveData();
                    refreshCurrentPage();
                    showToast('Data berhasil diimpor!');
                } else {
                    showToast('Format file tidak valid', 'error');
                }
            } catch {
                showToast('Gagal membaca file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ========== Confirm Modal ==========
    function showConfirm(message, callback) {
        confirmCallback = callback;
        $('#confirm-message').textContent = message;
        $('#modal-confirm').classList.add('active');
    }

    function closeConfirm() {
        $('#modal-confirm').classList.remove('active');
        confirmCallback = null;
    }

    // ========== Helpers ==========
    function refreshCurrentPage() {
        const activePage = $('.page.active');
        if (!activePage) return;
        const id = activePage.id.replace('page-', '');
        if (id === 'dashboard') renderDashboard();
        if (id === 'transactions') renderTransactions();
        if (id === 'categories') renderCategories();
        if (id === 'reports') renderReports();
    }

    // ========== Event Listeners ==========
    function initEventListeners() {
        // Transaction modal
        $('#btn-add-transaction').addEventListener('click', () => openTransactionModal());
        $('#modal-transaction-close').addEventListener('click', closeTransactionModal);
        $('#btn-cancel-transaction').addEventListener('click', closeTransactionModal);
        $('#form-transaction').addEventListener('submit', saveTransaction);

        // Transaction type toggle
        ['type-expense', 'type-income'].forEach(id => {
            $(`#${id}`).addEventListener('click', (e) => {
                $$('#form-transaction .type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                populateTransactionCategorySelect(e.target.dataset.type);
            });
        });

        // Category modal
        $('#btn-add-category').addEventListener('click', () => openCategoryModal());
        $('#modal-category-close').addEventListener('click', closeCategoryModal);
        $('#btn-cancel-category').addEventListener('click', closeCategoryModal);
        $('#form-category').addEventListener('submit', saveCategory);

        // Category type toggle
        ['cat-type-expense', 'cat-type-income'].forEach(id => {
            $(`#${id}`).addEventListener('click', (e) => {
                $$('#form-category .type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Confirm modal
        $('#modal-confirm-close').addEventListener('click', closeConfirm);
        $('#btn-confirm-cancel').addEventListener('click', closeConfirm);
        $('#btn-confirm-ok').addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            closeConfirm();
        });

        // Close modals on overlay click
        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Transaction filters
        $('#search-transactions').addEventListener('input', renderTransactions);
        $('#filter-type').addEventListener('change', renderTransactions);
        $('#filter-category').addEventListener('change', renderTransactions);

        // Month filter
        $('#month-filter').addEventListener('change', renderDashboard);

        // Report period
        $('#report-period').addEventListener('change', renderReports);
    }

    // ========== Init ==========
    function init() {
        loadData();
        initNavigation();
        initEventListeners();
        initSettings();
        renderDashboard();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
