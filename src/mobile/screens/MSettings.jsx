// «Настройки» на телефоне — только владелец: категории, карты, кнопки «мелочь одним тапом», сотрудницы.
// Разделы свёрнуты в список: на телефоне четыре блока категорий подряд превращаются в бесконечную ленту,
// а сюда заходят точечно — добавить категорию или сменить сотруднице пароль.
// Правила те же, что на компьютере: у сотрудницы с незакрытыми задачами увольнение не проходит,
// переименование переносит её задачник вместе с задачами.
import { useState } from 'react';
import I from '../../Icon.jsx';
import { M, Card, Btn, Chip, Sheet, Field, Empty, inputStyle, fmt } from '../ui.jsx';

const KINDS = [
  ['income', 'Категории доходов', 'income'],
  ['expense_shared', 'Расходы (видят сотрудницы)', 'expense'],
  ['expense_work', 'Рабочие расходы (только я)', 'lock'],
  ['expense_personal', 'Личные расходы (только я)', 'lock'],
];

export default function MSettings(props) {
  const { categories, banks, users, quickOps } = props;
  const [open, setOpen] = useState(null); // ключ раздела

  const rows = [
    ...KINDS.map(([kind, label, icon]) => ({
      key: kind, label, icon, hint: `${categories.filter(c => c.kind === kind).length} шт`,
    })),
    { key: 'banks', label: 'Карты для переводов', icon: 'card', hint: `${banks.length} шт` },
    { key: 'quick', label: 'Мелочь одним тапом', icon: 'zap', hint: `кнопок: ${quickOps.length}` },
    { key: 'users', label: 'Сотрудницы', icon: 'users', hint: `${users.filter(u => u.is_active !== false).length} работают` },
  ];

  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: '6px 0 14px' }}>Настройки</div>

      <Card style={{ padding: '4px 16px' }}>
        {rows.map((r, i) => (
          <div key={r.key} onClick={() => setOpen(r.key)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', minHeight: M.tap,
            borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 12, background: M.soft,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}><I n={r.icon} size={16} /></span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.label}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{r.hint}</div>
            </span>
            <I n="chevronRight" size={15} style={{ color: M.muted, flexShrink: 0 }} />
          </div>
        ))}
      </Card>

      {open && KINDS.some(([k]) => k === open) && (
        <CategoriesSheet {...props} kind={open} title={KINDS.find(([k]) => k === open)[1]} onClose={() => setOpen(null)} />
      )}
      {open === 'banks' && <BanksSheet {...props} onClose={() => setOpen(null)} />}
      {open === 'quick' && <QuickOpsSheet {...props} onClose={() => setOpen(null)} />}
      {open === 'users' && <UsersSheet {...props} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---------- Категории ----------
function CategoriesSheet({ kind, title, categories, db, showToast, onClose }) {
  const [name, setName] = useState('');
  const list = categories.filter(c => c.kind === kind);

  const add = async () => {
    if (!name.trim()) { showToast('Укажи название категории', 'error'); return; }
    const ok = await db.addCategory({ name: name.trim(), kind });
    if (!ok) return;
    setName('');
    showToast('Категория добавлена ✓');
  };

  return (
    <Sheet open onClose={onClose} title={title}>
      <Card style={{ padding: '4px 16px' }}>
        {list.map((c, i) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', minHeight: M.tap,
            borderBottom: i === list.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 0, flex: 1 }}>{c.name}</span>
            <button onClick={() => { db.removeCategory(c); showToast(`«${c.name}» убрана (история операций сохранится)`); }}
              aria-label="Убрать категорию" style={iconBtn}><I n="x" size={13} /></button>
          </div>
        ))}
        {!list.length && <Empty icon="note" text="Категорий пока нет" />}
      </Card>

      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} placeholder="Название категории"
          value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <Btn kind="dark" onClick={add} style={{ flexShrink: 0, padding: '0 18px' }}><I n="plus" size={14} /></Btn>
      </div>
    </Sheet>
  );
}

