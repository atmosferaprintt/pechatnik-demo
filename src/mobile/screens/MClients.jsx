// «Клиенты» на телефоне: вместо таблицы — поиск и список карточек, карточка клиента шитом снизу.
// Долг, оплаты и задачи считает общий src/taskMoney.js — те же формулы, что на компьютере.
// Телефон здесь кликабельный (tel:): с телефона клиенту звонят прямо из карточки.
import { useState } from 'react';
import I from '../../Icon.jsx';
import { debtOfTask } from '../../taskMoney.js';
import * as money from '../../taskMoney.js';
import { M, Card, Pills, Btn, Chip, Row, Sheet, Field, Empty, inputStyle, fmt } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';

export default function MClients({ clients, tasks, transactions, categories, db, showToast }) {
  const [query, setQuery] = useState('');
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('new'); // new (свежие сверху) | name — как на компьютере
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const clientDebt = (id) => money.clientDebt(transactions, tasks, id);
  const catName = (id) => categories.find(c => c.id === id)?.name || '?';

  const filtered = clients.filter(c =>
    (c.name + c.phone + (c.instagram || '')).toLowerCase().includes(query.toLowerCase())
    && (!debtorsOnly || clientDebt(c.id) > 0)
  ).sort((a, b) => sortBy === 'name'
    ? a.name.localeCompare(b.name, 'ru')
    : (b.created_at || '').localeCompare(a.created_at || '') || b.id - a.id);

  const debtorsCount = clients.filter(c => clientDebt(c.id) > 0).length;
  const open = openId ? clients.find(c => c.id === openId) : null;

  return (
    <div>
      <div style={{ margin: '6px 0 14px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Клиенты</div>
        <div style={{ color: M.muted, fontSize: 13, marginTop: 2 }}>
          {clients.length} всего{debtorsCount > 0 ? ` · ${debtorsCount} с долгом` : ''}
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Имя, телефон, инстаграм"
          style={{ ...inputStyle, borderRadius: 999, paddingLeft: 42 }}
        />
        <I n="search" size={15} style={{ position: 'absolute', left: 16, top: 15, color: M.muted }} />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Очистить поиск" style={{
            position: 'absolute', right: 6, top: 5, border: 'none', background: M.soft,
            borderRadius: 999, width: 34, height: 34, display: 'grid', placeItems: 'center',
          }}><I n="x" size={14} /></button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <Pills value={sortBy} onChange={setSortBy} options={[
          { key: 'new', label: 'Новые' },
          { key: 'name', label: 'По имени' },
        ]} style={{ flex: '0 1 auto' }} />
        <button onClick={() => setDebtorsOnly(v => !v)} style={{
          border: 'none', borderRadius: 999, padding: '0 14px', minHeight: M.tap, flexShrink: 0,
          background: debtorsOnly ? M.danger : M.card, color: debtorsOnly ? '#fff' : M.dark,
          boxShadow: M.shadow, fontSize: 13, fontWeight: 700,
        }}>Должники{debtorsCount > 0 ? ` · ${debtorsCount}` : ''}</button>
      </div>

      <Card style={{ padding: '4px 16px' }}>
        {filtered.map((c, i) => {
          const debt = clientDebt(c.id);
          const cnt = money.clientTasks(tasks, c.id).length;
          return (
            <Row key={c.id} onClick={() => setOpenId(c.id)}
              style={i === filtered.length - 1 ? { borderBottom: 'none' } : undefined}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%', background: M.accent, color: M.dark,
                display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0,
              }}>{c.name[0]}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  {(c.prices || []).length > 0 && <I n="percent" size={11} style={{ color: M.muted, flexShrink: 0 }} />}
                </div>
                <div style={{ color: M.muted, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.phone || 'без телефона'}{cnt ? ` · задач ${cnt}` : ''}
                </div>
              </span>
              {debt > 0
                ? <Chip tone="danger" style={{ flexShrink: 0 }}>{fmt(debt)} ₽</Chip>
                : <I n="chevronRight" size={15} style={{ color: M.muted, flexShrink: 0 }} />}
            </Row>
          );
        })}
        {!filtered.length && (
          <Empty icon="users" text={debtorsOnly ? 'Должников нет' : query ? `Никого не нашла по «${query}»` : 'Клиентов пока нет'} />
        )}
      </Card>

      <Btn kind="dark" wide onClick={() => setShowNew(true)} style={{ marginBottom: 8 }}>
        <I n="plus" size={14} /> Новый клиент
      </Btn>

      {showNew && <NewClientSheet clients={clients} db={db} showToast={showToast} onClose={() => setShowNew(false)} />}

      {open && (
        <ClientSheet
          c={open} tasks={tasks} transactions={transactions} db={db} showToast={showToast}
          catName={catName} onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

// ---------- Новый клиент ----------
function NewClientSheet({ clients, db, showToast, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [insta, setInsta] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { showToast('Укажи имя клиента', 'error'); return; }
    // Телефон сверяем по последним 10 цифрам — как на компьютере, чтобы не плодить дубли
    const norm = phone.replace(/\D/g, '').slice(-10);
    if (norm && clients.some(c => c.phone_norm === norm)) { showToast('Клиент с таким телефоном уже есть', 'error'); return; }
    setSaving(true);
    const created = await db.addClient({ name: name.trim(), phone: phone.trim(), instagram: insta.trim(), note: note.trim() });
    setSaving(false);
    if (!created) return;
    showToast(`Клиент «${created.name}» добавлен ✓`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Новый клиент"
      footer={<Btn kind="dark" wide onClick={save} disabled={saving}>{saving ? 'Сохраняю…' : 'Добавить'}</Btn>}>
      <Field label="Имя"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Мадина · салон «Жасмин»" /></Field>
      <Field label="Телефон"><input style={inputStyle} type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="8 928 …" /></Field>
      <Field label="Инстаграм"><input style={inputStyle} value={insta} onChange={e => setInsta(e.target.value)} placeholder="@…" /></Field>
      <Field label="Заметка"><input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="постоянная, бирки каждый месяц…" /></Field>
    </Sheet>
  );
}

// ---------- Карточка клиента ----------
function ClientSheet({ c, tasks, transactions, db, showToast, catName, onClose }) {
  const [priceWhat, setPriceWhat] = useState('');
  const [priceVal, setPriceVal] = useState('');

  const ct = money.clientTasks(tasks, c.id);
  const cp = money.clientPayments(transactions, tasks, c.id);
  const cr = money.clientRefunds(transactions, tasks, c.id);
  const debt = money.clientDebt(transactions, tasks, c.id);
  const total = money.clientPaidTotal(transactions, tasks, c.id);

  const addPrice = () => {
    if (!priceWhat.trim() || !priceVal.trim()) { showToast('Заполни «что» и «цену»', 'error'); return; }
    db.updateClientPrices(c, [...(c.prices || []), { what: priceWhat.trim(), price: priceVal.trim() }]);
    setPriceWhat(''); setPriceVal('');
    showToast('Цена записана ✓');
  };

  return (
    <Sheet open onClose={onClose} title={c.name}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{
          width: 48, height: 48, borderRadius: '50%', background: M.accent, color: M.dark,
          display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, flexShrink: 0,
        }}>{c.name[0]}</span>
        <span style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</div>
          <div style={{ color: M.muted, fontSize: 13 }}>{c.phone || 'телефон не записан'}{c.instagram ? ` · ${c.instagram}` : ''}</div>
        </span>
        {/* Звонок прямо из карточки — на телефоне это главное действие */}
        {c.phone && (
          <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} aria-label="Позвонить" style={{
            marginLeft: 'auto', background: M.dark, color: '#fff', borderRadius: 999,
            width: M.tap, height: M.tap, display: 'grid', placeItems: 'center', flexShrink: 0, textDecoration: 'none',
          }}><I n="phone" size={17} /></a>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Mini label="Оплатил всего" value={`${fmt(total)} ₽`} />
        <Mini label="Задач" value={ct.length} />
        <Mini label="Долг" value={debt > 0 ? `${fmt(debt)} ₽` : 'нет'} danger={debt > 0} />
      </div>

      {c.note && (
        <div style={{ background: M.card, borderRadius: 16, padding: '11px 14px', fontSize: 13.5, marginBottom: 14 }}>
          <I n="note" size={13} /> {c.note}
        </div>
      )}

      {/* Индивидуальные цены — чтобы скидки были перед глазами, а не в переписке */}
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}><I n="percent" size={13} /> Индивидуальные цены</div>
      <div style={{ background: 'rgba(247,214,74,.18)', border: `1.5px solid ${M.accent}`, borderRadius: 18, padding: '6px 14px 12px', marginBottom: 16 }}>
        {(c.prices || []).map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${M.line}`, fontSize: 13.5 }}>
            <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.what}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 800, whiteSpace: 'nowrap' }}>{p.price}</span>
            <button onClick={() => db.updateClientPrices(c, c.prices.filter((_, idx) => idx !== i))}
              aria-label="Удалить цену" style={{
                border: 'none', background: 'transparent', color: M.muted, width: 34, height: 34,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}><I n="x" size={13} /></button>
          </div>
        ))}
        {!(c.prices || []).length && <div style={{ color: M.muted, fontSize: 13, padding: '8px 0' }}>Особых цен нет — обычный прайс</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={priceWhat} onChange={e => setPriceWhat(e.target.value)} placeholder="Что"
            style={{ ...inputStyle, flex: 1.3, minWidth: 0, padding: '11px 13px' }} />
          <input value={priceVal} onChange={e => setPriceVal(e.target.value)} placeholder="Цена"
            style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '11px 13px' }} />
          <Btn kind="dark" onClick={addPrice} style={{ padding: '0 18px', flexShrink: 0 }}>+</Btn>
        </div>
      </div>

      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Задачи</div>
      {ct.length ? ct.map(t => {
        const d = Math.max(0, debtOfTask(transactions, t));
        return (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${M.line}`, fontSize: 13.5 }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>у {t.assignee} · {fmt(t.amount)} ₽</div>
            </span>
            {t.cancelled
              ? <Chip>✕ отказ</Chip>
              : d > 0
              ? <Chip tone="danger">долг {fmt(d)}</Chip>
              : <Chip tone="accent">✓</Chip>}
          </div>
        );
      }) : <div style={{ color: M.muted, fontSize: 13.5, paddingBottom: 4 }}>Задач пока нет</div>}

      <div style={{ fontWeight: 800, fontSize: 14, margin: '16px 0 4px' }}>Оплаты</div>
      {/* Возвраты клиенту — в том же списке со знаком минус (2026-08-13) */}
      {cp.length || cr.length ? [...cp.map(p => ({ ...p, refund: false })), ...cr.map(p => ({ ...p, refund: true }))].map(p => (
        <div key={`${p.refund ? 'r' : 'p'}${p.id}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${M.line}`, fontSize: 13.5 }}>
          <I n={p.refund ? 'expense' : 'income'} size={13} style={{ color: p.refund ? M.danger : M.muted, flexShrink: 0 }} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{catName(p.category_id)}</div>
            <div style={{ color: M.muted, fontSize: 12 }}>{dm(p.op_date)} · {p.created_by}</div>
          </span>
          <span style={{ fontWeight: 800, color: p.refund ? M.danger : M.dark, flexShrink: 0 }}>
            {p.refund ? '−' : '+'}{fmt(p.amount)} ₽
          </span>
        </div>
      )) : <div style={{ color: M.muted, fontSize: 13.5 }}>Оплат пока нет</div>}
    </Sheet>
  );
}

function Mini({ label, value, danger }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, background: danger ? 'rgba(192,57,43,.1)' : M.card,
      border: danger ? `1px solid ${M.danger}` : 'none', borderRadius: 16, padding: '11px 12px',
    }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: danger ? M.danger : M.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      <div style={{ color: M.muted, fontSize: 11.5 }}>{label}</div>
    </div>
  );
}
