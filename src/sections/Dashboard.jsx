// Раздел «Мой день» — дашборд владельца: всё важное одним экраном.
// Выручка/расходы сегодня, долги по задачам, расхождения сверки, горящие дедлайны, незакрытые дни.
// Заглушка на демо-данных.
const fmt = (n) => (n || 0).toLocaleString('ru-RU');
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function Dashboard({ transactions, tasks, clients, demoBankRows, UI, onOpenTab }) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const paidByTask = (id) => transactions.filter(t => t.task_id === id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const debtors = tasks
    .map(t => ({ ...t, debt: (t.amount || 0) - paidByTask(t.id) }))
    .filter(t => t.debt > 0)
    .sort((a, b) => b.debt - a.debt);
  const totalDebt = debtors.reduce((s, t) => s + t.debt, 0);

  const burning = tasks.filter(t => t.assignee !== 'Сборка' && t.deadline && t.deadline <= TOMORROW);
  const unmatched = demoBankRows.filter(r => !r.matched);
  const clientName = (id) => clients.find(c => c.id === id)?.name?.split('·')[0]?.trim() || '—';

  // Демо: вчерашний день не закрыт (day_closures пустая)
  const unclosedDays = ['2026-07-13'];

  return (
    <div>
      <h1 style={{ fontSize: 34, fontWeight: 500, margin: '4px 0 20px' }}>Мой день · 14 июля</h1>

      {/* Предупреждения — самое важное сверху */}
      {(unclosedDays.length > 0 || unmatched.length > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {unclosedDays.map(d => (
            <button key={d} onClick={() => onOpenTab('finance')} style={{
              border: 'none', textAlign: 'left', cursor: 'pointer',
              background: UI.dark, color: '#fff', borderRadius: 18, padding: '14px 20px', fontSize: 14, fontWeight: 600, flex: 1, minWidth: 260,
            }}>
              🌙 Вчера ({dm(d)}) день не закрыт — <span style={{ color: UI.accent, fontWeight: 800 }}>сделать сверку →</span>
            </button>
          ))}
          {unmatched.map(r => (
            <button key={r.id} onClick={() => onOpenTab('finance')} className="blink" style={{
              border: `1.5px solid #c0392b`, textAlign: 'left', cursor: 'pointer',
              background: 'rgba(192,57,43,.1)', color: '#c0392b', borderRadius: 18, padding: '14px 20px', fontSize: 14, fontWeight: 700, flex: 1, minWidth: 260,
            }}>
              ⚠️ {fmt(r.amount)} ₽ пришло на счёт, но не записано · {r.description.split('—')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Цифры дня */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <Big label="Доходы сегодня" value={`${fmt(income)} ₽`} UI={UI} />
        <Big label="Расходы сегодня" value={`${fmt(expense)} ₽`} UI={UI} />
        <Big label="Долги клиентов" value={`${fmt(totalDebt)} ₽`} UI={UI} dark accent={totalDebt > 0} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Долги */}
        <Card title={`Долги по задачам · ${debtors.length}`} UI={UI} style={{ flex: 1.4, minWidth: 360 }}>
          {debtors.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>{t.title}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>{clientName(t.client_id)} · у {t.assignee}</span>
              <span className="blink" style={{ marginLeft: 'auto', background: '#c0392b', color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                {fmt(t.debt)} ₽
              </span>
            </div>
          ))}
          {!debtors.length && <div style={{ color: UI.muted, fontSize: 14 }}>Долгов нет 🎉</div>}
        </Card>

        {/* Горящие дедлайны */}
        <Card title={`Горящие сроки · ${burning.length}`} UI={UI} style={{ flex: 1, minWidth: 300 }}>
          {burning.map(t => {
            const overdue = t.deadline < TODAY;
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>{t.title}</span>
                <span style={{ color: UI.muted, fontSize: 12.5 }}>{t.assignee}</span>
                <span className={overdue ? 'blink' : undefined} style={{
                  marginLeft: 'auto', flexShrink: 0,
                  background: overdue ? '#c0392b' : UI.accent, color: overdue ? '#fff' : UI.dark,
                  borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700,
                }}>⏰ {overdue ? 'просрочено' : dm(t.deadline)}</span>
              </div>
            );
          })}
          {!burning.length && <div style={{ color: UI.muted, fontSize: 14 }}>Всё в графике ✓</div>}
          <button onClick={() => onOpenTab('tasks')} style={{
            border: 'none', background: UI.soft, borderRadius: 999, padding: '9px 18px', fontSize: 13, fontWeight: 700, marginTop: 14,
          }}>Открыть канбан →</button>
        </Card>
      </div>
    </div>
  );
}

function Big({ label, value, UI, dark, accent }) {
  return (
    <div style={{
      background: dark ? UI.dark : '#fff', color: dark ? (accent ? UI.accent : '#fff') : UI.dark,
      borderRadius: 26, boxShadow: UI.shadow, padding: '20px 28px', flex: 1, minWidth: 200,
    }}>
      <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ color: dark ? 'rgba(255,255,255,.6)' : UI.muted, fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Card({ title, children, UI, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24, ...style }}>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
