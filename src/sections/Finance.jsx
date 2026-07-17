// Раздел «Финансы».
// Сотрудник: форма «ввёл и провалился» — без итогов, видит только свои последние записи.
// Владелец: лента дня, кнопка «+ Операция» (модалка с той же формой + приватные категории),
//           тёмная карточка сверки с разницей ±, расхождения «пришло, но не записано».
// Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';

export default function Finance(props) {
  return props.isOwner ? <OwnerView {...props} /> : <EmployeeView {...props} />;
}

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
function EntryForm({ categories, banks, tasks, clients, db, PAYMENT_METHODS, UI, currentUser, isOwner, showToast, onSave }) {
  const [type, setType] = useState('income');
  const [scope, setScope] = useState('work'); // для расходов владельца: work | personal
  const [rows, setRows] = useState([{ cat: '', sum: '' }]); // статьи: доход можно разбить на несколько
  const [method, setMethod] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [taskId, setTaskId] = useState('');
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
  const openTasks = tasks.filter(t => !t.done);

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

    // «➕ Новая задача» из привязки — создаём задачу на месте
    let linkTaskId = type === 'income' && taskId && taskId !== '__new' ? +taskId : null;
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
          <button key={k} onClick={() => { setType(k); setRows([{ cat: '', sum: '' }]); }} style={{
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
          <select style={{ ...input, flex: 1.4, minWidth: 0 }} value={r.cat} onChange={e => setRow(i, { cat: e.target.value })}>
            <option value="">Категория…</option>
            {visibleCats.map(c => <option key={c.id} value={c.id}>{c.name}{kindLabel[c.kind] || ''}</option>)}
          </select>
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
            {openTasks.map(t => <option key={t.id} value={t.id}>{t.title} · {fmt(t.amount)} ₽</option>)}
          </select>
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

      <input style={input} placeholder="Комментарий (необязательно)" value={comment} onChange={e => setComment(e.target.value)} />

      <button onClick={save} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '15px 0', fontSize: 15, fontWeight: 800 }}>
        Записать
      </button>
    </div>
  );
}

// Частые мелкие операции — один тап = запись (против утечки незаписанной мелочи).
// Позже владелец сможет настраивать этот список в Настройках.

