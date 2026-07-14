// Раздел «Настройки» — только владелец: категории, банки/карты, пользователи. Заглушка на демо-данных.
// Telegram-сводку убрали по правкам Кристи от 2026-07-14.
export default function Settings({ categories, banks, demoUsers, UI, showToast }) {
  const kinds = [
    ['income', '💰 Категории доходов'],
    ['expense_shared', '💸 Расходы (видят сотрудники)'],
    ['expense_work', '🔒 Рабочие расходы (только я)'],
    ['expense_personal', '🔒 Личные расходы (только я)'],
  ];

  return (
    <div>
      <h1 style={{ fontSize: 34, fontWeight: 500, margin: '4px 0 20px' }}>Настройки</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {kinds.map(([kind, title]) => (
          <Card key={kind} title={title} UI={UI}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.filter(c => c.kind === kind).map(c => (
                <span key={c.id} style={{ background: UI.soft, borderRadius: 999, padding: '7px 16px', fontSize: 13.5, fontWeight: 600 }}>{c.name}</span>
              ))}
              <button onClick={() => showToast('Добавление категорий — после утверждения макета')} style={{
                border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted,
              }}>+ добавить</button>
            </div>
          </Card>
        ))}

        <Card title="🏦 Карты для переводов" UI={UI}>
          {banks.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>{b.name}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>карта Кристи</span>
              <span style={{ marginLeft: 'auto', background: UI.soft, borderRadius: 999, padding: '3px 12px', fontSize: 12 }}>активна</span>
            </div>
          ))}
          <button onClick={() => showToast('Добавление карт — после утверждения макета')} style={{
            border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted, marginTop: 12,
          }}>+ добавить карту</button>
        </Card>

        <Card title="👥 Пользователи" UI={UI}>
          {demoUsers.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'owner' ? UI.accent : UI.dark, color: u.role === 'owner' ? UI.dark : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{u.name[0]}</span>
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              <span style={{ marginLeft: 'auto', background: u.role === 'owner' ? UI.accent : UI.soft, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                {u.role === 'owner' ? 'Владелец' : 'Сотрудник'}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, UI }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24 }}>
      <div style={{ fontWeight: 800, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
