export class SGFParser 
{
	// ─── Публичный метод парсинга ───────────────────────────────────
	parse(sgfString) {
		const tokens = this._tokenize(sgfString.trim());
		const result = this._parseCollection(tokens, 0);
		return result.node;
	}

	// ─── Токенизатор ─────────────────────────────────────────────────
	// Разбивает SGF на токены: '(', ')', ';', 'KEY', '[value]'
	_tokenize(str) {
		const tokens = [];
		let i = 0;

		while (i < str.length) {
		const ch = str[i];

		if (ch === '(' || ch === ')' || ch === ';') {
			tokens.push({ type: ch });
			i++;
			continue;
		}

		// Ключ свойства (заглавные буквы)
		if (/[A-Z]/.test(ch)) {
			let key = '';
			while (i < str.length && /[A-Z]/.test(str[i])) {
			key += str[i++];
			}
			tokens.push({ type: 'KEY', value: key });
			continue;
		}

		// Значение свойства [...]
		if (ch === '[') {
			i++; // пропускаем '['
			let value = '';
			while (i < str.length && str[i] !== ']') {
			if (str[i] === '\\') {
				i++; // escape — пропускаем backslash
				if (i < str.length) value += str[i++];
			} else {
				value += str[i++];
			}
			}
			i++; // пропускаем ']'
			tokens.push({ type: 'VALUE', value });
			continue;
		}

		// Пробелы, переносы строк — пропускаем
		i++;
		}

		return tokens;
	}

	// ─── Парсинг коллекции (верхний уровень) ─────────────────────────
	_parseCollection(tokens, pos) {
		// Пропускаем до первой '('
		while (pos < tokens.length && tokens[pos].type !== '(') pos++;
		return this._parseGameTree(tokens, pos);
	}

	// ─── Парсинг дерева игры (GameTree) ──────────────────────────────
	// GameTree = '(' Sequence { GameTree } ')'
	// Sequence = Node { Node }
	// Node     = ';' { Property }
	_parseGameTree(tokens, pos) {
		if (tokens[pos]?.type !== '(') return { node: null, pos };
		pos++; // пропускаем '('

		// Парсим последовательность узлов
		const nodes = [];
		while (pos < tokens.length && tokens[pos].type === ';') {
		const result = this._parseNode(tokens, pos);
		nodes.push(result.node);
		pos = result.pos;
		}

		// Парсим дочерние деревья (варианты)
		const childTrees = [];
		while (pos < tokens.length && tokens[pos].type === '(') {
		const result = this._parseGameTree(tokens, pos);
		if (result.node) childTrees.push(result.node);
		pos = result.pos;
		}

		// Пропускаем ')'
		if (pos < tokens.length && tokens[pos].type === ')') pos++;

		if (nodes.length === 0) return { node: null, pos };

		// Связываем узлы последовательности в цепочку
		// nodes[0] → nodes[1] → ... → nodes[n-1]
		// Дочерние деревья добавляются к последнему узлу последовательности
		for (let i = 0; i < nodes.length - 1; i++) {
		nodes[i].children.push(nodes[i + 1]);
		nodes[i + 1].parent = nodes[i];
		}

		// К последнему узлу добавляем дочерние деревья
		const lastNode = nodes[nodes.length - 1];
		for (const childTree of childTrees) {
		lastNode.children.push(childTree);
		childTree.parent = lastNode;
		}

		return { node: nodes[0], pos };
	}

