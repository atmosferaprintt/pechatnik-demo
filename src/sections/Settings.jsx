// Раздел «Настройки» — только владелец: категории, банки/карты, пользователи. Заглушка на демо-данных.
// Telegram-сводку убрали по правкам Кристи от 2026-07-14.
// Сотрудников добавляет Кристи сама: имя + логин + пароль (в проде логин станет служебной
// почтой Supabase Auth, менеджер входит по этим логину и паролю). Новый сотрудник = колонка в Задачах.
import { useState } from 'react';

export default function Settings({ categories, banks, users, setUsers, UI, showToast }) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [uName, setUName] = useState('');
  const [uLogin, setULogin] = useState('');
  const [uPass, setUPass] = useState('');

  const addUser = () => {
    if (!uName.trim() || !uLogin.trim() || !uPass.trim()) { showToast('Заполни имя, логин и пароль', 'error'); return; }
    if (users.some(u => u.login === uLogin.trim().toLowerCase())) { showToast('Такой логин уже есть', 'error'); return; }
    const newUser = { id: 'u' + (users.length + 1) + Date.now().toString().slice(-4), name: uName.trim(), role: 'employee', login: uLogin.trim().toLowerCase(), password: uPass };
    // Сотрудницы — перед Кристи, чтобы её колонка в задачах оставалась последней
    setUsers(prev => [...prev.filter(u => u.role === 'employee'), newUser, ...prev.filter(u => u.role === 'owner')]);
    setUName(''); setULogin(''); setUPass(''); setShowAddUser(false);
    showToast(`${newUser.name} добавлена ✓ — у неё появился свой задачник`);
  };
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
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'owner' ? UI.accent : UI.dark, color: u.role === 'owner' ? UI.dark : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{u.name[0]}</span>
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              {u.login && <span style={{ color: UI.muted, fontSize: 12.5 }}>@{u.login}</span>}
              <span style={{ marginLeft: 'auto', background: u.role === 'owner' ? UI.accent : UI.soft, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                {u.role === 'owner' ? 'Владелец' : 'Сотрудник'}
              </span>
            </div>
          ))}

          {showAddUser ? (
            <div style={{ background: UI.soft, borderRadius: 16, padding: 14, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={inp(UI)} placeholder="Имя (как в задачах)" value={uName} onChange={e => setUName(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Логин" value={uLogin} onChange={e => setULogin(e.target.value)} />
                <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Пароль" value={uPass} onChange={e => setUPass(e.target.value)} />
              </div>
              <div style={{ color: UI.muted, fontSize: 12 }}>Сотрудница входит по этим логину и паролю. Появится своя колонка в Задачах.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addUser} style={{ flex: 1, border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '11px 0', fontWeight: 800, fontSize: 13 }}>Создать</button>
                <button onClick={() => setShowAddUser(false)} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '11px 16px', fontSize: 13 }}>Отмена</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddUser(true)} style={{
              border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted, marginTop: 12,
            }}>+ добавить сотрудника</button>
          )}
        </Card>
      </div>
    </div>
  );
}

const inp = (UI) => ({
  width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${UI.line}`,
  background: '#fff', fontSize: 13.5, outline: 'none',
});

function Card({ title, children, UI }) {
  return (
    <div style={{ background: '#fff', borderRadius: 26, boxShadow: UI.shadow, padding: 24 }}>
      <div style={{ fontWeight: 800, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}
