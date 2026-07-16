// Раздел «Финансы».
// Сотрудник: форма «ввёл и провалился» — без итогов, видит только свои последние записи.
// Владелец: лента дня, кнопка «+ Операция» (модалка с той же формой + приватные категории),
//           тёмная карточка сверки с разницей ±, расхождения «пришло, но не записано».
// Заглушка на демо-данных.
import { useState } from 'react';

export default function Finance(props) {
  return props.isOwner ? <OwnerView {...props} /> : <EmployeeView {...props} />;
}

const fmt = (n) => (n || 0).toLocaleString('ru-RU');

// ---------- Общая форма записи операции ----------
// У дохода: привязка к задаче (или создание новой задачи на месте) и разбивка суммы
// на несколько статей дохода — просьбы Кристи от 2026-07-15.
function EntryForm({ categories, banks, tasks, setTasks, clients, transactions, PAYMENT_METHODS, UI, currentUser, isOwner, showToast, onSave }) {
  const [type, setType] = useState('income');
  const [scope, setScope] = useState('work'); // для расходов владельца: work | personal
  const [rows, setRows] = useState([{ cat: '', sum: '' }]); // статьи: доход можно разбить на несколько
  const [method, setMethod] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskClient, setNewTaskClient] = useState('');
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

  const kindLabel = { expense_shared: '', expense_work: ' · 🔒 рабочие', expense_personal: '' };

  const activeRows = type === 'income' ? rows : rows.slice(0, 1);
  const total = activeRows.reduce((s, r) => s + (+r.sum || 0), 0);
  const setRow = (i, patch) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const resetForm = () => {
    setRows([{ cat: '', sum: '' }]);
    setComment(''); setTaskId(''); setNewTaskTitle(''); setNewTaskClient('');
  };

  const save = () => {
    const filled = activeRows.filter(r => r.cat && +r.sum > 0);
    if (!filled.length || filled.length !== activeRows.length) { showToast('Заполни категорию и сумму в каждой статье', 'error'); return; }

    // «➕ Новая задача» из привязки — создаём задачу на месте
    let linkTaskId = type === 'income' && taskId && taskId !== '__new' ? +taskId : null;
    if (type === 'income' && taskId === '__new') {
      if (!newTaskTitle.trim()) { showToast('Укажи название новой задачи', 'error'); return; }
      linkTaskId = Math.max(0, ...tasks.map(t => t.id)) + 1;
      setTasks(prev => [...prev, {
        id: linkTaskId, title: newTaskTitle.trim(), client_id: newTaskClient ? +newTaskClient : null,
        stage: 'Новая', amount: total, deadline: null, assignee: currentUser.name,
        created_at: new Date().toISOString().slice(0, 10), description: comment,
        log: [{ who: currentUser.name, action: 'приняла (создана из оплаты)', time: new Date().toTimeString().slice(0, 5) }],
      }]);
    }

    const time = new Date().toTimeString().slice(0, 5);
    const base = Math.max(0, ...transactions.map(t => t.id));
    onSave(filled.map((r, i) => ({
      id: base + i + 1, op_date: '2026-07-14', type, category_id: +r.cat, amount: +r.sum,
      payment_method: method, bank_id: method === 'transfer' ? +bankId || null : null,
      task_id: linkTaskId, created_by: currentUser.name, comment, time,
    })));
    resetForm();
  };

  const input = {
    width: '100%', padding: '13px 16px', borderRadius: 16, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 5 }}>
        {[['income', '💰 Доход'], ['expense', '💸 Расход']].map(([k, l]) => (
          <button key={k} onClick={() => { setType(k); setRows([{ cat: '', sum: '' }]); }} style={{
            flex: 1, border: 'none', borderRadius: 999, padding: '10px 0', fontWeight: 700, fontSize: 14,
            background: type === k ? UI.dark : 'transparent', color: type === k ? '#fff' : UI.dark,
          }}>{l}</button>
        ))}
      </div>

      {/* Владелец при расходе выбирает: рабочий или личный (сотрудники этого не видят) */}
      {isOwner && type === 'expense' && (
        <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 4 }}>
          {[['work', '🏭 Рабочий'], ['personal', '🔒 Личный']].map(([k, l]) => (
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
        {PAYMENT_METHODS.map(m => (
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
            <option value="">🔗 Привязать к задаче (необязательно)…</option>
            <option value="__new">➕ Создать новую задачу…</option>
            {openTasks.map(t => <option key={t.id} value={t.id}>{t.title} · {fmt(t.amount)} ₽</option>)}
          </select>
          {taskId === '__new' && (
            <div style={{ background: 'rgba(247,214,74,.15)', border: `1.5px solid ${UI.accent}`, borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={input} placeholder="Название новой задачи (визитки 500 шт…)" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
              <select style={input} value={newTaskClient} onChange={e => setNewTaskClient(e.target.value)}>
                <option value="">Клиент (необязательно)…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ color: UI.muted, fontSize: 12 }}>Задача появится в твоём задачнике, оплата привяжется к ней сразу</div>
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
const QUICK_OPS = [
  { label: 'Ксерокс 10 ₽', category: 'Ксерокс', amount: 10 },
  { label: 'Ксерокс 20 ₽', category: 'Ксерокс', amount: 20 },
  { label: 'Ксерокс 50 ₽', category: 'Ксерокс', amount: 50 },
  { label: 'Фото док 500 ₽', category: 'Фото на документы', amount: 500 },
];

// ---------- Взгляд сотрудника ----------
// Вид сотрудника (с 2026-07-16, просьба Кристи): доступ к сегодня + вчера,
// закрытие смены и перенос вчерашних оплат на сегодня. Итоги по банку/месяцу — только у Кристи.
function EmployeeView(props) {
  const { transactions, setTransactions, categories, currentUser, dayClosures, setDayClosures, UI, showToast } = props;
  const TODAY_D = '2026-07-14';
  const YESTERDAY_D = '2026-07-13';
  const [opDate, setOpDate] = useState(TODAY_D);
  const [cashFact, setCashFact] = useState('');
  const isToday = opDate === TODAY_D;

  const catName = (id) => categories.find(c => c.id === id)?.name || '?';
  const catKind = (t) => categories.find(c => c.id === t.category_id)?.kind;

  // Девочкам видна операционка дня (без личных и крупных расходов Кристи)
  const dayTx = transactions.filter(t => t.op_date === opDate
    && catKind(t) !== 'expense_personal'
    && !(t.type === 'expense' && catKind(t) === 'expense_work'));
  const cashCalc = dayTx.reduce((s, t) => s + (t.payment_method === 'cash' ? (t.type === 'income' ? t.amount : -t.amount) : 0), 0);
  const closure = dayClosures.find(c => c.date === opDate);

  const quickSave = (q) => {
    const cat = categories.find(c => c.name === q.category);
    if (!cat) return;
    setTransactions(prev => [...prev, {
      id: Math.max(0, ...prev.map(t => t.id)) + 1, op_date: TODAY_D, type: 'income',
      category_id: cat.id, amount: q.amount, payment_method: 'cash', bank_id: null,
      created_by: currentUser.name, comment: '', time: new Date().toTimeString().slice(0, 5),
    }]);
    showToast(`${q.label} — записано ✓`);
  };

  // Вчерашняя оплата пришла/нашлась после закрытия смены → перекидываем на сегодня
  const moveToToday = (t) => {
    setTransactions(prev => prev.map(x => x.id === t.id ? { ...x, op_date: TODAY_D, moved_from: opDate } : x));
    showToast(`«${catName(t.category_id)} ${fmt(t.amount)} ₽» перенесена на сегодня ↪`);
  };

  const closeShift = () => {
    if (cashFact === '') { showToast('Введи фактический остаток в кассе', 'error'); return; }
    const diff = +cashFact - cashCalc;
    setDayClosures(prev => [...prev, { date: opDate, cash_fact: +cashFact, cash_calc: cashCalc, diff, closed_by: currentUser.name }]);
    setCashFact('');
    showToast(diff === 0 ? 'Смена закрыта, касса сошлась ✓' : `Смена закрыта, разница ${diff > 0 ? '+' : ''}${fmt(diff)} ₽`, diff === 0 ? 'ok' : 'error');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Финансы</h1>
        {/* Доступ: только сегодня и вчера */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          {[[TODAY_D, 'Сегодня · 14.07'], [YESTERDAY_D, 'Вчера · 13.07']].map(([d, l]) => (
            <button key={d} onClick={() => setOpDate(d)} style={{
              border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700,
              background: opDate === d ? UI.dark : 'transparent', color: opDate === d ? '#fff' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, width: 'min(420px, 100%)' }}>
          {/* Мелочь одним тапом — наличные */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>⚡ Мелочь одним тапом (нал)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_OPS.map(q => (
                <button key={q.label} onClick={() => quickSave(q)} style={{
                  border: `1.5px solid ${UI.accent}`, background: 'rgba(247,214,74,.18)', borderRadius: 999,
                  padding: '8px 14px', fontSize: 13, fontWeight: 700,
                }}>{q.label}</button>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${UI.line}`, marginBottom: 16 }} />
          <EntryForm {...props} onSave={(recs) => {
            setTransactions(prev => [...prev, ...recs]);
            showToast(recs.length > 1 ? `Записано ${recs.length} статьями ✓` : 'Записано ✓');
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Операции дня — видно всем, чтобы можно было закрыть смену */}
          <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Операции за {isToday ? 'сегодня' : 'вчера'} · {dayTx.length}</div>
            <div style={{ color: UI.muted, fontSize: 13, marginBottom: 14 }}>
              {isToday ? 'Всё, что записано за день — по этому закрывается смена' : 'Вчерашний день: оплату можно перекинуть на сегодня ↪'}
            </div>
            {dayTx.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                <span>{t.type === 'income' ? '💰' : '💸'}</span>
                <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
                {t.moved_from && <span style={{ background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '2px 9px', fontSize: 11.5, fontWeight: 700 }}>↪ со вчера</span>}
                <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.comment}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: t.type === 'expense' ? '#c0392b' : UI.dark }}>
                  {t.type === 'income' ? '+' : '−'}{fmt(t.amount)} ₽
                </span>
                <span title={t.created_by} style={{
                  width: 24, height: 24, borderRadius: '50%', background: t.created_by === currentUser.name ? UI.accent : UI.dark,
                  color: t.created_by === currentUser.name ? UI.dark : '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}>{t.created_by[0]}</span>
                {!isToday && t.type === 'income' && (
                  <button onClick={() => moveToToday(t)} title="Перенести на сегодня" style={{
                    border: 'none', background: UI.soft, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                  }}>↪ на сегодня</button>
                )}
              </div>
            ))}
            {!dayTx.length && <div style={{ color: UI.muted, fontSize: 14 }}>Записей нет</div>}
          </div>

          {/* Закрытие смены */}
          <div style={{ background: UI.dark, color: '#fff', borderRadius: 26, padding: 24 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Закрытие смены · {isToday ? '14.07' : '13.07'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.14)' }}>
              <span style={{ opacity: .75 }}>Наличных за день (расчётно)</span>
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
  const { transactions, setTransactions, categories, banks, tasks, demoBankRows, dayClosures, UI, PAYMENT_METHODS, showToast } = props;
  const [showAddOp, setShowAddOp] = useState(false);
  const [opDate, setOpDate] = useState('2026-07-14'); // история дней: смотрим любой день

  const shiftDay = (dir) => {
    const d = new Date(opDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setOpDate(d.toISOString().slice(0, 10));
  };
  const isToday = opDate === '2026-07-14';

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

  const dailyTx = dayTx.filter(t => !isPersonal(t) && !isBigWork(t)); // лента дня: доходы + операционка
  const bigTx = dayTx.filter(isBigWork);
  const bigTotal = bigTx.reduce((s, t) => s + t.amount, 0);
  const personalTx = dayTx.filter(isPersonal);
  const personalTotal = personalTx.reduce((s, t) => s + t.amount, 0);

  const income = dailyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = dailyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  // Касса дня: наличные приходы минус наличная операционка (крупные и личные кассу дня не трогают)
  const cashIn = dailyTx.filter(t => t.type === 'income' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);
  const cashOut = dailyTx.filter(t => t.type === 'expense' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);

  // Выписка в демо есть только за «сегодня»
  const dayBankRows = isToday ? demoBankRows : [];
  const bankTotal = dayBankRows.reduce((s, r) => s + r.amount, 0);
  const recordedNonCash = dayTx.filter(t => t.type === 'income' && t.payment_method !== 'cash' && t.payment_method !== 'card').reduce((s, t) => s + t.amount, 0);
  const diff = recordedNonCash - bankTotal;
  const unmatched = dayBankRows.filter(r => !r.matched);

  const shiftClosure = dayClosures.find(c => c.date === opDate);

  // Вчерашняя оплата нашлась после закрытия смены → перенос на сегодня
  const moveToToday = (t) => {
    setTransactions(prev => prev.map(x => x.id === t.id ? { ...x, op_date: '2026-07-14', moved_from: opDate } : x));
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
          <input type="date" value={opDate} max="2026-07-14" onChange={e => e.target.value && setOpDate(e.target.value)} style={{
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
        <BigStat label="Наличных в кассе (расчётно)" value={`${fmt(cashIn - cashOut)} ₽`} UI={UI} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, flex: 2, minWidth: 380 }}>
          <div style={{ fontWeight: 800, marginBottom: 14 }}>Операции за день · {dailyTx.length}</div>
          {dailyTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14, flexWrap: 'wrap' }}>
              <span>{t.type === 'income' ? '💰' : '💸'}</span>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              {t.moved_from && <span style={{ background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>↪ со вчера</span>}
              <span style={{ background: UI.soft, borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                {mLabel(t.payment_method)}{t.bank_id ? ` · ${bankName(t.bank_id)}` : ''}
              </span>
              {t.task_id && (
                <span style={{ background: 'rgba(247,214,74,.35)', borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>
                  🔗 {taskTitle(t.task_id)}
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
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: UI.dark, color: '#fff', borderRadius: 26, padding: 26 }}>
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
              ⚠️ <b>{fmt(r.amount)} ₽</b> · {r.description}
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

        {/* Крупные рабочие расходы — вне дня и кассы, чтобы сверка не уходила в минус */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            📦 Крупные расходы
            <span style={{ marginLeft: 'auto', fontSize: 18 }}>{fmt(bigTotal)} ₽</span>
          </div>
          <div style={{ color: UI.muted, fontSize: 12.5, marginBottom: 10 }}>Бумага, тонер, поставщики. В расход дня и кассу не входят — учитываются в месяце.</div>
          {bigTx.length ? bigTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>−{fmt(t.amount)} ₽</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.time}</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Без крупных расходов</div>}
        </div>

        {/* Личные расходы — видит только Кристи, в бизнес-итоги не входят */}
        <div style={{ background: 'rgba(247,214,74,.18)', border: `1.5px solid ${UI.accent}`, borderRadius: 26, padding: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            🔒 Личные
            <span style={{ marginLeft: 'auto', fontSize: 18 }}>{fmt(personalTotal)} ₽</span>
          </div>
          <div style={{ color: UI.muted, fontSize: 12.5, marginBottom: 10 }}>Видишь только ты. В расходы бизнеса не входят.</div>
          {personalTx.length ? personalTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{t.comment || catName(t.category_id)}</span>
              <span style={{ background: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>{mLabel(t.payment_method)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>−{fmt(t.amount)} ₽</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.time}</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Без личных трат</div>}
        </div>

        {/* Разбивка по картам: на какие карты пришли переводы за день */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>💳 Переводы по картам</div>
          {byCard.length ? byCard.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13.5 }}>
              <span style={{ fontWeight: 700, width: 66 }}>{b.name}</span>
              <div style={{ flex: 1, height: 18, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(b.sum / cardMax) * 100}%`, height: '100%', background: UI.accent, borderRadius: 999 }} />
              </div>
              <span style={{ fontWeight: 700, width: 76, textAlign: 'right' }}>{fmt(b.sum)} ₽</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Переводов за этот день нет</div>}
        </div>
        </div>
      </div>

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
            <EntryForm {...props} isOwner onSave={(recs) => {
              setTransactions(prev => [...prev, ...recs]);
              setShowAddOp(false);
              showToast(recs.length > 1 ? `Записано ${recs.length} статьями ✓` : 'Записано ✓');
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
