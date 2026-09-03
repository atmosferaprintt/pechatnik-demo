// «Заметки» на телефоне — рабочие шпаргалки команды: настройки фольгирования, вылеты и т.п.
// Читают и пишут все, удаляет только Кристи (как на компьютере). Закреплённые — сверху.
// Перетаскивания нет: на тач-экранах HTML5 drag не работает, порядок остаётся тот, что задан
// на компьютере (см. TODO от 2026-07-17).
import { useState } from 'react';
import I from '../../Icon.jsx';
import { M, Btn, Chip, Sheet, Field, Empty, inputStyle } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '';

export default function MNotes({ notes, isOwnerAccount, db, showToast }) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null); // null | { note } | { note: null }

  const orderKey = (n) => n.sort_order ?? n.id;
  const q = query.trim().toLowerCase();
  const list = notes
    .filter(n => !q || n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q))
    .sort((a, b) => (b.pinned === a.pinned ? 0 : b.pinned ? 1 : -1) || (orderKey(a) - orderKey(b)));

  const open = openId ? notes.find(n => n.id === openId) : null;

  const togglePin = (n) => {
    db.updateNote(n, { pinned: !n.pinned });
    showToast(n.pinned ? 'Открепила' : 'Закрепила сверху ✓');
  };

  return (
    <div>
      <div style={{ margin: '6px 0 12px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Заметки</div>
        <div style={{ color: M.muted, fontSize: 13, marginTop: 2 }}>рабочие настройки и шпаргалки</div>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Фольгирование, полосы, вылеты…"
          style={{ ...inputStyle, borderRadius: 999, paddingLeft: 42 }} />
        <I n="search" size={15} style={{ position: 'absolute', left: 16, top: 15, color: M.muted }} />
      </div>

      {list.map(n => (
        <div key={n.id} onClick={() => setOpenId(n.id)} style={{
          background: n.pinned ? 'rgba(247,214,74,.25)' : M.card,
          border: n.pinned ? `1.5px solid ${M.accent}` : '1.5px solid transparent',
          borderRadius: 20, padding: '14px 16px', marginBottom: 10, boxShadow: M.shadow,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.3, minWidth: 0 }}>{n.title}</span>
            {n.pinned && <Chip tone="dark" style={{ marginLeft: 'auto', flexShrink: 0 }}>закреп</Chip>}
          </div>
          <div style={{
            color: M.muted, fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'pre-wrap',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>{n.body || 'Без текста'}</div>
          <div style={{ color: M.muted, fontSize: 11.5, marginTop: 8 }}>
            <I n="note" size={11} /> {n.updated_by || n.author} · {dm(n.date)}
          </div>
        </div>
      ))}

      {!list.length && (
        <Empty icon="note" text={q ? 'Ничего не нашлось — попробуй другое слово'
          : 'Пока пусто. Сюда складываем рабочие настройки: фольгирование, ламинация, полосы, вылеты…'} />
      )}

      <Btn kind="dark" wide onClick={() => setForm({ note: null })} style={{ marginBottom: 8 }}>
        <I n="plus" size={14} /> Новая заметка
      </Btn>

      {open && (
        <Sheet open onClose={() => setOpenId(null)} title={open.title}
          footer={
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn kind={open.pinned ? 'accent' : 'soft'} style={{ flex: 1 }} onClick={() => togglePin(open)}>
                {open.pinned ? 'Открепить' : 'Закрепить'}
              </Btn>
              <Btn kind="dark" style={{ flex: 1 }} onClick={() => { setForm({ note: open }); setOpenId(null); }}>
                <I n="pencil" size={13} /> Править
              </Btn>
              {isOwnerAccount && (
                <Btn kind="danger" onClick={() => { db.removeNote(open); setOpenId(null); showToast('Заметка удалена'); }}>
                  Удалить
                </Btn>
              )}
            </div>
          }>
          <div style={{ color: M.muted, fontSize: 12.5, marginBottom: 12 }}>
            {open.updated_by || open.author} · {dm(open.date)}
          </div>
          <div style={{
            background: M.card, borderRadius: 16, padding: '16px 18px',
            fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>{open.body || 'Без текста'}</div>
        </Sheet>
      )}

      {form && <NoteForm note={form.note} db={db} showToast={showToast} onClose={() => setForm(null)} />}
    </div>
  );
}

function NoteForm({ note, db, showToast, onClose }) {
  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!title.trim()) { showToast('Напиши заголовок — по нему заметку будут искать', 'error'); return; }
    setSaving(true);
    try {
      const ok = note
        ? await db.updateNote(note, { title: title.trim(), body: body.trim() })
        : await db.addNote({ title: title.trim(), body: body.trim() });
      if (!ok) return;
      showToast(note ? 'Заметка исправлена ✓' : 'Заметка сохранена ✓');
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Sheet open onClose={onClose} title={note ? 'Правка заметки' : 'Новая заметка'}
      footer={<Btn kind="dark" wide onClick={save} disabled={saving}>{saving ? 'Сохраняю…' : 'Сохранить'}</Btn>}>
      <Field label="Заголовок">
        <input style={{ ...inputStyle, fontWeight: 700 }} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Фольгирование на софт-тач" />
      </Field>
      <Field label="Текст">
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder={'Сами настройки, по шагам.\nПереносы строк сохранятся.'}
          style={{ ...inputStyle, minHeight: 220, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
      </Field>
    </Sheet>
  );
}
