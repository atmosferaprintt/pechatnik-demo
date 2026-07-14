// Раздел «Аналитика» — только владелец. Заглушка на демо-цифрах (июнь из Excel Кристи).
// Экспорт месяца в Excel — в привычной Кристи структуре: категории × дни месяца.
import * as XLSX from 'xlsx';

export default function Analytics({ UI, transactions, categories, showToast }) {
  const fmt = (n) => n.toLocaleString('ru-RU');

  const exportExcel = () => {
    const daysInMonth = 31;
    const month = '2026-07';
    const monthTx = transactions.filter(t => t.op_date?.startsWith(month));
    const cell = (catId, type, day) => monthTx
      .filter(t => t.category_id === catId && t.type === type && +t.op_date.slice(8, 10) === day)
      .reduce((s, t) => s + t.amount, 0) || '';

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const rows = [];
    const sumRow = (type) => monthTx.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);

    rows.push(['ДОХОД ОБЩИЙ', sumRow('income'), ...days.map(() => '')]);
    for (const c of categories.filter(c => c.kind === 'income')) {
      const total = monthTx.filter(t => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      rows.push([c.name, total || '', ...days.map(d => cell(c.id, 'income', d))]);
    }
    // Расходы бизнеса и личные — отдельными блоками, как в таблице Кристи
    const catTotal = (c) => monthTx.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const personalCats = categories.filter(c => c.kind === 'expense_personal');
    const workCats = categories.filter(c => c.kind === 'expense_shared' || c.kind === 'expense_work');

    rows.push([]);
    rows.push(['РАСХОД ОБЩИЙ', workCats.reduce((s, c) => s + catTotal(c), 0), ...days.map(() => '')]);
    for (const c of workCats) rows.push([c.name, catTotal(c) || '', ...days.map(d => cell(c.id, 'expense', d))]);

    rows.push([]);
    rows.push(['ЛИЧНЫЕ', personalCats.reduce((s, c) => s + catTotal(c), 0), ...days.map(() => '')]);
    for (const c of personalCats) rows.push([c.name, catTotal(c) || '', ...days.map(d => cell(c.id, 'expense', d))]);

    const ws = XLSX.utils.aoa_to_sheet([['Категория', 'Итого', ...days], ...rows]);
    ws['!cols'] = [{ wch: 24 }, { wch: 10 }, ...days.map(() => ({ wch: 7 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'июль');
    XLSX.writeFile(wb, 'ПЕЧАТНИК-июль-2026.xlsx');
    showToast('Excel выгружен ⬇');
  };

  // Демо-цифры по мотивам её Excel за июнь
  const income = 753549, expense = 445120, profit = income - expense;
  const cats = [
    { name: 'Полиграфия', v: 296830 },
    { name: 'Широкоформатка', v: 134243 },
    { name: 'Сувениры', v: 127377 },
    { name: 'Ленты, бирки', v: 72460 },
    { name: 'Товар', v: 43107 },
    { name: 'Ксерокс', v: 21358 },
  ];
  const max = cats[0].v;
  const methods = [
    { name: 'Наличные', v: 38, color: UI.dark },
    { name: 'СБП/переводы', v: 41, color: UI.accent },
    { name: 'Карта', v: 14, color: '#d9d9d6' },
    { name: 'Безнал', v: 7, color: '#b9b5a8' },
  ];
  const staff = [
    { name: 'Влада', v: 41938 }, { name: 'Настя', v: 32410 }, { name: 'Алена', v: 55510 }, { name: 'Марьян', v: 15370 },
  ];
  const maxStaff = Math.max(...staff.map(s => s.v));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 20px' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Аналитика</h1>
        <span style={{ background: '#fff', borderRadius: 999, padding: '8px 18px', fontSize: 14, fontWeight: 700, boxShadow: UI.shadow }}>Июнь 2026 ▾</span>
        <button onClick={exportExcel} style={{
          marginLeft: 'auto', border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14,
        }}>⬇ Скачать Excel (как твоя таблица)</button>
      </div>

      {/* Крупные цифры. Личные — отдельно, в расходы бизнеса и прибыль не входят (как в Excel Кристи) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <Big label="Выручка" value={`${fmt(income)} ₽`} UI={UI} />
        <Big label="Расходы бизнеса" value={`${fmt(expense)} ₽`} UI={UI} />
        <Big label="Чистая прибыль" value={`${fmt(profit)} ₽`} UI={UI} dark />
        <Big label="🔒 Личные (вне бизнеса)" value={`${fmt(114820)} ₽`} UI={UI} accentBorder />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Доходы по категориям */}
        <Card title="Доходы по категориям" UI={UI} style={{ flex: 2, minWidth: 380 }}>
          {cats.map(c => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: UI.muted, fontWeight: 700 }}>{fmt(c.v)} ₽</span>
              </div>
              <div style={{ height: 26, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${(c.v / max) * 100}%`, height: '100%', background: c === cats[0] ? UI.dark : UI.accent, borderRadius: 999 }} />
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
                {m.name}<span style={{ marginLeft: 'auto', fontWeight: 700 }}>{m.v}%</span>
              </div>
            ))}
          </Card>

          {/* По сотрудникам */}
          <Card title="Выручка по сотрудникам" UI={UI}>
            {staff.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13.5 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: UI.dark, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{s.name[0]}</span>
                <span style={{ fontWeight: 600, width: 64 }}>{s.name}</span>
                <div style={{ flex: 1, height: 18, background: UI.soft, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(s.v / maxStaff) * 100}%`, height: '100%', background: UI.accent, borderRadius: 999 }} />
                </div>
                <span style={{ fontWeight: 700, width: 76, textAlign: 'right' }}>{fmt(s.v)} ₽</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, UI, dark, accentBorder }) {
  return (
    <div style={{
      background: dark ? UI.dark : accentBorder ? 'rgba(247,214,74,.18)' : '#fff', color: dark ? '#fff' : UI.dark,
      border: accentBorder ? `1.5px solid ${UI.accent}` : 'none',
      borderRadius: 26, boxShadow: UI.shadow, padding: '22px 30px', flex: 1, minWidth: 220,
    }}>
      <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{value}</div>
      <div style={{ color: dark ? 'rgba(255,255,255,.6)' : UI.muted, fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Card({ title, children, UI, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 26, ...style }}>
      <div style={{ fontWeight: 800, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}
