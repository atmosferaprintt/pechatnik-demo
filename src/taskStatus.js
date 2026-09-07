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

// Участие человека в задаче: сейчас она за ним ИЛИ он есть в её истории —
// принял, отметил действие, передал дальше.
//
// Зачем (жалоба цеха 2026-09-07): пилюля с именем показывала только «у кого лежит сейчас»,
// а цех ищет «что мне печатать». Пока менеджер не нажал «→ передала», заказ числится
// за ним, и по своей пилюле цех его не видел, хотя работа уже у него.
export function involvesPerson(t, name) {
  if (!name) return true;
  if (t.assignee === name) return true;
  return (t.log || []).some(l => l.who === name || (l.action || '').includes(`передала: ${name}`));
}
