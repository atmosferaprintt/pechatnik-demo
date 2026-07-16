// Раздел «Настройки» — только владелец: категории, банки/карты, пользователи.
// Сотрудников Кристи ведёт сама: создать (имя+логин+пароль), отредактировать, сменить пароль,
// уволить/вернуть. Новый сотрудник = колонка в Задачах; переименование переносит задачник.
// В проде это RPC admin_create_user / admin_update_user (только для владельца).
import { useState } from 'react';
import I from '../Icon.jsx';

export default function Settings({ categories, banks, users, tasks, db, UI, showToast }) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [uName, setUName] = useState('');
  const [uLogin, setULogin] = useState('');
  const [uPass, setUPass] = useState('');
  const [editId, setEditId] = useState(null);
  const [catFormKind, setCatFormKind] = useState(null);
  const [catName, setCatName] = useState('');
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankName, setBankName] = useState('');

  const addCategory = async (kind) => {
    if (!catName.trim()) { showToast('Укажи название категории', 'error'); return; }
    const ok = await db.addCategory({ name: catName.trim(), kind });
    if (!ok) return;
    setCatName(''); setCatFormKind(null);
    showToast('Категория добавлена ✓');
  };

  const addBank = async () => {
    if (!bankName.trim()) { showToast('Укажи название банка', 'error'); return; }
    const ok = await db.addBank(bankName.trim());
    if (!ok) return;
    setBankName(''); setShowBankForm(false);
    showToast('Карта добавлена ✓');
  };
  const [eName, setEName] = useState('');
  const [eLogin, setELogin] = useState('');
  const [ePass, setEPass] = useState('');

  const kinds = [
    ['income', 'Категории доходов', 'income'],
    ['expense_shared', 'Расходы (видят сотрудники)', 'expense'],
    ['expense_work', 'Рабочие расходы (только я)', 'lock'],
    ['expense_personal', 'Личные расходы (только я)', 'lock'],
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

        {kinds.map(([kind, title, icon]) => (
          <Card key={kind} title={<><I n={icon} size={15} /> {title}</>} UI={UI}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.filter(c => c.kind === kind).map(c => (
                <span key={c.id} style={{ background: UI.soft, borderRadius: 999, padding: '7px 6px 7px 16px', fontSize: 13.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {c.name}
                  <button onClick={() => { db.removeCategory(c); showToast(`«${c.name}» убрана (история операций сохранится)`); }} title="Убрать категорию" style={{
                    border: 'none', background: 'transparent', color: UI.muted, fontSize: 12, cursor: 'pointer', padding: '0 5px',
                  }}>✕</button>
                </span>
              ))}
              {catFormKind === kind ? (
                <span style={{ display: 'flex', gap: 6, width: '100%' }}>
                  <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Название категории" value={catName}
                    onChange={e => setCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory(kind)} autoFocus />
                  <button onClick={() => addCategory(kind)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 16px', fontWeight: 800, fontSize: 13 }}>ОК</button>
                  <button onClick={() => setCatFormKind(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 12px', fontSize: 13 }}>✕</button>
                </span>
              ) : (
                <button onClick={() => { setCatFormKind(kind); setCatName(''); }} style={{
                  border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted,
                }}>+ добавить</button>
              )}
            </div>
          </Card>
        ))}

        <Card title={<><I n="card" size={15} /> Карты для переводов</>} UI={UI}>
          {banks.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>{b.name}</span>
              <span style={{ color: UI.muted, fontSize: 12.5 }}>карта Кристи</span>
              <button onClick={() => { db.removeBank(b); showToast(`Карта «${b.name}» убрана`); }} title="Убрать карту" style={{
                marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, padding: '4px 10px', fontSize: 12, color: UI.muted, cursor: 'pointer', flexShrink: 0,
              }}>✕</button>
            </div>
          ))}
          {showBankForm ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <input style={{ ...inp(UI), flex: 1, minWidth: 0 }} placeholder="Банк (Сбер, Т-Банк…)" value={bankName}
                onChange={e => setBankName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addBank()} autoFocus />
              <button onClick={addBank} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 16px', fontWeight: 800, fontSize: 13 }}>ОК</button>
              <button onClick={() => setShowBankForm(false)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 12px', fontSize: 13 }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setShowBankForm(true); setBankName(''); }} style={{
              border: `1.5px dashed ${UI.muted}`, background: 'transparent', borderRadius: 999, padding: '7px 16px', fontSize: 13.5, color: UI.muted, marginTop: 12,
            }}>+ добавить карту</button>
          )}
        </Card>

        <Card title={<><I n="users" size={15} /> Пользователи</>} UI={UI}>
          {users.map(u => (
            <div key={u.id} style={{ borderBottom: `1px solid ${UI.line}`, padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, opacity: u.is_active === false ? 0.45 : 1 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: u.role === 'owner' ? UI.accent : UI.dark, color: u.role === 'owner' ? UI.dark : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{u.name[0]}</span>
                {/* Имя и логин ужимаются, роль и ✎ всегда у правого края */}
                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
                  {u.login && <span style={{ color: UI.muted, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{u.login}</span>}
                  {u.is_active === false && <span style={{ background: UI.soft, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>не работает</span>}
                </span>
                <span style={{ flexShrink: 0, background: u.role === 'owner' ? UI.accent : UI.soft, borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 700 }}>
                  {u.role === 'owner' ? 'Владелец' : 'Сотрудник'}
                </span>
                <button onClick={() => editId === u.id ? setEditId(null) : startEdit(u)} title="Редактировать" style={{
                  border: 'none', background: editId === u.id ? UI.dark : UI.soft, color: editId === u.id ? '#fff' : UI.dark,
                  borderRadius: 999, padding: '5px 10px', fontSize: 12.5, cursor: 'pointer', flexShrink: 0,
                }}><I n="pencil" size={13} /></button>
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
