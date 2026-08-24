// Статус задачи: горит ли срок и какими отметками отмечают работу.
// Общий для компьютера и телефона — правило «не тревожить готовое» должно быть одинаковым.
import { localDate } from './dates.js';

const TODAY = localDate();
const TOMORROW = localDate(new Date(Date.now() + 86400000));

// Быстрые отметки действий на задаче
export const ACTION_PRESETS = ['приняла', 'подготовила к печати', 'распечатала', 'постпечатка', 'готово к выдаче'];

// overdue — срок прошёл, soon — сегодня/завтра, ok — спокойно.
// Не тревожим завершённые и те, где последняя отметка «готово к выдаче»:
// работа сделана, ждём клиента (мигание отключено навсегда — просьба Кристи 2026-07-15).
export function deadlineStatus(t) {
  const last = t.log?.length ? t.log[t.log.length - 1].action : '';
  if (!t.deadline || t.done || t.stage === 'Готово' || last.includes('готово к выдаче')) return 'ok';
  if (t.deadline < TODAY) return 'overdue';
  if (t.deadline <= TOMORROW) return 'soon';
  return 'ok';
}
