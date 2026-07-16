// Единый набор иконок CRM — тонкие линейные (stroke), в одном стиле, наследуют цвет текста.
// Использование: <I n="search" /> или <I n="lock" size={16} />
const PATHS = {
  printer: <><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  alert: <><path d="M12 3 2.5 19.5h19L12 3z" /><path d="M12 10v4" /><path d="M12 17.2v.3" /></>,
  income: <><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 10v.1M18 14v.1" /></>,
  expense: <><path d="m2.5 7 8 8 4.5-4.5 6.5 6.5" /><path d="M16 17h5.5v-5.5" /></>,
  factory: <><path d="M3 21V9.5l5.5 3.5v-3.5l5.5 3.5V5H21v16H3z" /></>,
  landmark: <><path d="m12 3 9 5.5H3L12 3z" /><path d="M5.5 8.5V19M10 8.5V19M14 8.5V19M18.5 8.5V19" /><path d="M3 21h18" /></>,
  lock: <><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V7.8a4 4 0 0 1 8 0V11" /></>,
  box: <><path d="m12 2.8 8.5 4.4v9.6L12 21.2l-8.5-4.4V7.2L12 2.8z" /><path d="m3.5 7.2 8.5 4.4 8.5-4.4" /><path d="M12 11.6v9.6" /></>,
  zap: <><path d="M13 2.5 4.5 14H10l-1 7.5L17.5 10H12l1-7.5z" /></>,
  crown: <><path d="m3.5 8 4.3 3.8L12 5.3l4.2 6.5L20.5 8l-1.8 10.5H5.3L3.5 8z" /></>,
  wrench: <><path d="M14.5 6.5a4.6 4.6 0 0 0-6.1 6.1L3 18l3 3 5.4-5.4a4.6 4.6 0 0 0 6.1-6.1L14 13l-3-3 3.5-3.5z" /></>,
  eye: <><path d="M2 12s3.6-6.2 10-6.2S22 12 22 12s-3.6 6.2-10 6.2S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  pencil: <><path d="m17 3.5 3.5 3.5L8 19.5 3.5 20.5 4.5 16 17 3.5z" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 19.8a6.3 6.3 0 0 1 12.4 0" /><path d="M15.8 5a3.4 3.4 0 0 1 0 6.6" /><path d="M17.6 13.7a6.3 6.3 0 0 1 3.8 5.8" /></>,
  repeat: <><path d="m17 2.5 3.7 3.7L17 9.9" /><path d="M3.5 11.5V9.7a3.5 3.5 0 0 1 3.5-3.5h13.7" /><path d="m7 21.5-3.7-3.7L7 14.1" /><path d="M20.5 12.5v1.8a3.5 3.5 0 0 1-3.5 3.5H3.3" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></>,
  moon: <><path d="M20 13.5A8.3 8.3 0 0 1 10.5 4a8.3 8.3 0 1 0 9.5 9.5z" /></>,
  cart: <><circle cx="9.5" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M3 4h2.2L7.5 16h11L21 8H6.3" /></>,
  percent: <><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.4" /><circle cx="17" cy="17" r="2.4" /></>,
  link: <><path d="M10 14.5a4.6 4.6 0 0 0 6.5 0l3-3a4.6 4.6 0 0 0-6.5-6.5L11.6 6.4" /><path d="M14 9.5a4.6 4.6 0 0 0-6.5 0l-3 3a4.6 4.6 0 0 0 6.5 6.5l1.4-1.4" /></>,
  note: <><rect x="4.5" y="3" width="15" height="18" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
  chart: <><path d="M3 21h18" /><path d="M7 17v-5M12 17V7M17 17v-8" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.5a7 7 0 0 1 14 0" /></>,
  wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15V7" /><path d="M16 13h.5" /></>,
  send: <><path d="m4.5 12 15-7-4 14-4.5-5L4.5 12z" /><path d="m11 14 8.5-9" /></>,
};

export default function I({ n, size = 15, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ verticalAlign: '-2px', flexShrink: 0, ...style }}>
      {PATHS[n] || null}
    </svg>
  );
}