// ---------- Карты ----------
function BanksSheet({ banks, db, showToast, onClose }) {
  const [name, setName] = useState('');
  const add = async () => {
    if (!name.trim()) { showToast('Укажи название банка', 'error'); return; }
    const ok = await db.addBank(name.trim());
    if (!ok) return;
    setName('');
    showToast('Карта добавлена ✓');
  };
  return (
    <Sheet open onClose={onClose} title="Карты для переводов">
      <Card style={{ padding: '4px 16px' }}>
        {banks.map((b, i) => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', minHeight: M.tap,
            borderBottom: i === banks.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>карта Кристи</div>
            </span>
            <button onClick={() => { db.removeBank(b); showToast(`Карта «${b.name}» убрана`); }}
              aria-label="Убрать карту" style={iconBtn}><I n="x" size={13} /></button>
          </div>
        ))}
        {!banks.length && <Empty icon="card" text="Карт пока нет" />}
      </Card>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} placeholder="Сбер, Т-Банк…"
          value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <Btn kind="dark" onClick={add} style={{ flexShrink: 0, padding: '0 18px' }}><I n="plus" size={14} /></Btn>
      </div>
    </Sheet>
  );
}

// ---------- Быстрые кнопки ----------
function QuickOpsSheet({ quickOps, categories, db, showToast, onClose }) {
  const [label, setLabel] = useState('');
  const [sum, setSum] = useState('');
  const [cat, setCat] = useState('');

  const add = () => {
    if (!cat || !+sum) { showToast('Выбери категорию и сумму', 'error'); return; }
    const c = categories.find(x => x.id === +cat);
    db.saveQuickOps([...quickOps, { label: label.trim() || `${c.name} ${+sum} ₽`, category: c.name, amount: +sum }]);
    setLabel(''); setSum('');
    showToast('Кнопка добавлена ✓');
  };

  return (
    <Sheet open onClose={onClose} title="Мелочь одним тапом"
      footer={<Btn kind="dark" wide onClick={add}><I n="plus" size={14} /> Добавить кнопку</Btn>}>
      <div style={{ color: M.muted, fontSize: 13, marginBottom: 12 }}>
        Быстрые кнопки в форме сотрудниц: один тап — запись наличного дохода.
      </div>

      <Card style={{ padding: '4px 16px' }}>
        {quickOps.map((q, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', minHeight: M.tap,
            borderBottom: i === quickOps.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{q.label}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{q.category} · {fmt(q.amount)} ₽</div>
            </span>
            <button onClick={() => db.saveQuickOps(quickOps.filter((_, idx) => idx !== i))}
              aria-label="Убрать кнопку" style={iconBtn}><I n="x" size={13} /></button>
          </div>
        ))}
        {!quickOps.length && <Empty icon="zap" text="Кнопок пока нет" />}
      </Card>

      <Field label="Категория">
        <select style={inputStyle} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Выбрать…</option>
          {categories.filter(c => c.kind === 'income').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Сумма, ₽">
        <input style={inputStyle} type="number" inputMode="numeric" value={sum} onChange={e => setSum(e.target.value)} />
      </Field>
      <Field label="Подпись кнопки (необязательно)">
        <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="Ксерокс 20 ₽" />
      </Field>
    </Sheet>
  );
}

// ---------- Сотрудницы ----------
function UsersSheet({ users, tasks, db, showToast, onClose }) {
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <Sheet open onClose={onClose} title="Сотрудницы"
      footer={!adding && !editId ? <Btn kind="dark" wide onClick={() => setAdding(true)}><I n="plus" size={14} /> Добавить сотрудницу</Btn> : null}>
      {users.map(u => (
        <Card key={u.id} style={{ padding: 16, opacity: u.is_active === false ? 0.55 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: u.role === 'owner' ? M.accent : M.dark, color: u.role === 'owner' ? M.dark : '#fff',
              display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14,
            }}>{u.name[0]}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>
                {u.login ? `@${u.login}` : ''}{u.is_active === false ? ' · не работает' : ''}
              </div>
            </span>
            <Chip tone={u.role === 'owner' ? 'accent' : 'soft'}>{u.role === 'owner' ? 'Владелец' : 'Сотрудница'}</Chip>
            <button onClick={() => setEditId(editId === u.id ? null : u.id)} aria-label="Редактировать"
              style={{ ...iconBtn, background: editId === u.id ? M.dark : M.soft, color: editId === u.id ? '#fff' : M.muted }}>
              <I n="pencil" size={13} />
            </button>
          </div>
          {editId === u.id && <UserEdit u={u} users={users} tasks={tasks} db={db} showToast={showToast} onDone={() => setEditId(null)} />}
        </Card>
      ))}

      {adding && <UserAdd users={users} db={db} showToast={showToast} onDone={() => setAdding(false)} />}
    </Sheet>
  );
}

