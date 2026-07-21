import { useState } from 'react';

// Поисковик по категориям вместо длинного выпадающего списка (просьбы Кристи 2026-07-21).
// items: [{id, name, label?}] — показывается label (или name), ищется по нему же.
// mode 'name' — значение = имя, свободный текст допустим (состав заказа: старые части «Печать» не ломаем);
// mode 'id'   — значение = id категории, только выбор из списка (операции: category_id в БД).
export default function CatPicker({ items, value, onChange, UI, mode = 'name', placeholder = 'Категория (поиск)…', wrapStyle }) {
  const [q, setQ] = useState(null); // null — не редактируем, в поле текущее значение
  const open = q !== null;
  const labelOf = (c) => c.label || c.name;
  const current = mode === 'id'
    ? labelOf(items.find(c => String(c.id) === String(value)) || { name: '' })
    : (value || '');
  const query = (q || '').trim().toLowerCase();
  // Пока текст не менялся (фокус на заполненном поле) — показываем весь список
  const list = query && q !== current ? items.filter(c => labelOf(c).toLowerCase().includes(query)) : items;
  const pick = (c) => { onChange(mode === 'id' ? c.id : c.name); setQ(null); };
  const commitBlur = () => {
    if (q === null) return;
    const t = q.trim();
    if (mode === 'name') onChange(t);
    else if (!t) onChange('');
    else {
      const m = items.find(c => labelOf(c).toLowerCase() === t.toLowerCase() || c.name.toLowerCase() === t.toLowerCase());
      if (m) onChange(m.id); // не совпало — оставляем прежнюю категорию
    }
    setQ(null);
  };
  return (
    <div style={{ position: 'relative', ...wrapStyle }}>
      <input
        style={{
          width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`,
          background: UI.soft, fontSize: 14, outline: 'none',
        }}
        placeholder={placeholder}
        value={open ? q : current}
        onFocus={() => setQ(current)}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        onBlur={commitBlur}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 40,
          background: '#fff', border: `1px solid ${UI.line}`, borderRadius: 14,
          boxShadow: '0 12px 28px rgba(0,0,0,.14)', maxHeight: 208, overflowY: 'auto',
        }}>
          {list.map(c => (
            // onMouseDown с preventDefault — выбор срабатывает раньше blur и не теряет фокус
            <div key={c.id} onMouseDown={e => { e.preventDefault(); pick(c); }} style={{
              padding: '10px 14px', fontSize: 13.5, cursor: 'pointer',
              fontWeight: labelOf(c) === current ? 800 : 500,
              borderBottom: `1px solid ${UI.line}`,
            }}>{labelOf(c)}</div>
          ))}
          {!list.length && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: UI.muted }}>
              {mode === 'name' ? 'Нет такой категории — текст сохранится как есть' : 'Ничего не нашлось'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
