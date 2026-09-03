// Нижняя панель — главная навигация телефона. Пять вкладок, палец достаёт до любой.
// Набор одинаковый у владельца и у менеджера: разделы одни и те же, отличается содержимое
// (права считает userRole, как на компьютере). Всё остальное — во вкладке «Ещё».
import I from '../Icon.jsx';
import { M } from './ui.jsx';

export const MOBILE_TABS = [
  { key: 'home', label: 'Мой день', icon: 'home' },
  { key: 'tasks', label: 'Задачи', icon: 'check' },
  { key: 'finance', label: 'Деньги', icon: 'wallet' },
  { key: 'clients', label: 'Клиенты', icon: 'users' },
  { key: 'more', label: 'Ещё', icon: 'dots' },
];

export default function TabBar({ tab, onTab, badges = {} }) {
  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 800,
      background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(12px)',
      borderTop: `1px solid ${M.line}`,
      paddingBottom: M.safeBottom,
      display: 'flex',
    }}>
      {MOBILE_TABS.map(t => {
        const active = tab === t.key;
        const badge = badges[t.key];
        return (
          <button key={t.key} onClick={() => onTab(t.key)} style={{
            flex: 1, border: 'none', background: 'transparent', height: M.barH,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: active ? M.dark : M.muted, position: 'relative',
          }}>
            <span style={{
              position: 'relative', display: 'grid', placeItems: 'center',
              width: 40, height: 26, borderRadius: 999,
              background: active ? M.accent : 'transparent',
            }}>
              <I n={t.icon} size={17} />
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: 2, minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 999, background: M.danger, color: '#fff',
                  fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center',
                }}>{badge > 99 ? '99+' : badge}</span>
              )}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
