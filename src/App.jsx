// App.jsx — ТОЛЬКО каркас: авторизация, загрузка данных, навигация.
// Всё содержимое разделов живёт в src/sections/*. Сюда добавляем максимум 2-3 строки на новый раздел.
// Пока .env.local пустой — работает ДЕМО-РЕЖИМ с тестовыми данными (без Supabase).
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

import Dashboard from './sections/Dashboard.jsx';
import Tasks from './sections/Tasks.jsx';
import Clients from './sections/Clients.jsx';
import Contractors from './sections/Contractors.jsx';
import Deposits from './sections/Deposits.jsx';
import Finance from './sections/Finance.jsx';
import Analytics from './sections/Analytics.jsx';
import Settings from './sections/Settings.jsx';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const DEMO = !supabase;

// ---------- Константы ----------
export const ROLES = { owner: 'Владелец', employee: 'Сотрудник' };

export const STAGES = ['Новая', 'В работе', 'Производство', 'Готово'];

// Канбан задач — по людям (просьба Кристи 2026-07-14): у каждого свой задачник + общая «Сборка».
// Задачи видны всем и передаются от человека к человеку.
export const PEOPLE_COLUMNS = ['Алена', 'Настя', 'Влада', 'Марьян', 'Людмила', 'Кристи', 'Сборка'];

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Наличные' },
  { key: 'sbp', label: 'СБП' },
  { key: 'card', label: 'Карта' },
  { key: 'bank', label: 'Безнал' },
  { key: 'transfer', label: 'Перевод' },
];

const UI = {
  accent: '#f7d64a',
  dark: '#1d1d1f',
  card: '#ffffff',
  soft: '#faf8f2',
  muted: '#8a8a85',
  line: '#e8e4d9',
  radius: 24,
  shadow: '0 8px 24px rgba(0,0,0,.06)',
};

const TABS = [
  { key: 'home', label: 'Мой день', roles: ['owner'] },
  { key: 'tasks', label: 'Задачи', roles: ['owner', 'employee'] },
  { key: 'clients', label: 'Клиенты', roles: ['owner', 'employee'] },
  { key: 'contractors', label: 'Контрагенты', roles: ['owner', 'employee'] },
  { key: 'deposits', label: 'Депозиты', roles: ['owner', 'employee'] },
  { key: 'finance', label: 'Финансы', roles: ['owner', 'employee'] },
  { key: 'analytics', label: 'Аналитика', roles: ['owner'] },
  { key: 'settings', label: 'Настройки', roles: ['owner'] },
];

// ---------- Демо-данные (только пока нет Supabase) ----------
const DEMO_USERS = [
  { id: 'u1', name: 'Кристи', role: 'owner' },
  { id: 'u2', name: 'Влада', role: 'employee' },
  { id: 'u3', name: 'Настя', role: 'employee' },
  { id: 'u4', name: 'Алена', role: 'employee' },
  { id: 'u5', name: 'Марьян', role: 'employee' },
  { id: 'u6', name: 'Людмила', role: 'employee' },
];

const DEMO_CLIENTS = [
  { id: 1, name: 'Мадина · салон «Жасмин»', phone: '+7 928 555-12-34', instagram: '@jasmin_mkala', note: 'Постоянная, бирки каждый месяц' },
  { id: 2, name: 'Ахмед · кафе «Очаг»', phone: '+7 963 400-77-10', instagram: '@ochag_cafe', note: 'Меню, наклейки' },
  { id: 3, name: 'Патимат', phone: '+7 988 300-45-67', instagram: '', note: 'Фото на документы, ксерокс' },
  { id: 4, name: 'Магомед · автосервис', phone: '+7 928 111-22-33', instagram: '@ms_auto05', note: 'Визитки, баннер на фасад' },
];

