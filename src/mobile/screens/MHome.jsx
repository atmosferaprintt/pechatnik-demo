// «Мой день» на телефоне — первый экран после входа.
// У владельца: касса, долги, что не закрыто, что горит. У менеджера: только своё —
// мои задачи, мои сроки, что я записала (чужих итогов сотрудница не видит, как и на компьютере).
import I from '../../Icon.jsx';
import { localDate } from '../../dates.js';
import { debtOfTask } from '../../taskMoney.js';
import { dayMoney } from '../../dayMoney.js';
import { M, Card, Stat, Btn, Chip, Row, Empty, money, fmt } from '../ui.jsx';

const TODAY = localDate();
const TOMORROW = localDate(new Date(Date.now() + 86400000));
const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_D = (d) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;

export default function MHome(props) {
  return props.isOwner ? <OwnerHome {...props} /> : <EmployeeHome {...props} />;
}

function Title({ children, sub }) {
  return (
    <div style={{ margin: '6px 0 14px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>{children}</div>
      {sub && <div style={{ color: M.muted, fontSize: 13, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Плашка-предупреждение во всю ширину — самое важное всегда сверху экрана
function Alarm({ icon, children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'block', width: '100%', textAlign: 'left', border: danger ? `1.5px solid ${M.danger}` : 'none',
      background: danger ? 'rgba(192,57,43,.08)' : M.dark, color: danger ? M.danger : '#fff',
      borderRadius: 18, padding: '13px 16px', fontSize: 13.5, fontWeight: 700, marginBottom: 10, minHeight: M.tap,
    }}>
      <I n={icon} size={14} /> {children}
    </button>
  );
}

// ---------- Владелец ----------
function OwnerHome({ transactions, tasks, clients, categories, dayClosures, demoBankRows = [], db, onTab }) {
  const { income, expense, bigTotal, cashCalc, closure } = dayMoney({
    transactions, categories, dayClosures, date: db.today,
  });

  const debtors = tasks
    .map(t => ({ ...t, debt: debtOfTask(transactions, t) }))
    .filter(t => t.debt > 0)
    .sort((a, b) => b.debt - a.debt);
  const totalDebt = debtors.reduce((s, t) => s + t.debt, 0);

  const burning = tasks.filter(t => !t.done && t.deadline && t.deadline <= TOMORROW);
  const unmatched = demoBankRows.filter(r => !r.matched);
  const yesterdayClosed = dayClosures.some(c => c.date === db.yesterday);
  const clientName = (id) => clients.find(c => c.id === id)?.name?.split('·')[0]?.trim() || '—';

  return (
    <div>
      <Title sub={`${RU_D(db.today)}${closure ? ' · смена закрыта' : ''}`}>Мой день</Title>

      {!yesterdayClosed && (
        <Alarm icon="moon" onClick={() => onTab('finance')}>
          Вчера ({dm(db.yesterday)}) день не закрыт — <span style={{ color: M.accent }}>сделать сверку →</span>
        </Alarm>
      )}
      {unmatched.map(r => (
        <Alarm key={r.id} icon="alert" danger onClick={() => onTab('finance')}>
          {money(r.amount)} пришло на счёт, но не записано · {r.description.split('—')[0]}
        </Alarm>
      ))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <Stat label="Доходы сегодня" value={money(income)} />
        <Stat label="Расходы дня" value={money(expense)} sub={bigTotal ? `+ крупные ${money(bigTotal)}` : null} />
        <Stat label="В кассе расчётно" value={money(cashCalc)} dark />
        <Stat label="Долги клиентов" value={money(totalDebt)} accent={totalDebt > 0} onClick={() => onTab('tasks')} />
      </div>

      <Card title={`Долги по задачам · ${debtors.length}`}
        right={debtors.length > 5 ? <span style={{ color: M.muted, fontSize: 12.5 }} onClick={() => onTab('tasks')}>все →</span> : null}>
        {debtors.slice(0, 5).map(t => (
          <Row key={t.id}>
            <span style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{clientName(t.client_id)} · у {t.assignee}</div>
            </span>
            <Chip tone="danger" style={{ marginLeft: 'auto', flexShrink: 0 }}>{money(t.debt)}</Chip>
          </Row>
        ))}
        {!debtors.length && <Empty icon="wallet" text="Долгов нет" />}
      </Card>

      <Card title={`Горящие сроки · ${burning.length}`}>
        {burning.slice(0, 6).map(t => {
          const overdue = t.deadline < TODAY;
          return (
            <Row key={t.id} onClick={() => onTab('tasks')}>
              <span style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ color: M.muted, fontSize: 12 }}>{t.assignee}</div>
              </span>
              <Chip tone={overdue ? 'danger' : 'accent'} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <I n="clock" size={11} /> {overdue ? 'просрочено' : dm(t.deadline)}
              </Chip>
            </Row>
          );
        })}
        {!burning.length && <Empty icon="check" text="Всё в графике" />}
      </Card>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Btn kind="accent" wide onClick={() => onTab('finance')}><I n="plus" size={15} /> Операция</Btn>
        <Btn kind="dark" wide onClick={() => onTab('finance')}>Сверка дня</Btn>
      </div>
    </div>
  );
}

// ---------- Менеджер ----------
function EmployeeHome({ transactions, tasks, currentUser, dayClosures, db, onTab }) {
  const myTasks = tasks.filter(t => !t.done && t.assignee === currentUser.name);
  const myBurning = myTasks.filter(t => t.deadline && t.deadline <= TOMORROW && t.stage !== 'Готово');
  const myTx = transactions.filter(t => t.op_date === db.today && t.created_by === currentUser.name);
  const myIncome = myTx.filter(t => t.type === 'income' && t.payment_method !== 'deposit').reduce((s, t) => s + t.amount, 0);
  const shiftClosed = dayClosures.some(c => c.date === db.today);
  const yesterdayClosed = dayClosures.some(c => c.date === db.yesterday);

  return (
    <div>
      <Title sub={`${RU_D(db.today)} · ${currentUser.name}`}>Мой день</Title>

      {!yesterdayClosed && (
        <Alarm icon="moon" onClick={() => onTab('finance')}>
          Вчерашняя смена не закрыта — <span style={{ color: M.accent }}>закрыть →</span>
        </Alarm>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <Stat label="Мои задачи" value={String(myTasks.length)} onClick={() => onTab('tasks')} />
        <Stat label="Горящие сроки" value={String(myBurning.length)} dark accent={myBurning.length > 0} />
        <Stat label={`Я записала · ${myTx.length} оп.`} value={money(myIncome)} />
        <Stat label="Смена" value={shiftClosed ? 'закрыта' : 'открыта'} sub={shiftClosed ? null : 'закрыть вечером'} onClick={() => onTab('finance')} />
      </div>

      <Card title={`Мои горящие · ${myBurning.length}`}>
        {myBurning.map(t => (
          <Row key={t.id} onClick={() => onTab('tasks')}>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
            <Chip tone={t.deadline < TODAY ? 'danger' : 'accent'} style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <I n="clock" size={11} /> {t.deadline < TODAY ? 'просрочено' : dm(t.deadline)}
            </Chip>
          </Row>
        ))}
        {!myBurning.length && <Empty icon="check" text="Всё в графике" />}
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <Btn kind="accent" wide onClick={() => onTab('finance')}><I n="plus" size={15} /> Записать приход</Btn>
        <Btn wide onClick={() => onTab('tasks')}>Открыть мои задачи</Btn>
        {!shiftClosed && <Btn kind="dark" wide onClick={() => onTab('finance')}>Закрыть смену</Btn>}
      </div>

      {/* Сколько всего оплат за день по типографии сотрудница не видит — только свои записи */}
      <div style={{ color: M.muted, fontSize: 12, textAlign: 'center', paddingBottom: 8 }}>
        Итоги по типографии видит владелец · {fmt(myTx.length)} моих записей сегодня
      </div>
    </div>
  );
}
