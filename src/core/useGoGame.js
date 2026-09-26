import { reactive, computed } from 'vue';
import { GoEngine, BLACK, WHITE, EMPTY } from './GoEngine.js';
import { SGFParser } from './SGFParser.js';

export const MODE_PLAY      = 'play';
export const MODE_ADD_BLACK = 'add_black';
export const MODE_ADD_WHITE = 'add_white';
export const MODE_REMOVE    = 'remove';
export const MODE_MARK_TR   = 'mark_tr';
export const MODE_MARK_SQ   = 'mark_sq';
export const MODE_MARK_CR   = 'mark_cr';
export const MODE_MARK_MA   = 'mark_ma';
export const MODE_ARROW     = 'arrow';

const EXCLUSIVE_MARKS = ['TR', 'SQ', 'CR', 'MA'];

const MODE_TO_MARK = {
	[MODE_MARK_TR]: 'TR',
	[MODE_MARK_SQ]: 'SQ',
	[MODE_MARK_CR]: 'CR',
	[MODE_MARK_MA]: 'MA',
};

// Режимы в которых кнопка "Отмена" активна
export const UNDO_SUPPORTED_MODES = new Set([
	MODE_PLAY,
	MODE_MARK_TR,
	MODE_MARK_SQ,
	MODE_MARK_CR,
	MODE_MARK_MA,
	MODE_ARROW,
]);

/**
 * Типы действий, которые эмитятся через onAction и понимаются applyAction.
 * Удобно использовать в компоненте, чтобы отфильтровать «игровые» события
 * от служебных (чат, передача контроля и т.п.)
 */
export const ACTION_TYPES = new Set([
	'move', 'pass', 'undo_move',
	'add_stone', 'remove_stone',
	'mark_toggle', 'undo_marks',
	'arrow_add', 'undo_arrows',
	'set_vw', 'goto', 'comment',
	'new_game', 'load_sgf', 'end_game',
	'mode',
]);

// ─── Узлы дерева ─────────────────────────────────────────────────
let _idCounter = 0;
function makeId() { return ++_idCounter; }

function makeRootNode() {
	return {
		id:          makeId(),
		moveNumber:  0,
		color:       null,
		colorName:   null,
		coords:      null,
		comment:     '',
		captures:    0,
		timestamp:   Date.now(),
		parent:      null,
		children:    [],
		branchIndex: 0,
		properties:  {},
	};
}

function makeNode(parent, data) {
	return {
		id:          makeId(),
		moveNumber:  data.moveNumber ?? (parent.moveNumber + (data.isMove ? 1 : 0)),
		color:       data.color      ?? null,
		colorName:   data.colorName  ?? null,
		coords:      data.coords     ?? null,
		comment:     data.comment    ?? '',
		captures:    data.captures   ?? 0,
		timestamp:   Date.now(),
		parent,
		children:    [],
		branchIndex: parent.children.length,
		properties:  data.properties ?? {},
	};
}

function reindexChildren(node) {
	node.children.forEach((c, i) => { c.branchIndex = i; });
}

// ─── Пути ────────────────────────────────────────────────────────

export function pathToRoot(node) {
	const path = [];
	let cur = node;
	while (cur) { path.unshift(cur); cur = cur.parent; }
	return path;
}

export function flattenTree(root) {
	const rows = [];
	function dfs(node, depth) {
		rows.push({ node, depth });
		node.children.forEach(c => dfs(c, depth + 1));
	}
	dfs(root, 0);
	return rows;
}

/** Развёрнутый путь: массив branchIndex от корня до узла (оставлен для совместимости) */
export function nodePath(node) {
	const path = [];
	let cur = node;
	while (cur && cur.parent) { path.unshift(cur.branchIndex); cur = cur.parent; }
	return path;
}

/**
 * Компактный путь: RLE по branchIndex → [[branchIndex, count], ...]
 * [0,0,0,1,0,0] → [[0,3],[1,1],[0,2]]; 320 ходов главной линии → [[0,320]]
 */
export function compactPath(node) {
	const out = [];
	let cur = node;
	while (cur && cur.parent) {
		const b = cur.branchIndex;
		if (out.length && out[0][0] === b) out[0][1]++;
		else out.unshift([b, 1]);
		cur = cur.parent;
	}
	return out;
}

