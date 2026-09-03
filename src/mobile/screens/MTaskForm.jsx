// Создание и правка задачи на телефоне — шит с полями в один столбец.
// Сохранение — общий src/taskActions.js (там же клиент «на лету» и дифф в историю).
import { useState } from 'react';
import I from '../../Icon.jsx';
import CatPicker from '../../CatPicker.jsx';
import { paidOfTask } from '../../taskMoney.js';
import * as act from '../../taskActions.js';
import { M, Sheet, Btn, Field, inputStyle, money } from '../ui.jsx';

// Форма монтируется только на время показа (в MTasks стоит key) — поэтому поля
// заполняются один раз при создании состояния, без эффектов-синхронизаций.
export default function MTaskForm({ open, task, onClose, clients, contractors, categories, transactions, currentUser, PEOPLE_COLUMNS, db, showToast, UI }) {
  const [title, setTitle] = useState(task?.title || '');
  const [clientSel, setClientSel] = useState(task?.client_id ? String(task.client_id) : '');
  const [fio, setFio] = useState(''); const [phone, setPhone] = useState(''); const [company, setCompany] = useState('');
  const [amount, setAmount] = useState(task?.amount ? String(task.amount) : '');
  const [parts, setParts] = useState(() => (task?.parts || []).map(p => ({ name: p.name, sum: String(p.amount) })));
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [assignee, setAssignee] = useState(task?.assignee || '');
  const [contractorId, setContractorId] = useState(task?.contractor_id ? String(task.contractor_id) : '');
  const [description, setDescription] = useState(task?.description || '');
  const [saving, setSaving] = useState(false);

  const incomeCats = categories.filter(c => c.kind === 'income');
  const partsTotal = parts.reduce((s, p) => s + (+p.sum || 0), 0);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await act.saveTask({ db, currentUser, showToast, clients }, {
        editTask: task || null,
        values: {
          title, clientSel, newClient: { fio, phone, company },
          amount, parts, deadline, assignee, contractorId, description,
        },
      });
      if (ok) onClose();
    } finally { setSaving(false); }
  };

  const alreadyPaid = task ? paidOfTask(transactions, task) : 0;

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Правка задачи' : 'Новая задача'}
      footer={<Btn kind="dark" wide disabled={saving} onClick={save}>{saving ? 'Сохраняю…' : task ? 'Сохранить' : 'Создать задачу'}</Btn>}>

      <Field label="Что делаем">
        <input style={inputStyle} placeholder="Визитки 500 шт…" value={title} onChange={e => setTitle(e.target.value)} />
      </Field>

      <Field label="Клиент">
        <select style={inputStyle} value={clientSel} onChange={e => setClientSel(e.target.value)}>
          <option value="">Без клиента</option>
          <option value="__new">+ Новый клиент…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {clientSel === '__new' && (
        <div style={{ background: 'rgba(247,214,74,.15)', border: `1.5px solid ${M.accent}`, borderRadius: 16, padding: 12, marginBottom: 12 }}>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Фамилия Имя *" value={fio} onChange={e => setFio(e.target.value)} />
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Телефон" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <input style={inputStyle} placeholder="Компания" value={company} onChange={e => setCompany(e.target.value)} />
          <div style={{ color: M.muted, fontSize: 12, marginTop: 8 }}>Клиент сразу попадёт в базу и привяжется к задаче</div>
        </div>
      )}

      {parts.length === 0 ? (
        <Field label="Сумма заказа">
          <input style={{ ...inputStyle, fontWeight: 700 }} type="number" inputMode="numeric" placeholder="₽"
            value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={() => setParts([{ name: '', sum: '' }, { name: '', sum: '' }])} style={{
            border: `1.5px dashed ${M.muted}`, background: 'transparent', borderRadius: 999,
            padding: '9px 14px', fontSize: 12.5, color: M.muted, fontWeight: 600, marginTop: 8, minHeight: 40,
          }}>разбить на состав</button>
        </Field>
      ) : (
        <Field label="Состав заказа">
          {parts.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <CatPicker UI={UI} items={incomeCats} value={p.name} wrapStyle={{ flex: 1.3, minWidth: 0 }}
                onChange={name => setParts(prev => prev.map((x, idx) => idx === i ? { ...x, name } : x))} />
              <input style={{ ...inputStyle, flex: 1, minWidth: 0, fontWeight: 700 }} type="number" inputMode="numeric" placeholder="₽"
                value={p.sum} onChange={e => setParts(prev => prev.map((x, idx) => idx === i ? { ...x, sum: e.target.value } : x))} />
              <button onClick={() => setParts(prev => prev.filter((_, idx) => idx !== i))} style={{
                border: 'none', background: M.card, borderRadius: 14, width: 44, flexShrink: 0,
              }}><I n="x" size={14} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setParts(prev => [...prev, { name: '', sum: '' }])} style={{
              border: `1.5px dashed ${M.muted}`, background: 'transparent', borderRadius: 999,
              padding: '8px 13px', fontSize: 12.5, color: M.muted, fontWeight: 600, minHeight: 40,
            }}>+ часть</button>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>= {money(partsTotal)}</span>
          </div>
        </Field>
      )}

      {/* При правке видно, что новая сумма сделает с уже записанными оплатами */}
      {task && alreadyPaid > 0 && (() => {
        const willBe = (parts.length ? partsTotal : +amount) || 0;
        const d = willBe - alreadyPaid;
        return (
          <div style={{
            borderRadius: 14, padding: '10px 13px', fontSize: 12.5, fontWeight: 600, marginBottom: 12,
            background: d < 0 ? 'rgba(243,156,18,.15)' : M.card, color: d < 0 ? '#8a5a00' : M.muted,
          }}>
            Уже оплачено {money(alreadyPaid)} — {d > 0 ? `останется долг ${money(d)}` : d < 0 ? `получится переплата ${money(-d)}` : 'сумма сойдётся ✓'}. Оплаты правка не трогает.
          </div>
        );
      })()}

      <Field label="Дедлайн">
        <input style={inputStyle} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </Field>

      <Field label="В задачник">
        <select style={inputStyle} value={assignee} onChange={e => setAssignee(e.target.value)}>
          <option value="">{currentUser.name} (я)</option>
          {PEOPLE_COLUMNS.filter(p => p !== currentUser.name).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <Field label="Контрагент, если перезаказ">
        <select style={inputStyle} value={contractorId} onChange={e => setContractorId(e.target.value)}>
          <option value="">Без перезаказа</option>
          {contractors.map(c => <option key={c.id} value={c.id}>{c.name} · {c.service}</option>)}
        </select>
      </Field>

      <Field label="Описание">
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="Материал, размеры, детали…" value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
    </Sheet>
  );
}