// assignee = у кого задача сейчас (колонка канбана); log = история действий и передач
const DEMO_TASKS = [
  { id: 1, title: 'Визитки 500 шт', client_id: 4, stage: 'Новая', amount: 2500, deadline: '2026-07-15', assignee: 'Влада', created_at: '2026-07-13', description: 'Двусторонние, глянец 300 г. Макет пришлёт в WhatsApp.', log: [{ who: 'Влада', action: 'приняла', time: '13.07 16:20' }] },
  { id: 2, title: 'Баннер 3×6 «Автосервис»', client_id: 4, stage: 'В работе', amount: 7200, deadline: '2026-07-16', assignee: 'Настя', created_at: '2026-07-12', description: 'Баннерная ткань, люверсы по периметру через 50 см. Монтаж не наш.', parts: [{ name: 'Печать', amount: 5200 }, { name: 'Дизайн', amount: 2000 }], contractor_id: 1, log: [{ who: 'Настя', action: 'приняла', time: '12.07 11:00' }, { who: 'Настя', action: 'отдала контрагенту', time: '13.07 10:15' }] },
  { id: 3, title: 'Бирки атлас 200 шт', client_id: 1, stage: 'В работе', amount: 3400, deadline: '2026-07-14', assignee: 'Алена', created_at: '2026-07-12', description: 'Атласная лента 25 мм, логотип золотом, как в прошлый раз.', log: [{ who: 'Алена', action: 'приняла', time: '12.07 12:40' }, { who: 'Алена', action: 'подготовила к печати', time: '14.07 09:30' }] },
  { id: 4, title: 'Меню А4 ламинация ×20', client_id: 2, stage: 'Производство', amount: 4800, deadline: '2026-07-15', assignee: 'Людмила', created_at: '2026-07-11', description: 'Двусторонняя печать + матовая ламинация. Макет утверждён.', log: [{ who: 'Настя', action: 'приняла', time: '11.07 10:05' }, { who: 'Настя', action: 'подготовила', time: '11.07 15:00' }, { who: 'Настя', action: 'распечатала', time: '12.07 13:20' }, { who: 'Настя', action: '→ передала Людмиле · постпечатка', time: '12.07 13:25' }] },
  { id: 5, title: 'Кружки с фото ×3', client_id: 3, stage: 'Производство', amount: 1950, deadline: '2026-07-17', assignee: 'Кристи', created_at: '2026-07-13', description: 'Фото прислала в директ, белые кружки 330 мл.', log: [{ who: 'Кристи', action: 'приняла', time: '13.07 14:00' }] },
  { id: 6, title: 'Наклейки на банки 300 шт', client_id: 2, stage: 'Готово', amount: 5100, deadline: '2026-07-13', assignee: 'Сборка', created_at: '2026-07-10', description: 'Круглые 60 мм, влагостойкая плёнка. Забирают сами.', parts: [{ name: 'Печать', amount: 3600 }, { name: 'Дизайн', amount: 1500 }], log: [{ who: 'Настя', action: 'приняла', time: '10.07 12:00' }, { who: 'Настя', action: 'распечатала', time: '12.07 16:40' }, { who: 'Настя', action: '→ в Сборку · готово к выдаче', time: '13.07 10:00' }] },
  { id: 7, title: 'Бейджи 30 шт', client_id: 1, stage: 'Производство', amount: 2100, deadline: '2026-07-16', assignee: 'Марьян', created_at: '2026-07-14', description: 'Бейджи с окошком, вставки печатаем.', log: [{ who: 'Алена', action: 'приняла', time: '14.07 09:10' }, { who: 'Алена', action: 'подготовила к печати', time: '14.07 11:30' }, { who: 'Алена', action: '→ передала Марьян · изготовление', time: '14.07 11:35' }] },
  // Завершённые: с долгом — висят в разделе «Долги», оплаченные — в «Завершённых»
  { id: 8, title: 'Календари А3 ×50', client_id: 4, stage: 'Готово', amount: 6000, deadline: '2026-07-10', assignee: 'Сборка', created_at: '2026-07-05', description: 'Выдали 10.07, обещал перевести.', done: true, log: [{ who: 'Влада', action: 'приняла', time: '05.07 10:00' }, { who: 'Влада', action: '✓ завершила · выдано клиенту', time: '10.07 15:20' }] },
  { id: 9, title: 'Листовки А6 1000 шт', client_id: 3, stage: 'Готово', amount: 3800, deadline: '2026-07-08', assignee: 'Сборка', created_at: '2026-07-03', description: '', done: true, log: [{ who: 'Алена', action: '✓ завершила', time: '08.07 12:00' }] },
];

// Депозиты — бюджетники вносят сумму и расходуют частями
const DEMO_DEPOSITS = [
  {
    id: 1, name: 'Администрация района', total: 50000, created_at: '2026-07-01',
    uses: [
      { date: '2026-07-05', what: 'Бланки писем 2000 шт', amount: 8000 },
      { date: '2026-07-11', what: 'Грамоты А4 ×150', amount: 4500 },
    ],
  },
  {
    id: 2, name: 'Школа №8', total: 15000, created_at: '2026-07-10',
    uses: [{ date: '2026-07-12', what: 'Стенгазеты А1 ×3', amount: 2700 }],
  },
];

