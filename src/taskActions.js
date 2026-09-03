// Действия над задачей — в одном месте, как taskMoney.js для денег.
//
// Каждое действие пишет строку в историю задачи (task_log): «кто что сделал». Эти тексты
// Кристи читает в карточке, и если телефон начнёт писать «завершила», а компьютер
// «✓ завершила» — история превратится в кашу. Поэтому формулировки живут здесь.
//
// ctx = { db, currentUser, showToast } — те же пропсы, что уже есть у секций.
import { paidOfTask, debtOfTask } from './taskMoney.js';

const fmt = (n) => (n || 0).toLocaleString('ru-RU') + ' ₽';

// Заказ выдан. Долг не мешает закрыть: задача уходит во вкладку «Долги»
export function finishTask({ db, currentUser, showToast }, task, transactions) {
  const debt = debtOfTask(transactions, task);
  db.updateTask(task, { done: true }, { who: currentUser.name, action: '✓ завершила' });
  showToast(debt > 0 ? `«${task.title}» выдана, долг ${fmt(debt)} → Долги` : `«${task.title}» выдана и закрыта ✓`);
}

// Возврат в работу снимает и отказ: заказ снова живой, сумма к оплате прежняя
export function reopenTask({ db, currentUser, showToast }, task) {
  db.updateTask(task, { done: false, cancelled: false }, { who: currentUser.name, action: '↩ вернула в работу' });
  showToast(`«${task.title}» снова в работе ↩`);
}

// Отказ клиента (2026-08-13, «кепки»): заказа больше нет — к оплате 0, долга нет.
// Внесённые деньги возвращаются расходом «Возврат» с привязкой к этой же задаче.
export function cancelTask({ db, currentUser, showToast }, task, transactions) {
  const paid = paidOfTask(transactions, task);
  db.updateTask(task, { done: true, cancelled: true }, { who: currentUser.name, action: '✕ отказ клиента' });
  showToast(paid > 0
    ? `«${task.title}» — отказ. Осталось вернуть клиенту ${fmt(paid)}: запиши расход «Возврат» и привяжи к задаче`
    : `«${task.title}» — отказ клиента, закрыта без долга ✓`);
}

export function setStage({ db, currentUser, showToast }, task, stage) {
  if (!stage || stage === (task.stage || 'Новая')) return;
  db.updateTask(task, { stage }, { who: currentUser.name, action: `→ этап: ${stage}` });
  showToast(`«${task.title}» → ${stage}`);
}

// Шаг по этапам кнопками ← → (на телефоне заменяет перетаскивание карточек)
export function moveStage(ctx, task, dir, STAGES) {
  const i = STAGES.indexOf(task.stage || 'Новая') + dir;
  if (i < 0 || i >= STAGES.length) return;
  setStage(ctx, task, STAGES[i]);
}

// Передача задачи другому человеку — в истории от имени того, кто отдал
export function transferTask({ db, showToast }, task, to) {
  if (!to || to === task.assignee) return;
  db.updateTask(task, { assignee: to }, { who: task.assignee, action: `→ передала: ${to}` });
  showToast(`«${task.title}» → ${to}`);
}

export function addAction({ db, showToast }, task, action) {
  db.addTaskLog(task, action);
  showToast(`Отметка: ${action} ✓`);
}

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';

// Создание и правка задачи. Здесь же — клиент «на лету» (Кристи заводит его прямо из задачи)
// и запись в историю с диффом «что именно изменилось».
// values: { title, clientSel: ''|'__new'|id, newClient: {fio, phone, company},
//           amount, parts: [{name, sum}], deadline, assignee, contractorId, description }
// Возвращает true, если сохранилось.
export async function saveTask({ db, currentUser, showToast, clients }, { editTask, values }) {
  const v = values;
  if (!v.title.trim()) { showToast('Укажи название задачи', 'error'); return false; }

  let clientId = v.clientSel && v.clientSel !== '__new' ? +v.clientSel : null;
  if (v.clientSel === '__new') {
    const nc = v.newClient || {};
    if (!nc.fio?.trim()) { showToast('Укажи имя клиента', 'error'); return false; }
    // Телефон нормализуем до 10 цифр — иначе один и тот же клиент заведётся дважды
    const norm = (nc.phone || '').replace(/\D/g, '').slice(-10);
    const existing = norm && clients.find(c => c.phone_norm === norm);
    if (existing) {
      clientId = existing.id;
      showToast(`Такой телефон уже есть — привязала к «${existing.name}»`);
    } else {
      const name = nc.company?.trim() ? `${nc.fio.trim()} · ${nc.company.trim()}` : nc.fio.trim();
      const created = await db.addClient({ name, phone: (nc.phone || '').trim(), instagram: '', note: '' });
      if (!created) return false;
      clientId = created.id;
    }
  }

  const parts = (v.parts || []).filter(p => p.name.trim() && +p.sum > 0).map(p => ({ name: p.name.trim(), amount: +p.sum }));
  const amount = parts.length ? parts.reduce((s, p) => s + p.amount, 0) : (+v.amount || null);
  const payload = {
    title: v.title.trim(), client_id: clientId, amount, parts,
    deadline: v.deadline || null, assignee: v.assignee || currentUser.name,
    contractor_id: v.contractorId ? +v.contractorId : null, description: (v.description || '').trim(),
  };

  if (editTask) {
    const diffs = [];
    if (payload.title !== editTask.title) diffs.push(`название «${editTask.title}» → «${payload.title}»`);
    if ((payload.amount || 0) !== (editTask.amount || 0)) diffs.push(`сумма ${editTask.amount || 0} → ${payload.amount || 0} ₽`);
    if ((payload.deadline || '') !== (editTask.deadline || '')) diffs.push(`дедлайн → ${payload.deadline ? dm(payload.deadline) : 'убран'}`);
    if ((payload.client_id || null) !== (editTask.client_id || null)) diffs.push('клиент');
    if ((payload.contractor_id || null) !== (editTask.contractor_id || null)) diffs.push('контрагент');
    if ((payload.assignee || '') !== (editTask.assignee || '')) diffs.push(`задачник → ${payload.assignee}`);
    if ((payload.description || '') !== (editTask.description || '')) diffs.push('описание');
    if (JSON.stringify(payload.parts) !== JSON.stringify(editTask.parts || [])) diffs.push('состав заказа');
    const action = diffs.length ? `изменила: ${diffs.join(', ')}` : 'изменила задачу';
    const ok = await db.updateTask(editTask, payload, { who: currentUser.name, action });
    if (!ok) return false;
    showToast('Задача исправлена ✓');
  } else {
    const created = await db.addTask(payload);
    if (!created) return false;
    showToast(`Задача создана → ${created.assignee} ✓`);
  }
  return true;
}

// «Повторить заказ» — копия к себе, без дедлайна
export function repeatTask({ db, currentUser, showToast }, task) {
  db.addTask({
    title: task.title, description: task.description, client_id: task.client_id, contractor_id: task.contractor_id,
    amount: task.amount, parts: task.parts || [], deadline: null, assignee: currentUser.name,
    _firstAction: 'повторный заказ (копия)',
  });
  showToast(`«${task.title}» скопирована к тебе`);
}
