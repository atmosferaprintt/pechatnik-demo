// Раздел «Депозиты» — бюджетники вносят сумму и расходуют частями.
// Карточка депозита: имя, внесено, остаток; ниже списком — дата заказа, что заказали, сумма (отнимается).
// Заглушка на демо-данных.
import { useState } from 'react';

const fmt = (n) => (n || 0).toLocaleString('ru-RU');
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const TODAY = new Date().toISOString().slice(0, 10);

export default function Deposits({ deposits, setDeposits, UI, showToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [useFor, setUseFor] = useState(null); // id депозита, для которого открыта форма списания
  const [useWhat, setUseWhat] = useState('');
  const [useAmount, setUseAmount] = useState('');

  const spent = (d) => d.uses.reduce((s, u) => s + u.amount, 0);
  const left = (d) => d.total - spent(d);

  const addDeposit = () => {
    if (!name.trim() || !+total) { showToast('Укажи имя и сумму', 'error'); return; }
    setDeposits(prev => [...prev, {
      id: Math.max(0, ...prev.map(d => d.id)) + 1, name: name.trim(), total: +total, created_at: TODAY, uses: [],
    }]);
    setName(''); setTotal(''); setShowAdd(false);
    showToast('Депозит заведён ✓');
  };

  const addUse = (d) => {
    if (!useWhat.trim() || !+useAmount) { showToast('Укажи что заказали и сумму', 'error'); return; }
    if (+useAmount > left(d)) { showToast(`На депозите только ${fmt(left(d))} ₽`, 'error'); return; }
    setDeposits(prev => prev.map(x => x.id === d.id
      ? { ...x, uses: [...x.uses, { date: TODAY, what: useWhat.trim(), amount: +useAmount }] }
      : x));
    setUseWhat(''); setUseAmount(''); setUseFor(null);
    showToast('Списание записано ✓');
  };

  const topUp = (d) => {
    const add = prompt(`Пополнить депозит «${d.name}» на сумму, ₽:`); // временно для демо, в проде будет модалка
    if (add && +add > 0) {
      setDeposits(prev => prev.map(x => x.id === d.id ? { ...x, total: x.total + +add } : x));
      showToast(`Депозит пополнен на ${fmt(+add)} ₽ ✓`);
    }
  };

  const input = {
    width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid ${UI.line}`,
    background: UI.soft, fontSize: 14, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 20px' }}>
        <h1 style={{ fontSize: 34, fontWeight: 500, margin: 0 }}>Депозиты</h1>
        <span style={{ color: UI.muted, fontSize: 14 }}>бюджетники: внесли сумму — расходуют частями</span>
        <button onClick={() => setShowAdd(true)} style={{
          border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, marginLeft: 'auto',
        }}>+ Депозит</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
        {deposits.map(d => {
          const l = left(d);
          const pct = d.total ? Math.max(0, Math.min(100, (l / d.total) * 100)) : 0;
          return (
            <div key={d.id} style={{ background: '#fff', borderRadius: 24, boxShadow: UI.shadow, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>🏛️ {d.name}</span>
                <span style={{ color: UI.muted, fontSize: 12.5 }}>с {dm(d.created_at)}</span>
              </div>

              {/* Остаток крупно + полоса */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 6px' }}>
                <span className={l <= 0 ? 'blink' : undefined} style={{ fontSize: 28, fontWeight: 700, color: l <= 0 ? '#c0392b' : UI.dark }}>{fmt(l)} ₽</span>
                <span style={{ color: UI.muted, fontSize: 13 }}>осталось из {fmt(d.total)} ₽</span>
              </div>
              <div style={{ height: 22, background: UI.soft, borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? '#c0392b' : UI.accent, borderRadius: 999 }} />
              </div>

              {/* Списания */}
              {d.uses.length > 0 && (
                <div style={{ background: UI.soft, borderRadius: 16, padding: '4px 14px', marginBottom: 12 }}>
                  {d.uses.map((u, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '8px 0', borderBottom: i < d.uses.length - 1 ? `1px solid ${UI.line}` : 'none', fontSize: 13.5 }}>
                      <span style={{ color: UI.muted, fontSize: 12.5, width: 44, flexShrink: 0 }}>{dm(u.date)}</span>
                      <span style={{ fontWeight: 600 }}>{u.what}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, flexShrink: 0 }}>−{fmt(u.amount)} ₽</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Форма списания / кнопки */}
              {useFor === d.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input style={input} placeholder="Что заказали" value={useWhat} onChange={e => setUseWhat(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...input, flex: 1 }} type="number" placeholder="Сумма, ₽" value={useAmount} onChange={e => setUseAmount(e.target.value)} />
                    <button onClick={() => addUse(d)} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '0 22px', fontWeight: 800, fontSize: 14 }}>ОК</button>
                    <button onClick={() => setUseFor(null)} style={{ border: 'none', background: UI.soft, borderRadius: 999, padding: '0 16px', fontSize: 14 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setUseFor(d.id); setUseWhat(''); setUseAmount(''); }} style={{
                    flex: 1, border: 'none', background: UI.accent, borderRadius: 999, padding: '11px 0', fontWeight: 800, fontSize: 13.5,
                  }}>− Списать заказ</button>
                  <button onClick={() => topUp(d)} style={{
                    border: 'none', background: UI.soft, borderRadius: 999, padding: '11px 18px', fontWeight: 700, fontSize: 13.5,
                  }}>+ Пополнить</button>
                </div>
              )}
            </div>
          );
        })}
        {!deposits.length && <div style={{ color: UI.muted }}>Депозитов пока нет</div>}
      </div>

      {/* Новый депозит */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(29,29,31,.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 26, padding: 26, width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 17 }}>Новый депозит</span>
              <button onClick={() => setShowAdd(false)} style={{ marginLeft: 'auto', border: 'none', background: UI.soft, borderRadius: 999, width: 32, height: 32, fontSize: 15 }}>✕</button>
            </div>
            <input style={input} placeholder="Имя (организация / кто внёс)" value={name} onChange={e => setName(e.target.value)} />
            <input style={input} type="number" placeholder="Внесённая сумма, ₽" value={total} onChange={e => setTotal(e.target.value)} />
            <button onClick={addDeposit} style={{ border: 'none', background: UI.dark, color: '#fff', borderRadius: 999, padding: '14px 0', fontWeight: 800, fontSize: 14 }}>
              Завести
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