// Контрагенты — подрядчики, которым отдаём перезаказы (широкоформат, гравировка и т.п.)
const DEMO_CONTRACTORS = [
  { id: 1, name: 'Континент', service: 'Широкоформатная печать', phone: '+7 928 700-10-20' },
  { id: 2, name: 'Зенон', service: 'Материалы, плёнки', phone: '+7 928 700-30-40' },
  { id: 3, name: 'Расул · гравёр', service: 'Лазерная гравировка', phone: '+7 963 111-55-99' },
];

// Задачи контрагентам — отдельный канбан (не смешиваются с клиентскими задачами)
export const CONTRACTOR_STAGES = ['Новая', 'Отдано', 'Готово', 'Забрали'];

const DEMO_CONTRACTOR_TASKS = [
  { id: 1, title: 'Печать баннера 3×6', contractor_id: 1, amount: 3500, deadline: '2026-07-15', stage: 'Отдано', task_id: 2, comment: 'Макет отправлен в WhatsApp' },
  { id: 2, title: 'Плёнка Oracal 641 · 2 рулона', contractor_id: 2, amount: 5600, deadline: '2026-07-16', stage: 'Новая', task_id: null, comment: 'Белая матовая + чёрная' },
  { id: 3, title: 'Гравировка ложек ×10', contractor_id: 3, amount: 1800, deadline: '2026-07-14', stage: 'Готово', task_id: null, comment: 'Забрать после 17:00' },
];

const DEMO_CATEGORIES = [
  { id: 1, name: 'Ксерокс', kind: 'income' },
  { id: 2, name: 'Полиграфия', kind: 'income' },
  { id: 3, name: 'Фото на документы', kind: 'income' },
  { id: 4, name: 'Сувениры', kind: 'income' },
  { id: 5, name: 'Широкоформатка', kind: 'income' },
  { id: 6, name: 'Ленты, бирки', kind: 'income' },
  { id: 7, name: 'Доставка', kind: 'expense_shared' },
  { id: 8, name: 'Возврат', kind: 'expense_shared' },
  { id: 9, name: 'Другое', kind: 'expense_shared' },
  { id: 10, name: 'Тонер', kind: 'expense_work' },
  { id: 11, name: 'Бумага/ламинация', kind: 'expense_work' },
  { id: 12, name: 'Коммуналка', kind: 'expense_work' },
  { id: 13, name: 'Личные', kind: 'expense_personal' },
];

const DEMO_BANKS = [
  { id: 1, name: 'Сбер' },
  { id: 2, name: 'Т-Банк' },
  { id: 3, name: 'Альфа' },
  { id: 4, name: 'ВТБ' },
];

