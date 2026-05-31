<template>
  <div class="goboard-wrapper">
    <canvas
      ref="canvas"
      :width="canvasSize"
      :height="canvasSize"
      class="goboard-canvas"
      :class="cursorClass"
      @click="handleClick"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useGoGame } from '../core/useGoGame.js';
import { SGFParser } from '../core/SGFParser.js';

const {
  state, handleBoardClick, setHoveredCell,
  BLACK, WHITE, EMPTY,
  MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
  MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
} = useGoGame();

const canvas = ref(null);

const PADDING   = 52;
const CELL_SIZE = 36;

const gridSpan   = computed(() => (state.boardSize - 1) * CELL_SIZE);
const canvasSize = computed(() => gridSpan.value + PADDING * 2);

function linePos(i) { return PADDING + i * CELL_SIZE; }

const marginNear = PADDING / 2;
const marginFar  = computed(() => linePos(state.boardSize - 1) + PADDING / 2);

const starPoints = computed(() => {
  const s = state.boardSize;
  if (s === 19) return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]];
  if (s === 13) return [[3,3],[9,3],[3,9],[9,9],[6,6]];
  if (s === 9)  return [[2,2],[6,2],[2,6],[6,6],[4,4]];
  return [];
});

// Курсор в зависимости от режима
const cursorClass = computed(() => {
  switch (state.interactionMode) {
    case MODE_PLAY:      return 'cursor-crosshair';
    case MODE_REMOVE:    return 'cursor-remove';
    case MODE_ARROW:     return state.arrowStart ? 'cursor-arrow-end' : 'cursor-arrow-start';
    default:             return 'cursor-mark';
  }
});

// ─── Главная отрисовка ────────────────────────────────────────────
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
  drawMarks(ctx);
  drawArrows(ctx);
  drawHoverStone(ctx);
  drawLastMoveMarker(ctx);
  drawKoMarker(ctx);
  drawArrowStartMarker(ctx);
}

function drawBackground(ctx, cs) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 18;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 6;
  const grad = ctx.createLinearGradient(0, 0, cs, cs);
  grad.addColorStop(0, '#ddb96a');
  grad.addColorStop(1, '#c49a3c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cs, cs);
  ctx.restore();
}

function drawGrid(ctx) {
  ctx.save();
  ctx.strokeStyle = '#5a3e1b';
  ctx.lineWidth   = 1;
  const last = linePos(state.boardSize - 1);
  for (let i = 0; i < state.boardSize; i++) {
    const p = linePos(i);
    ctx.beginPath(); ctx.moveTo(PADDING, p); ctx.lineTo(last, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p, PADDING); ctx.lineTo(p, last); ctx.stroke();
  }
  ctx.restore();
}

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
    ctx.fillText(letters[i], p, near);
    ctx.fillText(letters[i], p, far);
    ctx.fillText(num, near, p);
    ctx.fillText(num, far,  p);
  }
  ctx.restore();
}

function drawStones(ctx) {
  if (!state.board?.length) return;
  for (let y = 0; y < state.boardSize; y++) {
    for (let x = 0; x < state.boardSize; x++) {
      const cell = state.board[y]?.[x];
      if (cell !== EMPTY && cell !== undefined) drawStone(ctx, x, y, cell);
    }
  }
}

