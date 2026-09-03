// «Ещё» — всё, что не поместилось в таб-бар: контрагенты, депозиты, поставка, заметки,
// у владельца ещё аналитика и настройки. Плюс режим работы и выход.
// Каждый раздел — свой мобильный экран; какой именно, задаёт таблица SECTIONS ниже.
import { useEffect } from 'react';
import I from '../../Icon.jsx';
import { M, Card, Row, Btn } from '../ui.jsx';

import MContractors from './MContractors.jsx';
import MDeposits from './MDeposits.jsx';
import MSupply from './MSupply.jsx';
import MNotes from './MNotes.jsx';
import MAnalytics from './MAnalytics.jsx';
import MSettings from './MSettings.jsx';

const SECTIONS = [
  { key: 'contractors', label: 'Контрагенты', hint: 'подрядчики и перезаказы', icon: 'factory', C: MContractors, owner: false },
  { key: 'deposits', label: 'Депозиты и долги', hint: 'бюджетники и мелкие должники', icon: 'wallet', C: MDeposits, owner: false },
  { key: 'supply', label: 'Поставка', hint: 'что нужно купить', icon: 'cart', C: MSupply, owner: false },
  { key: 'notes', label: 'Заметки', hint: 'общая доска', icon: 'note', C: MNotes, owner: false },
  { key: 'analytics', label: 'Аналитика', hint: 'месяц, прибыль, выгрузка', icon: 'chart', C: MAnalytics, owner: true },
  { key: 'settings', label: 'Настройки', hint: 'категории, сотрудники, карты', icon: 'lock', C: MSettings, owner: true },
];

export default function MMore(props) {
  const { sub, onSub, isOwner, isOwnerAccount, workMode, toggleWorkMode, currentUser, userRole, onSignOut, DEMO } = props;

  // Владельческий раздел закрывается сам, если прав не стало: Кристи переключилась в режим
  // за стойкой (или сменился пользователь) прямо из открытой Аналитики/Настроек.
  const open = SECTIONS.find(s => s.key === sub && (!s.owner || isOwner));
  useEffect(() => { if (sub && !open) onSub(null); }, [sub, open, onSub]);

  if (open) {
    const C = open.C;
    return (
      <div>
        <button onClick={() => onSub(null)} style={{
          border: 'none', background: M.card, borderRadius: 999, padding: '10px 16px',
          fontSize: 13.5, fontWeight: 700, boxShadow: M.shadow, margin: '4px 0 12px', minHeight: M.tap,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><I n="chevronLeft" size={14} /> Ещё</button>
        <C {...props} />
      </div>
    );
  }

  const list = SECTIONS.filter(s => !s.owner || isOwner);

  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, margin: '6px 0 14px' }}>Ещё</div>

      <Card style={{ padding: '4px 16px' }}>
        {list.map((s, i) => (
          <Row key={s.key} onClick={() => onSub(s.key)} style={i === list.length - 1 ? { borderBottom: 'none' } : undefined}>
            <span style={{
              width: 36, height: 36, borderRadius: 12, background: M.soft,
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}><I n={s.icon} size={16} /></span>
            <span style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.label}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{s.hint}</div>
            </span>
            <I n="chevronRight" size={15} style={{ marginLeft: 'auto', color: M.muted, flexShrink: 0 }} />
          </Row>
        ))}
      </Card>

      {/* Кристи работает и за стойкой: тот же переключатель, что в шапке — здесь с подписями */}
      {isOwnerAccount && (
        <Card title="Режим работы">
          <div style={{ display: 'flex', gap: 8 }}>
            {[['owner', 'crown', 'Владелец'], ['employee', 'wrench', 'Менеджер']].map(([m, ic, label]) => (
              <Btn key={m} wide kind={workMode === m ? 'dark' : 'soft'}
                onClick={() => workMode !== m && toggleWorkMode()}>
                <I n={ic} size={14} /> {label}
              </Btn>
            ))}
          </div>
          <div style={{ color: M.muted, fontSize: 12, marginTop: 8 }}>
            В режиме менеджера видно то же, что видят девочки: свои записи, без итогов и приватных категорий.
          </div>
        </Card>
      )}

      <Card>
        <Row style={{ borderBottom: 'none' }}>
          <span style={{
            width: 38, height: 38, borderRadius: '50%', background: M.dark, color: '#fff',
            display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0,
          }}>{(currentUser?.name || '?')[0]}</span>
          <span>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{currentUser?.name}</div>
            <div style={{ color: M.muted, fontSize: 12 }}>{userRole === 'owner' ? 'Владелец' : 'Менеджер'}</div>
          </span>
        </Row>
        {!DEMO && (
          <Btn wide kind="soft" onClick={onSignOut} style={{ marginTop: 10 }}>
            <I n="logout" size={14} /> Выйти
          </Btn>
        )}
      </Card>
    </div>
  );
}
