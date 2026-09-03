// Правка записи в «Деньгах» на телефоне.
// Права те же, что на компьютере: сотрудница правит свои записи за сегодня/вчера,
// владелец — любые, ему же доступны дата и удаление. Всё пишется в историю (триггер БД, 010).
import { useState } from 'react';
import CatPicker from '../../CatPicker.jsx';
import { isRefundCat } from '../../taskMoney.js';
import { TaskLinkSelect } from '../../sections/Finance.jsx';
import { M, Sheet, Btn, Field, inputStyle, money } from '../ui.jsx';

export default function MTxEdit({ tx, onClose, categories, banks, tasks, transactions, db, PAYMENT_METHODS, isOwner, showToast, UI }) {
  const [cat, setCat] = useState(tx.category_id ? String(tx.category_id) : '');
  const [sum, setSum] = useState(String(tx.amount));
  const [method, setMethod] = useState(tx.payment_method);
  const [bank, setBank] = useState(tx.bank_id ? String(tx.bank_id) : '');
  const [taskId, setTaskId] = useState(tx.task_id ? String(tx.task_id) : '');
  const [comment, setComment] = useState(tx.comment || '');
  const [date, setDate] = useState(tx.op_date);

  const isRefund = isRefundCat(categories.find(c => c.id === +cat));
  // Категории того же сорта, что у записи: доход / рабочий расход / личный расход
  const kind = categories.find(c => c.id === tx.category_id)?.kind;
  const visibleCats = categories.filter(c => tx.type === 'income'
    ? c.kind === 'income'
    : isOwner
      ? (kind === 'expense_personal' ? c.kind === 'expense_personal' : c.kind === 'expense_shared' || c.kind === 'expense_work')
      : c.kind === 'expense_shared');

  const save = async () => {
    if (!+sum) { showToast('Сумма должна быть больше нуля', 'error'); return; }
    const patch = {
      category_id: cat ? +cat : null, amount: +sum,
      payment_method: method, bank_id: method === 'transfer' ? +bank || null : null,
      comment: comment.trim(), task_id: taskId ? +taskId : null,
    };
    if (isOwner && date !== tx.op_date) patch.op_date = date;
    // Клиент подтягивается от задачи: иначе оплата повиснет на прежнем клиенте
    if ((patch.task_id || null) !== (tx.task_id || null)) {
      patch.client_id = patch.task_id ? tasks.find(x => x.id === patch.task_id)?.client_id || null : null;
    }
    const ok = await db.updateTransaction(tx, patch);
    if (!ok) return;
    onClose();
    showToast('Исправлено ✓ (в историю записалось, что поменялось)');
  };

  return (
    <Sheet open onClose={onClose} title="Правка записи"
      footer={<Btn kind="dark" wide onClick={save}>Сохранить</Btn>}>

      <div style={{ color: M.muted, fontSize: 12.5, marginBottom: 12 }}>
        {tx.type === 'income' ? 'Приход' : 'Расход'} · записала {tx.created_by} в {tx.time}
      </div>

      <Field label="Категория">
        <CatPicker UI={UI} mode="id" items={visibleCats.map(c => ({ id: c.id, name: c.name, label: c.name }))}
          value={cat} onChange={setCat} />
      </Field>

      <Field label="Сумма, ₽">
        <input style={{ ...inputStyle, fontWeight: 700, fontSize: 18 }} type="number" inputMode="numeric"
          value={sum} onChange={e => setSum(e.target.value)} />
      </Field>

      <Field label="Способ оплаты">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PAYMENT_METHODS.filter(m => m.key !== 'deposit').map(m => (
            <button key={m.key} onClick={() => setMethod(m.key)} style={{
              border: 'none', borderRadius: 999, padding: '10px 15px', fontSize: 13, fontWeight: 600, minHeight: 42,
              background: method === m.key ? M.accent : M.card,
            }}>{m.label}</button>
          ))}
        </div>
      </Field>

      {method === 'transfer' && (
        <Field label="На какую карту">
          <select style={inputStyle} value={bank} onChange={e => setBank(e.target.value)}>
            <option value="">Выбери банк…</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}

      {(tx.type === 'income' || isRefund) && (
        <Field label={isRefund ? 'За какую задачу возврат' : 'Привязка к задаче'}>
          <TaskLinkSelect tasks={tasks} transactions={transactions} value={taskId} onChange={setTaskId}
            isRefund={isRefund} currentId={tx.task_id} UI={UI} />
        </Field>
      )}

      {isOwner && (
        <Field label="Дата операции">
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
      )}

      <Field label="Комментарий">
        <input style={inputStyle} value={comment} onChange={e => setComment(e.target.value)} placeholder="Необязательно" />
      </Field>

      {/* Удаление — только у владельца: у сотрудниц запись можно лишь исправить */}
      {isOwner && (
        <Btn kind="danger" wide style={{ marginTop: 4 }}
          onClick={async () => {
            const ok = await db.removeTransaction(tx);
            if (ok !== false && ok !== null) { onClose(); showToast(`Запись на ${money(tx.amount)} удалена`); }
          }}>Удалить запись</Btn>
      )}
    </Sheet>
  );
}