function UserEdit({ u, users, tasks, db, showToast, onDone }) {
  const [name, setName] = useState(u.name);
  const [login, setLogin] = useState(u.login || '');
  const [pass, setPass] = useState('');

  const save = async () => {
    if (!name.trim() || !login.trim()) { showToast('Имя и логин не могут быть пустыми', 'error'); return; }
    if (users.some(x => x.login === login.trim().toLowerCase() && x.id !== u.id)) { showToast('Такой логин уже есть', 'error'); return; }
    const ok = await db.updateUser(u, {
      name: name.trim() !== u.name ? name.trim() : null,
      login: login.trim().toLowerCase() !== u.login ? login.trim().toLowerCase() : null,
      password: pass || null,
    });
    if (!ok) return;
    onDone();
    showToast('Сохранено ✓' + (pass ? ' Пароль обновлён.' : ''));
  };

  const toggleActive = async () => {
    if (u.is_active !== false) {
      const openTasks = tasks.filter(t => !t.done && t.assignee === u.name).length;
      if (openTasks > 0) { showToast(`У ${u.name} ${openTasks} незакрытых задач — сначала передай их`, 'error'); return; }
    }
    const ok = await db.updateUser(u, { is_active: u.is_active === false });
    if (!ok) return;
    showToast(u.is_active === false ? `${u.name} снова работает ✓` : `${u.name} убрана из активных`);
  };

  return (
    <div style={{ background: M.soft, borderRadius: 16, padding: 14, marginTop: 12 }}>
      <Field label="Имя"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Логин">
        <input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} disabled={u.role === 'owner'} />
      </Field>
      <Field label="Новый пароль (пусто = не менять)">
        <input style={inputStyle} value={pass} onChange={e => setPass(e.target.value)} />
      </Field>
      {name.trim() !== u.name && (
        <div style={{ color: M.muted, fontSize: 12, marginBottom: 10 }}>
          Задачник «{u.name}» переедет к имени «{name.trim()}» вместе с задачами
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn kind="dark" style={{ flex: 1 }} onClick={save}>Сохранить</Btn>
        {u.role !== 'owner' && (
          <Btn kind={u.is_active === false ? 'accent' : 'danger'} onClick={toggleActive}>
            {u.is_active === false ? '↩ вернуть' : 'уволить'}
          </Btn>
        )}
        <Btn onClick={onDone}>Отмена</Btn>
      </div>
    </div>
  );
}

function UserAdd({ users, db, showToast, onDone }) {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');

  const save = async () => {
    if (!name.trim() || !login.trim() || !pass.trim()) { showToast('Заполни имя, логин и пароль', 'error'); return; }
    if (users.some(u => u.login === login.trim().toLowerCase())) { showToast('Такой логин уже есть', 'error'); return; }
    const ok = await db.addUser({ name: name.trim(), login: login.trim().toLowerCase(), password: pass });
    if (!ok) return;
    showToast(`${name.trim()} добавлена ✓ — у неё появился свой задачник`);
    onDone();
  };

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Новая сотрудница</div>
      <Field label="Имя (как в задачах)"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Логин"><input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} /></Field>
      <Field label="Пароль"><input style={inputStyle} value={pass} onChange={e => setPass(e.target.value)} /></Field>
      <div style={{ color: M.muted, fontSize: 12, marginBottom: 10 }}>
        Входит по этим логину и паролю. В Задачах появится своя колонка.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="dark" style={{ flex: 1 }} onClick={save}>Создать</Btn>
        <Btn onClick={onDone}>Отмена</Btn>
      </div>
    </Card>
  );
}

const iconBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 34, height: 34,
  display: 'grid', placeItems: 'center', color: M.muted, flexShrink: 0,
};