const DEMO_TRANSACTIONS = [
  { id: 1, op_date: '2026-07-14', type: 'income', category_id: 1, amount: 1240, payment_method: 'cash', bank_id: null, created_by: 'Влада', comment: '', time: '09:12' },
  { id: 2, op_date: '2026-07-14', type: 'income', category_id: 3, amount: 500, payment_method: 'sbp', bank_id: null, created_by: 'Настя', comment: 'фото 3×4', time: '09:40' },
  { id: 3, op_date: '2026-07-14', type: 'income', category_id: 2, amount: 3200, payment_method: 'transfer', bank_id: 2, created_by: 'Алена', comment: 'листовки А5', time: '10:05' },
  { id: 4, op_date: '2026-07-14', type: 'expense', category_id: 7, amount: 350, payment_method: 'cash', bank_id: null, created_by: 'Марьян', comment: 'доставка баннера', time: '11:20' },
  { id: 5, op_date: '2026-07-14', type: 'income', category_id: 5, amount: 7200, payment_method: 'card', bank_id: null, created_by: 'Настя', comment: 'баннер 3×6', time: '12:44', task_id: 2 },
  { id: 6, op_date: '2026-07-14', type: 'income', category_id: 6, amount: 1700, payment_method: 'transfer', bank_id: 1, created_by: 'Влада', comment: 'бирки', time: '13:10', task_id: 3 },
  { id: 7, op_date: '2026-07-14', type: 'expense', category_id: 10, amount: 4300, payment_method: 'cash', bank_id: null, created_by: 'Кристи', comment: 'тонер C227', time: '14:02' },
  { id: 8, op_date: '2026-07-14', type: 'expense', category_id: 13, amount: 460, payment_method: 'cash', bank_id: null, created_by: 'Кристи', comment: 'кафе', time: '15:05' },
  { id: 9, op_date: '2026-07-14', type: 'expense', category_id: 13, amount: 1200, payment_method: 'sbp', bank_id: null, created_by: 'Кристи', comment: 'подарок маме', time: '15:40' },
  // Вчера — для истории дней
  { id: 10, op_date: '2026-07-13', type: 'income', category_id: 2, amount: 5100, payment_method: 'card', bank_id: null, created_by: 'Настя', comment: 'наклейки', time: '12:20', task_id: 6 },
  { id: 11, op_date: '2026-07-13', type: 'income', category_id: 1, amount: 180, payment_method: 'cash', bank_id: null, created_by: 'Влада', comment: '', time: '13:05' },
  { id: 12, op_date: '2026-07-13', type: 'income', category_id: 4, amount: 2600, payment_method: 'transfer', bank_id: 3, created_by: 'Алена', comment: 'кружки-магниты', time: '15:30' },
  { id: 13, op_date: '2026-07-13', type: 'expense', category_id: 11, amount: 3300, payment_method: 'cash', bank_id: null, created_by: 'Кристи', comment: 'бумага SvetoCopy', time: '17:10' },
  { id: 14, op_date: '2026-07-08', type: 'income', category_id: 2, amount: 3800, payment_method: 'sbp', bank_id: null, created_by: 'Алена', comment: 'листовки', time: '12:05', task_id: 9, client_id: 3 },
];

// Строки «выписки» для демо сверки: одна сумма пришла, но не записана
const DEMO_BANK_ROWS = [
  { id: 1, amount: 3200, matched: true, description: 'СБП Т-Банк 10:05' },
  { id: 2, amount: 1700, matched: true, description: 'Перевод Сбер 13:10' },
  { id: 3, amount: 2400, matched: false, description: 'СБП Сбер 15:37 — ??? не записано' },
];

