// Аппаратная кнопка «назад» на Android закрывает шит, а не выкидывает из CRM.
//
// Почему это общий модуль, а не useEffect внутри каждого шита (баг Кристи 2026-09-07
// «изменение в задаче на мобилке вылетает»): в карточке задачи кнопка «Изменить» закрывает
// карточку и в том же кадре открывает форму правки. Когда каждый шит сам делал pushState
// при открытии и history.back() при закрытии, back() карточки успевал отменить запись формы
// и приходил popstate — форма закрывалась сразу же, экран оставался пустым.
//
// Теперь запись в истории ОДНА на всё время, пока открыт хотя бы один шит: решение
// принимается в микротаске, когда стек уже перестроился, поэтому пересменка
// «закрылся один — открылся другой» не трогает историю вообще.

const stack = [];          // колбэки закрытия, верхний — последний
let pushed = false;        // висит ли наша запись в истории
let suppressPop = 0;       // сколько popstate мы вызвали сами и должны пропустить
let listening = false;

function sync() {
  queueMicrotask(() => {
    if (stack.length > 0 && !pushed) {
      pushed = true;
      window.history.pushState({ sheet: true }, '');
    } else if (stack.length === 0 && pushed) {
      pushed = false;
      suppressPop++;
      window.history.back();
    }
  });
}

function onPop() {
  if (suppressPop > 0) { suppressPop--; return; }
  pushed = false;                              // запись уже сняли кнопкой «назад»
  const top = stack[stack.length - 1];
  if (top) top();                              // закрываем верхний шит; его cleanup вызовет sync()
}

// Регистрирует открытый шит. Возвращает функцию снятия регистрации.
export function registerSheet(close) {
  if (!listening) { window.addEventListener('popstate', onPop); listening = true; }
  stack.push(close);
  sync();
  return () => {
    const i = stack.lastIndexOf(close);
    if (i !== -1) stack.splice(i, 1);
    sync();
  };
}
