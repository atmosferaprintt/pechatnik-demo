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
// У дохода можно (необязательно) привязать задачу — «менеджер связывает приход с задачей».
function EntryForm({ categories, banks, tasks, PAYMENT_METHODS, UI, currentUser, isOwner, showToast, onSave }) {
  const [type, setType] = useState('income');
  const [scope, setScope] = useState('work'); // для расходов владельца: work | personal
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [bankId, setBankId] = useState('');
  const [taskId, setTaskId] = useState('');
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
  const openTasks = tasks.filter(t => t.assignee !== 'Сборка');

  const kindLabel = { expense_shared: '', expense_work: ' · 🔒 рабочие', expense_personal: '' };

  const save = () => {
    if (!categoryId || !amount) { showToast('Заполни категорию и сумму', 'error'); return; }
    onSave({
      id: Date.now(), op_date: '2026-07-14', type, category_id: +categoryId, amount: +amount,
      payment_method: method, bank_id: method === 'transfer' ? +bankId || null : null,
      task_id: type === 'income' && taskId ? +taskId : null,
      created_by: currentUser.name, comment, time: new Date().toTimeString().slice(0, 5),
    });
    setAmount(''); setComment(''); setCategoryId(''); setTaskId('');
  };

  const input = {
    width: '100%', padding: '13px 16px', borderRadius: 16, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 5 }}>
        {[['income', '💰 Доход'], ['expense', '💸 Расход']].map(([k, l]) => (
          <button key={k} onClick={() => { setType(k); setCategoryId(''); }} style={{
            flex: 1, border: 'none', borderRadius: 999, padding: '10px 0', fontWeight: 700, fontSize: 14,
            background: type === k ? UI.dark : 'transparent', color: type === k ? '#fff' : UI.dark,
          }}>{l}</button>
        ))}
      </div>

      {/* Владелец при расходе выбирает: рабочий или личный (сотрудники этого не видят) */}
      {isOwner && type === 'expense' && (
        <div style={{ display: 'flex', background: UI.soft, borderRadius: 999, padding: 4 }}>
          {[['work', '🏭 Рабочий'], ['personal', '🔒 Личный']].map(([k, l]) => (
            <button key={k} onClick={() => { setScope(k); setCategoryId(''); }} style={{
              flex: 1, border: 'none', borderRadius: 999, padding: '8px 0', fontWeight: 700, fontSize: 13,
              background: scope === k ? (k === 'personal' ? UI.accent : UI.dark) : 'transparent',
              color: scope === k && k !== 'personal' ? '#fff' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
      )}

      <select style={input} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="">Категория…</option>
        {visibleCats.map(c => <option key={c.id} value={c.id}>{c.name}{kindLabel[c.kind] || ''}</option>)}
      </select>

      <input style={{ ...input, fontSize: 22, fontWeight: 700 }} type="number" placeholder="Сумма, ₽"
        value={amount} onChange={e => setAmount(e.target.value)} />

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
        <select style={input} value={taskId} onChange={e => setTaskId(e.target.value)}>
          <option value="">🔗 Привязать к задаче (необязательно)…</option>
          {openTasks.map(t => <option key={t.id} value={t.id}>{t.title} · {fmt(t.amount)} ₽</option>)}
        </select>
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
function EmployeeView(props) {
  const { transactions, setTransactions, categories, currentUser, UI, showToast } = props;
  const myToday = transactions.filter(t => t.created_by === currentUser.name);
  const catName = (id) => categories.find(c => c.id === id)?.name || '?';

  const quickSave = (q) => {
    const cat = categories.find(c => c.name === q.category);
    if (!cat) return;
    setTransactions(prev => [...prev, {
      id: Date.now(), op_date: new Date().toISOString().slice(0, 10), type: 'income',
      category_id: cat.id, amount: q.amount, payment_method: 'cash', bank_id: null,
      created_by: currentUser.name, comment: '', time: new Date().toTimeString().slice(0, 5),
    }]);
    showToast(`${q.label} — записано ✓`);
  };

  return (
    <div>
      <h1 style={{ fontSize: 34, fontWeight: 500, margin: '4px 0 20px' }}>Финансы</h1>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, width: 420 }}>
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
          <EntryForm {...props} onSave={(rec) => { setTransactions(prev => [...prev, rec]); showToast('Записано ✓'); }} />
        </div>

        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, flex: 1, minWidth: 320 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Мои записи за сегодня</div>
          <div style={{ color: UI.muted, fontSize: 13, marginBottom: 14 }}>Только твои. Итоги видит только Кристи 🙈</div>
          {myToday.length ? myToday.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span>{t.type === 'income' ? '💰' : '💸'}</span>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(t.amount)} ₽</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.time}</span>
            </div>
          )) : <div style={{ color: UI.muted, fontSize: 14 }}>Пока пусто — запиши первую операцию</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- Взгляд владельца ----------
const RU_DATE = (d) => `${+d.slice(8, 10)} ${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][+d.slice(5, 7) - 1]}`;

function OwnerView(props) {
  const { transactions, setTransactions, categories, banks, tasks, demoBankRows, UI, PAYMENT_METHODS, showToast } = props;
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

  // Личные расходы Кристи — отдельно от бизнеса (как в её Excel: блок «личные» внизу).
  // В «Расходы за день» и общую ленту НЕ входят; наличные личные из кассы в кассе учитываются.
  const isPersonal = (t) => categories.find(c => c.id === t.category_id)?.kind === 'expense_personal';
  const businessTx = dayTx.filter(t => !isPersonal(t));
  const personalTx = dayTx.filter(isPersonal);
  const personalTotal = personalTx.reduce((s, t) => s + t.amount, 0);

  const income = businessTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = businessTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const cashIn = dayTx.filter(t => t.type === 'income' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);
  const cashOut = dayTx.filter(t => t.type === 'expense' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);

  // Выписка в демо есть только за «сегодня»
  const dayBankRows = isToday ? demoBankRows : [];
  const bankTotal = dayBankRows.reduce((s, r) => s + r.amount, 0);
  const recordedNonCash = dayTx.filter(t => t.type === 'income' && t.payment_method !== 'cash' && t.payment_method !== 'card').reduce((s, t) => s + t.amount, 0);
  const diff = recordedNonCash - bankTotal;
  const unmatched = dayBankRows.filter(r => !r.matched);

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
          <div style={{ fontWeight: 800, marginBottom: 14 }}>Операции за день · {businessTx.length}</div>
          {businessTx.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14, flexWrap: 'wrap' }}>
              <span>{t.type === 'income' ? '💰' : '💸'}</span>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
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
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: UI.dark, color: '#fff', borderRadius: 26, padding: 26 }}>
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
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новая операция</span>
              <button onClick={() => setShowAddOp(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <EntryForm {...props} isOwner onSave={(rec) => {
              setTransactions(prev => [...prev, rec]);
              setShowAddOp(false);
              showToast('Записано ✓');
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
