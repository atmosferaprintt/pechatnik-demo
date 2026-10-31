// «Депозиты и долги» на телефоне.
// Депозит: внесли — расходуют частями. Должник по мелочи: взяла (−) — оплатила (+).
// Списки карточками, всё содержимое карточки — в шите снизу: на телефоне не хватает ширины
// на инлайн-формы, которыми это сделано на компьютере.
// Правила и права те же: списание с привязанной задачей гасит долг задачи (db.addDepositUse),
// поступления — строками с датой (026), в Финансы не пишутся; свою строку правит автор, чужую — только Кристи.
import { useState } from 'react';
import I from '../../Icon.jsx';
import { taskParts, partsTotal, spreadParts } from '../../depositParts.js';
import { M, Card, Btn, Chip, Sheet, Field, Empty, inputStyle, fmt } from '../ui.jsx';

const dm = (d) => d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '—';
const spent = (d) => d.uses.reduce((s, u) => s + u.amount, 0);
const left = (d) => d.total - spent(d);
const mdBalance = (d) => d.entries.reduce((s, e) => s + e.amount, 0);
// История депозита по датам: взнос при заведении, поступления (+), списания (−) — как на компьютере
const history = (d) => [
  { kind: 'initial', row: { id: 'initial', date: d.created_at, what: 'внесено при заведении', amount: d.initial, created_by: d.created_by } },
  ...d.topups.map(row => ({ kind: 'topup', row })),
  ...d.uses.map(row => ({ kind: 'use', row })),
].sort((a, b) => (a.row.date || '').localeCompare(b.row.date || ''));

