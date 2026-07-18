// Раздел «Контрагенты» — две вкладки:
//   «Подрядчики» — список с добавлением, карточка с перезаказами
//   «Задачи» — ОТДЕЛЬНЫЙ канбан задач контрагентам (не смешивается с клиентскими задачами)
// Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';
import { localDate } from '../dates.js';

const fmt = (n) => (n || 0).toLocaleString('ru-RU');
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = localDate();
const TOMORROW = localDate(new Date(Date.now() + 86400000));

export default function Contractors(props) {
  const { contractors, UI } = props;
  const [view, setView] = useState('board'); // board | list
  const [query, setQuery] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Контрагенты</h1>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          {[['board', 'Задачи'], ['list', `Подрядчики · ${contractors.length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{
              border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 13.5, fontWeight: 700,
              background: view === k ? UI.dark : 'transparent', color: view === k ? '#fff' : UI.dark,
            }}>{l}</button>
          ))}
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={view === 'board' ? 'Поиск по задачам' : 'Поиск по подрядчикам'} style={{
            marginLeft: 'auto', width: 'min(240px, 100%)', padding: '10px 18px', borderRadius: 999, border: 'none',
            background: '#fff', boxShadow: UI.shadow, fontSize: 13.5, outline: 'none',
          }} />
      </div>
      {view === 'board' ? <ContractorBoard {...props} query={query} /> : <ContractorList {...props} query={query} />}
    </div>
  );
}

// ---------- Канбан задач контрагентам ----------
function ContractorBoard({ contractors, contractorTasks, db, CONTRACTOR_STAGES, UI, showToast, query = '' }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eTitle, setETitle] = useState('');
  const [eComment, setEComment] = useState('');
  const [eAmount, setEAmount] = useState('');
  const [eDeadline, setEDeadline] = useState('');

  const startEdit = (t) => {
    setEditId(t.id); setETitle(t.title); setEComment(t.comment || ''); setEAmount(t.amount || ''); setEDeadline(t.deadline || '');
  };

  const saveEdit = (t) => {
    if (!eTitle.trim()) { showToast('Название не может быть пустым', 'error'); return; }
    db.updateContractorTask(t, { title: eTitle.trim(), comment: eComment.trim(), amount: +eAmount || null, deadline: eDeadline || null });
    setEditId(null);
    showToast('Исправлено ✓');
  };

  const removeTask = (t) => {
    db.removeContractorTask(t);
    showToast(`«${t.title}» удалена`);
  };
  const [title, setTitle] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [comment, setComment] = useState('');

  const cName = (id) => contractors.find(c => c.id === id)?.name || '—';

  const move = (task, dir, e) => {
    e?.stopPropagation();
    const i = CONTRACTOR_STAGES.indexOf(task.stage) + dir;
    if (i < 0 || i >= CONTRACTOR_STAGES.length) return;
    db.setContractorTaskStage(task, CONTRACTOR_STAGES[i]);
    showToast(`«${task.title}» → ${CONTRACTOR_STAGES[i]}`);
  };

  const add = () => {
    if (!title.trim() || !contractorId) { showToast('Укажи название и подрядчика', 'error'); return; }
    db.addContractorTask({
      title: title.trim(), contractor_id: +contractorId,
      amount: +amount || null, deadline: deadline || null, stage: 'В работе', task_id: null, comment: comment.trim(),
    });
    setTitle(''); setContractorId(''); setAmount(''); setDeadline(''); setComment(''); setShowAdd(false);
    showToast('Задача подрядчику создана ✓');
  };

  const dlChip = (t) => {
    if (!t.deadline || t.stage === 'Забрали') return t.deadline ? { text: dm(t.deadline), style: { background: UI.soft } } : null;
    if (t.deadline < TODAY) return { text: `просрочено ${dm(t.deadline)}`, style: { background: '#c0392b', color: '#fff' }, blink: true };
    if (t.deadline <= TOMORROW) return { text: `горит · ${dm(t.deadline)}`, style: { background: UI.accent } };
    return { text: dm(t.deadline), style: { background: UI.soft } };
  };

  const input = {
    width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 14, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <button onClick={() => setShowAdd(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Задача подрядчику</button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
        {CONTRACTOR_STAGES.map((stage, si) => {
          const q = query.trim().toLowerCase();
          const inStage = contractorTasks.filter(t => t.stage === stage
            && (!q || t.title.toLowerCase().includes(q) || (contractors.find(c => c.id === t.contractor_id)?.name || '').toLowerCase().includes(q)));
          const sum = inStage.reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <div key={stage} style={{ minWidth: 260, flex: 1, background: si === CONTRACTOR_STAGES.length - 1 ? '#f0ecdf' : UI.soft, borderRadius: 22, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{stage}</span>
                <span style={{ background: UI.dark, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 700, padding: '2px 9px' }}>{inStage.length}</span>
                <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 12, fontWeight: 600 }}>{sum ? `${fmt(sum)} ₽` : ''}</span>
              </div>

              {inStage.map(t => {
                const dl = dlChip(t);
                return (
                  <div key={t.id} style={{ background: '#fff', borderRadius: 18, padding: '14px 14px 12px', marginBottom: 10, boxShadow: UI.shadow }}>
                    {editId === t.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
                        <input style={input} value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Название" />
                        <input style={input} value={eComment} onChange={e => setEComment(e.target.value)} placeholder="Комментарий" />
                        <div style={{ display: 'flex', gap: 7 }}>
                          <input style={{ ...input, flex: 1, minWidth: 0 }} type="number" value={eAmount} onChange={e => setEAmount(e.target.value)} placeholder="Сумма, ₽" />
                          <input style={{ ...input, flex: 1, minWidth: 0 }} type="date" value={eDeadline} onChange={e => setEDeadline(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 7 }}>
                          <button onClick={() => saveEdit(t)} style={{ flex: 1, border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '9px 0', fontWeight: 800, fontSize: 13 }}>Сохранить</button>
                          <button onClick={() => setEditId(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '9px 14px', fontSize: 13 }}>✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => startEdit(t)} title="Редактировать" style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}><I n="pencil" size={11} /></button>
                        <button onClick={() => removeTask(t)} title="Удалить" style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '3px 8px', fontSize: 11, color: UI.muted, cursor: 'pointer' }}>✕</button>
                      </span>
                    </div>
                    <div style={{ color: UI.muted, fontSize: 12.5, marginBottom: 10 }}><I n="factory" size={12} /> {cName(t.contractor_id)}{t.comment ? ` · ${t.comment}` : ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {t.amount && <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}>{fmt(t.amount)} ₽</span>}
                      {dl && <span className={dl.blink ? 'blink' : undefined} style={{ ...dl.style, borderRadius: 999, padding: '4px 10px', fontSize: 12.5, fontWeight: 700 }}><I n="clock" size={11} /> {dl.text}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button disabled={si === 0} onClick={(e) => move(t, -1, e)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 14px', fontSize: 13, opacity: si === 0 ? 0.3 : 1 }}>←</button>
                      <button disabled={si === CONTRACTOR_STAGES.length - 1} onClick={(e) => move(t, 1, e)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 14px', fontSize: 13, opacity: si === CONTRACTOR_STAGES.length - 1 ? 0.3 : 1 }}>→</button>
                    </div>
                      </>
                    )}
                  </div>
                );
              })}
              {!inStage.length && <div style={{ color: UI.muted, fontSize: 13, padding: 8 }}>Пусто</div>}
            </div>
          );
        })}
      </div>

      {/* Новая задача подрядчику */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(440px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Задача подрядчику</span>
              <button onClick={() => setShowAdd(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={input} placeholder="Что нужно (например, печать баннера)" value={title} onChange={e => setTitle(e.target.value)} />
            <select style={input} value={contractorId} onChange={e => setContractorId(e.target.value)}>
              <option value="">Кому отдаём…</option>
              {contractors.map(c => <option key={c.id} value={c.id}>{c.name} · {c.service}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ ...input, flex: 1 }} type="number" placeholder="Сумма, ₽" value={amount} onChange={e => setAmount(e.target.value)} />
              <input style={{ ...input, flex: 1 }} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <input style={input} placeholder="Комментарий" value={comment} onChange={e => setComment(e.target.value)} />
            <button onClick={add} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Создать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Список подрядчиков ----------
function ContractorList({ contractors, contractorTasks, tasks, clients, db, UI, showToast, query = '' }) {
  const visibleContractors = contractors.filter(c => {
    const q = query.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.service || '').toLowerCase().includes(q);
  });
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [phone, setPhone] = useState('');

  // Перезаказы контрагента: его задачи из отдельного канбана + клиентские задачи с пометкой
  const boardTasks = (id) => contractorTasks.filter(t => t.contractor_id === id);
  const linkedClientTasks = (id) => tasks.filter(t => t.contractor_id === id);
  const clientShort = (id) => clients.find(c => c.id === id)?.name?.split('·')[0]?.trim() || '—';

  const add = () => {
    if (!name.trim()) { showToast('Укажи название', 'error'); return; }
    db.addContractor({ name: name.trim(), service: service.trim(), phone: phone.trim() });
    setName(''); setService(''); setPhone(''); setShowAdd(false);
    showToast('Контрагент добавлен ✓');
  };

  const input = {
    width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 14, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: 16 }}>
        <button onClick={() => setShowAdd(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Контрагент</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {visibleContractors.map(c => {
          const bt = boardTasks(c.id);
          const active = bt.filter(t => t.stage !== 'Забрали').length;
          const sum = bt.reduce((s, t) => s + (t.amount || 0), 0);
          return (
            <div key={c.id} onClick={() => setOpenId(c.id)} style={{ background: '#fff', borderRadius: 22, boxShadow: UI.shadow, padding: 20, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{
                  width: 42, height: 42, borderRadius: '50%', background: UI.dark, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16,
                }}><I n="factory" size={17} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                  <div style={{ color: UI.muted, fontSize: 13 }}>{c.service || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12.5 }}>
                {c.phone && <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 10px' }}>{c.phone}</span>}
                <span style={{ background: active ? UI.accent : UI.soft, borderRadius: 999, padding: '4px 10px', fontWeight: 700 }}>
                  в работе: {active}
                </span>
                {sum > 0 && <span style={{ background: UI.soft, borderRadius: 999, padding: '4px 10px', fontWeight: 700 }}>{fmt(sum)} ₽</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Карточка контрагента */}
      {openId && (() => {
        const c = contractors.find(x => x.id === openId);
        const bt = boardTasks(c.id);
        const lt = linkedClientTasks(c.id);
        return (
          <div onClick={() => setOpenId(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 28, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}><I n="factory" size={18} /> {c.name}</div>
                  <div style={{ color: UI.muted, fontSize: 13.5 }}>{c.service}{c.phone ? ` · ${c.phone}` : ''}</div>
                </div>
                <button onClick={() => setOpenId(null)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
              </div>

              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Задачи в его канбане</div>
              {bt.length ? bt.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{t.title}</span>
                  <span style={{ background: UI.soft, borderRadius: 999, padding: '3px 10px', fontSize: 12 }}>{t.stage}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{t.amount ? `${fmt(t.amount)} ₽` : ''}</span>
                </div>
              )) : <div style={{ color: UI.muted, fontSize: 13.5 }}>Задач нет</div>}

              {lt.length > 0 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 14, margin: '16px 0 6px' }}>Клиентские задачи с его участием</div>
                  {lt.map(t => (
                    <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>{t.title}</span>
                      <span style={{ color: UI.muted, fontSize: 12.5 }}>{clientShort(t.client_id)} · у {t.assignee}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(t.amount)} ₽</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Добавление контрагента */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новый контрагент</span>
              <button onClick={() => setShowAdd(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={input} placeholder="Название (например, Континент)" value={name} onChange={e => setName(e.target.value)} />
            <input style={input} placeholder="Чем занимается (широкоформат, гравировка…)" value={service} onChange={e => setService(e.target.value)} />
            <input style={input} placeholder="Телефон" value={phone} onChange={e => setPhone(e.target.value)} />
            <button onClick={add} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
