<!-- src/components/GoBoard.vue -->
<template>
    <div class="goboard-wrapper">
      <canvas
        ref="canvas"
        :width="canvasSize"
        :height="canvasSize"
        class="goboard-canvas"
        @click="handleClick"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { useGoGame } from '../core/useGoGame.js';
  
  const { state, placeStone, setHoveredCell, BLACK, WHITE, EMPTY } = useGoGame();
  
  const canvas = ref(null);
  
  // ─── Константы разметки ──────────────────────────────────────────
  const PADDING   = 52;
  const CELL_SIZE = 36;
  
  // ─── Вычисляемые размеры ─────────────────────────────────────────
  const gridSpan   = computed(() => (state.boardSize - 1) * CELL_SIZE);
  const canvasSize = computed(() => gridSpan.value + PADDING * 2);
  
  function linePos(i) {
    return PADDING + i * CELL_SIZE;
  }
  
  const marginNear = PADDING / 2;
  const marginFar  = computed(() => linePos(state.boardSize - 1) + PADDING / 2);
  
  // ─── Звёздные точки ───────────────────────────────────────────────
  const starPoints = computed(() => {
    const s = state.boardSize;
    if (s === 19) return [
      [3,3],[9,3],[15,3],
      [3,9],[9,9],[15,9],
      [3,15],[9,15],[15,15],
    ];
    if (s === 13) return [[3,3],[9,3],[3,9],[9,9],[6,6]];
    if (s === 9)  return [[2,2],[6,2],[2,6],[6,6],[4,4]];
    return [];
  });
  
  // ─── Главная функция отрисовки ────────────────────────────────────
  function draw() {
    const ctx = canvas.value?.getContext('2d');
    if (!ctx) return;
  
    const cs = canvasSize.value;
    ctx.clearRect(0, 0, cs, cs);
  
    drawBackground(ctx, cs);
    drawGrid(ctx);
    drawStarPoints(ctx);
    drawCoordinates(ctx);
    drawStones(ctx);
    drawHoverStone(ctx);
    drawLastMoveMarker(ctx);
    drawKoMarker(ctx);
  }
  
  // ─── Фон ─────────────────────────────────────────────────────────
  function drawBackground(ctx, cs) {
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur    = 18;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 6;
    const grad = ctx.createLinearGradient(0, 0, cs, cs);
    grad.addColorStop(0, '#ddb96a');
    grad.addColorStop(1, '#c49a3c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cs, cs);
    ctx.restore();
  }
  
  // ─── Сетка ───────────────────────────────────────────────────────
  function drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = '#5a3e1b';
    ctx.lineWidth   = 1;
  
    const first = PADDING;
    const last  = linePos(state.boardSize - 1);
  
    for (let i = 0; i < state.boardSize; i++) {
      const p = linePos(i);
  
      ctx.beginPath();
      ctx.moveTo(first, p);
      ctx.lineTo(last,  p);
      ctx.stroke();
  
      ctx.beginPath();
      ctx.moveTo(p, first);
      ctx.lineTo(p, last);
      ctx.stroke();
    }
    ctx.restore();
  }
  
  // ─── Звёздные точки ──────────────────────────────────────────────
  function drawStarPoints(ctx) {
    ctx.save();
    ctx.fillStyle = '#5a3e1b';
    for (const [col, row] of starPoints.value) {
      ctx.beginPath();
      ctx.arc(linePos(col), linePos(row), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  
  // ─── Координаты ──────────────────────────────────────────────────
  function drawCoordinates(ctx) {
    const size    = state.boardSize;
    const letters = 'ABCDEFGHJKLMNOPQRST';
    const near    = marginNear;
    const far     = marginFar.value;
  
    ctx.save();
    ctx.fillStyle    = '#5a3e1b';
    ctx.font         = 'bold 13px Arial';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
  
    for (let i = 0; i < size; i++) {
      const p   = linePos(i);
      const num = size - i;
      const lit = letters[i];
  
      ctx.fillText(lit, p,    near);
      ctx.fillText(lit, p,    far);
      ctx.fillText(num, near, p);
      ctx.fillText(num, far,  p);
    }
    ctx.restore();
  }
  
  // ─── Камни ───────────────────────────────────────────────────────
  function drawStones(ctx) {
    if (!state.board?.length) return;
  
    for (let y = 0; y < state.boardSize; y++) {
      for (let x = 0; x < state.boardSize; x++) {
        const cell = state.board[y]?.[x];
        if (cell !== undefined && cell !== EMPTY) {
          drawStone(ctx, x, y, cell);
        }
      }
    }
  }
  
  function drawStone(ctx, x, y, color, alpha = 1) {
    const px = linePos(x);
    const py = linePos(y);
    const r  = CELL_SIZE * 0.46;
  
    ctx.save();
    ctx.globalAlpha = alpha;
  
    ctx.shadowColor   = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur    = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
  
    const grad = ctx.createRadialGradient(
      px - r * 0.3, py - r * 0.3, r * 0.05,
      px,           py,           r
    );
  
    if (color === BLACK) {
      grad.addColorStop(0,   '#6a6a6a');
      grad.addColorStop(0.4, '#222');
      grad.addColorStop(1,   '#000');
    } else {
      grad.addColorStop(0,   '#ffffff');
      grad.addColorStop(0.5, '#e8e8e8');
      grad.addColorStop(1,   '#b8b8b8');
    }
  
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  
    ctx.shadowColor = 'transparent';
  
    if (color === WHITE) {
      ctx.beginPath();
      ctx.arc(px - r * 0.28, py - r * 0.28, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
    }
  
    ctx.restore();
  }
  
  // ─── Призрак хода при наведении ──────────────────────────────────
  function drawHoverStone(ctx) {
    if (!state.hoveredCell || state.isGameOver) return;
    const { x, y } = state.hoveredCell;
    if (!state.board[y]?.[x] !== undefined && state.board[y]?.[x] !== EMPTY) return;
    if (state.board[y]?.[x] !== EMPTY) return;
    drawStone(ctx, x, y, state.currentColor, 0.38);
  }
  
  // ─── Маркер последнего хода ───────────────────────────────────────
  function drawLastMoveMarker(ctx) {
    // Берём данные из currentNode, а не из state.moves
    const node = state.currentNode;
  
    // Пропускаем корневой узел и пасы
    if (!node || node.moveNumber === 0 || !node.coords) return;
  
    const { x, y } = node.coords;
    const color    = node.color;
  
    const px = linePos(x);
    const py = linePos(y);
    const r  = CELL_SIZE * 0.18;
  
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = color === BLACK ? '#fff' : '#333';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();
  }
  
  // ─── Маркер ко ───────────────────────────────────────────────────
  function drawKoMarker(ctx) {
    if (!state.ko) return;
  
    const px = linePos(state.ko.x);
    const py = linePos(state.ko.y);
    const r  = CELL_SIZE * 0.22;
  
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth   = 2;
    ctx.strokeRect(px - r, py - r, r * 2, r * 2);
    ctx.restore();
  }
  
  // ─── Взаимодействие ──────────────────────────────────────────────
  function pixelToCoords(px, py) {
    const x = Math.round((px - PADDING) / CELL_SIZE);
    const y = Math.round((py - PADDING) / CELL_SIZE);
    if (x >= 0 && x < state.boardSize && y >= 0 && y < state.boardSize) {
      return { x, y };
    }
    return null;
  }
  
  function getEventPos(event) {
    const rect   = canvas.value.getBoundingClientRect();
    const scaleX = canvas.value.width  / rect.width;
    const scaleY = canvas.value.height / rect.height;
    return {
      px: (event.clientX - rect.left) * scaleX,
      py: (event.clientY - rect.top)  * scaleY,
    };
  }
  
  function handleClick(event) {
    const { px, py } = getEventPos(event);
    const coords = pixelToCoords(px, py);
    if (coords) placeStone(coords.x, coords.y);
  }
  
  function handleMouseMove(event) {
    const { px, py } = getEventPos(event);
    setHoveredCell(pixelToCoords(px, py));
  }
  
  function handleMouseLeave() {
    setHoveredCell(null);
  }
  
  // ─── Реактивность ────────────────────────────────────────────────
  watch(
    () => [
      state.board,
      state.hoveredCell,
      state.currentNode,   // ← вместо state.currentMoveIndex
      state.ko,
    ],
    () => draw(),
    { deep: true }
  );
  
  onMounted(draw);
  </script>
  
  <style scoped>
  .goboard-wrapper {
    display: inline-block;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  }
  
  .goboard-canvas {
    display: block;
    cursor: crosshair;
    max-width: 100%;
    height: auto;
  }
</style>