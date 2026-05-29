<template>
  <div class="control-panel">

    <!-- Навигация -->
    <div class="control-panel__section">
      <h3 class="control-panel__section-title">Навигация</h3>
      <div class="btn-group">
        <button
          class="btn btn--icon"
          title="В начало"
          :disabled="state.currentNode === state.rootNode"
          @click="goToStart"
        >⏮</button>
        <button
          class="btn btn--icon"
          title="Назад"
          :disabled="state.currentNode === state.rootNode"
          @click="prevMove"
        >◀</button>
        <button
          class="btn btn--icon"
          title="Вперёд"
          :disabled="!canRedo"
          @click="nextMove"
        >▶</button>
        <button
          class="btn btn--icon"
          title="В конец"
          :disabled="!canRedo"
          @click="goToEnd"
        >⏭</button>
      </div>
    </div>

    <!-- Действия -->
    <div class="control-panel__section">
      <h3 class="control-panel__section-title">Действия</h3>
      <div class="btn-group btn-group--vertical">
        <button
          class="btn btn--primary"
          :disabled="state.isGameOver"
          @click="pass"
        >
          Пас
        </button>
        <button
          class="btn btn--warning"
          :disabled="!canUndo"
          @click="undo"
        >
          ↩ Отменить ход
        </button>
        <button
          class="btn btn--danger"
          :disabled="state.isGameOver"
          @click="confirmEndGame"
        >
          Завершить игру
        </button>
      </div>
    </div>

    <!-- Новая игра -->
    <div class="control-panel__section">
      <h3 class="control-panel__section-title">Новая игра</h3>
      <div class="new-game-form">
        <div class="form-group">
          <label>Размер доски</label>
          <select v-model="newGameOptions.size">
            <option :value="9">9×9</option>
            <option :value="13">13×13</option>
            <option :value="19">19×19</option>
          </select>
        </div>
        <div class="form-group">
          <label>Коми</label>
          <input
            type="number"
            v-model.number="newGameOptions.komi"
            step="0.5" min="0" max="10"
          />
        </div>
        <div class="form-group">
          <label>Чёрные</label>
          <input
            type="text"
            v-model="newGameOptions.playerBlack"
            placeholder="Имя игрока"
          />
        </div>
        <div class="form-group">
          <label>Белые</label>
          <input
            type="text"
            v-model="newGameOptions.playerWhite"
            placeholder="Имя игрока"
          />
        </div>
        <button class="btn btn--success btn--full" @click="startNewGame">
          ▶ Начать игру
        </button>
      </div>
    </div>

    <!-- SGF -->
    <div class="control-panel__section">
      <h3 class="control-panel__section-title">SGF</h3>
      <div class="btn-group btn-group--vertical">
        <button class="btn" @click="handleExport">📤 Экспорт SGF</button>
        <label class="btn btn--file">
          📥 Импорт SGF
          <input type="file" accept=".sgf" @change="handleImport" hidden />
        </label>
      </div>
    </div>

    <!-- Вид -->
    <div class="control-panel__section">
      <h3 class="control-panel__section-title">Вид</h3>
      <button
        class="btn"
        :class="{ 'btn--active': state.showTerritory }"
        :disabled="!state.isGameOver"
        @click="toggleTerritory"
      >
        {{ state.showTerritory ? '🗺 Скрыть' : '🗺 Показать' }} территорию
      </button>
    </div>

    <!-- Диалог подтверждения -->
    <Teleport to="body">
      <div v-if="showConfirm" class="confirm-overlay" @click.self="showConfirm = false">
        <div class="confirm-dialog">
          <p>{{ confirmMessage }}</p>
          <div class="btn-group">
            <button class="btn btn--danger" @click="runConfirm">Да</button>
            <button class="btn" @click="showConfirm = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useGoGame } from '../core/useGoGame.js';

const {
  state,
  canUndo,
  canRedo,
  pass,
  undo,
  endGame,
  newGame,
  goToStart,
  goToEnd,
  nextMove,
  prevMove,
  toggleTerritory,
  loadSGF,
  exportSGF,
} = useGoGame();

const newGameOptions = reactive({
  size:        19,
  komi:        6.5,
  playerBlack: 'Чёрные',
  playerWhite: 'Белые',
});

const showConfirm    = ref(false);
const confirmMessage = ref('');
let   pendingAction  = null;

function openConfirm(message, action) {
  confirmMessage.value = message;
  pendingAction        = action;
  showConfirm.value    = true;
}

function runConfirm() {
  pendingAction?.();
  showConfirm.value = false;
  pendingAction     = null;
}

function confirmEndGame() {
  openConfirm('Завершить игру и подсчитать очки?', endGame);
}

function startNewGame() {
  const doNew = () => newGame({ ...newGameOptions });
  // Есть ли вообще ходы в дереве?
  const hasGame = state.rootNode.children.length > 0;
  if (hasGame) {
    openConfirm('Начать новую игру? Текущая партия будет потеряна.', doNew);
  } else {
    doNew();
  }
}

function handleExport() {
  const sgf  = exportSGF();
  const blob = new Blob([sgf], { type: 'application/x-go-sgf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `game_${Date.now()}.sgf`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => loadSGF(e.target.result);
  reader.readAsText(file);
  event.target.value = '';
}
</script>

<style scoped>
.control-panel {
  background: #1e2430;
  border-radius: 12px;
  padding: 16px;
  color: #e0e0e0;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-panel__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-panel__section-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0;
}

.btn-group {
  display: flex;
  gap: 4px;
}

.btn-group--vertical { flex-direction: column; }

.btn {
  padding: 8px 14px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a3142;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  text-align: center;
}

.btn:hover:not(:disabled) { background: #3a4155; border-color: #666; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--icon { padding: 8px 12px; font-size: 1rem; flex: 1; }

.btn--primary { background: #1565c0; border-color: #1976d2; color: #fff; }
.btn--primary:hover:not(:disabled) { background: #1976d2; }

.btn--warning { background: #e65100; border-color: #f57c00; color: #fff; }
.btn--warning:hover:not(:disabled) { background: #f57c00; }

.btn--danger { background: #b71c1c; border-color: #c62828; color: #fff; }
.btn--danger:hover:not(:disabled) { background: #c62828; }

.btn--success { background: #1b5e20; border-color: #2e7d32; color: #fff; }
.btn--success:hover:not(:disabled) { background: #2e7d32; }

.btn--full { width: 100%; }

.btn--active {
  border-color: #90caf9;
  background: rgba(144, 202, 249, 0.15);
}

.btn--file { display: block; cursor: pointer; }

.new-game-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.form-group label { font-size: 0.75rem; color: #888; }

.form-group select,
.form-group input {
  padding: 6px 8px;
  background: #2a3142;
  border: 1px solid #444;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 0.85rem;
}

.form-group select:focus,
.form-group input:focus {
  outline: none;
  border-color: #90caf9;
}

/* Диалог */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: #1e2430;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 24px;
  max-width: 300px;
  width: 90%;
  text-align: center;
}

.confirm-dialog p {
  margin: 0 0 16px;
  color: #e0e0e0;
  line-height: 1.5;
}
</style>