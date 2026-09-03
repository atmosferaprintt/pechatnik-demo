// Итоги месяца для Аналитики — общий модуль для компьютера и телефона.
// Цифры обязаны совпадать на обоих экранах, поэтому все правила живут здесь:
//   • доходы — без оплат «Депозитом» (деньги пришли при внесении депозита);
//   • разницы смен идут в выручку (решение Кристи 2026-07-17): плюс — в плюс, минус — в минус;
//   • личные расходы Кристи не входят ни в расходы бизнеса, ни в прибыль (решение 2026-07-14).
// Excel-выгрузка тоже здесь — структура «категории × дни месяца», как в старой таблице Кристи.

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

export const monthLabel = (month) => `${MONTHS[+month.slice(5) - 1]} ${month.slice(0, 4)}`;

// Сдвиг месяца 'YYYY-MM' на dir месяцев
export const shiftMonth = (month, dir) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Ключи способов оплаты и их подписи — цвета задаёт та версия, которая рисует
export const METHOD_LABELS = { cash: 'Наличные', sbp: 'СБП', transfer: 'Переводы', card: 'Карта', bank: 'Безнал' };

export function monthStats({ transactions, categories, dayClosures, month }) {
  const monthTx = transactions.filter(t => t.op_date?.startsWith(month));
  const kindOf = (t) => categories.find(c => c.id === t.category_id)?.kind;

  const incomeTx = monthTx.filter(t => t.type === 'income' && t.payment_method !== 'deposit');
  const opIncome = incomeTx.reduce((s, t) => s + t.amount, 0);
  const diffSum = dayClosures.filter(c => c.date?.startsWith(month)).reduce((s, c) => s + (c.diff || 0), 0);
  const income = opIncome + diffSum;
  const personalTotal = monthTx.filter(t => t.type === 'expense' && kindOf(t) === 'expense_personal').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense' && kindOf(t) !== 'expense_personal').reduce((s, t) => s + t.amount, 0);
  const profit = income - expense;

  const expCatSum = (c) => monthTx.filter(t => t.type === 'expense' && t.category_id === c.id).reduce((s, t) => s + t.amount, 0);
  const workBreak = categories.filter(c => c.kind === 'expense_shared' || c.kind === 'expense_work')
    .map(c => ({ name: c.name, big: c.kind === 'expense_work', v: expCatSum(c) }))
    .filter(c => c.v > 0).sort((a, b) => b.v - a.v);
  const persBreak = categories.filter(c => c.kind === 'expense_personal')
    .map(c => ({ name: c.name, v: expCatSum(c) }))
    .filter(c => c.v > 0).sort((a, b) => b.v - a.v);

  const cats = categories.filter(c => c.kind === 'income')
    .map(c => ({ name: c.name, v: incomeTx.filter(t => t.category_id === c.id).reduce((s, t) => s + t.amount, 0) }))
    .filter(c => c.v > 0).sort((a, b) => b.v - a.v);

  const methods = Object.entries(METHOD_LABELS).map(([key, name]) => ({
    key, name, sum: incomeTx.filter(t => t.payment_method === key).reduce((s, t) => s + t.amount, 0),
  })).filter(m => m.sum > 0).map(m => ({ ...m, v: income ? Math.round((m.sum / income) * 100) : 0 }));

  const staff = [...new Set(incomeTx.map(t => t.created_by))]
    .map(name => ({ name, v: incomeTx.filter(t => t.created_by === name).reduce((s, t) => s + t.amount, 0) }))
    .sort((a, b) => b.v - a.v);

  return { monthTx, incomeTx, opIncome, diffSum, income, expense, personalTotal, profit, cats, workBreak, persBreak, methods, staff };
}

// Excel за месяц: строки — категории, столбцы — дни. Библиотека xlsx весит 95 КБ в сжатом виде,
// поэтому подгружается по нажатию, а не при каждом входе (важно на медленном интернете и через VPN).
export async function exportMonthExcel({ month, transactions, categories, dayClosures }) {
  const XLSX = await import('xlsx');
  const { monthTx, incomeTx, income } = monthStats({ transactions, categories, dayClosures, month });
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cell = (catId, type, day) => monthTx
    .filter(t => t.category_id === catId && t.type === type && +t.op_date.slice(8, 10) === day)
    .reduce((s, t) => s + t.amount, 0) || '';
  const catTotal = (c) => monthTx.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const rows = [];
  rows.push(['ДОХОД ОБЩИЙ', income, ...days.map(() => '')]);
  for (const c of categories.filter(c => c.kind === 'income')) {
    const total = incomeTx.filter(t => t.category_id === c.id).reduce((s, t) => s + t.amount, 0);
    rows.push([c.name, total || '', ...days.map(d => cell(c.id, 'income', d))]);
  }

  // Расходы бизнеса и личные — отдельными блоками, как в таблице Кристи
  const personalCats = categories.filter(c => c.kind === 'expense_personal');
  const workCats = categories.filter(c => c.kind === 'expense_shared' || c.kind === 'expense_work');

  rows.push([]);
  rows.push(['РАСХОД ОБЩИЙ', workCats.reduce((s, c) => s + catTotal(c), 0), ...days.map(() => '')]);
  for (const c of workCats) rows.push([c.name, catTotal(c) || '', ...days.map(d => cell(c.id, 'expense', d))]);

  rows.push([]);
  rows.push(['ЛИЧНЫЕ', personalCats.reduce((s, c) => s + catTotal(c), 0), ...days.map(() => '')]);
  for (const c of personalCats) rows.push([c.name, catTotal(c) || '', ...days.map(d => cell(c.id, 'expense', d))]);

  const ws = XLSX.utils.aoa_to_sheet([['Категория', 'Итого', ...days], ...rows]);
  ws['!cols'] = [{ wch: 24 }, { wch: 10 }, ...days.map(() => ({ wch: 7 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, MONTHS[m - 1]);
  XLSX.writeFile(wb, `ПЕЧАТНИК-${MONTHS[m - 1]}-${y}.xlsx`);
}
