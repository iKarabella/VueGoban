//Собственно вся логика гобана тут.

import { ref, computed } from "vue";

export default function () {

    /**
     * Информация об игре
     */
    const game = ref({
        size: [19,19],
        white_player_name: 'White',
        white_player_rank: null,
        black_player_name: 'Black',
        black_player_rank: null,
        game_date: null, //YYYY-MM-DD
        game_result: null, //B+Resign
        main_time: null, //Основное время в секундах
        overtime: null, //Контроль времени
        comment: null, //комментарий до первого хода
        rules: 'Japanese', //Правила
        ko: {coords:[], moveNum:null}, // ko
        prisoners: [0,0], //счетчик пленников [черных, белых]
        currentMode: 'black', //текущий режим (black, white, буквы, цифры)
        currentMove: {}, //текущий ход
        moveNumber: 0, //номер текущего хода
        groups: [], //Камни на доске (массив, содержащищий массивы - группы камней)
        visible_vertices: [], //Видимая часть доски, пустой массив = вся доска
        movestree: [ //Дерево ходов
            [      //Нулевая ветка 
                { //Нулевой ход
                    id:null,
                    number: null,
                    color: null,
                    coords: null,
                    vertex: null,
                    children:[],
                    marks:[],
                }
            ]
        ], 
    });

    const currentNode = ref(game.value.movestree); //текущая нода из дерева ходов
    const currentNodeBranch = ref(0); //index текущей ветки ноды
    const groupId = ref(0);
    const moveId = ref(0);

    const movesCache = ref({ //кэш game для ходов
        null: JSON.stringify({ //"нулевой" ход
            ko: {coords:[], moveNum:null},
            prisoners: [0,0],
            currentMode: 'black', 
            currentMove: {},
            moveNumber: 0, 
            groups: game.value.groups,
            currentNodeBranch: 0
        })
    });

    /**
     * Список буквенных координат SGF
     */
    const abc = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

    /**
     * Создание новой игры
     * @param {*} info 
     */
    function createNewGame(info){
        game.value.size = info.goban_size;
        game.value.white_player_name = info.white_player_name;
        game.value.white_player_rank = info.white_player_rank;
        game.value.black_player_name = info.black_player_name;
        game.value.black_player_rank = info.black_player_rank;
        game.value.game_date = info.game_date;
        game.value.game_result = info.game_result;
        game.value.main_time = info.main_time;
        game.value.overtime = info.overtime;
        game.value.rules = info.rules;
        game.value.comment = null;
        game.value.movestree = [ //Дерево ходов
            [      //Нулевая ветка 
                { //Нулевой ход
                    id:null,
                    number: null,
                    color: null,
                    coords: null,
                    vertex: null,
                    children:[],
                    marks:[],
                }
            ]
        ];
        game.value.ko = {coords:[], moveNum:null};
        game.value.prisoners = [0,0];
        game.value.currentMode = 'black';
        game.value.currentMove =  {};
        game.value.moveNumber = 0;
        game.value.groups = [];

        movesCache.value={};
        currentNode.value = game.value.movestree;
        currentNodeBranch.value = 0;
        groupId.value = 0;
        moveId.value = 0;
    }

    function gobanAction(action){
        if (action.type=='move') move(action.coords);
    }

    /**
     * Переход к существующему ходу
     * @param {Object} coords 
     * @return {Void}
     */
    function moveTo(coords){
        if(!coords) return;
        let cache = movesCache.value[coords.id];
        if(!cache) return;

        cache = JSON.parse(cache);

        game.value.ko = cache.ko;
        game.value.prisoners = cache.prisoners;
        game.value.currentMode = cache.currentMode; 
        game.value.currentMove = cache.currentMove;
        game.value.moveNumber = cache.moveNumber;
        game.value.groups = cache.groups;
        currentNodeBranch.value = cache.currentNodeBranch;

        let findNode = game.value.movestree;
        let findIndex = 0;

        if (coords.nodes!==null) {
            coords.nodes.forEach(node => {
                let find = findNode[findIndex].find(move=>move.number==node.number);
                if (find) {
                    findNode = find.children;
                    findIndex = node.branch;
                }
            });
    
            currentNode.value = findNode;
            currentNodeBranch.value = findIndex;
        }
    }

    /**
     * Постановка камня на доску
     * @param {Array} coords координаты поставленного камня
     * @param {Object} gameObject объект с данными об игре
     * @return {Void}
     */
    function move(coords, gameObject = game){
        const start = performance.now();

        const availableModes = ['black', 'white', 'blackStones', 'whiteStones'];

        if(
            gameObject.value.groups.some((g)=>g.stones.some((s)=>s[0]==coords[0] && s[1]==coords[1])) //место занято
            || (!availableModes.includes(gameObject.value.currentMode)) //текущий режим не подходит
        ) return; 

        let currentMoveIndex = currentNode.value[currentNodeBranch.value].findIndex(arr=>{
            return arr.vertex==gameObject.value.currentMove.vertex && arr.number==gameObject.value.currentMove.number;
        });

        let nextMoveIndex = currentMoveIndex+1;
        let existInNextMoves = false;

        if( //если ход в следующий существующий
            currentNode.value[currentNodeBranch.value][nextMoveIndex] &&
            currentNode.value[currentNodeBranch.value][nextMoveIndex].coords[0]==coords[0] &&
            currentNode.value[currentNodeBranch.value][nextMoveIndex].coords[1]==coords[1]
        ) {
            existInNextMoves = true;
            moveTo({nodes:null, id:currentNode.value[currentNodeBranch.value][nextMoveIndex].id, number:currentNode.value[currentNodeBranch.value][nextMoveIndex].number});
        }
        else if(currentMoveIndex>=0) {
            //если ход в первый ход какой-то дочерней ветки текущего хода
            currentNode.value[currentNodeBranch.value][currentMoveIndex].children.forEach((child, index)=>{
                if(child[0].coords[0]==coords[0] && child[0].coords[1]==coords[1]) {
                    existInNextMoves = true;
                    currentNode.value = currentNode.value[currentNodeBranch.value][currentMoveIndex].children;
                    moveTo({nodes:null, id:child[0].id, number:child[0].number});
                    return;
                }
            });
        }

        if (existInNextMoves) return;

        let alter = gameObject.value.currentMode=='black'?'white':'black';

        let killed = gameObject.value.groups.filter((g)=>{ //ищем убитые этим ходом группы
            return g.color==alter && g.dames.length==1 && g.dames[0][0]==coords[0] && g.dames[0][1]==coords[1];
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

        let dames = [], contrGroup = [];
        
        if (coords[0]-1>0) {
            let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]-1 && s[1]==coords[1]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0]-1, coords[1]]);
            }
            else dames.push([coords[0]-1, coords[1]]);
        }
        if (coords[0]+1<=gameObject.value.size[0]) {
            let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]+1 && s[1]==coords[1]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0]+1,coords[1]]);
            }
            else dames.push([coords[0]+1,coords[1]]);
        }
        if (coords[1]-1>0) {
            let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]-1 && s[0]==coords[0]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0], coords[1]-1]);
            }
            else dames.push([coords[0], coords[1]-1]);
        }
        if (coords[1]+1<=gameObject.value.size[1]) {
            let check = gameObject.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]+1 && s[0]==coords[0]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0],coords[1]+1]);
            }
            else dames.push([coords[0],coords[1]+1]);
        }

        let connectedGroups = gameObject.value.groups.filter((group)=>{
            return group.color==gameObject.value.currentMode && group.dames.some((d)=>d[0]==coords[0] && d[1]==coords[1]);
        });

        let newGroup = {
            id:groupId.value,
            color:gameObject.value.currentMode,
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

                if (g.color==alter) {
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

        let vertex = `${abc[coords[0]-1]}${abc[coords[1]-1]}`;

        if(killed.length>0){
            gameObject.value.prisoners[gameObject.value.currentMode=='black'?0:1]+=killed.map(group=>{return group.stones.length;}).reduce((a, b) => a + b, 0);
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
            };
            //если нода пустая или текущий ход - последний в ветке         
            if( currentNode.value[currentNodeBranch.value].length==0 || currentNode.value[currentNodeBranch.value].length == currentMoveIndex+1)
            {
                    currentNode.value[currentNodeBranch.value].push(newMove);
            }
            else { //если ход заводит новую ветку
                currentNode.value[currentNodeBranch.value][currentMoveIndex].children.push([newMove]);
                currentNode.value = currentNode.value[currentNodeBranch.value][currentMoveIndex].children;
                currentNodeBranch.value = currentNode.value.length-1;
            }
        
            gameObject.value.currentMode=alter;
            gameObject.value.moveNumber++;
            gameObject.value.currentMove = newMove;
    
            if (killed.length==1 && killed[0].stones.length==1 && dames.length==1) {
                gameObject.value.ko={coords:killed[0].stones[0], moveNum:game.value.moveNumber};
            }
    
            movesCache.value[newMove.id] = JSON.stringify({
                ko: gameObject.value.ko,
                prisoners: gameObject.value.prisoners,
                currentMode: gameObject.value.currentMode, 
                currentMove: gameObject.value.currentMove,
                moveNumber: gameObject.value.moveNumber, 
                groups: gameObject.value.groups,
                currentNodeBranch: currentNodeBranch.value
            });
        }

        console.log(`move(): ${performance.now() - start} мс`);
    }

    const parse_sgf_game = ref({
        size: [19,19],
        white_player_name: 'White',
        white_player_rank: null,
        black_player_name: 'Black',
        black_player_rank: null,
        game_date: null, //YYYY-MM-DD
        game_result: null, //B+Resign
        main_time: null, //Основное время в секундах
        overtime: null, //Контроль времени
        comment: null, //комментарий до первого хода
        rules: 'Japanese', //Правила
        visible_vertices: [], //Видимая часть доски, пустой массив = вся доска
        movestree: [ //Дерево ходов
            [] //нулевая ветка
        ],
        ko: {coords:[], moveNum:null}, // ko
        prisoners: [0,0], //счетчик пленников [черных, белых]
        currentMode: 'black', //текущий режим (black, white, буквы, цифры)
        currentMove: {}, //текущий ход
        moveNumber: 0, //номер текущего хода
        groups: [], //Камни на доске (массив, содержащищий массивы - группы камней)
    });

    const parse_sgf_movesCache = ref({}); //кэш game для ходов

    const parse_sgf_currentNode = ref(game.value.movestree); //текущая нода из дерева ходов
    const parse_sgf_currentNodeBranch = ref(0); //index текущей ветки ноды
    const parse_sgf_groupId = ref(0);
    const parse_sgf_moveId = ref(0);

    /**
     * Ошибки возникшие в процессе чтения
     */
    const parse_sgf_errors = ref([]);

    /**
     * Парсим SGF
     * @param {String} sgf строка
     * @return {Object} объект с игрой для гобана
     */
    function parseSGF(sgf){ //TODO
        let currentSymb = '';
        let prevSymbol     = '';    //предыдущий символ
        let level          = 0;     //уровень чтения по '()'
        let currentBranch  = null;  //текущая ветка, ветки разделяются символами '()', но первая дочерняя ветка является частью родительской ветки
        let currentMove    = null;  //текущий ход (ходы разделяются символом ';', может быть несколько ходов с одним номером, если они находятся в разных ветках)
        let squareBrackets = false; //строка в квадратных скобках (могут быть любые символы, но их просто пишем в text)
        let command        = '';    //Начало записи команды (записываем command до '[', потом пишем текст в [] в text, и на ']' - выполняем команду с текстом.)
        let commandSymbs = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
        
        for (let i = 0; i < sgf.length; i++) 
        {
            currentSymb = sgf.charAt(i);
            if (commandSymbs.includes(currentSymb) && squareBrackets===false) //команда
            {
                command+=currentSymb; 
                continue;
            }
            else if (currentSymb=='[' && squareBrackets===false) //начался текст команды
            {
                squareBrackets = ''; 
                continue;
            }
            else if (currentSymb==']' && prevSymbol!='\\' && squareBrackets!==false) //закончился текст команды
            {
                commandSGF(command, squareBrackets);
                squareBrackets = false;
                if (sgf.charAt(i+1)!='[') command = '';
                continue;
            }
            else if (squareBrackets!==false){ //Идет текст команды в []
                squareBrackets+=currentSymb;
                continue;
            }

            if (!currentSymb) prevSymbol = currentSymb;
        }

        return {
            game : parse_sgf_errors.value.length>0 ? null : parse_sgf_game.value, 
            errors : parse_sgf_errors.value.length>0 ? parse_sgf_errors.value : null
        }
    }
    /**
     * Функция исполняющая команды SGF при работе parseSGF()
     * @param {string} command команда SGF
     * @param {string} text текст для команды SGF
     */
    function commandSGF(command, text)
    {
        if (command=='B') {}
        else if (command=='W') {}
        else if (command=='C') {}
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
            let cacheMode = parse_sgf_game.currentMode;
            parse_sgf_game.currentMode = 'blackStone';

            let coords = [abc.findIndex((s)=>s==text.charAt(0))+1, abc.findIndex((s)=>s==text.charAt(1))+1];
            move(coords, parse_sgf_game);
            parse_sgf_game.currentMode = cacheMode;
        }
        else if (command=='AW') {}
        else if (command=='N') {}
        // else if (command=='FF') {} //Версия файла
        else if (command=='GM' && text!=='1') parse_sgf_errors.value.push('Запись не относится к игре "Го"');
    };

    return {
        game, gobanAction, moveTo, createNewGame, parseSGF
    }
}