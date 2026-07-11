// ============================================================
//  1RM Lab — Основной скрипт приложения
//  Разработчик: Alex Lashkin · 2026
// ============================================================

// ============ КОНСТАНТЫ ============
const STORAGE_KEY = '1rm-lab-history';

// ============ ФОРМУЛЫ РАСЧЁТА 1RM ============
const FORMULAS = {
    epley:     (w, r) => w * (1 + r / 30),
    brzycki:   (w, r) => w * (36 / (37 - r)),
    lombardi:  (w, r) => w * Math.pow(r, 0.10),
    oconner:   (w, r) => w * (1 + 0.025 * r)
};

// ============ РАСЧЁТ 1RM ============
function calculate1RM(weight, reps, rpe = 10, formula = 'epley') {
    weight = parseFloat(weight);
    reps = parseInt(reps);
    rpe = parseFloat(rpe) || 10;

    if (!weight || !reps || weight <= 0 || reps <= 0) return 0;

    // Поправка на RPE (если не до отказа — добавляем "виртуальные" повторы)
    const rpeAdjust = 10 - rpe;
    const effectiveReps = reps + rpeAdjust;

    // Если 1 повтор при RPE 10 — это и есть 1ПМ
    if (effectiveReps <= 1) return Math.round(weight);

    const fn = FORMULAS[formula] || FORMULAS.epley;
    const result = fn(weight, effectiveReps);

    return Math.round(result);
}

// ============ РАБОТА С ИСТОРИЕЙ ============
function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Ошибка чтения истории:', e);
        return [];
    }
}

function saveToHistory(record) {
    const history = getHistory();
    history.unshift(record);
    // Ограничиваем историю 100 записями
    if (history.length > 100) history.length = 100;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('История очищена', 'trash', 'text-red-400');
}

// ============ ТРАНСЛИТЕРАЦИЯ (RU → EN) — запасной вариант ============
// Больше не используется в PDF (там теперь кириллический шрифт Roboto),
// но оставлена как fallback на случай отсутствия шрифта.
function translit(text) {
    const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh',
        'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
        'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
        'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
        'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'Zh',
        'З':'Z','И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O',
        'П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'H','Ц':'Ts',
        'Ч':'Ch','Ш':'Sh','Щ':'Sch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
    };
    return String(text).split('').map((ch) => (ch in map ? map[ch] : ch)).join('');
}

// ============ TOAST-УВЕДОМЛЕНИЯ ============
function showToast(message, icon = 'circle-check', color = 'text-emerald-400') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 ' +
        'bg-zinc-800 border border-zinc-700 px-5 py-3 rounded-xl shadow-lg ' +
        'transition-all duration-300 opacity-0 translate-y-4';
    toast.innerHTML =
        '<i class="fa-solid fa-' + icon + ' ' + color + '"></i>' +
        '<span class="text-sm text-zinc-100">' + message + '</span>';

    document.body.appendChild(toast);

    // Плавное появление
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-4');
    });

    // Автоскрытие
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ============ ОБРАБОТКА ФОРМЫ РАСЧЁТА ============
function handleCalculate(e) {
    if (e) e.preventDefault();

    const exercise = document.getElementById('exercise').value.trim() || 'Упражнение';
    const weight = document.getElementById('weight').value;
    const reps = document.getElementById('reps').value;
    const rpe = document.getElementById('rpe')?.value || 10;
    const formula = document.getElementById('formula')?.value || 'epley';

    const oneRM = calculate1RM(weight, reps, rpe, formula);

    if (oneRM === 0) {
        showToast('Введите корректные данные', 'circle-info', 'text-amber-400');
        return;
    }

    // Показываем результат
    const resultEl = document.getElementById('result');
    if (resultEl) {
        resultEl.textContent = oneRM + ' кг';
        resultEl.classList.add('animate-pulse');
        setTimeout(() => resultEl.classList.remove('animate-pulse'), 600);
    }

    // Сохраняем в историю
    saveToHistory({
        exercise: exercise,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rpe: parseFloat(rpe),
        formula: formula,
        oneRM: oneRM,
        date: new Date().toISOString()
    });

    renderHistory();
    showToast('1ПМ: ' + oneRM + ' кг', 'dumbbell', 'text-emerald-400');
}

// ============ ОТРИСОВКА ИСТОРИИ ============
function renderHistory() {
    const container = document.getElementById('history');
    if (!container) return;

    const history = getHistory();

    if (history.length === 0) {
        container.innerHTML =
            '<p class="text-center text-zinc-500 text-sm py-6">' +
            '<i class="fa-solid fa-inbox mr-2"></i>История пуста</p>';
        return;
    }

    container.innerHTML = history.map((item) => {
        const date = new Date(item.date).toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        return (
            '<div class="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 ' +
            'rounded-lg px-4 py-3 hover:border-emerald-500/40 transition">' +
                '<div>' +
                    '<p class="text-sm font-medium text-zinc-100">' + item.exercise + '</p>' +
                    '<p class="text-xs text-zinc-500">' +
                        item.weight + ' кг × ' + item.reps + ' · RPE ' + item.rpe + ' · ' + date +
                    '</p>' +
                '</div>' +
                '<span class="text-emerald-400 font-bold text-lg">' + item.oneRM + ' кг</span>' +
            '</div>'
        );
    }).join('');
}

