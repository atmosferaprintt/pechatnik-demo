// «Поставка» на телефоне — список «что заканчивается».
// Главное: строка ввода вверху и крупные чекбоксы — за стойкой отмечают одним пальцем.
import { useState } from 'react';
import I from '../../Icon.jsx';
import { M, Card, Btn, Empty, inputStyle } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';

export default function MSupply({ supply, db, showToast }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const q = query.trim().toLowerCase();
  const visible = supply.filter(s => !q || s.text.toLowerCase().includes(q) || s.author.toLowerCase().includes(q));
  const active = visible.filter(s => !s.bought);
  const bought = visible.filter(s => s.bought);

  const add = () => {
    if (!text.trim()) { showToast('Напиши, что заканчивается', 'error'); return; }
    db.addSupplyItem(text.trim());
    setText('');
    showToast('Записано в поставку ✓');
  };

  const toggle = (s) => {
    db.toggleSupplyItem(s);
    showToast(s.bought ? 'Вернула в список ↩' : 'Отмечено купленным ✓');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 4px' }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Поставка</span>
        <button onClick={() => setShowSearch(v => !v)} aria-label="Поиск" style={{
          marginLeft: 'auto', border: 'none', background: M.card, borderRadius: 999,
          width: 38, height: 38, boxShadow: M.shadow, display: 'grid', placeItems: 'center',
        }}><I n="search" size={15} /></button>
      </div>
      <div style={{ color: M.muted, fontSize: 13, marginBottom: 12 }}>что заканчивается — записывай сразу</div>

      {showSearch && (
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск"
          style={{ ...inputStyle, marginBottom: 10 }} />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Тонер C227, осталось мало"
          style={{ ...inputStyle, borderRadius: 999, flex: 1, minWidth: 0 }} />
        <Btn kind="dark" onClick={add} style={{ flexShrink: 0, padding: '0 18px' }}><I n="plus" size={14} /></Btn>
      </div>

      <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 6px' }}>
        <I n="cart" size={13} /> Нужно купить · {active.length}
      </div>
      <Card style={{ padding: '4px 16px' }}>
        {active.map((s, i) => (
          <div key={s.id} style={{
            display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', minHeight: M.tap,
            borderBottom: i === active.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <button onClick={() => toggle(s)} aria-label="Отметить купленным" style={{
              border: `2px solid ${M.line}`, background: 'transparent', borderRadius: 9,
              width: 28, height: 28, flexShrink: 0,
            }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.text}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{s.author} · {dm(s.date)}</div>
            </span>
          </div>
        ))}
        {!active.length && <Empty icon="cart" text="Всё есть ✓" />}
      </Card>

      {bought.length > 0 && (
        <>
          <div style={{ fontWeight: 800, fontSize: 14, margin: '14px 0 6px', color: M.muted }}>✓ Куплено · {bought.length}</div>
          <Card style={{ padding: '4px 16px', background: M.soft }}>
            {bought.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', minHeight: M.tap,
                borderBottom: i === bought.length - 1 ? 'none' : `1px solid ${M.line}`,
              }}>
                <button onClick={() => toggle(s)} aria-label="Вернуть в список" style={{
                  border: 'none', background: M.accent, borderRadius: 9, width: 28, height: 28,
                  flexShrink: 0, fontWeight: 800, fontSize: 14,
                }}>✓</button>
                <span style={{ color: M.muted, textDecoration: 'line-through', fontSize: 14, minWidth: 0, flex: 1 }}>{s.text}</span>
                <button onClick={() => db.removeSupplyItem(s)} aria-label="Удалить" style={{
                  border: 'none', background: 'transparent', color: M.muted, width: 34, height: 34,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}><I n="x" size={13} /></button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
