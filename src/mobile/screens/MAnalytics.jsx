// «Аналитика» на телефоне — только владелец.
// Цифры и Excel считает общий src/monthStats.js: на телефоне и на компьютере они обязаны совпадать.
// Личные расходы стоят отдельной карточкой — в расходы бизнеса и прибыль они не входят (решение 2026-07-14).
import { useState } from 'react';
import I from '../../Icon.jsx';
import { monthStats, exportMonthExcel, monthLabel as monthLabelOf, shiftMonth as shiftMonthBy } from '../../monthStats.js';
import { M, Card, Stat, Btn, Empty } from '../ui.jsx';

const fmt = (n) => Math.round(n || 0).toLocaleString('ru-RU');

export default function MAnalytics({ transactions, categories, dayClosures, db, showToast }) {
  const [month, setMonth] = useState(db.today.slice(0, 7));
  const [expView, setExpView] = useState(''); // '' | work | personal
  const [xlsBusy, setXlsBusy] = useState(false);

  const {
    monthTx, opIncome, diffSum, income, expense, personalTotal, profit,
    cats, workBreak, persBreak, methods, staff,
  } = monthStats({ transactions, categories, dayClosures, month });

  const label = monthLabelOf(month);
  const isCurrent = month >= db.today.slice(0, 7);
  const maxCat = Math.max(1, ...cats.map(c => c.v));
  const maxStaff = Math.max(1, ...staff.map(s => s.v));
  const COLORS = { cash: M.dark, sbp: M.accent, transfer: '#e8c33f', card: '#d9d9d6', bank: '#b9b5a8' };

  const exportExcel = async () => {
    if (xlsBusy) return;
    setXlsBusy(true);
    try {
      await exportMonthExcel({ month, transactions, categories, dayClosures });
      showToast('Excel выгружен');
    } catch (e) {
      console.error(e);
      showToast('Не получилось собрать Excel — попробуй ещё раз', 'error');
    } finally { setXlsBusy(false); }
  };

  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: '6px 0 10px' }}>Аналитика</div>

      {/* Месяц листается стрелками — на телефоне это удобнее выпадающего списка */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, background: M.card, borderRadius: 999,
        padding: 5, boxShadow: M.shadow, marginBottom: 12,
      }}>
        <button onClick={() => setMonth(shiftMonthBy(month, -1))} aria-label="Предыдущий месяц" style={navBtn}>
          <I n="chevronLeft" size={15} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 14.5, textTransform: 'capitalize' }}>{label}</span>
        <button onClick={() => !isCurrent && setMonth(shiftMonthBy(month, 1))} disabled={isCurrent}
          aria-label="Следующий месяц" style={{ ...navBtn, opacity: isCurrent ? 0.3 : 1 }}>
          <I n="chevronRight" size={15} />
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <Stat label="Выручка" value={`${fmt(income)} ₽`}
          sub={diffSum !== 0 ? `операции ${fmt(opIncome)} · смены ${diffSum > 0 ? '+' : ''}${fmt(diffSum)}` : null} />
        <Stat label="Чистая прибыль" value={`${fmt(profit)} ₽`} dark />
        <Stat label="Расходы бизнеса" value={`${fmt(expense)} ₽`} sub={expView === 'work' ? 'скрыть ▴' : 'по категориям ▾'}
          onClick={() => setExpView(v => v === 'work' ? '' : 'work')} />
        <Stat label="Личные (вне бизнеса)" value={`${fmt(personalTotal)} ₽`} accent
          sub={expView === 'personal' ? 'скрыть ▴' : 'по категориям ▾'}
          onClick={() => setExpView(v => v === 'personal' ? '' : 'personal')} />
      </div>

      {expView && (() => {
        const rows = expView === 'work' ? workBreak : persBreak;
        const maxE = Math.max(1, ...rows.map(c => c.v));
        return (
          <Card title={expView === 'work' ? `Расходы бизнеса · ${fmt(expense)} ₽` : `Личные · ${fmt(personalTotal)} ₽`}>
            {rows.map((c, i) => (
              <Bar key={c.name} name={c.name} value={c.v} pct={(c.v / maxE) * 100}
                color={expView === 'work' ? (i === 0 ? M.danger : 'rgba(192,57,43,.45)') : (i === 0 ? M.dark : M.accent)}
                tag={c.big ? 'крупный · вне кассы дня' : null} />
            ))}
            {!rows.length && <div style={{ color: M.muted, fontSize: 13.5 }}>За {label} таких расходов нет</div>}
          </Card>
        );
      })()}

      {!monthTx.length ? (
        <Empty icon="chart" text={`За ${label} операций пока нет`} />
      ) : (
        <>
          <Card title="Доходы по категориям">
            {cats.map((c, i) => (
              <Bar key={c.name} name={c.name} value={c.v} pct={(c.v / maxCat) * 100} color={i === 0 ? M.dark : M.accent} />
            ))}
          </Card>

          <Card title="Способы оплаты">
            <div style={{ display: 'flex', height: 28, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
              {methods.map(m => <div key={m.key} style={{ width: `${m.v}%`, background: COLORS[m.key] }} />)}
            </div>
            {methods.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '5px 0' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: COLORS[m.key], flexShrink: 0 }} />
                {m.name}
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(m.sum)} ₽ · {m.v}%</span>
              </div>
            ))}
          </Card>

          <Card title="Выручка по сотрудникам">
            {staff.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: M.dark, color: '#fff',
                  display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0,
                }}>{s.name[0]}</span>
                <span style={{ fontWeight: 600, width: 58, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                <div style={{ flex: 1, height: 16, background: M.soft, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.v / maxStaff) * 100}%`, height: '100%', background: M.accent, borderRadius: 999 }} />
                </div>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>{fmt(s.v)} ₽</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <Btn kind="dark" wide onClick={exportExcel} disabled={xlsBusy} style={{ marginBottom: 8 }}>
        {xlsBusy ? 'Готовлю файл…' : 'Скачать Excel за месяц'}
      </Btn>
    </div>
  );
}

function Bar({ name, value, pct, color, tag }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ marginLeft: 'auto', color: M.muted, fontWeight: 700, flexShrink: 0 }}>{fmt(value)} ₽</span>
      </div>
      {tag && <div style={{ color: M.muted, fontSize: 11, marginBottom: 4 }}>{tag}</div>}
      <div style={{ height: 22, background: M.soft, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

const navBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 38, height: 38,
  display: 'grid', placeItems: 'center', flexShrink: 0,
};
