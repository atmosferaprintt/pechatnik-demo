// Кирпичики мобильной версии: карточки, пилюли, кнопки, шит снизу.
// Стиль тот же, что на компьютере (ДИЗАЙН.md: кремово-жёлтый, пилюли, крупные скругления),
// но размеры под палец: любая нажимаемая зона — минимум 44px.
import { useEffect } from 'react';
import I from '../Icon.jsx';

export const M = {
  accent: '#f7d64a',
  dark: '#1d1d1f',
  card: '#ffffff',
  soft: '#faf8f2',
  muted: '#8a8a85',
  line: '#e8e4d9',
  danger: '#c0392b',
  ok: '#2e7d5b',
  radius: 22,
  shadow: '0 6px 18px rgba(0,0,0,.06)',
  tap: 44,                 // минимальная зона нажатия
  barH: 62,                // высота таб-бара без safe-area
  safeBottom: 'env(safe-area-inset-bottom, 0px)',
};

export const fmt = (n) => (n || 0).toLocaleString('ru-RU');
export const money = (n) => `${fmt(n)} ₽`;

// ---------- Карточка ----------
export function Card({ title, right, children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: M.card, borderRadius: M.radius, boxShadow: M.shadow,
      padding: 16, marginBottom: 12, ...style,
    }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {title && <span style={{ fontWeight: 800, fontSize: 15 }}>{title}</span>}
          {right && <span style={{ marginLeft: 'auto', fontSize: 14 }}>{right}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

// ---------- Крупная цифра ----------
export function Stat({ label, value, sub, dark, accent, danger, onClick }) {
  const bg = dark ? M.dark : accent ? M.accent : M.card;
  const fg = dark ? '#fff' : M.dark;
  return (
    <div onClick={onClick} style={{
      background: bg, color: fg, borderRadius: M.radius, boxShadow: M.shadow,
      padding: '14px 16px', flex: '1 1 44%', minWidth: 0,
    }}>
      <div style={{ fontSize: 12, opacity: dark ? .7 : .6, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: danger ? M.danger : fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, opacity: .65, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ---------- Пилюля-переключатель ----------
export function Pills({ value, onChange, options, style }) {
  return (
    <div style={{
      display: 'flex', gap: 4, background: M.card, borderRadius: 999, padding: 4,
      boxShadow: M.shadow, overflowX: 'auto', WebkitOverflowScrolling: 'touch', ...style,
    }}>
      {options.map(o => (
        <button key={String(o.key)} onClick={() => onChange(o.key)} style={{
          border: 'none', borderRadius: 999, padding: '9px 15px', fontSize: 13.5, fontWeight: 700,
          background: value === o.key ? M.dark : 'transparent',
          color: value === o.key ? '#fff' : M.dark,
          whiteSpace: 'nowrap', flexShrink: 0, minHeight: 38,
        }}>{o.label}</button>
      ))}
    </div>
  );
}

// ---------- Кнопка ----------
export function Btn({ children, onClick, kind = 'soft', wide, disabled, style }) {
  const kinds = {
    dark: { background: M.dark, color: '#fff' },
    accent: { background: M.accent, color: M.dark },
    soft: { background: M.soft, color: M.dark, border: `1px solid ${M.line}` },
    ghost: { background: 'transparent', color: M.muted },
    danger: { background: '#fdecea', color: M.danger },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: 'none', borderRadius: 999, padding: '12px 18px', fontSize: 14.5, fontWeight: 700,
      minHeight: M.tap, width: wide ? '100%' : 'auto', opacity: disabled ? .45 : 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      whiteSpace: 'nowrap', flexShrink: 0,
      ...kinds[kind], ...style,
    }}>{children}</button>
  );
}

// ---------- Чип ----------
export function Chip({ children, tone = 'soft', style }) {
  const tones = {
    soft: { background: M.soft, color: M.muted },
    accent: { background: M.accent, color: M.dark },
    danger: { background: '#fdecea', color: M.danger },
    ok: { background: '#e8f5ee', color: M.ok },
    dark: { background: M.dark, color: '#fff' },
  };
  return (
    <span style={{
      borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4, ...tones[tone], ...style,
    }}>{children}</span>
  );
}

// ---------- Строка списка ----------
export function Row({ children, onClick, style }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
      borderBottom: `1px solid ${M.line}`, minHeight: M.tap, ...style,
    }}>{children}</div>
  );
}

// ---------- Шит снизу: замена модалок ----------
// Открывается от нижнего края (палец рядом), закрывается по фону, крестику и кнопке «назад».
export function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    // Фон не скроллится, пока открыт шит
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Аппаратная кнопка «назад» на Android закрывает шит, а не выкидывает из CRM
    window.history.pushState({ sheet: true }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.sheet) window.history.back();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 900,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: M.soft, width: '100%', maxHeight: '92vh',
        borderRadius: '26px 26px 0 0', display: 'flex', flexDirection: 'column',
        paddingBottom: M.safeBottom,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px',
          borderBottom: `1px solid ${M.line}`, flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 7,
            width: 38, height: 4, borderRadius: 999, background: M.line,
          }} />
          <span style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>{title}</span>
          <button onClick={onClose} aria-label="Закрыть" style={{
            marginLeft: 'auto', border: 'none', background: M.card, borderRadius: 999,
            width: 36, height: 36, boxShadow: M.shadow, display: 'grid', placeItems: 'center',
          }}><I n="x" size={16} /></button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: 12, borderTop: `1px solid ${M.line}`, background: M.card, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Поля ввода ----------
// 16px обязательны: на меньшем размере iOS зумит страницу при фокусе.
export const inputStyle = {
  width: '100%', padding: '13px 15px', borderRadius: 15, border: `1px solid ${M.line}`,
  fontSize: 16, background: M.card, outline: 'none', minHeight: M.tap,
};

export function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: M.muted, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

// ---------- Пустое состояние ----------
export function Empty({ icon = 'note', text }) {
  return (
    <div style={{ textAlign: 'center', color: M.muted, padding: '28px 12px', fontSize: 14 }}>
      <I n={icon} size={26} style={{ opacity: .4, display: 'block', margin: '0 auto 8px' }} />
      {text}
    </div>
  );
}
