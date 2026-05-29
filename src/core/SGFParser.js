// src/core/SGFParser.js

export class SGFParser {
  parse(sgfString) {
    const cleaned = sgfString.trim();
    const root = this._parseNode(cleaned, 0);
    return root.node;
  }

  _parseNode(str, pos) {
    const node = {
      properties: {},
      children: [],
      comment: '',
      moveNumber: 0,
    };

    // Пропускаем '(' и ';'
    while (pos < str.length && (str[pos] === '(' || str[pos] === ';' || str[pos] === ' ')) {
      pos++;
    }

    // Парсим свойства
    while (pos < str.length && str[pos] !== ';' && str[pos] !== '(' && str[pos] !== ')') {
      // Читаем ключ
      let key = '';
      while (pos < str.length && /[A-Z]/.test(str[pos])) {
        key += str[pos++];
      }

      if (!key) { pos++; continue; }

      // Читаем значения
      const values = [];
      while (pos < str.length && str[pos] === '[') {
        pos++; // пропускаем '['
        let value = '';
        while (pos < str.length && str[pos] !== ']') {
          if (str[pos] === '\\') pos++; // escape
          value += str[pos++];
        }
        pos++; // пропускаем ']'
        values.push(value);
      }

      node.properties[key] = values;
      if (key === 'C') node.comment = values[0] || '';
    }

    // Парсим дочерние узлы
    while (pos < str.length) {
      if (str[pos] === ';') {
        const result = this._parseNode(str, pos);
        node.children.push(result.node);
        pos = result.pos;
      } else if (str[pos] === '(') {
        // Вариант
        const result = this._parseVariation(str, pos);
        if (result.node) node.children.push(result.node);
        pos = result.pos;
      } else if (str[pos] === ')') {
        pos++;
        break;
      } else {
        pos++;
      }
    }

    return { node, pos };
  }

  _parseVariation(str, pos) {
    pos++; // пропускаем '('
    if (pos < str.length && str[pos] === ';') {
      const result = this._parseNode(str, pos);
      // Ищем закрывающую скобку
      return { node: result.node, pos: result.pos };
    }
    // Пропускаем вариант
    let depth = 1;
    while (pos < str.length && depth > 0) {
      if (str[pos] === '(') depth++;
      if (str[pos] === ')') depth--;
      pos++;
    }
    return { node: null, pos };
  }

  // Конвертация SGF координат в {x, y}
  static sgfToCoords(sgfCoord, size = 19) {
    if (!sgfCoord || sgfCoord === '' || sgfCoord === 'tt') return null; // пас
    const x = sgfCoord.charCodeAt(0) - 97;
    const y = sgfCoord.charCodeAt(1) - 97;
    return { x, y };
  }

  // Конвертация {x, y} в SGF координаты
  static coordsToSGF(x, y) {
    return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
  }

  // Извлечь последовательность ходов из дерева
  static extractMoves(rootNode) {
    const moves = [];
    let node = rootNode;
    let moveNumber = 0;

    const traverse = (n, depth) => {
      const props = n.properties;

      if (props.B) {
        const coords = SGFParser.sgfToCoords(props.B[0]);
        moves.push({
          color: 'black',
          coords,
          comment: n.comment,
          moveNumber: ++moveNumber,
          node: n,
        });
      } else if (props.W) {
        const coords = SGFParser.sgfToCoords(props.W[0]);
        moves.push({
          color: 'white',
          coords,
          comment: n.comment,
          moveNumber: ++moveNumber,
          node: n,
        });
      }

      if (n.children.length > 0) {
        traverse(n.children[0], depth + 1);
      }
    };

    traverse(node, 0);
    return moves;
  }

  // Генерация SGF из списка ходов
  static generateSGF(moves, gameInfo = {}) {
    const { size = 19, komi = 6.5, playerBlack = '?', playerWhite = '?' } = gameInfo;
    let sgf = `(;GM[1]FF[4]CA[UTF-8]SZ[${size}]KM[${komi}]`;
    sgf += `PB[${playerBlack}]PW[${playerWhite}]`;

    for (const move of moves) {
      const color = move.color === 'black' ? 'B' : 'W';
      const coord = move.coords
        ? SGFParser.coordsToSGF(move.coords.x, move.coords.y)
        : 'tt';
      sgf += `;${color}[${coord}]`;
      if (move.comment) sgf += `C[${move.comment}]`;
    }

    sgf += ')';
    return sgf;
  }
}