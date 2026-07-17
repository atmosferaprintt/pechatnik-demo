// App.jsx — ТОЛЬКО каркас: авторизация, загрузка данных, навигация.
// Всё содержимое разделов живёт в src/sections/*. Сюда добавляем максимум 2-3 строки на новый раздел.
// Пока .env.local пустой — работает ДЕМО-РЕЖИМ с тестовыми данными (без Supabase).
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import useIsMobile from './mobile/useIsMobile.js';
import I from './Icon.jsx';

import Dashboard from './sections/Dashboard.jsx';
import Tasks from './sections/Tasks.jsx';
import Clients from './sections/Clients.jsx';
import Contractors from './sections/Contractors.jsx';
import Deposits from './sections/Deposits.jsx';
import Supply from './sections/Supply.jsx';
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

// Канбан задач — по людям (просьба Кристи 2026-07-14): у каждого свой задачник.
// Задачи видны всем и передаются от человека к человеку.
// Колонку «Сборка» убрали 2026-07-16 по просьбе Кристи: готовность отмечается бейджем
// «готово к выдаче» + кнопкой «✓ Завершить», а сборка у подрядчиков живёт в Контрагентах.
// Колонки задачников берутся из списка пользователей (users) — новый сотрудник = новая колонка.

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Наличные' },
  { key: 'sbp', label: 'СБП' },
  { key: 'card', label: 'Карта' },
  { key: 'bank', label: 'Безнал' },
  { key: 'transfer', label: 'Перевод' },
  // 'deposit' — служебный: оплата списанием с депозита. В форме оплаты не показывается,
  // в доходы дня и сверку не входит (деньги пришли раньше — при внесении депозита), но гасит долг задачи.
  { key: 'deposit', label: 'Депозит' },
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
  { key: 'deposits', label: 'Депозиты и долги', roles: ['owner', 'employee'] },
  { key: 'supply', label: 'Поставка', roles: ['owner', 'employee'] },
  { key: 'finance', label: 'Финансы', roles: ['owner', 'employee'] },
  { key: 'analytics', label: 'Аналитика', roles: ['owner'] },
  { key: 'settings', label: 'Настройки', roles: ['owner'] },
];

// ---------- Демо-данные (только пока нет Supabase) ----------
// login/password — для входа (в проде логин превращается в служебную почту Supabase Auth).
// Порядок сотрудников = порядок колонок в задачах.
const DEMO_USERS = [
  { id: 'u4', name: 'Алена', role: 'employee', login: 'alena' },
  { id: 'u3', name: 'Настя', role: 'employee', login: 'nastya' },
  { id: 'u2', name: 'Влада', role: 'employee', login: 'vlada' },
  { id: 'u5', name: 'Марьян', role: 'employee', login: 'maryan' },
  { id: 'u6', name: 'Людмила', role: 'employee', login: 'ludmila' },
  { id: 'u1', name: 'Кристи', role: 'owner', login: 'kristi' },
];

// prices — индивидуальные цены/договорённости (просьба Кристи: видеть скидки, а не искать по вацапу)
const DEMO_CLIENTS = [
  { id: 1, name: 'Мадина · салон «Жасмин»', phone: '+7 928 555-12-34', instagram: '@jasmin_mkala', note: 'Постоянная, бирки каждый месяц', prices: [{ what: 'Бирки атлас', price: '15 ₽/шт (обычная 17)' }, { what: 'Ленты с лого', price: '−10% от прайса' }] },
  { id: 2, name: 'Ахмед · кафе «Очаг»', phone: '+7 963 400-77-10', instagram: '@ochag_cafe', note: 'Меню, наклейки', prices: [{ what: 'Меню А4 + ламинация', price: '200 ₽/шт от 15 шт' }] },
  { id: 3, name: 'Патимат', phone: '+7 988 300-45-67', instagram: '', note: 'Фото на документы, ксерокс', prices: [] },
  { id: 4, name: 'Магомед · автосервис', phone: '+7 928 111-22-33', instagram: '@ms_auto05', note: 'Визитки, баннер на фасад', prices: [] },
];

