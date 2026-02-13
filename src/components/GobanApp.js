//Собственно вся логика гобана тут.

import { ref, computed } from "vue";

export default function () {

    /**
     * Информация об игре
     */
    const game = ref({});

    const currentNode = ref({}); //текущая нода из дерева ходов
    const currentNodeBranch = ref(null); //index текущей ветки ноды
    const currentNodes = ref([]); //текущие ноды
    const groupId = ref(0);
    const moveId = ref(0);

    const movesCache = ref({});

    /**
     * Список буквенных координат SGF
     */
    const abc = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

    /**
     * Создание новой игры
     * 
     * @param {*} info Информация об игре
     * @param {*} targetGame ссылка на объект с игрой
     * @param {*} targetMovesCache ссылка на кэш ходов
     * @param {*} targetCurrentNode ссылка на текущий узел
     * @param {*} targetCurrentNodeBranch ссылка на индекс текущей ветку
     * @param {*} targetCurrentNodes ссылка на узлы текущего хода
     * @param {*} targetGroupId ссылка на счетчик групп
     * @param {*} targetMoveId ссылка на счетчик ходов
     */
    function createNewGame(info={}, targetGame=game, targetMovesCache = movesCache, targetCurrentNode = currentNode, targetCurrentNodeBranch=currentNodeBranch, targetCurrentNodes=currentNodes, targetGroupId = groupId, targetMoveId = moveId)
    {
        targetGame.value.size = info.goban_size??[19,19];
        targetGame.value.white_player_name = info.white_player_name??'White';
        targetGame.value.white_player_rank = info.white_player_rank??null;
        targetGame.value.black_player_name = info.black_player_name??'Black';
        targetGame.value.black_player_rank = info.black_player_rank??null;
        targetGame.value.game_date = info.game_date??null;
        targetGame.value.game_result = info.game_result??null;
        targetGame.value.main_time = info.main_time??null;
        targetGame.value.overtime = info.overtime??null;
        targetGame.value.rules = info.rules??'Japanese';
        targetGame.value.movestree = [];//Дерево ходов
        targetGame.value.ko = {coords:[], moveNum:null};
        targetGame.value.prisoners = [0,0];
        targetGame.value.currentMode = 'black';
        targetGame.value.currentMove =  {};
        targetGame.value.moveNumber = 0;
        targetGame.value.groups = [];
        targetGame.value.comment = info.comment??''; //комментарий к нулевому ходу

        targetCurrentNodes.value = [];
        targetMovesCache.value={
            null: JSON.stringify({ //"нулевой" ход
                ko: {coords:[], moveNum:null},
                nodes:[],
                prisoners: [0,0],
                currentMode: 'black', 
                currentMove: {},
                moveNumber: 0, 
                groups: targetGame.value.groups,
                currentNodeBranch: null,
                comment:''
            })
        };
        targetCurrentNode.value = targetGame.value.movestree;
        targetCurrentNodeBranch.value = null;
        targetGroupId.value = 0;
        targetMoveId.value = 0;
    }

    function gobanAction(action){
        if (action.type=='move') move(action.coords);
    }

    /**
     * Переход к существующему ходу
     * @param {*} move Id 
     * @param {*} targetGame объект с данными об игре
     * @param {*} targetCurrentNode объект с текущим узлом
     * @param {*} targetCurrentNodeBranch  объект с индексом ветки текущего узла
     * @param {*} targetMovesCache  объект с кэшем ходов
     * @param {*} targetNodes  узлы текущего хода
     * @return {Void}
     */
    function moveTo(moveId, targetGame = game, targetCurrentNode = currentNode, targetCurrentNodeBranch = currentNodeBranch, targetMovesCache = movesCache, targetNodes = currentNodes)
    {
        let cache = targetMovesCache.value[moveId];
        if(!cache) return;

        cache = JSON.parse(cache);

        let findNode = targetGame.value.movestree;
        let findIndex = null;

        if (cache.nodes) {
            cache.nodes.forEach(node => {
                if(node.number!==null)
                {
                    let find = findNode[findIndex].find(move=>move.number==node.number);
                    if (find) {
                        findNode = find.children;
                        findIndex = node.branch;
                    }
                }
                else {
                    findIndex = node.branch;
                }
                
            });
        }

        if(moveId!==null && findIndex!==null)
        {
            targetGame.value.currentMove = findNode[findIndex].find(move=>move.id==moveId);
        }
        else {
            targetGame.value.currentMove = cache.currentMove;
        }

        targetCurrentNode.value = findNode;
        targetCurrentNodeBranch.value = findIndex;

        targetGame.value.ko = cache.ko;
        targetGame.value.prisoners = cache.prisoners;
        targetGame.value.currentMode = cache.currentMode; 
        targetGame.value.moveNumber = cache.moveNumber;
        targetGame.value.groups = cache.groups;
        targetNodes.value = cache.nodes;
    }

    /**
     * Постановка камня на доску
     * 
     * @param {Array} coords координаты поставленного камня
     * @param {Object} gameObject объект с данными об игре
     * @param {*} targetCurrentNode объект с текущим узлом
     * @param {*} targetCurrentNodeBranch  объект с индексом ветки текущего узла
     * @param {*} targetMovesCache  объект с кэшем ходов
     * @param {*} targetNodes  узлы текущего хода
     * @return {Void}
     */
    function move(coords = [], gameObject = game, targetCurrentNode = currentNode, targetCurrentNodeBranch = currentNodeBranch, targetMovesCache = movesCache, targetNodes = currentNodes)
    {
        // const start = performance.now();
        /**
         * Доступные режимы для постановки камня
         */
        const availableModes = ['black', 'white', 'blackStone', 'whiteStone'];
        let currentMoveIndex = -1;
        let vertex = null;
        let alterColor = (gameObject.value.currentMode=='black' || gameObject.value.currentMode=='blackStone') ? 'white' : 'black';
        let currentColor = (gameObject.value.currentMode=='black' || gameObject.value.currentMode=='blackStone') ? 'black' : 'white';
        let dames = [], contrGroup = [], killed = [];

        if (targetCurrentNodeBranch.value!==null) {
            currentMoveIndex = targetCurrentNode.value[targetCurrentNodeBranch.value].findIndex(arr=>{
                return arr.vertex==gameObject.value.currentMove.vertex && arr.number==gameObject.value.currentMove.number;
            });
        }
        let nextMoveIndex = currentMoveIndex+1;

        if(coords.length==2){
            if(
                gameObject.value.groups.some((g)=>g.stones.some((s)=>s[0]==coords[0] && s[1]==coords[1])) //место занято
                || !availableModes.includes(gameObject.value.currentMode) //текущий режим не подходит
            ) return;
    
    
            let existInNextMoves = false;
    
            if( //если ход в следующий существующий
                targetCurrentNodeBranch.value!==null && 
                targetCurrentNode.value[targetCurrentNodeBranch.value][nextMoveIndex] &&
                targetCurrentNode.value[targetCurrentNodeBranch.value][nextMoveIndex].coords[0]==coords[0] &&
                targetCurrentNode.value[targetCurrentNodeBranch.value][nextMoveIndex].coords[1]==coords[1]
            ) {
                existInNextMoves = true;
                moveTo(
                    targetCurrentNode.value[targetCurrentNodeBranch.value][nextMoveIndex].id, 
                    gameObject, 
                    targetCurrentNode, 
                    targetCurrentNodeBranch,
                    targetMovesCache, 
                    targetNodes
                );
            }
    
            let currentNodeMove = null;
            if(targetCurrentNodeBranch.value!==null && currentMoveIndex>=0) {
                currentNodeMove = targetCurrentNode.value[targetCurrentNodeBranch.value][currentMoveIndex].children;
            }
            else currentNodeMove = game.value.movestree;  //TODO заменить на gameObject. но возникает ошибка в parseSGF (некорректно ветки делает)
            
            //если ход в первый ход какой-то дочерней ветки текущего хода - переходим туда
            currentNodeMove.forEach((child, index)=>{
                if(child.length && child[0].coords[0]==coords[0] && child[0].coords[1]==coords[1]) {
                    existInNextMoves = true;
                    targetCurrentNode.value = child.children;
                    moveTo(
                        child[0].id, 
                        gameObject, 
                        targetCurrentNode, 
                        targetCurrentNodeBranch,
                        targetMovesCache, 
                        targetNodes
                    );
                    return;
                }
            });
    
            if(targetCurrentNodeBranch.value===null)
            {
                targetCurrentNode.value.push([]);
                targetCurrentNodeBranch.value = targetCurrentNode.value.length-1;
                targetNodes.value.push({number:null, branch:targetCurrentNode.value.length-1});
            }
    
            if (existInNextMoves) return;
    
            killed = gameObject.value.groups.filter((g)=>{ //ищем убитые этим ходом группы
                return g.color==alterColor && g.dames.length==1 && g.dames[0][0]==coords[0] && g.dames[0][1]==coords[1];
            });
            
            if(gameObject.value.ko.moveNum<gameObject.value.moveNumber) gameObject.value.ko = {coords:[], moveNum:null}; //сбрасываем ко после хода
    
            //проверяем на Ко
            if (
                killed.length==1 && 
                killed[0].stones.length==1 && 
                gameObject.value.ko.moveNum==gameObject.value.moveNumber && 
                (gameObject.value.ko.coords[0]==coords[0] && gameObject.value.ko.coords[1]==coords[1])
            ) return; 
    
            if(killed.length>0){
                killed.forEach((k)=>{
                    gameObject.value.groups = gameObject.value.groups.filter((g)=>g.id!=k.id).map((g)=>{
                        let killedStones = g.contrGroup.filter((gc)=>k.stones.some((ks)=>ks[0] == gc[0] && ks[1] == gc[1]));
                        g.contrGroup = g.contrGroup.filter((gc)=>!k.stones.some((ks)=>ks[0] == gc[0] && ks[1] == gc[1]));
                        g.dames.push(...killedStones);
                        return g;
                    });
                });
            }
            
            if (coords[0]-1>0) {
                let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]-1 && s[1]==coords[1]));
                if (check)  {
                    if(check.color == alterColor) contrGroup.push([coords[0]-1, coords[1]]);
                }
                else dames.push([coords[0]-1, coords[1]]);
            }
            if (coords[0]+1<=gameObject.value.size[0]) {
                let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]+1 && s[1]==coords[1]));
                if (check)  {
                    if(check.color == alterColor) contrGroup.push([coords[0]+1,coords[1]]);
                }
                else dames.push([coords[0]+1,coords[1]]);
            }
            if (coords[1]-1>0) {
                let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]-1 && s[0]==coords[0]));
                if (check)  {
                    if(check.color == alterColor) contrGroup.push([coords[0], coords[1]-1]);
                }
                else dames.push([coords[0], coords[1]-1]);
            }
            if (coords[1]+1<=gameObject.value.size[1]) {
                let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]+1 && s[0]==coords[0]));
                if (check)  {
                    if(check.color == alterColor) contrGroup.push([coords[0],coords[1]+1]);
                }
                else dames.push([coords[0],coords[1]+1]);
            }
    
            let connectedGroups = gameObject.value.groups.filter((group)=>{
                return group.color == currentColor && group.dames.some((d)=>d[0]==coords[0] && d[1]==coords[1]);
            });
    
            let newGroup = {
                id:groupId.value,
                color:currentColor,
                dames:dames,
                stones:[coords],
                contrGroup:contrGroup,
            };
    
            if(connectedGroups.length>0){
                //объединяем группы
                connectedGroups.forEach((g)=>{
                    newGroup.dames.push(...g.dames.filter((d)=>!(d[0]==coords[0] && d[1]==coords[1])));
                    newGroup.contrGroup.push(...g.contrGroup),
                    newGroup.stones.push(...g.stones);
                });
                newGroup.dames = newGroup.dames.reduce((acc, item) => {
                    if (acc.some((a)=>a[0]==item[0] && a[1]==item[1])) {
                      return acc; // если значение уже есть, то просто возвращаем аккумулятор
                    }
                    return [...acc, item]; // добавляем к аккумулятору и возвращаем новый аккумулятор
                }, []);
                newGroup.contrGroup = newGroup.contrGroup.reduce((acc, item) => {
                    if (acc.some((a)=>a[0]==item[0] && a[1]==item[1])) {
                      return acc; // если значение уже есть, то просто возвращаем аккумулятор
                    }
                    return [...acc, item]; // добавляем к аккумулятору и возвращаем новый аккумулятор
                }, []);
            }
            
            if(newGroup.dames.length<1) return; //у нет даме, нельзя поставить.
    
            gameObject.value.groups = gameObject.value.groups.filter((g)=>!connectedGroups.map((cg)=>cg.id).includes(g.id));
            gameObject.value.groups.push(newGroup);
            groupId.value++;
    
            //если в каких-то группах было даме c этими координатами -- убираем
            gameObject.value.groups = gameObject.value.groups.map((g)=>{
                if(g.dames.some((d)=>d[0]==coords[0] && d[1]==coords[1]))
                {
                    g.dames = g.dames.filter((d)=>!(d[0]==coords[0] && d[1]==coords[1]));
    
                    if (g.color==alterColor) {
                        g.contrGroup.push(coords);
                    }
                    else {
                        g.stones.push(coords);
                        g.dames.push(...dames);
                        g.contrGroup.push(...contrGroup);
                    } 
                }
                return g;
            });
    
            vertex = `${abc[coords[0]-1]}${abc[coords[1]-1]}`;
    
            if(killed.length>0){
                gameObject.value.prisoners[currentColor=='black' ? 0 : 1] += killed.map(group=>{return group.stones.length;}).reduce((a, b) => a + b, 0);
            }
        }

        if (gameObject.value.currentMode=='black' || gameObject.value.currentMode=='white') 
        {
            moveId.value++;
            
            let newMove = {
                id:moveId.value,
                number: gameObject.value.moveNumber,
                color: gameObject.value.currentMode,
                coords: coords,
                vertex: vertex,
                children:[],
                marks:[],
                comment:''
            };

            //если нода пустая или текущий ход - последний в ветке    
            if( targetCurrentNode.value[targetCurrentNodeBranch.value].length==0 || targetCurrentNode.value[targetCurrentNodeBranch.value].length == currentMoveIndex+1)
            {
                targetCurrentNode.value[targetCurrentNodeBranch.value].push(newMove);
            }
            else { //если ход заводит новую ветку
                targetCurrentNode.value[targetCurrentNodeBranch.value][currentMoveIndex].children.push([newMove]);
                targetNodes.value.push({
                    number:gameObject.value.currentMove.number??null, 
                    branch:targetCurrentNode.value[targetCurrentNodeBranch.value][currentMoveIndex].children.length-1
                });
                targetCurrentNode.value = targetCurrentNode.value[targetCurrentNodeBranch.value][currentMoveIndex].children;
                targetCurrentNodeBranch.value = targetCurrentNode.value.length-1;
            }
        
            gameObject.value.currentMode=alterColor;
            gameObject.value.moveNumber++;
            gameObject.value.currentMove = newMove;
    
            if (killed.length==1 && killed[0].stones.length==1 && dames.length==1) {
                gameObject.value.ko={coords:killed[0].stones[0], moveNum:gameObject.value.moveNumber};
            }
    
            targetMovesCache.value[newMove.id] = JSON.stringify({
                ko: gameObject.value.ko,
                nodes: targetNodes.value,
                prisoners: gameObject.value.prisoners,
                currentMode: gameObject.value.currentMode, 
                currentMove: gameObject.value.currentMove,
                moveNumber: gameObject.value.moveNumber, 
                groups: gameObject.value.groups,
                currentNodeBranch: targetCurrentNodeBranch.value
            });
        }
        else {
            let cache = JSON.parse(targetMovesCache.value[gameObject.value.currentMove.id??null]);
            cache.groups = gameObject.value.groups;
            cache.prisoners = gameObject.value.prisoners;
            cache.nodes = currentNodes.value;
            targetMovesCache.value[gameObject.value.currentMove.id??null] = JSON.stringify(cache);
        }

        // console.log(`move(): ${performance.now() - start} мс`);
    }

    /**
     * Объект с игрой (для чтения SGF)
     */
    const parse_sgf_game = ref({});
    /**
     * Ошибки возникшие в процессе чтения SGF
     */
    const parse_sgf_errors = ref([]);
    /**
     * Текущая нода из дерева ходов (для чтения SGF)
     */
    const parse_sgf_currentNode = ref([]);
    /**
     * index текущей ветки ноды (для чтения SGF)
     */
    const parse_sgf_currentNodeBranch = ref(null);
    /**
     * кэш game для ходов (для чтения SGF)
     */
    const parse_sgf_movesCache = ref({});
    /**
     * Узлы текущего хода (для чтения SGF)
     */
    const parse_sgf_currentNodes = ref([]);
    /**
     * Парсим SGF
     * @param {String} sgf строка
     * @return {Void}
     */
    function parseSGF(sgf)
    {
        createNewGame({}, parse_sgf_game, parse_sgf_movesCache, parse_sgf_currentNode, parse_sgf_currentNodeBranch, parse_sgf_currentNodes);

        const commandSymbs = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
        
        let squareBrackets = false; //строка в квадратных скобках (могут быть любые символы, но их просто пишем в text)
        let command        = '';    //Начало записи команды (записываем command до '[', потом пишем текст в [] в text, и на ']' - выполняем команду с текстом.)
        let level = -1;
        let parentMoves = [];
        let squareInSquare = 0;
        let sNum = 0;

        parse_sgf_game.value = {
            size: [19,19],
            white_player_name: 'White',
            white_player_rank: null,
            black_player_name: 'Black',
            black_player_rank: null,
            game_date: null, //YYYY-MM-DD
            game_result: null, //B+Resign
            main_time: null, //Основное время в секундах
            overtime: null, //Контроль времени
            rules: 'Japanese', //Правила
            visible_vertices: [], //Видимая часть доски, пустой массив = вся доска
            movestree: [], //Дерево ходов
            ko: {coords:[], moveNum:null}, // ko
            prisoners: [0,0], //счетчик пленников [черных, белых]
            currentMode: 'black', //текущий режим (black, white, буквы, цифры)
            currentMove: {}, //текущий ход
            moveNumber: 0, //номер текущего хода
            groups: [], //Камни на доске (массив, содержащищий массивы - группы камней)
        };
        parse_sgf_errors.value = [];
        parse_sgf_currentNode.value = parse_sgf_game.value.movestree;
        parse_sgf_currentNodeBranch.value = null;
        parse_sgf_movesCache.value = {
            null: JSON.stringify({ //"нулевой" ход
                ko: {coords:[], moveNum:null},
                nodes:[],
                prisoners: [0,0],
                currentMode: 'black', 
                currentMove: {},
                moveNumber: 0, 
                groups: parse_sgf_game.value.groups,
                currentNodeBranch: null,
                comment:'',
            })
        };
        parse_sgf_currentNodes.value = [];
        
        for (let currentSymb of sgf)
        {
            if (commandSymbs.includes(currentSymb) && squareBrackets===false) //команда
            {
                command+=currentSymb; 
            }
            else if (currentSymb=='(' && squareBrackets===false){
                //новая ветка 
                level++;
                parentMoves.push(parse_sgf_game.value.currentMove.id??null);
            }
            else if (currentSymb==')' && squareBrackets===false){
                //конец новой ветки
                level--;
                let moveToId = null;
                if (level>0) moveToId = parentMoves.pop();

                moveTo(moveToId, parse_sgf_game, parse_sgf_currentNode, parse_sgf_currentNodeBranch, parse_sgf_movesCache, parse_sgf_currentNodes);
            }
            else if (currentSymb=='[') //начался текст команды
            {
                squareInSquare++;
                if (squareBrackets===false) squareBrackets = '';
                else squareBrackets+=currentSymb;
            }
            else if (currentSymb==']' && squareBrackets!==false) //закончился текст команды
            {
                squareInSquare--;
                if (squareInSquare>0) squareBrackets+=currentSymb;
                else{
                    commandSGF(command, squareBrackets);
                    squareBrackets = false;
                    if (sgf.charAt(sNum+1)!='[') command = '';
                }
            }
            else if (squareBrackets!==false){ //Идет текст команды в []
                squareBrackets+=currentSymb;
            }

            sNum++;
        }

        if(parse_sgf_errors.value.length == 0) {
            game.value = parse_sgf_game.value;
            currentNode.value = parse_sgf_currentNode.value;
            currentNodeBranch.value = parse_sgf_currentNodeBranch.value;
            movesCache.value = parse_sgf_movesCache.value;
        }

        return parse_sgf_errors.value
    }

    /**
     * Функция исполняющая команды SGF при работе parseSGF()
     * @param {string} command команда SGF
     * @param {string} text текст для команды SGF
     */
    function commandSGF(command, text)
    {
        if (command=='B' || command=='W') {
            parse_sgf_game.value.currentMode = (command == 'B' ? 'black' : 'white');
            let coords = [];
            if (text!='') coords = [abc.findIndex((s)=>s==text.charAt(0))+1, abc.findIndex((s)=>s==text.charAt(1))+1];
            move(coords, parse_sgf_game, parse_sgf_currentNode, parse_sgf_currentNodeBranch, parse_sgf_movesCache, parse_sgf_currentNodes);
        }
        else if (command=='C') //Комментарий к ходу
        {
            if(!parse_sgf_game.value.currentMove.id) parse_sgf_game.value.comment = text;
            else parse_sgf_game.value.currentMove.comment = text;

            let moveInfo = JSON.parse(parse_sgf_movesCache.value[parse_sgf_game.value.currentMove.id??null]);
            parse_sgf_game.value.currentMove.comment = text;
            moveInfo.comment = text;
            parse_sgf_movesCache.value[parse_sgf_game.value.currentMove.id??null] = JSON.stringify(moveInfo);
        }
        // else if (command=='AP') {} // Приложение, в котором создан SGF файл
        else if (command=='SZ') // Размер доски
        {
            let goban_size = text.split(':');
            if (goban_size.length>2) {
                parse_sgf_errors.value.push('Некорректный размер гобана');
                return;
            }
            if (goban_size.length==1) goban_size.push(goban_size[0]);

            goban_size = [parseInt(goban_size[0]), parseInt(goban_size[1])];

            if(goban_size[0]<=52 && goban_size[0]>0 && goban_size[1]<=52 && goban_size[1]>0) parse_sgf_game.value.size = goban_size;
            else parse_sgf_errors.value.push('Ошибка чтения размера доски');
        }
        else if (command=='VW') // Видимая часть доски
        {
            let vw = text.split(':');

            if (text=='') parse_sgf_game.value.visible_vertices = [];
            else if (vw.length==2) {
                // Вычисляем диапазон ja : sj
                let vw1 = abc.findIndex(s => s == vw[0].charAt(0));
                let vw2 = abc.findIndex(s => s == vw[0].charAt(1));
                let vw3 = abc.findIndex(s => s == vw[1].charAt(0));
                let vw4 = abc.findIndex(s => s == vw[1].charAt(1));

                if(vw1<0 || vw2<0 || vw3<0 || vw<0) {
                    parse_sgf_errors.value.push('Некорректное значение VW');
                    return;
                }
                
                parse_sgf_game.value.visible_vertices.push([[vw1+1, vw2+1],[vw3+1, vw4+1]]);
            }
            else if (vw.length==1) {
                let vw1 = abc.findIndex(s => s == vw[0].charAt(0));
                let vw2 = abc.findIndex(s => s == vw[0].charAt(1));
                
                if(vw1<0 || vw2<0) {
                    errors.value.push('Некорректное значение VW');
                    return;
                }

                game.value.visible_vertices.push([[vw1+1, vw2+1]]);
            }
            else if (vw.length>2) {
                parse_sgf_errors.value.push('Некорректное значение VW');
                return;
            }
        }
        // else if (command=='CA') {} // Кодировка файла
        // else if (command=='HA') {} // Что за команда? Встретилась в SGF задачи
        else if (command=='PB') // Имя игрока черными
        {
            parse_sgf_game.value.black_player_name = text;
        }
        else if (command=='PW') // Имя игрока белыми
        {
            parse_sgf_game.value.white_player_name = text;
        }
        else if (command=='AB') // Черные камни перед первым ходом
        {
            let cacheMode = parse_sgf_game.value.currentMode;
            parse_sgf_game.value.currentMode = 'blackStone';

            let coords = [abc.findIndex((s)=>s==text.charAt(0))+1, abc.findIndex((s)=>s==text.charAt(1))+1];
            move(coords, parse_sgf_game, parse_sgf_currentNode, parse_sgf_currentNodeBranch, parse_sgf_movesCache, parse_sgf_currentNodes);
            parse_sgf_game.value.currentMode = cacheMode;
        }
        else if (command=='AW') {
            let cacheMode = parse_sgf_game.value.currentMode;
            parse_sgf_game.value.currentMode = 'whiteStone';

            let coords = [abc.findIndex((s)=>s==text.charAt(0))+1, abc.findIndex((s)=>s==text.charAt(1))+1];
            move(coords, parse_sgf_game, parse_sgf_currentNode, parse_sgf_currentNodeBranch, parse_sgf_movesCache, parse_sgf_currentNodes);
            parse_sgf_game.value.currentMode = cacheMode;
        }
        else if (command=='N') {}
        // else if (command=='FF') {} //Версия файла
        else if (command=='GM' && text!=='1') parse_sgf_errors.value.push('Запись не относится к игре "Го"');
        else if (command=='RE' && text!='') //Результат игры
        {
            let res = text.split('+');
            let score = '', winner='';

            if(res[0]=="B") winner='black';
            else if (res[0]=="W") winner='white';
            
            if(res[1]){
                // if(res[1]=='R' || res[1]=="Resign") score="Resign";
                // else if (res[1]=="T" || res[1]=="Time") score="Time";
            }
            
            parse_sgf_game.value.game_result={
                winner:winner,
                score:score,
                text: text
            };
        }
    };

    return {
        game, gobanAction, moveTo, createNewGame, parseSGF, currentNodes
    }
}