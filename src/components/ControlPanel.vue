<template>
    <div class="control-panel">
        <!-- Режимы -->
        <div class="control-panel__section">
            <h3 class="control-panel__section-title">Режим</h3>
            <div class="mode-grid">
                <button
                    v-for="m in modes"
                    :key="m.value"
                    class="btn btn--mode"
                    :class="{ 'btn--mode-active': state.interactionMode === m.value }"
                    :title="m.label"
                    @click="setInteractionMode(m.value)"
                >
                    <span class="btn__icon">{{ m.icon }}</span>
                    <span class="btn__label">{{ m.shortLabel }}</span>
                </button>
            </div>
        <!-- Подсказка для стрелки -->
            <div v-if="state.interactionMode === MODE_ARROW" class="mode-hint">
                {{ state.arrowStart
                    ? `Начало: (${state.arrowStart.x + 1}, ${state.arrowStart.y + 1}) — кликните конец`
                    : 'Кликните начало стрелки' }}
            </div>
        </div>

        <!-- Навигация -->
        <div class="control-panel__section">
            <h3 class="control-panel__section-title">Навигация</h3>
            <div class="btn-group">
                <button class="btn btn--icon" title="В начало"
                :disabled="state.currentNode === state.rootNode" @click="goToStart">⏮</button>
                <button class="btn btn--icon" title="Назад"
                :disabled="state.currentNode === state.rootNode" @click="prevMove">◀</button>
                <button class="btn btn--icon" title="Вперёд"
                :disabled="!canRedo" @click="nextMove">▶</button>
                <button class="btn btn--icon" title="В конец"
                :disabled="!canRedo" @click="goToEnd">⏭</button>
            </div>
        </div>

        <!-- Действия -->
        <div class="control-panel__section">
            <h3 class="control-panel__section-title">Действия</h3>
            <div class="btn-group btn-group--vertical">
                <button class="btn btn--primary"
                :disabled="state.isGameOver || state.interactionMode !== MODE_PLAY"
                @click="pass">Пас</button>
                <button class="btn btn--warning"
                :disabled="!canUndo" @click="undo">↩ Отменить ход</button>
                <button class="btn btn--danger-outline"
                :disabled="state.isGameOver" @click="openResignDialog">🏳 Сдаться</button>
                <button class="btn btn--danger"
                :disabled="state.isGameOver" @click="openEndGameDialog">Завершить игру</button>
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
                <input type="number" v-model.number="newGameOptions.komi" step="0.5" min="0" max="10" />
                </div>
                <div class="form-group">
                <label>Чёрные</label>
                <input type="text" v-model="newGameOptions.playerBlack" placeholder="Имя игрока" />
                </div>
                <div class="form-group">
                <label>Белые</label>
                <input type="text" v-model="newGameOptions.playerWhite" placeholder="Имя игрока" />
                </div>
                <button class="btn btn--success btn--full" @click="startNewGame">▶ Начать игру</button>
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

        <!-- Диалоги -->
        <Teleport to="body">
            <!-- Сдача -->
            <div v-if="showResignDialog" class="overlay" @click.self="showResignDialog = false">
                <div class="dialog">
                    <h3 class="dialog__title">Сдаться</h3>
                    <p>
                        Игрок
                        <strong>{{ state.currentColor === BLACK
                        ? state.gameInfo.playerBlack
                        : state.gameInfo.playerWhite }}</strong>
                        сдаётся?
                    </p>
                    <div class="btn-group">
                        <button class="btn btn--danger" @click="confirmResign">Да, сдаться</button>
                        <button class="btn" @click="showResignDialog = false">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- Завершение игры -->
            <div v-if="showEndGameDialog" class="overlay" @click.self="showEndGameDialog = false">
                <div class="dialog dialog--wide">
                    <h3 class="dialog__title">Завершить игру</h3>

                    <!-- Победитель -->
                    <div class="form-group">
                        <label>Результат</label>
                        <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.winner" value="B" />
                            Победили чёрные
                        </label>
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.winner" value="W" />
                            Победили белые
                        </label>
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.winner" value="draw" />
                            Ничья
                        </label>
                        </div>
                    </div>

                    <!-- Причина (только если есть победитель) -->
                    <div v-if="endGameForm.winner && endGameForm.winner !== 'draw'" class="form-group">
                        <label>Причина</label>
                        <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.reason" value="score" />
                            По очкам
                        </label>
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.reason" value="resign" />
                            Сдача
                        </label>
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.reason" value="time" />
                            По времени
                        </label>
                        <label class="radio-label">
                            <input type="radio" v-model="endGameForm.reason" value="forfeit" />
                            Штраф
                        </label>
                        </div>
                    </div>

                    <!-- Счёт (только при победе по очкам) -->
                    <div
                        v-if="endGameForm.reason === 'score' && endGameForm.winner !== 'draw'"
                        class="form-group"
                    >
                        <label>Счёт (очки преимущества)</label>
                        <input
                        type="number"
                        v-model.number="endGameForm.score"
                        step="0.5"
                        min="0"
                        placeholder="например, 5.5"
                        class="input--score"
                        />
                    </div>

                    <!-- Предпросмотр результата -->
                    <div class="result-preview">
                        <span class="result-preview__label">SGF результат:</span>
                        <code class="result-preview__value">{{ previewResult }}</code>
                    </div>

                    <div class="btn-group">
                        <button
                        class="btn btn--success"
                        :disabled="!endGameForm.winner"
                        @click="confirmEndGame"
                        >
                        Подтвердить
                        </button>
                        <button class="btn" @click="showEndGameDialog = false">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- Новая игра (подтверждение) -->
            <div v-if="showNewGameConfirm" class="overlay" @click.self="showNewGameConfirm = false">
                <div class="dialog">
                    <p>Начать новую игру? Текущая партия будет потеряна.</p>
                    <div class="btn-group">
                        <button class="btn btn--danger" @click="confirmNewGame">Да</button>
                        <button class="btn" @click="showNewGameConfirm = false">Отмена</button>
                    </div>
                </div>
            </div>

        </Teleport>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useGoGame } from '../core/useGoGame.js';