// assignee = у кого задача сейчас (колонка канбана); log = история действий и передач
const DEMO_TASKS = [
  { id: 1, title: 'Визитки 500 шт', client_id: 4, stage: 'Новая', amount: 2500, deadline: '2026-07-15', assignee: 'Влада', created_at: '2026-07-13', description: 'Двусторонние, глянец 300 г. Макет пришлёт в WhatsApp.', log: [{ who: 'Влада', action: 'приняла', time: '13.07 16:20' }] },
  { id: 2, title: 'Баннер 3×6 «Автосервис»', client_id: 4, stage: 'В работе', amount: 7200, deadline: '2026-07-16', assignee: 'Настя', created_at: '2026-07-12', description: 'Баннерная ткань, люверсы по периметру через 50 см. Монтаж не наш.', parts: [{ name: 'Печать', amount: 5200 }, { name: 'Дизайн', amount: 2000 }], contractor_id: 1, log: [{ who: 'Настя', action: 'приняла', time: '12.07 11:00' }, { who: 'Настя', action: 'отдала контрагенту', time: '13.07 10:15' }] },
  { id: 3, title: 'Бирки атлас 200 шт', client_id: 1, stage: 'В работе', amount: 3400, deadline: '2026-07-14', assignee: 'Алена', created_at: '2026-07-12', description: 'Атласная лента 25 мм, логотип золотом, как в прошлый раз.', log: [{ who: 'Алена', action: 'приняла', time: '12.07 12:40' }, { who: 'Алена', action: 'подготовила к печати', time: '14.07 09:30' }] },
  { id: 4, title: 'Меню А4 ламинация ×20', client_id: 2, stage: 'Производство', amount: 4800, deadline: '2026-07-15', assignee: 'Людмила', created_at: '2026-07-11', description: 'Двусторонняя печать + матовая ламинация. Макет утверждён.', log: [{ who: 'Настя', action: 'приняла', time: '11.07 10:05' }, { who: 'Настя', action: 'подготовила', time: '11.07 15:00' }, { who: 'Настя', action: 'распечатала', time: '12.07 13:20' }, { who: 'Настя', action: '→ передала Людмиле · постпечатка', time: '12.07 13:25' }] },
  { id: 5, title: 'Кружки с фото ×3', client_id: 3, stage: 'Производство', amount: 1950, deadline: '2026-07-17', assignee: 'Кристи', created_at: '2026-07-13', description: 'Фото прислала в директ, белые кружки 330 мл.', log: [{ who: 'Кристи', action: 'приняла', time: '13.07 14:00' }] },
  { id: 6, title: 'Наклейки на банки 300 шт', client_id: 2, stage: 'Готово', amount: 5100, deadline: '2026-07-13', assignee: 'Настя', created_at: '2026-07-10', description: 'Круглые 60 мм, влагостойкая плёнка. Забирают сами.', parts: [{ name: 'Печать', amount: 3600 }, { name: 'Дизайн', amount: 1500 }], log: [{ who: 'Настя', action: 'приняла', time: '10.07 12:00' }, { who: 'Настя', action: 'распечатала', time: '12.07 16:40' }, { who: 'Настя', action: 'готово к выдаче', time: '13.07 10:00' }] },
  { id: 7, title: 'Бейджи 30 шт', client_id: 1, stage: 'Производство', amount: 2100, deadline: '2026-07-16', assignee: 'Марьян', created_at: '2026-07-14', description: 'Бейджи с окошком, вставки печатаем.', log: [{ who: 'Алена', action: 'приняла', time: '14.07 09:10' }, { who: 'Алена', action: 'подготовила к печати', time: '14.07 11:30' }, { who: 'Алена', action: '→ передала Марьян · изготовление', time: '14.07 11:35' }] },
  // Завершённые: с долгом — висят в разделе «Долги», оплаченные — в «Завершённых»
  { id: 8, title: 'Календари А3 ×50', client_id: 4, stage: 'Готово', amount: 6000, deadline: '2026-07-10', assignee: 'Влада', created_at: '2026-07-05', description: 'Выдали 10.07, обещал перевести.', done: true, log: [{ who: 'Влада', action: 'приняла', time: '05.07 10:00' }, { who: 'Влада', action: '✓ завершила · выдано клиенту', time: '10.07 15:20' }] },
  { id: 9, title: 'Листовки А6 1000 шт', client_id: 3, stage: 'Готово', amount: 3800, deadline: '2026-07-08', assignee: 'Алена', created_at: '2026-07-03', description: '', done: true, log: [{ who: 'Алена', action: '✓ завершила', time: '08.07 12:00' }] },
];

// Ручные должники — «как депозиты наоборот»: берут по мелочи (минус), потом разово оплачивают (плюс)
const DEMO_MANUAL_DEBTS = [
  {
    id: 1, name: 'Зайнаб (соседний салон)',
    entries: [
      { date: '2026-07-10', what: 'ксерокс документов', amount: -200 },
      { date: '2026-07-12', what: 'фото 3×4', amount: -350 },
      { date: '2026-07-13', what: 'оплатила часть', amount: 300 },
    ],
  },
];

