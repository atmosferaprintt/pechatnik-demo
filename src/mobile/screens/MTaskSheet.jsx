// Карточка задачи на телефоне — шит снизу. То же, что в модалке на компьютере:
// этап, у кого, деньги, отметки, история, состав заказа, оплаты и кнопки завершения.
// Действия зовут общий src/taskActions.js — тексты в истории одинаковые везде.
import I from '../../Icon.jsx';
import { taskIncomeRows, taskRefundRows, paidOfTask, debtOfTask } from '../../taskMoney.js';
import { deadlineStatus, ACTION_PRESETS } from '../../taskStatus.js';
import * as act from '../../taskActions.js';
import { M, Sheet, Btn, Chip, money, fmt } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';

// Чип оплаты: долг / оплачено / переплата / отказ
export function PayChip({ task, transactions }) {
  if (!task.amount && !paidOfTask(transactions, task)) return null;
  const debt = debtOfTask(transactions, task);
  if (task.cancelled) {
    const owed = paidOfTask(transactions, task);
    return owed > 0
      ? <Chip tone="danger">вернуть {money(owed)}</Chip>
      : <Chip>✕ отказ</Chip>;
  }
  if (task.amount > 0 && debt < 0) return <Chip style={{ background: 'rgba(243,156,18,.22)', color: '#8a5a00' }}>переплата {money(-debt)}</Chip>;
  if (debt <= 0) return <Chip tone="accent">✓ оплачено</Chip>;
  return <Chip tone="danger">долг {money(debt)}</Chip>;
}

export function DeadlineChip({ task }) {
  const st = deadlineStatus(task);
  if (st === 'overdue') return <Chip tone="danger"><I n="clock" size={11} /> проср. {dm(task.deadline)}</Chip>;
  if (st === 'soon') return <Chip tone="accent"><I n="clock" size={11} /> {dm(task.deadline)}</Chip>;
  if (!task.deadline) return null;
  return <Chip><I n="clock" size={11} /> {dm(task.deadline)}</Chip>;
}

function Label({ children }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, color: M.muted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '14px 0 7px' }}>{children}</div>;
}

