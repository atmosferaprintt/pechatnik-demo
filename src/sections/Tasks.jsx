// Раздел «Задачи» — канбан ПО ЛЮДЯМ (просьба Кристи): у каждого свой задачник + общая «Сборка».
// Задачи видны всем и передаются от человека к человеку; действия отмечаются бейджами с историей.
// Клик по карточке → подробности: клиент, оплата, сроки, состав заказа, история действий.
// Заглушка на демо-данных.
import { useState } from 'react';

const fmt = (n) => (n || 0).toLocaleString('ru-RU') + ' ₽';
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const NOW = () => `${dm(TODAY)} ${new Date().toTimeString().slice(0, 5)}`;

// Быстрые отметки действий на задаче
const ACTION_PRESETS = ['приняла', 'подготовила к печати', 'распечатала', 'постпечатка', 'готово к выдаче'];

// Статус срока: overdue — просрочен, soon — сегодня/завтра. В «Сборке» (готово к выдаче) не тревожим.
function deadlineStatus(t) {
  if (!t.deadline || t.assignee === 'Сборка') return 'ok';
  if (t.deadline < TODAY) return 'overdue';
  if (t.deadline <= TOMORROW) return 'soon';
  return 'ok';
}

export default function Tasks({ tasks, setTasks, clients, contractors, transactions, setTransactions, categories, banks, currentUser, PAYMENT_METHODS, PEOPLE_COLUMNS, UI, showToast }) {
  const [openTask, setOpenTask] = useState(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payBank, setPayBank] = useState('');
  const [payCat, setPayCat] = useState('');

  const client = (id) => clients.find(c => c.id === id);
  const clientShort = (id) => client(id)?.name?.split('·')[0]?.trim() || '—';

  const payments = (taskId) => transactions.filter(t => t.task_id === taskId && t.type === 'income');
  const paidSum = (taskId) => payments(taskId).reduce((s, p) => s + p.amount, 0);
  const catName = (id) => categories.find(c => c.id === id)?.name || '?';
  const incomeCats = categories.filter(c => c.kind === 'income');

  // Передать задачу другому человеку (или в Сборку) — с записью в историю
  const transfer = (task, to) => {
    if (!to || to === task.assignee) return;
    setTasks(prev => prev.map(t => t.id === task.id
      ? { ...t, assignee: to, log: [...(t.log || []), { who: task.assignee, action: `→ передала: ${to}`, time: NOW() }] }
      : t));
    showToast(`«${task.title}» → ${to}`);
  };

  // Отметка действия (бейдж) — пишется в историю от имени текущего пользователя
  const addAction = (task, action) => {
    setTasks(prev => prev.map(t => t.id === task.id
      ? { ...t, log: [...(t.log || []), { who: currentUser.name, action, time: NOW() }] }
      : t));
    showToast(`Отметка: ${action} ✓`);
  };

  const openPayForm = (debt) => {
    setPayAmount(debt > 0 ? String(debt) : '');
    setPayCat(''); setPayMethod('cash'); setPayBank('');
    setShowPayForm(true);
  };

  const savePayment = (t) => {
    if (!payCat || !payAmount) { showToast('Выбери категорию и сумму', 'error'); return; }
    setTransactions(prev => [...prev, {
      id: Date.now(), op_date: TODAY, type: 'income', category_id: +payCat, amount: +payAmount,
      payment_method: payMethod, bank_id: payMethod === 'transfer' ? +payBank || null : null,
      task_id: t.id, client_id: t.client_id, comment: t.title,
      created_by: currentUser.name, time: new Date().toTimeString().slice(0, 5),
    }]);
    setShowPayForm(false);
    showToast('Оплата записана ✓');
  };

  const repeatTask = (t) => {
    setTasks(prev => [...prev, {
      ...t, id: Math.max(...prev.map(x => x.id)) + 1, assignee: currentUser.name, deadline: null, created_at: TODAY,
      log: [{ who: currentUser.name, action: 'повторный заказ 🔁', time: NOW() }],
    }]);
    setOpenTask(null);
    showToast(`«${t.title}» скопирована к тебе 🔁`);
  };

  // Чип статуса оплаты: ✓ оплачено / мигающий долг
  const PayChip = ({ t }) => {
    const debt = (t.amount || 0) - paidSum(t.id);
    if (debt <= 0) return (
      <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>✓ оплачено</span>
    );
    return (
      <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>
        долг {fmt(debt)}
      </span>
    );
  };

  const DeadlineChip = ({ t }) => {
    const st = deadlineStatus(t);
    if (st === 'overdue') return (
      <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>
        ⏰ просрочено {dm(t.deadline)}
      </span>
    );
    if (st === 'soon') return (
      <span style={{ background: UI.accent, borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>
        ⏰ горит · {dm(t.deadline)}
      </span>
    );
    if (!t.deadline) return null;
    return (
      <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 600 }}>⏰ {dm(t.deadline)}</span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0 20px' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Задачи</h1>
        <span style={{ color: UI.muted, fontSize: 14 }}>у каждого свой задачник · задачи передаются между людьми</span>
        <button onClick={() => showToast('Форма новой задачи — после утверждения макета')} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Новая задача</button>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {PEOPLE_COLUMNS.map(person => {
          const isAssembly = person === 'Сборка';
          const inCol = tasks.filter(t => t.assignee === person);
          const sum = inCol.reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <div key={person} style={{ minWidth: 230, flex: 1, background: isAssembly ? '#f0ecdf' : UI.soft, borderRadius: 22, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', background: isAssembly ? UI.accent : UI.dark,
                  color: isAssembly ? UI.dark : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>{isAssembly ? '📦' : person[0]}</span>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{person}</span>
                <span style={{ background: UI.dark, color: '#fff', borderRadius: 999, fontSize: 11.5, fontWeight: 700, padding: '2px 8px' }}>{inCol.length}</span>
                {sum > 0 && <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 11.5, fontWeight: 600 }}>{fmt(sum)}</span>}
              </div>

              {inCol.map(t => {
                const lastAction = t.log?.length ? t.log[t.log.length - 1] : null;
                return (
                  <div key={t.id} onClick={() => { setOpenTask(t); setShowPayForm(false); }} style={{ background: '#fff', borderRadius: 18, padding: '13px 13px 11px', marginBottom: 10, boxShadow: UI.shadow, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ color: UI.muted, fontSize: 12, marginBottom: 8 }}>
                      {clientShort(t.client_id)}
                      {t.contractor_id && <span style={{ marginLeft: 5, background: UI.soft, borderRadius: 999, padding: '2px 7px', fontSize: 11 }}>🏭 {contractors.find(c => c.id === t.contractor_id)?.name}</span>}
                    </div>
                    {lastAction && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ background: 'rgba(247,214,74,.3)', borderRadius: 999, padding: '3px 9px', fontSize: 11.5, fontWeight: 600 }}>
                          {lastAction.who}: {lastAction.action}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 700 }}>{fmt(t.amount)}</span>
                      <PayChip t={t} />
                      <DeadlineChip t={t} />
                    </div>
                    {/* Передать другому — не открывая карточку */}
                    <select value="" onClick={e => e.stopPropagation()} onChange={e => transfer(t, e.target.value)} style={{
                      marginTop: 9, width: '100%', border: 'none', background: UI.soft, borderRadius: 999,
                      padding: '6px 10px', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer',
                    }}>
                      <option value="">→ передать…</option>
                      {PEOPLE_COLUMNS.filter(p => p !== person).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                );
              })}
              {!inCol.length && <div style={{ color: UI.muted, fontSize: 12.5, padding: 6 }}>Пусто</div>}
            </div>
          );
        })}
      </div>

      {/* Карточка задачи */}
      {openTask && (() => {
        const t = tasks.find(x => x.id === openTask.id) || openTask;
        const c = client(t.client_id);
        const paid = payments(t.id);
        const paidTotal = paid.reduce((s, p) => s + p.amount, 0);
        const debt = (t.amount || 0) - paidTotal;
        const dlStatus = deadlineStatus(t);
        return (
          <div onClick={() => setOpenTask(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 28, width: 580, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{t.title}</div>
                  <div style={{ color: UI.muted, fontSize: 13, marginTop: 2 }}>создана {dm(t.created_at)}</div>
                </div>
                <button onClick={() => setOpenTask(null)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15, flexShrink: 0 }}>✕</button>
              </div>

              {/* У кого задача — передача пилюлями */}
              <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '12px 0 6px' }}>У кого сейчас</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {PEOPLE_COLUMNS.map(p => (
                  <button key={p} onClick={() => transfer(t, p)} style={{
                    border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                    background: t.assignee === p ? UI.dark : UI.soft, color: t.assignee === p ? '#fff' : UI.dark,
                  }}>{p === 'Сборка' ? '📦 Сборка' : p}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <Fact label="Клиент" value={c ? c.name : '—'} sub={c?.phone} UI={UI} />
                <Fact label="Оплата" value={debt <= 0 ? '✓ оплачено' : `долг ${fmt(debt)}`} danger={debt > 0}
                  sub={`заказ ${fmt(t.amount)}${paidTotal ? ` · внесено ${fmt(paidTotal)}` : ''}`} UI={UI} />
                <Fact label="Дедлайн" value={dm(t.deadline)} danger={dlStatus === 'overdue'} accent={dlStatus === 'soon'}
                  sub={dlStatus === 'overdue' ? '⏰ просрочено!' : dlStatus === 'soon' ? '⏰ горит' : 'в графике'} UI={UI} />
                <Fact label="У кого" value={t.assignee} UI={UI} />
              </div>

              {/* Отметки действий */}
              <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Отметить действие</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {ACTION_PRESETS.map(a => (
                  <button key={a} onClick={() => addAction(t, a)} style={{
                    border: `1.5px solid ${UI.accent}`, background: 'rgba(247,214,74,.15)', borderRadius: 999,
                    padding: '7px 13px', fontSize: 12.5, fontWeight: 600,
                  }}>+ {a}</button>
                ))}
              </div>

              {/* История действий и передач */}
              {t.log?.length > 0 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>История</div>
                  <div style={{ background: UI.soft, borderRadius: 16, padding: '8px 16px', marginBottom: 16 }}>
                    {t.log.map((l, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '6px 0', borderBottom: i < t.log.length - 1 ? `1px solid ${UI.line}` : 'none', fontSize: 13.5 }}>
                        <span style={{ fontWeight: 700 }}>{l.who}</span>
                        <span>{l.action}</span>
                        <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 12 }}>{l.time}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Состав заказа */}
              {t.parts?.length > 0 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Состав заказа</div>
                  <div style={{ background: UI.soft, borderRadius: 16, padding: '6px 16px', marginBottom: 14 }}>
                    {t.parts.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < t.parts.length - 1 ? `1px solid ${UI.line}` : 'none', fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontWeight: 700 }}>{fmt(p.amount)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1.5px solid ${UI.dark}`, fontSize: 14 }}>
                      <span style={{ fontWeight: 800 }}>Итого</span>
                      <span style={{ fontWeight: 800 }}>{fmt(t.parts.reduce((s, p) => s + p.amount, 0))}</span>
                    </div>
                  </div>
                </>
              )}

              {t.contractor_id && (
                <div style={{ background: UI.soft, borderRadius: 16, padding: '11px 16px', fontSize: 13.5, marginBottom: 14 }}>
                  🏭 Перезаказ у контрагента: <b>{contractors.find(c => c.id === t.contractor_id)?.name}</b>
                  <span style={{ color: UI.muted }}> · {contractors.find(c => c.id === t.contractor_id)?.service}</span>
                </div>
              )}

              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Описание</div>
              <div style={{ background: UI.soft, borderRadius: 16, padding: '14px 16px', fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
                {t.description || 'Без описания'}
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Оплаты по задаче</div>
              {paid.length ? paid.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                  <span>💰</span>
                  <span style={{ fontWeight: 600 }}>{catName(p.category_id)}</span>
                  <span style={{ color: UI.muted, fontSize: 12.5 }}>{p.created_by} · {p.time}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>+{fmt(p.amount)}</span>
                </div>
              )) : (
                <div style={{ color: UI.muted, fontSize: 13.5 }}>Оплат пока нет</div>
              )}

              {/* Записать оплату прямо из карточки — сумма подставляется из долга */}
              {showPayForm ? (
                <div style={{ background: UI.soft, borderRadius: 18, padding: 16, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={payCat} onChange={e => setPayCat(e.target.value)} style={{
                      flex: 1.4, padding: '11px 12px', borderRadius: 14, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 14, outline: 'none',
                    }}>
                      <option value="">Категория…</option>
                      {incomeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Сумма" style={{
                      flex: 1, padding: '11px 12px', borderRadius: 14, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 15, fontWeight: 700, outline: 'none', minWidth: 0,
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.key} onClick={() => setPayMethod(m.key)} style={{
                        border: 'none', borderRadius: 999, padding: '7px 13px', fontSize: 12.5, fontWeight: 600,
                        background: payMethod === m.key ? UI.accent : '#fff',
                      }}>{m.label}</button>
                    ))}
                  </div>
                  {payMethod === 'transfer' && (
                    <select value={payBank} onChange={e => setPayBank(e.target.value)} style={{
                      padding: '11px 12px', borderRadius: 14, border: `1px solid ${UI.line}`, background: '#fff', fontSize: 14, outline: 'none',
                    }}>
                      <option value="">На какую карту (банк)…</option>
                      {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => savePayment(t)} style={{ flex: 1, border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '12px 0', fontWeight: 800, fontSize: 14 }}>
                      Записать оплату
                    </button>
                    <button onClick={() => setShowPayForm(false)} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '12px 18px', fontSize: 14 }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {debt > 0 && (
                    <button onClick={() => openPayForm(debt)} style={{
                      flex: 1, border: 'none', background: UI.accent, color: UI.dark, borderRadius: 999, padding: '13px 0', fontWeight: 800, fontSize: 14,
                    }}>💰 Записать оплату ({fmt(debt)})</button>
                  )}
                  <button onClick={() => repeatTask(t)} style={{
                    flex: debt > 0 ? undefined : 1, border: 'none', background: UI.soft, borderRadius: 999, padding: '13px 18px', fontWeight: 700, fontSize: 14,
                  }}>🔁 Повторить заказ</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Fact({ label, value, sub, accent, danger, UI }) {
  return (
    <div className={danger ? 'blink' : undefined} style={{
      background: danger ? 'rgba(192,57,43,.12)' : accent ? 'rgba(247,214,74,.25)' : UI.soft,
      border: danger ? '1px solid #c0392b' : 'none',
      borderRadius: 16, padding: '12px 14px',
    }}>
      <div style={{ color: UI.muted, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14.5, color: danger ? '#c0392b' : UI.dark }}>{value}</div>
      {sub && <div style={{ color: UI.muted, fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
