'use strict';

/* ============================================================
   1RM Lab — app.js
   Логика калькулятора одноповторного максимума
   ============================================================ */

// ---------- Ключ для localStorage ----------
const STORAGE_KEY = '1rm_lab_history';

// ---------- Формулы расчёта 1ПМ ----------
// Каждая принимает (вес, повторы) и возвращает число
const FORMULAS = {
    epley:   (w, r) => w * (1 + r / 30),
    brzycki: (w, r) => w * 36 / (37 - r),
    lombardi:(w, r) => w * Math.pow(r, 0.10),
    oconner: (w, r) => w * (1 + r / 40),
};

// Человекочитаемые названия формул
const FORMULA_NAMES = {
    epley: 'Epley',
    brzycki: 'Brzycki',
    lombardi: 'Lombardi',
    oconner: "O'Conner",
};

// ---------- Коэффициенты RPE ----------
// Чем ниже RPE (были в запасе повторы), тем выше расчётный 1ПМ.
// Множитель применяется к результату формулы.
const RPE_FACTORS = {
    '10': 1.000,
    '9.5': 1.012,
    '9': 1.025,
    '8.5': 1.038,
    '8': 1.052,
    '7.5': 1.066,
    '7': 1.080,
    '6': 1.110,
};

// ---------- Проценты для рабочих весов ----------
const PERCENT_STEPS = [95, 90, 85, 80, 75, 70, 65, 60];

// ---------- Ссылки на элементы DOM ----------
const $ = (id) => document.getElementById(id);

const els = {
    form:          $('calc-form'),
    exercise:      $('exercise'),
    weight:        $('weight'),
    reps:          $('reps'),
    rpe:           $('rpe'),
    formula:       $('formula'),
    resultCard:    $('result-card'),
    resultValue:   $('result-value'),
    resultFormula: $('result-formula'),
    percentages:   $('percentages'),
    historyList:   $('history-list'),
    historyCount:  $('history-count'),
    emptyState:    $('empty-state'),
    exportBtn:     $('export-btn'),
    clearBtn:      $('clear-btn'),
    infoBtn:       $('info-btn'),
    infoModal:     $('info-modal'),
    closeModal:    $('close-modal'),
    toast:         $('toast'),
    toastMsg:      $('toast-msg'),
    toastIcon:     $('toast-icon'),
};

// ---------- Состояние ----------
let history = [];       // массив записей
let lastResult = null;  // последний расчёт (для сохранения)

/* ============================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ============================================================ */

// ---------- Округление до 0.5 кг ----------
function roundHalf(num) {
    return Math.round(num * 2) / 2;
}

