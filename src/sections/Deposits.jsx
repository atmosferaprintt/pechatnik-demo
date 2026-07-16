// Раздел «Депозиты» — бюджетники вносят сумму и расходуют частями.
// Карточка: имя, внесено, остаток; списания (дата, что, сумма). К списанию можно привязать задачу —
// тогда создаётся оплата способом «Депозит» и долг задачи гаснет (в доходы дня и сверку не входит).
// Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';

const fmt = (n) => (n || 0).toLocaleString('ru-RU');
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = new Date().toISOString().slice(0, 10);
const FIN_DAY = '2026-07-14'; // демо-день финансов

export default function Deposits({ deposits, tasks, manualDebts, db, UI, showToast }) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [useFor, setUseFor] = useState(null); // id депозита, для которого открыта форма списания
  const [useWhat, setUseWhat] = useState('');
  const [useAmount, setUseAmount] = useState('');
  const [useTaskId, setUseTaskId] = useState('');
  const [topUpFor, setTopUpFor] = useState(null); // id депозита с открытой формой пополнения
  const [topUpSum, setTopUpSum] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  // Должники по мелочи (переехали сюда из Задач по просьбе Кристи)
  const [newDebtorName, setNewDebtorName] = useState('');
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [mdForm, setMdForm] = useState(null); // { debtId, sign: -1 | 1 }
  const [mdWhat, setMdWhat] = useState('');
  const [mdAmount, setMdAmount] = useState('');
  const [mdEditId, setMdEditId] = useState(null);
  const [mdEditName, setMdEditName] = useState('');

  const mdBalance = (d) => d.entries.reduce((s, e) => s + e.amount, 0);
  const mdTotal = manualDebts.reduce((s, d) => s + Math.min(0, mdBalance(d)), 0);

  const addDebtor = () => {
    if (!newDebtorName.trim()) { showToast('Укажи имя', 'error'); return; }
    db.addDebtor(newDebtorName.trim());
    setNewDebtorName(''); setShowAddDebtor(false);
    showToast('Должник добавлен ✓');
  };

  const addDebtEntry = (d) => {
    if (!+mdAmount) { showToast('Укажи сумму', 'error'); return; }
    db.addDebtEntry(d, { what: mdWhat.trim() || (mdForm.sign > 0 ? 'оплата' : ''), amount: mdForm.sign * Math.abs(+mdAmount) });
    setMdForm(null); setMdWhat(''); setMdAmount('');
    showToast(mdForm.sign > 0 ? 'Оплата записана ✓' : 'Записано в долг ✓');
  };

  const removeDebtor = (d) => {
    db.removeDebtor(d);
    showToast(`«${d.name}» — удалён из должников`);
  };

  const renameDebtor = (d) => {
    if (!mdEditName.trim()) { showToast('Имя не может быть пустым', 'error'); return; }
    db.renameDebtor(d, mdEditName.trim());
    setMdEditId(null);
    showToast('Имя исправлено ✓');
  };

  const rename = (d) => {
    if (!editName.trim()) { showToast('Имя не может быть пустым', 'error'); return; }
    db.renameDeposit(d, editName.trim());
    setEditId(null);
    showToast('Имя исправлено ✓');
  };

  const removeDeposit = (d) => {
    db.removeDeposit(d);
    showToast(`Депозит «${d.name}» удалён`);
  };

  const spent = (d) => d.uses.reduce((s, u) => s + u.amount, 0);
  const left = (d) => d.total - spent(d);
  const taskTitle = (id) => tasks.find(t => t.id === id)?.title;
  const openTasks = tasks.filter(t => !t.done);

  const filtered = deposits.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));

  const addDeposit = () => {
    if (!name.trim() || !+total) { showToast('Укажи имя и сумму', 'error'); return; }
    db.addDeposit({ name: name.trim(), total: +total });
    setName(''); setTotal(''); setShowAdd(false);
    showToast('Депозит заведён ✓');
  };

  const addUse = (d) => {
    if (!useWhat.trim() && !useTaskId) { showToast('Укажи что заказали (или выбери задачу)', 'error'); return; }
    if (!+useAmount) { showToast('Укажи сумму', 'error'); return; }
    if (+useAmount > left(d)) { showToast(`На депозите только ${fmt(left(d))} ₽`, 'error'); return; }
    const taskId = useTaskId ? +useTaskId : null;
    const what = useWhat.trim() || taskTitle(taskId) || '';
    // Привязана задача → db создаст и оплату способом «Депозит»: долг задачи гаснет,
    // но в доходы дня и сверку это не попадает (деньги пришли при внесении депозита)
    db.addDepositUse(d, { what, amount: +useAmount, taskId });
    setUseWhat(''); setUseAmount(''); setUseTaskId(''); setUseFor(null);
    showToast(taskId ? 'Списано, оплата привязана к задаче ✓' : 'Списание записано ✓');
  };

  const topUp = (d) => {
    if (!+topUpSum) { showToast('Укажи сумму пополнения', 'error'); return; }
    db.topUpDeposit(d, +topUpSum);
    showToast(`Депозит пополнен на ${fmt(+topUpSum)} ₽ ✓`);
    setTopUpFor(null); setTopUpSum('');
  };

  const input = {
    width: '100%', padding: '11px 14px', borderRadius: 14, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 13.5, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Депозиты и долги</h1>
        <span style={{ color: UI.muted, fontSize: 14 }}>внесли — расходуют · взяли — должны</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по имени" style={{
          marginLeft: 'auto', width: 'min(240px, 100%)', padding: '11px 18px', borderRadius: 999, border: 'none',
          background: '#fff', boxShadow: UI.shadow, fontSize: 14, outline: 'none',
        }} />
        <button onClick={() => setShowAdd(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14,
        }}>+ Депозит</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filtered.map(d => {
          const l = left(d);
          const pct = d.total ? Math.max(0, Math.min(100, (l / d.total) * 100)) : 0;
          return (
            // flex-колонка: кнопки прижаты к низу, карточки в ряду одной высоты
            <div key={d.id} style={{ background: '#fff', borderRadius: 22, boxShadow: UI.shadow, padding: 18, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                {editId === d.id ? (
                  <span style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && rename(d)} autoFocus style={{
                      flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 12, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, fontWeight: 700, outline: 'none',
                    }} />
                    <button onClick={() => rename(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 14px', fontWeight: 800, fontSize: 12.5 }}>ОК</button>
                    <button onClick={() => setEditId(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 10px', fontSize: 12.5 }}>✕</button>
                  </span>
                ) : (
                  <>
                    <span style={{ fontWeight: 800, fontSize: 15 }}><I n="landmark" size={14} /> {d.name}</span>
                    <span style={{ color: UI.muted, fontSize: 12 }}>с {dm(d.created_at)}</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                      <button onClick={() => { setEditId(d.id); setEditName(d.name); }} title="Исправить имя" style={{
                        border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 9px', fontSize: 12, cursor: 'pointer',
                      }}><I n="pencil" size={11} /></button>
                      <button onClick={() => removeDeposit(d)} title="Удалить депозит" style={{
                        border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 9px', fontSize: 12, color: UI.muted, cursor: 'pointer',
                      }}>✕</button>
                    </span>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 5px' }}>
                <span style={{ fontSize: 23, fontWeight: 800, color: l <= 0 ? '#c0392b' : UI.dark }}>{fmt(l)} ₽</span>
                <span style={{ color: UI.muted, fontSize: 12.5 }}>из {fmt(d.total)} ₽</span>
              </div>
              <div style={{ height: 16, background: UI.soft, borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? '#c0392b' : UI.accent, borderRadius: 999 }} />
              </div>

              {d.uses.length > 0 && (
                <div style={{ background: UI.soft, borderRadius: 14, padding: '2px 12px', marginBottom: 10 }}>
                  {d.uses.map((u, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '7px 0', borderBottom: i < d.uses.length - 1 ? `1px solid ${UI.line}` : 'none', fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={{ color: UI.muted, fontSize: 12, width: 40, flexShrink: 0 }}>{dm(u.date)}</span>
                      <span style={{ fontWeight: 600 }}>{u.what}</span>
                      {u.task_id && <span style={{ background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}><I n="link" size={10} /> задача</span>}
                      <span style={{ marginLeft: 'auto', fontWeight: 700, flexShrink: 0 }}>−{fmt(u.amount)} ₽</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопки/форма — всегда прижаты к низу карточки */}
              <div style={{ marginTop: 'auto' }}>
                {useFor === d.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select style={input} value={useTaskId} onChange={e => setUseTaskId(e.target.value)}>
                      <option value="">Привязать задачу (необязательно)…</option>
                      {openTasks.map(t => <option key={t.id} value={t.id}>{t.title} · {fmt(t.amount)} ₽</option>)}
                    </select>
                    <input style={input} placeholder={useTaskId ? 'Комментарий (можно пусто)' : 'Что заказали'} value={useWhat} onChange={e => setUseWhat(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...input, flex: 1, minWidth: 0 }} type="number" placeholder="Сумма, ₽" value={useAmount} onChange={e => setUseAmount(e.target.value)} />
                      <button onClick={() => addUse(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 20px', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>ОК</button>
                      <button onClick={() => setUseFor(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 14px', fontSize: 13, flexShrink: 0 }}>✕</button>
                    </div>
                  </div>
                ) : topUpFor === d.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...input, flex: 1, minWidth: 0 }} type="number" placeholder="Пополнить на, ₽" value={topUpSum} onChange={e => setTopUpSum(e.target.value)} />
                    <button onClick={() => topUp(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 20px', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>ОК</button>
                    <button onClick={() => setTopUpFor(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 14px', fontSize: 13, flexShrink: 0 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setUseFor(d.id); setUseWhat(''); setUseAmount(''); setUseTaskId(''); }} style={{
                      flex: 1, border: 'none', background: UI.accent, borderRadius: 999, padding: '10px 0', fontWeight: 800, fontSize: 13,
                    }}>− Списать заказ</button>
                    <button onClick={() => { setTopUpFor(d.id); setTopUpSum(''); }} style={{
                      border: 'none', background: UI.soft, borderRadius: 999, padding: '10px 16px', fontWeight: 700, fontSize: 13,
                    }}>+ Пополнить</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <div style={{ color: UI.muted }}>{query ? `Ничего не нашла по «${query}»` : 'Депозитов пока нет'}</div>}
      </div>

      {/* Ручные должники — «как депозиты наоборот»: берут по мелочи, оплачивают разово */}
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 800 }}><I n="note" size={14} /> Должники по мелочи</span>
            {mdTotal < 0 && <span style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>всего {fmt(-mdTotal)}</span>}
            <button onClick={() => setShowAddDebtor(v => !v)} style={{
              marginLeft: 'auto', border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 13,
            }}>+ Добавить человека</button>
          </div>
          <div style={{ color: UI.muted, fontSize: 13, marginBottom: 14 }}>Берут по мелочи (−), потом оплачивают разово (+). Виден баланс по каждому.</div>

          {showAddDebtor && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={newDebtorName} onChange={e => setNewDebtorName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDebtor()}
                placeholder="Имя (Зайнаб, соседний салон…)" style={{
                  flex: 1, padding: '11px 16px', borderRadius: 999, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, outline: 'none', minWidth: 0,
                }} />
              <button onClick={addDebtor} style={{ border: 'none', background: UI.accent, borderRadius: 999, padding: '0 20px', fontWeight: 800, fontSize: 13 }}>ОК</button>
            </div>
          )}

          {manualDebts.map(d => {
            const bal = mdBalance(d);
            return (
              <div key={d.id} style={{ background: UI.soft, borderRadius: 18, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  {mdEditId === d.id ? (
                    <span style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
                      <input value={mdEditName} onChange={e => setMdEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameDebtor(d)} autoFocus style={{
                        flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 12, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 14, fontWeight: 700, outline: 'none',
                      }} />
                      <button onClick={() => renameDebtor(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 14px', fontWeight: 800, fontSize: 12.5 }}>ОК</button>
                      <button onClick={() => setMdEditId(null)} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '0 10px', fontSize: 12.5 }}>✕</button>
                    </span>
                  ) : (
                    <span style={{ fontWeight: 800, fontSize: 14.5 }}>{d.name}</span>
                  )}
                  {bal < 0
                    ? <span style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>долг {fmt(-bal)}</span>
                    : <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>✓ без долга</span>}
                  {mdEditId !== d.id && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={() => { setMdEditId(d.id); setMdEditName(d.name); }} title="Исправить имя" style={{
                        border: 'none', background: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                      }}><I n="pencil" size={12} /></button>
                      <button onClick={() => removeDebtor(d)} title="Удалить из должников" style={{
                        border: 'none', background: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, color: UI.muted, cursor: 'pointer',
                      }}>✕</button>
                    </span>
                  )}
                </div>

                {d.entries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 13.5 }}>
                    <span style={{ color: UI.muted, fontSize: 12.5, width: 44, flexShrink: 0 }}>{e.date.slice(8, 10)}.{e.date.slice(5, 7)}</span>
                    <span>{e.what}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: e.amount < 0 ? '#c0392b' : UI.dark }}>
                      {e.amount < 0 ? '−' : '+'}{fmt(Math.abs(e.amount)).replace(' ₽', '')} ₽
                    </span>
                  </div>
                ))}

                {mdForm?.debtId === d.id ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <input value={mdWhat} onChange={e => setMdWhat(e.target.value)} placeholder={mdForm.sign > 0 ? 'Комментарий (оплата)' : 'Что взяла (ксерокс…)'} style={{
                      flex: 1.3, padding: '10px 14px', borderRadius: 12, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 13, outline: 'none', minWidth: 140,
                    }} />
                    <input value={mdAmount} onChange={e => setMdAmount(e.target.value)} type="number" placeholder="Сумма" style={{
                      width: 100, padding: '10px 14px', borderRadius: 12, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 13, outline: 'none',
                    }} />
                    <button onClick={() => addDebtEntry(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 18px', fontWeight: 800, fontSize: 13 }}>ОК</button>
                    <button onClick={() => setMdForm(null)} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '0 14px', fontSize: 13 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => { setMdForm({ debtId: d.id, sign: -1 }); setMdWhat(''); setMdAmount(''); }} style={{
                      border: 'none', background: 'rgba(192,57,43,.12)', color: '#c0392b', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 12.5,
                    }}>− взяла ещё</button>
                    <button onClick={() => { setMdForm({ debtId: d.id, sign: 1 }); setMdWhat(''); setMdAmount(''); }} style={{
                      border: 'none', background: 'rgba(247,214,74,.4)', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 12.5,
                    }}>+ оплатила</button>
                  </div>
                )}
              </div>
            );
          })}
          {!manualDebts.length && <div style={{ color: UI.muted, fontSize: 14 }}>Ручных должников нет</div>}
        </div>

      {/* Новый депозит */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новый депозит</span>
              <button onClick={() => setShowAdd(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={input} placeholder="Имя (организация / кто внёс)" value={name} onChange={e => setName(e.target.value)} />
            <input style={input} type="number" placeholder="Внесённая сумма, ₽" value={total} onChange={e => setTotal(e.target.value)} />
            <button onClick={addDeposit} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Завести
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
