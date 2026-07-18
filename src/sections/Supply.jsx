// Раздел «Поставка» — список «что заканчивается / что заказать».
// Ручная вбивка без учёта остатков: девочки видят, что заканчивается, и сами дописывают.
// Заглушка на демо-данных.
import { useState } from 'react';
import I from '../Icon.jsx';
import { localDate } from '../dates.js';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = localDate();

export default function Supply({ supply, db, UI, showToast }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

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

  const remove = (s) => db.removeSupplyItem(s);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Поставка</h1>
        <span style={{ color: UI.muted, fontSize: 14 }}>что заканчивается — записывай сразу, без остатков</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск" style={{
          marginLeft: 'auto', width: 'min(200px, 100%)', padding: '10px 18px', borderRadius: 999, border: 'none',
          background: '#fff', boxShadow: UI.shadow, fontSize: 13.5, outline: 'none',
        }} />
      </div>

      <div style={{ maxWidth: 720 }}>
        {/* Быстрое добавление */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Что заканчивается? (например: тонер C227, осталось мало)"
            style={{
              flex: 1, padding: '14px 20px', borderRadius: 999, border: 'none', background: '#fff',
              boxShadow: UI.shadow, fontSize: 14, outline: 'none', minWidth: 0,
            }}
          />
          <button onClick={add} style={{
            border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 24px', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>+ Записать</button>
        </div>

        {/* Нужно купить */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: UI.shadow, padding: 22, marginBottom: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}><I n="cart" size={15} /> Нужно купить · {active.length}</div>
          {active.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '11px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
              <button onClick={() => toggle(s)} title="Куплено" style={{
                border: `2px solid ${UI.line}`, background: 'transparent', borderRadius: 8, width: 24, height: 24, flexShrink: 0, cursor: 'pointer',
              }} />
              <span style={{ fontWeight: 600 }}>{s.text}</span>
              <span style={{ marginLeft: 'auto', color: UI.muted, fontSize: 12.5, flexShrink: 0 }}>{s.author} · {dm(s.date)}</span>
            </div>
          ))}
          {!active.length && <div style={{ color: UI.muted, fontSize: 14 }}>Всё есть ✓</div>}
        </div>

        {/* Куплено */}
        {bought.length > 0 && (
          <div style={{ background: UI.soft, borderRadius: 24, padding: 22 }}>
            <div style={{ fontWeight: 800, marginBottom: 10, color: UI.muted }}>✓ Куплено · {bought.length}</div>
            {bought.map(s => (
              <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 2px', borderBottom: `1px solid ${UI.line}`, fontSize: 14 }}>
                <button onClick={() => toggle(s)} title="Вернуть в список" style={{
                  border: 'none', background: UI.accent, borderRadius: 8, width: 24, height: 24, flexShrink: 0, cursor: 'pointer', fontWeight: 800, fontSize: 13,
                }}>✓</button>
                <span style={{ color: UI.muted, textDecoration: 'line-through' }}>{s.text}</span>
                <button onClick={() => remove(s)} title="Удалить" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: UI.muted, fontSize: 14, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