// ---------- Взгляд сотрудника ----------
// Вид сотрудника (с 2026-07-16, просьба Кристи): доступ к сегодня + вчера,
// закрытие смены и перенос вчерашних оплат на сегодня. Итоги по банку/месяцу — только у Кристи.
function EmployeeView(props) {
  const { transactions, categories, banks, currentUser, isOwnerAccount, dayClosures, db, quickOps, PAYMENT_METHODS, UI, showToast } = props;
  const TODAY_D = db.today;
  const YESTERDAY_D = db.yesterday;
  const [opDate, setOpDate] = useState(TODAY_D);
  const [cashFact, setCashFact] = useState('');
  const [mFlt, setMFlt] = useState(''); // фильтр по способу оплаты
  const isToday = opDate === TODAY_D;

  const catName = (id) => categories.find(c => c.id === id)?.name || '?';
  const catKind = (t) => categories.find(c => c.id === t.category_id)?.kind;
  const mLabel = (k) => PAYMENT_METHODS.find(m => m.key === k)?.label || k;
  const bankName = (id) => banks.find(b => b.id === id)?.name;

  // Девочкам видна операционка дня (без личных и крупных расходов Кристи)
  const dayTx = transactions.filter(t => t.op_date === opDate
    && catKind(t) !== 'expense_personal'
    && !(t.type === 'expense' && catKind(t) === 'expense_work'))
    .sort((a, b) => (b.time || '').localeCompare(a.time || '') || b.id - a.id); // новые сверху
  // Переходящий остаток: сколько лежало в кассе на утро (фактический остаток последнего закрытия)
  const carry = dayClosures.filter(c => c.date < opDate).sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.cash_fact || 0;
  const dayCashFlow = dayTx.reduce((s, t) => s + (t.payment_method === 'cash' ? (t.type === 'income' ? t.amount : -t.amount) : 0), 0);
  const cashCalc = carry + dayCashFlow;
  const closure = dayClosures.find(c => c.date === opDate);

  const quickSave = (q) => {
    const cat = categories.find(c => c.name === q.category);
    if (!cat) { showToast('Нет такой категории', 'error'); return; }
    db.addTransactions([{ type: 'income', category_id: cat.id, amount: q.amount, payment_method: 'cash', bank_id: null, comment: '' }]);
    showToast(`${q.label} — записано ✓`);
  };

  // Вчерашняя оплата пришла/нашлась после закрытия смены → перекидываем на сегодня
  const moveToToday = (t) => {
    db.moveTxToToday(t);
    showToast(`«${catName(t.category_id)} ${fmt(t.amount)} ₽» перенесена на сегодня ↪`);
  };

  const closeShift = () => {
    if (cashFact === '') { showToast('Введи фактический остаток в кассе', 'error'); return; }
    const diff = +cashFact - cashCalc;
    db.closeShift({ date: opDate, cash_calc: cashCalc, cash_fact: +cashFact, diff });
    setCashFact('');
    showToast(diff === 0 ? 'Смена закрыта, касса сошлась ✓' : `Смена закрыта, разница ${diff > 0 ? '+' : ''}${fmt(diff)} ₽`, diff === 0 ? 'ok' : 'error');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Финансы</h1>
        {/* Доступ: только сегодня и вчера */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          {[[TODAY_D, `Сегодня · ${TODAY_D.slice(8, 10)}.${TODAY_D.slice(5, 7)}`], [YESTERDAY_D, `Вчера · ${YESTERDAY_D.slice(8, 10)}.${YESTERDAY_D.slice(5, 7)}`]].map(([d, l]) => (
            <button key={d} onClick={() => setOpDate(d)} style={{
              border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700,
              background: opDate === d ? UI.dark : 'transparent', color: opDate === d ? '#fff' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, width: 'min(420px, 100%)' }}>
          {/* Мелочь одним тапом — кнопки настраивает Кристи в Настройках */}
          {quickOps.length > 0 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}><I n="zap" size={12} /> Мелочь одним тапом (нал)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {quickOps.map((q, i) => (
                    <button key={i} onClick={() => quickSave(q)} style={{
                      border: `1.5px solid ${UI.accent}`, background: 'rgba(247,214,74,.18)', borderRadius: 999,
                      padding: '8px 14px', fontSize: 13, fontWeight: 700,
                    }}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${UI.line}`, marginBottom: 16 }} />
            </>
          )}
          <EntryForm {...props} onSave={async (recs) => {
            const ok = await db.addTransactions(recs);
            if (ok) showToast(recs.length > 1 ? `Записано ${recs.length} статьями ✓` : 'Записано ✓');
            return ok;
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Операции дня — видно всем, чтобы можно было закрыть смену */}
          <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Операции за {isToday ? 'сегодня' : 'вчера'} · {dayTx.length}</div>
            <div style={{ color: UI.muted, fontSize: 13, marginBottom: 10 }}>
              {isToday ? 'Всё, что записано за день — по этому закрывается смена' : 'Вчерашний день: оплату можно перекинуть на сегодня ↪'}
            </div>
            {/* Фильтр по способам оплаты — кнопки строятся из того, что есть в дне */}
            {dayTx.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => setMFlt('')} style={{
                  border: 'none', borderRadius: 999, padding: '6px 13px', fontSize: 12, fontWeight: 700,
                  background: mFlt === '' ? UI.dark : UI.soft, color: mFlt === '' ? '#fff' : UI.dark,
                }}>Все</button>
                {PAYMENT_METHODS.filter(m => m.key !== 'deposit' && dayTx.some(t => t.payment_method === m.key)).map(m => {
                  const sum = dayTx.filter(t => t.payment_method === m.key && t.type === 'income').reduce((s, t) => s + t.amount, 0);
                  return (
                    <button key={m.key} onClick={() => setMFlt(v => v === m.key ? '' : m.key)} style={{
                      border: 'none', borderRadius: 999, padding: '6px 13px', fontSize: 12, fontWeight: 700,
                      background: mFlt === m.key ? UI.dark : UI.soft, color: mFlt === m.key ? '#fff' : UI.dark,
                    }}>{m.label} · {fmt(sum)} ₽</button>
                  );
                })}
              </div>
            )}
            {dayTx.filter(t => !mFlt || t.payment_method === mFlt).map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                <I n={t.type === 'income' ? 'income' : 'expense'} size={14} style={{ color: t.type === 'income' ? '#8a8a85' : '#c0392b' }} />
                <span style={{ fontWeight: 600 }}>{t.category_id ? catName(t.category_id) : 'Оплата с депозита'}</span>
                <span style={{ background: UI.soft, borderRadius: 999, padding: '2px 9px', fontSize: 11.5 }}>{mLabel(t.payment_method)}{t.bank_id ? ` · ${bankName(t.bank_id)}` : ''}</span>
                {t.moved_from && <span style={{ background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>↪ со вчера</span>}
                <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.comment}</span>
                {/* Хвост строки: кнопки ДО цифр, сумма и аватар фиксированной ширины — цифры выровнены */}
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {t.log?.length > 0 && (
                    <span title={t.log.map(l => `${l.who}: ${l.action} (${l.time})`).join('\n')} style={{ color: UI.muted, display: 'inline-flex' }}>
                      <I n="clock" size={12} />
                    </span>
                  )}
                  {!isToday && (t.created_by === currentUser.name || isOwnerAccount) && (
                    <button onClick={() => moveToToday(t)} title="Перенести на сегодня" style={{
                      border: 'none', background: UI.soft, borderRadius: 999, width: 26, height: 26, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>↪</button>
                  )}
                  {isToday && (t.created_by === currentUser.name || isOwnerAccount) && (
                    <>
                      <button onClick={() => { db.moveTxToYesterday(t); showToast('Перенесена во вчера ↩'); }} title="Эта оплата была вчера — перенести во вчера" style={{
                        border: 'none', background: UI.soft, borderRadius: 999, width: 26, height: 26, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>↩</button>
                      <button onClick={() => { db.removeTransaction(t); showToast('Запись удалена — внеси заново, если нужно'); }} title="Удалить (ошиблась)" style={{
                        border: 'none', background: UI.soft, borderRadius: 999, width: 26, height: 26, fontSize: 12, color: UI.muted, cursor: 'pointer',
                      }}>✕</button>
                    </>
                  )}
                  <span style={{ minWidth: 86, textAlign: 'right', fontWeight: 700, color: t.type === 'expense' ? '#c0392b' : UI.dark }}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)} ₽
                  </span>
                  <span title={t.created_by} style={{
                    width: 24, height: 24, borderRadius: '50%', background: t.created_by === currentUser.name ? UI.accent : UI.dark,
                    color: t.created_by === currentUser.name ? UI.dark : '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>{t.created_by[0]}</span>
                </span>
              </div>
            ))}
            {!dayTx.length && <div style={{ color: UI.muted, fontSize: 14 }}>Записей нет</div>}
          </div>

          {/* Закрытие смены */}
          <div style={{ background: UI.dark, color: '#fff', borderRadius: 26, padding: 24 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Закрытие смены · {opDate.slice(8, 10)}.{opDate.slice(5, 7)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0' }}>
              <span style={{ opacity: .75 }}>В кассе на утро (прошлое закрытие)</span>
              <span style={{ fontWeight: 800 }}>{fmt(carry)} ₽</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0' }}>
              <span style={{ opacity: .75 }}>Наличными за день</span>
              <span style={{ fontWeight: 800 }}>{dayCashFlow >= 0 ? '+' : ''}{fmt(dayCashFlow)} ₽</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.14)' }}>
              <span style={{ opacity: .75 }}>Должно быть в кассе</span>
              <span style={{ fontWeight: 800 }}>{fmt(cashCalc)} ₽</span>
            </div>
            {closure ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
                  <span style={{ opacity: .75 }}>Остаток по факту</span><span style={{ fontWeight: 800 }}>{fmt(closure.cash_fact)} ₽</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
                  <span style={{ opacity: .75 }}>Разница</span>
                  <span style={{ fontWeight: 800, color: closure.diff === 0 ? '#f7d64a' : '#ff8a80' }}>{closure.diff > 0 ? '+' : ''}{fmt(closure.diff)} ₽</span>
                </div>
                <div style={{ marginTop: 10, background: 'rgba(247,214,74,.2)', border: '1px solid #f7d64a', borderRadius: 14, padding: '10px 14px', fontSize: 13.5, fontWeight: 700 }}>
                  ✓ Смена закрыта · {closure.closed_by}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <input type="number" value={cashFact} onChange={e => setCashFact(e.target.value)} placeholder="Остаток в кассе, ₽" style={{
                  flex: 1, border: 'none', borderRadius: 999, padding: '12px 18px', fontSize: 14, outline: 'none',
                  background: 'rgba(255,255,255,.12)', color: '#fff', minWidth: 0,
                }} />
                <button onClick={closeShift} style={{
                  border: 'none', background: UI.accent, color: UI.dark, borderRadius: 999, padding: '12px 20px', fontWeight: 800, fontSize: 14, flexShrink: 0,
                }}>Закрыть смену</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Взгляд владельца ----------
const RU_DATE = (d) => `${+d.slice(8, 10)} ${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][+d.slice(5, 7) - 1]}`;

function OwnerView(props) {
  const { transactions, categories, banks, tasks, demoBankRows, dayClosures, db, UI, PAYMENT_METHODS, showToast } = props;
  const [showAddOp, setShowAddOp] = useState(false);
  const [opDate, setOpDate] = useState(props.db.today); // история дней: смотрим любой день
  const [txQuery, setTxQuery] = useState('');
  const [txType, setTxType] = useState(''); // '' | income | expense
  const [txMethod, setTxMethod] = useState(''); // фильтр по способу оплаты
  // Правка операции: дата, категория, сумма, способ, комментарий — модалкой, с историей
  const [editTx, setEditTx] = useState(null);
  const [eDate, setEDate] = useState('');
  const [eCat, setECat] = useState('');
  const [eSum, setESum] = useState('');
  const [eMethod, setEMethod] = useState('cash');
  const [eBank, setEBank] = useState('');
  const [eComment, setEComment] = useState('');
  const [historyTxId, setHistoryTxId] = useState(null); // раскрытая история записи

  const openTxEdit = (t) => {
    setEditTx(t);
    setEDate(t.op_date); setECat(t.category_id ? String(t.category_id) : ''); setESum(String(t.amount));
    setEMethod(t.payment_method); setEBank(t.bank_id ? String(t.bank_id) : ''); setEComment(t.comment || '');
  };

  const saveTxEdit = async () => {
    if (!+eSum) { showToast('Сумма должна быть больше нуля', 'error'); return; }
    const ok = await db.updateTransaction(editTx, {
      op_date: eDate, category_id: eCat ? +eCat : null, amount: +eSum,
      payment_method: eMethod, bank_id: eMethod === 'transfer' ? +eBank || null : null,
      comment: eComment.trim(),
    });
    if (!ok) return;
    setEditTx(null);
    showToast('Операция исправлена ✓ (записано в историю)');
  };

  const shiftDay = (dir) => {
    const d = new Date(opDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setOpDate(d.toISOString().slice(0, 10));
  };
  const isToday = opDate === db.today;

  const catName = (id) => categories.find(c => c.id === id)?.name || '?';
  const bankName = (id) => banks.find(b => b.id === id)?.name;
  const taskTitle = (id) => tasks.find(t => t.id === id)?.title;
  const mLabel = (k) => PAYMENT_METHODS.find(m => m.key === k)?.label || k;

  // Все расчёты — за выбранный день
  const dayTx = transactions.filter(t => t.op_date === opDate);

  // Разделение расходов (просьба Кристи 2026-07-15):
  //  - день/касса = только операционка, которую вносят девочки (expense_shared: доставка, возврат, другое)
  //  - крупные рабочие (expense_work: бумага, тонер, поставщики) — НЕ в расходах дня, отдельной карточкой,
  //    чтобы сверка кассы не уходила в минус; в месячной аналитике учитываются полностью
  //  - личные Кристи (expense_personal) — отдельно, как раньше
  const catKind = (t) => categories.find(c => c.id === t.category_id)?.kind;
  const isPersonal = (t) => catKind(t) === 'expense_personal';
  const isBigWork = (t) => t.type === 'expense' && catKind(t) === 'expense_work';

  const dailyTx = dayTx.filter(t => !isPersonal(t) && !isBigWork(t))
    .sort((a, b) => (b.time || '').localeCompare(a.time || '') || b.id - a.id); // лента дня, новые сверху
  const bigTx = dayTx.filter(isBigWork);
  const bigTotal = bigTx.reduce((s, t) => s + t.amount, 0);
  const personalTx = dayTx.filter(isPersonal);
  const personalTotal = personalTx.reduce((s, t) => s + t.amount, 0);

  // Оплаты «Депозитом» в доходы дня не входят — деньги пришли раньше, при внесении депозита
  const income = dailyTx.filter(t => t.type === 'income' && t.payment_method !== 'deposit').reduce((s, t) => s + t.amount, 0);
  const expense = dailyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  // Касса дня: переходящий остаток (прошлое закрытие) + наличные приходы − наличная операционка
  const carry = dayClosures.filter(c => c.date < opDate).sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.cash_fact || 0;
  const cashIn = dailyTx.filter(t => t.type === 'income' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);
  const cashOut = dailyTx.filter(t => t.type === 'expense' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);

  // Выписка в демо есть только за «сегодня»
  const dayBankRows = isToday ? demoBankRows : [];
  const bankTotal = dayBankRows.reduce((s, r) => s + r.amount, 0);
  const recordedNonCash = dayTx.filter(t => t.type === 'income' && !['cash', 'card', 'deposit'].includes(t.payment_method)).reduce((s, t) => s + t.amount, 0);
  const diff = recordedNonCash - bankTotal;
  const unmatched = dayBankRows.filter(r => !r.matched);

  const shiftClosure = dayClosures.find(c => c.date === opDate);

  // Вчерашняя оплата нашлась после закрытия смены → перенос на сегодня
  const moveToToday = (t) => {
    db.moveTxToToday(t);
    showToast(`«${catName(t.category_id)} ${fmt(t.amount)} ₽» перенесена на сегодня ↪`);
  };

  // Разбивка по картам: сколько переводов пришло на каждую карту за день
  const byCard = banks
    .map(b => ({ ...b, sum: dayTx.filter(t => t.type === 'income' && t.payment_method === 'transfer' && t.bank_id === b.id).reduce((s, t) => s + t.amount, 0) }))
    .filter(b => b.sum > 0);
  const cardMax = Math.max(1, ...byCard.map(b => b.sum));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Финансы</h1>
        {/* История дней: листаем стрелками или выбираем дату */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          <button onClick={() => shiftDay(-1)} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 14 }}>←</button>
          <span style={{ fontWeight: 800, fontSize: 14, padding: '0 10px', minWidth: 110, textAlign: 'center' }}>
            {RU_DATE(opDate)}{isToday ? ' · сегодня' : ''}
          </span>
          <button onClick={() => shiftDay(1)} disabled={isToday} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 14, opacity: isToday ? 0.3 : 1 }}>→</button>
          <input type="date" value={opDate} max={db.today} onChange={e => e.target.value && setOpDate(e.target.value)} style={{
            border: 'none', background: UI.soft, borderRadius: 999, padding: '7px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
          }} />
        </div>
        <button onClick={() => setShowAddOp(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Операция</button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <BigStat label="Доходы за день" value={`${fmt(income)} ₽`} UI={UI} />
        <BigStat label="Расходы за день" value={`${fmt(expense)} ₽`} UI={UI} />
        <BigStat label={`Наличных в кассе (утро ${fmt(carry)} ₽ + день)`} value={`${fmt(carry + cashIn - cashOut)} ₽`} UI={UI} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Левая колонка: лента операций (скроллится) + крупные/личные/карты в ряд под ней */}
        <div style={{ flex: 2, minWidth: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800 }}>Операции за день · {dailyTx.length}</span>
            <input value={txQuery} onChange={e => setTxQuery(e.target.value)} placeholder="Поиск: категория, коммент, кто" style={{
              marginLeft: 'auto', width: 'min(210px, 100%)', padding: '8px 14px', borderRadius: 999,
              border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 12.5, outline: 'none',
            }} />
            {[['income', 'income'], ['expense', 'expense']].map(([k, icon]) => (
              <button key={k} onClick={() => setTxType(v => v === k ? '' : k)} title={k === 'income' ? 'Только доходы' : 'Только расходы'} style={{
                border: 'none', borderRadius: 999, padding: '7px 11px', fontSize: 13,
                background: txType === k ? UI.dark : UI.soft,
              }}><I n={icon} size={14} /></button>
            ))}
          </div>
          {/* Фильтр по способам оплаты — из того, что есть в дне */}
          {dailyTx.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <button onClick={() => setTxMethod('')} style={{
                border: 'none', borderRadius: 999, padding: '6px 13px', fontSize: 12, fontWeight: 700,
                background: txMethod === '' ? UI.dark : UI.soft, color: txMethod === '' ? '#fff' : UI.dark,
              }}>Все</button>
              {PAYMENT_METHODS.filter(m => dailyTx.some(t => t.payment_method === m.key)).map(m => {
                const sum = dailyTx.filter(t => t.payment_method === m.key && t.type === 'income').reduce((s, t) => s + t.amount, 0);
                return (
                  <button key={m.key} onClick={() => setTxMethod(v => v === m.key ? '' : m.key)} style={{
                    border: 'none', borderRadius: 999, padding: '6px 13px', fontSize: 12, fontWeight: 700,
                    background: txMethod === m.key ? UI.dark : UI.soft, color: txMethod === m.key ? '#fff' : UI.dark,
                  }}>{m.label} · {fmt(sum)} ₽</button>
                );
              })}
            </div>
          )}
          <div style={{ maxHeight: 430, overflowY: 'auto', paddingRight: 6 }}>
          {dailyTx.filter(t => {
            const q = txQuery.trim().toLowerCase();
            const label = (t.category_id ? catName(t.category_id) : 'депозит') + ' ' + (t.comment || '') + ' ' + t.created_by;
            return (!q || label.toLowerCase().includes(q)) && (!txType || t.type === txType) && (!txMethod || t.payment_method === txMethod);
          }).map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14, flexWrap: 'wrap' }}>
              <I n={t.type === 'income' ? 'income' : 'expense'} size={14} style={{ color: t.type === 'income' ? '#8a8a85' : '#c0392b' }} />
              <span style={{ fontWeight: 600 }}>{t.category_id ? catName(t.category_id) : 'Оплата с депозита'}</span>
              {t.moved_from && <span style={{ background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>↪ со вчера</span>}
              <span style={{ background: UI.soft, borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                {mLabel(t.payment_method)}{t.bank_id ? ` · ${bankName(t.bank_id)}` : ''}
              </span>
              {t.task_id && (
                <span style={{ background: 'rgba(247,214,74,.35)', borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                  <I n="link" size={11} /> {taskTitle(t.task_id)}
                </span>
              )}
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: t.type === 'expense' ? '#c0392b' : UI.dark }}>
                {t.type === 'expense' ? '−' : '+'}{fmt(t.amount)} ₽
              </span>
              <span title={`Записал(а): ${t.created_by}`} style={{
                width: 26, height: 26, borderRadius: '50%', background: UI.accent, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{t.created_by[0]}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.time}</span>
              {!isToday && t.type === 'income' && (
                <button onClick={() => moveToToday(t)} title="Перенести на сегодня" style={{
                  border: 'none', background: UI.soft, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                }}>↪ на сегодня</button>
              )}
              {t.log?.length > 0 && (
                <button onClick={() => setHistoryTxId(v => v === t.id ? null : t.id)} title="История записи" style={{
                  border: 'none', background: historyTxId === t.id ? UI.dark : UI.soft, color: historyTxId === t.id ? '#fff' : UI.dark,
                  borderRadius: 999, padding: '4px 9px', fontSize: 11.5, cursor: 'pointer',
                }}><I n="clock" size={11} /></button>
              )}
              <button onClick={() => openTxEdit(t)} title="Исправить (дата, сумма, категория…)" style={{
                border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 9px', fontSize: 11.5, cursor: 'pointer',
              }}><I n="pencil" size={11} /></button>
              <button onClick={() => { db.removeTransaction(t); showToast('Операция удалена'); }} title="Удалить" style={{
                border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 9px', fontSize: 11.5, color: UI.muted, cursor: 'pointer',
              }}>✕</button>
              {historyTxId === t.id && t.log?.length > 0 && (
                <div style={{ width: '100%', background: UI.soft, borderRadius: 12, padding: '6px 12px', marginTop: 6, fontSize: 12.5 }}>
                  {t.log.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0' }}>
                      <b>{l.who}</b><span>{l.action}</span><span style={{ marginLeft: 'auto', color: UI.muted }}>{l.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!dailyTx.length && <div style={{ color: UI.muted, fontSize: 14 }}>Записей за этот день нет</div>}
          </div>
        </div>

        {/* Крупные, личные и переводы по картам — в ряд под операциями (просьба Кристи 2026-07-16) */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* Крупные рабочие расходы — вне дня и кассы, чтобы сверка не уходила в минус */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 22, flex: 1, minWidth: 205 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <I n="box" size={15} /> Крупные расходы
            <span style={{ marginLeft: 'auto', fontSize: 17 }}>{fmt(bigTotal)} ₽</span>
          </div>
          <div style={{ color: UI.muted, fontSize: 12, marginBottom: 8 }}>В расход дня и кассу не входят — учитываются в месяце</div>
          {bigTx.length ? bigTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              <span style={{ color: UI.muted, fontSize: 12 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>−{fmt(t.amount)} ₽</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13 }}>Без крупных расходов</div>}
        </div>

        {/* Личные расходы — видит только Кристи, в бизнес-итоги не входят */}
        <div style={{ background: 'rgba(247,214,74,.18)', border: `1.5px solid ${UI.accent}`, borderRadius: 26, padding: 22, flex: 1, minWidth: 205 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <I n="lock" size={15} /> Личные
            <span style={{ marginLeft: 'auto', fontSize: 17 }}>{fmt(personalTotal)} ₽</span>
          </div>
          <div style={{ color: UI.muted, fontSize: 12, marginBottom: 8 }}>Видишь только ты. В расходы бизнеса не входят</div>
          {personalTx.length ? personalTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{t.comment || catName(t.category_id)}</span>
              <span style={{ background: '#fff', borderRadius: 999, padding: '2px 9px', fontSize: 11.5 }}>{mLabel(t.payment_method)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>−{fmt(t.amount)} ₽</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13 }}>Без личных трат</div>}
        </div>

        {/* Разбивка по картам: на какие карты пришли переводы за день */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 22, flex: 1, minWidth: 205 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}><I n="card" size={15} /> Переводы по картам</div>
          {byCard.length ? byCard.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13 }}>
              <span style={{ fontWeight: 700, width: 58 }}>{b.name}</span>
              <div style={{ flex: 1, height: 16, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(b.sum / cardMax) * 100}%`, height: '100%', background: UI.accent, borderRadius: 999 }} />
              </div>
              <span style={{ fontWeight: 700, width: 70, textAlign: 'right' }}>{fmt(b.sum)} ₽</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13 }}>Переводов за этот день нет</div>}
        </div>
        </div>
        </div>

        <div style={{ background: UI.dark, color: '#fff', borderRadius: 26, padding: 26, flex: 1, minWidth: 320 }}>
          {shiftClosure && (
            <div style={{ background: 'rgba(247,214,74,.2)', border: '1px solid #f7d64a', borderRadius: 14, padding: '10px 14px', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
              ✓ Смена закрыта · {shiftClosure.closed_by} · остаток {fmt(shiftClosure.cash_fact)} ₽ · разница {shiftClosure.diff > 0 ? '+' : ''}{fmt(shiftClosure.diff)} ₽
            </div>
          )}
          <div style={{ fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Сверка дня
            <span style={{ marginLeft: 'auto', background: diff === 0 && !unmatched.length ? UI.accent : '#c0392b', color: diff === 0 && !unmatched.length ? UI.dark : '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 800 }}>
              {diff === 0 && !unmatched.length ? 'всё сходится' : 'есть расхождения'}
            </span>
          </div>
          <DarkRow label="Пришло на счёт (по банку)" value={`${fmt(bankTotal)} ₽`} />
          <DarkRow label="Записано переводов/СБП" value={`${fmt(recordedNonCash)} ₽`} />
          <DarkRow label="Разница" value={`${diff > 0 ? '+' : ''}${fmt(diff)} ₽`} accent={diff !== 0} UI={UI} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,.15)', margin: '14px 0' }} />
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>Пришло, но не записано:</div>
          {unmatched.map(r => (
            <div key={r.id} style={{ background: 'rgba(247,214,74,.15)', border: `1px solid ${UI.accent}`, borderRadius: 14, padding: '10px 14px', fontSize: 13, marginBottom: 8 }}>
              <I n="alert" size={12} /> <b>{fmt(r.amount)} ₽</b> · {r.description}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <input placeholder="Остаток в кассе, ₽" style={{
              flex: 1, padding: '12px 16px', borderRadius: 999, border: 'none', outline: 'none', fontSize: 14, background: 'rgba(255,255,255,.12)', color: '#fff', minWidth: 0,
            }} />
            <button style={{ border: 'none', background: UI.accent, color: UI.dark, borderRadius: 999, padding: '12px 20px', fontWeight: 800, fontSize: 14 }}>
              Закрыть день
            </button>
          </div>
        </div>

      </div>

      {/* Модалка правки операции */}
      {editTx && (
        <div onClick={() => setEditTx(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Правка операции</span>
              <button onClick={() => setEditTx(null)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 -6px 6px' }}>Дата операции</div>
            <input type="date" max={db.today} value={eDate} onChange={e => setEDate(e.target.value)} style={{
              width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, outline: 'none',
            }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={eCat} onChange={e => setECat(e.target.value)} style={{
                flex: 1.4, minWidth: 0, padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, outline: 'none',
              }}>
                <option value="">Категория…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="number" value={eSum} onChange={e => setESum(e.target.value)} placeholder="Сумма" style={{
                flex: 1, minWidth: 0, padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 15, fontWeight: 700, outline: 'none',
              }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PAYMENT_METHODS.filter(m => m.key !== 'deposit' || eMethod === 'deposit').map(m => (
                <button key={m.key} onClick={() => setEMethod(m.key)} style={{
                  border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 600,
                  background: eMethod === m.key ? UI.accent : UI.soft,
                }}>{m.label}</button>
              ))}
            </div>
            {eMethod === 'transfer' && (
              <select value={eBank} onChange={e => setEBank(e.target.value)} style={{
                width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, outline: 'none',
              }}>
                <option value="">На какую карту (банк)…</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <input value={eComment} onChange={e => setEComment(e.target.value)} placeholder="Комментарий" style={{
              width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, outline: 'none',
            }} />
            <button onClick={saveTxEdit} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Сохранить (в историю запишется, что изменилось)
            </button>
          </div>
        </div>
      )}

      {/* Модалка «+ Операция» — та же форма, но со всеми категориями владельца */}
      {showAddOp && (
        <div onClick={() => setShowAddOp(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новая операция</span>
              <button onClick={() => setShowAddOp(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <EntryForm {...props} isOwner onSave={async (recs) => {
              const ok = await db.addTransactions(recs);
              if (ok) {
                setShowAddOp(false);
                showToast(recs.length > 1 ? `Записано ${recs.length} статьями ✓` : 'Записано ✓');
              }
              return ok;
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function BigStat({ label, value, UI }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: '20px 28px', flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ color: UI.muted, fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DarkRow({ label, value, accent, UI }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 800, color: accent ? (UI?.accent || '#f7d64a') : '#fff' }}>{value}</span>
    </div>
  );
}