const {
  state, canUndo, canRedo,
  pass, undo, endGame, resign, newGame,
  goToStart, goToEnd, nextMove, prevMove,
  loadSGF, exportSGF,
  setInteractionMode,
  BLACK,
  MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
  MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
} = useGoGame();

// ─── Режимы ──────────────────────────────────────────────────────
const modes = [
  { value: MODE_PLAY,      icon: '▶', shortLabel: 'Ход',       label: 'Сделать ход' },
  { value: MODE_ADD_BLACK, icon: '●', shortLabel: 'AB',        label: 'Поставить чёрный камень' },
  { value: MODE_ADD_WHITE, icon: '○', shortLabel: 'AW',        label: 'Поставить белый камень' },
  { value: MODE_REMOVE,    icon: '✕', shortLabel: 'AE',        label: 'Убрать камень' },
  { value: MODE_MARK_TR,   icon: '△', shortLabel: 'TR',        label: 'Метка: Треугольник' },
  { value: MODE_MARK_SQ,   icon: '□', shortLabel: 'SQ',        label: 'Метка: Квадрат' },
  { value: MODE_MARK_CR,   icon: '◯', shortLabel: 'CR',        label: 'Метка: Круг' },
  { value: MODE_MARK_MA,   icon: '✗', shortLabel: 'MA',        label: 'Метка: X' },
  { value: MODE_ARROW,     icon: '→', shortLabel: 'AR',        label: 'Стрелка' },
];

// ─── Диалог сдачи ────────────────────────────────────────────────
const showResignDialog = ref(false);

function openResignDialog()  { showResignDialog.value = true; }
function confirmResign()     { resign(); showResignDialog.value = false; }

// ─── Диалог завершения игры ───────────────────────────────────────
const showEndGameDialog = ref(false);

const endGameForm = reactive({
    winner: '',      // 'B' | 'W' | 'draw'
    reason: 'score', // 'score' | 'resign' | 'time' | 'forfeit'
    score:  '',
});

