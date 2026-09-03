// Оболочка мобильной версии: компактная шапка + экран + нижний таб-бар.
// Десктопный рендер в App.jsx не трогаем — сюда уходит вся отрисовка при ширине < брейкпоинта.
// Данные, права и db-методы приходят пропсами: своей авторизации и своих запросов здесь нет.
import { useState, useEffect } from 'react';
import I from '../Icon.jsx';
import { M } from './ui.jsx';
import TabBar from './TabBar.jsx';
import MHome from './screens/MHome.jsx';
import MMore from './screens/MMore.jsx';
import MTasks from './screens/MTasks.jsx';
import MFinance from './screens/MFinance.jsx';

import MClients from './screens/MClients.jsx';

export default function MobileApp(props) {
  // onSignOut уходит в «Ещё» вместе с остальными пропсами
  const { currentUser, userRole, isOwnerAccount, workMode, toggleWorkMode, onRefresh, refreshing, DEMO, demoSwitchRole } = props;

  const [tab, setTab] = useState(() => localStorage.getItem('mtab') || 'home');
  // Разделы из «Ещё» открываются поверх вкладки — свой ключ, чтобы десктопный tab не ломался
  const [sub, setSub] = useState(null);
  // «Записать оплату» из карточки задачи → Деньги с уже привязанной задачей
  const [payTaskId, setPayTaskId] = useState(null);

  useEffect(() => { localStorage.setItem('mtab', tab); }, [tab]);
  // Новый экран открывается сверху, а не там, где был скролл предыдущего
  useEffect(() => { window.scrollTo(0, 0); }, [tab, sub]);

  const openTab = (k) => { setSub(null); setPayTaskId(null); setTab(k); };

  const screen = () => {
    if (sub) return <MMore {...props} sub={sub} onSub={setSub} onTab={openTab} />;
    switch (tab) {
      case 'home': return <MHome {...props} onTab={openTab} onSub={setSub} />;
      case 'tasks': return <MTasks {...props} onPayTask={(t) => { setPayTaskId(t.id); setTab('finance'); }} />;
      case 'clients': return <MClients {...props} />;
      case 'finance': return <MFinance {...props} prefillTaskId={payTaskId} />;
      case 'more': return <MMore {...props} sub={null} onSub={setSub} onTab={openTab} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: `calc(${M.barH}px + ${M.safeBottom} + 16px)` }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 700,
        background: 'rgba(246,243,236,.92)', backdropFilter: 'blur(12px)',
        padding: `calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontWeight: 800, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <I n="printer" size={16} /> ПЕЧАТНИК
        </span>

        {/* Кристи работает и за стойкой: переключение режима одним тапом с любого экрана */}
        {isOwnerAccount && (
          <span style={{ display: 'flex', background: M.card, borderRadius: 999, padding: 3, boxShadow: M.shadow, marginLeft: 'auto' }}>
            {[['owner', 'crown'], ['employee', 'wrench']].map(([m, ic]) => (
              <button key={m} onClick={() => workMode !== m && toggleWorkMode()}
                title={m === 'owner' ? 'Режим владельца' : 'Режим менеджера'}
                aria-label={m === 'owner' ? 'Режим владельца' : 'Режим менеджера'}
                style={{
                  border: 'none', borderRadius: 999, width: 38, height: 34,
                  display: 'grid', placeItems: 'center',
                  background: workMode === m ? M.dark : 'transparent',
                  color: workMode === m ? '#fff' : M.dark,
                }}><I n={ic} size={14} /></button>
            ))}
          </span>
        )}

        {DEMO && (
          <button onClick={demoSwitchRole} style={{
            marginLeft: isOwnerAccount ? 0 : 'auto', border: 'none', background: M.accent,
            borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 700, minHeight: 34,
          }}><I n="eye" size={12} /> {currentUser?.name}</button>
        )}

        {!DEMO && (
          <button onClick={onRefresh} title="Обновить данные" aria-label="Обновить данные" style={{
            marginLeft: isOwnerAccount ? 0 : 'auto', border: 'none', background: M.card, borderRadius: 999,
            width: 34, height: 34, boxShadow: M.shadow, opacity: refreshing ? .4 : 1, display: 'grid', placeItems: 'center',
          }}><I n="repeat" size={14} /></button>
        )}

        <span title={`${currentUser?.name} · ${userRole === 'owner' ? 'владелец' : 'менеджер'}`} style={{
          width: 32, height: 32, borderRadius: '50%', background: M.dark, color: '#fff',
          display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>{(currentUser?.name || '?')[0]}</span>
      </header>

      <main style={{ padding: '4px 14px 0' }}>{screen()}</main>

      {/* Выход живёт в «Ещё»: в шапке телефона по нему легко промахнуться и вылететь из смены */}
      <TabBar tab={sub ? 'more' : tab} onTab={openTab} />
    </div>
  );
}
