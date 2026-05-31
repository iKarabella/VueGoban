export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export class GoEngine {
  constructor(size = 19) {
    this.size = size;
    this.reset();
  }

  reset() {
    this.board    = this._createBoard();
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.ko       = null;
    this.history  = [];
  }

  _createBoard() {
    return Array.from({ length: this.size }, () =>
      new Array(this.size).fill(EMPTY)
    );
  }

  _cloneBoard(board) {
    return board.map(row => [...row]);
  }

  _getNeighbors(x, y) {
    const n = [];
    if (x > 0)              n.push({ x: x - 1, y });
    if (x < this.size - 1)  n.push({ x: x + 1, y });
    if (y > 0)              n.push({ x, y: y - 1 });
    if (y < this.size - 1)  n.push({ x, y: y + 1 });
    return n;
  }

  _getGroup(board, x, y) {
    const color      = board[y][x];
    if (color === EMPTY) return { stones: [], liberties: [] };

    const visited    = new Set();
    const stones     = [];
    const libertySet = new Set();
    const stack      = [{ x, y }];

    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop();
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      visited.add(key);
      stones.push({ x: cx, y: cy });

      for (const { x: nx, y: ny } of this._getNeighbors(cx, cy)) {
        const nk = `${nx},${ny}`;
        if (board[ny][nx] === EMPTY) {
          libertySet.add(nk);
        } else if (board[ny][nx] === color && !visited.has(nk)) {
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

  // Обычный ход по правилам
  placeStone(x, y, color) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size)
      return { success: false, error: 'Вне доски' };
    if (this.board[y][x] !== EMPTY)
      return { success: false, error: 'Точка занята' };
    if (this.ko && this.ko.x === x && this.ko.y === y)
      return { success: false, error: 'Запрещено правилом Ко' };

    this.history.push({
      board:    this._cloneBoard(this.board),
      captures: { ...this.captures },
      ko:       this.ko,
    });

    const newBoard = this._cloneBoard(this.board);
    newBoard[y][x] = color;

    const opponent       = color === BLACK ? WHITE : BLACK;
    let   capturedCount  = 0;
    const capturedGroups = [];

    for (const { x: nx, y: ny } of this._getNeighbors(x, y)) {
      if (newBoard[ny][nx] === opponent) {
        const { liberties, stones } = this._getGroup(newBoard, nx, ny);
        if (liberties.length === 0) capturedGroups.push(stones);
      }
    }

    for (const group of capturedGroups) {
      capturedCount += group.length;
      for (const { x: sx, y: sy } of group) newBoard[sy][sx] = EMPTY;
    }

    const { liberties: ownLib } = this._getGroup(newBoard, x, y);
    if (ownLib.length === 0 && capturedCount === 0) {
      this.history.pop();
      return { success: false, error: 'Самоубийство запрещено' };
    }

    let koPoint = null;
    if (capturedCount === 1 && ownLib.length === 1) koPoint = ownLib[0];

    this.board    = newBoard;
    this.captures[color] += capturedCount;
    this.ko       = koPoint;

    return { success: true, captures: capturedCount, ko: koPoint };
  }

  // Установка камня без правил (для режимов AB/AW)
  setStone(x, y, color) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
    this.board[y][x] = color;
    return true;
  }

  // Удаление камня (для режима AE)
  removeStone(x, y) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
    if (this.board[y][x] === EMPTY) return false;
    this.board[y][x] = EMPTY;
    return true;
  }

  undo() {
    if (this.history.length === 0) return false;
    const s       = this.history.pop();
    this.board    = s.board;
    this.captures = s.captures;
    this.ko       = s.ko;
    return true;
  }

  countTerritory() {
    const territory = { [BLACK]: 0, [WHITE]: 0, neutral: 0 };
    const visited   = new Set();

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.board[y][x] !== EMPTY || visited.has(`${x},${y}`)) continue;

        const region          = [];
        const borderingColors = new Set();
        const queue           = [{ x, y }];

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
          territory[[...borderingColors][0]] += region.length;
        } else {
          territory.neutral += region.length;
        }
      }
    }
    return territory;
  }

  getBoardState() {
    return {
      board:    this._cloneBoard(this.board),
      captures: { ...this.captures },
      ko:       this.ko,
    };
  }
}