const previewResult = computed(() => {
    const { winner, reason, score } = endGameForm;
    if (!winner) return '—';
    if (winner === 'draw') return '0';

    const reasonMap = {
        score:   score !== '' ? String(score) : '',
        resign:  'R',
        time:    'T',
        forfeit: 'F',
    };
    const r = reasonMap[reason] ?? '';
    return r ? `${winner}+${r}` : `${winner}+`;
});

function openEndGameDialog() {
    endGameForm.winner = '';
    endGameForm.reason = 'score';
    endGameForm.score  = '';
    showEndGameDialog.value = true;
}

function confirmEndGame() {
    endGame(previewResult.value);
    showEndGameDialog.value = false;
}

// ─── Новая игра ───────────────────────────────────────────────────
const newGameOptions     = reactive({ size: 19, komi: 6.5, playerBlack: 'Чёрные', playerWhite: 'Белые' });
const showNewGameConfirm = ref(false);

function startNewGame() {
    if (state.rootNode.children.length > 0) {
        showNewGameConfirm.value = true;
    } else {
        newGame({ ...newGameOptions });
    }
}

function confirmNewGame() {
    newGame({ ...newGameOptions });
    showNewGameConfirm.value = false;
}

// ─── SGF ─────────────────────────────────────────────────────────
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
    gap: 14px;
}

.control-panel__section { display: flex; flex-direction: column; gap: 8px; }

.control-panel__section-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
}

/* Сетка режимов */
.mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
}

.btn--mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    border: 1px solid #444;
    border-radius: 6px;
    background: #2a3142;
    color: #aaa;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 0.75rem;
}

.btn--mode:hover { background: #3a4155; color: #e0e0e0; }

.btn--mode-active {
    background: rgba(144, 202, 249, 0.15) !important;
    border-color: #90caf9 !important;
    color: #90caf9 !important;
}

.btn__icon  { font-size: 1rem; line-height: 1; }
.btn__label { font-size: 0.65rem; }

.mode-hint {
    font-size: 0.75rem;
    color: #90caf9;
    padding: 4px 8px;
    background: rgba(144, 202, 249, 0.08);
    border-radius: 4px;
    border-left: 2px solid #90caf9;
}

/* Кнопки */
.btn-group { display: flex; gap: 4px; }
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

.btn--danger-outline { border-color: #c62828; color: #ef9a9a; }
.btn--danger-outline:hover:not(:disabled) { background: rgba(183,28,28,0.15); }

.btn--success { background: #1b5e20; border-color: #2e7d32; color: #fff; }
.btn--success:hover:not(:disabled) { background: #2e7d32; }

.btn--full  { width: 100%; }
.btn--file  { display: block; cursor: pointer; }

/* Форма */
.new-game-form { display: flex; flex-direction: column; gap: 8px; }

.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 0.75rem; color: #888; }

.form-group select,
.form-group input,
.input--score {
    padding: 6px 8px;
    background: #2a3142;
    border: 1px solid #444;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 0.85rem;
}

.form-group select:focus,
.form-group input:focus { outline: none; border-color: #90caf9; }

.radio-group { display: flex; flex-direction: column; gap: 4px; }

.radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    transition: background 0.15s;
}

.radio-label:hover { background: rgba(255,255,255,0.05); }
.radio-label input { accent-color: #90caf9; }

.result-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: rgba(0,0,0,0.2);
    border-radius: 6px;
    font-size: 0.85rem;
}

.result-preview__label { color: #888; }

.result-preview__value {
    font-family: monospace;
    color: #90caf9;
    font-size: 1rem;
    font-weight: 600;
}

/* Диалоги */
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.dialog {
    background: #1e2430;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 24px;
    max-width: 320px;
    width: 90%;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.dialog--wide { max-width: 400px; }

.dialog__title {
    margin: 0;
    font-size: 1.1rem;
    color: #90caf9;
}

.dialog p { margin: 0; line-height: 1.5; }
</style>