// Деньги по задаче — в одном месте: до 2026-08-13 формула «оплачено/долг» была скопирована
// в Финансы, Задачи, Клиентов и Дашборд, и правку возвратов пришлось бы делать четыре раза.
//
// Оплачено = приходы по задаче − возвраты клиенту (расход, привязанный к задаче).
// Возвратом считается ЛЮБОЙ расход с task_id: других расходов к задаче не привязывают
// (закупка под заказ живёт в contractor_tasks), см. миграцию 023.
//
// hidden_* — строки вне RLS-окна сотрудницы (7 дней, 016): их отдаёт функция task_payment_rows
// (018 → 021 → 023), иначе оплаты и возвраты старше недели «слетали» бы и долг возвращался.
//
// Отказ клиента (tasks.cancelled, 023): заказа больше нет — к оплате 0, долга нет.
// Сумму заказа при отказе не трогаем (решение Кристи 2026-08-13).

const sum = (rows) => rows.reduce((s, x) => s + (+x.amount || 0), 0);

export const taskIncomeRows = (transactions, taskId) =>
  transactions.filter(x => x.task_id === taskId && x.type === 'income');
export const taskRefundRows = (transactions, taskId) =>
  transactions.filter(x => x.task_id === taskId && x.type === 'expense');

// Возвращено клиенту по задаче (видимые строки + скрытые от сотрудницы)
export const refundOfTask = (transactions, t) =>
  (t.hidden_refund || 0) + sum(taskRefundRows(transactions, t.id));

// Оплачено по задаче: приходы минус возвраты
export const paidOfTask = (transactions, t) =>
  (t.hidden_paid || 0) + sum(taskIncomeRows(transactions, t.id)) - refundOfTask(transactions, t);

// Долг клиента. Отказ — долга нет: заказа больше не существует
export const debtOfTask = (transactions, t) =>
  t.cancelled ? 0 : (t.amount || 0) - paidOfTask(transactions, t);

// Отказ оформлен, а деньги клиенту ещё не вернули — сколько должны ему мы
export const owedToClient = (transactions, t) =>
  t.cancelled ? Math.max(0, paidOfTask(transactions, t)) : 0;

// ---------- Деньги по клиенту ----------
// Считаются через его задачи: оплаты приходят с task_id (или client_id, если задачи ещё нет).

export const clientTasks = (tasks, clientId) => tasks.filter(t => t.client_id === clientId);

export const clientPayments = (transactions, tasks, clientId) => {
  const ids = new Set(clientTasks(tasks, clientId).map(t => t.id));
  return transactions.filter(t => t.type === 'income' && (t.client_id === clientId || ids.has(t.task_id)));
};

// Возвраты клиенту — расходы, привязанные к его задачам (2026-08-13)
export const clientRefunds = (transactions, tasks, clientId) => {
  const ids = new Set(clientTasks(tasks, clientId).map(t => t.id));
  return transactions.filter(t => t.type === 'expense' && ids.has(t.task_id));
};

// Долг клиента = сумма непогашенных долгов по его задачам (отказные долга не дают)
export const clientDebt = (transactions, tasks, clientId) =>
  clientTasks(tasks, clientId).reduce((s, t) => s + Math.max(0, debtOfTask(transactions, t)), 0);

// «Оплатил всего» — за вычетом возвращённого: отказавшийся клиент не числится плательщиком
export const clientPaidTotal = (transactions, tasks, clientId) =>
  sum(clientPayments(transactions, tasks, clientId))
  - sum(clientRefunds(transactions, tasks, clientId))
  + clientTasks(tasks, clientId).reduce((s, t) => s + (t.hidden_paid || 0) - (t.hidden_refund || 0), 0);

// Категория-возврат: по ней форма расхода показывает привязку к задаче.
// По названию, а не по id: категории Кристи заводит сама в Настройках
// («Возврат», «Возврат клиенту», «Возвраты по браку» — все подходят).
export const isRefundCat = (cat) => !!cat && /^возврат/i.test((cat.name || '').trim());
