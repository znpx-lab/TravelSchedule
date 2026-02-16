/* ========================================
   旅行スケジュール管理 - 予算・費用管理コンポーネント
   旅行中の費用記録・割り勘計算機能を管理します。
   ======================================== */

import { getExpenses, saveData, loadData, generateId, getUsers, getCurrentTrip } from '../storage.js';
import { showModal } from '../ui.js';

/**
 * initExpenses()
 * 費用管理機能の初期化
 */
export function initExpenses() {
    renderExpenseList();

    document.getElementById('add-expense-btn').addEventListener('click', () => {
        showExpenseModal();
    });

    const totalSplitToggle = document.getElementById('total-split-only');
    if (totalSplitToggle) {
        totalSplitToggle.checked = getTotalSplitOnly();
        totalSplitToggle.addEventListener('change', () => {
            setTotalSplitOnly(totalSplitToggle.checked);
            renderExpenseList();
        });
    }

    const splitCountInput = document.getElementById('split-count');
    if (splitCountInput) {
        splitCountInput.value = String(getSplitCount());
        splitCountInput.addEventListener('input', () => {
            const nextValue = normalizeSplitCount(splitCountInput.value);
            setSplitCount(nextValue);
            renderExpenseList();
        });
        splitCountInput.addEventListener('change', () => {
            const nextValue = normalizeSplitCount(splitCountInput.value);
            splitCountInput.value = String(nextValue);
            setSplitCount(nextValue);
            renderExpenseList();
        });
    }

    window.addEventListener('dataChanged', () => {
        renderExpenseList();
    });
}

/**
 * renderExpenseList()
 * 費用一覧をリスト形式で描画し、合計金額と割り勘目安を表示
 */
