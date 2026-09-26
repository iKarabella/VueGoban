<template>
	<div class="goboard-wrapper">
		<canvas
			ref="canvas"
			:width="canvasSize.w"
			:height="canvasSize.h"
			class="goboard-canvas"
			:class="cursorClass"
			@click="handleClick"
			@mousemove="handleMouseMove"
			@mouseleave="handleMouseLeave"
		/>
	</div>
</template>

<style scoped>
.goboard-wrapper {
	display: inline-block;
	border-radius: 4px;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}

.goboard-canvas     { display: block; max-width: 100%; height: auto; }
.cursor-crosshair   { cursor: crosshair; }
.cursor-mark        { cursor: cell; }
.cursor-remove      { cursor: not-allowed; }
.cursor-arrow-start { cursor: copy; }
.cursor-arrow-end   { cursor: crosshair; }
</style>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useGoGame } from '../core/useGoGame.js';
import { SGFParser } from '../core/SGFParser.js';

const props = defineProps({
	ignore_vw:        { type: Boolean, default: false },
	show_coordinates: { type: Boolean, default: true },
	prohibit_actions: { type: Boolean, default: false },
	min_side:         { type: Number,  default: null },
});

const emits = defineEmits(['madeMove']);

const {
	state, handleBoardClick, setHoveredCell,
	BLACK, WHITE, EMPTY,
	MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
	MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
} = useGoGame();

const canvas = ref(null);

// ─── Базовые константы (при scale = 1) ───────────────────────────
const BASE_CELL         = 36;   // расстояние между линиями сетки
const BASE_COORD_MARGIN = 48;   // ширина полосы под координаты
const BASE_EDGE_MARGIN  = 32;   // отступ до края canvas (без координат)
const OVERHANG_RATIO    = 0.45; // выпуск линии за обрезанный край (в клетках)
const BASE_FONT         = 13;

// ─── Видимый диапазон линий ───────────────────────────────────────
const visibleRange = computed(() => {
	const full = {
		minCol: 0, maxCol: state.boardSize - 1,
		minRow: 0, maxRow: state.boardSize - 1,
	};
	if (props.ignore_vw || !state.visiblePoints) return full;

	let minCol = Infinity, maxCol = -Infinity;
	let minRow = Infinity, maxRow = -Infinity;
	for (const key of state.visiblePoints) {
		const [x, y] = key.split(',').map(Number);
		minCol = Math.min(minCol, x); maxCol = Math.max(maxCol, x);
		minRow = Math.min(minRow, y); maxRow = Math.max(maxRow, y);
	}
	return minCol === Infinity ? full : { minCol, maxCol, minRow, maxRow };
});

const visibleCols = computed(() => visibleRange.value.maxCol - visibleRange.value.minCol + 1);
const visibleRows = computed(() => visibleRange.value.maxRow - visibleRange.value.minRow + 1);

// ─── Масштаб ─────────────────────────────────────────────────────
// Базовый размер доски при scale = 1
const basePad  = computed(() => props.show_coordinates ? BASE_COORD_MARGIN : BASE_EDGE_MARGIN);
const baseSize = computed(() => ({
	w: basePad.value * 2 + (visibleCols.value - 1) * BASE_CELL,
	h: basePad.value * 2 + (visibleRows.value - 1) * BASE_CELL,
}));

// Если задан min_side — подгоняем БОЛЬШУЮ сторону под него,
// тогда ни одна сторона не превысит min_side.
const scale = computed(() => {
	if (!props.min_side || props.min_side <= 0) return 1;
	const side = Math.max(baseSize.value.w, baseSize.value.h);
	return props.min_side / side;
});

// ─── Масштабированные размеры ────────────────────────────────────
const cell     = computed(() => BASE_CELL * scale.value);
const overhangLen = computed(() => cell.value * OVERHANG_RATIO);
const fontSize = computed(() => Math.max(8, BASE_FONT * scale.value));
const lw       = computed(() => Math.max(1, 2 * scale.value)); // базовая толщина линий меток

