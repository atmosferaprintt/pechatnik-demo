// Раздел «Заметки» — рабочие шпаргалки команды (идея Кристи 2026-07-19):
// настройки фольгирования, как убрать полосы на сложных плашках, размеры/вылеты —
// всё, что раньше терялось в группе WhatsApp, живёт в одном месте с поиском.
// Читают и пишут ВСЕ (как задачи), удаление — только владелец. Закреплённые — сверху.
import { useState } from 'react';
import I from '../Icon.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '';

export default function Notes({ notes, isOwnerAccount, db, UI, showToast }) {
  const [query, setQuery] = useState('');
  const [openNote, setOpenNote] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [fTitle, setFTitle] = useState('');
  const [fBody, setFBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Порядок: закреплённые всегда сверху, внутри группы — ручной (sort_order, NULL = порядок создания)
  const orderKey = (n) => n.sort_order ?? n.id;
  const q = query.trim().toLowerCase();
  const list = notes
    .filter(n => !q || n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
    .sort((a, b) => (b.pinned === a.pinned ? 0 : b.pinned ? 1 : -1) || (orderKey(a) - orderKey(b)));

  // Перетаскивание «по смыслу», как карточки задач (просьба Кристи 2026-07-19).
  // Сетка, не колонки: место вставки считаем и по строке (Y), и по половинке карточки (X).
  // Жёлтая полоска — слева от карточки, перед которой встанет заметка (или справа от последней).
  const [dragId, setDragId] = useState(null);
  const [dropAt, setDropAt] = useState(null); // { index } в отображаемом списке

  const dragOverGrid = (e) => {
    if (dragId == null) return;
    e.preventDefault();
    const cards = [...e.currentTarget.querySelectorAll('[data-nid]')];
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top - 4) { index = i; break; }                                  // строка выше — перед этой
      if (e.clientY <= r.bottom + 4 && e.clientX < r.left + r.width / 2) { index = i; break; } // та же строка, левее середины
    }
    setDropAt(d => d && d.index === index ? d : { index });
  };

  const dropOnGrid = () => {
    const n = notes.find(x => x.id === dragId);
    const at = dropAt;
    setDragId(null); setDropAt(null);
    if (!n || !at) return;

    const oldIdx = list.findIndex(x => x.id === n.id);
    const rest = list.filter(x => x.id !== n.id);
    let index = oldIdx !== -1 && at.index > oldIdx ? at.index - 1 : at.index;
    // Закреплённые всегда выше обычных — вставку зажимаем в границы своей группы
    const firstUnpinned = rest.findIndex(x => !x.pinned);
    const segStart = n.pinned ? 0 : (firstUnpinned === -1 ? rest.length : firstUnpinned);
    const segEnd = n.pinned ? (firstUnpinned === -1 ? rest.length : firstUnpinned) : rest.length;
    index = Math.max(segStart, Math.min(segEnd, index));
    if (index === oldIdx || !rest.length) return;

    const before = rest[index - 1], after = rest[index];
    const ord = !before ? orderKey(after) - 1 : !after ? orderKey(before) + 1 : (orderKey(before) + orderKey(after)) / 2;
    if (before && after && (ord === orderKey(before) || ord === orderKey(after))) {
      // Зазор выродился — перенумеровываем отображаемый список целиком
      const newList = [...rest.slice(0, index), n, ...rest.slice(index)];
      newList.forEach((x, i) => db.updateNote(x, { sort_order: i + 1 }, { touch: false }));
      return;
    }
    db.updateNote(n, { sort_order: ord }, { touch: false });
  };

  const openEdit = (n) => {
    setEditNote(n); setFTitle(n.title); setFBody(n.body || '');
    setOpenNote(null); setShowForm(true);
  };

  const save = async () => {
    if (saving) return;
    if (!fTitle.trim()) { showToast('Напиши заголовок — по нему заметку будут искать', 'error'); return; }
    setSaving(true);
    try {
      const ok = editNote
        ? await db.updateNote(editNote, { title: fTitle.trim(), body: fBody.trim() })
        : await db.addNote({ title: fTitle.trim(), body: fBody.trim() });
      if (!ok) return;
      setShowForm(false); setEditNote(null); setFTitle(''); setFBody('');
      showToast(editNote ? 'Заметка исправлена ✓' : 'Заметка сохранена ✓');
    } finally { setSaving(false); }
  };

  const togglePin = (n) => {
    db.updateNote(n, { pinned: !n.pinned });
    showToast(n.pinned ? 'Открепила' : 'Закрепила сверху ✓');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Заметки</h1>
        <span style={{ color: UI.muted, fontSize: 13 }}>рабочие настройки и шпаргалки — всё в одном месте</span>
        <button onClick={() => { setEditNote(null); setFTitle(''); setFBody(''); setShowForm(true); }} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Заметка</button>
      </div>

      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск: фольгирование, полосы, вылеты…" style={{
        width: 'min(340px, 100%)', padding: '10px 18px', borderRadius: 999, border: 'none',
        background: '#fff', boxShadow: UI.shadow, fontSize: 13.5, outline: 'none', marginBottom: 16, display: 'block',
      }} />

      <div onDragOver={dragOverGrid} onDrop={e => { e.preventDefault(); dropOnGrid(); }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
        {list.map((n, i) => {
          const ind = dropAt?.index === i ? 'left' : dropAt?.index === list.length && i === list.length - 1 ? 'right' : null;
          return (
          <div key={n.id} data-nid={n.id} draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(n.id)); setDragId(n.id); }}
            onDragEnd={() => { setDragId(null); setDropAt(null); }}
            onClick={() => setOpenNote(n)} style={{
            background: n.pinned ? 'rgba(247,214,74,.25)' : '#fff', borderRadius: 20, padding: '16px 18px',
            boxShadow: ind === 'left' ? `-7px 0 0 ${UI.accent}, ${UI.shadow}` : ind === 'right' ? `7px 0 0 ${UI.accent}, ${UI.shadow}` : UI.shadow,
            cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
            border: n.pinned ? `1.5px solid ${UI.accent}` : '1.5px solid transparent',
            opacity: dragId === n.id ? 0.35 : 1,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.3 }}>{n.title}</span>
              {n.pinned && (
                <span style={{ marginLeft: 'auto', flexShrink: 0, background: UI.dark, color: '#fff', borderRadius: 999, padding: '2px 9px', fontSize: 10.5, fontWeight: 800 }}>закреп</span>
              )}
            </div>
            <div style={{ color: UI.muted, fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
              {n.body || 'Без текста'}
            </div>
            <div style={{ marginTop: 'auto', color: UI.muted, fontSize: 11.5, display: 'flex', gap: 6 }}>
              <I n="note" size={11} /> {n.updated_by || n.author} · {dm(n.date)}
            </div>
          </div>
          );
        })}
      </div>
      {!list.length && (
        <div style={{ color: UI.muted, fontSize: 14, background: '#fff', borderRadius: 20, padding: 24, boxShadow: UI.shadow, maxWidth: 480 }}>
          {q ? 'Ничего не нашлось — попробуй другое слово' : 'Пока пусто. Сюда складываем рабочие настройки: фольгирование, ламинация, полосы на плашках, размеры и вылеты…'}
        </div>
      )}

      {/* Просмотр заметки */}
      {openNote && (() => {
        const n = notes.find(x => x.id === openNote.id) || openNote;
        return (
          <div onClick={() => setOpenNote(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
          }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{n.title}</div>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => togglePin(n)} title={n.pinned ? 'Открепить' : 'Закрепить сверху'} style={{
                    border: 'none', background: n.pinned ? UI.accent : UI.soft, borderRadius: 999, padding: '0 13px', height: 32, fontSize: 12, fontWeight: 700,
                  }}>{n.pinned ? 'закреплена' : 'закрепить'}</button>
                  <button onClick={() => openEdit(n)} title="Редактировать" style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 13 }}><I n="pencil" size={13} /></button>
                  {isOwnerAccount && (
                    <button onClick={() => { db.removeNote(n); setOpenNote(null); showToast('Заметка удалена'); }} title="Удалить насовсем" style={{
                      border: 'none', background: 'rgba(192,57,43,.1)', color: '#c0392b', borderRadius: 999, padding: '0 13px', height: 32, fontSize: 12, fontWeight: 700,
                    }}>удалить</button>
                  )}
                  <button onClick={() => setOpenNote(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
                </span>
              </div>
              <div style={{ color: UI.muted, fontSize: 12.5, marginBottom: 14 }}>
                {n.updated_by || n.author} · {dm(n.date)}
              </div>
              <div style={{ background: UI.soft, borderRadius: 16, padding: '16px 18px', fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {n.body || 'Без текста'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Создание / правка */}
      {showForm && (
        <div onClick={() => { setShowForm(false); setEditNote(null); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>{editNote ? 'Правка заметки' : 'Новая заметка'}</span>
              <button onClick={() => { setShowForm(false); setEditNote(null); }} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Заголовок (Фольгирование на софт-тач…)" style={{
              width: '100%', padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft, fontSize: 14, fontWeight: 700, outline: 'none',
            }} />
            <textarea value={fBody} onChange={e => setFBody(e.target.value)} placeholder={'Сами настройки, по шагам.\nПереносы строк сохранятся как написано.'} style={{
              width: '100%', minHeight: 220, padding: '12px 15px', borderRadius: 14, border: `1px solid ${UI.line}`, background: UI.soft,
              fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
            }} />
            <button onClick={save} disabled={saving} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14, opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
