// «Контрагенты» на телефоне — две вкладки, как на компьютере:
//   «Задачи» — отдельный канбан задач подрядчикам, здесь вертикальным списком по этапам
//   «Подрядчики» — список с карточкой (его задачи + клиентские задачи с его участием)
// Этап двигается кнопками ← →: перетаскивания на тач-экранах нет.
// Долг подрядчику = полная сумма − оплачено (правило Кристи 2026-07-21).
import { useState } from 'react';
import I from '../../Icon.jsx';
import { localDate } from '../../dates.js';
import { M, Card, Pills, Btn, Chip, Sheet, Field, Empty, inputStyle, fmt } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = localDate();
const TOMORROW = localDate(new Date(Date.now() + 86400000));
const debtOf = (t) => (t.amount || 0) - (t.paid || 0);

export default function MContractors(props) {
  const { contractors } = props;
  const [view, setView] = useState('board'); // board | list
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 12px' }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Контрагенты</span>
        <button onClick={() => setShowSearch(v => !v)} aria-label="Поиск" style={{
          marginLeft: 'auto', border: 'none', background: M.card, borderRadius: 999,
          width: 38, height: 38, boxShadow: M.shadow, display: 'grid', placeItems: 'center',
        }}><I n="search" size={15} /></button>
      </div>

      {showSearch && (
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder={view === 'board' ? 'Поиск по задачам' : 'Поиск по подрядчикам'}
          style={{ ...inputStyle, marginBottom: 10 }} />
      )}

      <Pills value={view} onChange={setView} style={{ marginBottom: 14 }} options={[
        { key: 'board', label: 'Задачи' },
        { key: 'list', label: `Подрядчики · ${contractors.length}` },
      ]} />

      {view === 'board' ? <Board {...props} query={query} /> : <List {...props} query={query} />}
    </div>
  );
}

