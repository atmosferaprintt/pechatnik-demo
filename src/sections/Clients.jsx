// Раздел «Клиенты» — база списком + карточка клиента с историей (задачи, оплаты, долг).
// Фильтр «должники» показывает только клиентов с незакрытыми долгами. Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';

const fmt = (n) => (n || 0).toLocaleString('ru-RU');
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const inpC = (UI) => ({
  width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`,
  background: UI.soft, fontSize: 14, outline: 'none',
});

export default function Clients({ clients, tasks, transactions, categories, db, UI, showToast }) {
  const [query, setQuery] = useState('');
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [openClient, setOpenClient] = useState(null);
  const [priceWhat, setPriceWhat] = useState('');
  const [priceVal, setPriceVal] = useState('');
  // Форма нового клиента
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nInsta, setNInsta] = useState('');
  const [nNote, setNNote] = useState('');

  const createClient = async () => {
    if (!nName.trim()) { showToast('Укажи имя клиента', 'error'); return; }
    const norm = nPhone.replace(/\D/g, '').slice(-10);
    if (norm && clients.some(c => c.phone_norm === norm)) { showToast('Клиент с таким телефоном уже есть', 'error'); return; }
    const created = await db.addClient({ name: nName.trim(), phone: nPhone.trim(), instagram: nInsta.trim(), note: nNote.trim() });
    if (!created) return;
    setShowNew(false); setNName(''); setNPhone(''); setNInsta(''); setNNote('');
    showToast(`Клиент «${created.name}» добавлен ✓`);
  };

  const addPrice = (c) => {
    if (!priceWhat.trim() || !priceVal.trim()) { showToast('Заполни «что» и «цену»', 'error'); return; }
    db.updateClientPrices(c, [...(c.prices || []), { what: priceWhat.trim(), price: priceVal.trim() }]);
    setPriceWhat(''); setPriceVal('');
    showToast('Цена записана ✓');
  };

  const removePrice = (c, i) => {
    db.updateClientPrices(c, c.prices.filter((_, idx) => idx !== i));
  };

  const clientTasks = (id) => tasks.filter(t => t.client_id === id);
  const clientPayments = (id) => {
    const taskIds = new Set(clientTasks(id).map(t => t.id));
    return transactions.filter(t => t.type === 'income' && (t.client_id === id || taskIds.has(t.task_id)));
  };
  const paidByTask = (taskId) => transactions.filter(t => t.task_id === taskId && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const clientDebt = (id) => clientTasks(id).reduce((s, t) => s + Math.max(0, (t.amount || 0) - paidByTask(t.id)), 0);
  const clientTotal = (id) => clientPayments(id).reduce((s, t) => s + t.amount, 0);
  const catName = (id) => categories.find(c => c.id === id)?.name || '?';

  const filtered = clients.filter(c =>
    (c.name + c.phone + (c.instagram || '')).toLowerCase().includes(query.toLowerCase())
    && (!debtorsOnly || clientDebt(c.id) > 0)
  );

  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 12.5, color: UI.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
  const td = { padding: '13px 14px', fontSize: 14, borderTop: `1px solid ${UI.line}` };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Клиенты</h1>
        <span style={{ color: UI.muted, fontSize: 14, fontWeight: 600 }}>{clients.length} всего</span>
        <button onClick={() => setDebtorsOnly(v => !v)} className={debtorsOnly ? undefined : undefined} style={{
          border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 13.5, fontWeight: 700,
          background: debtorsOnly ? '#c0392b' : '#fff', color: debtorsOnly ? '#fff' : UI.dark, boxShadow: UI.shadow,
        }}>Должники</button>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по имени, телефону, инстаграму"
          style={{
            marginLeft: 'auto', width: 'min(300px, 100%)', padding: '12px 20px', borderRadius: 999, border: 'none',
            background: '#fff', boxShadow: UI.shadow, fontSize: 14, outline: 'none',
          }}
        />
        <button onClick={() => setShowNew(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14,
        }}>+ Клиент</button>
      </div>

      {/* Модалка нового клиента */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новый клиент</span>
              <button onClick={() => setShowNew(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={inpC(UI)} placeholder="Имя (Мадина · салон «Жасмин»)" value={nName} onChange={e => setNName(e.target.value)} />
            <input style={inpC(UI)} placeholder="Телефон" value={nPhone} onChange={e => setNPhone(e.target.value)} />
            <input style={inpC(UI)} placeholder="Инстаграм (@…)" value={nInsta} onChange={e => setNInsta(e.target.value)} />
            <input style={inpC(UI)} placeholder="Заметка (постоянная, бирки каждый месяц…)" value={nNote} onChange={e => setNNote(e.target.value)} />
            <button onClick={createClient} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Добавить
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 46 }}></th>
              <th style={th}>Имя</th>
              <th style={th}>Телефон</th>
              <th style={th}>Инстаграм</th>
              <th style={{ ...th, textAlign: 'center' }}>Задачи</th>
              <th style={{ ...th, textAlign: 'right' }}>Оплатил всего</th>
              <th style={{ ...th, textAlign: 'right' }}>Долг</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const debt = clientDebt(c.id);
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }}
                  onClick={() => setOpenClient(c)}
                  onMouseEnter={e => e.currentTarget.style.background = UI.soft}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, paddingRight: 0 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: '50%', background: UI.accent, color: UI.dark,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14,
                    }}>{c.name[0]}</span>
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>
                    {c.name}
                    {(c.prices || []).length > 0 && <span title="Есть индивидуальные цены" style={{ marginLeft: 8, background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontWeight: 800 }}><I n="percent" size={10} /> цены</span>}
                  </td>
                  <td style={td}>{c.phone}</td>
                  <td style={td}>{c.instagram ? <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 12px', fontSize: 12.5 }}>{c.instagram}</span> : <span style={{ color: UI.muted }}>—</span>}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ background: clientTasks(c.id).length ? UI.dark : UI.soft, color: clientTasks(c.id).length ? '#fff' : UI.muted, borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>
                      {clientTasks(c.id).length}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmt(clientTotal(c.id))} ₽</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {debt > 0
                      ? <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>{fmt(debt)} ₽</span>
                      : <span style={{ color: UI.muted }}>—</span>}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={7} style={{ ...td, color: UI.muted }}>{debtorsOnly ? 'Должников нет' : `Никого не нашла по «${query}»`}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Карточка клиента */}
      {openClient && (() => {
        const c = clients.find(x => x.id === openClient.id) || openClient;
        const ct = clientTasks(c.id);
        const cp = clientPayments(c.id);
        const debt = clientDebt(c.id);
        return (
          <div onClick={() => setOpenClient(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 28, width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <span style={{
                  width: 52, height: 52, borderRadius: '50%', background: UI.accent, color: UI.dark,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20,
                }}>{c.name[0]}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{c.name}</div>
                  <div style={{ color: UI.muted, fontSize: 13.5 }}>{c.phone}{c.instagram ? ` · ${c.instagram}` : ''}</div>
                </div>
                <button onClick={() => setOpenClient(null)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <Mini label="Оплатил всего" value={`${fmt(clientTotal(c.id))} ₽`} UI={UI} />
                <Mini label="Задач" value={ct.length} UI={UI} />
                <Mini label="Долг" value={debt > 0 ? `${fmt(debt)} ₽` : 'нет'} danger={debt > 0} UI={UI} />
              </div>

              {c.note && <div style={{ background: UI.soft, borderRadius: 14, padding: '11px 14px', fontSize: 13.5, marginBottom: 16 }}><I n="note" size={13} /> {c.note}</div>}

              {/* Индивидуальные цены — чтобы скидки были перед глазами, а не в переписке */}
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}><I n="percent" size={13} /> Индивидуальные цены</div>
              <div style={{ background: 'rgba(247,214,74,.15)', border: `1.5px solid ${UI.accent}`, borderRadius: 16, padding: '8px 14px 12px', marginBottom: 16 }}>
                {(c.prices || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 13.5 }}>
                    <span style={{ fontWeight: 600 }}>{p.what}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{p.price}</span>
                    <button onClick={() => removePrice(c, i)} title="Удалить" style={{ border: 'none', background: 'transparent', color: UI.muted, fontSize: 13, cursor: 'pointer', padding: 2 }}>✕</button>
                  </div>
                ))}
                {!(c.prices || []).length && <div style={{ color: UI.muted, fontSize: 13, padding: '6px 0' }}>Особых цен нет — обычный прайс</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input value={priceWhat} onChange={e => setPriceWhat(e.target.value)} placeholder="Что (бирки атлас…)" style={{
                    flex: 1.3, padding: '10px 12px', borderRadius: 12, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 13, outline: 'none', minWidth: 0,
                  }} />
                  <input value={priceVal} onChange={e => setPriceVal(e.target.value)} placeholder="Цена (15 ₽/шт, −10%…)" style={{
                    flex: 1, padding: '10px 12px', borderRadius: 12, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 13, outline: 'none', minWidth: 0,
                  }} />
                  <button onClick={() => addPrice(c)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 16px', fontWeight: 800, fontSize: 13 }}>+</button>
                </div>
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Задачи</div>
              {ct.length ? ct.map(t => {
                const d = Math.max(0, (t.amount || 0) - paidByTask(t.id));
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{t.title}</span>
                    <span style={{ background: UI.soft, borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>у {t.assignee}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(t.amount)} ₽</span>
                    {d > 0
                      ? <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>долг {fmt(d)}</span>
                      : <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                );
              }) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Задач пока нет</div>}

              <div style={{ fontWeight: 800, fontSize: 14, margin: '16px 0 6px' }}>Оплаты</div>
              {cp.length ? cp.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                  <I n="income" size={13} style={{ color: '#8a8a85' }} />
                  <span style={{ fontWeight: 600 }}>{catName(p.category_id)}</span>
                  <span style={{ color: UI.muted, fontSize: 12.5 }}>{dm(p.op_date)} · {p.created_by}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>+{fmt(p.amount)} ₽</span>
                </div>
              )) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Оплат пока нет</div>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Mini({ label, value, danger, UI }) {
  return (
    <div className={danger ? 'blink' : undefined} style={{
      flex: 1, background: danger ? 'rgba(192,57,43,.12)' : UI.soft,
      border: danger ? '1px solid #c0392b' : 'none', borderRadius: 16, padding: '11px 14px',
    }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: danger ? '#c0392b' : UI.dark }}>{value}</div>
      <div style={{ color: UI.muted, fontSize: 12 }}>{label}</div>
    </div>
  );
}