// Список закупок «Поставка» — что заканчивается, ручная вбивка без учёта остатков
const DEMO_SUPPLY = [
  { id: 1, text: 'Сувенирка: металл под сублимацию заканчивается', author: 'Алена', date: '2026-07-14', bought: false },
  { id: 2, text: 'Бумага А4 — осталось 2 пачки', author: 'Настя', date: '2026-07-13', bought: false },
  { id: 3, text: 'Атласная лента 25 мм белая', author: 'Влада', date: '2026-07-12', bought: true },
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
export const CONTRACTOR_STAGES = ['В работе', 'Готово']; // упрощены 2026-07-16 по просьбе Кристи

const DEMO_CONTRACTOR_TASKS = [
  { id: 1, title: 'Печать баннера 3×6', contractor_id: 1, amount: 3500, deadline: '2026-07-15', stage: 'В работе', task_id: 2, comment: 'Макет отправлен в WhatsApp' },
  { id: 2, title: 'Плёнка Oracal 641 · 2 рулона', contractor_id: 2, amount: 5600, deadline: '2026-07-16', stage: 'В работе', task_id: null, comment: 'Белая матовая + чёрная' },
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
const DEMO_QUICK_OPS = [
  { label: 'Ксерокс 10 ₽', category: 'Ксерокс', amount: 10 },
  { label: 'Ксерокс 20 ₽', category: 'Ксерокс', amount: 20 },
  { label: 'Фото док 500 ₽', category: 'Фото на документы', amount: 500 },
];

const DEMO_BANK_ROWS = [
  { id: 1, amount: 3200, matched: true, description: 'СБП Т-Банк 10:05' },
  { id: 2, amount: 1700, matched: true, description: 'Перевод Сбер 13:10' },
  { id: 3, amount: 2400, matched: false, description: 'СБП Сбер 15:37 — ??? не записано' },
];

// Реальные «сегодня/вчера» считаются один раз при загрузке приложения
const REAL_TODAY = new Date().toISOString().slice(0, 10);
const REAL_YESTERDAY = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

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
  const isMobile = useIsMobile();
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState(DEMO ? DEMO_USERS : []);
  const [currentUser, setCurrentUser] = useState(DEMO ? DEMO_USERS.find(u => u.role === 'owner') : null);
  // Кристи работает и как сотрудник: режим «владелец / сотрудник» (интерфейсный, права в БД не меняет)
  const [workMode, setWorkMode] = useState('owner');
  const [tab, setTab] = useState(() => localStorage.getItem('tab') || 'tasks');
  const [toast, setToast] = useState(null);

  const [clients, setClients] = useState(DEMO ? DEMO_CLIENTS : []);
  const [tasks, setTasks] = useState(DEMO ? DEMO_TASKS : []);
  const [categories, setCategories] = useState(DEMO ? DEMO_CATEGORIES : []);
  const [banks, setBanks] = useState(DEMO ? DEMO_BANKS : []);
  const [contractors, setContractors] = useState(DEMO ? DEMO_CONTRACTORS : []);
  const [contractorTasks, setContractorTasks] = useState(DEMO ? DEMO_CONTRACTOR_TASKS : []);
  const [deposits, setDeposits] = useState(DEMO ? DEMO_DEPOSITS : []);
  const [manualDebts, setManualDebts] = useState(DEMO ? DEMO_MANUAL_DEBTS : []);
  const [supply, setSupply] = useState(DEMO ? DEMO_SUPPLY : []);
  // Закрытия смен: девочки закрывают смену сами (просьба Кристи 2026-07-16)
  const [dayClosures, setDayClosures] = useState([]);
  // Кнопки «мелочь одним тапом» — настраивает Кристи в Настройках (app_settings.quick_ops)
  const [quickOps, setQuickOps] = useState(DEMO ? DEMO_QUICK_OPS : []);
  const [transactions, setTransactions] = useState(DEMO ? DEMO_TRANSACTIONS : []);
  const [loading, setLoading] = useState(!DEMO);

  const isOwnerAccount = (currentUser?.role || 'employee') === 'owner';
  const userRole = isOwnerAccount && workMode === 'employee' ? 'employee' : (currentUser?.role || 'employee');
  const isOwner = userRole === 'owner';
  // Колонки задачников = активные пользователи (порядок: сотрудницы, Кристи последней)
  const peopleColumns = users.filter(u => u.is_active !== false).map(u => u.name);

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

  // ---------- Данные: полная загрузка из Supabase + приведение к формату секций ----------
  const loadAll = useCallback(async () => {
    if (DEMO || !session) return;
    setLoading(true);
    try {
      const profs = await loadAllRows('profiles');
      profs.sort((a, b) => (a.role === 'owner') - (b.role === 'owner') || a.sort - b.sort);
      const nameOf = (id) => profs.find(u => u.id === id)?.name || '—';

      const [cl, ts, logs, cat, bk, ctr, ctrT, dep, depU, md, mdE, sup, dc, tx] = await Promise.all([
        loadAllRows('clients'), loadAllRows('tasks'), loadAllRows('task_log'),
        loadAllRows('categories'), loadAllRows('banks'),
        loadAllRows('contractors'), loadAllRows('contractor_tasks'),
        loadAllRows('deposits'), loadAllRows('deposit_uses'),
        loadAllRows('manual_debts'), loadAllRows('manual_debt_entries'),
        loadAllRows('supply_items'), loadAllRows('day_closures'), loadAllRows('transactions'),
      ]);
      const txLogs = await loadAllRows('transaction_log');
      const { data: qo } = await supabase.from('app_settings').select('value').eq('key', 'quick_ops').maybeSingle();
      setQuickOps(Array.isArray(qo?.value) ? qo.value : []);

      const hhmm = (t) => (t || '').slice(11, 16);
      const dOnly = (t) => (t || '').slice(0, 10);
      const logT = (t) => `${t.slice(8, 10)}.${t.slice(5, 7)} ${hhmm(t)}`;

      setUsers(profs);
      setCurrentUser(profs.find(u => u.id === session.user.id) || null);
      setClients(cl.map(c => ({ ...c, prices: c.prices || [] })));
      setCategories(cat.filter(c => c.is_active).sort((a, b) => a.sort - b.sort));
      setBanks(bk.filter(b => b.is_active).sort((a, b) => a.sort - b.sort));
      setContractors(ctr.filter(c => c.is_active));
      setContractorTasks(ctrT.map(t => ({ ...t, amount: t.amount == null ? null : +t.amount })));
      setTasks(ts.map(t => ({
        ...t, amount: t.amount == null ? null : +t.amount, parts: t.parts || [],
        created_at: dOnly(t.created_at),
        log: logs.filter(l => l.task_id === t.id).map(l => ({ who: l.who, action: l.action, time: logT(l.created_at) })),
      })));
      setDeposits(dep.map(d => ({
        ...d, total: +d.total, created_at: dOnly(d.created_at),
        uses: depU.filter(u => u.deposit_id === d.id).map(u => ({ id: u.id, date: u.use_date, what: u.what, amount: +u.amount, task_id: u.task_id })),
      })));
      setManualDebts(md.map(d => ({
        ...d,
        entries: mdE.filter(e => e.debt_id === d.id).map(e => ({ date: e.entry_date, what: e.what, amount: +e.amount })),
      })));
      setSupply(sup.map(s => ({ id: s.id, text: s.text, bought: s.bought, author: nameOf(s.created_by), date: dOnly(s.created_at) })));
      setDayClosures(dc.map(c => ({ date: c.close_date, cash_fact: +c.cash_fact, cash_calc: +c.cash_calc, diff: +c.diff, closed_by: nameOf(c.closed_by) })));
      setTransactions(tx.map(t => ({
        ...t, amount: +t.amount, created_by_id: t.created_by, created_by: nameOf(t.created_by), time: hhmm(t.created_at),
        log: txLogs.filter(l => l.transaction_id === t.id).map(l => ({ who: l.who, action: l.action, time: logT(l.created_at) })),
      })));
    } catch (e) {
      console.error(e);
      showToast('Ошибка загрузки данных: ' + (e.message || e), 'error');
    } finally {
      setLoading(false);
    }
  }, [session, showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- первичная загрузка данных при входе
  useEffect(() => { loadAll(); }, [loadAll]);

  // Живые обновления: любое изменение в БД (другая сотрудница записала) → перезагрузка с дебаунсом
  useEffect(() => {
    if (DEMO || !session) return;
    let timer;
    const ch = supabase.channel('crm-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => loadAll(), 700);
      })
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [session, loadAll]);

  if (!DEMO && !session) return <LoginScreen showToast={showToast} />;
  if (!DEMO && session && currentUser === null) {
    return <Center><p style={{ color: UI.muted }}>Загружаю профиль…</p></Center>;
  }

  // В демо переключаемся между аккаунтом владельца и сотрудницы
  const demoSwitchRole = () => {
    const next = isOwnerAccount ? users.find(u => u.role === 'employee') : users.find(u => u.role === 'owner');
    setCurrentUser(next);
    setWorkMode('owner');
    if (!TABS.find(t => t.key === tab)?.roles.includes(next.role)) setTab('tasks');
  };

  // Режим Кристи «работаю как сотрудник»: тот же аккаунт, интерфейс сотрудницы
  const toggleWorkMode = () => {
    const next = workMode === 'owner' ? 'employee' : 'owner';
    setWorkMode(next);
    if (next === 'employee' && !TABS.find(t => t.key === tab)?.roles.includes('employee')) setTab('tasks');
  };

  // ---------- Слой данных: секции пишут ТОЛЬКО через db ----------
  // В проде: запись в Supabase → обновление локального state (+ realtime добьёт остальных).
  // В демо: только локальный state. Ошибки сервера показываются тостом, наружу не летят.
  const nextId = (arr) => Math.max(0, ...arr.map(x => +x.id || 0)) + 1;
  const nowT = () => new Date().toTimeString().slice(0, 5);
  const logTimeNow = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${nowT()}`; };
  const fail = (e) => { console.error(e); showToast('Не сохранилось: ' + (e.message || e), 'error'); return null; };

  const db = {
    today: DEMO ? '2026-07-14' : REAL_TODAY,
    yesterday: DEMO ? '2026-07-13' : REAL_YESTERDAY,
    profName: (id) => users.find(u => u.id === id)?.name || '—',

    async addTransactions(recs) { // recs без id/created_by/time — проставляются здесь
      if (DEMO) {
        setTransactions(prev => [...prev, ...recs.map((r, i) => ({ id: nextId(prev) + i, created_by: currentUser.name, time: nowT(), op_date: db.today, ...r }))]);
        return true;
      }
      try {
        const rows = recs.map(({ ...r }) => ({ op_date: db.today, ...r, created_by: currentUser.id }));
        const { data, error } = await supabase.from('transactions').insert(rows).select();
        if (error) throw error;
        setTransactions(prev => [...prev, ...data.map(t => ({ ...t, amount: +t.amount, created_by_id: t.created_by, created_by: currentUser.name, time: (t.created_at || '').slice(11, 16) }))]);
        return true;
      } catch (e) { return fail(e); }
    },

    async moveTxToToday(t) {
      return db.updateTransaction(t, { op_date: db.today, moved_from: t.op_date });
    },

    async moveTxToYesterday(t) {
      return db.updateTransaction(t, { op_date: db.yesterday, moved_from: null });
    },

    async closeShift({ date, cash_calc, cash_fact, diff }) {
      if (!DEMO) {
        const { error } = await supabase.from('day_closures').insert({ close_date: date, cash_calc, cash_fact, diff, closed_by: currentUser.id });
        if (error) return fail(error);
      }
      setDayClosures(prev => [...prev, { date, cash_calc, cash_fact, diff, closed_by: currentUser.name }]);
      return true;
    },

    async addTask(payload) { // {title, client_id, contractor_id, amount, parts, deadline, description, assignee}
      const log0 = { who: currentUser.name, action: payload._firstAction || 'приняла', time: logTimeNow() };
      if (DEMO) {
        let created;
        setTasks(prev => { created = { id: nextId(prev), done: false, stage: 'Новая', created_at: db.today, log: [log0], parts: [], ...payload }; return [...prev, created]; });
        return created;
      }
      try {
        const { _firstAction, ...clean } = payload;
        const { data, error } = await supabase.from('tasks').insert({ ...clean, created_by: currentUser.id }).select().single();
        if (error) throw error;
        await supabase.from('task_log').insert({ task_id: data.id, who: log0.who, action: log0.action });
        const task = { ...data, amount: data.amount == null ? null : +data.amount, parts: data.parts || [], created_at: (data.created_at || '').slice(0, 10), log: [log0] };
        setTasks(prev => [...prev, task]);
        return task;
      } catch (e) { return fail(e); }
    },

    async removeTask(t) {
      if (!DEMO) {
        const { error } = await supabase.from('tasks').delete().eq('id', t.id);
        if (error) return fail(error);
      }
      setTasks(prev => prev.filter(x => x.id !== t.id));
      return true;
    },

    async updateTask(t, patch, logAction) {
      if (!DEMO) {
        const { error } = await supabase.from('tasks').update(patch).eq('id', t.id);
        if (error) return fail(error);
        if (logAction) await supabase.from('task_log').insert({ task_id: t.id, who: logAction.who, action: logAction.action });
      }
      setTasks(prev => prev.map(x => x.id === t.id
        ? { ...x, ...patch, log: logAction ? [...(x.log || []), { ...logAction, time: logTimeNow() }] : x.log }
        : x));
      return true;
    },

    async addTaskLog(t, action, who = currentUser.name) {
      if (!DEMO) {
        const { error } = await supabase.from('task_log').insert({ task_id: t.id, who, action });
        if (error) return fail(error);
      }
      setTasks(prev => prev.map(x => x.id === t.id ? { ...x, log: [...(x.log || []), { who, action, time: logTimeNow() }] } : x));
      return true;
    },

    async addClient({ name, phone, instagram, note }) {
      const phone_norm = (phone || '').replace(/\D/g, '').slice(-10) || null;
      if (DEMO) {
        let created;
        setClients(prev => { created = { id: nextId(prev), name, phone, phone_norm, instagram, note, prices: [] }; return [...prev, created]; });
        return created;
      }
      try {
        const { data, error } = await supabase.from('clients').insert({ name, phone, phone_norm, instagram, note, created_by: currentUser.id }).select().single();
        if (error) throw error;
        const client = { ...data, prices: data.prices || [] };
        setClients(prev => [...prev, client]);
        return client;
      } catch (e) { return fail(e); }
    },

    async addCategory({ name, kind }) {
      if (DEMO) { setCategories(prev => [...prev, { id: nextId(prev), name, kind, sort: 99, is_active: true }]); return true; }
      try {
        const { data, error } = await supabase.from('categories').insert({ name, kind, sort: 99 }).select().single();
        if (error) throw error;
        setCategories(prev => [...prev, data]);
        return true;
      } catch (e) { return fail(e); }
    },

    async addBank(name) {
      if (DEMO) { setBanks(prev => [...prev, { id: nextId(prev), name, sort: 99, is_active: true }]); return true; }
      try {
        const { data, error } = await supabase.from('banks').insert({ name, sort: 99 }).select().single();
        if (error) throw error;
        setBanks(prev => [...prev, data]);
        return true;
      } catch (e) { return fail(e); }
    },

    async saveQuickOps(list) {
      if (DEMO) { setQuickOps(list); return true; }
      try {
        const { error } = await supabase.from('app_settings').upsert({ key: 'quick_ops', value: list });
        if (error) throw error;
        setQuickOps(list);
        return true;
      } catch (e) { return fail(e); }
    },

    async updateTransaction(t, patch) {
      // Дифф для истории: кто и что поменял
      const dd = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
      const catN = (id) => categories.find(c => c.id === id)?.name || '—';
      const mL = (k) => PAYMENT_METHODS.find(m => m.key === k)?.label || k;
      const diffs = [];
      if ('op_date' in patch && patch.op_date !== t.op_date) diffs.push(`дата ${dd(t.op_date)} → ${dd(patch.op_date)}`);
      if ('amount' in patch && +patch.amount !== +t.amount) diffs.push(`сумма ${t.amount} → ${patch.amount} ₽`);
      if ('category_id' in patch && patch.category_id !== t.category_id) diffs.push(`категория ${catN(t.category_id)} → ${catN(patch.category_id)}`);
      if ('payment_method' in patch && patch.payment_method !== t.payment_method) diffs.push(`способ ${mL(t.payment_method)} → ${mL(patch.payment_method)}`);
      if ('comment' in patch && (patch.comment || '') !== (t.comment || '')) diffs.push('комментарий');
      const action = diffs.length ? `исправила: ${diffs.join(', ')}` : 'исправила запись';
      const logEntry = { who: currentUser.name, action, time: logTimeNow() };

      if (!DEMO) {
        const { error } = await supabase.from('transactions').update(patch).eq('id', t.id);
        if (error) return fail(error);
        await supabase.from('transaction_log').insert({ transaction_id: t.id, who: logEntry.who, action: logEntry.action });
      }
      setTransactions(prev => prev.map(x => x.id === t.id ? { ...x, ...patch, log: [...(x.log || []), logEntry] } : x));
      return true;
    },

    async removeTransaction(t) {
      if (!DEMO) {
        const { error } = await supabase.from('transactions').delete().eq('id', t.id);
        if (error) return fail(error);
      }
      setTransactions(prev => prev.filter(x => x.id !== t.id));
      return true;
    },

    async removeContractorTask(t) {
      if (!DEMO) {
        const { error } = await supabase.from('contractor_tasks').delete().eq('id', t.id);
        if (error) return fail(error);
      }
      setContractorTasks(prev => prev.filter(x => x.id !== t.id));
      return true;
    },

    async updateContractorTask(t, patch) {
      if (!DEMO) {
        const { error } = await supabase.from('contractor_tasks').update(patch).eq('id', t.id);
        if (error) return fail(error);
      }
      setContractorTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x));
      return true;
    },

    // Удаление = архивация (is_active=false): история операций по категории/карте сохраняется
    async removeCategory(c) {
      if (!DEMO) {
        const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', c.id);
        if (error) return fail(error);
      }
      setCategories(prev => prev.filter(x => x.id !== c.id));
      return true;
    },

    async removeBank(b) {
      if (!DEMO) {
        const { error } = await supabase.from('banks').update({ is_active: false }).eq('id', b.id);
        if (error) return fail(error);
      }
      setBanks(prev => prev.filter(x => x.id !== b.id));
      return true;
    },

    async updateClientPrices(c, prices) {
      if (!DEMO) {
        const { error } = await supabase.from('clients').update({ prices }).eq('id', c.id);
        if (error) return fail(error);
      }
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, prices } : x));
      return true;
    },

    async addContractor({ name, service, phone }) {
      if (DEMO) { setContractors(prev => [...prev, { id: nextId(prev), name, service, phone }]); return true; }
      try {
        const { data, error } = await supabase.from('contractors').insert({ name, service, phone }).select().single();
        if (error) throw error;
        setContractors(prev => [...prev, data]);
        return true;
      } catch (e) { return fail(e); }
    },

    async addContractorTask(payload) {
      if (DEMO) { setContractorTasks(prev => [...prev, { id: nextId(prev), stage: 'Новая', ...payload }]); return true; }
      try {
        const { data, error } = await supabase.from('contractor_tasks').insert({ ...payload, created_by: currentUser.id }).select().single();
        if (error) throw error;
        setContractorTasks(prev => [...prev, { ...data, amount: data.amount == null ? null : +data.amount }]);
        return true;
      } catch (e) { return fail(e); }
    },

    async setContractorTaskStage(t, stage) {
      if (!DEMO) {
        const { error } = await supabase.from('contractor_tasks').update({ stage }).eq('id', t.id);
        if (error) return fail(error);
      }
      setContractorTasks(prev => prev.map(x => x.id === t.id ? { ...x, stage } : x));
      return true;
    },

    async addDeposit({ name, total }) {
      if (DEMO) { setDeposits(prev => [...prev, { id: nextId(prev), name, total, created_at: db.today, uses: [] }]); return true; }
      try {
        const { data, error } = await supabase.from('deposits').insert({ name, total, created_by: currentUser.id }).select().single();
        if (error) throw error;
        setDeposits(prev => [...prev, { ...data, total: +data.total, created_at: (data.created_at || '').slice(0, 10), uses: [] }]);
        return true;
      } catch (e) { return fail(e); }
    },

    async topUpDeposit(d, add) {
      if (!DEMO) {
        const { error } = await supabase.from('deposits').update({ total: d.total + add }).eq('id', d.id);
        if (error) return fail(error);
      }
      setDeposits(prev => prev.map(x => x.id === d.id ? { ...x, total: x.total + add } : x));
      return true;
    },

    async addDepositUse(d, { what, amount, taskId }) {
      const use = { date: db.today, what, amount, task_id: taskId || null };
      if (!DEMO) {
        const { error } = await supabase.from('deposit_uses').insert({ deposit_id: d.id, use_date: use.date, what, amount, task_id: use.task_id, created_by: currentUser.id });
        if (error) return fail(error);
      }
      setDeposits(prev => prev.map(x => x.id === d.id ? { ...x, uses: [...x.uses, use] } : x));
      if (taskId) {
        const task = tasks.find(t => t.id === taskId);
        await db.addTransactions([{ type: 'income', category_id: null, amount, payment_method: 'deposit', bank_id: null, task_id: taskId, client_id: task?.client_id || null, deposit_id: d.id, comment: `с депозита «${d.name}»` }]);
      }
      return true;
    },

    async addDebtor(name) {
      if (DEMO) { setManualDebts(prev => [...prev, { id: nextId(prev), name, entries: [] }]); return true; }
      try {
        const { data, error } = await supabase.from('manual_debts').insert({ name }).select().single();
        if (error) throw error;
        setManualDebts(prev => [...prev, { ...data, entries: [] }]);
        return true;
      } catch (e) { return fail(e); }
    },

    async addDebtEntry(d, { what, amount }) {
      if (!DEMO) {
        const { error } = await supabase.from('manual_debt_entries').insert({ debt_id: d.id, entry_date: db.today, what, amount, created_by: currentUser.id });
        if (error) return fail(error);
      }
      setManualDebts(prev => prev.map(x => x.id === d.id ? { ...x, entries: [...x.entries, { date: db.today, what, amount }] } : x));
      return true;
    },

    async renameDebtor(d, name) {
      if (!DEMO) {
        const { error } = await supabase.from('manual_debts').update({ name }).eq('id', d.id);
        if (error) return fail(error);
      }
      setManualDebts(prev => prev.map(x => x.id === d.id ? { ...x, name } : x));
      return true;
    },

    async renameDeposit(d, name) {
      if (!DEMO) {
        const { error } = await supabase.from('deposits').update({ name }).eq('id', d.id);
        if (error) return fail(error);
      }
      setDeposits(prev => prev.map(x => x.id === d.id ? { ...x, name } : x));
      return true;
    },

    async removeDeposit(d) {
      if (!DEMO) {
        const { error } = await supabase.from('deposits').delete().eq('id', d.id);
        if (error) return fail(error);
      }
      setDeposits(prev => prev.filter(x => x.id !== d.id));
      return true;
    },

    async removeDebtor(d) {
      if (!DEMO) {
        const { error } = await supabase.from('manual_debts').delete().eq('id', d.id);
        if (error) return fail(error);
      }
      setManualDebts(prev => prev.filter(x => x.id !== d.id));
      return true;
    },

    async addSupplyItem(text) {
      if (DEMO) { setSupply(prev => [...prev, { id: nextId(prev), text, author: currentUser.name, date: db.today, bought: false }]); return true; }
      try {
        const { data, error } = await supabase.from('supply_items').insert({ text, created_by: currentUser.id }).select().single();
        if (error) throw error;
        setSupply(prev => [...prev, { id: data.id, text: data.text, bought: data.bought, author: currentUser.name, date: (data.created_at || '').slice(0, 10) }]);
        return true;
      } catch (e) { return fail(e); }
    },

    async toggleSupplyItem(s) {
      if (!DEMO) {
        const { error } = await supabase.from('supply_items').update({ bought: !s.bought }).eq('id', s.id);
        if (error) return fail(error);
      }
      setSupply(prev => prev.map(x => x.id === s.id ? { ...x, bought: !x.bought } : x));
      return true;
    },

    async removeSupplyItem(s) {
      if (!DEMO) {
        const { error } = await supabase.from('supply_items').delete().eq('id', s.id);
        if (error) return fail(error);
      }
      setSupply(prev => prev.filter(x => x.id !== s.id));
      return true;
    },

    async addUser({ name, login, password }) {
      if (DEMO) {
        setUsers(prev => [...prev.filter(u => u.role === 'employee'), { id: 'u' + (prev.length + 1), name, role: 'employee', login, password }, ...prev.filter(u => u.role === 'owner')]);
        return true;
      }
      try {
        const { error } = await supabase.rpc('admin_create_user', { p_name: name, p_login: login, p_password: password });
        if (error) throw error;
        await loadAll();
        return true;
      } catch (e) { return fail(e); }
    },

    async updateUser(u, { name, login, password, is_active }) {
      if (DEMO) {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, name: name ?? x.name, login: login ?? x.login, ...(password ? { password } : {}), is_active: is_active ?? x.is_active } : x));
        if (name && name !== u.name) setTasks(prev => prev.map(t => t.assignee === u.name ? { ...t, assignee: name } : t));
        return true;
      }
      try {
        const { error } = await supabase.rpc('admin_update_user', {
          p_id: u.id, p_name: name ?? null, p_login: login ?? null, p_password: password || null, p_is_active: is_active ?? null,
        });
        if (error) throw error;
        await loadAll();
        return true;
      } catch (e) { return fail(e); }
    },
  };

  const visibleTabs = TABS.filter(t => t.roles.includes(userRole));
  const sectionProps = {
    supabase, currentUser, userRole, isOwner, showToast, onUpdate: loadAll, loadAllRows, db,
    clients, tasks, categories, banks, transactions, contractors, contractorTasks, deposits,
    manualDebts, supply, dayClosures, quickOps, CONTRACTOR_STAGES,
    PEOPLE_COLUMNS: peopleColumns, users, demoBankRows: DEMO ? DEMO_BANK_ROWS : [],
    loading, UI, STAGES, PAYMENT_METHODS, DEMO, isMobile,
  };

  return (
    <div style={{ minHeight: '100vh', padding: isMobile ? '12px 12px 32px' : '20px 28px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 28, flexWrap: 'wrap' }}>
        {!isMobile && (
          <div style={{ background: UI.card, borderRadius: 999, padding: '10px 22px', fontWeight: 800, boxShadow: UI.shadow, letterSpacing: 0.5 }}>
            <I n="printer" size={17} /> ПЕЧАТНИК
          </div>
        )}
        <nav style={{
          display: 'flex', gap: 4, background: UI.card, borderRadius: 999, padding: 6, boxShadow: UI.shadow,
          overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch',
          order: isMobile ? 2 : 0, width: isMobile ? '100%' : 'auto',
        }}>
          {visibleTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 14, fontWeight: 600,
              background: tab === t.key ? UI.dark : 'transparent',
              color: tab === t.key ? '#fff' : UI.dark,
              transition: 'background .15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{t.label}</button>
          ))}
        </nav>
        <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isMobile && <span style={{ fontWeight: 800, fontSize: 15, marginRight: 'auto' }}><I n="printer" size={15} /> ПЕЧАТНИК</span>}
          {/* Кристи работает и как сотрудница: переключение режима её же аккаунта */}
          {isOwnerAccount && (
            <span style={{ display: 'flex', background: UI.card, borderRadius: 999, padding: 4, boxShadow: UI.shadow }}>
              {[['owner', 'crown'], ['employee', 'wrench']].map(([m, ic]) => (
                <button key={m} onClick={() => workMode !== m && toggleWorkMode()} title={m === 'owner' ? 'Режим владельца' : 'Режим сотрудника'} style={{
                  border: 'none', borderRadius: 999, padding: isMobile ? '6px 10px' : '6px 14px', fontSize: 12.5, fontWeight: 700,
                  background: workMode === m ? UI.dark : 'transparent', color: workMode === m ? '#fff' : UI.dark,
                }}><I n={ic} size={13} />{!isMobile && ` ${m === 'owner' ? 'владелец' : 'сотрудник'}`}</button>
              ))}
            </span>
          )}
          {DEMO && (
            <button onClick={demoSwitchRole} title="Демо: зайти под другим аккаунтом" style={{
              border: 'none', background: UI.accent, borderRadius: 999, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, boxShadow: UI.shadow,
            }}>
              <I n="eye" size={13} /> {isOwnerAccount ? 'Кристи' : currentUser?.name}
            </button>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, background: UI.card, borderRadius: 999, padding: isMobile ? 4 : '7px 14px 7px 7px', boxShadow: UI.shadow, fontSize: 13 }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: UI.dark, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {(currentUser?.name || '?')[0]}
            </span>
            {!isMobile && <>{currentUser?.name} · {ROLES[userRole]}</>}
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
        {tab === 'supply' && <Supply {...sectionProps} />}
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
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    // Вход по логину: служебная почта строится сама (login@crm.local)
    const email = login.includes('@') ? login.trim() : `${login.trim().toLowerCase()}@crm.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) showToast('Не удалось войти: проверь логин и пароль', 'error');
  };

  const inputStyle = {
    width: '100%', padding: '14px 18px', borderRadius: 16, border: `1px solid ${UI.line}`,
    fontSize: 16, background: UI.soft, outline: 'none',
  };

  return (
    <Center>
      <form onSubmit={doLogin} style={{ background: UI.card, borderRadius: UI.radius, boxShadow: UI.shadow, padding: 36, width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}><I n="printer" size={24} /> ПЕЧАТНИК</div>
        <input style={inputStyle} placeholder="Логин" autoCapitalize="none" value={login} onChange={e => setLogin(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
        <button disabled={busy} style={{
          border: 'none', borderRadius: 999, padding: '14px 18px', fontSize: 15, fontWeight: 700,
          background: UI.dark, color: '#fff', opacity: busy ? 0.6 : 1,
        }}>{busy ? 'Вхожу…' : 'Войти'}</button>
      </form>
    </Center>
  );
}
