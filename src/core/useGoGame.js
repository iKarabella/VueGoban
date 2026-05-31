// src/core/useGoGame.js
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

// ─── Применить все setup-свойства узла к движку ──────────────────
// Вызывается при replayTo — применяет AB/AW/AE узла к текущему
// состоянию движка (до или вместо хода)
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

  hoveredCell:   null,
  showTerritory: false,
  territory:     null,

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

// ─── Воспроизведение до узла ─────────────────────────────────────
// Пересоздаём движок и последовательно применяем все узлы пути.
// Для каждого узла: сначала setup (AB/AW/AE), потом ход (B/W).
function replayTo(node) {
  engine = new GoEngine(state.boardSize);

  const path = pathToRoot(node).slice(1); // без rootNode

  // Применяем setup корневого узла (AB/AW из начальной позиции)
  applySetupToEngine(engine, state.rootNode.properties);

  for (const n of path) {
    const props = n.properties || {};

    // 1. Setup этого узла (AB/AW/AE могут быть вместе с ходом или отдельно)
    applySetupToEngine(engine, props);

    // 2. Ход этого узла
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
  const canUndo = computed(() =>
    !!state.currentNode &&
    state.currentNode !== state.rootNode &&
    !state.isGameOver
  );
  const canRedo = computed(() =>
    (state.currentNode?.children?.length ?? 0) > 0
  );
  const currentBranches = computed(() => state.currentNode?.children ?? []);
  const currentMarks    = computed(() => state.currentNode?.properties ?? {});

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

  // ── Обычный ход ──────────────────────────────────────────────

  function placeStone(x, y) {
    if (state.isGameOver) { setStatus('Игра завершена'); return false; }
  
    // Проверяем: есть ли среди дочерних узлов ход в эту же точку
    // тем же цветом — если да, просто переходим к нему
    const existingChild = state.currentNode.children.find(child =>
      child.coords &&
      child.coords.x === x &&
      child.coords.y === y &&
      child.color === state.currentColor
    );
  
    if (existingChild) {
      goToNode(existingChild);
      setStatus(`Ход ${existingChild.moveNumber}: переход к существующей ветке`);
      return true;
    }
  
    // Новый ход — проверяем правила
    const result = engine.placeStone(x, y, state.currentColor);
    if (!result.success) { setError(result.error); return false; }
  
    const node = makeNode(state.currentNode, {
      isMove:     true,
      color:      state.currentColor,
      colorName:  state.currentColor === BLACK ? 'black' : 'white',
      coords:     { x, y },
      captures:   result.captures,
      properties: {},
    });
  
    state.currentNode.children.push(node);
    state.currentNode       = node;
    state.consecutivePasses = 0;
    state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK;
  
    syncBoard();
    setStatus(`Ход ${node.moveNumber}: ${node.colorName === 'black' ? 'Чёрные' : 'Белые'} → (${x + 1}, ${y + 1})`);
    return true;
  }

  // ── Setup: добавить камень (AB/AW) ───────────────────────────
  // Камень добавляется в properties ТЕКУЩЕГО узла.
  // Движок обновляется напрямую (без создания нового узла).
  // При replayTo() эти камни будут восстановлены из properties.

  function addSetupStone(x, y, color) {
    const sgf     = SGFParser.coordsToSGF(x, y);
    const key     = color === BLACK ? 'AB' : 'AW';
    const otherKey = color === BLACK ? 'AW' : 'AB';
    const props   = state.currentNode.properties;

    // Убираем из противоположного списка
    if (props[otherKey]) {
      props[otherKey] = props[otherKey].filter(c => c !== sgf);
      if (props[otherKey].length === 0) delete props[otherKey];
    }
    // Убираем из AE
    if (props.AE) {
      props.AE = props.AE.filter(c => c !== sgf);
      if (props.AE.length === 0) delete props.AE;
    }

    // Добавляем (если ещё нет)
    if (!props[key]) props[key] = [];
    if (!props[key].includes(sgf)) {
      props[key].push(sgf);
    }

    // Применяем к движку напрямую
    engine.setStone(x, y, color);
    syncBoard();

    setStatus(`Камень ${color === BLACK ? 'чёрный' : 'белый'} добавлен: ${sgf}`);
    return true;
  }

  // ── Setup: убрать камень (AE) ────────────────────────────────

  function removeSetupStone(x, y) {
    if (state.board[y]?.[x] === EMPTY) {
      setError('Точка пуста');
      return false;
    }

    const sgf   = SGFParser.coordsToSGF(x, y);
    const props = state.currentNode.properties;

    // Убираем из AB/AW
    ['AB', 'AW'].forEach(k => {
      if (props[k]) {
        props[k] = props[k].filter(c => c !== sgf);
        if (props[k].length === 0) delete props[k];
      }
    });

    // Добавляем в AE
    if (!props.AE) props.AE = [];
    if (!props.AE.includes(sgf)) props.AE.push(sgf);

    // Применяем к движку
    engine.removeStone(x, y);
    syncBoard();

    setStatus(`Камень убран: ${sgf}`);
    return true;
  }

  // ── Метки ────────────────────────────────────────────────────

  function toggleMark(type, x, y) {
    const sgf   = SGFParser.coordsToSGF(x, y);
    const props = state.currentNode.properties;

    // Убираем из всех эксклюзивных меток
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

    if (wasRemoved) {
      setStatus(`Метка ${type} убрана`);
      return;
    }

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
      if (props.AR.includes(arrowSGF)) {
        setError('Такая стрелка уже существует');
        return;
      }

      props.AR.push(arrowSGF);
      setStatus(`Стрелка добавлена`);
    }
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
    setStatus(
      node === state.rootNode
        ? 'Начало игры'
        : `Переход к ходу ${node.moveNumber}`
    );
  }

  function undo()      { if (canUndo.value) { goToNode(state.currentNode.parent); return true; } return false; }
  function redo()      { if (canRedo.value) { goToNode(state.currentNode.children[0]); return true; } return false; }
  function goToStart() { goToNode(state.rootNode); }
  function goToEnd()   {
    let node = state.currentNode;
    while (node.children.length > 0) node = node.children[0];
    goToNode(node);
  }
  function nextMove()  { if (canRedo.value)  goToNode(state.currentNode.children[0]); }
  function prevMove()  { if (canUndo.value)  goToNode(state.currentNode.parent); }

  function pass() {
    if (state.isGameOver) return;
  
    // Проверяем существующий пас среди дочерних узлов
    const existingPass = state.currentNode.children.find(child =>
      child.coords === null &&
      child.color === state.currentColor
    );
  
    if (existingPass) {
      goToNode(existingPass);
      setStatus(`Ход ${existingPass.moveNumber}: переход к существующему пасу`);
      return;
    }
  
    const node = makeNode(state.currentNode, {
      isMove:     true,
      color:      state.currentColor,
      colorName:  state.currentColor === BLACK ? 'black' : 'white',
      coords:     null,
      captures:   0,
      properties: {},
    });
  
    state.currentNode.children.push(node);
    state.currentNode       = node;
    state.consecutivePasses++;
    state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK;
    setStatus(`Ход ${node.moveNumber}: ПАС`);
  }

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
    state.territory         = null;
    state.showTerritory     = false;
    state.hoveredCell       = null;
    state.arrowStart        = null;
    state.interactionMode   = MODE_PLAY;
    state.lastError         = '';

    syncBoard();
    setStatus('Новая игра начата');
  }

  // ── SGF ──────────────────────────────────────────────────────

  function loadSGF(sgfString) {
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

      // Свойства корневого узла (AB/AW/C и т.д.) → в rootNode
      state.rootNode.properties = { ...props };
      state.rootNode.comment    = sgfRoot.comment || props.C?.[0] || '';

      // Применяем setup корневого узла к движку
      applySetupToEngine(engine, props);
      syncBoard();

      // Строим дерево ходов
      _buildTreeFromSGF(sgfRoot, state.rootNode);

      setStatus(`SGF загружен`);
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

      const hasSetup = !!(props.AB || props.AW || props.AE);
      const hasMarks = !!(props.TR || props.SQ || props.CR || props.MA || props.AR);
      const hasComment = !!(sgfChild.comment || props.C?.[0]);

      // Пропускаем полностью пустые узлы
      if (!isMove && !hasSetup && !hasMarks && !hasComment) {
        _buildTreeFromSGF(sgfChild, parentGameNode);
        continue;
      }

      const gameNode = {
        id:          makeId(),
        // Setup-узел не увеличивает счётчик ходов
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
    canUndo, canRedo, currentBranches, currentMarks,
    BLACK, WHITE, EMPTY,
    MODE_PLAY, MODE_ADD_BLACK, MODE_ADD_WHITE, MODE_REMOVE,
    MODE_MARK_TR, MODE_MARK_SQ, MODE_MARK_CR, MODE_MARK_MA, MODE_ARROW,
    handleBoardClick, placeStone, pass, undo, redo,
    goToNode, goToStart, goToEnd, nextMove, prevMove,
    endGame, resign, formatResult,
    newGame, setComment, setHoveredCell,
    loadSGF, exportSGF,
    setInteractionMode,
    pathToRoot, flattenTree,
  };
}