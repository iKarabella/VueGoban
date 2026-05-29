# @karabella/vue-goban

Vue 3 компоненты для игры Го.

## Установка

```bash
npm install @karabella/vue-goban
```

## Использование

### Плагин (глобальная регистрация)

```javascript
// main.js
import { createApp }    from 'vue';
import App              from './App.vue';
import GobanPlugin    from '@karabella/vue-goban';
import '@karabella/vue-goban/styles';

createApp(App)
  .use(GobanPlugin)
  .mount('#app');
```

```vue
<template>
  <Goban />
  <GoGameInfo />
  <GoMovesTree />
  <GoControlPanel />
  <GoComments />
</template>
```

### Локальная регистрация

```vue
<script setup>
import {
  Goban,
  GameInfo,
  MovesTree,
  ControlPanel,
  Comments,
  useGoGame,
} from '@karabella/vue-goban';
import '@karabella/vue-goban/styles';
</script>

<template>
  <div class="app">
    <Goban />
    <GameInfo />
    <MovesTree />
    <ControlPanel />
    <Comments />
  </div>
</template>
```

### Только ядро (без компонентов)

```javascript
import { useGoGame, GoEngine, SGFParser } from '@karabella/vue-goban';

const { state, placeStone, pass, undo } = useGoGame();
```

### Пользовательский компонент с ядром

```vue
<script setup>
import { useGoGame } from '@karabella/vue-goban';

const { state, placeStone, currentColorName } = useGoGame();
</script>

<template>
  <div>Ход: {{ currentColorName }}</div>
  <div>Ходов сыграно: {{ state.currentNode.moveNumber }}</div>
</template>
```

## API

### `useGoGame()`

| Свойство / Метод    | Тип                        | Описание                    |
|---------------------|----------------------------|-----------------------------|
| `state`             | `GameState`                | Реактивное состояние игры   |
| `placeStone(x, y)`  | `(number, number) → bool`  | Поставить камень            |
| `pass()`            | `() → void`                | Пас                         |
| `undo()`            | `() → bool`                | Отменить ход                |
| `goToNode(node)`    | `(MoveNode) → void`        | Перейти к узлу дерева       |
| `loadSGF(string)`   | `(string) → bool`          | Загрузить SGF               |
| `exportSGF()`       | `() → string`              | Экспортировать в SGF        |
| `newGame(options)`  | `(options?) → void`        | Новая игра                  |

### Компоненты

| Компонент      | Описание                              |
|----------------|---------------------------------------|
| `Goban`      | Игровая доска (canvas)                |
| `GameInfo`     | Информация об игре и игроках          |
| `MovesTree`     | Дерево ходов (canvas, drag & drop)    |
| `ControlPanel` | Панель управления                     |
| `Comments` | Комментарии к ходам                   |

## Опции плагина

```javascript
app.use(GobanPlugin, {
  prefix: 'Go',  // Goban, GoGameInfo, GoMovesTree, ...
})
```