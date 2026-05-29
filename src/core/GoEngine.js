// src/core/GoEngine.js

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export class GoEngine {
  constructor(size = 19) {
    this.size = size;
    this.reset();
  }

  reset() {
    this.board = this._createBoard();
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.ko = null; // {x, y} - запрещённая точка ко
    this.history = []; // история состояний для отмены
  }

  _createBoard() {
    return Array.from({ length: this.size }, () =>
      new Array(this.size).fill(EMPTY)
    );
  }

  _cloneBoard(board) {
    return board.map(row => [...row]);
  }

  // Получить соседей точки
  _getNeighbors(x, y) {
    const neighbors = [];
    if (x > 0) neighbors.push({ x: x - 1, y });
    if (x < this.size - 1) neighbors.push({ x: x + 1, y });
    if (y > 0) neighbors.push({ x, y: y - 1 });
    if (y < this.size - 1) neighbors.push({ x, y: y + 1 });
    return neighbors;
  }

  // Найти группу и её свободы (flood fill)
  _getGroup(board, x, y) {
    const color = board[y][x];
    if (color === EMPTY) return { stones: [], liberties: [] };

    const visited = new Set();
    const stones = [];
    const libertySet = new Set();
    const stack = [{ x, y }];

    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop();
      const key = `${cx},${cy}`;

      if (visited.has(key)) continue;
      visited.add(key);
      stones.push({ x: cx, y: cy });

      for (const neighbor of this._getNeighbors(cx, cy)) {
        const { x: nx, y: ny } = neighbor;
        const neighborKey = `${nx},${ny}`;

        if (board[ny][nx] === EMPTY) {
          libertySet.add(neighborKey);
        } else if (board[ny][nx] === color && !visited.has(neighborKey)) {
          stack.push({ x: nx, y: ny });
        }
      }
    }

    return {
      stones,
      liberties: [...libertySet].map(k => {
        const [lx, ly] = k.split(',').map(Number);
        return { x: lx, y: ly };
      }),
    };
  }

  // Убрать захваченные камни, вернуть количество
  _removeDeadGroup(board, x, y) {
    const { stones, liberties } = this._getGroup(board, x, y);
    if (liberties.length === 0) {
      for (const { x: sx, y: sy } of stones) {
        board[sy][sx] = EMPTY;
      }
      return stones.length;
    }
    return 0;
  }

  // Проверка и выполнение хода
  // Возвращает { success, error, captures, ko }
  placeStone(x, y, color) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
      return { success: false, error: 'Вне доски' };
    }
    if (this.board[y][x] !== EMPTY) {
      return { success: false, error: 'Точка занята' };
    }
    if (this.ko && this.ko.x === x && this.ko.y === y) {
      return { success: false, error: 'Запрещено правилом Ко' };
    }

    // Сохраняем состояние для отмены
    this.history.push({
      board: this._cloneBoard(this.board),
      captures: { ...this.captures },
      ko: this.ko,
    });

    const newBoard = this._cloneBoard(this.board);
    newBoard[y][x] = color;

    const opponent = color === BLACK ? WHITE : BLACK;
    let capturedCount = 0;
    let koPoint = null;

    // Проверяем захват соседних групп противника
    const capturedGroups = [];
    for (const { x: nx, y: ny } of this._getNeighbors(x, y)) {
      if (newBoard[ny][nx] === opponent) {
        const { stones, liberties } = this._getGroup(newBoard, nx, ny);
        if (liberties.length === 0) {
          capturedGroups.push(stones);
        }
      }
    }

    for (const group of capturedGroups) {
      capturedCount += group.length;
      for (const { x: sx, y: sy } of group) {
        newBoard[sy][sx] = EMPTY;
      }
    }

    // Проверка самоубийства
    const { liberties: ownLiberties } = this._getGroup(newBoard, x, y);
    if (ownLiberties.length === 0 && capturedCount === 0) {
      this.history.pop();
      return { success: false, error: 'Самоубийство запрещено' };
    }

    // Определяем ко: захвачен ровно 1 камень, своя группа имеет 1 свободу
    if (capturedCount === 1 && ownLiberties.length === 1) {
      koPoint = ownLiberties[0];
    }

    this.board = newBoard;
    this.captures[color] += capturedCount;
    this.ko = koPoint;

    return {
      success: true,
      captures: capturedCount,
      ko: koPoint,
    };
  }

  // Отмена последнего хода
  undo() {
    if (this.history.length === 0) return false;
    const state = this.history.pop();
    this.board = state.board;
    this.captures = state.captures;
    this.ko = state.ko;
    return true;
  }

  // Подсчёт территории (метод подсчёта по территории)
  countTerritory() {
    const territory = { [BLACK]: 0, [WHITE]: 0, neutral: 0 };
    const visited = new Set();

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] !== EMPTY || visited.has(`${x},${y}`)) continue;

        // BFS для пустой области
        const region = [];
        const borderingColors = new Set();
        const queue = [{ x, y }];

        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          const key = `${cx},${cy}`;
          if (visited.has(key)) continue;
          visited.add(key);
          region.push({ x: cx, y: cy });

          for (const { x: nx, y: ny } of this._getNeighbors(cx, cy)) {
            if (this.board[ny][nx] === EMPTY && !visited.has(`${nx},${ny}`)) {
              queue.push({ x: nx, y: ny });
            } else if (this.board[ny][nx] !== EMPTY) {
              borderingColors.add(this.board[ny][nx]);
            }
          }
        }

        if (borderingColors.size === 1) {
          const owner = [...borderingColors][0];
          territory[owner] += region.length;
        } else {
          territory.neutral += region.length;
        }
      }
    }

    return territory;
  }

  // Получить текущее состояние доски
  getBoardState() {
    return {
      board: this._cloneBoard(this.board),
      captures: { ...this.captures },
      ko: this.ko,
    };
  }
}