// Деньги за день — в одном месте, как taskMoney.js для денег по задаче.
//
// До 2026-08-14 расчёт кассы дня был скопирован дважды внутри Finance.jsx (у сотрудницы
// и у владельца) и ещё раз, по-своему, в Dashboard.jsx. Мобильная версия стала бы
// четвёртой копией — и телефон Кристи начал бы показывать не ту же кассу, что компьютер.
//
// Правила (решения Кристи 2026-07-15), из-за которых расходы делятся на три сорта:
//  - expense_shared — операционка девочек (доставка, возврат, другое): входит в день и в кассу
//  - expense_work   — крупные рабочие (бумага, тонер, поставщики): отдельной карточкой,
//                     в день и кассу НЕ входят, иначе сверка уходит в минус
//  - expense_personal — личные Кристи: полностью отдельно от бизнеса
//
// Оплаты «Депозитом» не доход дня: деньги пришли раньше, когда депозит вносили.

const sum = (rows) => rows.reduce((s, t) => s + (+t.amount || 0), 0);

export const kindOfTx = (categories, t) => categories.find(c => c.id === t.category_id)?.kind;
export const isPersonalTx = (categories, t) => kindOfTx(categories, t) === 'expense_personal';
export const isBigWorkTx = (categories, t) => t.type === 'expense' && kindOfTx(categories, t) === 'expense_work';

// Лента дня — новые сверху (id как запасной ключ: время может совпасть у разбитой оплаты)
export const sortNewFirst = (rows) =>
  [...rows].sort((a, b) => (b.time || '').localeCompare(a.time || '') || b.id - a.id);

// Переходящий остаток: что осталось в кассе после прошлого закрытия (факт минус сданное Кристи)
export function carryOf(dayClosures, date) {
  const last = dayClosures.filter(c => c.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return last ? last.cash_fact - (last.cash_taken || 0) : 0;
}

// Всё про выбранный день одним вызовом.
export function dayMoney({ transactions, categories, dayClosures = [], date }) {
  const dayTx = transactions.filter(t => t.op_date === date);

  const dailyTx = sortNewFirst(dayTx.filter(t => !isPersonalTx(categories, t) && !isBigWorkTx(categories, t)));
  const bigTx = dayTx.filter(t => isBigWorkTx(categories, t));
  const personalTx = dayTx.filter(t => isPersonalTx(categories, t));

  const cashIn = sum(dailyTx.filter(t => t.type === 'income' && t.payment_method === 'cash'));
  const cashOut = sum(dailyTx.filter(t => t.type === 'expense' && t.payment_method === 'cash'));
  const carry = carryOf(dayClosures, date);

  return {
    dayTx,            // всё за день, включая личные и крупные — для сверки с банком и разбивки по картам
    dailyTx,          // операционка дня: лента и касса
    bigTx, bigTotal: sum(bigTx),
    personalTx, personalTotal: sum(personalTx),
    income: sum(dailyTx.filter(t => t.type === 'income' && t.payment_method !== 'deposit')),
    expense: sum(dailyTx.filter(t => t.type === 'expense')),
    cashIn, cashOut, carry,
    cashFlow: cashIn - cashOut,   // «наличными за день» ± в карточке закрытия смены
    cashCalc: carry + cashIn - cashOut,
    closure: dayClosures.find(c => c.date === date) || null,
  };
}