function drawStone(ctx, x, y, color, alpha = 1) {
  const px = linePos(x);
  const py = linePos(y);
  const r  = CELL_SIZE * 0.46;
  ctx.save();
  ctx.globalAlpha   = alpha;
  ctx.shadowColor   = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  const grad = ctx.createRadialGradient(
    px - r * 0.3, py - r * 0.3, r * 0.05, px, py, r
  );
  if (color === BLACK) {
    grad.addColorStop(0, '#6a6a6a');
    grad.addColorStop(0.4, '#222');
    grad.addColorStop(1, '#000');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#e8e8e8');
    grad.addColorStop(1, '#b8b8b8');
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

// ─── Метки ───────────────────────────────────────────────────────
function drawMarks(ctx) {
  const props = state.currentNode?.properties;
  if (!props) return;

  if (props.TR) props.TR.forEach(sgf => drawMarkTR(ctx, sgf));
  if (props.SQ) props.SQ.forEach(sgf => drawMarkSQ(ctx, sgf));
  if (props.CR) props.CR.forEach(sgf => drawMarkCR(ctx, sgf));
  if (props.MA) props.MA.forEach(sgf => drawMarkMA(ctx, sgf));
}

function markColor(x, y) {
  // Цвет метки зависит от цвета камня под ней
  const cell = state.board[y]?.[x];
  if (cell === BLACK) return '#ffffff';
  if (cell === WHITE) return '#000000';
  return '#333333';
}

function drawMarkTR(ctx, sgf) {
  const c = SGFParser.sgfToCoords(sgf);
  if (!c) return;
  const px = linePos(c.x);
  const py = linePos(c.y);
  const r  = CELL_SIZE * 0.28;
  ctx.save();
  ctx.strokeStyle = markColor(c.x, c.y);
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(px,         py - r);
  ctx.lineTo(px + r,     py + r * 0.7);
  ctx.lineTo(px - r,     py + r * 0.7);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawMarkSQ(ctx, sgf) {
  const c = SGFParser.sgfToCoords(sgf);
  if (!c) return;
  const px = linePos(c.x);
  const py = linePos(c.y);
  const r  = CELL_SIZE * 0.24;
  ctx.save();
  ctx.strokeStyle = markColor(c.x, c.y);
  ctx.lineWidth   = 2;
  ctx.strokeRect(px - r, py - r, r * 2, r * 2);
  ctx.restore();
}

function drawMarkCR(ctx, sgf) {
  const c = SGFParser.sgfToCoords(sgf);
  if (!c) return;
  const px = linePos(c.x);
  const py = linePos(c.y);
  const r  = CELL_SIZE * 0.26;
  ctx.save();
  ctx.strokeStyle = markColor(c.x, c.y);
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMarkMA(ctx, sgf) {
  const c = SGFParser.sgfToCoords(sgf);
  if (!c) return;
  const px = linePos(c.x);
  const py = linePos(c.y);
  const r  = CELL_SIZE * 0.24;
  ctx.save();
  ctx.strokeStyle = markColor(c.x, c.y);
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
  ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
  ctx.stroke();
  ctx.restore();
}

// ─── Стрелки ─────────────────────────────────────────────────────
function drawArrows(ctx) {
  const props = state.currentNode?.properties;
  if (!props?.AR) return;

  for (const arrowSGF of props.AR) {
    const [fromSGF, toSGF] = arrowSGF.split(':');
    const from = SGFParser.sgfToCoords(fromSGF);
    const to   = SGFParser.sgfToCoords(toSGF);
    if (!from || !to) continue;
    drawArrow(ctx, linePos(from.x), linePos(from.y), linePos(to.x), linePos(to.y));
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color = '#2196f3') {
  const headLen  = 12;
  const headAngle = Math.PI / 6;
  const angle    = Math.atan2(y2 - y1, x2 - x1);

  // Укорачиваем линию чтобы не заходить в камень
  const r    = CELL_SIZE * 0.46;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < r * 2) return;

  const sx = x1 + Math.cos(angle) * r;
  const sy = y1 + Math.sin(angle) * r;
  const ex = x2 - Math.cos(angle) * r;
  const ey = y2 - Math.sin(angle) * r;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = 'round';

  // Линия
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Наконечник стрелки
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - headLen * Math.cos(angle - headAngle),
    ey - headLen * Math.sin(angle - headAngle)
  );
  ctx.lineTo(
    ex - headLen * Math.cos(angle + headAngle),
    ey - headLen * Math.sin(angle + headAngle)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Маркер начала стрелки (пока выбирается конец)
function drawArrowStartMarker(ctx) {
  if (!state.arrowStart) return;
  const { x, y } = state.arrowStart;
  const px = linePos(x);
  const py = linePos(y);
  const r  = CELL_SIZE * 0.46;
  ctx.save();
  ctx.strokeStyle = '#2196f3';
  ctx.lineWidth   = 3;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(px, py, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ─── Hover, последний ход, ко ─────────────────────────────────────
function drawHoverStone(ctx) {
  if (!state.hoveredCell || state.isGameOver) return;
  const { x, y } = state.hoveredCell;

  if (state.interactionMode === MODE_PLAY) {
    if (state.board[y]?.[x] !== EMPTY) return;
    drawStone(ctx, x, y, state.currentColor, 0.38);
  } else if (state.interactionMode === MODE_ADD_BLACK) {
    drawStone(ctx, x, y, BLACK, 0.45);
  } else if (state.interactionMode === MODE_ADD_WHITE) {
    drawStone(ctx, x, y, WHITE, 0.45);
  } else if (state.interactionMode === MODE_REMOVE) {
    if (state.board[y]?.[x] === EMPTY) return;
    const px = linePos(x);
    const py = linePos(y);
    const r  = CELL_SIZE * 0.46;
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(px - r * 0.6, py - r * 0.6);
    ctx.lineTo(px + r * 0.6, py + r * 0.6);
    ctx.moveTo(px + r * 0.6, py - r * 0.6);
    ctx.lineTo(px - r * 0.6, py + r * 0.6);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLastMoveMarker(ctx) {
  const node = state.currentNode;
  if (!node || node.moveNumber === 0 || !node.coords) return;
  const { x, y } = node.coords;
  const px = linePos(x);
  const py = linePos(y);
  const r  = CELL_SIZE * 0.18;
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.strokeStyle = node.color === BLACK ? '#fff' : '#333';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();
}

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
  if (x >= 0 && x < state.boardSize && y >= 0 && y < state.boardSize)
    return { x, y };
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
  if (coords) handleBoardClick(coords.x, coords.y);
}

function handleMouseMove(event) {
  const { px, py } = getEventPos(event);
  setHoveredCell(pixelToCoords(px, py));
}

function handleMouseLeave() { setHoveredCell(null); }

// ─── Реактивность ────────────────────────────────────────────────
watch(
  () => [state.board, state.hoveredCell, state.currentNode,
         state.ko, state.arrowStart, state.interactionMode],
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

.goboard-canvas { display: block; max-width: 100%; height: auto; }

.cursor-crosshair   { cursor: crosshair; }
.cursor-mark        { cursor: cell; }
.cursor-remove      { cursor: not-allowed; }
.cursor-arrow-start { cursor: copy; }
.cursor-arrow-end   { cursor: crosshair; }
</style>