const pad = computed(() => {
	const c = basePad.value * scale.value;
	return { left: c, right: c, top: c, bottom: c };
});

const overhang = computed(() => {
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	const size = state.boardSize;
	const o = overhangLen.value;
	return {
		left:   minCol > 0        ? o : 0,
		right:  maxCol < size - 1 ? o : 0,
		top:    minRow > 0        ? o : 0,
		bottom: maxRow < size - 1 ? o : 0,
	};
});

// ─── Размер canvas ───────────────────────────────────────────────
// Math.floor гарантирует, что при заданном min_side ни одна сторона
// не превысит его (возможна недостача < 1px из-за округления).
const canvasSize = computed(() => {
	const w = pad.value.left + pad.value.right  + (visibleCols.value - 1) * cell.value;
	const h = pad.value.top  + pad.value.bottom + (visibleRows.value - 1) * cell.value;
	return { w: Math.floor(w), h: Math.floor(h) };
});

// ─── Перевод координат доски → пиксели ───────────────────────────
function lineX(col) {
	return pad.value.left + (col - visibleRange.value.minCol) * cell.value;
}
function lineY(row) {
	return pad.value.top  + (row - visibleRange.value.minRow) * cell.value;
}

// ─── Видимость точки ─────────────────────────────────────────────
function isVisible(x, y) {
	if (props.ignore_vw || !state.visiblePoints) return true;
	return state.visiblePoints.has(`${x},${y}`);
}
function inRange(x, y) {
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	return x >= minCol && x <= maxCol && y >= minRow && y <= maxRow;
}

// ─── Звёздные точки ──────────────────────────────────────────────
const starPoints = computed(() => {
	const s = state.boardSize;
	let pts = [];
	if (s === 19) pts = [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]];
	else if (s === 13) pts = [[3,3],[9,3],[3,9],[9,9],[6,6]];
	else if (s === 9)  pts = [[2,2],[6,2],[2,6],[6,6],[4,4]];
	return pts.filter(([col, row]) => inRange(col, row));
});

const cursorClass = computed(() => {
	switch (state.interactionMode) {
		case MODE_PLAY:   return 'cursor-crosshair';
		case MODE_REMOVE: return 'cursor-remove';
		case MODE_ARROW:  return state.arrowStart ? 'cursor-arrow-end' : 'cursor-arrow-start';
		default:          return 'cursor-mark';
	}
});

// ─── Отрисовка ───────────────────────────────────────────────────
function draw() {
	const ctx = canvas.value?.getContext('2d');
	if (!ctx) return;
	const { w, h } = canvasSize.value;
	ctx.clearRect(0, 0, w, h);
	drawBackground(ctx, w, h);
	drawGrid(ctx);
	drawStarPoints(ctx);
	if (props.show_coordinates) drawCoordinates(ctx);
	drawStones(ctx);
	drawMarks(ctx);
	drawArrows(ctx);
	drawHoverStone(ctx);
	drawLastMoveMarker(ctx);
	drawKoMarker(ctx);
	drawArrowStartMarker(ctx);
}

function drawBackground(ctx, w, h) {
	ctx.save();
	ctx.shadowColor = 'rgba(0,0,0,0.45)';
	ctx.shadowBlur  = 18;
	ctx.shadowOffsetX = 5;
	ctx.shadowOffsetY = 6;
	const grad = ctx.createLinearGradient(0, 0, w, h);
	grad.addColorStop(0, '#ddb96a');
	grad.addColorStop(1, '#c49a3c');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, w, h);
	ctx.restore();
}

