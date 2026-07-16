// Раздел «Настройки» — только владелец: категории, банки/карты, пользователи.
// Сотрудников Кристи ведёт сама: создать (имя+логин+пароль), отредактировать, сменить пароль,
// уволить/вернуть. Новый сотрудник = колонка в Задачах; переименование переносит задачник.
// В проде это RPC admin_create_user / admin_update_user (только для владельца).
import { useState } from 'react';

export default function Settings({ categories, banks, users, tasks, db, UI, showToast }) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [uName, setUName] = useState('');
  const [uLogin, setULogin] = useState('');
  const [uPass, setUPass] = useState('');
  const [editId, setEditId] = useState(null);
  const [eName, setEName] = useState('');
  const [eLogin, setELogin] = useState('');
  const [ePass, setEPass] = useState('');

  const kinds = [
    ['income', '💰 Категории доходов'],
    ['expense_shared', '💸 Расходы (видят сотрудники)'],
    ['expense_work', '🔒 Рабочие расходы (только я)'],
    ['expense_personal', '🔒 Личные расходы (только я)'],
  ];

  const addUser = async () => {
    if (!uName.trim() || !uLogin.trim() || !uPass.trim()) { showToast('Заполни имя, логин и пароль', 'error'); return; }
    if (users.some(u => u.login === uLogin.trim().toLowerCase())) { showToast('Такой логин уже есть', 'error'); return; }
    const ok = await db.addUser({ name: uName.trim(), login: uLogin.trim().toLowerCase(), password: uPass });
    if (!ok) return;
    setUName(''); setULogin(''); setUPass(''); setShowAddUser(false);
    showToast(`${uName.trim()} добавлена ✓ — у неё появился свой задачник`);
  };

  const startEdit = (u) => {
    setEditId(u.id); setEName(u.name); setELogin(u.login || ''); setEPass('');
  };

  const saveEdit = async (u) => {
    if (!eName.trim() || !eLogin.trim()) { showToast('Имя и логин не могут быть пустыми', 'error'); return; }
    if (users.some(x => x.login === eLogin.trim().toLowerCase() && x.id !== u.id)) { showToast('Такой логин уже есть', 'error'); return; }
    const ok = await db.updateUser(u, {
      name: eName.trim() !== u.name ? eName.trim() : null,
      login: eLogin.trim().toLowerCase() !== u.login ? eLogin.trim().toLowerCase() : null,
      password: ePass || null,
    });
    if (!ok) return;
    setEditId(null);
    showToast('Сохранено ✓' + (ePass ? ' Пароль обновлён.' : ''));
  };

  const toggleActive = async (u) => {
    if (u.is_active !== false) {
      const openTasks = tasks.filter(t => !t.done && t.assignee === u.name).length;
      if (openTasks > 0) { showToast(`У ${u.name} ${openTasks} незакрытых задач — сначала передай их`, 'error'); return; }
    }
    const ok = await db.updateUser(u, { is_active: u.is_active === false });
    if (!ok) return;
    showToast(u.is_active === false ? `${u.name} снова работает ✓` : `${u.name} убрана из активных`);
  };

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
              <button onClick={() => showToast('Добавление категорий — следующая итерация')} style={{
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
          <button onClick={() => showToast('Добавление карт — следующая итерация')} style={{
            border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted, marginTop: 12,
          }}>+ добавить карту</button>
        </Card>

        <Card title="👥 Пользователи" UI={UI}>
          {users.map(u => (
            <div key={u.id} style={{ borderBottom: `1px solid ${UI.line}`, padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, opacity: u.is_active === false ? 0.45 : 1 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'owner' ? UI.accent : UI.dark, color: u.role === 'owner' ? UI.dark : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{u.name[0]}</span>
                <span style={{ fontWeight: 600 }}>{u.name}</span>
                {u.login && <span style={{ color: UI.muted, fontSize: 12.5 }}>@{u.login}</span>}
                {u.is_active === false && <span style={{ background: UI.soft, borderRadius: 999, padding: '2px 10px', fontSize: 11.5, fontWeight: 700 }}>не работает</span>}
                <span style={{ marginLeft: 'auto', background: u.role === 'owner' ? UI.accent : UI.soft, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                  {u.role === 'owner' ? 'Владелец' : 'Сотрудник'}
                </span>
                <button onClick={() => editId === u.id ? setEditId(null) : startEdit(u)} title="Редактировать" style={{
                  border: 'none', background: editId === u.id ? UI.dark : UI.soft, color: editId === u.id ? '#fff' : UI.dark,
                  borderRadius: 999, padding: '5px 11px', fontSize: 12.5, cursor: 'pointer', flexShrink: 0,
                }}>✎</button>
              </div>

              {editId === u.id && (
                <div style={{ background: UI.soft, borderRadius: 14, padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input style={inp(UI)} placeholder="Имя" value={eName} onChange={e => setEName(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Логин" value={eLogin} onChange={e => setELogin(e.target.value)} disabled={u.role === 'owner'} />
                    <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Новый пароль (пусто = не менять)" value={ePass} onChange={e => setEPass(e.target.value)} />
                  </div>
                  {eName.trim() !== u.name && <div style={{ color: UI.muted, fontSize: 12 }}>Задачник «{u.name}» переедет к имени «{eName.trim()}» вместе с задачами</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => saveEdit(u)} style={{ flex: 1, border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 0', fontWeight: 800, fontSize: 13, minWidth: 120 }}>Сохранить</button>
                    {u.role !== 'owner' && (
                      <button onClick={() => toggleActive(u)} style={{
                        border: 'none', background: u.is_active === false ? 'rgba(247,214,74,.4)' : 'rgba(192,57,43,.12)',
                        color: u.is_active === false ? UI.dark : '#c0392b',
                        borderRadius: 999, padding: '10px 14px', fontWeight: 700, fontSize: 13,
                      }}>{u.is_active === false ? '↩ вернуть' : 'уволить'}</button>
                    )}
                    <button onClick={() => setEditId(null)} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '10px 14px', fontSize: 13 }}>✕</button>
                  </div>
                </div>
              )}
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
