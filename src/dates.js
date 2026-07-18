// Локальные дата и время. НЕ использовать toISOString() для дат/времени интерфейса:
// он отдаёт UTC — время записей уезжало на −3 часа (жалоба Кристи 2026-07-18),
// а «сегодня» с 00:00 до 03:00 по местному считалось бы вчерашним днём.
export const localDate = (d = new Date()) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const localHM = (t) => t ? new Date(t).toTimeString().slice(0, 5) : '';