function drawGrid(ctx) {
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	const oh = overhang.value;
	const x0 = lineX(minCol) - oh.left;
	const x1 = lineX(maxCol) + oh.right;
	const y0 = lineY(minRow) - oh.top;
	const y1 = lineY(maxRow) + oh.bottom;

	ctx.save();
	ctx.strokeStyle = '#5a3e1b';
	ctx.lineWidth   = Math.max(0.5, scale.value);
	for (let row = minRow; row <= maxRow; row++) {
		const py = lineY(row);
		ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
	}
	for (let col = minCol; col <= maxCol; col++) {
		const px = lineX(col);
		ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke();
	}
	ctx.restore();
}

function drawStarPoints(ctx) {
	ctx.save();
	ctx.fillStyle = '#5a3e1b';
	const r = Math.max(1.5, 4 * scale.value);
	for (const [col, row] of starPoints.value) {
		ctx.beginPath();
		ctx.arc(lineX(col), lineY(row), r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}

function drawCoordinates(ctx) {
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	const { w, h } = canvasSize.value;
	const letters  = 'ABCDEFGHJKLMNOPQRST';
	const p        = pad.value;

	const xNear = p.left / 2;
	const xFar  = w - p.right / 2;
	const yNear = p.top / 2;
	const yFar  = h - p.bottom / 2;

	ctx.save();
	ctx.fillStyle    = '#5a3e1b';
	ctx.font         = `bold ${fontSize.value}px Arial`;
	ctx.textAlign    = 'center';
	ctx.textBaseline = 'middle';

	for (let col = minCol; col <= maxCol; col++) {
		const px = lineX(col);
		ctx.fillText(letters[col], px, yNear);
		ctx.fillText(letters[col], px, yFar);
	}
	for (let row = minRow; row <= maxRow; row++) {
		const py  = lineY(row);
		const num = state.boardSize - row;
		ctx.fillText(num, xNear, py);
		ctx.fillText(num, xFar,  py);
	}
	ctx.restore();
}

function drawStones(ctx) {
	if (!state.board?.length) return;
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	for (let y = minRow; y <= maxRow; y++) {
		for (let x = minCol; x <= maxCol; x++) {
			if (!isVisible(x, y)) continue;
			const c = state.board[y]?.[x];
			if (c !== EMPTY && c !== undefined) drawStone(ctx, x, y, c);
		}
	}
}

function drawStone(ctx, x, y, color, alpha = 1) {
	const px = lineX(x), py = lineY(y);
	const r  = cell.value * 0.46;
	ctx.save();
	ctx.globalAlpha   = alpha;
	ctx.shadowColor   = 'rgba(0,0,0,0.5)';
	ctx.shadowBlur    = 6 * scale.value;
	ctx.shadowOffsetX = 2 * scale.value;
	ctx.shadowOffsetY = 3 * scale.value;
	const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.05, px, py, r);
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
	const p = state.currentNode?.properties;
	if (!p) return;
	if (p.TR) p.TR.forEach(sgf => drawMarkTR(ctx, sgf));
	if (p.SQ) p.SQ.forEach(sgf => drawMarkSQ(ctx, sgf));
	if (p.CR) p.CR.forEach(sgf => drawMarkCR(ctx, sgf));
	if (p.MA) p.MA.forEach(sgf => drawMarkMA(ctx, sgf));
}

function markColor(x, y) {
	const c = state.board[y]?.[x];
	if (c === BLACK) return '#ffffff';
	if (c === WHITE) return '#000000';
	return '#333333';
}

function drawMarkTR(ctx, sgf) {
	const c = SGFParser.sgfToCoords(sgf);
	if (!c || !isVisible(c.x, c.y)) return;
	const px = lineX(c.x), py = lineY(c.y), r = cell.value * 0.28;
	ctx.save();
	ctx.strokeStyle = markColor(c.x, c.y); ctx.lineWidth = lw.value;
	ctx.beginPath();
	ctx.moveTo(px, py - r);
	ctx.lineTo(px + r, py + r * 0.7);
	ctx.lineTo(px - r, py + r * 0.7);
	ctx.closePath(); ctx.stroke(); ctx.restore();
}

function drawMarkSQ(ctx, sgf) {
	const c = SGFParser.sgfToCoords(sgf);
	if (!c || !isVisible(c.x, c.y)) return;
	const px = lineX(c.x), py = lineY(c.y), r = cell.value * 0.24;
	ctx.save();
	ctx.strokeStyle = markColor(c.x, c.y); ctx.lineWidth = lw.value;
	ctx.strokeRect(px - r, py - r, r * 2, r * 2);
	ctx.restore();
}

function drawMarkCR(ctx, sgf) {
	const c = SGFParser.sgfToCoords(sgf);
	if (!c || !isVisible(c.x, c.y)) return;
	const px = lineX(c.x), py = lineY(c.y), r = cell.value * 0.26;
	ctx.save();
	ctx.strokeStyle = markColor(c.x, c.y); ctx.lineWidth = lw.value;
	ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
	ctx.restore();
}

function drawMarkMA(ctx, sgf) {
	const c = SGFParser.sgfToCoords(sgf);
	if (!c || !isVisible(c.x, c.y)) return;
	const px = lineX(c.x), py = lineY(c.y), r = cell.value * 0.24;
	ctx.save();
	ctx.strokeStyle = markColor(c.x, c.y); ctx.lineWidth = lw.value * 1.25; ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
	ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
	ctx.stroke(); ctx.restore();
}

// ─── Стрелки ─────────────────────────────────────────────────────
function drawArrows(ctx) {
	const p = state.currentNode?.properties;
	if (!p?.AR) return;
	for (const arrowSGF of p.AR) {
		const [fromSGF, toSGF] = arrowSGF.split(':');
		const from = SGFParser.sgfToCoords(fromSGF);
		const to   = SGFParser.sgfToCoords(toSGF);
		if (!from || !to || !isVisible(from.x, from.y) || !isVisible(to.x, to.y)) continue;
		drawArrow(ctx, lineX(from.x), lineY(from.y), lineX(to.x), lineY(to.y));
	}
}

function drawArrow(ctx, x1, y1, x2, y2, color = '#2196f3') {
	const headLen = 12 * scale.value, headAngle = Math.PI / 6;
	const angle   = Math.atan2(y2 - y1, x2 - x1);
	const r       = cell.value * 0.46;
	if (Math.hypot(x2 - x1, y2 - y1) < r * 2) return;
	const sx = x1 + Math.cos(angle) * r, sy = y1 + Math.sin(angle) * r;
	const ex = x2 - Math.cos(angle) * r, ey = y2 - Math.sin(angle) * r;
	ctx.save();
	ctx.strokeStyle = color; ctx.fillStyle = color;
	ctx.lineWidth = lw.value * 1.25; ctx.lineCap = 'round';
	ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
	ctx.beginPath(); ctx.moveTo(ex, ey);
	ctx.lineTo(ex - headLen * Math.cos(angle - headAngle), ey - headLen * Math.sin(angle - headAngle));
	ctx.lineTo(ex - headLen * Math.cos(angle + headAngle), ey - headLen * Math.sin(angle + headAngle));
	ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawArrowStartMarker(ctx) {
	if (!state.arrowStart || !isVisible(state.arrowStart.x, state.arrowStart.y)) return;
	const px = lineX(state.arrowStart.x), py = lineY(state.arrowStart.y);
	const r  = cell.value * 0.46;
	ctx.save();
	ctx.strokeStyle = '#2196f3'; ctx.lineWidth = lw.value * 1.5;
	ctx.setLineDash([4 * scale.value, 3 * scale.value]);
	ctx.beginPath(); ctx.arc(px, py, r + 3 * scale.value, 0, Math.PI * 2); ctx.stroke();
	ctx.restore();
}

// ─── Hover ───────────────────────────────────────────────────────
function drawHoverStone(ctx) {
	if (!state.hoveredCell || state.isGameOver) return;
	const { x, y } = state.hoveredCell;
	if (!isVisible(x, y)) return;
	if (state.interactionMode === MODE_PLAY) {
		if (state.board[y]?.[x] !== EMPTY) return;
		drawStone(ctx, x, y, state.currentColor, 0.38);
	} else if (state.interactionMode === MODE_ADD_BLACK) {
		drawStone(ctx, x, y, BLACK, 0.45);
	} else if (state.interactionMode === MODE_ADD_WHITE) {
		drawStone(ctx, x, y, WHITE, 0.45);
	} else if (state.interactionMode === MODE_REMOVE) {
		if (state.board[y]?.[x] === EMPTY) return;
		const px = lineX(x), py = lineY(y), r = cell.value * 0.46;
		ctx.save();
		ctx.strokeStyle = 'red'; ctx.lineWidth = lw.value * 1.5;
		ctx.globalAlpha = 0.7; ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(px - r * 0.6, py - r * 0.6); ctx.lineTo(px + r * 0.6, py + r * 0.6);
		ctx.moveTo(px + r * 0.6, py - r * 0.6); ctx.lineTo(px - r * 0.6, py + r * 0.6);
		ctx.stroke(); ctx.restore();
	}
}

function drawLastMoveMarker(ctx) {
	const node = state.currentNode;
	if (!node || node.moveNumber === 0 || !node.coords) return;
	const { x, y } = node.coords;
	if (!isVisible(x, y)) return;
	const px = lineX(x), py = lineY(y), r = cell.value * 0.18;
	ctx.save();
	ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
	ctx.strokeStyle = node.color === BLACK ? '#fff' : '#333';
	ctx.lineWidth = lw.value; ctx.stroke(); ctx.restore();
}

function drawKoMarker(ctx) {
	if (!state.ko || !isVisible(state.ko.x, state.ko.y)) return;
	const px = lineX(state.ko.x), py = lineY(state.ko.y), r = cell.value * 0.22;
	ctx.save();
	ctx.strokeStyle = 'red'; ctx.lineWidth = lw.value;
	ctx.strokeRect(px - r, py - r, r * 2, r * 2);
	ctx.restore();
}

// ─── Взаимодействие ──────────────────────────────────────────────
function pixelToCoords(px, py) {
	const { minCol, maxCol, minRow, maxRow } = visibleRange.value;
	const p   = pad.value;
	const col = Math.round((px - p.left) / cell.value) + minCol;
	const row = Math.round((py - p.top)  / cell.value) + minRow;
	if (col >= minCol && col <= maxCol && row >= minRow && row <= maxRow) {
		return { x: col, y: row };
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
	if (props.prohibit_actions) return;
	const { px, py } = getEventPos(event);
	const coords = pixelToCoords(px, py);
	if (coords && isVisible(coords.x, coords.y)) {
		const prevMoveNumber = state.currentNode?.moveNumber;
		handleBoardClick(coords.x, coords.y);
		if (state.interactionMode === MODE_PLAY &&
			state.currentNode?.moveNumber !== prevMoveNumber) {
			emits('madeMove');
		}
	}
}

function handleMouseMove(event) {
	if (props.prohibit_actions) return;
	const { px, py } = getEventPos(event);
	const coords = pixelToCoords(px, py);
	setHoveredCell(coords && isVisible(coords.x, coords.y) ? coords : null);
}

function handleMouseLeave() {
	if (props.prohibit_actions) return;
	setHoveredCell(null);
}

// ─── Реактивность ────────────────────────────────────────────────
watch(
	() => [state.boardSize, props.min_side, props.show_coordinates, props.ignore_vw],
	async () => { await nextTick(); draw(); }
);

watch(
	() => [
		state.board,
		state.hoveredCell,
		state.currentNode,
		state.ko,
		state.arrowStart,
		state.interactionMode,
		state.visiblePoints,
	],
	async () => { await nextTick(); draw(); },
	{ deep: true }
);

onMounted(draw);
</script>