// ============ ЭКСПОРТ В PDF (КИРИЛЛИЦА через Roboto) ============
function exportPDF() {
    const history = getHistory();

    if (history.length === 0) {
        showToast('Нет данных для экспорта', 'circle-info', 'text-zinc-400');
        return;
    }

    // Проверка: загружена ли библиотека jsPDF
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('Библиотека PDF не загружена', 'triangle-exclamation', 'text-red-400');
        console.error('jsPDF не найден. Проверьте подключение скрипта в <head>.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // ✅ Пытаемся включить кириллический шрифт Roboto.
        //    Если roboto-font.js не подключён — работаем на Helvetica
        //    и транслитерируем текст (fallback), чтобы не было кракозябр.
        let useCyrillic = false;
        try {
            const fonts = doc.getFontList();
            if (fonts && fonts.Roboto) {
                doc.setFont('Roboto', 'normal');
                useCyrillic = true;
            } else {
                console.warn('Шрифт Roboto не подключён — используется Helvetica + транслитерация.');
            }
        } catch (e) {
            console.warn('Не удалось установить Roboto:', e);
        }

        // Хелпер: если кириллица доступна — оставляем как есть, иначе транслит
        const T = (str) => (useCyrillic ? String(str) : translit(str));

        // --- Заголовок ---
        doc.setFontSize(20);
        doc.setTextColor(34, 197, 94);
        doc.text(T('1RM Lab — Отчёт'), 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text(T('Создано: ' + new Date().toLocaleDateString('ru-RU')), 14, 27);

        // --- Шапка таблицы ---
        let y = 40;
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text(T('Упражнение'), 14, y);
        doc.text(T('Вес'), 95, y);
        doc.text(T('Повт'), 118, y);
        doc.text('RPE', 140, y);
        doc.text(T('1ПМ'), 168, y);
        doc.setDrawColor(200);
        doc.line(14, y + 2, 196, y + 2);
        y += 9;

        // --- Строки таблицы ---
        history.forEach((item) => {
            // Новая страница при переполнении
            if (y > 275) {
                doc.addPage();
                if (useCyrillic) doc.setFont('Roboto', 'normal'); // шрифт на новой странице
                y = 20;
            }

            const d = new Date(item.date).toLocaleDateString('ru-RU');

            // ✅ Русский текст напрямую (или транслит — как fallback)
            let name = String(item.exercise || 'Упражнение');
            if (name.length > 30) name = name.slice(0, 30) + '...';

            doc.setTextColor(30);
            doc.setFontSize(9);
            doc.text(T(name + ' (' + d + ')'), 14, y);
            doc.text(String(item.weight), 95, y);
            doc.text(String(item.reps), 118, y);
            doc.text(String(item.rpe), 140, y);

            doc.setTextColor(34, 197, 94);
            doc.text(T(String(item.oneRM) + ' кг'), 168, y);

            y += 8;
        });

        // --- Подпись внизу ---
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(T('Alex Lashkin — 2026 — 1RM Lab'), 14, 290);

        // --- Сохранение ---
        doc.save('1RM-Lab-' + Date.now() + '.pdf');
        showToast('PDF сохранён!', 'file-pdf', 'text-emerald-400');

    } catch (err) {
        console.error('Ошибка генерации PDF:', err);
        showToast('Ошибка создания PDF', 'triangle-exclamation', 'text-red-400');
    }
}

// ============ РЕГИСТРАЦИЯ SERVICE WORKER ============
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => {
                    console.log('SW: зарегистрирован ✅', reg.scope);
                })
                .catch((err) => {
                    console.error('SW: ошибка регистрации', err);
                });
        });
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
document.addEventListener('DOMContentLoaded', () => {

    // Форма расчёта
    const form = document.getElementById('calc-form');
    if (form) {
        form.addEventListener('submit', handleCalculate);
    }

    // Кнопка расчёта (если без формы)
    const calcBtn = document.getElementById('calc-btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', handleCalculate);
    }

    // Кнопка экспорта PDF
    const pdfBtn = document.getElementById('export-pdf');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportPDF);
    }

    // Кнопка очистки истории
    const clearBtn = document.getElementById('clear-history');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Очистить всю историю?')) clearHistory();
        });
    }

    // Первичная отрисовка
    renderHistory();

    // Регистрация Service Worker
    registerServiceWorker();

    console.log('1RM Lab готов к работе 💪');
});