	// ─── Парсинг одного узла ─────────────────────────────────────────
	// Node = ';' { Property }
	// Property = KEY { '[' VALUE ']' }
	_parseNode(tokens, pos) {
		if (tokens[pos]?.type !== ';') return { node: null, pos };
		pos++; // пропускаем ';'

		const node = {
		properties: {},
		children:   [],
		parent:     null,
		comment:    '',
		};

		// Читаем свойства пока не встретим ';', '(', ')'
		while (pos < tokens.length) {
		const tok = tokens[pos];

		if (tok.type === ';' || tok.type === '(' || tok.type === ')') break;

		if (tok.type === 'KEY') {
			const key = tok.value;
			pos++;

			// Читаем все значения этого свойства
			const values = [];
			while (pos < tokens.length && tokens[pos].type === 'VALUE') {
			values.push(tokens[pos].value);
			pos++;
			}

			// Накапливаем значения (свойство может встречаться несколько раз)
			if (node.properties[key]) {
			node.properties[key].push(...values);
			} else {
			node.properties[key] = values;
			}

			// Комментарий — отдельное поле для удобства
			if (key === 'C') node.comment = values[0] || '';

			continue;
		}

		pos++;
		}

		return { node, pos };
	}

	// ─── Утилиты координат ───────────────────────────────────────────

	static sgfToCoords(sgfCoord) {
		if (!sgfCoord || sgfCoord === '' || sgfCoord === 'tt') return null;
		const x = sgfCoord.charCodeAt(0) - 97;
		const y = sgfCoord.charCodeAt(1) - 97;
		if (x < 0 || x > 25 || y < 0 || y > 25) return null;
		return { x, y };
	}

	static coordsToSGF(x, y) {
		return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
	}

	static sgfToPair(sgfPair) {
		const parts = sgfPair.split(':');
		if (parts.length !== 2) return null;
		return {
		from: SGFParser.sgfToCoords(parts[0]),
		to:   SGFParser.sgfToCoords(parts[1]),
		};
	}

	// ─── Генерация SGF из дерева узлов ───────────────────────────────

	static generateFromTree(rootNode, gameInfo = {}) {
		const {
		size        = 19,
		komi        = 6.5,
		playerBlack = '?',
		playerWhite = '?',
		result      = '',
		} = gameInfo;

		function propsToSGF(props, isRoot) {
		let s = '';

		if (isRoot) {
			s += `GM[1]FF[4]CA[UTF-8]SZ[${size}]KM[${komi}]`;
			s += `PB[${playerBlack}]PW[${playerWhite}]`;
			if (result) s += `RE[${result}]`;
		}

		// Ход
		if (props.B) s += `B[${props.B[0]}]`;
		if (props.W) s += `W[${props.W[0]}]`;

		// Расстановка
		if (props.AB?.length) s += `AB${props.AB.map(c => `[${c}]`).join('')}`;
		if (props.AW?.length) s += `AW${props.AW.map(c => `[${c}]`).join('')}`;
		if (props.AE?.length) s += `AE${props.AE.map(c => `[${c}]`).join('')}`;

		// Метки
		if (props.TR?.length) s += `TR${props.TR.map(c => `[${c}]`).join('')}`;
		if (props.SQ?.length) s += `SQ${props.SQ.map(c => `[${c}]`).join('')}`;
		if (props.CR?.length) s += `CR${props.CR.map(c => `[${c}]`).join('')}`;
		if (props.MA?.length) s += `MA${props.MA.map(c => `[${c}]`).join('')}`;
		if (props.AR?.length) s += `AR${props.AR.map(c => `[${c}]`).join('')}`;

		// Прочие свойства (VW, N, TE и т.д.)
		const handled = new Set(['B','W','AB','AW','AE','TR','SQ','CR','MA','AR','C',
								'GM','FF','CA','SZ','KM','PB','PW','RE']);
		for (const [key, vals] of Object.entries(props)) {
			if (!handled.has(key) && vals?.length) {
			s += `${key}${vals.map(v => `[${v}]`).join('')}`;
			}
		}

		return s;
		}

		function buildSGF(node, isRoot = false) {
		const props   = node.properties || {};
		const comment = node.comment || props.C?.[0] || '';

		let s = ';';
		s += propsToSGF(props, isRoot);
		if (comment) s += `C[${comment.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')}]`;

		if (node.children.length === 0) return s;
		if (node.children.length === 1) return s + buildSGF(node.children[0]);

		// Несколько веток
		return s + node.children.map(c => `(${buildSGF(c)})`).join('');
		}

		return `(${buildSGF(rootNode, true)})`;
	}
}