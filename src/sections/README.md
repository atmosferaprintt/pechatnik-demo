# src/sections/

Каждый раздел CRM — отдельный файл здесь. В `App.jsx` — только импорт и рендер.

## Соглашения

1. Один файл = один раздел, PascalCase, default export.
2. Данные и клиент Supabase — через props, свой `createClient` не создавать.
3. Свой auth не делать — `currentUser`/`userRole` приходят пропсами.
4. Раздел >1000 строк → превращаем в папку `sections/ИмяРаздела/` с `index.jsx`.

## Стандартные пропсы (передаёт App.jsx)

`supabase`, `currentUser`, `userRole`, `isOwner`, `showToast`, `onUpdate` (перезагрузка данных родителя), `loadAllRows`, `clients`, `tasks`, `categories`, `banks`, `loading`, `UI` (дизайн-токены), `STAGES`, `PAYMENT_METHODS`.

Стилистика — по [ДИЗАЙН.md](../../ДИЗАЙН.md).
