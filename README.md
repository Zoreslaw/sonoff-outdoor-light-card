# Sonoff Outdoor Light Card

Home Assistant dashboard card на TypeScript + Lit для наружных фонарей, управляемых существующей entity типа `switch`.

## Сборка

Рекомендуется Node.js 22.13 или новее для совместимости всех инструментов разработки.

```sh
npm install
npm run build
```

Готовый модуль: `dist/sonoff-outdoor-light-card.js`. Runtime-зависимости включены в bundle.

## Установка в Home Assistant

1. Скопировать `dist/sonoff-outdoor-light-card.js` в `/config/www/sonoff-outdoor-light-card.js`.
2. В Dashboard Resources добавить `/local/sonoff-outdoor-light-card.js` как **JavaScript Module**.
3. Добавить карточку:

```yaml
type: custom:sonoff-outdoor-light-card
entity: switch.example
name: Outdoor lights
```

Если папка `www` создана впервые, перезапустить Home Assistant. При обновлении файла обновить страницу; при необходимости добавить версию к URL ресурса, например `?v=2`.

## Конфигурация и поведение

- `entity` — обязательный entity_id существующей switch entity.
- `name` — необязательное имя. По умолчанию используется friendly_name, затем entity_id.
- Отображаются имя, ON/OFF, entity_id и большая кнопка переключения.
- ON вызывает `switch.turn_off`, OFF вызывает `switch.turn_on`.
- Состояние обновляется через реактивное свойство `hass`.
- Для unavailable/unknown кнопка отключена, отображается текущее состояние.
- Отсутствующая entity и неподдерживаемый domain показывают ошибку внутри ha-card.
- Ошибки вызова сервиса показываются внутри карточки.

Карточка зарегистрирована в picker как **Sonoff Outdoor Light Card**. Простой визуальный редактор предлагает выбор switch и имени. Начальная конфигурация выбирает первую существующую switch entity; если switch нет, сначала создайте её в Home Assistant.

Работа только через Home Assistant. Sonoff API, eWeLink, MQTT и прямые протоколы не используются.

## Разработка

```sh
npm start
npm test
```

Перед тестами выполните `npm run build`. Dev bundle: `http://localhost:5000/sonoff-outdoor-light-card.js`.
Тесты проверяют собранный модуль с DOM и имитацией hass.

[Документация API карточки Home Assistant](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/).

## Новый репозиторий

Проект подготовлен под имя `sonoff-outdoor-light-card`. Новый GitHub-репозиторий пока не создан.
После его создания настройте origin на его фактический URL:

```sh
git remote add origin https://github.com/YOUR_ACCOUNT/sonoff-outdoor-light-card.git
```

GitHub Actions собирают модуль и прикрепляют его к опубликованному release. HACS использует `hacs.json` и release asset.

## Лицензия

MIT, см. LICENSE. Существующие уведомления об авторских правах сохранены.
