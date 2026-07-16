// Раздел «Задачи» — канбан ПО ЭТАПАМ (Новая → В работе → Производство → Готово, вернули 2026-07-16)
// + фильтр по людям сверху: сотрудница по умолчанию видит свои задачи.
// Редактировать (этап, передача, отметки, завершение) можно ТОЛЬКО свои; чужие — просмотр. Владелец — всё.
// Задачи видны всем и передаются от человека к человеку; действия отмечаются бейджами с историей.
// Клик по карточке → подробности: клиент, оплата, сроки, состав заказа, история действий.
// Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';

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
  if (!t.deadline || t.done || t.stage === 'Готово' || last.includes('готово к выдаче')) return 'ok';
  if (t.deadline < TODAY) return 'overdue';
  if (t.deadline <= TOMORROW) return 'soon';
  return 'ok';
}

export default function Tasks({ tasks, clients, contractors, transactions, categories, banks, currentUser, isOwner, db, PAYMENT_METHODS, PEOPLE_COLUMNS, STAGES, UI, showToast }) {
  const [openTask, setOpenTask] = useState(null);
  const [view, setView] = useState('board'); // board | debts | done
  // Форма новой задачи (и правки существующей — editTask)
  const [showNew, setShowNew] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [saving, setSaving] = useState(false); // защита от двойного тапа «Сохранить»
  const [nTitle, setNTitle] = useState('');
  const [nClient, setNClient] = useState('');
  const [nAmount, setNAmount] = useState('');
  const [nDeadline, setNDeadline] = useState('');
  const [nAssignee, setNAssignee] = useState('');
  const [nContractor, setNContractor] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nParts, setNParts] = useState([]); // состав заказа: [{name, sum}]
  // Новый клиент прямо из формы задачи (просьба Кристи): ФИ + телефон + компания → сразу в базу
  const [ncFio, setNcFio] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [ncCompany, setNcCompany] = useState('');
  const [query, setQuery] = useState('');
  const [flt, setFlt] = useState(''); // '' | debt | burning
  // Фильтр по людям: сотрудница сначала видит свои, Кристи — всех
  const [personFlt, setPersonFlt] = useState(isOwner ? '' : currentUser.name);

  // Редактировать можно только свои задачи (чужие — только смотреть). Владелец — всё.
  const canEdit = (t) => isOwner || t.assignee === currentUser.name;
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
    showToast(debt > 0 ? `«${task.title}» выдана, долг ${fmt(debt)} → Долги` : `«${task.title}» выдана и закрыта ✓`);
  };

  const reopenTask = (task) => {
    db.updateTask(task, { done: false }, { who: currentUser.name, action: '↩ вернула в работу' });
    showToast(`«${task.title}» снова в работе ↩`);
  };

  const stageMove = (task, dir, e) => {
    e?.stopPropagation();
    const i = STAGES.indexOf(task.stage || 'Новая') + dir;
    if (i < 0 || i >= STAGES.length) return;
    db.updateTask(task, { stage: STAGES[i] }, { who: currentUser.name, action: `→ этап: ${STAGES[i]}` });
    showToast(`«${task.title}» → ${STAGES[i]}`);
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

  const openEdit = (t) => {
    setEditTask(t);
    setNTitle(t.title); setNClient(t.client_id ? String(t.client_id) : ''); setNAmount(t.amount ? String(t.amount) : '');
    setNDeadline(t.deadline || ''); setNAssignee(t.assignee); setNContractor(t.contractor_id ? String(t.contractor_id) : '');
    setNDesc(t.description || '');
    setNParts((t.parts || []).map(p => ({ name: p.name, sum: String(p.amount) })));
    setOpenTask(null);
    setShowNew(true);
  };

  const createTask = async () => {
    if (saving) return;
    if (!nTitle.trim()) { showToast('Укажи название задачи', 'error'); return; }
    setSaving(true);
    try {

    // Клиент: выбранный или создаём на месте — и он сразу летит в базу клиентов
    let clientId = nClient && nClient !== '__new' ? +nClient : null;
    if (nClient === '__new') {
      if (!ncFio.trim()) { showToast('Укажи имя клиента', 'error'); return; }
      const norm = ncPhone.replace(/\D/g, '').slice(-10);
      const existing = norm && clients.find(c => c.phone_norm === norm);
      if (existing) {
        clientId = existing.id;
        showToast(`Такой телефон уже есть — привязала к «${existing.name}»`);
      } else {
        const name = ncCompany.trim() ? `${ncFio.trim()} · ${ncCompany.trim()}` : ncFio.trim();
        const createdClient = await db.addClient({ name, phone: ncPhone.trim(), instagram: '', note: '' });
        if (!createdClient) return;
        clientId = createdClient.id;
      }
    }

    const parts = nParts.filter(p => p.name.trim() && +p.sum > 0).map(p => ({ name: p.name.trim(), amount: +p.sum }));
    const amount = parts.length ? parts.reduce((s, p) => s + p.amount, 0) : (+nAmount || null);
    const payload = {
      title: nTitle.trim(), client_id: clientId, amount, parts,
      deadline: nDeadline || null, assignee: nAssignee || currentUser.name,
      contractor_id: nContractor ? +nContractor : null, description: nDesc.trim(),
    };

    if (editTask) {
      // Правка существующей задачи — НЕ создание новой
      const ok = await db.updateTask(editTask, payload, { who: currentUser.name, action: 'изменила задачу' });
      if (!ok) return;
      showToast('Задача исправлена ✓');
    } else {
      const created = await db.addTask(payload);
      if (!created) return;
      showToast(`Задача создана → ${created.assignee} ✓`);
    }
    setShowNew(false); setEditTask(null);
    setNTitle(''); setNClient(''); setNAmount(''); setNDeadline(''); setNAssignee(''); setNContractor(''); setNDesc(''); setNParts([]);
    setNcFio(''); setNcPhone(''); setNcCompany('');
    } finally { setSaving(false); }
  };

  const repeatTask = (t) => {
    db.addTask({
      title: t.title, description: t.description, client_id: t.client_id, contractor_id: t.contractor_id,
      amount: t.amount, parts: t.parts || [], deadline: null, assignee: currentUser.name,
      _firstAction: 'повторный заказ (копия)',
    });
    setOpenTask(null);
    showToast(`«${t.title}» скопирована к тебе`);
  };

  // Чип статуса оплаты: ✓ оплачено / долг (small — компактный вариант для карточек доски)
  const PayChip = ({ t, small }) => {
    if (!t.amount && !paidSum(t.id)) return null; // без суммы — нечего показывать
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
        <I n="clock" size={11} /> проср. {dm(t.deadline)}
      </span>
    );
    if (st === 'soon') return (
      <span style={{ background: UI.accent, borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 700 }}>
        <I n="clock" size={11} /> {small ? dm(t.deadline) : `горит · ${dm(t.deadline)}`}
      </span>
    );
    if (!t.deadline) return null;
    return (
      <span style={{ background: UI.soft, borderRadius: 999, padding: pad, fontSize: fs, fontWeight: 600 }}><I n="clock" size={11} /> {dm(t.deadline)}</span>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Задачи</h1>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          {[['board', `Доска · ${activeTasks.length}`], ['debts', `Долги · ${debtTasks.length}`], ['done', `✓ Завершённые · ${doneTasks.length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={k === 'debts' && debtTasks.length && view !== 'debts' ? 'blink' : undefined} style={{
              border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700,
              background: view === k ? UI.dark : k === 'debts' && debtTasks.length ? 'rgba(192,57,43,.12)' : 'transparent',
              color: view === k ? '#fff' : k === 'debts' && debtTasks.length ? '#c0392b' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Новая задача</button>
      </div>

      {/* Модалка новой задачи */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(480px, 100%)', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>{editTask ? 'Правка задачи' : 'Новая задача'}</span>
              <button onClick={() => { setShowNew(false); setEditTask(null); }} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={inpS(UI)} placeholder="Что делаем (визитки 500 шт…)" value={nTitle} onChange={e => setNTitle(e.target.value)} />
            <select style={inpS(UI)} value={nClient} onChange={e => setNClient(e.target.value)}>
              <option value="">Клиент (необязательно)…</option>
              <option value="__new">+ Новый клиент…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {nClient === '__new' && (
              <div style={{ background: 'rgba(247,214,74,.15)', border: `1.5px solid ${UI.accent}`, borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input style={inpS(UI)} placeholder="Фамилия Имя *" value={ncFio} onChange={e => setNcFio(e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inpS(UI), flex: 1, minWidth: 0 }} placeholder="Телефон" value={ncPhone} onChange={e => setNcPhone(e.target.value)} />
                  <input style={{ ...inpS(UI), flex: 1, minWidth: 0 }} placeholder="Компания" value={ncCompany} onChange={e => setNcCompany(e.target.value)} />
                </div>
                <div style={{ color: UI.muted, fontSize: 12 }}>Клиент сразу попадёт в базу и привяжется к задаче</div>
              </div>
            )}

            {/* Сумма: одним числом или составом заказа (печать/дизайн…) */}
            {nParts.length === 0 ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inpS(UI), flex: 1, minWidth: 0, fontWeight: 700 }} type="number" placeholder="Сумма, ₽" value={nAmount} onChange={e => setNAmount(e.target.value)} />
                <button onClick={() => setNParts([{ name: 'Печать', sum: '' }, { name: 'Дизайн', sum: '' }])} style={{
                  border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '0 14px', fontSize: 12, color: UI.muted, fontWeight: 600, flexShrink: 0,
                }}>разбить на состав</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nParts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inpS(UI), flex: 1.3, minWidth: 0 }} placeholder="Часть (печать…)" value={p.name} onChange={e => setNParts(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                    <input style={{ ...inpS(UI), flex: 1, minWidth: 0, fontWeight: 700 }} type="number" placeholder="₽" value={p.sum} onChange={e => setNParts(prev => prev.map((x, idx) => idx === i ? { ...x, sum: e.target.value } : x))} />
                    <button onClick={() => setNParts(prev => prev.filter((_, idx) => idx !== i))} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 36, flexShrink: 0, fontSize: 13 }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setNParts(prev => [...prev, { name: '', sum: '' }])} style={{
                    border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '6px 13px', fontSize: 12, color: UI.muted, fontWeight: 600,
                  }}>+ часть</button>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 14 }}>
                    = {fmt(nParts.reduce((s, p) => s + (+p.sum || 0), 0))}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px 6px' }}><I n="clock" size={12} /> Дедлайн</div>
                <input style={{ ...inpS(UI) }} type="date" value={nDeadline} onChange={e => setNDeadline(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 4px 6px' }}><I n="user" size={12} /> В задачник</div>
                <select style={{ ...inpS(UI) }} value={nAssignee} onChange={e => setNAssignee(e.target.value)}>
                  <option value="">{currentUser.name} (я)</option>
                  {PEOPLE_COLUMNS.filter(p => p !== currentUser.name).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <select style={inpS(UI)} value={nContractor} onChange={e => setNContractor(e.target.value)}>
              <option value="">Контрагент, если перезаказ (необязательно)…</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name} · {c.service}</option>)}
            </select>
            <textarea style={{ ...inpS(UI), minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Описание (материал, размеры, детали…)" value={nDesc} onChange={e => setNDesc(e.target.value)} />
            <button onClick={createTask} disabled={saving} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Сохраняю…' : editTask ? 'Сохранить' : 'Создать задачу'}
            </button>
          </div>
        </div>
      )}

      {/* Поиск и быстрые фильтры */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск: задача или клиент" style={{
          width: 'min(280px, 100%)', padding: '10px 18px', borderRadius: 999, border: 'none',
          background: '#fff', boxShadow: UI.shadow, fontSize: 13.5, outline: 'none',
        }} />
        {[['debt', 'с долгом'], ['burning', 'горят']].map(([k, l]) => (
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
        {/* Фильтр по людям: свои — первыми */}
        <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button onClick={() => setPersonFlt('')} style={{
            border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, boxShadow: UI.shadow,
            background: personFlt === '' ? UI.dark : '#fff', color: personFlt === '' ? '#fff' : UI.dark,
          }}>Все</button>
          {[currentUser.name, ...PEOPLE_COLUMNS.filter(p => p !== currentUser.name)].map(p => (
            <button key={p} onClick={() => setPersonFlt(v => v === p ? '' : p)} style={{
              border: 'none', borderRadius: 999, padding: '8px 13px', fontSize: 12.5, fontWeight: 700, boxShadow: UI.shadow,
              background: personFlt === p ? UI.dark : '#fff', color: personFlt === p ? '#fff' : UI.dark,
            }}>{p === currentUser.name ? `${p} (я)` : p}</button>
          ))}
        </span>
      </div>

      {/* Списки долгов и завершённых — отдельно от доски */}
      {view !== 'board' && (
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, maxWidth: 860 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>{view === 'debts' ? 'Завершённые, но не оплаченные' : '✓ Завершённые и оплаченные'}</div>
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
            <div style={{ color: UI.muted, fontSize: 14 }}>{view === 'debts' ? 'По задачам долгов нет' : 'Пока пусто'}</div>
          )}
        </div>
      )}

      {view === 'debts' && (
        <div style={{ color: UI.muted, fontSize: 13, margin: '12px 4px' }}>
          Должники по мелочи переехали в раздел «Депозиты и долги» — там же, где депозиты.
        </div>
      )}

      {view === 'board' && (
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {STAGES.map((stage, si) => {
          const inCol = activeTasks.filter(t => (t.stage || 'Новая') === stage && (!personFlt || t.assignee === personFlt));
          const sum = inCol.reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <div key={stage} style={{ minWidth: 230, flex: 1, background: stage === 'Готово' ? '#f0ecdf' : UI.soft, borderRadius: 20, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 2px' }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{stage}</span>
                <span style={{ background: UI.dark, color: '#fff', borderRadius: 999, fontSize: 11.5, fontWeight: 700, padding: '2px 8px' }}>{inCol.length}</span>
                {sum > 0 && <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 11.5, fontWeight: 600 }}>{fmt(sum)}</span>}
              </div>

              {inCol.map(t => {
                const lastAction = t.log?.length ? t.log[t.log.length - 1] : null;
                const mine = canEdit(t);
                return (
                  // Компактная карточка; чужие — только просмотр (без кнопок)
                  <div key={t.id} onClick={() => { setOpenTask(t); setShowPayForm(false); }} style={{
                    background: '#fff', borderRadius: 15, padding: '9px 10px 8px', marginBottom: 7, boxShadow: UI.shadow, cursor: 'pointer',
                    opacity: personFlt || mine ? 1 : 0.75,
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25 }}>{t.title}</span>
                      <span title={t.assignee} style={{
                        marginLeft: 'auto', flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                        background: mine ? UI.accent : UI.dark, color: mine ? UI.dark : '#fff',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800,
                      }}>{t.assignee?.[0]}</span>
                    </div>
                    <div style={{ color: UI.muted, fontSize: 11, marginBottom: 5 }}>
                      {t.assignee} · {clientShort(t.client_id)}
                      {t.contractor_id && <> · <I n="factory" size={11} /> {contractors.find(c => c.id === t.contractor_id)?.name}</>}
                      {lastAction && <> · <span style={{ fontWeight: 600 }}>{lastAction.action}</span></>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: UI.soft, borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>{fmt(t.amount)}</span>
                      <PayChip t={t} small />
                      <DeadlineChip t={t} small />
                      {mine && (
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button disabled={si === 0} title="Предыдущий этап" onClick={(e) => stageMove(t, -1, e)} style={{
                            border: 'none', background: UI.soft, borderRadius: 999, padding: '3px 8px', fontSize: 11, opacity: si === 0 ? 0.3 : 1,
                          }}>←</button>
                          <button disabled={si === STAGES.length - 1} title="Следующий этап" onClick={(e) => stageMove(t, 1, e)} style={{
                            border: 'none', background: UI.soft, borderRadius: 999, padding: '3px 8px', fontSize: 11, opacity: si === STAGES.length - 1 ? 0.3 : 1,
                          }}>→</button>
                          <button title="Заказ выдан клиенту — завершить" onClick={(e) => finishTask(t, e)} style={{
                            border: 'none', background: stage === 'Готово' ? UI.accent : UI.soft, borderRadius: 999,
                            padding: '3px 9px', fontSize: 11.5, fontWeight: 800,
                          }}>✓</button>
                        </span>
                      )}
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
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
                  {canEdit(t) && (
                    <button onClick={() => openEdit(t)} title="Редактировать задачу" style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 13 }}><I n="pencil" size={13} /></button>
                  )}
                  {isOwner && (
                    <button onClick={() => { db.removeTask(t); setOpenTask(null); showToast(`«${t.title}» удалена`); }} title="Удалить задачу насовсем" style={{
                      border: 'none', background: 'rgba(192,57,43,.1)', color: '#c0392b', borderRadius: 999, padding: '0 13px', height: 32, fontSize: 12, fontWeight: 700,
                    }}>удалить</button>
                  )}
                  <button onClick={() => setOpenTask(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
                </span>
              </div>

              {!canEdit(t) && (
                <div style={{ background: UI.soft, borderRadius: 14, padding: '10px 14px', fontSize: 13, margin: '12px 0 4px', color: UI.muted }}>
                  <I n="eye" size={13} /> Задача {t.assignee} — только просмотр
                </div>
              )}

              {/* Этап заказа */}
              <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '12px 0 6px' }}>Этап</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {STAGES.map(st => (
                  <button key={st} disabled={!canEdit(t)} onClick={() => canEdit(t) && st !== (t.stage || 'Новая') && db.updateTask(t, { stage: st }, { who: currentUser.name, action: `→ этап: ${st}` })} style={{
                    border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                    background: (t.stage || 'Новая') === st ? UI.dark : UI.soft, color: (t.stage || 'Новая') === st ? '#fff' : UI.dark,
                    opacity: canEdit(t) || (t.stage || 'Новая') === st ? 1 : 0.5, cursor: canEdit(t) ? 'pointer' : 'default',
                  }}>{st}</button>
                ))}
              </div>

              {/* У кого задача — передача пилюлями (только своей) */}
              <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' }}>У кого сейчас</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {PEOPLE_COLUMNS.map(p => (
                  <button key={p} disabled={!canEdit(t)} onClick={() => canEdit(t) && transfer(t, p)} style={{
                    border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
                    background: t.assignee === p ? UI.dark : UI.soft, color: t.assignee === p ? '#fff' : UI.dark,
                    opacity: canEdit(t) || t.assignee === p ? 1 : 0.5, cursor: canEdit(t) ? 'pointer' : 'default',
                  }}>{p}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <Fact label="Клиент" value={c ? c.name : '—'} sub={c?.phone} UI={UI} />
                <Fact label="Оплата" value={debt <= 0 ? '✓ оплачено' : `долг ${fmt(debt)}`} danger={debt > 0}
                  sub={`заказ ${fmt(t.amount)}${paidTotal ? ` · внесено ${fmt(paidTotal)}` : ''}`} UI={UI} />
                <Fact label="Дедлайн" value={dm(t.deadline)} danger={dlStatus === 'overdue'} accent={dlStatus === 'soon'}
                  sub={dlStatus === 'overdue' ? 'просрочено!' : dlStatus === 'soon' ? 'горит' : 'в графике'} UI={UI} />
                <Fact label="У кого" value={t.assignee} UI={UI} />
              </div>

              {/* Отметки действий — только на своих задачах */}
              {canEdit(t) && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: UI.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Отметить действие</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {ACTION_PRESETS.map(a => (
                      <button key={a} onClick={() => addAction(t, a)} style={{
                        border: `1.5px solid ${UI.accent}`, background: 'rgba(247,214,74,.15)', borderRadius: 999,
                        padding: '7px 13px', fontSize: 12.5, fontWeight: 600,
                      }}>+ {a}</button>
                    ))}
                  </div>
                </>
              )}

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
                  <I n="factory" size={13} /> Перезаказ у контрагента: <b>{contractors.find(c => c.id === t.contractor_id)?.name}</b>
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
                  <I n="income" size={14} style={{ color: '#8a8a85' }} />
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
                    }}><I n="wallet" size={14} /> Записать оплату ({fmt(debt)})</button>
                  )}
                  {canEdit(t) && (t.done ? (
                    <button onClick={() => reopenTask(t)} style={{
                      border: 'none', background: UI.soft, borderRadius: 999, padding: '13px 18px', fontWeight: 700, fontSize: 14,
                    }}>↩ Вернуть в работу</button>
                  ) : (
                    <button onClick={() => finishTask(t)} style={{
                      border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '13px 18px', fontWeight: 800, fontSize: 14,
                    }}>✓ Заказ выдан</button>
                  ))}
                  <button onClick={() => repeatTask(t)} style={{
                    border: 'none', background: UI.soft, borderRadius: 999, padding: '13px 18px', fontWeight: 700, fontSize: 14,
                  }}><I n="repeat" size={13} /> Повторить</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const inpS = (UI) => ({
  width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`,
  background: UI.soft, fontSize: 14, outline: 'none',
});

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
