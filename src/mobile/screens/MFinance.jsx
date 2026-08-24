// «Деньги» на телефоне.
// Менеджер: мелочь одним тапом, запись операции, свои записи за день, закрытие смены.
// Владелец: цифры дня, вся лента, сверка с банком, крупные и личные расходы, переводы по картам.
// Считает всё общий src/dayMoney.js, записывает — общая форма sections/EntryForm.jsx:
// цифры и правила на телефоне и на компьютере обязаны совпадать.
import { useState } from 'react';
import I from '../../Icon.jsx';
import EntryForm from '../../sections/EntryForm.jsx';
import { dayMoney } from '../../dayMoney.js';
import { M, Card, Stat, Pills, Btn, Chip, Sheet, Empty, Field, inputStyle, money, fmt } from '../ui.jsx';
import MTxEdit from './MTxEdit.jsx';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_DATE = (d) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;
const shift = (date, dir) => {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + dir);
  return d.toISOString().slice(0, 10);
};

// Статьи одной оплаты (разбитая сумма) — одной строкой ленты, как на компьютере
function groupByBatch(list) {
  const groups = [], byKey = new Map();
  for (const t of list) {
    const k = t.batch_id ? `b${t.batch_id}` : `${t.created_by}|${t.payment_method}|${t.type}|${t.created_at ? t.created_at.slice(0, 19) : `x${t.id}`}`;
    if (byKey.has(k)) byKey.get(k).push(t);
    else { const arr = [t]; byKey.set(k, arr); groups.push(arr); }
  }
  return groups;
}

