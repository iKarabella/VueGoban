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

// Режимы в которых кнопка "Отмена" активна
export const UNDO_SUPPORTED_MODES = new Set([
	MODE_PLAY,
	MODE_MARK_TR,
	MODE_MARK_SQ,
	MODE_MARK_CR,
	MODE_MARK_MA,
	MODE_ARROW,
]);

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

// ─── Парсинг VW ──────────────────────────────────────────────────
// VW[aa:bi][ga:ia][gb][ib]
// Возвращает Set строк "x,y" видимых точек, или null если VW не задан
export function parseVW(vwValues, boardSize) {
	if (!vwValues || vwValues.length === 0) return null;

	// VW[] — очистка (вся доска видима)
	if (vwValues.length === 1 && vwValues[0] === '') return null;

	const visible = new Set();

	for (const val of vwValues) {
		if (val.includes(':')) {
		// Прямоугольная область aa:bi
		const [fromSGF, toSGF] = val.split(':');
		const from = SGFParser.sgfToCoords(fromSGF);
		const to   = SGFParser.sgfToCoords(toSGF);
		if (!from || !to) continue;

		const minX = Math.min(from.x, to.x);
		const maxX = Math.max(from.x, to.x);
		const minY = Math.min(from.y, to.y);
		const maxY = Math.max(from.y, to.y);

		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x++) {
			if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
				visible.add(`${x},${y}`);
			}
			}
		}
		} else {
		// Одна точка
		const c = SGFParser.sgfToCoords(val);
		if (c && c.x >= 0 && c.x < boardSize && c.y >= 0 && c.y < boardSize) {
			visible.add(`${c.x},${c.y}`);
		}
		}
	}

	return visible.size > 0 ? visible : null;
}

