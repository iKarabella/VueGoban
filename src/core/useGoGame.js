import { reactive, computed } from 'vue';
import { GoEngine, BLACK, WHITE, EMPTY } from './GoEngine.js';
import { SGFParser } from './SGFParser.js';

// ─── Вспомогательные ─────────────────────────────────────────────

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
  };
}

function makeNode(parent, { color, colorName, coords, captures, comment = '' }) {
  return {
    id:          makeId(),
    moveNumber:  parent.moveNumber + 1,
    color,
    colorName,
    coords,
    comment,
    captures,
    timestamp:   Date.now(),
    parent,
    children:    [],
    branchIndex: parent.children.length,
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
    node.children.forEach(child => dfs(child, depth + 1));
  }
  dfs(root, 0);
  return rows;
}

// ─── Состояние ───────────────────────────────────────────────────
// ВАЖНО: state НЕ оборачивается в readonly — это ломает мутацию
// вложенных объектов (node.children.push(...)).
// Защита от внешних мутаций — соглашение + отдельный publicState.

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

  // Дерево ходов — мутируемые объекты, НЕ должны быть readonly
  rootNode:    makeRootNode(),
  currentNode: null,   // инициализируется ниже

  // Доска
  board:    [],
  captures: { [BLACK]: 0, [WHITE]: 0 },
  ko:       null,

  currentColor:      BLACK,
  isGameOver:        false,
  consecutivePasses: 0,

  hoveredCell:   null,
  showTerritory: false,
  territory:     null,

  statusMessage: '',
  lastError:     '',
});

state.currentNode = state.rootNode;

// ─── Движок ──────────────────────────────────────────────────────
let engine = new GoEngine(state.boardSize);

function syncBoard() {
  const s       = engine.getBoardState();
  state.board    = s.board;
  state.captures = s.captures;
  state.ko       = s.ko;
}

syncBoard();

// ─── Воспроизведение до узла ─────────────────────────────────────
function replayTo(node) {
  engine = new GoEngine(state.boardSize);
  const path = pathToRoot(node).slice(1); // без корня
  for (const n of path) {
    if (n.coords) {
      engine.placeStone(n.coords.x, n.coords.y, n.color);
    }
  }
  syncBoard();
}

