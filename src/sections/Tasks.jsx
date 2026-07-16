// Раздел «Задачи» — канбан ПО ЛЮДЯМ (просьба Кристи): у каждого свой задачник.
// «Сборку» убрали 2026-07-16: готовность = бейдж «готово к выдаче» + «✓ Завершить»,
// сборка у подрядчиков отображается в Контрагентах.
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

// Статус срока: overdue — просрочен, soon — сегодня/завтра.
// Не тревожим завершённые и те, где последняя отметка — «готово к выдаче» (работа сделана, ждём клиента).
function deadlineStatus(t) {
  const last = t.log?.length ? t.log[t.log.length - 1].action : '';
  if (!t.deadline || t.done || last.includes('готово к выдаче')) return 'ok';
  if (t.deadline < TODAY) return 'overdue';
  if (t.deadline <= TOMORROW) return 'soon';
  return 'ok';
}

export default function Tasks({ tasks, clients, contractors, transactions, categories, banks, currentUser, db, PAYMENT_METHODS, PEOPLE_COLUMNS, manualDebts, UI, showToast }) {
  const [openTask, setOpenTask] = useState(null);
  const [view, setView] = useState('board'); // board | debts | done
  const [query, setQuery] = useState('');
  const [flt, setFlt] = useState(''); // '' | debt | burning
  // Ручные должники: формы добавления человека и записи ±
  const [newDebtorName, setNewDebtorName] = useState('');
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [mdForm, setMdForm] = useState(null); // { debtId, sign: -1 | 1 }
  const [mdWhat, setMdWhat] = useState('');
  const [mdAmount, setMdAmount] = useState('');
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
  const taskDebt = (t) => (t.amount || 0) - paidSum(t.id);

  // Поиск по названию/клиенту + быстрые фильтры «с долгом» и «горят»
  const matches = (t) => {
    const q = query.trim().toLowerCase();
    const okQ = !q || t.title.toLowerCase().includes(q) || clientShort(t.client_id).toLowerCase().includes(q);
    const okF = !flt || (flt === 'debt' ? taskDebt(t) > 0 : ['overdue', 'soon'].includes(deadlineStatus(t)));
    return okQ && okF;
  };

  // Завершённая задача уходит с доски: с долгом — в «Долги», оплаченная — в «Завершённые»
  const activeTasks = tasks.filter(t => !t.done && matches(t));
  const debtTasks = tasks.filter(t => t.done && taskDebt(t) > 0 && matches(t));
  const doneTasks = tasks.filter(t => t.done && taskDebt(t) <= 0 && matches(t));

  const finishTask = (task, e) => {
    e?.stopPropagation();
    const debt = taskDebt(task);
    db.updateTask(task, { done: true }, { who: currentUser.name, action: '✓ завершила' });
    setOpenTask(null);
    showToast(debt > 0 ? `«${task.title}» завершена → 💸 Долги (${fmt(debt)})` : `«${task.title}» завершена ✓`);
  };

  // Ручные должники: баланс = сумма записей (минус — взял, плюс — оплатил)
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
    showToast(`${d.name} — убрана из должников`);
  };

  const reopenTask = (task) => {
    db.updateTask(task, { done: false }, { who: currentUser.name, action: '↩ вернула в работу' });
    showToast(`«${task.title}» снова в работе ↩`);
  };

  // Передать задачу другому человеку — с записью в историю
  const transfer = (task, to) => {
    if (!to || to === task.assignee) return;
    db.updateTask(task, { assignee: to }, { who: task.assignee, action: `→ передала: ${to}` });
    showToast(`«${task.title}» → ${to}`);
  };

  // Отметка действия (бейдж) — пишется в историю от имени текущего пользователя
  const addAction = (task, action) => {
    db.addTaskLog(task, action);
    showToast(`Отметка: ${action} ✓`);
  };

  const openPayForm = (debt) => {
    setPayAmount(debt > 0 ? String(debt) : '');
    setPayCat(''); setPayMethod('cash'); setPayBank('');
    setShowPayForm(true);
  };

  const savePayment = (t) => {
    if (!payCat || !payAmount) { showToast('Выбери категорию и сумму', 'error'); return; }
    db.addTransactions([{
      type: 'income', category_id: +payCat, amount: +payAmount,
      payment_method: payMethod, bank_id: payMethod === 'transfer' ? +payBank || null : null,
      task_id: t.id, client_id: t.client_id, comment: t.title,
    }]);
    setShowPayForm(false);
    showToast('Оплата записана ✓');
  };

  const repeatTask = (t) => {
    db.addTask({
      title: t.title, description: t.description, client_id: t.client_id, contractor_id: t.contractor_id,
      amount: t.amount, parts: t.parts || [], deadline: null, assignee: currentUser.name,
      _firstAction: 'повторный заказ 🔁',
    });
    setOpenTask(null);
    showToast(`«${t.title}» скопирована к тебе 🔁`);
  };

  // Чип статуса оплаты: ✓ оплачено / долг (small — компактный вариант для карточек доски)
  const PayChip = ({ t, small }) => {
    const debt = (t.amount || 0) - paidSum(t.id);
    const pad = small ? '2px 7px' : '4px 10px';
    const fs = small ? 11 : 12.5;
    if (debt <= 0) return (
      <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 700 }}>✓{small ? '' : ' оплачено'}</span>
    );
    return (
      <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 700 }}>
        долг {fmt(debt)}
      </span>
    );
  };

  const DeadlineChip = ({ t, small }) => {
    const st = deadlineStatus(t);
    const pad = small ? '2px 7px' : '4px 10px';
    const fs = small ? 11 : 12.5;
    if (st === 'overdue') return (
      <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 700 }}>
        ⏰ проср. {dm(t.deadline)}
      </span>
    );
    if (st === 'soon') return (
      <span style={{ background: UI.accent, borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 700 }}>
        ⏰ {small ? dm(t.deadline) : `горит · ${dm(t.deadline)}`}
      </span>
    );
    if (!t.deadline) return null;
    return (
      <span style={{ background: UI.soft, borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 600 }}>⏰ {dm(t.deadline)}</span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Задачи</h1>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          {[['board', `Доска · ${activeTasks.length}`], ['debts', `💸 Долги · ${debtTasks.length}`], ['done', `✓ Завершённые · ${doneTasks.length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={k === 'debts' && debtTasks.length && view !== 'debts' ? 'blink' : undefined} style={{
              border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700,
              background: view === k ? UI.dark : k === 'debts' && debtTasks.length ? 'rgba(192,57,43,.12)' : 'transparent',
              color: view === k ? '#fff' : k === 'debts' && debtTasks.length ? '#c0392b' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
        <button onClick={() => showToast('Форма новой задачи — после утверждения макета')} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Новая задача</button>
      </div>

      {/* Поиск и быстрые фильтры */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Поиск: задача или клиент" style={{
          width: 'min(280px, 100%)', padding: '10px 18px', borderRadius: 999, border: 'none',
          background: '#fff', boxShadow: UI.shadow, fontSize: 13.5, outline: 'none',
        }} />
        {[['debt', '💸 с долгом'], ['burning', '⏰ горят']].map(([k, l]) => (
          <button key={k} onClick={() => setFlt(f => f === k ? '' : k)} style={{
            border: 'none', borderRadius: 999, padding: '9px 15px', fontSize: 12.5, fontWeight: 700, boxShadow: UI.shadow,
            background: flt === k ? UI.dark : '#fff', color: flt === k ? '#fff' : UI.dark,
          }}>{l}</button>
        ))}
        {(query || flt) && (
          <button onClick={() => { setQuery(''); setFlt(''); }} style={{
            border: 'none', background: 'transparent', color: UI.muted, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>сбросить ✕</button>
        )}
      </div>

      {/* Списки долгов и завершённых — отдельно от доски */}
      {view !== 'board' && (
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, maxWidth: 860 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{view === 'debts' ? '💸 Завершённые, но не оплаченные' : '✓ Завершённые и оплаченные'}</div>
          <div style={{ color: UI.muted, fontSize: 13, marginBottom: 14 }}>
            {view === 'debts' ? 'Висят здесь, пока клиент не оплатит. Клик — открыть и записать оплату.' : 'Архив. Клик — открыть карточку.'}
          </div>
          {(view === 'debts' ? debtTasks : doneTasks).map(t => (
            <div key={t.id} onClick={() => { setOpenTask(t); setShowPayForm(false); }} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 4px', borderBottom: `1px solid ${UI.line}`, fontSize: 14, cursor: 'pointer' }}>
              <span style={{ fontWeight: 700 }}>{t.title}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{clientShort(t.client_id)}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.log?.length ? t.log[t.log.length - 1].time : ''}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(t.amount)}</span>
              {view === 'debts'
                ? <span className="blink" style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>долг {fmt(taskDebt(t))}</span>
                : <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>✓ оплачено</span>}
            </div>
          ))}
          {!(view === 'debts' ? debtTasks : doneTasks).length && (
            <div style={{ color: UI.muted, fontSize: 14 }}>{view === 'debts' ? 'По задачам долгов нет 🎉' : 'Пока пусто'}</div>
          )}
        </div>
      )}

      {/* Ручные должники — «как депозиты наоборот»: берут по мелочи, оплачивают разово */}
      {view === 'debts' && (
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, maxWidth: 860, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontWeight: 800 }}>🧾 Должники по мелочи</span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5 }}>{d.name}</span>
                  {bal < 0
                    ? <span style={{ background: '#c0392b', color: '#fff', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>должна {fmt(-bal)}</span>
                    : <span style={{ background: 'rgba(247,214,74,.5)', borderRadius: 999, padding: '3px 12px', fontSize: 12.5, fontWeight: 700 }}>✓ рассчиталась</span>}
                  {bal >= 0 && d.entries.length > 0 && (
                    <button onClick={() => removeDebtor(d)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: UI.muted, fontSize: 12.5, cursor: 'pointer' }}>убрать из списка ✕</button>
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
      )}

      {view === 'board' && (
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {PEOPLE_COLUMNS.map(person => {
          const inCol = activeTasks.filter(t => t.assignee === person);
          const sum = inCol.reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <div key={person} style={{ minWidth: 205, flex: 1, background: UI.soft, borderRadius: 20, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%', background: UI.dark, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, flexShrink: 0,
                }}>{person[0]}</span>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{person}</span>
                <span style={{ background: UI.dark, color: '#fff', borderRadius: 999, fontSize: 11.5, fontWeight: 700, padding: '2px 8px' }}>{inCol.length}</span>
                {sum > 0 && <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 11.5, fontWeight: 600 }}>{fmt(sum)}</span>}
              </div>

              {inCol.map(t => {
                const lastAction = t.log?.length ? t.log[t.log.length - 1] : null;
                return (
                  // Компактная карточка (просьба Кристи: «чтоб долго скролить не пришлось»)
                  <div key={t.id} onClick={() => { setOpenTask(t); setShowPayForm(false); }} style={{ background: '#fff', borderRadius: 15, padding: '9px 10px 8px', marginBottom: 7, boxShadow: UI.shadow, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 2, lineHeight: 1.25 }}>{t.title}</div>
                    <div style={{ color: UI.muted, fontSize: 11, marginBottom: 5 }}>
                      {clientShort(t.client_id)}
                      {t.contractor_id && <> · 🏭 {contractors.find(c => c.id === t.contractor_id)?.name}</>}
                      {lastAction && <> · <span style={{ fontWeight: 600 }}>{lastAction.action}</span></>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: UI.soft, borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{fmt(t.amount)}</span>
                      <PayChip t={t} small />
                      <DeadlineChip t={t} small />
                      {/* Передать / завершить — не открывая карточку */}
                      <select value="" onClick={e => e.stopPropagation()} onChange={e => transfer(t, e.target.value)} title="Передать" style={{
                        marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 34,
                        padding: '3px 6px', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer',
                      }}>
                        <option value="">→</option>
                        {PEOPLE_COLUMNS.filter(p => p !== person).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button title="Завершить задачу" onClick={(e) => finishTask(t, e)} style={{
                        border: 'none', background: UI.soft, borderRadius: 999,
                        padding: '3px 9px', fontSize: 11.5, fontWeight: 800, flexShrink: 0,
                      }}>✓</button>
                    </div>
                  </div>
                );
              })}
              {!inCol.length && <div style={{ color: UI.muted, fontSize: 12.5, padding: 6 }}>Пусто</div>}
            </div>
          );
        })}
      </div>
      )}

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
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 28, width: 'min(580px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                  }}>{p}</button>
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
                    {PAYMENT_METHODS.filter(m => m.key !== 'deposit').map(m => (
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
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {debt > 0 && (
                    <button onClick={() => openPayForm(debt)} style={{
                      flex: 1, border: 'none', background: UI.accent, color: UI.dark, borderRadius: 999, padding: '13px 0', fontWeight: 800, fontSize: 14, minWidth: 200,
                    }}>💰 Записать оплату ({fmt(debt)})</button>
                  )}
                  {t.done ? (
                    <button onClick={() => reopenTask(t)} style={{
                      border: 'none', background: UI.soft, borderRadius: 999, padding: '13px 18px', fontWeight: 700, fontSize: 14,
                    }}>↩ Вернуть в работу</button>
                  ) : (
                    <button onClick={() => finishTask(t)} style={{
                      border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '13px 18px', fontWeight: 800, fontSize: 14,
                    }}>✓ Завершить</button>
                  )}
                  <button onClick={() => repeatTask(t)} style={{
                    border: 'none', background: UI.soft, borderRadius: 999, padding: '13px 18px', fontWeight: 700, fontSize: 14,
                  }}>🔁 Повторить</button>
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