// Supabase отдаёт максимум 1000 строк — всегда тянем страницами.
async function loadAllRows(table, columns = '*', pageSize = 1000, filter = null) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let q = supabase.from(table).select(columns).range(from, from + pageSize - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(DEMO ? DEMO_USERS[0] : null);
  const [tab, setTab] = useState(() => localStorage.getItem('tab') || 'tasks');
  const [toast, setToast] = useState(null);

  const [clients, setClients] = useState(DEMO ? DEMO_CLIENTS : []);
  const [tasks, setTasks] = useState(DEMO ? DEMO_TASKS : []);
  const [categories, setCategories] = useState(DEMO ? DEMO_CATEGORIES : []);
  const [banks, setBanks] = useState(DEMO ? DEMO_BANKS : []);
  const [contractors, setContractors] = useState(DEMO ? DEMO_CONTRACTORS : []);
  const [contractorTasks, setContractorTasks] = useState(DEMO ? DEMO_CONTRACTOR_TASKS : []);
  const [deposits, setDeposits] = useState(DEMO ? DEMO_DEPOSITS : []);
  const [transactions, setTransactions] = useState(DEMO ? DEMO_TRANSACTIONS : []);
  const [loading, setLoading] = useState(!DEMO);

  const userRole = currentUser?.role || 'employee';
  const isOwner = userRole === 'owner';

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { localStorage.setItem('tab', tab); }, [tab]);

  // ---------- Auth (не в демо) ----------
  useEffect(() => {
    if (DEMO) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (DEMO || !session?.user) return;
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setCurrentUser(data));
  }, [session]);

  // ---------- Данные ----------
  const loadAll = useCallback(async () => {
    if (DEMO || !session) return;
    setLoading(true);
    try {
      const [cl, ts, cat, bk] = await Promise.all([
        loadAllRows('clients'), loadAllRows('tasks'), loadAllRows('categories'), loadAllRows('banks'),
      ]);
      setClients(cl); setTasks(ts); setCategories(cat); setBanks(bk);
    } catch (e) {
      console.error(e);
      showToast('Ошибка загрузки данных: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  }, [session, showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- первичная загрузка данных при входе
  useEffect(() => { loadAll(); }, [loadAll]);

  if (!DEMO && !session) return <LoginScreen showToast={showToast} />;
  if (!DEMO && session && currentUser === null) {
    return <Center><p style={{ color: UI.muted }}>Загружаю профиль…</p></Center>;
  }

  // В демо переключаемся между взглядом владельца и сотрудника
  const demoSwitchRole = () => {
    const next = isOwner ? DEMO_USERS[1] : DEMO_USERS[0];
    setCurrentUser(next);
    if (!TABS.find(t => t.key === tab)?.roles.includes(next.role)) setTab('tasks');
  };

  const visibleTabs = TABS.filter(t => t.roles.includes(userRole));
  const sectionProps = {
    supabase, currentUser, userRole, isOwner, showToast, onUpdate: loadAll, loadAllRows,
    clients, tasks, categories, banks, transactions, contractors, contractorTasks, deposits, setDeposits,
    setTasks, setTransactions, setContractors, setContractorTasks, CONTRACTOR_STAGES, PEOPLE_COLUMNS,
    demoUsers: DEMO_USERS, demoBankRows: DEMO_BANK_ROWS,
    loading, UI, STAGES, PAYMENT_METHODS, DEMO,
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 28px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ background: UI.card, borderRadius: 999, padding: '10px 22px', fontWeight: 800, boxShadow: UI.shadow, letterSpacing: 0.5 }}>
          🖨️ ПЕЧАТНИК
        </div>
        <nav style={{ display: 'flex', gap: 4, background: UI.card, borderRadius: 999, padding: 6, boxShadow: UI.shadow }}>
          {visibleTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 14, fontWeight: 600,
              background: tab === t.key ? UI.dark : 'transparent',
              color: tab === t.key ? '#fff' : UI.dark,
              transition: 'background .15s',
            }}>{t.label}</button>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {DEMO && (
            <button onClick={demoSwitchRole} title="Демо: переключить роль" style={{
              border: 'none', background: UI.accent, borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 700, boxShadow: UI.shadow,
            }}>
              👁 демо · смотрю как {isOwner ? 'владелец' : 'сотрудник'}
            </button>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, background: UI.card, borderRadius: 999, padding: '7px 14px 7px 7px', boxShadow: UI.shadow, fontSize: 13 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: UI.dark, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {(currentUser?.name || '?')[0]}
            </span>
            {currentUser?.name} · {ROLES[userRole]}
          </span>
          {!DEMO && (
            <button onClick={() => supabase.auth.signOut()} style={{ border: 'none', background: UI.card, borderRadius: 999, padding: '9px 16px', boxShadow: UI.shadow, fontSize: 13 }}>Выйти</button>
          )}
        </div>
      </header>

      <main>
        {tab === 'home' && isOwner && <Dashboard {...sectionProps} onOpenTab={setTab} />}
        {tab === 'tasks' && <Tasks {...sectionProps} />}
        {tab === 'clients' && <Clients {...sectionProps} />}
        {tab === 'contractors' && <Contractors {...sectionProps} />}
        {tab === 'deposits' && <Deposits {...sectionProps} />}
        {tab === 'finance' && <Finance {...sectionProps} />}
        {tab === 'analytics' && isOwner && <Analytics {...sectionProps} />}
        {tab === 'settings' && isOwner && <Settings {...sectionProps} />}
      </main>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#c0392b' : UI.dark, color: '#fff',
          padding: '12px 24px', borderRadius: 999, boxShadow: UI.shadow, zIndex: 1000, fontSize: 14,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

function Center({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      {children}
    </div>
  );
}

function LoginScreen({ showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) showToast('Не удалось войти: ' + error.message, 'error');
  };

  const inputStyle = {
    width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${UI.line}`,
    fontSize: 15, background: UI.soft, outline: 'none',
  };

  return (
    <Center>
      <form onSubmit={login} style={{ background: UI.card, borderRadius: UI.radius, boxShadow: UI.shadow, padding: 36, width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🖨️ ПЕЧАТНИК</div>
        <input style={inputStyle} type="email" placeholder="Почта" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
        <button disabled={busy} style={{
          border: 'none', borderRadius: 999, padding: '14px 18px', fontSize: 15, fontWeight: 700,
          background: UI.dark, color: '#fff', opacity: busy ? 0.6 : 1,
        }}>{busy ? 'Вхожу…' : 'Войти'}</button>
      </form>
    </Center>
  );
}