/** Найти узел по компактному пути. Возвращает null, если путь не существует в дереве */
export function nodeByCompactPath(root, cpath) {
	if (!root) return null;
	if (!Array.isArray(cpath)) return null;
	let cur = root;
	for (const step of cpath) {
		if (!Array.isArray(step) || step.length !== 2) return null;
		const [b, n] = step;
		for (let i = 0; i < n; i++) {
			cur = cur.children?.[b];
			if (!cur) return null;
		}
	}
	return cur;
}

/** Развёрнутый путь → компактный */
export function compressPath(flat) {
	const out = [];
	for (const b of flat ?? []) {
		const last = out[out.length - 1];
		if (last && last[0] === b) last[1]++;
		else out.push([b, 1]);
	}
	return out;
}

/** Компактный путь → развёрнутый */
export function expandPath(cpath) {
	const out = [];
	for (const [b, n] of cpath ?? []) for (let i = 0; i < n; i++) out.push(b);
	return out;
}

// ─── Setup → движок ──────────────────────────────────────────────

function applySetupToEngine(eng, props) {
	if (!props) return;
	if (props.AB) {
		for (const sgf of props.AB) {
			const c = SGFParser.sgfToCoords(sgf);
			if (c) eng.setStone(c.x, c.y, BLACK);
		}
	}
	if (props.AW) {
		for (const sgf of props.AW) {
			const c = SGFParser.sgfToCoords(sgf);
			if (c) eng.setStone(c.x, c.y, WHITE);
		}
	}
	if (props.AE) {
		for (const sgf of props.AE) {
			const c = SGFParser.sgfToCoords(sgf);
			if (c) eng.removeStone(c.x, c.y);
		}
	}
}

// ─── VW ──────────────────────────────────────────────────────────

export function parseVW(vwValues, boardSize) {
	if (!vwValues || vwValues.length === 0) return null;
	if (vwValues.length === 1 && vwValues[0] === '') return null;

	const visible = new Set();

	for (const val of vwValues) {
		if (val.includes(':')) {
			const [fromSGF, toSGF] = val.split(':');
			const from = SGFParser.sgfToCoords(fromSGF);
			const to   = SGFParser.sgfToCoords(toSGF);
			if (!from || !to) continue;

			const minX = Math.min(from.x, to.x), maxX = Math.max(from.x, to.x);
			const minY = Math.min(from.y, to.y), maxY = Math.max(from.y, to.y);

			for (let y = minY; y <= maxY; y++) {
				for (let x = minX; x <= maxX; x++) {
					if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
						visible.add(`${x},${y}`);
					}
				}
			}
		} else {
			const c = SGFParser.sgfToCoords(val);
			if (c && c.x >= 0 && c.x < boardSize && c.y >= 0 && c.y < boardSize) {
				visible.add(`${c.x},${c.y}`);
			}
		}
	}

	return visible.size > 0 ? visible : null;
}

export function buildVWString(visibleSet, boardSize) {
	if (!visibleSet || visibleSet.size === 0) return '';

	const points = [...visibleSet].map(k => {
		const [x, y] = k.split(',').map(Number);
		return { x, y };
	});

	const minX = Math.min(...points.map(p => p.x));
	const maxX = Math.max(...points.map(p => p.x));
	const minY = Math.min(...points.map(p => p.y));
	const maxY = Math.max(...points.map(p => p.y));

	if ((maxX - minX + 1) * (maxY - minY + 1) === points.length) {
		return `[${SGFParser.coordsToSGF(minX, minY)}:${SGFParser.coordsToSGF(maxX, maxY)}]`;
	}

	return points.map(p => `[${SGFParser.coordsToSGF(p.x, p.y)}]`).join('');
}

// ─── Состояние ───────────────────────────────────────────────────
const state = reactive({
	boardSize:   19,
	komi:        6.5,
	gameInfo: {
		playerBlack: 'Чёрные',
		playerWhite: 'Белые',
		date:        new Date().toISOString().split('T')[0],
		event:       '',
		result:      '',
	},

	rootNode:    makeRootNode(),
	currentNode: null,

	board:    [],
	captures: { [BLACK]: 0, [WHITE]: 0 },
	ko:       null,

	currentColor:      BLACK,
	isGameOver:        false,
	consecutivePasses: 0,

	interactionMode: MODE_PLAY,
	arrowStart:      null,

	visiblePoints: null,

	hoveredCell:   null,
	statusMessage: '',
	lastError:     '',
});