function renderExpenseList() {
    const listContainer = document.getElementById('expense-list');
    const totalAmountSpan = document.getElementById('total-amount');
    const expenses = getExpenses();
    const users = getUsers();
    const totalSplitOnly = getTotalSplitOnly();
    const summaryContainer = document.querySelector('.expense-summary');
    const splitCountInput = document.getElementById('split-count');
    if (splitCountInput) {
        const currentValue = splitCountInput.value;
        if (!document.activeElement || document.activeElement !== splitCountInput) {
            splitCountInput.value = String(getSplitCount());
        } else if (!currentValue) {
            splitCountInput.value = String(getSplitCount());
        }
    }

    if (expenses.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">費用が登録されていません。</p>';
        totalAmountSpan.textContent = '¥0';
        summaryContainer?.querySelector('.settlement-card')?.remove();
        return;
    }

    let total = 0;
    let html = '';

    expenses.sort((a, b) => b.date.localeCompare(a.date)).forEach(exp => {
        const isSplit = isSplitExpense(exp);
        const amount = getExpenseAmount(exp);
        const hasAmount = exp.amount !== null && exp.amount !== undefined;
        if (!totalSplitOnly || isSplit) {
            total += amount;
        }
        const payer = users.find(u => u.id === exp.paidBy);
        
        html += `
            <div class="expense-item" data-id="${exp.id}">
                <div class="expense-main">
                    <div class="expense-title">${exp.title}</div>
                    <div class="expense-meta">
                        <span class="expense-date">${exp.date}</span>
                        <span class="expense-cat">${getExpenseCategoryLabel(exp.category)}</span>
                        ${isSplit ? '' : '<span class="expense-flag">割り勘対象外</span>'}
                    </div>
                </div>
                <div class="expense-details">
                    <div class="expense-amount">${hasAmount ? '¥' + amount.toLocaleString() : '未定'}</div>
                    <div class="expense-payer">支払者: ${payer ? payer.name : '不明'}</div>
                </div>
                <div class="expense-actions">
                    <button class="edit-btn" onclick="window.editExpense('${exp.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="window.deleteExpense('${exp.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
    totalAmountSpan.textContent = `¥${total.toLocaleString()}`;
    
    // Add Settlement Summary
    renderSettlement();
}

/**
 * getExpenseCategoryLabel()
 * 費用カテゴリーコードを日本語ラベルに変換
 */
function getExpenseCategoryLabel(cat) {
    const labels = {
        food: '食事',
        transport: '移動',
        accommodation: '宿泊',
        activity: '体験',
        other: 'その他'
    };
    return labels[cat] || 'その他';
}

/**
 * renderSettlement()
 * 割り勘計算を行い、各メンバーの支払残高を表示
 */
function renderSettlement() {
    const expenses = getExpenses();
    const users = getUsers();
    const splitCount = getEffectiveSplitCount();
    const summaryContainer = document.querySelector('.expense-summary');
    if (splitCount <= 1) {
        summaryContainer?.querySelector('.settlement-card')?.remove();
        return;
    }

    const splitExpenses = expenses.filter(isSplitExpense);
    let settlementHtml = '<div class="settlement-card"><h4>割り勘目安</h4><ul>';
    
    const total = splitExpenses.reduce((sum, exp) => sum + getExpenseAmount(exp), 0);
    const perPerson = Math.floor(total / splitCount);

    settlementHtml += `<li>1人あたり: ¥${perPerson.toLocaleString()}</li>`;
    
    // Simple balance calculation
    const balances = {};
    users.forEach(u => balances[u.id] = 0);
    
    splitExpenses.forEach(exp => {
        balances[exp.paidBy] += getExpenseAmount(exp);
    });

    users.forEach(u => {
        const diff = balances[u.id] - perPerson;
        const statusClass = diff >= 0 ? 'plus' : 'minus';
        settlementHtml += `<li>${u.name}: <span class="${statusClass}">${diff >= 0 ? '+' : ''}¥${diff.toLocaleString()}</span></li>`;
    });

    settlementHtml += '</ul></div>';
    
    // Update or append settlement card
    const existing = summaryContainer.querySelector('.settlement-card');
    if (existing) existing.remove();
    summaryContainer.insertAdjacentHTML('beforeend', settlementHtml);
}

/**
 * showExpenseModal()
 * 費用追加・編集用のモーダルを表示
 */
function showExpenseModal(expenseId = null) {
    const data = loadData();
    const trip = getCurrentTrip(data);
    if (!trip) return;
    const exp = expenseId ? trip.expenses.find(e => e.id === expenseId) : null;
    const users = getUsers();

    // 設定からカテゴリーを取得
    const expenseCategories = trip.settings?.expenseCategories || [
        { value: 'food', label: '食事' },
        { value: 'transport', label: '移動' },
        { value: 'accommodation', label: '宿泊' },
        { value: 'activity', label: '体験' },
        { value: 'other', label: 'その他' }
    ];

    const categoryOptionsHtml = expenseCategories.map(cat =>
        `<option value="${cat.value}" ${exp?.category === cat.value ? 'selected' : ''}>${cat.label}</option>`
    ).join('');
    const isSplitChecked = exp ? exp.isSplit !== false : true;

    const title = exp ? '費用を編集' : '費用を追加';
    const bodyHtml = `
        <form id="expense-form">
            <div class="form-group">
                <label for="exp-title">項目名 *</label>
                <input type="text" id="exp-title" value="${exp ? exp.title : ''}" placeholder="例：ランチ代" required>
            </div>
            <div class="form-group">
                <label for="exp-amount">金額 (¥)</label>
                <input type="number" id="exp-amount" value="${exp ? exp.amount : ''}" placeholder="未定">
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="exp-split" ${isSplitChecked ? 'checked' : ''} style="cursor: pointer;">
                    <span>割り勘対象</span>
                </label>
            </div>
            <div class="form-group">
                <label for="exp-calc">電卓</label>
                <div class="calc-panel">
                    <input type="text" id="exp-calc" class="calc-display" value="${exp ? exp.amount : ''}" placeholder="例: 1200+300" inputmode="numeric" oninput="window.sanitizeCalcInput('exp-calc')">
                    <div class="calc-buttons">
                        <button type="button" onclick="window.calcAppend('7')">7</button>
                        <button type="button" onclick="window.calcAppend('8')">8</button>
                        <button type="button" onclick="window.calcAppend('9')">9</button>
                        <button type="button" class="calc-op" onclick="window.calcAppend('/')">/</button>
                        <button type="button" onclick="window.calcAppend('4')">4</button>
                        <button type="button" onclick="window.calcAppend('5')">5</button>
                        <button type="button" onclick="window.calcAppend('6')">6</button>
                        <button type="button" class="calc-op" onclick="window.calcAppend('*')">*</button>
                        <button type="button" onclick="window.calcAppend('1')">1</button>
                        <button type="button" onclick="window.calcAppend('2')">2</button>
                        <button type="button" onclick="window.calcAppend('3')">3</button>
                        <button type="button" class="calc-op" onclick="window.calcAppend('-')">-</button>
                        <button type="button" class="calc-action" onclick="window.calcClear('exp-calc')">C</button>
                        <button type="button" onclick="window.calcAppend('0')">0</button>
                        <button type="button" class="calc-action" onclick="window.calcBackspace('exp-calc')">BS</button>
                        <button type="button" class="calc-op" onclick="window.calcAppend('+')">+</button>
                        <button type="button" class="calc-eq" onclick="window.calcEvaluate('exp-calc')">=</button>
                    </div>
                    <button type="button" class="calc-apply" onclick="window.applyCalcToAmount()">金額に反映</button>
                </div>
            </div>
            <div class="form-group">
                <label for="exp-date">日付 *</label>
                <input type="date" id="exp-date" value="${exp ? exp.date : new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label for="exp-payer">支払者</label>
                <select id="exp-payer">
                    ${users.map(u => `<option value="${u.id}" ${exp?.paidBy === u.id ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="exp-category">カテゴリー</label>
                <select id="exp-category">
                    ${categoryOptionsHtml}
                </select>
            </div>
            <div class="form-group">
                <label for="exp-notes">メモ</label>
                <textarea id="exp-notes" rows="2">${exp ? exp.notes : ''}</textarea>
            </div>
        </form>
    `;

    showModal(title, bodyHtml, () => {
        const form = document.getElementById('expense-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        const amountValue = document.getElementById('exp-amount').value;
        const newExp = {
            id: expenseId || generateId(),
            title: document.getElementById('exp-title').value,
            amount: amountValue ? parseInt(amountValue, 10) : null,
            date: document.getElementById('exp-date').value,
            paidBy: document.getElementById('exp-payer').value,
            category: document.getElementById('exp-category').value,
            notes: document.getElementById('exp-notes').value,
            isSplit: document.getElementById('exp-split').checked,
            updatedAt: new Date().toISOString()
        };

        const currentData = loadData();
        const currentTrip = getCurrentTrip(currentData);
        if (!currentTrip) return false;
        if (expenseId) {
            const index = currentTrip.expenses.findIndex(e => e.id === expenseId);
            currentTrip.expenses[index] = newExp;
        } else {
            currentTrip.expenses.push(newExp);
        }
        saveData(currentData);
        return true;
    });
}

window.editExpense = (id) => {
    showExpenseModal(id);
};

window.deleteExpense = (id) => {
    if (confirm('この費用を削除してもよろしいですか？')) {
        const data = loadData();
        const trip = getCurrentTrip(data);
        if (!trip) return;
        trip.expenses = trip.expenses.filter(e => e.id !== id);
        saveData(data);
    }
};

const TOTAL_SPLIT_ONLY_KEY = 'expense_total_split_only';
const SPLIT_COUNT_KEY = 'expense_split_count';

function getTotalSplitOnly() {
    return localStorage.getItem(TOTAL_SPLIT_ONLY_KEY) === 'true';
}

function setTotalSplitOnly(value) {
    localStorage.setItem(TOTAL_SPLIT_ONLY_KEY, String(value));
}

function getSplitCount() {
    const rawValue = localStorage.getItem(SPLIT_COUNT_KEY);
    const parsed = rawValue ? parseInt(rawValue, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
    const users = getUsers();
    return users.length > 0 ? users.length : 1;
}

function setSplitCount(value) {
    localStorage.setItem(SPLIT_COUNT_KEY, String(value));
}

function getEffectiveSplitCount() {
    const splitCountInput = document.getElementById('split-count');
    if (splitCountInput) {
        const parsed = parseInt(splitCountInput.value, 10);
        if (Number.isFinite(parsed) && parsed >= 1) return parsed;
    }
    return getSplitCount();
}

function normalizeSplitCount(value) {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1) return parsed;
    return 1;
}

function isSplitExpense(expense) {
    return expense?.isSplit !== false;
}

function getExpenseAmount(expense) {
    const amount = expense?.amount;
    return amount !== null && amount !== undefined ? amount : 0;
}

function sanitizeCalcExpression(expr) {
    return String(expr || '').replace(/[^0-9+\-*/().]/g, '');
}

window.sanitizeCalcInput = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = sanitizeCalcExpression(input.value);
};

window.calcAppend = (value) => {
    const input = document.getElementById('exp-calc');
    if (!input) return;
    input.value += value;
};

window.calcClear = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = '';
};

window.calcBackspace = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = input.value.slice(0, -1);
};

window.calcEvaluate = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const expr = sanitizeCalcExpression(input.value).trim();
    if (!expr) return;
    try {
        const result = Function(`"use strict"; return (${expr});`)();
        if (Number.isFinite(result)) {
            input.value = String(Math.round(result));
        }
    } catch (error) {
        alert('計算式を確認してください。');
    }
};

window.applyCalcToAmount = () => {
    const calcInput = document.getElementById('exp-calc');
    const amountInput = document.getElementById('exp-amount');
    if (!calcInput || !amountInput) return;
    const expr = sanitizeCalcExpression(calcInput.value).trim();
    if (!expr) {
        amountInput.value = '';
        return;
    }
    let result = Number(expr);
    if (!Number.isFinite(result)) {
        try {
            result = Function(`"use strict"; return (${expr});`)();
        } catch (error) {
            alert('計算式を確認してください。');
            return;
        }
    }
    if (Number.isFinite(result)) {
        amountInput.value = String(Math.round(result));
    }
};
