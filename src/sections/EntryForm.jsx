// Форма записи операции — общая для компьютера и телефона.
// Раньше жила внутри Finance.jsx; вынесена 2026-08-14, чтобы мобильная версия
// записывала доходы и расходы ровно тем же кодом (разбивка на статьи, привязка к задаче,
// создание задачи из оплаты, возврат клиенту, личные расходы владельца).
import { useState } from 'react';
import CatPicker from '../CatPicker.jsx';
import { paidOfTask, debtOfTask, isRefundCat } from '../taskMoney.js';

const fmt = (n) => (n || 0).toLocaleString('ru-RU');

// Общий чек для разбитой на статьи оплаты. ВАЖНО: crypto.randomUUID есть только на HTTPS,
// а мы пока на http://IP — поэтому свой генератор валидного UUID v4.
const newBatchId = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

// ---------- Общая форма записи операции ----------
// У дохода: привязка к задаче (или создание новой задачи на месте) и разбивка суммы
// на несколько статей дохода — просьбы Кристи от 2026-07-15.
export default function EntryForm({ categories, banks, tasks, clients, transactions, db, PAYMENT_METHODS, UI, currentUser, isOwner, showToast, onSave, prefillTaskId }) {
  const [type, setType] = useState('income');
  const [scope, setScope] = useState('work'); // для расходов владельца: work | personal
  const [rows, setRows] = useState([{ cat: '', sum: '' }]); // статьи: доход можно разбить на несколько
  const [method, setMethod] = useState('cash');
  const [bankId, setBankId] = useState('');
  // Пришли из карточки задачи по кнопке «Записать оплату» — задача сразу выбрана
  const [taskId, setTaskId] = useState(prefillTaskId ? String(prefillTaskId) : '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskClient, setNewTaskClient] = useState('');
  const [newTaskFull, setNewTaskFull] = useState(''); // полная сумма заказа: больше оплаты → разница станет долгом
  const [comment, setComment] = useState('');

  // Сотруднику — только доходные и общие расходные категории.
  // Владельцу расходы делятся переключателем: рабочие (общие + 🔒 рабочие) / 🔒 личные.
  const visibleCats = categories.filter(c => {
    if (type === 'income') return c.kind === 'income';
    if (!isOwner) return c.kind === 'expense_shared';
    return scope === 'personal'
      ? c.kind === 'expense_personal'
      : c.kind === 'expense_shared' || c.kind === 'expense_work';
  });
  // К оплате можно привязать открытые задачи + выданные с долгом (долг гасится тоже отсюда).
  // Долговые — вниз списка единым блоком («чтобы легче найти», Кристи 2026-07-21)
  const paidOf = (t) => paidOfTask(transactions, t);
  const taskDebt = (t) => debtOfTask(transactions, t);
  const linkTasks = tasks.filter(t => !t.done || taskDebt(t) > 0)
    .sort((a, b) => (taskDebt(a) > 0) - (taskDebt(b) > 0));

  // Возврат клиенту (2026-08-13, отказ от заказа «кепки»): расход категории «Возврат» тоже
  // привязывается к задаче и уменьшает по ней «оплачено». Выбирать можно любую задачу,
  // по которой есть что возвращать — в том числе уже выданную; свежие сверху.
  const refundMode = type === 'expense' && isRefundCat(categories.find(c => c.id === +rows[0]?.cat));
  const refundTasks = refundMode ? tasks.filter(t => paidOf(t) > 0).sort((a, b) => b.id - a.id) : [];

  const kindLabel = { expense_shared: '', expense_work: ' · рабочие (приватные)', expense_personal: '' };

  const activeRows = type === 'income' ? rows : rows.slice(0, 1);
  const total = activeRows.reduce((s, r) => s + (+r.sum || 0), 0);
  const setRow = (i, patch) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const resetForm = () => {
    setRows([{ cat: '', sum: '' }]);
    setComment(''); setTaskId(''); setNewTaskTitle(''); setNewTaskClient(''); setNewTaskFull('');
  };

  const save = async () => {
    const filled = activeRows.filter(r => r.cat && +r.sum > 0);
    if (!filled.length || filled.length !== activeRows.length) { showToast('Заполни категорию и сумму в каждой статье', 'error'); return; }

    // «➕ Новая задача» из привязки — создаём задачу на месте.
    // У расхода привязка есть только у возвратов (refundMode) и без «новой задачи»:
    // возвращают всегда по существующему заказу
    let linkTaskId = (type === 'income' || refundMode) && taskId && taskId !== '__new' ? +taskId : null;
    let linkClientId = null;
    if (type === 'income' && taskId === '__new') {
      if (!newTaskTitle.trim()) { showToast('Укажи название новой задачи', 'error'); return; }
      // Сумма заказа: полная (если указана) — тогда неоплаченный остаток сразу виден как долг
      const fullAmount = +newTaskFull > 0 ? +newTaskFull : total;
      if (+newTaskFull > 0 && +newTaskFull < total) { showToast('Сумма заказа не может быть меньше оплаты', 'error'); return; }
      const created = await db.addTask({
        title: newTaskTitle.trim(), client_id: newTaskClient ? +newTaskClient : null,
        amount: fullAmount, deadline: null, assignee: currentUser.name, description: comment,
        _firstAction: 'приняла (создана из оплаты)',
      });
      if (!created) return;
      linkTaskId = created.id;
      linkClientId = created.client_id;
    }

    // Разбивка на статьи: несколько операций одним чеком (общий batch_id)
    const batch = filled.length > 1 ? newBatchId() : null;
    const ok = await onSave(filled.map(r => ({
      type, category_id: +r.cat, amount: +r.sum,
      payment_method: method, bank_id: method === 'transfer' ? +bankId || null : null,
      task_id: linkTaskId, client_id: linkClientId, batch_id: batch, comment,
    })));
    if (ok === false || ok === null) return; // ошибка — ввод не сбрасываем, тост уже показан
    resetForm();
  };

  const input = {
    width: '100%', padding: '13px 16px', borderRadius: 16, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 5 }}>
        {[['income', 'Доход'], ['expense', 'Расход']].map(([k, l]) => (
          <button key={k} onClick={() => { setType(k); setRows([{ cat: '', sum: '' }]); setTaskId(''); }} style={{
            flex: 1, border: 'none', borderRadius: 999, padding: '10px 0', fontWeight: 700, fontSize: 14,
            background: type === k ? UI.dark : 'transparent', color: type === k ? '#fff' : UI.dark,
          }}>{l}</button>
        ))}
      </div>

      {/* Владелец при расходе выбирает: рабочий или личный (сотрудники этого не видят) */}
      {isOwner && type === 'expense' && (
        <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 4 }}>
          {[['work', 'Рабочий'], ['personal', 'Личный']].map(([k, l]) => (
            <button key={k} onClick={() => { setScope(k); setRows([{ cat: '', sum: '' }]); }} style={{
              flex: 1, border: 'none', borderRadius: 999, padding: '8px 0', fontWeight: 700, fontSize: 13,
              background: scope === k ? (k === 'personal' ? UI.accent : UI.dark) : 'transparent',
              color: scope === k && k !== 'personal' ? '#fff' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* Статьи: у дохода одну сумму можно разбить на несколько категорий */}
      {activeRows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8 }}>
          {/* Поисковик вместо длинного селекта категорий (просьба Кристи 2026-07-21) */}
          <CatPicker UI={UI} mode="id" wrapStyle={{ flex: 1.4, minWidth: 0 }}
            items={visibleCats.map(c => ({ id: c.id, name: c.name, label: `${c.name}${kindLabel[c.kind] || ''}` }))}
            value={r.cat} onChange={cat => setRow(i, { cat })} />
          <input style={{ ...input, flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700 }} type="number" placeholder="Сумма, ₽"
            value={r.sum} onChange={e => setRow(i, { sum: e.target.value })} />
          {activeRows.length > 1 && (
            <button onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))} style={{
              border: 'none', background: UI.soft, borderRadius: 999, width: 38, flexShrink: 0, fontSize: 14,
            }}>✕</button>
          )}
        </div>
      ))}
      {type === 'income' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setRows(prev => [...prev, { cat: '', sum: '' }])} style={{
            border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 14px', fontSize: 12.5, color: UI.muted, fontWeight: 600,
          }}>+ разбить на ещё одну статью</button>
          {activeRows.length > 1 && <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 15 }}>= {fmt(total)} ₽</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PAYMENT_METHODS.filter(m => m.key !== 'deposit').map(m => (
          <button key={m.key} onClick={() => setMethod(m.key)} style={{
            border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600,
            background: method === m.key ? UI.accent : UI.soft,
          }}>{m.label}</button>
        ))}
      </div>

      {method === 'transfer' && (
        <select style={input} value={bankId} onChange={e => setBankId(e.target.value)}>
          <option value="">На какую карту (банк)…</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}

      {type === 'income' && (
        <>
          <select style={input} value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">Привязать к задаче (необязательно)…</option>
            <option value="__new">+ Создать новую задачу…</option>
            {linkTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}{taskDebt(t) > 0 ? ` · долг ${fmt(taskDebt(t))} ₽` : ` · ${fmt(t.amount)} ₽`}{t.done ? ' (выдана)' : ''}
              </option>
            ))}
          </select>
          {taskId && taskId !== '__new' && (() => {
            // Мини-счёт по выбранной задаче + предупреждение, если вносят больше долга
            const t = tasks.find(x => x.id === +taskId);
            if (!t) return null;
            const paid = paidOf(t);
            const debt = taskDebt(t);
            const over = total > 0 && total > debt;
            // Разбивка оплаты по составу заказа: статьи из parts, категория подбирается по имени части.
            // Части часто называются не как категории («Печать», «Дизайн») — тогда подставляем
            // категорию, выбранную до разбивки, а если её нет — сразу подсказываем, что выбрать руками
            // (раньше молча оставляли пустыми, и «Записать» падал с ошибкой — жалоба Кристи 2026-07-17).
            const splitByParts = () => {
              const byName = (n) => categories.find(c => c.kind === 'income' && c.name.trim().toLowerCase() === n.trim().toLowerCase())?.id;
              const fallback = rows.find(r => r.cat)?.cat || '';
              const next = t.parts.map(p => { const id = byName(p.name); return { cat: id ? String(id) : fallback, sum: String(p.amount) }; });
              setRows(next);
              if (next.some(r => !r.cat)) showToast('Суммы расставила — теперь выбери категорию у каждой статьи');
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ color: over ? '#8a5a00' : UI.muted, fontSize: 12, padding: '0 6px' }}>
                  Заказ {fmt(t.amount)} ₽ · оплачено {fmt(paid)} ₽ · {debt > 0 ? `долг ${fmt(debt)} ₽` : debt < 0 ? `переплата ${fmt(-debt)} ₽` : 'в расчёте ✓'}
                  {over ? ` — вносишь ${fmt(total)} ₽, по задаче будет переплата ${fmt(total - Math.max(debt, 0))} ₽` : ''}
                </div>
                {t.parts?.length > 0 && (
                  <button onClick={splitByParts} style={{
                    border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999,
                    padding: '8px 14px', fontSize: 12.5, color: UI.muted, fontWeight: 600, alignSelf: 'flex-start',
                  }}>разбить по составу: {t.parts.map(p => `${p.name} ${fmt(p.amount)} ₽`).join(' + ')}</button>
                )}
              </div>
            );
          })()}
          {taskId === '__new' && (
            <div style={{ background: 'rgba(247,214,74,.15)', border: `1.5px solid ${UI.accent}`, borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={input} placeholder="Название новой задачи (визитки 500 шт…)" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              <select style={input} value={newTaskClient} onChange={e => setNewTaskClient(e.target.value)}>
                <option value="">Клиент (необязательно)…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input style={input} type="number" placeholder="Сумма заказа целиком, ₽ (если больше оплаты)" value={newTaskFull} onChange={e => setNewTaskFull(e.target.value)} />
              <div style={{ color: UI.muted, fontSize: 12 }}>
                {+newTaskFull > 0 && total > 0 && +newTaskFull > total
                  ? `Оплачено ${fmt(total)} ₽ из ${fmt(+newTaskFull)} ₽ — долг ${fmt(+newTaskFull - total)} ₽ повиснет на задаче`
                  : 'Задача появится в твоём задачнике, оплата привяжется сразу. Укажи полную сумму заказа — остаток станет долгом'}
              </div>
            </div>
          )}
        </>
      )}

      {/* Возврат клиенту — привязка к задаче: «оплачено» по ней уменьшится на эту сумму
          (просьба Кристи 2026-08-13: «привязать возврат к задаче, чтобы баланс сошёлся») */}
      {refundMode && (
        <>
          <select style={input} value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">За какую задачу возврат (необязательно)…</option>
            {refundTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title} · оплачено {fmt(paidOf(t))} ₽{t.done ? ' (выдана)' : ''}</option>
            ))}
          </select>
          {taskId && (() => {
            const t = tasks.find(x => x.id === +taskId);
            if (!t) return null;
            const paid = paidOf(t);
            const left = paid - total;
            return (
              <div style={{ color: left < 0 ? '#8a5a00' : UI.muted, fontSize: 12, padding: '0 6px' }}>
                {left < 0
                  ? `По задаче оплачено ${fmt(paid)} ₽ — возвращаешь больше, чем клиент вносил`
                  : `Оплачено ${fmt(paid)} ₽ → после возврата останется ${fmt(left)} ₽`}
                {!t.cancelled && ' · если клиент отказался от заказа — закрой задачу кнопкой «✕ Отказ» в её карточке, иначе на ней останется долг'}
              </div>
            );
          })()}
        </>
      )}

      <input style={input} placeholder="Комментарий (необязательно)" value={comment} onChange={e => setComment(e.target.value)} />

      <button onClick={save} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '15px 0', fontSize: 15, fontWeight: 800 }}>
        Записать
      </button>
    </div>
  );
}