// ─── Composable ──────────────────────────────────────────────────
export function useGoGame() {

  // ── Computed ──────────────────────────────────────────────────

  const moveNumber = computed(() => state.currentNode?.moveNumber ?? 0);

  const currentColor = computed(() => state.currentColor);

  const currentColorName = computed(() =>
    state.currentColor === BLACK ? 'Чёрные' : 'Белые'
  );

  const currentPlayerName = computed(() =>
    state.currentColor === BLACK
      ? state.gameInfo.playerBlack
      : state.gameInfo.playerWhite
  );

  const capturesBlack = computed(() => state.captures[BLACK]);
  const capturesWhite = computed(() => state.captures[WHITE]);

  const currentNode = computed(() => state.currentNode);

  const currentComment = computed({
    get: () => state.currentNode?.comment ?? '',
    set: (val) => {
      if (state.currentNode) state.currentNode.comment = val;
    },
  });

  const canUndo = computed(() =>
    !!state.currentNode &&
    state.currentNode !== state.rootNode &&
    !state.isGameOver
  );

  const canRedo = computed(() =>
    (state.currentNode?.children?.length ?? 0) > 0
  );

  const currentBranches = computed(() =>
    state.currentNode?.children ?? []
  );

  const score = computed(() => {
    if (!state.territory) return null;
    return {
      black: state.territory[BLACK] + state.captures[BLACK],
      white: state.territory[WHITE] + state.captures[WHITE] + state.komi,
    };
  });

  // ── Действия ─────────────────────────────────────────────────

  function placeStone(x, y) {
    if (state.isGameOver) { setStatus('Игра завершена'); return false; }

    const result = engine.placeStone(x, y, state.currentColor);
    if (!result.success) { setError(result.error); return false; }

    // Создаём новый узел и добавляем в дерево
    const node = makeNode(state.currentNode, {
      color:     state.currentColor,
      colorName: state.currentColor === BLACK ? 'black' : 'white',
      coords:    { x, y },
      captures:  result.captures,
    });

    // Мутируем children родителя — это работает только если state НЕ readonly
    state.currentNode.children.push(node);
    state.currentNode       = node;
    state.consecutivePasses = 0;
    state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK;

    syncBoard();
    setStatus(
      `Ход ${node.moveNumber}: ${node.colorName === 'black' ? 'Чёрные' : 'Белые'} → (${x + 1}, ${y + 1})`
    );
    return true;
  }

  function pass() {
    if (state.isGameOver) return;

    const node = makeNode(state.currentNode, {
      color:     state.currentColor,
      colorName: state.currentColor === BLACK ? 'black' : 'white',
      coords:    null,
      captures:  0,
    });

    state.currentNode.children.push(node);
    state.currentNode       = node;
    state.consecutivePasses++;
    state.currentColor      = state.currentColor === BLACK ? WHITE : BLACK;

    setStatus(
      `Ход ${node.moveNumber}: ${node.colorName === 'black' ? 'Чёрные' : 'Белые'} — ПАС`
    );
    if (state.consecutivePasses >= 2) endGame();
  }

  function goToNode(node) {
    if (!node) return;
    replayTo(node);
    state.currentNode = node;
    // Чей ход: чётный moveNumber = ход чёрных (0,2,4…)
    state.currentColor      = (node.moveNumber % 2 === 0) ? BLACK : WHITE;
    state.consecutivePasses = 0;
    state.isGameOver        = false;
    setStatus(
      node === state.rootNode
        ? 'Начало игры'
        : `Переход к ходу ${node.moveNumber}`
    );
  }

  function undo() {
    if (!canUndo.value) return false;
    goToNode(state.currentNode.parent);
    setStatus('Ход отменён');
    return true;
  }

  function redo() {
    if (!canRedo.value) return false;
    goToNode(state.currentNode.children[0]);
    return true;
  }

  function goToStart() {
    goToNode(state.rootNode);
  }

  function goToEnd() {
    let node = state.currentNode;
    while (node.children.length > 0) node = node.children[0];
    goToNode(node);
  }

  function nextMove() {
    if (canRedo.value) goToNode(state.currentNode.children[0]);
  }

  function prevMove() {
    if (canUndo.value) goToNode(state.currentNode.parent);
  }

  function endGame() {
    state.isGameOver    = true;
    state.territory     = engine.countTerritory();
    state.showTerritory = true;
    setStatus('Игра завершена! Подсчёт очков…');
  }

  function newGame(options = {}) {
    const { size = 19, komi = 6.5, playerBlack, playerWhite } = options;

    state.boardSize = size;
    state.komi      = komi;
    if (playerBlack) state.gameInfo.playerBlack = playerBlack;
    if (playerWhite) state.gameInfo.playerWhite = playerWhite;

    engine = new GoEngine(size);

    const root            = makeRootNode();
    state.rootNode        = root;
    state.currentNode     = root;
    state.currentColor    = BLACK;
    state.isGameOver      = false;
    state.consecutivePasses = 0;
    state.territory       = null;
    state.showTerritory   = false;
    state.hoveredCell     = null;
    state.lastError       = '';

    syncBoard();
    setStatus('Новая игра начата');
  }

  function setComment(comment) {
    if (state.currentNode) state.currentNode.comment = comment;
  }

  function setHoveredCell(cell) {
    state.hoveredCell = cell;
  }

  function toggleTerritory() {
    if (!state.isGameOver) return;
    state.showTerritory = !state.showTerritory;
    if (state.showTerritory) state.territory = engine.countTerritory();
  }

  function loadSGF(sgfString) {
    try {
      const parser    = new SGFParser();
      const sgfRoot   = parser.parse(sgfString);
      const props     = sgfRoot.properties;

      newGame({
        size:        props.SZ  ? parseInt(props.SZ[0])   : 19,
        komi:        props.KM  ? parseFloat(props.KM[0]) : 6.5,
        playerBlack: props.PB?.[0],
        playerWhite: props.PW?.[0],
      });

      if (props.DT) state.gameInfo.date   = props.DT[0];
      if (props.EV) state.gameInfo.event  = props.EV[0];
      if (props.RE) state.gameInfo.result = props.RE[0];

      _buildTreeFromSGF(sgfRoot, state.rootNode);
      goToEnd();

      setStatus('SGF загружен');
      return true;
    } catch (e) {
      setError(`Ошибка загрузки SGF: ${e.message}`);
      return false;
    }
  }

  function _buildTreeFromSGF(sgfNode, parentTreeNode) {
    for (const sgfChild of sgfNode.children) {
      const props = sgfChild.properties;
      let color, coords;

      if (props.B) {
        color  = BLACK;
        coords = SGFParser.sgfToCoords(props.B[0]);
      } else if (props.W) {
        color  = WHITE;
        coords = SGFParser.sgfToCoords(props.W[0]);
      } else {
        _buildTreeFromSGF(sgfChild, parentTreeNode);
        continue;
      }

      const node = makeNode(parentTreeNode, {
        color,
        colorName: color === BLACK ? 'black' : 'white',
        coords,
        captures:  0,
        comment:   sgfChild.comment || '',
      });
      parentTreeNode.children.push(node);
      _buildTreeFromSGF(sgfChild, node);
    }
  }

  function exportSGF() {
    function childrenToSGF(node) {
      if (node.children.length === 0) return '';
      if (node.children.length === 1) {
        return nodeToSGF(node.children[0]);
      }
      return node.children.map(c => `(${nodeToSGF(c)})`).join('');
    }

    function nodeToSGF(node) {
      if (node === state.rootNode) {
        let s = `(;GM[1]FF[4]CA[UTF-8]SZ[${state.boardSize}]KM[${state.komi}]`;
        s += `PB[${state.gameInfo.playerBlack}]PW[${state.gameInfo.playerWhite}]`;
        if (node.comment) s += `C[${node.comment}]`;
        s += childrenToSGF(node);
        s += ')';
        return s;
      }
      const c     = node.color === BLACK ? 'B' : 'W';
      const coord = node.coords
        ? SGFParser.coordsToSGF(node.coords.x, node.coords.y)
        : 'tt';
      let s = `;${c}[${coord}]`;
      if (node.comment) s += `C[${node.comment}]`;
      s += childrenToSGF(node);
      return s;
    }

    return nodeToSGF(state.rootNode);
  }

  // ── Вспомогательные ──────────────────────────────────────────

  function setStatus(msg) {
    state.statusMessage = msg;
    state.lastError     = '';
  }

  function setError(msg) {
    state.lastError     = msg;
    state.statusMessage = '';
  }

  // ── Публичный API ─────────────────────────────────────────────
  // Отдаём state напрямую (без readonly) — компоненты читают,
  // но мутировать должны только через экшены.

  return {
    state,   // ← НЕ readonly

    // computed
    moveNumber,
    currentColor,
    currentColorName,
    currentPlayerName,
    capturesBlack,
    capturesWhite,
    currentNode,
    currentComment,
    canUndo,
    canRedo,
    currentBranches,
    score,

    // константы
    BLACK,
    WHITE,
    EMPTY,

    // действия
    placeStone,
    pass,
    undo,
    redo,
    goToNode,
    goToStart,
    goToEnd,
    nextMove,
    prevMove,
    endGame,
    newGame,
    setComment,
    setHoveredCell,
    toggleTerritory,
    loadSGF,
    exportSGF,

    // утилиты для MoveTree
    pathToRoot,
    flattenTree,
  };
}