export default function MFinance(props) {
  const {
    transactions, categories, banks, tasks, dayClosures, quickOps, demoBankRows = [],
    currentUser, isOwner, isOwnerAccount, db, PAYMENT_METHODS, showToast, prefillTaskId,
  } = props;

  const [opDate, setOpDate] = useState(db.today);
  const [showForm, setShowForm] = useState(!!prefillTaskId);
  const [editTx, setEditTx] = useState(null);
  const [showClose, setShowClose] = useState(false);
  const [cashFact, setCashFact] = useState('');
  const [cashTaken, setCashTaken] = useState('');
  const [mFlt, setMFlt] = useState('');

  const isToday = opDate === db.today;
  const isYesterday = opDate === db.yesterday;
  // Сотрудница смотрит неделю, правит только сегодня и вчера (миграция 016)
  const weekAgo = (() => { const d = new Date(db.today + 'T12:00:00'); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const canGoBack = isOwner || opDate > weekAgo;
  const canEditDay = isToday || isYesterday;

  const { dailyTx, bigTx, bigTotal, personalTx, personalTotal, income, expense, carry, cashFlow, cashCalc, closure, dayTx } =
    dayMoney({ transactions, categories, dayClosures, date: opDate });

  // Сотрудница видит в ленте только свои записи (решение Кристи 2026-07-17), касса — по всем
  const feedTx = isOwnerAccount ? dailyTx : dailyTx.filter(t => t.created_by === currentUser.name);
  const catName = (id) => categories.find(c => c.id === id)?.name || '?';
  const mLabel = (k) => PAYMENT_METHODS.find(m => m.key === k)?.label || k;
  const bankName = (id) => banks.find(b => b.id === id)?.name;
  const taskTitle = (id) => tasks.find(t => t.id === id)?.title;

  const quickSave = (q) => {
    const cat = categories.find(c => c.name === q.category);
    if (!cat) { showToast('Нет такой категории', 'error'); return; }
    db.addTransactions([{ type: 'income', category_id: cat.id, amount: q.amount, payment_method: 'cash', bank_id: null, comment: '' }]);
    showToast(`${q.label} — записано ✓`);
  };

  const closeShift = () => {
    if (cashFact === '') { showToast('Введи фактический остаток в кассе', 'error'); return; }
    const taken = +cashTaken || 0;
    if (taken > +cashFact) { showToast('Сдано больше, чем есть в кассе — проверь цифры', 'error'); return; }
    const diff = +cashFact - cashCalc;
    db.closeShift({ date: opDate, cash_calc: cashCalc, cash_fact: +cashFact, cash_taken: taken, diff });
    setCashFact(''); setCashTaken(''); setShowClose(false);
    showToast(diff === 0 ? 'Смена закрыта, касса сошлась ✓' : `Смена закрыта, разница ${diff > 0 ? '+' : ''}${fmt(diff)} ₽`, diff === 0 ? 'ok' : 'error');
  };

  // Сверка с банком — только у владельца (выписка приходит по API банка)
  const dayBankRows = isToday ? demoBankRows : [];
  const bankTotal = dayBankRows.reduce((s, r) => s + r.amount, 0);
  const recordedNonCash = dayTx.filter(t => t.type === 'income' && !['cash', 'card', 'deposit'].includes(t.payment_method)).reduce((s, t) => s + t.amount, 0);
  const unmatched = dayBankRows.filter(r => !r.matched);

  const byCard = banks
    .map(b => ({ ...b, sum: dayTx.filter(t => t.type === 'income' && t.payment_method === 'transfer' && t.bank_id === b.id).reduce((s, t) => s + t.amount, 0) }))
    .filter(b => b.sum > 0);

  const groups = groupByBatch(feedTx.filter(t => !mFlt || t.payment_method === mFlt));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 12px' }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Деньги</span>
        <Btn kind="dark" onClick={() => setShowForm(true)} style={{ marginLeft: 'auto', padding: '10px 15px', minHeight: 38 }}>
          <I n="plus" size={14} /> Операция
        </Btn>
      </div>

      {/* Листание дней */}
      <div style={{
        display: 'flex', alignItems: 'center', background: M.card, borderRadius: 999,
        padding: 5, boxShadow: M.shadow, marginBottom: 12,
      }}>
        <button onClick={() => canGoBack && setOpDate(shift(opDate, -1))} disabled={!canGoBack} aria-label="День назад"
          style={{ ...navBtn, opacity: canGoBack ? 1 : .3 }}><I n="chevronLeft" size={15} /></button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13.5, fontWeight: 800 }}>
          {isToday ? `Сегодня · ${opDate.slice(8, 10)}.${opDate.slice(5, 7)}` : isYesterday ? `Вчера · ${opDate.slice(8, 10)}.${opDate.slice(5, 7)}` : RU_DATE(opDate)}
        </span>
        <button onClick={() => !isToday && setOpDate(shift(opDate, 1))} disabled={isToday} aria-label="День вперёд"
          style={{ ...navBtn, opacity: isToday ? .3 : 1 }}><I n="chevronRight" size={15} /></button>
      </div>

      {/* Цифры дня — только владельцу: сотрудница итогов по типографии не видит */}
      {isOwner && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <Stat label="Доходы за день" value={money(income)} />
          <Stat label="Расходы за день" value={money(expense)} />
          <Stat label={`В кассе (утро ${fmt(carry)} + день)`} value={money(cashCalc)} dark />
          <Stat label="Смена" value={closure ? 'закрыта' : 'открыта'}
            sub={closure ? `разница ${closure.diff > 0 ? '+' : ''}${fmt(closure.diff)} ₽` : 'закрыть вечером'}
            accent={!closure} onClick={() => setShowClose(true)} />
        </div>
      )}

      {/* Мелочь одним тапом — список настраивает Кристи в Настройках */}
      {quickOps?.length > 0 && canEditDay && (
        <Card title="Мелочь одним тапом">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* label уже содержит сумму («Ксерокс 10 ₽») — второй раз её не печатаем */}
            {quickOps.map((q, i) => (
              <Btn key={i} kind="accent" onClick={() => quickSave(q)} style={{ padding: '11px 15px' }}>
                {q.label}
              </Btn>
            ))}
          </div>
        </Card>
      )}

      {/* Лента дня */}
      <Card title={`${isOwnerAccount ? 'Операции' : 'Мои записи'} · ${feedTx.length}`}>
        {feedTx.length > 0 && (
          <Pills value={mFlt} onChange={setMFlt} style={{ boxShadow: 'none', background: M.soft, marginBottom: 6 }} options={[
            { key: '', label: 'Все' },
            ...PAYMENT_METHODS.filter(m => m.key !== 'deposit' && feedTx.some(t => t.payment_method === m.key))
              .map(m => ({ key: m.key, label: `${m.label} · ${fmt(feedTx.filter(t => t.payment_method === m.key && t.type === 'income').reduce((s, t) => s + t.amount, 0))}` })),
          ]} />
        )}

        {groups.map(g => {
          const t = g[0];
          const total = g.reduce((s, x) => s + x.amount, 0);
          const inc = t.type === 'income';
          // Правит свои записи сотрудница только за сегодня/вчера; владелец — любые
          const mayEdit = isOwner || (canEditDay && t.created_by === currentUser.name);
          return (
            <div key={t.id} onClick={() => mayEdit && setEditTx(t)} style={{
              display: 'flex', gap: 9, alignItems: 'center', padding: '11px 0',
              borderBottom: `1px solid ${M.line}`, minHeight: M.tap,
            }}>
              <I n={inc ? 'income' : 'expense'} size={15} style={{ color: inc ? M.muted : M.danger, flexShrink: 0 }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.map(x => catName(x.category_id)).join(' + ')}
                </div>
                <div style={{ color: M.muted, fontSize: 11.5, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span>{mLabel(t.payment_method)}{t.bank_id ? ` · ${bankName(t.bank_id)}` : ''}</span>
                  <span>· {t.time}</span>
                  {isOwnerAccount && <span>· {t.created_by}</span>}
                  {t.moved_from && <span>· ↪ со вчера</span>}
                </div>
                {t.task_id && taskTitle(t.task_id) && (
                  <Chip tone="accent" style={{ marginTop: 4 }}>{taskTitle(t.task_id)}</Chip>
                )}
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 14.5, flexShrink: 0, color: inc ? M.dark : M.danger }}>
                {inc ? '+' : '−'}{fmt(total)}
              </span>
              {/* Вчерашняя оплата нашлась после закрытия — перекинуть на сегодня */}
              {inc && isYesterday && mayEdit && (
                <button onClick={e => { e.stopPropagation(); db.moveTxToToday(t); showToast(`«${catName(t.category_id)} ${fmt(t.amount)} ₽» перенесена на сегодня ↪`); }}
                  aria-label="Перенести на сегодня" style={navBtn}>↪</button>
              )}
            </div>
          );
        })}
        {!feedTx.length && <Empty icon="wallet" text="Записей за этот день нет" />}
      </Card>

      {/* Крупные рабочие и личные — только владельцу */}
      {isOwner && bigTx.length > 0 && (
        <Card title="Крупные расходы" right={<b>{money(bigTotal)}</b>}>
          <div style={{ color: M.muted, fontSize: 12, marginBottom: 6 }}>В расход дня и кассу не входят — учитываются в месяце</div>
          {bigTx.map(t => (
            <div key={t.id} onClick={() => setEditTx(t)} style={{ display: 'flex', gap: 8, padding: '9px 0', borderBottom: `1px solid ${M.line}`, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              <span style={{ color: M.muted, fontSize: 12 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: M.danger }}>−{fmt(t.amount)}</span>
            </div>
          ))}
        </Card>
      )}

      {isOwner && personalTx.length > 0 && (
        <Card style={{ background: 'rgba(247,214,74,.35)' }} title="🔒 Личные" right={<b>{money(personalTotal)}</b>}>
          <div style={{ color: M.muted, fontSize: 12, marginBottom: 6 }}>Видишь только ты. В расходы бизнеса не входят</div>
          {personalTx.map(t => (
            <div key={t.id} onClick={() => setEditTx(t)} style={{ display: 'flex', gap: 8, padding: '9px 0', borderBottom: `1px solid rgba(0,0,0,.07)`, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{catName(t.category_id)}</span>
              <span style={{ color: M.muted, fontSize: 12 }}>{t.comment}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>−{fmt(t.amount)}</span>
            </div>
          ))}
        </Card>
      )}

      {isOwner && byCard.length > 0 && (
        <Card title="Переводы по картам">
          {byCard.map(b => (
            <div key={b.id} style={{ display: 'flex', padding: '9px 0', borderBottom: `1px solid ${M.line}`, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{b.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{money(b.sum)}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Сверка с банком — владельцу */}
      {isOwner && dayBankRows.length > 0 && (
        <Card title="Сверка дня" right={unmatched.length ? <Chip tone="danger">есть расхождения</Chip> : <Chip tone="ok">сходится</Chip>}>
          <Row2 label="Пришло на счёт (по банку)" value={money(bankTotal)} />
          <Row2 label="Записано переводов/СБП" value={money(recordedNonCash)} />
          <Row2 label="Разница" value={money(recordedNonCash - bankTotal)} danger={recordedNonCash !== bankTotal} />
          {unmatched.map(r => (
            <div key={r.id} style={{ background: 'rgba(192,57,43,.1)', color: M.danger, borderRadius: 14, padding: '10px 12px', fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>
              <I n="alert" size={13} /> {money(r.amount)} пришло, но не записано · {r.description.split('—')[0]}
            </div>
          ))}
        </Card>
      )}

      {/* Закрытие смены */}
      {canEditDay && (
        <div style={{ background: M.dark, color: '#fff', borderRadius: M.radius, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Закрытие смены · {opDate.slice(8, 10)}.{opDate.slice(5, 7)}</div>
          <DarkRow label="В кассе на утро" value={money(carry)} />
          <DarkRow label="Наличными за день" value={`${cashFlow >= 0 ? '+' : ''}${fmt(cashFlow)} ₽`} />
          <DarkRow label="Должно быть в кассе" value={money(cashCalc)} last />
          {closure ? (
            <div style={{ marginTop: 12 }}>
              <DarkRow label="По факту" value={money(closure.cash_fact)} />
              {closure.cash_taken > 0 && <DarkRow label="Сдано Кристи" value={money(closure.cash_taken)} />}
              <DarkRow label="Разница" value={`${closure.diff > 0 ? '+' : ''}${fmt(closure.diff)} ₽`} accent={closure.diff !== 0} last />
              <div style={{ fontSize: 12, opacity: .7, marginTop: 8 }}>Закрыл(а): {closure.closed_by || '—'}</div>
              {/* Ошибочное закрытие можно отменить (просьба Кристи 2026-08-03) */}
              <Btn wide kind="soft" style={{ marginTop: 10 }} onClick={() => { db.deleteClosure(opDate); showToast('Закрытие смены отменено'); }}>
                ✕ Отменить закрытие
              </Btn>
            </div>
          ) : (
            <Btn kind="accent" wide style={{ marginTop: 12 }} onClick={() => setShowClose(true)}>Закрыть смену</Btn>
          )}
        </div>
      )}

      {/* Шит: запись операции */}
      <Sheet open={showForm} onClose={() => setShowForm(false)} title="Новая операция">
        <EntryForm {...props} prefillTaskId={prefillTaskId}
          onSave={async (recs) => {
            const ok = await db.addTransactions(recs);
            if (ok) { showToast('Записано ✓'); setShowForm(false); }
            return ok;
          }} />
      </Sheet>

      {/* Шит: сколько денег в кассе по факту */}
      <Sheet open={showClose} onClose={() => setShowClose(false)} title="Закрыть смену"
        footer={<Btn kind="dark" wide onClick={closeShift}>Закрыть смену</Btn>}>
        <div style={{ background: M.card, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Row2 label="Должно быть в кассе" value={money(cashCalc)} />
          {cashFact !== '' && <Row2 label="Разница" value={`${+cashFact - cashCalc > 0 ? '+' : ''}${fmt(+cashFact - cashCalc)} ₽`} danger={+cashFact !== cashCalc} />}
        </div>
        <Field label="В кассе по факту, ₽">
          <input style={inputStyle} type="number" inputMode="numeric" autoFocus value={cashFact} onChange={e => setCashFact(e.target.value)} />
        </Field>
        <Field label="Сдано Кристи, ₽ (если забирала)">
          <input style={inputStyle} type="number" inputMode="numeric" value={cashTaken} onChange={e => setCashTaken(e.target.value)} />
        </Field>
      </Sheet>

      {/* Шит: правка записи */}
      {editTx && <MTxEdit {...props} tx={editTx} onClose={() => setEditTx(null)} />}
    </div>
  );
}

function Row2({ label, value, danger }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', fontSize: 13.5 }}>
      <span style={{ color: M.muted }}>{label}</span>
      <span style={{ fontWeight: 800, color: danger ? M.danger : M.dark }}>{value}</span>
    </div>
  );
}

function DarkRow({ label, value, accent, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', fontSize: 13.5,
      borderBottom: last ? '1px solid rgba(255,255,255,.14)' : 'none',
    }}>
      <span style={{ opacity: .75 }}>{label}</span>
      <span style={{ fontWeight: 800, color: accent ? M.accent : '#fff' }}>{value}</span>
    </div>
  );
}

const navBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 38, height: 38,
  display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 14,
};
