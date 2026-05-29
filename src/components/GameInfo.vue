<script setup>
import { useGoGame } from '../core/useGoGame.js'
import {ref} from 'vue'

const {
    state,
    moveNumber,
    currentColor,
    capturesBlack,
    capturesWhite,
    score,
    BLACK,
    WHITE,
} = useGoGame();

const showOtherInfo = ref(false)
</script>

<template>
    <div>
        <div class="game-info" @mouseenter="showOtherInfo=true" @mouseleave="showOtherInfo=false">
            <div class="game-info__players">
                <div class="player" :class="{ 'player--active': currentColor === BLACK && !state.isGameOver }">
                    <div class="player__stone player__stone--black" />
                    <div class="player__details">
                        <div class="player__name">{{ state.gameInfo.playerBlack }}</div>
                        <div class="player__captures">
                            <strong>{{ capturesBlack }} {{ capturesBlack==1?'пленный':'пленных' }}</strong>
                        </div>
                    </div>
                </div>
                <div class="player" :class="{ 'player--active': currentColor === WHITE && !state.isGameOver }">
                    <div class="player__stone player__stone--white" />
                    <div class="player__details">
                        <div class="player__name">{{ state.gameInfo.playerWhite }}</div>
                        <div class="player__captures">
                            <strong>{{ capturesWhite }} {{ capturesWhite==1?'пленный':'пленных' }}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-show="showOtherInfo">
            <!-- Статистика -->
            <div class="game-info__stats">
                <div class="stat">
                    <span class="stat__label">Ход</span>
                    <span class="stat__value">{{ moveNumber }}</span>
                </div>
                <div class="stat">
                    <span class="stat__label">Размер</span>
                    <span class="stat__value">{{ state.boardSize }}×{{ state.boardSize }}</span>
                </div>
                <div class="stat">
                    <span class="stat__label">Коми</span>
                    <span class="stat__value">{{ state.komi }}</span>
                </div>
                <div v-if="state.gameInfo.event" class="stat">
                    <span class="stat__label">Событие</span>
                    <span class="stat__value">{{ state.gameInfo.event }}</span>
                </div>
                <div class="stat">
                    <span class="stat__label">Дата</span>
                    <span class="stat__value">{{ state.gameInfo.date }}</span>
                </div>
            </div>
        </div>
        <div>
            <!-- Счёт -->
            <div v-if="state.isGameOver && score" class="game-info__score">
                <h3>Счёт</h3>
                <div class="score-row">
                    <span>Чёрные:</span>
                    <strong>{{ score.black.toFixed(1) }}</strong>
                </div>
                <div class="score-row">
                    <span>Белые:</span>
                    <strong>{{ score.white.toFixed(1) }}</strong>
                </div>
                <div class="score-row score-row--winner">
                    <span>Победитель:</span>
                    <strong>
                    {{ score.black > score.white
                        ? state.gameInfo.playerBlack
                        : state.gameInfo.playerWhite }}
                    </strong>
                </div>
            </div>

            <!-- Статус / ошибка -->
            <div v-if="state.statusMessage" class="game-info__status">
                {{ state.statusMessage }}
            </div>
            <div v-if="state.lastError" class="game-info__error">
                ⚠ {{ state.lastError }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-info {
  background: #1e2430;
  border-radius: 12px;
  padding: 20px;
  color: #e0e0e0;
  min-width: 240px;
}

.game-info__title {
  font-size: 1rem;
  font-weight: 600;
  color: #90caf9;
  margin: 0 0 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.game-info__players {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.game-info__vs {
  text-align: center;
  color: #666;
  font-size: 0.8rem;
}

.player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.player--active {
  border-color: #90caf9;
  background: rgba(144, 202, 249, 0.08);
}

.player__stone {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player__stone--black {
  background: radial-gradient(circle at 35% 35%, #555, #000);
  box-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.player__stone--white {
  background: radial-gradient(circle at 35% 35%, #fff, #ccc);
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.player__details { flex: 1; }

.player__name {
  font-weight: 600;
  font-size: 0.95rem;
}

.player__captures {
  font-size: 0.8rem;
  color: #aaa;
}

.player__turn {
  color: #90caf9;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.game-info__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat__label {
  font-size: 0.72rem;
  color: #888;
  text-transform: uppercase;
}

.stat__value {
  font-size: 0.95rem;
  font-weight: 500;
}

.game-info__score {
  padding: 12px;
  background: rgba(255,215,0,0.08);
  border: 1px solid rgba(255,215,0,0.3);
  border-radius: 8px;
  margin-bottom: 12px;
}

.game-info__score h3 {
  margin: 0 0 8px;
  color: #ffd700;
  font-size: 0.9rem;
}

.score-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.9rem;
}

.score-row--winner {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255,215,0,0.3);
  color: #ffd700;
}

.game-info__status {
  padding: 8px 12px;
  background: rgba(144, 202, 249, 0.1);
  border-left: 3px solid #90caf9;
  border-radius: 4px;
  font-size: 0.85rem;
}

.game-info__error {
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #ef9a9a;
}
</style>