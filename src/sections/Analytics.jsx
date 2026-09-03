// Раздел «Аналитика» — только владелец. Реальные агрегаты по операциям за выбранный месяц.
// Экспорт месяца в Excel — в привычной Кристи структуре: категории × дни месяца.
// Все расчёты и сам Excel живут в общем src/monthStats.js: те же цифры показывает телефон.
import { useState } from 'react';
import { monthStats, exportMonthExcel, monthLabel as monthLabelOf, shiftMonth as shiftMonthBy } from '../monthStats.js';

export default function Analytics({ UI, transactions, categories, dayClosures, db, showToast }) {
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  const [month, setMonth] = useState(db.today.slice(0, 7)); // 'YYYY-MM'
  // Клик по карточке расходов → разбивка по категориям за месяц (просьба Кристи 2026-07-21:
  // «чтобы личные и рабочие расходы были кликабельны, а то общего учёта нет»)
  const [expView, setExpView] = useState(''); // '' | work | personal
  const [xlsBusy, setXlsBusy] = useState(false); // подгружается библиотека Excel

  const {
    monthTx, opIncome, diffSum, income, expense, personalTotal, profit,
    cats, workBreak, persBreak, methods: methodSums, staff,
  } = monthStats({ transactions, categories, dayClosures, month });

  const max = Math.max(1, ...cats.map(c => c.v));
  const maxStaff = Math.max(1, ...staff.map(s => s.v));

  // Цвета способов оплаты — оформление десктопной версии, сами суммы считает monthStats
  const M_COLORS = { cash: UI.dark, sbp: UI.accent, transfer: '#e8c33f', card: '#d9d9d6', bank: '#b9b5a8' };
  const methods = methodSums.map(m => ({ ...m, color: M_COLORS[m.key] }));

  const shiftMonth = (dir) => setMonth(shiftMonthBy(month, dir));

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

  const monthLabel = monthLabelOf(month);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Аналитика</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', borderRadius: 999, padding: 5, boxShadow: UI.shadow }}>
          <button onClick={() => shiftMonth(-1)} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 14 }}>←</button>
          <span style={{ fontWeight: 800, fontSize: 14, padding: '0 10px', minWidth: 120, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel}</span>
          <button onClick={() => shiftMonth(1)} disabled={month >= db.today.slice(0, 7)} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 14, opacity: month >= db.today.slice(0, 7) ? 0.3 : 1 }}>→</button>
        </div>
        <button onClick={exportExcel} disabled={xlsBusy} style={{
          marginLeft: 'auto', border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14,
        }}>{xlsBusy ? 'Готовлю файл…' : 'Скачать Excel (как твоя таблица)'}</button>
      </div>

      {/* Крупные цифры. Личные — отдельно, в расходы бизнеса и прибыль не входят (как в Excel Кристи) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <Big label={diffSum !== 0 ? `Выручка (операции ${fmt(opIncome)} ₽ · разницы смен ${diffSum > 0 ? '+' : ''}${fmt(diffSum)} ₽)` : 'Выручка'} value={`${fmt(income)} ₽`} UI={UI} />
        <Big label="Расходы бизнеса" value={`${fmt(expense)} ₽`} UI={UI}
          onClick={() => setExpView(v => v === 'work' ? '' : 'work')} active={expView === 'work'} hint="по категориям" />
        <Big label="Чистая прибыль" value={`${fmt(profit)} ₽`} UI={UI} dark />
        <Big label="Личные (вне бизнеса)" value={`${fmt(personalTotal)} ₽`} UI={UI} accentBorder
          onClick={() => setExpView(v => v === 'personal' ? '' : 'personal')} active={expView === 'personal'} hint="по категориям" />
      </div>

      {/* Разбивка расходов за месяц — раскрывается кликом по карточке */}
      {expView && (() => {
        const rows = expView === 'work' ? workBreak : persBreak;
        const maxE = Math.max(1, ...rows.map(c => c.v));
        return (
          <Card title={expView === 'work' ? `Расходы бизнеса по категориям · ${fmt(expense)} ₽` : `Личные по категориям (вне бизнеса) · ${fmt(personalTotal)} ₽`} UI={UI} style={{ marginBottom: 20 }}>
            {rows.map((c, i) => (
              <div key={c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.big && <span style={{ background: UI.soft, borderRadius: 999, padding: '1px 9px', fontSize: 10.5, fontWeight: 700, color: UI.muted }}>крупный · вне кассы дня</span>}
                  <span style={{ marginLeft: 'auto', color: UI.muted, fontWeight: 700 }}>{fmt(c.v)} ₽</span>
                </div>
                <div style={{ height: 26, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(c.v / maxE) * 100}%`, height: '100%', borderRadius: 999,
                    background: expView === 'work' ? (i === 0 ? '#c0392b' : 'rgba(192,57,43,.45)') : (i === 0 ? UI.dark : UI.accent),
                  }} />
                </div>
              </div>
            ))}
            {!rows.length && <div style={{ color: UI.muted, fontSize: 14 }}>За {monthLabel} таких расходов нет</div>}
          </Card>
        );
      })()}

      {!monthTx.length && (
        <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 28, color: UI.muted }}>
          За {monthLabel} операций пока нет
        </div>
      )}

      {monthTx.length > 0 && (
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Доходы по категориям */}
        <Card title="Доходы по категориям" UI={UI} style={{ flex: 2, minWidth: 380 }}>
          {cats.map((c, i) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: UI.muted, fontWeight: 700 }}>{fmt(c.v)} ₽</span>
              </div>
              <div style={{ height: 26, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(c.v / max) * 100}%`, height: '100%', background: i === 0 ? UI.dark : UI.accent, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </Card>

        <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Способы оплаты */}
          <Card title="Способы оплаты" UI={UI}>
            <div style={{ display: 'flex', height: 34, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
              {methods.map(m => <div key={m.name} style={{ width: `${m.v}%`, background: m.color }} />)}
            </div>
            {methods.map(m => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '3px 0' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: m.color, display: 'inline-block' }} />
                {m.name}<span style={{ marginLeft: 'auto', fontWeight: 700 }}>{fmt(m.sum)} ₽ · {m.v}%</span>
              </div>
            ))}
          </Card>

          {/* По сотрудникам */}
          <Card title="Выручка по сотрудникам" UI={UI}>
            {staff.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13.5 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: UI.dark, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{s.name[0]}</span>
                <span style={{ fontWeight: 600, width: 72 }}>{s.name}</span>
                <div style={{ flex: 1, height: 18, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.v / maxStaff) * 100}%`, height: '100%', background: UI.accent, borderRadius: 999 }} />
                </div>
                <span style={{ fontWeight: 700, width: 84, textAlign: 'right' }}>{fmt(s.v)} ₽</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}

function Big({ label, value, UI, dark, accentBorder, onClick, active, hint }) {
  return (
    <div onClick={onClick} style={{
      background: dark ? UI.dark : accentBorder ? 'rgba(247,214,74,.18)' : '#fff', color: dark ? '#fff' : UI.dark,
      border: accentBorder ? `1.5px solid ${UI.accent}` : 'none',
      outline: active ? `2.5px solid ${UI.dark}` : 'none',
      borderRadius: 26, boxShadow: UI.shadow, padding: '22px 30px', flex: 1, minWidth: 220,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{value}</div>
      <div style={{ color: dark ? 'rgba(255,255,255,.6)' : UI.muted, fontSize: 13, marginTop: 2 }}>{label}</div>
      {hint && (
        <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 7, color: UI.dark, background: active ? UI.accent : UI.soft, borderRadius: 999, padding: '3px 11px', display: 'inline-block' }}>
          {active ? 'скрыть ▴' : `${hint} ▾`}
        </div>
      )}
    </div>
  );
}

function Card({ title, children, UI, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, ...style }}>
      <div style={{ fontWeight: 800, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