state.currentNode = state.rootNode;

let engine = new GoEngine(state.boardSize);

function syncBoard() {
	const s        = engine.getBoardState();
	state.board    = s.board;
	state.captures = s.captures;
	state.ko       = s.ko;
}

function syncVW() {
	let vwValues = null;
	for (const node of pathToRoot(state.currentNode)) {
		const props = node.properties || {};
		if (props.VW !== undefined) vwValues = props.VW;
	}
	state.visiblePoints = parseVW(vwValues, state.boardSize);
}

function replayTo(node) {
	engine = new GoEngine(state.boardSize);
	applySetupToEngine(engine, state.rootNode.properties);

	for (const n of pathToRoot(node).slice(1)) {
		applySetupToEngine(engine, n.properties || {});
		if (n.coords && (n.color === BLACK || n.color === WHITE)) {
			engine.placeStone(n.coords.x, n.coords.y, n.color);
		}
	}
	syncBoard();
}

syncBoard();

// ─── Шина событий действий ───────────────────────────────────────
const _actionListeners = new Set();
let _muted = 0; // > 0 — эмит подавлен (применяем чужое действие)

/**
 * @param {string} type    тип действия
 * @param {object} data    данные действия
 * @param {object|null} atNode  узел, В КОТОРОМ действие применено
 *                              (для move/pass — родитель нового узла; null — не важно)
 */
function emitAction(type, data = {}, atNode = state.currentNode) {
	if (_muted > 0) return;
	const payload = {
		type,
		data,
		at: atNode ? compactPath(atNode) : null,
		ts: Date.now(),
	};
	for (const cb of _actionListeners) {
		try { cb(payload); } catch (e) { console.error('[useGoGame] onAction listener error:', e); }
	}
}

