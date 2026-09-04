// Распределение списания с депозита по составу заказа — общий модуль для компьютера и телефона.
//
// Зачем: в задаче состав расписан («Печать 9 130 · Дизайн 2 000»), а списание с депозита
// уходило одной строкой на всю сумму — в депозите и в оплатах задачи не было видно,
// что во что ушло (замечание сотрудницы 2026-09-03, случай «35 грамот минпром» −11 130 ₽).
// Теперь на каждую часть состава пишется своя строка списания и своя оплата.
//
// Правила распределения:
//   • части берутся из tasks.parts ([{name, amount}]);
//   • если списывают всю сумму состава — суммы частей идут как есть;
//   • если сумму уменьшили (частичное списание) — части ужимаются пропорционально,
//     а остаток от округления добавляется к самой крупной части, чтобы итог сходился копейка в копейку.

// Общий чек разбитого списания. crypto.randomUUID есть только на HTTPS, а вход по IP пока http —
// поэтому свой генератор валидного UUID v4 (тот же приём, что в EntryForm).
export const newBatchId = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// Состав задачи, пригодный для списания: только именованные части с положительной суммой
export const taskParts = (task) => (task?.parts || [])
  .filter(p => p && +p.amount > 0)
  .map(p => ({ name: (p.name || '').trim() || 'Без названия', amount: +p.amount }));

export const partsTotal = (parts) => parts.reduce((s, p) => s + (+p.amount || 0), 0);

// Ужать части под нужную сумму. Возвращает [{name, amount}] с суммой ровно total.
export function spreadParts(parts, total) {
  const src = taskParts({ parts });
  const base = partsTotal(src);
  if (!src.length || !(total > 0)) return [];
  if (!base) return [];

  const scaled = src.map(p => ({ name: p.name, amount: Math.round((p.amount / base) * total) }));
  // Округление могло увести итог на рубль-другой — правим самую крупную часть
  const diff = total - partsTotal(scaled);
  if (diff !== 0) {
    let big = 0;
    scaled.forEach((p, i) => { if (p.amount > scaled[big].amount) big = i; });
    scaled[big] = { ...scaled[big], amount: scaled[big].amount + diff };
  }
  return scaled.filter(p => p.amount > 0);
}

// Строки списания для db.addDepositUse (имя без приставки use — иначе линтер считает это React-хуком): к названию части добавляем «что списываем»,
// чтобы в карточке депозита строка читалась сама по себе («35 грамот минпром · Печать»).
export const depositUseRows = (what, parts) => parts.map(p => ({
  what: what ? `${what} · ${p.name}` : p.name,
  amount: p.amount,
  part: p.name,
}));

// Название части состава из комментария депозитного списания:
// «с депозита «Минпром» · Печать» → «Печать». Если части нет — null.
// Хвост с кавычкой отбрасываем: это конец названия депозита («Школа · филиал»), а не часть состава.
export const partFromComment = (comment) => {
  const m = /·\s*([^·»]+)\s*$/.exec(comment || '');
  const tail = m && m[1].trim();
  return tail && !tail.includes('«') ? tail : null;
};