// ---------- Задачи подрядчикам ----------
function Board({ contractors, contractorTasks, db, CONTRACTOR_STAGES, showToast, query = '' }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const cName = (id) => contractors.find(c => c.id === id)?.name || '—';
  const q = query.trim().toLowerCase();

  const move = (t, dir, e) => {
    e?.stopPropagation();
    const i = CONTRACTOR_STAGES.indexOf(t.stage) + dir;
    if (i < 0 || i >= CONTRACTOR_STAGES.length) return;
    db.setContractorTaskStage(t, CONTRACTOR_STAGES[i]);
    showToast(`«${t.title}» → ${CONTRACTOR_STAGES[i]}`);
  };

  const dl = (t) => {
    if (!t.deadline) return null;
    if (t.stage === 'Забрали') return { text: dm(t.deadline), tone: 'soft' };
    if (t.deadline < TODAY) return { text: `просрочено ${dm(t.deadline)}`, tone: 'danger' };
    if (t.deadline <= TOMORROW) return { text: `горит · ${dm(t.deadline)}`, tone: 'accent' };
    return { text: dm(t.deadline), tone: 'soft' };
  };

  return (
    <div>
      <Btn kind="dark" wide onClick={() => setShowAdd(true)} style={{ marginBottom: 14 }}>
        <I n="plus" size={14} /> Задача подрядчику
      </Btn>

      {CONTRACTOR_STAGES.map((stage, si) => {
        const inStage = contractorTasks.filter(t => t.stage === stage
          && (!q || t.title.toLowerCase().includes(q) || cName(t.contractor_id).toLowerCase().includes(q)));
        // «Готово»: свежеотмеченные сверху (просьба Кристи 2026-08-07)
        if (stage === 'Готово') inStage.sort((a, b) => (b.stage_changed_at || '').localeCompare(a.stage_changed_at || ''));
        if (!inStage.length) return null;
        const colDebt = inStage.reduce((s, t) => s + Math.max(0, debtOf(t)), 0);
        return (
          <div key={stage} style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 8px',
              fontSize: 12.5, fontWeight: 800, color: M.muted, textTransform: 'uppercase', letterSpacing: 0.4,
            }}>
              {stage}
              <span style={{ background: M.card, borderRadius: 999, padding: '2px 9px', fontSize: 11.5 }}>{inStage.length}</span>
              {colDebt > 0 && <span style={{ marginLeft: 'auto', color: M.danger, textTransform: 'none' }}>долг {fmt(colDebt)} ₽</span>}
            </div>

            {inStage.map(t => {
              const d = dl(t);
              return (
                <div key={t.id} onClick={() => setEditTask(t)} style={{
                  background: M.card, borderRadius: 18, boxShadow: M.shadow, padding: '13px 14px', marginBottom: 8,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{t.title}</div>
                  <div style={{ color: M.muted, fontSize: 12, marginTop: 2 }}>
                    <I n="factory" size={11} /> {cName(t.contractor_id)}{t.comment ? ` · ${t.comment}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 9 }}>
                    {t.amount > 0 && <Chip>всего {fmt(t.amount)} ₽</Chip>}
                    {t.amount > 0 && (debtOf(t) > 0
                      ? <Chip tone="danger">долг {fmt(debtOf(t))} ₽</Chip>
                      : <Chip tone="ok">✓ оплачено</Chip>)}
                    {d && <Chip tone={d.tone}><I n="clock" size={11} /> {d.text}</Chip>}
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
                      {si > 0 && (
                        <button onClick={e => move(t, -1, e)} aria-label="Предыдущий этап" style={qBtn}><I n="chevronLeft" size={14} /></button>
                      )}
                      {si < CONTRACTOR_STAGES.length - 1 && (
                        <button onClick={e => move(t, 1, e)} aria-label="Следующий этап" style={qBtn}><I n="chevronRight" size={14} /></button>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {!contractorTasks.length && <Empty icon="factory" text="Задач подрядчикам нет" />}

      {showAdd && <TaskForm {...{ contractors, db, showToast }} onClose={() => setShowAdd(false)} />}
      {editTask && <TaskForm {...{ contractors, db, showToast }} task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}

// ---------- Форма задачи подрядчику (создание и правка) ----------
function TaskForm({ task, contractors, db, showToast, onClose }) {
  const [title, setTitle] = useState(task?.title || '');
  const [contractorId, setContractorId] = useState(task?.contractor_id ? String(task.contractor_id) : '');
  const [amount, setAmount] = useState(task?.amount || '');
  const [paid, setPaid] = useState(task?.paid || '');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [comment, setComment] = useState(task?.comment || '');

  const debt = (+amount || 0) - (+paid || 0);

  const save = () => {
    if (!title.trim()) { showToast('Укажи название', 'error'); return; }
    if (task) {
      db.updateContractorTask(task, {
        title: title.trim(), comment: comment.trim(),
        amount: +amount || null, paid: +paid || 0, deadline: deadline || null,
      });
      showToast('Исправлено ✓');
    } else {
      if (!contractorId) { showToast('Выбери подрядчика', 'error'); return; }
      db.addContractorTask({
        title: title.trim(), contractor_id: +contractorId,
        amount: +amount || null, paid: +paid || 0, deadline: deadline || null,
        stage: 'В работе', task_id: null, comment: comment.trim(),
      });
      showToast('Задача подрядчику создана ✓');
    }
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={task ? 'Правка задачи' : 'Задача подрядчику'}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="dark" style={{ flex: 1 }} onClick={save}>{task ? 'Сохранить' : 'Создать'}</Btn>
          {task && (
            <Btn kind="danger" onClick={() => { db.removeContractorTask(task); showToast(`«${task.title}» удалена`); onClose(); }}>
              Удалить
            </Btn>
          )}
        </div>
      }>
      <Field label="Что нужно">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="печать баннера 3×6" />
      </Field>
      {!task && (
        <Field label="Кому отдаём">
          <select style={inputStyle} value={contractorId} onChange={e => setContractorId(e.target.value)}>
            <option value="">Выбрать…</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.name} · {c.service}</option>)}
          </select>
        </Field>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Полная сумма, ₽">
          <input style={inputStyle} type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
        <Field label="Оплачено, ₽">
          <input style={inputStyle} type="number" inputMode="numeric" value={paid} onChange={e => setPaid(e.target.value)} />
        </Field>
      </div>
      {+amount > 0 && (
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 12, color: debt > 0 ? M.danger : M.ok }}>
          {debt > 0 ? `долг подрядчику ${fmt(debt)} ₽` : '✓ оплачено полностью'}
        </div>
      )}
      <Field label="Срок">
        <input style={inputStyle} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
      </Field>
      <Field label="Комментарий">
        <input style={inputStyle} value={comment} onChange={e => setComment(e.target.value)} />
      </Field>
    </Sheet>
  );
}

// ---------- Подрядчики ----------
function List({ contractors, contractorTasks, tasks, clients, db, showToast, query = '' }) {
  const [openId, setOpenId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = contractors.filter(c => !q || c.name.toLowerCase().includes(q) || (c.service || '').toLowerCase().includes(q));
  const boardTasks = (id) => contractorTasks.filter(t => t.contractor_id === id);
  const linkedClientTasks = (id) => tasks.filter(t => t.contractor_id === id);
  const clientShort = (id) => clients.find(c => c.id === id)?.name?.split('·')[0]?.trim() || '—';

  const open = openId ? contractors.find(c => c.id === openId) : null;

  return (
    <div>
      {visible.map(c => {
        const bt = boardTasks(c.id);
        const active = bt.filter(t => t.stage !== 'Забрали').length;
        const sum = bt.reduce((s, t) => s + (t.amount || 0), 0);
        const debt = bt.reduce((s, t) => s + Math.max(0, debtOf(t)), 0);
        return (
          <Card key={c.id} onClick={() => setOpenId(c.id)} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{
                width: 40, height: 40, borderRadius: '50%', background: M.dark, color: '#fff',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}><I n="factory" size={16} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ color: M.muted, fontSize: 12.5 }}>{c.service || '—'}</div>
              </span>
              <I n="chevronRight" size={15} style={{ color: M.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Chip tone={active ? 'accent' : 'soft'}>в работе: {active}</Chip>
              {sum > 0 && <Chip>{fmt(sum)} ₽</Chip>}
              {debt > 0 && <Chip tone="danger">долг {fmt(debt)} ₽</Chip>}
            </div>
          </Card>
        );
      })}
      {!visible.length && <Empty icon="factory" text={q ? `Никого не нашла по «${query}»` : 'Подрядчиков пока нет'} />}

      <Btn kind="dark" wide onClick={() => setShowAdd(true)} style={{ marginBottom: 8 }}>
        <I n="plus" size={14} /> Новый контрагент
      </Btn>

      {showAdd && <ContractorForm db={db} showToast={showToast} onClose={() => setShowAdd(false)} />}

      {open && (
        <Sheet open onClose={() => setOpenId(null)} title={open.name}>
          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 44, height: 44, borderRadius: '50%', background: M.dark, color: '#fff',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}><I n="factory" size={18} /></span>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{open.name}</div>
                <div style={{ color: M.muted, fontSize: 13 }}>{open.service || '—'}</div>
              </span>
              {open.phone && (
                <a href={`tel:${open.phone.replace(/[^\d+]/g, '')}`} aria-label="Позвонить" style={{
                  marginLeft: 'auto', background: M.dark, color: '#fff', borderRadius: 999,
                  width: M.tap, height: M.tap, display: 'grid', placeItems: 'center', flexShrink: 0, textDecoration: 'none',
                }}><I n="phone" size={17} /></a>
              )}
            </div>
          </Card>

          <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 2px' }}>Задачи в его канбане</div>
          <Card style={{ padding: '4px 16px' }}>
            {boardTasks(open.id).map((t, i, arr) => (
              <div key={t.id} style={{
                display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', fontSize: 13.5,
                borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${M.line}`,
              }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ color: M.muted, fontSize: 12 }}>{t.stage}{t.amount ? ` · ${fmt(t.amount)} ₽` : ''}</div>
                </span>
                {debtOf(t) > 0 && <Chip tone="danger">долг {fmt(debtOf(t))} ₽</Chip>}
              </div>
            ))}
            {!boardTasks(open.id).length && <Empty icon="factory" text="Задач нет" />}
          </Card>

          {linkedClientTasks(open.id).length > 0 && (
            <>
              <div style={{ fontWeight: 800, fontSize: 14, margin: '12px 0 2px' }}>Клиентские задачи с его участием</div>
              <Card style={{ padding: '4px 16px' }}>
                {linkedClientTasks(open.id).map((t, i, arr) => (
                  <div key={t.id} style={{
                    display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', fontSize: 13.5,
                    borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${M.line}`,
                  }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ color: M.muted, fontSize: 12 }}>{clientShort(t.client_id)} · у {t.assignee}</div>
                    </span>
                    <span style={{ fontWeight: 800, flexShrink: 0 }}>{fmt(t.amount)} ₽</span>
                  </div>
                ))}
              </Card>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}

function ContractorForm({ db, showToast, onClose }) {
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [phone, setPhone] = useState('');
  const save = () => {
    if (!name.trim()) { showToast('Укажи название', 'error'); return; }
    db.addContractor({ name: name.trim(), service: service.trim(), phone: phone.trim() });
    showToast('Контрагент добавлен ✓');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Новый контрагент" footer={<Btn kind="dark" wide onClick={save}>Добавить</Btn>}>
      <Field label="Название"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Континент" /></Field>
      <Field label="Чем занимается"><input style={inputStyle} value={service} onChange={e => setService(e.target.value)} placeholder="широкоформат, гравировка…" /></Field>
      <Field label="Телефон"><input style={inputStyle} type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
    </Sheet>
  );
}

const qBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 36, height: 36,
  display: 'grid', placeItems: 'center', flexShrink: 0,
};
