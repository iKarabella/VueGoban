<template>
  <div class="move-comments">
    <h2 class="move-comments__title">Комментарии</h2>

    <!-- Текущий ход -->
    <div v-if="currentNode && currentNode.moveNumber > 0" class="move-badge" :class="currentNode.colorName">
      <div class="move-badge__stone" />
      <span>Ход {{ currentNode.moveNumber }}</span>
      <span class="move-badge__coords">
        {{ currentNode.coords ? formatCoords(currentNode.coords) : 'ПАС' }}
      </span>
    </div>
    <div v-else class="move-comments__empty-move">
      Начало партии
    </div>

    <!-- Редактор -->
    <div class="move-comments__editor">
      <label class="move-comments__label">Комментарий к ходу:</label>
      <textarea
        v-model="localComment"
        class="move-comments__textarea"
        placeholder="Добавьте комментарий к этому ходу..."
        :disabled="!currentNode || currentNode.moveNumber === 0"
        @input="handleCommentChange"
        rows="4"
      />
      <div class="move-comments__char-count">{{ localComment.length }} символов</div>
    </div>

    <!-- Все комментарии -->
    <div class="move-comments__all">
      <h3 class="move-comments__subtitle">Все комментарии</h3>
      <div v-if="allComments.length === 0" class="move-comments__no-comments">
        Нет комментариев
      </div>
      <div
        v-for="item in allComments"
        :key="item.node.id"
        class="comment-item"
        :class="{ 'comment-item--active': item.node === state.currentNode }"
        @click="goToNode(item.node)"
      >
        <div class="comment-item__header">
          <div class="comment-item__stone" :class="item.node.colorName" />
          <span class="comment-item__move">Ход {{ item.node.moveNumber }}</span>
          <span class="comment-item__coords">
            {{ item.node.coords ? formatCoords(item.node.coords) : 'ПАС' }}
          </span>
        </div>
        <p class="comment-item__text">{{ item.node.comment }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGoGame } from '../core/useGoGame.js';

const { state, currentNode, currentComment, setComment, goToNode } = useGoGame();

const LETTERS = 'ABCDEFGHJKLMNOPQRST';

function formatCoords({ x, y }) {
  return `${LETTERS[x]}${state.boardSize - y}`;
}

const localComment = ref('');

// Синхронизация при смене узла
watch(
  currentComment,
  (val) => { localComment.value = val || ''; },
  { immediate: true }
);

let saveTimer = null;
function handleCommentChange() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => setComment(localComment.value), 500);
}

/** Собрать все узлы с комментариями (обход всего дерева) */
const allComments = computed(() => {
  const result = [];
  function dfs(node) {
    if (node.comment?.trim() && node.moveNumber > 0) {
      result.push({ node });
    }
    node.children.forEach(dfs);
  }
  dfs(state.rootNode);
  return result;
});
</script>

<style scoped>
.move-comments {
  background: #1e2430;
  border-radius: 12px;
  padding: 16px;
  color: #e0e0e0;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.move-comments__title {
  font-size: 1rem;
  font-weight: 600;
  color: #90caf9;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.move-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  font-size: 0.9rem;
}

.move-badge__stone {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.move-badge.black .move-badge__stone {
  background: radial-gradient(circle at 35% 35%, #555, #000);
}

.move-badge.white .move-badge__stone {
  background: radial-gradient(circle at 35% 35%, #fff, #ccc);
  border: 1px solid #999;
}

.move-badge__coords {
  margin-left: auto;
  color: #888;
  font-size: 0.8rem;
}

.move-comments__empty-move {
  color: #666;
  font-style: italic;
  font-size: 0.85rem;
}

.move-comments__label {
  display: block;
  font-size: 0.75rem;
  color: #888;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.move-comments__textarea {
  width: 100%;
  background: #2a3142;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 0.85rem;
  padding: 8px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.move-comments__textarea:focus {
  outline: none;
  border-color: #90caf9;
}

.move-comments__textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.move-comments__char-count {
  text-align: right;
  font-size: 0.72rem;
  color: #666;
  margin-top: 3px;
}

.move-comments__subtitle {
  font-size: 0.8rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px;
}

.move-comments__all {
  border-top: 1px solid #333;
  padding-top: 12px;
}

.move-comments__no-comments {
  color: #555;
  font-size: 0.85rem;
  font-style: italic;
}

.comment-item {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #333;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 6px;
}

.comment-item:hover { border-color: #555; background: rgba(255,255,255,0.03); }

.comment-item--active {
  border-color: #90caf9;
  background: rgba(144, 202, 249, 0.08);
}

.comment-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.comment-item__stone {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.comment-item__stone.black {
  background: radial-gradient(circle at 35% 35%, #555, #000);
}

.comment-item__stone.white {
  background: radial-gradient(circle at 35% 35%, #fff, #ccc);
  border: 1px solid #999;
}

.comment-item__move { font-size: 0.8rem; font-weight: 600; }

.comment-item__coords {
  margin-left: auto;
  font-size: 0.75rem;
  color: #888;
}

.comment-item__text {
  margin: 0;
  font-size: 0.82rem;
  color: #bbb;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>