// ---------- Форматирование числа (убираем .0) ----------
function fmt(num) {
    const r = roundHalf(num);
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// ---------- Форматирование даты ----------
function formatDate(ts) {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const hrs = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${mon} ${hrs}:${min}`;
}

// ---------- Генерация уникального ID ----------
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Экранирование HTML (защита от XSS) ----------
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ============================================================
   TOAST-УВЕДОМЛЕНИЯ
   ============================================================ */

let toastTimer = null;

function showToast(message, type = 'success') {
    if (!els.toast) return;

    els.toastMsg.textContent = message;

    // Меняем иконку и цвет по типу
    const icons = {
        success: 'fa-check text-emerald-400',
        error:   'fa-triangle-exclamation text-red-400',
        info:    'fa-circle-info text-blue-400',
    };
    els.toastIcon.className = 'fa-solid ' + (icons[type] || icons.success);

    // Показываем
    els.toast.classList.remove('hidden');
    els.toast.classList.add('fade-in-up');

    // Автоскрытие через 2.5 сек
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        els.toast.classList.add('hidden');
    }, 2500);
}

/* ============================================================
   РАСЧЁТ 1ПМ
   ============================================================ */

function calculate1RM(weight, reps, rpe, formulaKey) {
    // 1 повтор = вес и есть максимум (с учётом RPE)
    const base = FORMULAS[formulaKey](weight, reps);
    const rpeFactor = RPE_FACTORS[String(rpe)] || 1;
    return base * rpeFactor;
}

// ---------- Валидация ввода ----------
function validateInput(weight, reps) {
    if (!weight || weight <= 0) {
        showToast('Введите корректный вес', 'error');
        return false;
    }
    if (!reps || reps < 1) {
        showToast('Введите число повторений', 'error');
        return false;
    }
    if (reps > 30) {
        showToast('Максимум 30 повторений', 'error');
        return false;
    }
    return true;
}

/* ============================================================
   ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА
   ============================================================ */

function renderResult(oneRM, formulaKey) {
    // Показываем карточку
    els.resultCard.classList.remove('hidden');
    els.resultCard.classList.add('fade-in-up');

    // Значение 1ПМ
    els.resultValue.textContent = fmt(oneRM);
    els.resultFormula.textContent = 'по формуле ' + (FORMULA_NAMES[formulaKey] || formulaKey);

    // Проценты (рабочие веса)
    els.percentages.innerHTML = PERCENT_STEPS.map(pct => {
        const w = fmt(oneRM * pct / 100);
        return `
            <div class="bg-zinc-800/50 rounded-lg py-2 px-1">
                <div class="text-xs text-emerald-400 font-semibold">${pct}%</div>
                <div class="text-sm font-bold text-white">${w}</div>
            </div>
        `;
    }).join('');

    // Прокрутка к результату
    els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   РАБОТА С localStorage
   ============================================================ */

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        history = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(history)) history = [];
    } catch (e) {
        console.warn('Ошибка чтения истории:', e);
        history = [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('Ошибка сохранения истории:', e);
        showToast('Не удалось сохранить', 'error');
    }
}

/* ============================================================
   РЕНДЕР ИСТОРИИ
   ============================================================ */

function renderHistory() {
    // Счётчик
    els.historyCount.textContent = history.length;

    // Пустое состояние
    if (history.length === 0) {
        els.emptyState.classList.remove('hidden');
        els.historyList.innerHTML = '';
        els.exportBtn.disabled = true;
        els.exportBtn.classList.add('opacity-40', 'cursor-not-allowed');
        return;
    }

    els.emptyState.classList.add('hidden');
    els.exportBtn.disabled = false;
    els.exportBtn.classList.remove('opacity-40', 'cursor-not-allowed');

    // Рендерим карточки (новые сверху)
    els.historyList.innerHTML = history.map(item => `
        <div class="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4
                    flex items-center justify-between gap-3 fade-in-up">
            <div class="min-w-0 flex-1">
                <p class="font-semibold text-white truncate">
                    ${escapeHtml(item.exercise || 'Упражнение')}
                </p>
                <p class="text-xs text-zinc-500 mt-0.5">
                    ${fmt(item.weight)} кг × ${item.reps} · RPE ${item.rpe}
                    · <span class="text-zinc-600">${FORMULA_NAMES[item.formula] || item.formula}</span>
                </p>
                <p class="text-[10px] text-zinc-600 mt-1">
                    <i class="fa-regular fa-clock"></i> ${formatDate(item.date)}
                </p>
            </div>

            <div class="text-right shrink-0">
                <div class="text-2xl font-extrabold text-emerald-400">${fmt(item.oneRM)}</div>
                <div class="text-[10px] text-zinc-500 -mt-1">кг 1ПМ</div>
            </div>

            <button data-id="${item.id}"
                    class="delete-item w-8 h-8 rounded-lg bg-zinc-800 shrink-0
                           flex items-center justify-center text-zinc-500
                           hover:text-red-400 hover:bg-red-500/10">
                <i class="fa-solid fa-xmark text-sm"></i>
            </button>
        </div>
    `).join('');

    // Навешиваем удаление на каждую кнопку
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id));
    });
}

/* ============================================================
   ДОБАВЛЕНИЕ / УДАЛЕНИЕ ЗАПИСЕЙ
   ============================================================ */

function addToHistory(record) {
    history.unshift(record);          // новая запись — в начало
    if (history.length > 50) {         // лимит 50 записей
        history = history.slice(0, 50);
    }
    saveHistory();
    renderHistory();
}

function deleteItem(id) {
    history = history.filter(item => item.id !== id);
    saveHistory();
    renderHistory();
    showToast('Запись удалена', 'info');
}

function clearHistory() {
    if (history.length === 0) return;
    if (!confirm('Удалить всю историю тренировок?')) return;
    history = [];
    saveHistory();
    renderHistory();
    showToast('История очищена', 'info');
}

/* ============================================================
   ЭКСПОРТ В PDF (jsPDF)
   ============================================================ */

function exportPDF() {
    if (history.length === 0) {
        showToast('История пуста', 'error');
        return;
    }

    // jsPDF подключается через CDN → window.jspdf
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('PDF-библиотека не загружена', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Заголовок ---
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // emerald
    doc.text('1RM Lab — Journal', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Exported: ' + formatDate(Date.now()), 14, 27);

    // --- Линия ---
    doc.setDrawColor(200);
    doc.line(14, 31, 196, 31);

    // --- Шапка таблицы ---
    let y = 40;
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text('Exercise', 14, y);
    doc.text('Weight x Reps', 80, y);
    doc.text('RPE', 130, y);
    doc.text('1RM', 160, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 7;

    // --- Строки ---
    doc.setTextColor(40);
    history.forEach(item => {
        if (y > 280) {            // новая страница
            doc.addPage();
            y = 20;
        }
        const ex = (item.exercise || 'Exercise').slice(0, 30);
        doc.text(ex, 14, y);
        doc.text(`${fmt(item.weight)} kg x ${item.reps}`, 80, y);
        doc.text(String(item.rpe), 130, y);

        doc.setTextColor(16, 185, 129);
        doc.text(`${fmt(item.oneRM)} kg`, 160, y);
        doc.setTextColor(40);

        y += 8;
    });

    // --- Сохранение ---
    doc.save('1rm-lab-journal.pdf');
    showToast('PDF сохранён', 'success');
}

/* ============================================================
   ОБРАБОТЧИКИ СОБЫТИЙ
   ============================================================ */

function handleSubmit(e) {
    e.preventDefault();

    const weight  = parseFloat(els.weight.value);
    const reps    = parseInt(els.reps.value, 10);
    const rpe     = els.rpe.value;
    const formula = els.formula.value;
    const exercise = els.exercise.value.trim() || 'Упражнение';

    // Валидация
    if (!validateInput(weight, reps)) return;

    // Расчёт
    const oneRM = calculate1RM(weight, reps, rpe, formula);

    // Показ результата
    renderResult(oneRM, formula);

    // Сохраняем в историю
    const record = {
        id: genId(),
        exercise,
        weight,
        reps,
        rpe,
        formula,
        oneRM,
        date: Date.now(),
    };
    addToHistory(record);

    showToast('Расчёт добавлен в историю', 'success');
}

// ---------- Модальное окно «Инфо» ----------
function openModal() {
    els.infoModal.classList.remove('hidden');
    els.infoModal.classList.add('flex');
}

function closeModalFn() {
    els.infoModal.classList.add('hidden');
    els.infoModal.classList.remove('flex');
}

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */

function init() {
    // Загружаем историю из localStorage
    loadHistory();
    renderHistory();

    // Форма расчёта
    if (els.form) {
        els.form.addEventListener('submit', handleSubmit);
    }

    // Кнопки
    if (els.exportBtn) els.exportBtn.addEventListener('click', exportPDF);
    if (els.clearBtn)  els.clearBtn.addEventListener('click', clearHistory);

    // Модалка
    if (els.infoBtn)    els.infoBtn.addEventListener('click', openModal);
    if (els.closeModal) els.closeModal.addEventListener('click', closeModalFn);
    if (els.infoModal) {
        // Закрытие по клику на фон
        els.infoModal.addEventListener('click', (e) => {
            if (e.target === els.infoModal) closeModalFn();
        });
    }

    // Закрытие модалки по Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModalFn();
    });

    console.log('✅ 1RM Lab запущен');
}

// ---------- Запуск после загрузки DOM ----------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
