<script setup>
import { useGoGame } from './core/useGoGame.js';
import Goban       from './components/Goban.vue';
import GameInfo      from './components/GameInfo.vue';
import MovesTree      from './components/MovesTree.vue';
import ControlPanel  from './components/ControlPanel.vue';
import EditComments  from './components/EditComments.vue';

const {
  state,
  // computed
  moveNumber,
  currentColor,
  currentPlayerName,
  canUndo,
  canRedo,
  // actions
  pass,
  undo,
  goToStart,
  goToEnd,
  nextMove,
  prevMove,
  // constants
  BLACK,
} = useGoGame();
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__logo">⬡ GoBoard</h1>
      <div class="app__header-status">
        <span
          v-if="state.isGameOver"
          class="badge badge--game-over"
        >
          Игра завершена
        </span>
        <span
          v-else
          class="badge"
          :class="currentColor === BLACK ? 'badge--black' : 'badge--white'"
        >
          Ход: {{ currentPlayerName }}
        </span>
        <span class="app__move-number">Ход {{ moveNumber }}</span>
      </div>
    </header>

    <main class="app__main">
      <section class="app__board-section">
        <Goban />

        <!-- Быстрые действия под доской -->
        <div class="app__quick-actions">
          <button
            class="quick-btn"
            @click="pass"
            :disabled="state.isGameOver"
          >
            Пас
          </button>
          <button
            class="quick-btn"
            @click="undo"
            :disabled="!canUndo"
          >
            ↩ Отмена
          </button>
          <div class="quick-nav">
            <button
              class="quick-btn quick-btn--icon"
              title="В начало"
              :disabled="state.currentNode === state.rootNode"
              @click="goToStart"
            >⏮</button>
            <button
              class="quick-btn quick-btn--icon"
              title="Назад"
              :disabled="state.currentNode === state.rootNode"
              @click="prevMove"
            >◀</button>
            <button
              class="quick-btn quick-btn--icon"
              title="Вперёд"
              :disabled="!canRedo"
              @click="nextMove"
            >▶</button>
            <button
              class="quick-btn quick-btn--icon"
              title="В конец"
              :disabled="!canRedo"
              @click="goToEnd"
            >⏭</button>
          </div>
        </div>
      </section>

      <!-- Правая панель -->
      <aside class="app__sidebar app__sidebar--right">
        <GameInfo />
        <MovesTree />
        <EditComments />
        <ControlPanel />
      </aside>
    </main>
  </div>
</template>
<style>
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: #141820;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: #e0e0e0;
  min-height: 100vh;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1e2430;
  border-bottom: 1px solid #333;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app__logo {
  font-size: 1.4rem;
  font-weight: 700;
  color: #90caf9;
  margin: 0;
  letter-spacing: 2px;
}

.app__header-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge--black {
  background: #333;
  color: #fff;
  border: 2px solid #666;
}

.badge--white {
  background: #f0f0f0;
  color: #000;
  border: 2px solid #ccc;
}

.badge--game-over {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border: 2px solid rgba(255, 215, 0, 0.4);
}

.app__move-number {
  font-size: 0.85rem;
  color: #888;
}

.app__main {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  align-items: flex-start;
  justify-content: center;
}

.app__sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.app__board-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.app__quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.quick-btn {
  padding: 8px 16px;
  background: #2a3142;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.quick-btn:hover:not(:disabled) {
  background: #3a4155;
  border-color: #666;
}

.quick-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quick-btn--icon { padding: 8px 12px; }

.quick-nav {
  display: flex;
  gap: 4px;
}

@media (max-width: 1200px) {
  .app__main { flex-wrap: wrap; }

  .app__sidebar {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .app__sidebar > * {
    flex: 1;
    min-width: 220px;
  }
}

@media (max-width: 768px) {
  .app__main { padding: 8px; gap: 8px; }
  .app__sidebar--left  { order: 2; }
  .app__board-section  { order: 1; width: 100%; }
  .app__sidebar--right { order: 3; }
}
</style>