export default function MDeposits(props) {
  const { deposits, manualDebts, db, showToast } = props;
  const [query, setQuery] = useState('');
  const [openDep, setOpenDep] = useState(null);     // id депозита
  const [openDebtor, setOpenDebtor] = useState(null); // id должника
  const [showAddDep, setShowAddDep] = useState(false);
  const [showAddDebtor, setShowAddDebtor] = useState(false);

  const filtered = deposits.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  const debtors = manualDebts.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  const mdTotal = manualDebts.reduce((s, d) => s + Math.min(0, mdBalance(d)), 0);

  const dep = openDep ? deposits.find(d => d.id === openDep) : null;
  const debtor = openDebtor ? manualDebts.find(d => d.id === openDebtor) : null;

  return (
    <div>
      <div style={{ margin: '6px 0 14px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Депозиты и долги</div>
        <div style={{ color: M.muted, fontSize: 13, marginTop: 2 }}>внесли — расходуют · взяли — должны</div>
      </div>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по имени"
          style={{ ...inputStyle, borderRadius: 999, paddingLeft: 42 }} />
        <I n="search" size={15} style={{ position: 'absolute', left: 16, top: 15, color: M.muted }} />
      </div>

      <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 8px' }}>
        <I n="landmark" size={13} /> Депозиты
      </div>

      {filtered.map(d => {
        const l = left(d);
        const pct = d.total ? Math.max(0, Math.min(100, (l / d.total) * 100)) : 0;
        const counts = [d.topups.length > 0 && `поступлений ${d.topups.length}`, d.uses.length > 0 && `списаний ${d.uses.length}`].filter(Boolean).join(' · ');
        return (
          <Card key={d.id} onClick={() => setOpenDep(d.id)} style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <span style={{ color: M.muted, fontSize: 12, marginLeft: 'auto', flexShrink: 0 }}>с {dm(d.created_at)}</span>
              <I n="chevronRight" size={15} style={{ color: M.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, rowGap: 2, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 23, fontWeight: 800, color: l <= 0 ? M.danger : M.dark }}>{fmt(l)} ₽</span>
              <span style={{ color: M.muted, fontSize: 12.5 }}>из {fmt(d.total)} ₽</span>
              {counts && <span style={{ marginLeft: 'auto', color: M.muted, fontSize: 12, whiteSpace: 'nowrap' }}>{counts}</span>}
            </div>
            <div style={{ height: 14, background: M.soft, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? M.danger : M.accent, borderRadius: 999 }} />
            </div>
          </Card>
        );
      })}
      {!filtered.length && <Empty icon="landmark" text={query ? `Ничего не нашла по «${query}»` : 'Депозитов пока нет'} />}

      <Btn kind="dark" wide onClick={() => setShowAddDep(true)} style={{ marginBottom: 22 }}>
        <I n="plus" size={14} /> Новый депозит
      </Btn>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 4px' }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}><I n="note" size={13} /> Должники по мелочи</span>
        {mdTotal < 0 && <Chip tone="danger">всего {fmt(-mdTotal)} ₽</Chip>}
      </div>
      <div style={{ color: M.muted, fontSize: 12.5, marginBottom: 10 }}>Берут по мелочи (−), потом оплачивают разом (+).</div>

      <Card style={{ padding: '4px 16px' }}>
        {debtors.map((d, i) => {
          const bal = mdBalance(d);
          return (
            <div key={d.id} onClick={() => setOpenDebtor(d.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '13px 0', minHeight: M.tap,
              borderBottom: i === debtors.length - 1 ? 'none' : `1px solid ${M.line}`,
            }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ color: M.muted, fontSize: 12 }}>записей: {d.entries.length}</div>
              </span>
              {/* Оплатили больше, чем взяли — плюс суммой (просьба Кристи 2026-10-31) */}
              {bal < 0 ? <Chip tone="danger">долг {fmt(-bal)} ₽</Chip> : <Chip tone="accent">{bal > 0 ? `+${fmt(bal)} ₽` : '✓ без долга'}</Chip>}
              <I n="chevronRight" size={15} style={{ color: M.muted, flexShrink: 0 }} />
            </div>
          );
        })}
        {!debtors.length && <Empty icon="note" text="Ручных должников нет" />}
      </Card>

      <Btn wide onClick={() => setShowAddDebtor(true)} style={{ marginBottom: 8 }}>
        <I n="plus" size={14} /> Добавить человека
      </Btn>

      {showAddDep && <AddDepositSheet db={db} showToast={showToast} onClose={() => setShowAddDep(false)} />}
      {showAddDebtor && <AddDebtorSheet db={db} showToast={showToast} onClose={() => setShowAddDebtor(false)} />}
      {dep && <DepositSheet {...props} d={dep} onClose={() => setOpenDep(null)} />}
      {debtor && <DebtorSheet {...props} d={debtor} onClose={() => setOpenDebtor(null)} />}
    </div>
  );
}

// ---------- Правка строки (списание депозита / запись должника) ----------
// Своя строка правится автором, любая — Кристи (как на компьютере).
// amountOnly — взнос при заведении: правится только сумма, дата — день заведения депозита.
function RowEdit({ row, hint, whatHint = 'Что', amountOnly, onSave, onCancel }) {
  const [what, setWhat] = useState(row.what || '');
  const [amount, setAmount] = useState(String(row.amount));
  const [date, setDate] = useState(row.date);
  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${M.line}` }}>
      {amountOnly ? (
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>{row.what}</div>
      ) : (
        <>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
          <input value={what} onChange={e => setWhat(e.target.value)} placeholder={whatHint} style={{ ...inputStyle, marginBottom: 8 }} />
        </>
      )}
      <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder={hint} style={{ ...inputStyle, marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="dark" style={{ flex: 1 }} onClick={() => onSave({ what: what.trim(), amount: +amount, date })}>Сохранить</Btn>
        <Btn onClick={onCancel}>Отмена</Btn>
      </div>
    </div>
  );
}

// ---------- Карточка депозита ----------
function DepositSheet({ d, tasks, db, showToast, currentUser, isOwnerAccount, onClose }) {
  const [mode, setMode] = useState(null); // 'use' | 'topup' | 'rename'
  const [useWhat, setUseWhat] = useState('');
  const [useAmount, setUseAmount] = useState('');
  const [useTaskId, setUseTaskId] = useState('');
  const [useSplit, setUseSplit] = useState(true); // расписывать списание по составу задачи
  const [topUpSum, setTopUpSum] = useState('');
  const [topUpWhat, setTopUpWhat] = useState('');
  const [topUpDate, setTopUpDate] = useState(db.today);
  const [isSavingTopUp, setIsSavingTopUp] = useState(false); // плохая связь + двойное нажатие = двойное поступление
  const [newName, setNewName] = useState(d.name);
  const [editKey, setEditKey] = useState(null); // `${kind}-${id}` строки истории в правке

  const l = left(d);
  const pct = d.total ? Math.max(0, Math.min(100, (l / d.total) * 100)) : 0;
  const openTasks = tasks.filter(t => !t.done);
  const taskTitle = (id) => tasks.find(t => t.id === id)?.title;
  const canRow = (row) => isOwnerAccount || !row.created_by || row.created_by === currentUser?.name;

  // Состав выбранной задачи: списание можно расписать построчно (Печать / Дизайн …)
  const selTask = useTaskId ? tasks.find(t => t.id === +useTaskId) : null;
  const selParts = taskParts(selTask);
  const splitRows = (sum) => (useSplit && selParts.length > 1 ? spreadParts(selTask.parts, sum) : []);

  const addUse = () => {
    if (!useWhat.trim() && !useTaskId) { showToast('Укажи что заказали (или выбери задачу)', 'error'); return; }
    if (!+useAmount) { showToast('Укажи сумму', 'error'); return; }
    if (+useAmount > l) { showToast(`На депозите только ${fmt(l)} ₽`, 'error'); return; }
    const taskId = useTaskId ? +useTaskId : null;
    // Привязана задача → db создаст и оплату способом «Депозит»: долг задачи гаснет,
    // но в доходы дня и сверку это не попадает (деньги пришли при внесении депозита)
    const split = splitRows(+useAmount);
    db.addDepositUse(d, { what: useWhat.trim() || taskTitle(taskId) || '', amount: +useAmount, taskId, parts: split.length > 1 ? split : null });
    setUseWhat(''); setUseAmount(''); setUseTaskId(''); setUseSplit(true); setMode(null);
    showToast(taskId ? 'Списано, оплата привязана к задаче ✓' : 'Списание записано ✓');
  };

  const topUp = async () => {
    if (isSavingTopUp) return;
    if (!(+topUpSum > 0)) { showToast('Укажи сумму поступления', 'error'); return; }
    setIsSavingTopUp(true);
    const ok = await db.addDepositTopup(d, { what: topUpWhat.trim(), amount: +topUpSum, date: topUpDate || db.today });
    setIsSavingTopUp(false);
    if (!ok) return;
    showToast(`Поступление ${fmt(+topUpSum)} ₽ записано ✓`);
    setTopUpSum(''); setTopUpWhat(''); setMode(null);
  };

  const saveRow = async (kind, row, patch) => {
    if (!patch.amount || patch.amount <= 0) { showToast('Сумма некорректная', 'error'); return; }
    const ok = kind === 'use' ? await db.updateDepositUse(d, row, patch)
      : kind === 'topup' ? await db.updateDepositTopup(d, row, patch)
      : await db.setDepositInitial(d, patch.amount);
    if (ok) { setEditKey(null); showToast('Исправлено ✓'); }
  };

  const removeRow = async (kind, row) => {
    const ok = kind === 'topup' ? await db.removeDepositTopup(d, row) : await db.removeDepositUse(d, row);
    if (ok) showToast(kind === 'topup' ? 'Поступление удалено' : row.task_id ? 'Списание удалено (и его оплата с депозита)' : 'Списание удалено');
  };

  const rename = () => {
    if (!newName.trim()) { showToast('Имя не может быть пустым', 'error'); return; }
    db.renameDeposit(d, newName.trim());
    setMode(null);
    showToast('Имя исправлено ✓');
  };

  return (
    <Sheet open onClose={onClose} title={d.name}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: l <= 0 ? M.danger : M.dark }}>{fmt(l)} ₽</span>
          <span style={{ color: M.muted, fontSize: 13 }}>из {fmt(d.total)} ₽ · с {dm(d.created_at)}</span>
        </div>
        <div style={{ height: 14, background: M.soft, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct < 20 ? M.danger : M.accent, borderRadius: 999 }} />
        </div>
      </Card>

      {mode === 'use' ? (
        <Card>
          <Field label="Задача (необязательно)">
            <select style={inputStyle} value={useTaskId} onChange={e => {
              setUseTaskId(e.target.value);
              const t = e.target.value ? tasks.find(x => x.id === +e.target.value) : null;
              const total = partsTotal(taskParts(t));
              if (total && !useAmount) setUseAmount(String(total));
            }}>
              <option value="">Без привязки</option>
              {openTasks.map(t => <option key={t.id} value={t.id}>{t.title} · {fmt(t.amount)} ₽</option>)}
            </select>
          </Field>
          <Field label={useTaskId ? 'Комментарий' : 'Что заказали'}>
            <input style={inputStyle} value={useWhat} onChange={e => setUseWhat(e.target.value)} placeholder={useTaskId ? 'можно пусто' : 'бирки, визитки…'} />
          </Field>
          <Field label="Сумма, ₽">
            <input style={inputStyle} type="number" inputMode="numeric" value={useAmount} onChange={e => setUseAmount(e.target.value)} placeholder={`не больше ${fmt(l)}`} />
          </Field>
          {/* Состав задачи: списание ляжет отдельной строкой на каждую часть */}
          {selParts.length > 1 && (
            <div style={{ background: 'rgba(247,214,74,.18)', border: `1.5px solid ${M.accent}`, borderRadius: 16, padding: '12px 14px', marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 700, minHeight: 32 }}>
                <input type="checkbox" checked={useSplit} onChange={e => setUseSplit(e.target.checked)} style={{ width: 20, height: 20 }} />
                расписать по составу заказа
              </label>
              {useSplit && splitRows(+useAmount).map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, marginTop: 8 }}>
                  <span>{p.name}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800 }}>−{fmt(p.amount)} ₽</span>
                </div>
              ))}
              {useSplit && !+useAmount && <div style={{ color: M.muted, fontSize: 12.5, marginTop: 8 }}>Укажи сумму — распишу по частям</div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="dark" style={{ flex: 1 }} onClick={addUse}>Списать</Btn>
            <Btn onClick={() => setMode(null)}>Отмена</Btn>
          </div>
        </Card>
      ) : mode === 'topup' ? (
        <Card>
          <Field label="Сумма поступления, ₽">
            <input style={inputStyle} type="number" inputMode="numeric" value={topUpSum} onChange={e => setTopUpSum(e.target.value)} autoFocus />
          </Field>
          <Field label="Дата">
            <input style={inputStyle} type="date" value={topUpDate} onChange={e => setTopUpDate(e.target.value)} />
          </Field>
          <Field label="Комментарий">
            <input style={inputStyle} value={topUpWhat} onChange={e => setTopUpWhat(e.target.value)} placeholder="по счёту №…, можно пусто" />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="dark" style={{ flex: 1 }} onClick={topUp} disabled={isSavingTopUp}>Записать поступление</Btn>
            <Btn onClick={() => setMode(null)}>Отмена</Btn>
          </div>
        </Card>
      ) : mode === 'rename' ? (
        <Card>
          <Field label="Имя депозита">
            <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="dark" style={{ flex: 1 }} onClick={rename}>Сохранить</Btn>
            <Btn onClick={() => setMode(null)}>Отмена</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Btn kind="accent" style={{ flex: 1 }} onClick={() => setMode('use')}>− Списать заказ</Btn>
          <Btn style={{ flex: 1 }} onClick={() => { setTopUpSum(''); setTopUpWhat(''); setTopUpDate(db.today); setMode('topup'); }}>+ Поступление</Btn>
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 2px' }}>Поступления и списания</div>
      <Card style={{ padding: '4px 16px' }}>
        {history(d).map(({ kind, row }, i, all) => {
          const key = `${kind}-${row.id ?? i}`;
          if (editKey === key) {
            return (
              <RowEdit key={key} row={row} hint={kind === 'use' ? 'Сумма списания' : 'Сумма поступления'}
                whatHint={kind === 'topup' ? 'Комментарий' : 'Что'} amountOnly={kind === 'initial'}
                onSave={(patch) => saveRow(kind, row, patch)}
                onCancel={() => setEditKey(null)} />
            );
          }
          const isIn = kind !== 'use';
          return (
            <div key={key} style={{
              display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', fontSize: 13.5,
              borderBottom: i === all.length - 1 ? 'none' : `1px solid ${M.line}`,
            }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.what || (isIn ? 'поступление' : '—')}{row.task_id ? ' ' : ''}{row.task_id && <I n="link" size={11} style={{ color: M.muted }} />}
                </div>
                <div style={{ color: M.muted, fontSize: 12 }}>{dm(row.date)}{row.created_by ? ` · ${row.created_by}` : ''}</div>
              </span>
              {isIn
                ? <Chip tone="accent" style={{ fontSize: 13.5, fontWeight: 800, flexShrink: 0 }}>+{fmt(row.amount)} ₽</Chip>
                : <span style={{ fontWeight: 800, flexShrink: 0 }}>−{fmt(row.amount)} ₽</span>}
              {canRow(row) && (
                <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => setEditKey(key)} aria-label="Исправить" style={iconBtn}><I n="pencil" size={13} /></button>
                  {/* Взнос при заведении не удаляется — только правится сумма */}
                  {kind !== 'initial' && <button onClick={() => removeRow(kind, row)} aria-label="Удалить" style={iconBtn}><I n="x" size={13} /></button>}
                </span>
              )}
            </div>
          );
        })}
      </Card>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Btn onClick={() => { setNewName(d.name); setMode('rename'); }} style={{ flex: 1 }}>
          <I n="pencil" size={13} /> Имя
        </Btn>
        <Btn kind="danger" style={{ flex: 1 }} onClick={() => { db.removeDeposit(d); showToast(`Депозит «${d.name}» удалён`); onClose(); }}>
          Удалить депозит
        </Btn>
      </div>
    </Sheet>
  );
}

// ---------- Карточка должника ----------
function DebtorSheet({ d, db, showToast, currentUser, isOwnerAccount, onClose }) {
  const [form, setForm] = useState(null); // { sign: -1 | 1 }
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(d.name);
  const [editRow, setEditRow] = useState(null);

  const bal = mdBalance(d);
  const canRow = (row) => isOwnerAccount || !row.created_by || row.created_by === currentUser?.name;

  const addEntry = () => {
    if (!+amount) { showToast('Укажи сумму', 'error'); return; }
    db.addDebtEntry(d, { what: what.trim() || (form.sign > 0 ? 'оплата' : ''), amount: form.sign * Math.abs(+amount) });
    showToast(form.sign > 0 ? 'Оплата записана ✓' : 'Записано в долг ✓');
    setForm(null); setWhat(''); setAmount('');
  };

  return (
    <Sheet open onClose={onClose} title={d.name}>
      <Card style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: bal < 0 ? M.danger : M.ok }}>
          {bal < 0 ? `${fmt(-bal)} ₽` : bal > 0 ? `+${fmt(bal)} ₽` : 'без долга'}
        </div>
        <div style={{ color: M.muted, fontSize: 12.5, marginTop: 2 }}>{bal < 0 ? 'должна' : bal > 0 ? 'оплачено больше, чем взято' : 'всё оплачено'}</div>
      </Card>

      {form ? (
        <Card>
          <Field label={form.sign > 0 ? 'Комментарий' : 'Что взяла'}>
            <input style={inputStyle} value={what} onChange={e => setWhat(e.target.value)}
              placeholder={form.sign > 0 ? 'оплата' : 'ксерокс, фото…'} autoFocus />
          </Field>
          <Field label="Сумма, ₽">
            <input style={inputStyle} type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="dark" style={{ flex: 1 }} onClick={addEntry}>{form.sign > 0 ? 'Записать оплату' : 'Записать в долг'}</Btn>
            <Btn onClick={() => setForm(null)}>Отмена</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Btn kind="danger" style={{ flex: 1 }} onClick={() => { setForm({ sign: -1 }); setWhat(''); setAmount(''); }}>− взяла ещё</Btn>
          <Btn kind="accent" style={{ flex: 1 }} onClick={() => { setForm({ sign: 1 }); setWhat(''); setAmount(''); }}>+ оплатила</Btn>
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 14, margin: '4px 0 2px' }}>Записи</div>
      <Card style={{ padding: '4px 16px' }}>
        {d.entries.map((e, i) => editRow === e ? (
          <RowEdit key={i} row={e} hint="минус = взяла, плюс = оплатила"
            onSave={async (patch) => {
              if (!patch.amount) { showToast('Сумма некорректная', 'error'); return; }
              const ok = await db.updateDebtEntry(d, e, patch);
              if (ok) { setEditRow(null); showToast('Исправлено ✓'); }
            }}
            onCancel={() => setEditRow(null)} />
        ) : (
          <div key={i} style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: '11px 0', fontSize: 13.5,
            borderBottom: i === d.entries.length - 1 ? 'none' : `1px solid ${M.line}`,
          }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.what || '—'}</div>
              <div style={{ color: M.muted, fontSize: 12 }}>{dm(e.date)}{e.created_by ? ` · ${e.created_by}` : ''}</div>
            </span>
            <span style={{ fontWeight: 800, color: e.amount < 0 ? M.danger : M.dark, flexShrink: 0 }}>
              {e.amount < 0 ? '−' : '+'}{fmt(Math.abs(e.amount))} ₽
            </span>
            {canRow(e) && (
              <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => setEditRow(e)} aria-label="Исправить" style={iconBtn}><I n="pencil" size={13} /></button>
                <button onClick={async () => {
                  const ok = await db.removeDebtEntry(d, e);
                  if (ok) showToast('Запись удалена');
                }} aria-label="Удалить" style={iconBtn}><I n="x" size={13} /></button>
              </span>
            )}
          </div>
        ))}
        {!d.entries.length && <Empty icon="note" text="Записей пока нет" />}
      </Card>

      {renaming ? (
        <Card>
          <Field label="Имя">
            <input style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn kind="dark" style={{ flex: 1 }} onClick={() => {
              if (!newName.trim()) { showToast('Имя не может быть пустым', 'error'); return; }
              db.renameDebtor(d, newName.trim());
              setRenaming(false);
              showToast('Имя исправлено ✓');
            }}>Сохранить</Btn>
            <Btn onClick={() => setRenaming(false)}>Отмена</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Btn onClick={() => { setNewName(d.name); setRenaming(true); }} style={{ flex: 1 }}>
            <I n="pencil" size={13} /> Имя
          </Btn>
          <Btn kind="danger" style={{ flex: 1 }} onClick={() => { db.removeDebtor(d); showToast(`«${d.name}» — удалён из должников`); onClose(); }}>
            Удалить
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

// ---------- Формы заведения ----------
function AddDepositSheet({ db, showToast, onClose }) {
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const save = () => {
    if (!name.trim() || !+total) { showToast('Укажи имя и сумму', 'error'); return; }
    db.addDeposit({ name: name.trim(), total: +total });
    showToast('Депозит заведён ✓');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Новый депозит" footer={<Btn kind="dark" wide onClick={save}>Завести</Btn>}>
      <Field label="Имя (организация / кто внёс)">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Школа №5" />
      </Field>
      <Field label="Внесённая сумма, ₽">
        <input style={inputStyle} type="number" inputMode="numeric" value={total} onChange={e => setTotal(e.target.value)} />
      </Field>
    </Sheet>
  );
}

function AddDebtorSheet({ db, showToast, onClose }) {
  const [name, setName] = useState('');
  const save = () => {
    if (!name.trim()) { showToast('Укажи имя', 'error'); return; }
    db.addDebtor(name.trim());
    showToast('Должник добавлен ✓');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title="Новый должник" footer={<Btn kind="dark" wide onClick={save}>Добавить</Btn>}>
      <Field label="Имя">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Зайнаб, соседний салон…" autoFocus />
      </Field>
    </Sheet>
  );
}

const iconBtn = {
  border: 'none', background: M.soft, borderRadius: 999, width: 34, height: 34,
  display: 'grid', placeItems: 'center', color: M.muted, flexShrink: 0,
};