// Генерация SGF-строки VW из Set видимых точек
// Пытается найти прямоугольник (если все точки образуют прямоугольник)
// иначе перечисляет точки по одной
export function buildVWString(visibleSet, boardSize) {
		if (!visibleSet || visibleSet.size === 0) return '';

		const points = [...visibleSet].map(k => {
			const [x, y] = k.split(',').map(Number);
			return { x, y };
		});

		// Проверяем: образуют ли точки прямоугольник
		const minX = Math.min(...points.map(p => p.x));
		const maxX = Math.max(...points.map(p => p.x));
		const minY = Math.min(...points.map(p => p.y));
		const maxY = Math.max(...points.map(p => p.y));

		const rectSize = (maxX - minX + 1) * (maxY - minY + 1);

		if (rectSize === points.length) {
			// Все точки образуют прямоугольник
			const from = SGFParser.coordsToSGF(minX, minY);
			const to   = SGFParser.coordsToSGF(maxX, maxY);
			return `[${from}:${to}]`;
		}

		// Иначе — перечисляем по одной
		return points.map(p => `[${SGFParser.coordsToSGF(p.x, p.y)}]`)
					.join('');
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

		// VW: Set<"x,y"> видимых точек или null (вся доска)
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

	syncBoard();

	// Обновить visiblePoints из текущего узла (ищем VW вверх по дереву)
	function syncVW() {
		// Ищем VW в пути от корня до текущего узла (последнее встреченное)
		const path = pathToRoot(state.currentNode);
		let vwValues = null;

		for (const node of path) {
			const props = node.properties || {};
			if (props.VW !== undefined) {
			vwValues = props.VW;
			}
		}

		state.visiblePoints = parseVW(vwValues, state.boardSize);
	}

	function replayTo(node) {
		engine = new GoEngine(state.boardSize);

		applySetupToEngine(engine, state.rootNode.properties);

		const path = pathToRoot(node).slice(1);
		for (const n of path) {
			const props = n.properties || {};
			applySetupToEngine(engine, props);
			if (n.coords && (n.color === BLACK || n.color === WHITE)) {
			engine.placeStone(n.coords.x, n.coords.y, n.color);
			}
		}

		syncBoard();
	}

	// ─── Composable ──────────────────────────────────────────────────
	export function useGoGame() {
		const moveNumber        = computed(() => state.currentNode?.moveNumber ?? 0);
		const currentColor      = computed(() => state.currentColor);
		const currentColorName  = computed(() =>
			state.currentColor === BLACK ? 'Чёрные' : 'Белые'
		);
		const currentPlayerName = computed(() =>
			state.currentColor === BLACK
			? state.gameInfo.playerBlack
			: state.gameInfo.playerWhite
		);
		const capturesBlack  = computed(() => state.captures[BLACK]);
		const capturesWhite  = computed(() => state.captures[WHITE]);
		const currentNode    = computed(() => state.currentNode);
		const currentComment = computed({
			get: () => state.currentNode?.comment ?? '',
			set: (val) => { if (state.currentNode) state.currentNode.comment = val; },
		});

		// canUndo зависит от режима
		const canUndo = computed(() => {
			if (!UNDO_SUPPORTED_MODES.has(state.interactionMode)) return false;
			if (state.isGameOver) return false;

			if (state.interactionMode === MODE_PLAY) {
			// Можно отменить только если текущий узел — ход (не setup)
			return (
				state.currentNode !== state.rootNode &&
				state.currentNode.color !== null
			);
		}

		// Для режимов меток — можно если есть хоть одна метка/стрелка
		const props = state.currentNode?.properties || {};
		if (state.interactionMode === MODE_MARK_TR) return !!(props.TR?.length);
		if (state.interactionMode === MODE_MARK_SQ) return !!(props.SQ?.length);
		if (state.interactionMode === MODE_MARK_CR) return !!(props.CR?.length);
		if (state.interactionMode === MODE_MARK_MA) return !!(props.MA?.length);
		if (state.interactionMode === MODE_ARROW)   return !!(props.AR?.length);

		return false;
	});

	const canRedo = computed(() =>
		(state.currentNode?.children?.length ?? 0) > 0
	);

	const currentBranches = computed(() => state.currentNode?.children ?? []);
	const currentMarks    = computed(() => state.currentNode?.properties ?? {});
	const visiblePoints   = computed(() => state.visiblePoints);

	// ── Режим ────────────────────────────────────────────────────

	function setInteractionMode(mode) {
		state.interactionMode = mode;
		state.arrowStart      = null;
		setStatus(modeLabel(mode));
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

	function placeStone(x, y) {
		if (state.isGameOver) { 
			setStatus('Игра завершена')
			return false
		}
	  
		const existingChild = state.currentNode.children.find(child =>
			child.coords &&
			child.coords.x === x &&
			child.coords.y === y &&
			child.color === state.currentColor
		)
	  
		if (existingChild) {
			goToNode(existingChild)
			setStatus(`Ход ${existingChild.moveNumber}: переход к существующей ветке`)
			return true
		}
	  
		const result = engine.placeStone(x, y, state.currentColor)
		if (!result.success) 
		{ 
			setError(result.error) 
			return false 
		}
	  
		const colorKey = state.currentColor === BLACK ? 'B' : 'W'
		const sgfCoord = SGFParser.coordsToSGF(x, y)
	  
		const node = makeNode(state.currentNode, {
			isMove:    true,
			color:     state.currentColor,
			colorName: state.currentColor === BLACK ? 'black' : 'white',
			coords:    { x, y },
			captures:  result.captures,
			properties: {
				[colorKey]: [sgfCoord],   // ← записываем ход в properties
			},
		});
	  
		state.currentNode.children.push(node)
		state.currentNode       = node
		state.consecutivePasses = 0
		state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK
	  
		syncBoard()
		setStatus(`Ход ${node.moveNumber}: ${node.colorName === 'black' ? 'Чёрные' : 'Белые'} → (${x + 1}, ${y + 1})`)
		return true
	}

	// ── Undo — зависит от режима ─────────────────────────────────

	function undo() {
		if (!canUndo.value) return false;

		const mode = state.interactionMode;

		if (mode === MODE_PLAY) {
			return _undoMove();
		}

		if ([MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA].includes(mode)) {
			return _undoMarks(mode);
		}

		if (mode === MODE_ARROW) {
			return _undoArrows();
		}

		return false;
	}

	// Удалить текущий ход и вернуться к предыдущему узлу
	function _undoMove() {
		const node   = state.currentNode;
		const parent = node.parent;
		if (!parent) return false;

		// Удаляем узел из дочерних родителя
		parent.children = parent.children.filter(c => c.id !== node.id);

		// Переходим к родителю
		replayTo(parent);
		state.currentNode       = parent;
		state.currentColor      = (parent.moveNumber % 2 === 0) ? BLACK : WHITE;
		state.consecutivePasses = 0;
		state.isGameOver        = false;

		syncVW();
		setStatus('Ход удалён');
		return true;
	}

	// Очистить все метки текущего типа в текущем узле
	function _undoMarks(mode) {
		const typeMap = {
			[MODE_MARK_TR]: 'TR',
			[MODE_MARK_SQ]: 'SQ',
			[MODE_MARK_CR]: 'CR',
			[MODE_MARK_MA]: 'MA',
		};
		const type  = typeMap[mode];
		const props = state.currentNode.properties;
		if (props[type]) {
			delete props[type];
			setStatus(`Все метки ${type} удалены`);
			return true;
		}
		return false;
	}

	// Удалить все стрелки текущего узла
	function _undoArrows() {
		const props = state.currentNode.properties;
		if (props.AR) {
			delete props.AR;
			setStatus('Все стрелки удалены');
			return true;
		}
		return false;
	}

	// ── Пас ──────────────────────────────────────────────────────

	function pass() {
		if (state.isGameOver) return
	  
		const existingPass = state.currentNode.children.find(child =>
			child.coords === null &&
			child.color === state.currentColor
		)
	  
		if (existingPass) {
			goToNode(existingPass)
			setStatus(`Ход ${existingPass.moveNumber}: переход к существующему пасу`)
			return
		}
	  
		const colorKey = state.currentColor === BLACK ? 'B' : 'W'
	  
		const node = makeNode(state.currentNode, {
			isMove:    true,
			color:     state.currentColor,
			colorName: state.currentColor === BLACK ? 'black' : 'white',
			coords:    null,
			captures:  0,
			properties: {
				[colorKey]: [''],   // ← пас = пустая строка в SGF
			},
		});
	  
		state.currentNode.children.push(node)
		state.currentNode       = node
		state.consecutivePasses++
		state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK
		setStatus(`Ход ${node.moveNumber}: ПАС`)
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

		if (!props[key]) props[key] = [];
		if (!props[key].includes(sgf)) props[key].push(sgf);

		engine.setStone(x, y, color);
		syncBoard();
		setStatus(`Камень ${color === BLACK ? 'чёрный' : 'белый'} добавлен: ${sgf}`);
		return true;
	}

	function removeSetupStone(x, y) {
		if (state.board[y]?.[x] === EMPTY) { setError('Точка пуста'); return false; }

		const sgf   = SGFParser.coordsToSGF(x, y);
		const props = state.currentNode.properties;

		['AB', 'AW'].forEach(k => {
			if (props[k]) {
				props[k] = props[k].filter(c => c !== sgf);
				if (props[k].length === 0) delete props[k];
			}
		});

		if (!props.AE) props.AE = [];
		if (!props.AE.includes(sgf)) props.AE.push(sgf);

		engine.removeStone(x, y);
		syncBoard();
		setStatus(`Камень убран: ${sgf}`);
		return true;
	}

	// ── Метки ────────────────────────────────────────────────────

	function toggleMark(type, x, y) {
		const sgf   = SGFParser.coordsToSGF(x, y);
		const props = state.currentNode.properties;

		let wasRemoved = false;
		for (const mark of EXCLUSIVE_MARKS) {
			if (props[mark]) {
				const idx = props[mark].indexOf(sgf);
				if (idx !== -1) {
				props[mark].splice(idx, 1);
				if (props[mark].length === 0) delete props[mark];
				if (mark === type) wasRemoved = true;
				}
			}
		}

		if (wasRemoved) { setStatus(`Метка ${type} убрана`); return; }

		if (!props[type]) props[type] = [];
		props[type].push(sgf);
		setStatus(`Метка ${type} добавлена`);
	}

	// ── Стрелки ──────────────────────────────────────────────────

	function handleArrowClick(x, y) {
		if (!state.arrowStart) {
			state.arrowStart = { x, y };
			setStatus(`Стрелка: начало (${x + 1}, ${y + 1}). Кликните конец.`);
		} else {
			const from = state.arrowStart;
			const to   = { x, y };
			state.arrowStart = null;

			if (from.x === to.x && from.y === to.y) {
				setError('Стрелка не может начинаться и заканчиваться в одной точке');
				return;
			}

			const arrowSGF = `${SGFParser.coordsToSGF(from.x, from.y)}:${SGFParser.coordsToSGF(to.x, to.y)}`;
			const props    = state.currentNode.properties;

			if (!props.AR) props.AR = [];
			if (props.AR.includes(arrowSGF)) { setError('Такая стрелка уже существует'); return; }

			props.AR.push(arrowSGF);
			setStatus('Стрелка добавлена');
		}
	}

	// ── VW ───────────────────────────────────────────────────────

	/**
	* Установить VW вручную (массив SGF-строк)
	* Например: ['aa:bi', 'ga:ia', 'gb']
	* Передать [] или [''] — очистить VW (вся доска видима)
	*/
	function setVW(vwValues) {
		const props = state.currentNode.properties;

		if (!vwValues || vwValues.length === 0 || (vwValues.length === 1 && vwValues[0] === '')) {
			// Очищаем VW
			delete props.VW;
			state.visiblePoints = null;
			setStatus('VW очищен — вся доска видима');
		} else {
			props.VW            = vwValues;
			state.visiblePoints = parseVW(vwValues, state.boardSize);
			setStatus('VW обновлён');
		}
	}

	/**
	 * Вычислить VW автоматически по занятым камнями точкам.
	 * @param {number} padding — отступ от крайних камней (по умолчанию 2)
	 */
	function cutBoard(padding = 2) {
		// Собираем все координаты камней из всего дерева
		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		function collectStones(node) {
			const props = node.properties || {};

			// Камни из ходов
			if (node.coords) {
				minX = Math.min(minX, node.coords.x);
				maxX = Math.max(maxX, node.coords.x);
				minY = Math.min(minY, node.coords.y);
				maxY = Math.max(maxY, node.coords.y);
			}

			// Камни из AB/AW
			for (const key of ['AB', 'AW']) {
				if (props[key]) {
				for (const sgf of props[key]) {
					const c = SGFParser.sgfToCoords(sgf);
					if (c) {
					minX = Math.min(minX, c.x);
					maxX = Math.max(maxX, c.x);
					minY = Math.min(minY, c.y);
					maxY = Math.max(maxY, c.y);
					}
				}
				}
			}

			node.children.forEach(collectStones);
		}

		collectStones(state.rootNode);

		if (minX === Infinity) {
			setError('Нет камней на доске');
			return;
		}

		// Применяем отступ и зажимаем в границы доски
		const size = state.boardSize;
		const x0   = Math.max(0,        minX - padding);
		const y0   = Math.max(0,        minY - padding);
		const x1   = Math.min(size - 1, maxX + padding);
		const y1   = Math.min(size - 1, maxY + padding);

		const fromSGF = SGFParser.coordsToSGF(x0, y0);
		const toSGF   = SGFParser.coordsToSGF(x1, y1);
		const vwStr   = `${fromSGF}:${toSGF}`;

		setVW([vwStr]);
		setStatus(`VW установлен: ${vwStr} (отступ ${padding})`);
	}

	// ── Навигация ────────────────────────────────────────────────

	function goToNode(node) {
		if (!node) return;
		replayTo(node);
		state.currentNode       = node;
		state.currentColor      = (node.moveNumber % 2 === 0) ? BLACK : WHITE;
		state.consecutivePasses = 0;
		state.isGameOver        = false;
		state.arrowStart        = null;
		syncVW();
		setStatus(
		node === state.rootNode
			? 'Начало игры'
			: `Переход к ходу ${node.moveNumber}`
		);
	}

	function redo()      { if (canRedo.value) { goToNode(state.currentNode.children[0]); return true; } return false; }
	function goToStart() { goToNode(state.rootNode); }
	function goToEnd()   {
		let node = state.currentNode;
		while (node.children.length > 0) node = node.children[0];
		goToNode(node);
	}
	function nextMove()  { if (canRedo.value)  goToNode(state.currentNode.children[0]); }
	function prevMove()  { if (canUndo.value && state.interactionMode === MODE_PLAY) goToNode(state.currentNode.parent); }

	// ── Завершение ───────────────────────────────────────────────

	function endGame(result) {
		state.isGameOver      = true;
		state.gameInfo.result = result ?? '';
		setStatus(`Игра завершена: ${formatResult(result)}`);
	}

	function resign() {
		const winner = state.currentColor === BLACK ? 'W' : 'B';
		endGame(`${winner}+R`);
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

	function newGame(options = {}) {
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
	}

	// ── SGF ──────────────────────────────────────────────────────

	function loadSGF(sgfString, last_position = false) {
		try {
			const parser  = new SGFParser();
			const sgfRoot = parser.parse(sgfString);
			if (!sgfRoot) throw new Error('Не удалось разобрать SGF');
	
			const props = sgfRoot.properties || {};
	
			newGame({
				size:        props.SZ  ? parseInt(props.SZ[0])   : 19,
				komi:        props.KM  ? parseFloat(props.KM[0]) : 6.5,
				playerBlack: props.PB?.[0],
				playerWhite: props.PW?.[0],
			});
	
			if (props.DT) state.gameInfo.date   = props.DT[0];
			if (props.EV) state.gameInfo.event  = props.EV[0];
			if (props.RE) state.gameInfo.result = props.RE[0];
	
			state.rootNode.properties = { ...props };
			state.rootNode.comment    = sgfRoot.comment || props.C?.[0] || '';
	
			applySetupToEngine(engine, props);
			syncBoard();
	
			// Применяем VW из корневого узла
			if (props.VW) {
				state.visiblePoints = parseVW(props.VW, state.boardSize);
			}
	
			_buildTreeFromSGF(sgfRoot, state.rootNode);
	
			// Если last_position=true — переходим к последнему узлу главной ветки
			if (last_position) {
				let lastNode = state.rootNode;
				while (lastNode.children && lastNode.children.length > 0) {
					lastNode = lastNode.children[0];
				}
				goToNode(lastNode);
			}
	
			setStatus('SGF загружен');
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

			let color  = null;
			let coords = null;
			let isMove = false;

			if (props.B !== undefined) {
				color  = BLACK;
				coords = SGFParser.sgfToCoords(props.B[0]);
				isMove = true;
			} else if (props.W !== undefined) {
				color  = WHITE;
				coords = SGFParser.sgfToCoords(props.W[0]);
				isMove = true;
			}

			const hasSetup   = !!(props.AB || props.AW || props.AE);
			const hasMarks   = !!(props.TR || props.SQ || props.CR || props.MA || props.AR);
			const hasVW      = !!(props.VW);
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

	function setComment(comment)  { if (state.currentNode) state.currentNode.comment = comment; }
	function setHoveredCell(cell) { state.hoveredCell = cell; }
	function setStatus(msg)       { state.statusMessage = msg; state.lastError = ''; }
	function setError(msg)        { state.lastError = msg; state.statusMessage = ''; }

	return {
		state,
		moveNumber, currentColor, currentColorName, currentPlayerName,
		capturesBlack, capturesWhite, currentNode, currentComment,
		canUndo, canRedo, currentBranches, currentMarks, visiblePoints,
		BLACK, WHITE, EMPTY,
		MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
		MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
		UNDO_SUPPORTED_MODES,
		handleBoardClick, placeStone, pass, undo, redo,
		goToNode, goToStart, goToEnd, nextMove, prevMove,
		endGame, resign, formatResult,
		newGame, setComment, setHoveredCell,
		loadSGF, exportSGF,
		setInteractionMode,
		setVW, cutBoard,
		pathToRoot, flattenTree,
		parseVW, buildVWString,
	};
}