function Fact({ label, value, sub, danger, accent }) {
  return (
    <div style={{ background: M.card, borderRadius: 16, padding: '11px 13px', flex: '1 1 44%', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: M.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 2, color: danger ? M.danger : accent ? '#8a5a00' : M.dark, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: M.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function MTaskSheet(props) {
  const {
    task, onClose, onEdit, onPayTask, tasks, clients, contractors, transactions, categories, banks,
    PAYMENT_METHODS, currentUser, isOwnerAccount, db, PEOPLE_COLUMNS, STAGES, showToast,
  } = props;

  if (!task) return null;
  // Берём свежую версию из списка: пока шит открыт, данные могли обновиться по realtime
  const t = tasks.find(x => x.id === task.id) || task;
  const ctx = { db, currentUser, showToast };

  const c = clients.find(x => x.id === t.client_id);
  const paid = taskIncomeRows(transactions, t.id);
  const refunded = taskRefundRows(transactions, t.id);
  const paidTotal = paidOfTask(transactions, t);
  const debt = debtOfTask(transactions, t);
  const dlStatus = deadlineStatus(t);
  const catName = (id) => categories.find(x => x.id === id)?.name || '?';
  const mLabel = (k) => PAYMENT_METHODS.find(m => m.key === k)?.label || k;
  const payWay = (method, bankId, bankNm) => method === 'deposit' ? 'Из предоплаты'
    : mLabel(method) + (bankNm || bankId ? ` · ${bankNm || banks.find(b => b.id === bankId)?.name || ''}` : '');

  const rows = [
    ...(t.hidden_rows || []).map((r, i) => ({ key: `h${i}`, refund: r.type === 'expense', cat: null, way: payWay(r.method, null, r.bank), who: r.who, date: dm(r.date), amount: r.amount })),
    ...paid.map(p => ({ key: `v${p.id}`, refund: false, cat: p.payment_method === 'deposit' ? null : catName(p.category_id), way: payWay(p.payment_method, p.bank_id), who: p.created_by, date: dm(p.op_date), amount: p.amount })),
    ...refunded.map(p => ({ key: `r${p.id}`, refund: true, cat: catName(p.category_id), way: payWay(p.payment_method, p.bank_id), who: p.created_by, date: dm(p.op_date), amount: p.amount })),
  ];

  const footer = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {debt > 0 && (
        <Btn kind="accent" wide onClick={() => { onPayTask(t); onClose(); }}>
          <I n="wallet" size={14} /> Записать оплату ({money(debt)})
        </Btn>
      )}
      {t.done ? (
        <Btn wide onClick={() => { act.reopenTask(ctx, t); onClose(); }}>↩ Вернуть в работу</Btn>
      ) : (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <Btn kind="dark" wide onClick={() => { act.finishTask(ctx, t, transactions); onClose(); }}>✓ Заказ выдан</Btn>
          <Btn kind="danger" onClick={() => { act.cancelTask(ctx, t, transactions); onClose(); }}>✕ Отказ</Btn>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={!!task} onClose={onClose} title={t.title} footer={footer}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <PayChip task={t} transactions={transactions} />
        <DeadlineChip task={t} />
        {t.cancelled && <Chip>✕ отказ клиента</Chip>}
        {t.done && !t.cancelled && <Chip tone="ok">завершена</Chip>}
      </div>
      <div style={{ color: M.muted, fontSize: 12 }}>создана {dm(t.created_at)}</div>

      <Label>Этап</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        {STAGES.map(st => (
          <Btn key={st} wide kind={(t.stage || 'Новая') === st ? 'dark' : 'soft'}
            style={{ padding: '10px 8px', fontSize: 13 }}
            onClick={() => act.setStage(ctx, t, st)}>{st}</Btn>
        ))}
      </div>

      <Label>У кого сейчас</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PEOPLE_COLUMNS.map(p => (
          <Btn key={p} kind={t.assignee === p ? 'dark' : 'soft'}
            style={{ padding: '9px 14px', fontSize: 13, minHeight: 40 }}
            onClick={() => act.transferTask(ctx, t, p)}>{p}</Btn>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <Fact label="Клиент" value={c ? c.name.split('·')[0].trim() : '—'} sub={c?.phone} />
        <Fact label="Оплата"
          value={t.cancelled
            ? (paidTotal > 0 ? `вернуть ${money(paidTotal)}` : '✕ в расчёте')
            : t.amount > 0 && debt < 0 ? `переплата ${money(-debt)}` : debt <= 0 ? '✓ оплачено' : `долг ${money(debt)}`}
          danger={debt > 0 || (t.cancelled && paidTotal > 0)} accent={!t.cancelled && t.amount > 0 && debt < 0}
          sub={`заказ ${money(t.amount)} · оплачено ${money(paidTotal)}`} />
        <Fact label="Дедлайн" value={dm(t.deadline)} danger={dlStatus === 'overdue'} accent={dlStatus === 'soon'}
          sub={dlStatus === 'overdue' ? 'просрочено!' : dlStatus === 'soon' ? 'горит' : 'в графике'} />
        <Fact label="У кого" value={t.assignee} />
      </div>

      <Label>Отметить действие</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ACTION_PRESETS.map(a => (
          <button key={a} onClick={() => act.addAction(ctx, t, a)} style={{
            border: `1.5px solid ${M.accent}`, background: 'rgba(247,214,74,.15)', borderRadius: 999,
            padding: '9px 13px', fontSize: 12.5, fontWeight: 600, minHeight: 40,
          }}>+ {a}</button>
        ))}
      </div>

      {t.parts?.length > 0 && (
        <>
          <Label>Состав заказа</Label>
          <div style={{ background: M.card, borderRadius: 16, padding: '4px 14px' }}>
            {t.parts.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < t.parts.length - 1 ? `1px solid ${M.line}` : 'none', fontSize: 14 }}>
                <span>{p.name}</span><span style={{ fontWeight: 700 }}>{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {t.contractor_id && (
        <div style={{ background: M.card, borderRadius: 16, padding: '11px 14px', fontSize: 13.5, marginTop: 12 }}>
          <I n="factory" size={13} /> Перезаказ: <b>{contractors.find(x => x.id === t.contractor_id)?.name}</b>
        </div>
      )}

      <Label>Описание</Label>
      <div style={{ background: M.card, borderRadius: 16, padding: '13px 14px', fontSize: 14, lineHeight: 1.5 }}>
        {t.description || 'Без описания'}
      </div>

      <Label>Оплаты по задаче</Label>
      <div style={{ background: M.card, borderRadius: 16, padding: '4px 14px' }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: i < rows.length - 1 ? `1px solid ${M.line}` : 'none', fontSize: 13.5 }}>
            <I n={r.refund ? 'expense' : 'income'} size={14} style={{ color: r.refund ? M.danger : M.muted }} />
            <span style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.refund ? 'Возврат клиенту' : (r.cat || r.way)}
              </div>
              <div style={{ color: M.muted, fontSize: 11.5 }}>{r.way} · {r.who} · {r.date}</div>
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, flexShrink: 0, color: r.refund ? M.danger : M.dark }}>
              {r.refund ? '−' : '+'}{fmt(r.amount)}
            </span>
          </div>
        ))}
        {!rows.length && <div style={{ color: M.muted, fontSize: 13, padding: '10px 0' }}>Оплат пока нет — записываются в «Деньгах» с привязкой к задаче</div>}
      </div>

      {t.cancelled && paidTotal > 0 && (
        <div style={{ background: 'rgba(192,57,43,.1)', color: M.danger, borderRadius: 16, padding: '11px 14px', fontSize: 13, marginTop: 12, fontWeight: 600 }}>
          Клиенту нужно вернуть {money(paidTotal)} — в «Деньгах»: Расход → «Возврат» → привязать к этой задаче.
        </div>
      )}

      {t.log?.length > 0 && (
        <>
          <Label>История</Label>
          <div style={{ background: M.card, borderRadius: 16, padding: '4px 14px' }}>
            {t.log.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 0', borderBottom: i < t.log.length - 1 ? `1px solid ${M.line}` : 'none', fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{l.who}</span>
                <span style={{ minWidth: 0 }}>{l.action}</span>
                <span style={{ marginLeft: 'auto', color: M.muted, fontSize: 11.5, flexShrink: 0 }}>{l.time}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 4px' }}>
        <Btn onClick={() => onEdit(t)}><I n="pencil" size={13} /> Изменить</Btn>
        <Btn onClick={() => { act.repeatTask(ctx, t); onClose(); }}><I n="repeat" size={13} /> Повторить</Btn>
        {/* Удаление — по аккаунту владельца, как на компьютере (у Кристи есть и в режиме менеджера) */}
        {isOwnerAccount && (
          <Btn kind="danger" onClick={() => { db.removeTask(t); onClose(); showToast(`«${t.title}» удалена`); }}>Удалить</Btn>
        )}
      </div>
    </Sheet>
  );
}