// ─── Composable ──────────────────────────────────────────────────
export function useGoGame() {
	const moveNumber        = computed(() => state.currentNode?.moveNumber ?? 0);
	const currentColor      = computed(() => state.currentColor);
	const currentColorName  = computed(() => state.currentColor === BLACK ? 'Чёрные' : 'Белые');
	const currentPlayerName = computed(() =>
		state.currentColor === BLACK ? state.gameInfo.playerBlack : state.gameInfo.playerWhite
	);
	const capturesBlack  = computed(() => state.captures[BLACK]);
	const capturesWhite  = computed(() => state.captures[WHITE]);
	const currentNode    = computed(() => state.currentNode);
	const currentComment = computed({
		get: () => state.currentNode?.comment ?? '',
		set: (val) => setComment(val),
	});

	const canUndo = computed(() => {
		if (!UNDO_SUPPORTED_MODES.has(state.interactionMode)) return false;
		if (state.isGameOver) return false;

		if (state.interactionMode === MODE_PLAY) {
			return state.currentNode !== state.rootNode && state.currentNode.color !== null;
		}

		const props = state.currentNode?.properties || {};
		const mark  = MODE_TO_MARK[state.interactionMode];
		if (mark) return !!(props[mark]?.length);
		if (state.interactionMode === MODE_ARROW) return !!(props.AR?.length);
		return false;
	});

	const canRedo = computed(() => (state.currentNode?.children?.length ?? 0) > 0);

	const currentBranches = computed(() => state.currentNode?.children ?? []);
	const currentMarks    = computed(() => state.currentNode?.properties ?? {});
	const visiblePoints   = computed(() => state.visiblePoints);

	// ── Режим ────────────────────────────────────────────────────

	function setInteractionMode(mode) {
		state.interactionMode = mode;
		state.arrowStart      = null;
		setStatus(modeLabel(mode));
		emitAction('mode', { mode }, null);
	}

	function modeLabel(mode) {
		const labels = {
			[MODE_PLAY]:      'Режим: Сделать ход',
			[MODE_ADD_BLACK]: 'Режим: Поставить чёрный камень',
			[MODE_ADD_WHITE]: 'Режим: Поставить белый камень',
			[MODE_REMOVE]:    'Режим: Убрать камень',
			[MODE_MARK_TR]:   'Режим: Метка «Треугольник»',
			[MODE_MARK_SQ]:   'Режим: Метка «Квадрат»',
			[MODE_MARK_CR]:   'Режим: Метка «Круг»',
			[MODE_MARK_MA]:   'Режим: Метка «X»',
			[MODE_ARROW]:     'Режим: Стрелка',
		};
		return labels[mode] ?? mode;
	}

	function handleBoardClick(x, y) {
		switch (state.interactionMode) {
			case MODE_PLAY:       return placeStone(x, y);
			case MODE_ADD_BLACK:  return addSetupStone(x, y, BLACK);
			case MODE_ADD_WHITE:  return addSetupStone(x, y, WHITE);
			case MODE_REMOVE:     return removeSetupStone(x, y);
			case MODE_MARK_TR:    return toggleMark('TR', x, y);
			case MODE_MARK_SQ:    return toggleMark('SQ', x, y);
			case MODE_MARK_CR:    return toggleMark('CR', x, y);
			case MODE_MARK_MA:    return toggleMark('MA', x, y);
			case MODE_ARROW:      return handleArrowClick(x, y);
		}
	}

	// ── Ход ──────────────────────────────────────────────────────

	function placeStone(x, y, color = state.currentColor) {
		if (state.isGameOver) { setStatus('Игра завершена'); return false; }

		const parent = state.currentNode;

		const existingChild = parent.children.find(c =>
			c.coords && c.coords.x === x && c.coords.y === y && c.color === color
		);
		if (existingChild) {
			goToNode(existingChild, { silent: true });
			setStatus(`Ход ${existingChild.moveNumber}: переход к существующей ветке`);
			emitAction('move', { x, y, color }, parent);
			return true;
		}

		const result = engine.placeStone(x, y, color);
		if (!result.success) { setError(result.error); return false; }

		const node = makeNode(parent, {
			isMove:    true,
			color,
			colorName: color === BLACK ? 'black' : 'white',
			coords:    { x, y },
			captures:  result.captures,
			properties: { [color === BLACK ? 'B' : 'W']: [SGFParser.coordsToSGF(x, y)] },
		});

		parent.children.push(node);
		state.currentNode       = node;
		state.consecutivePasses = 0;
		state.currentColor      = color === BLACK ? WHITE : BLACK;

		syncBoard();
		syncVW();
		setStatus(`Ход ${node.moveNumber}: ${color === BLACK ? 'Чёрные' : 'Белые'} → (${x + 1}, ${y + 1})`);
		emitAction('move', { x, y, color }, parent);
		return true;
	}

	// ── Пас ──────────────────────────────────────────────────────

	function pass(color = state.currentColor) {
		if (state.isGameOver) return false;

		const parent = state.currentNode;

		const existingPass = parent.children.find(c => c.coords === null && c.color === color);
		if (existingPass) {
			goToNode(existingPass, { silent: true });
			setStatus(`Ход ${existingPass.moveNumber}: переход к существующему пасу`);
			emitAction('pass', { color }, parent);
			return true;
		}

		const node = makeNode(parent, {
			isMove:    true,
			color,
			colorName: color === BLACK ? 'black' : 'white',
			coords:    null,
			captures:  0,
			properties: { [color === BLACK ? 'B' : 'W']: [''] },
		});

		parent.children.push(node);
		state.currentNode       = node;
		state.consecutivePasses++;
		state.currentColor      = color === BLACK ? WHITE : BLACK;
		syncVW();
		setStatus(`Ход ${node.moveNumber}: ПАС`);
		emitAction('pass', { color }, parent);
		return true;
	}

	// ── Undo ─────────────────────────────────────────────────────

	function undo() {
		if (!canUndo.value) return false;
		const mode = state.interactionMode;
		if (mode === MODE_PLAY)   return _undoMove();
		if (MODE_TO_MARK[mode])   return _undoMarks(MODE_TO_MARK[mode]);
		if (mode === MODE_ARROW)  return _undoArrows();
		return false;
	}

	function _undoMove() {
		const node   = state.currentNode;
		const parent = node.parent;
		if (!parent) return false;

		const at = compactPath(node); // путь считаем ДО удаления

		parent.children = parent.children.filter(c => c.id !== node.id);
		reindexChildren(parent);

		replayTo(parent);
		state.currentNode       = parent;
		state.currentColor      = (parent.moveNumber % 2 === 0) ? BLACK : WHITE;
		state.consecutivePasses = 0;
		state.isGameOver        = false;

		syncVW();
		setStatus('Ход удалён');
		_emitRaw('undo_move', {}, at);
		return true;
	}

	function _undoMarks(type) {
		const props = state.currentNode.properties;
		if (!props[type]) return false;
		delete props[type];
		setStatus(`Все метки ${type} удалены`);
		emitAction('undo_marks', { type });
		return true;
	}

	function _undoArrows() {
		const props = state.currentNode.properties;
		if (!props.AR) return false;
		delete props.AR;
		setStatus('Все стрелки удалены');
		emitAction('undo_arrows');
		return true;
	}

	// вариант emitAction с уже посчитанным путём (узел мог быть удалён)
	function _emitRaw(type, data, at) {
		if (_muted > 0) return;
		const payload = { type, data, at, ts: Date.now() };
		for (const cb of _actionListeners) {
			try { cb(payload); } catch (e) { console.error('[useGoGame] onAction listener error:', e); }
		}
	}

	// ── Setup ────────────────────────────────────────────────────

	function addSetupStone(x, y, color) {
		const sgf      = SGFParser.coordsToSGF(x, y);
		const key      = color === BLACK ? 'AB' : 'AW';
		const otherKey = color === BLACK ? 'AW' : 'AB';
		const props    = state.currentNode.properties;

		if (props[otherKey]) {
			props[otherKey] = props[otherKey].filter(c => c !== sgf);
			if (props[otherKey].length === 0) delete props[otherKey];
		}
		if (props.AE) {
			props.AE = props.AE.filter(c => c !== sgf);
			if (props.AE.length === 0) delete props.AE;
		}

		props[key] ??= [];
		if (!props[key].includes(sgf)) props[key].push(sgf);

		engine.setStone(x, y, color);
		syncBoard();
		setStatus(`Камень ${color === BLACK ? 'чёрный' : 'белый'} добавлен: ${sgf}`);
		emitAction('add_stone', { x, y, color });
		return true;
	}

	function removeSetupStone(x, y) {
		if (state.board[y]?.[x] === EMPTY) { setError('Точка пуста'); return false; }

		const sgf   = SGFParser.coordsToSGF(x, y);
		const props = state.currentNode.properties;

		for (const k of ['AB', 'AW']) {
			if (props[k]) {
				props[k] = props[k].filter(c => c !== sgf);
				if (props[k].length === 0) delete props[k];
			}
		}

		props.AE ??= [];
		if (!props.AE.includes(sgf)) props.AE.push(sgf);

		engine.removeStone(x, y);
		syncBoard();
		setStatus(`Камень убран: ${sgf}`);
		emitAction('remove_stone', { x, y });
		return true;
	}

	// ── Метки ────────────────────────────────────────────────────

	function toggleMark(type, x, y) {
		const sgf   = SGFParser.coordsToSGF(x, y);
		const props = state.currentNode.properties;

		let wasRemoved = false;
		for (const mark of EXCLUSIVE_MARKS) {
			const idx = props[mark]?.indexOf(sgf) ?? -1;
			if (idx !== -1) {
				props[mark].splice(idx, 1);
				if (props[mark].length === 0) delete props[mark];
				if (mark === type) wasRemoved = true;
			}
		}

		if (wasRemoved) {
			setStatus(`Метка ${type} убрана`);
		} else {
			(props[type] ??= []).push(sgf);
			setStatus(`Метка ${type} добавлена`);
		}
		emitAction('mark_toggle', { type, x, y });
		return true;
	}

	// ── Стрелки ──────────────────────────────────────────────────

	function handleArrowClick(x, y) {
		if (!state.arrowStart) {
			state.arrowStart = { x, y };
			setStatus(`Стрелка: начало (${x + 1}, ${y + 1}). Кликните конец.`);
			return;
		}
		const from = state.arrowStart;
		state.arrowStart = null;
		return addArrow(from, { x, y });
	}

	function addArrow(from, to) {
		if (!from || !to) return false;
		if (from.x === to.x && from.y === to.y) {
			setError('Стрелка не может начинаться и заканчиваться в одной точке');
			return false;
		}

		const arrowSGF = `${SGFParser.coordsToSGF(from.x, from.y)}:${SGFParser.coordsToSGF(to.x, to.y)}`;
		const props    = state.currentNode.properties;

		props.AR ??= [];
		if (props.AR.includes(arrowSGF)) { setError('Такая стрелка уже существует'); return false; }

		props.AR.push(arrowSGF);
		setStatus('Стрелка добавлена');
		emitAction('arrow_add', { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } });
		return true;
	}

	// ── VW ───────────────────────────────────────────────────────

	function setVW(vwValues) {
		const props = state.currentNode.properties;

		if (!vwValues || vwValues.length === 0 || (vwValues.length === 1 && vwValues[0] === '')) {
			delete props.VW;
			syncVW();
			setStatus('VW очищен — вся доска видима');
			emitAction('set_vw', { vw: null });
		} else {
			props.VW            = [...vwValues];
			state.visiblePoints = parseVW(vwValues, state.boardSize);
			setStatus('VW обновлён');
			emitAction('set_vw', { vw: [...vwValues] });
		}
	}

	function cutBoard(padding = 2) {
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

		const take = (x, y) => {
			minX = Math.min(minX, x); maxX = Math.max(maxX, x);
			minY = Math.min(minY, y); maxY = Math.max(maxY, y);
		};

		function collectStones(node) {
			const props = node.properties || {};
			if (node.coords) take(node.coords.x, node.coords.y);
			for (const key of ['AB', 'AW']) {
				for (const sgf of props[key] ?? []) {
					const c = SGFParser.sgfToCoords(sgf);
					if (c) take(c.x, c.y);
				}
			}
			node.children.forEach(collectStones);
		}

		collectStones(state.rootNode);

		if (minX === Infinity) { setError('Нет камней на доске'); return; }

		const size = state.boardSize;
		const x0 = Math.max(0, minX - padding), y0 = Math.max(0, minY - padding);
		const x1 = Math.min(size - 1, maxX + padding), y1 = Math.min(size - 1, maxY + padding);

		const vwStr = `${SGFParser.coordsToSGF(x0, y0)}:${SGFParser.coordsToSGF(x1, y1)}`;
		setVW([vwStr]);
		setStatus(`VW установлен: ${vwStr} (отступ ${padding})`);
	}

	// ── Навигация ────────────────────────────────────────────────

	function goToNode(node, { silent = false } = {}) {
		if (!node) return false;

		replayTo(node);
		state.currentNode       = node;
		state.currentColor      = (node.moveNumber % 2 === 0) ? BLACK : WHITE;
		state.consecutivePasses = 0;
		state.isGameOver        = false;
		state.arrowStart        = null;
		syncVW();
		setStatus(node === state.rootNode ? 'Начало игры' : `Переход к ходу ${node.moveNumber}`);

		if (!silent) emitAction('goto', { to: compactPath(node) }, null);
		return true;
	}

	/** Переход по компактному пути [[branchIndex, count], ...] */
	function goToNodeByPath(to, opts) {
		const node = nodeByCompactPath(state.rootNode, to);
		if (!node) return false;
		return goToNode(node, opts);
	}

	function redo()      { return canRedo.value ? goToNode(state.currentNode.children[0]) : false; }
	function goToStart() { goToNode(state.rootNode); }
	function goToEnd()   {
		let node = state.currentNode;
		while (node.children.length > 0) node = node.children[0];
		goToNode(node);
	}
	function nextMove()  { if (canRedo.value) goToNode(state.currentNode.children[0]); }
	function prevMove()  { if (state.currentNode?.parent) goToNode(state.currentNode.parent); }

	// ── Завершение ───────────────────────────────────────────────

	function endGame(result) {
		state.isGameOver      = true;
		state.gameInfo.result = result ?? '';
		setStatus(`Игра завершена: ${formatResult(result)}`);
		emitAction('end_game', { result: state.gameInfo.result }, null);
	}

	function resign() {
		endGame(`${state.currentColor === BLACK ? 'W' : 'B'}+R`);
	}

	function formatResult(result) {
		if (!result || result === '') return 'Нет результата';
		if (result === '0' || result.toLowerCase() === 'draw') return 'Ничья';
		if (result === '?') return 'Неизвестно';
		const m = result.match(/^([BW])\+(.+)$/i);
		if (!m) return result;
		const winner = m[1].toUpperCase() === 'B' ? 'Чёрные' : 'Белые';
		const reason = m[2];
		if (/^R(esign)?$/i.test(reason))  return `${winner} выиграли (сдача)`;
		if (/^T(ime)?$/i.test(reason))    return `${winner} выиграли (время)`;
		if (/^F(orfeit)?$/i.test(reason)) return `${winner} выиграли (штраф)`;
		const score = parseFloat(reason);
		if (!isNaN(score)) return `${winner} выиграли (+${score})`;
		return `${winner} выиграли`;
	}

	// ── Новая игра ───────────────────────────────────────────────

	function newGame(options = {}, { silent = false } = {}) {
		const { size = 19, komi = 6.5, playerBlack, playerWhite } = options;
		state.boardSize = size;
		state.komi      = komi;
		if (playerBlack) state.gameInfo.playerBlack = playerBlack;
		if (playerWhite) state.gameInfo.playerWhite = playerWhite;
		state.gameInfo.result = '';

		engine = new GoEngine(size);

		const root              = makeRootNode();
		state.rootNode          = root;
		state.currentNode       = root;
		state.currentColor      = BLACK;
		state.isGameOver        = false;
		state.consecutivePasses = 0;
		state.visiblePoints     = null;
		state.hoveredCell       = null;
		state.arrowStart        = null;
		state.interactionMode   = MODE_PLAY;
		state.lastError         = '';

		syncBoard();
		setStatus('Новая игра начата');
		if (!silent) emitAction('new_game', {
			size:        state.boardSize,
			komi:        state.komi,
			playerBlack: state.gameInfo.playerBlack,
			playerWhite: state.gameInfo.playerWhite,
		}, null);
	}

	// ── SGF ──────────────────────────────────────────────────────

	function loadSGF(sgfString, last_position = false, { silent = false } = {}) {
		try {
			const parser  = new SGFParser();
			const sgfRoot = parser.parse(sgfString);
			if (!sgfRoot) throw new Error('Не удалось разобрать SGF');

			const props = sgfRoot.properties || {};

			newGame({
				size:        props.SZ ? parseInt(props.SZ[0])   : 19,
				komi:        props.KM ? parseFloat(props.KM[0]) : 6.5,
				playerBlack: props.PB?.[0],
				playerWhite: props.PW?.[0],
			}, { silent: true });

			if (props.DT) state.gameInfo.date   = props.DT[0];
			if (props.EV) state.gameInfo.event  = props.EV[0];
			if (props.RE) state.gameInfo.result = props.RE[0];

			state.rootNode.properties = { ...props };
			state.rootNode.comment    = sgfRoot.comment || props.C?.[0] || '';

			applySetupToEngine(engine, props);
			syncBoard();
			syncVW();

			_buildTreeFromSGF(sgfRoot, state.rootNode);

			if (last_position) {
				let lastNode = state.rootNode;
				while (lastNode.children.length > 0) lastNode = lastNode.children[0];
				goToNode(lastNode, { silent: true });
			}

			setStatus('SGF загружен');
			if (!silent) emitAction('load_sgf', { sgf: sgfString, lastPosition: !!last_position }, null);
			return true;
		} catch (e) {
			setError(`Ошибка загрузки SGF: ${e.message}`);
			console.error(e);
			return false;
		}
	}

	function _buildTreeFromSGF(sgfNode, parentGameNode) {
		for (const sgfChild of sgfNode.children) {
			const props = sgfChild.properties || {};

			let color = null, coords = null, isMove = false;

			if (props.B !== undefined) {
				color = BLACK; coords = SGFParser.sgfToCoords(props.B[0]); isMove = true;
			} else if (props.W !== undefined) {
				color = WHITE; coords = SGFParser.sgfToCoords(props.W[0]); isMove = true;
			}

			const hasSetup   = !!(props.AB || props.AW || props.AE);
			const hasMarks   = !!(props.TR || props.SQ || props.CR || props.MA || props.AR);
			const hasVW      = !!props.VW;
			const hasComment = !!(sgfChild.comment || props.C?.[0]);

			if (!isMove && !hasSetup && !hasMarks && !hasVW && !hasComment) {
				_buildTreeFromSGF(sgfChild, parentGameNode);
				continue;
			}

			const gameNode = {
				id:          makeId(),
				moveNumber:  isMove ? parentGameNode.moveNumber + 1 : parentGameNode.moveNumber,
				color,
				colorName:   color === BLACK ? 'black' : color === WHITE ? 'white' : null,
				coords,
				comment:     sgfChild.comment || props.C?.[0] || '',
				captures:    0,
				timestamp:   Date.now(),
				parent:      parentGameNode,
				children:    [],
				branchIndex: parentGameNode.children.length,
				properties:  { ...props },
			};

			parentGameNode.children.push(gameNode);
			_buildTreeFromSGF(sgfChild, gameNode);
		}
	}

	function exportSGF() {
		return SGFParser.generateFromTree(state.rootNode, {
			size:        state.boardSize,
			komi:        state.komi,
			playerBlack: state.gameInfo.playerBlack,
			playerWhite: state.gameInfo.playerWhite,
			result:      state.gameInfo.result,
		});
	}

	// ── Прочее ───────────────────────────────────────────────────

	function setComment(comment) {
		if (!state.currentNode) return;
		if (state.currentNode.comment === comment) return;
		state.currentNode.comment = comment;
		emitAction('comment', { comment });
	}
	function setHoveredCell(cell) { state.hoveredCell = cell; }
	function setStatus(msg)       { state.statusMessage = msg; state.lastError = ''; }
	function setError(msg)        { state.lastError = msg; state.statusMessage = ''; }

	function onAction(cb) {
		_actionListeners.add(cb);
		return () => _actionListeners.delete(cb);
	}

	// ── Применение удалённого действия ───────────────────────────

	/**
	 * Применить действие, пришедшее по websocket. Ничего не эмитит.
	 * @returns {boolean} false — если действие не удалось применить
	 *                    (например, узел `at` не найден → нужен ресинк).
	 */
	function applyAction(action) {
		const { type, data = {}, at } = action ?? {};
		if (!type) return false;

		_muted++;
		try {
			// Действия без привязки к узлу
			switch (type) {
				case 'goto':     return goToNodeByPath(data.to);
				case 'new_game': newGame(data); return true;
				case 'load_sgf': return loadSGF(data.sgf, !!data.lastPosition);
				case 'end_game': endGame(data.result); return true;
				case 'mode':     setInteractionMode(data.mode); return true;
			}

			// Остальные применяются в конкретном узле
			if (at) {
				const atNode = nodeByCompactPath(state.rootNode, at);
				if (!atNode) {
					console.warn('[useGoGame] applyAction: узел не найден', action);
					return false;
				}
				if (atNode !== state.currentNode) goToNode(atNode);
			}

			switch (type) {
				case 'move':         return placeStone(data.x, data.y, data.color ?? state.currentColor);
				case 'pass':         return pass(data.color ?? state.currentColor);
				case 'undo_move':    return _undoMove();
				case 'add_stone':    return addSetupStone(data.x, data.y, data.color);
				case 'remove_stone': return removeSetupStone(data.x, data.y);
				case 'mark_toggle':  return toggleMark(data.type, data.x, data.y);
				case 'arrow_add':    return addArrow(data.from, data.to);
				case 'undo_marks':   return _undoMarks(data.type);
				case 'undo_arrows':  return _undoArrows();
				case 'set_vw':       setVW(data.vw ?? []); return true;
				case 'comment':      setComment(data.comment ?? ''); return true;
				default:
					console.warn('[useGoGame] applyAction: неизвестный тип', type);
					return false;
			}
		} finally {
			_muted--;
		}
	}

	return {
		state,
		moveNumber, currentColor, currentColorName, currentPlayerName,
		capturesBlack, capturesWhite, currentNode, currentComment,
		canUndo, canRedo, currentBranches, currentMarks, visiblePoints,
		BLACK, WHITE, EMPTY,
		MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
		MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
		UNDO_SUPPORTED_MODES, ACTION_TYPES,
		onAction, applyAction,
		nodePath, compactPath, nodeByCompactPath, compressPath, expandPath, goToNodeByPath,
		handleBoardClick, placeStone, pass, undo, redo,
		goToNode, goToStart, goToEnd, nextMove, prevMove,
		endGame, resign, formatResult,
		newGame, setComment, setHoveredCell,
		loadSGF, exportSGF,
		setInteractionMode,
		addArrow, setVW, cutBoard,
		pathToRoot, flattenTree,
		parseVW, buildVWString,
	};
}