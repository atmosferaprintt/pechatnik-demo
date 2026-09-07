// Задачи на телефоне: вместо канбана — вертикальный список, сгруппированный по этапам.
// Перетаскивания нет (на тач-экранах HTML5 drag не работает — см. TODO от 2026-07-17):
// этап двигается кнопкой «→» на карточке и пилюлями в карточке задачи.
import { useState } from 'react';
import I from '../../Icon.jsx';
import { debtOfTask } from '../../taskMoney.js';
import { deadlineStatus, involvesPerson } from '../../taskStatus.js';
import * as act from '../../taskActions.js';
import { M, Pills, Btn, Chip, Empty, money, inputStyle } from '../ui.jsx';
import MTaskSheet, { PayChip, DeadlineChip } from './MTaskSheet.jsx';
import MTaskForm from './MTaskForm.jsx';

export default function MTasks(props) {
  const { tasks, clients, transactions, currentUser, isOwner, PEOPLE_COLUMNS, STAGES, db, showToast, onPayTask } = props;

  const [view, setView] = useState('board');            // board | debts | done
  const [personFlt, setPersonFlt] = useState(isOwner ? '' : currentUser.name);
  // «у кого сейчас» или «участвовала» — цех ищет свои заказы, даже пока они числятся за менеджером
  const [personMode, setPersonMode] = useState('now'); // now | any
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formTask, setFormTask] = useState(null);       // null — новая задача

  const ctx = { db, currentUser, showToast };
  const clientShort = (id) => clients.find(c => c.id === id)?.name?.split('·')[0]?.trim() || '';
  const taskDebt = (t) => debtOfTask(transactions, t);

  const matches = (t) => {
    const q = query.trim().toLowerCase();
    const okQ = !q || t.title.toLowerCase().includes(q) || clientShort(t.client_id).toLowerCase().includes(q);
    const okP = !personFlt || (personMode === 'any' ? involvesPerson(t, personFlt) : t.assignee === personFlt);
    return okQ && okP;
  };

  const activeTasks = tasks.filter(t => !t.done && matches(t));
  const debtTasks = tasks.filter(t => t.done && taskDebt(t) > 0 && matches(t));
  const doneTasks = tasks.filter(t => t.done && taskDebt(t) <= 0 && matches(t));

  const orderKey = (t) => t.sort_order ?? t.id;
  const byOrder = (a, b) => orderKey(a) - orderKey(b);

  const openEdit = (t) => { setOpenTask(null); setFormTask(t); setFormOpen(true); };
  const newTask = () => { setFormTask(null); setFormOpen(true); };

  const Card = ({ t }) => {
    const st = deadlineStatus(t);
    const stageIdx = STAGES.indexOf(t.stage || 'Новая');
    const last = t.log?.length ? t.log[t.log.length - 1] : null;
    return (
      <div onClick={() => setOpenTask(t)} style={{
        background: M.card, borderRadius: 18, boxShadow: M.shadow, padding: '13px 14px', marginBottom: 8,
        borderLeft: st === 'overdue' ? `3px solid ${M.danger}` : st === 'soon' ? `3px solid ${M.accent}` : '3px solid transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{t.title}</div>
            <div style={{ color: M.muted, fontSize: 12, marginTop: 2 }}>
              {clientShort(t.client_id) || 'без клиента'} · {money(t.amount)}
            </div>
          </span>
          {/* Аватар ответственной: жёлтый — моя задача */}
          <span style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: t.assignee === currentUser.name ? M.accent : M.soft,
            display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800,
          }}>{(t.assignee || '?')[0]}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 9 }}>
          <PayChip task={t} transactions={transactions} />
          <DeadlineChip task={t} />
          {last && <Chip style={{ background: 'rgba(247,214,74,.25)', color: M.dark }}>{last.action}</Chip>}

          {/* Быстрый шаг по этапам — вместо перетаскивания */}
          {view === 'board' && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
              {stageIdx > 0 && (
                <button onClick={e => { e.stopPropagation(); act.moveStage(ctx, t, -1, STAGES); }}
                  aria-label="Предыдущий этап" style={qBtn}><I n="chevronLeft" size={14} /></button>
              )}
              {stageIdx < STAGES.length - 1 ? (
                <button onClick={e => { e.stopPropagation(); act.moveStage(ctx, t, 1, STAGES); }}
                  aria-label="Следующий этап" style={qBtn}><I n="chevronRight" size={14} /></button>
              ) : (
                <button onClick={e => { e.stopPropagation(); act.finishTask(ctx, t, transactions); }}
                  aria-label="Заказ выдан" style={{ ...qBtn, background: M.dark, color: '#fff' }}><I n="check" size={14} /></button>
              )}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 12px' }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Задачи</span>
        <button onClick={() => setShowSearch(v => !v)} aria-label="Поиск" style={{
          marginLeft: 'auto', border: 'none', background: M.card, borderRadius: 999,
          width: 38, height: 38, boxShadow: M.shadow, display: 'grid', placeItems: 'center',
        }}><I n="search" size={15} /></button>
        <Btn kind="dark" onClick={newTask} style={{ padding: '10px 15px', minHeight: 38 }}><I n="plus" size={14} /> Задача</Btn>
      </div>

      {showSearch && (
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Поиск: задача или клиент"
          style={{ ...inputStyle, marginBottom: 10 }} />
      )}

      <Pills value={view} onChange={setView} style={{ marginBottom: 8 }} options={[
        { key: 'board', label: `Доска · ${activeTasks.length}` },
        { key: 'debts', label: `Долги · ${debtTasks.length}` },
        { key: 'done', label: `✓ ${doneTasks.length}` },
      ]} />

      {/* Фильтр по людям: своё имя первым — сотрудница открывает свои задачи сразу */}
      <Pills value={personFlt} onChange={setPersonFlt} style={{ marginBottom: personFlt ? 8 : 14 }} options={[
        { key: '', label: 'Все' },
        { key: currentUser.name, label: `${currentUser.name} (я)` },
        ...PEOPLE_COLUMNS.filter(p => p !== currentUser.name).map(p => ({ key: p, label: p })),
      ]} />

      {/* Пока выбран человек — чем считать «его» задачи: держит сейчас или вообще вёл */}
      {personFlt && (
        <Pills value={personMode} onChange={setPersonMode} style={{ marginBottom: 14 }} options={[
          { key: 'now', label: 'у кого сейчас' },
          { key: 'any', label: 'участвовала' },
        ]} />
      )}

      {view === 'board' ? (
        STAGES.map(stage => {
          const inCol = activeTasks.filter(t => (t.stage || 'Новая') === stage).sort(byOrder);
          if (!inCol.length) return null;
          return (
            <div key={stage} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 8px',
                fontSize: 12.5, fontWeight: 800, color: M.muted, textTransform: 'uppercase', letterSpacing: 0.4,
              }}>
                {stage}
                <span style={{ background: M.card, borderRadius: 999, padding: '2px 9px', fontSize: 11.5 }}>{inCol.length}</span>
              </div>
              {inCol.map(t => <Card key={t.id} t={t} />)}
            </div>
          );
        })
      ) : (
        <div>
          <div style={{ color: M.muted, fontSize: 12.5, margin: '0 4px 10px' }}>
            {view === 'debts' ? 'Заказ выдан, деньги ещё не пришли. Тап — открыть и записать оплату.' : 'Архив завершённых и оплаченных.'}
          </div>
          {(view === 'debts' ? debtTasks : doneTasks).map(t => <Card key={t.id} t={t} />)}
        </div>
      )}

      {view === 'board' && !activeTasks.length && (
        <Empty icon="check" text={personFlt ? `У ${personFlt === currentUser.name ? 'тебя' : personFlt} задач нет` : 'Задач нет'} />
      )}
      {view === 'debts' && !debtTasks.length && <Empty icon="wallet" text="По задачам долгов нет" />}
      {view === 'done' && !doneTasks.length && <Empty icon="check" text="Пока пусто" />}

      <MTaskSheet {...props} task={openTask} onClose={() => setOpenTask(null)} onEdit={openEdit} onPayTask={onPayTask} />
      {/* key — чтобы форма пересоздавалась под новую задачу и поля заполнялись заново */}
      {formOpen && (
        <MTaskForm {...props} key={formTask?.id || 'new'} open task={formTask}
          onClose={() => { setFormOpen(false); setFormTask(null); }} />
      )}
    </div>
  );
}

const qBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 36, height: 36,
  display: 'grid', placeItems: 'center', flexShrink: 0,
};
