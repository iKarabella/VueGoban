//Собственно вся логика гобана тут.

import { ref, computed } from "vue";

export default function () {

    const settings = ref({
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
    });

    const game = ref({
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

    const movesCache = ref({}); //кэш game для ходов

    const currentNode = ref(game.value.movestree); //текущая нода из дерева ходов
    const currentNodeBranch = ref(0); //index текущей ветки ноды
    const groupId = ref(0);
    const moveId = ref(0);

    /**
     * Список буквенных координат SGF
     */
    const abc = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

    /**
     * Создание новой игры
     * @param {*} info 
     */
    function createNewGame(info){
        settings.value.size = info.goban_size;
        settings.value.white_player_name = info.white_player_name;
        settings.value.white_player_rank = info.white_player_rank;
        settings.value.black_player_name = info.black_player_name;
        settings.value.black_player_rank = info.black_player_rank;
        settings.value.game_date = info.game_date;
        settings.value.game_result = info.game_result;
        settings.value.main_time = info.main_time;
        settings.value.overtime = info.overtime;
        settings.value.rules = info.rules;
        settings.value.comment = null;

        game.value.movestree = [[]];
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

    function move(coords){

        const start = performance.now();

        if(
            game.value.groups.some((g)=>g.stones.some((s)=>s[0]==coords[0] && s[1]==coords[1])) //место занято
            || (game.value.currentMode!='black' && game.value.currentMode!='white') //текущий режим не для ходов
        ) return; 

        let currentMoveIndex = currentNode.value[currentNodeBranch.value].findIndex(arr=>{
            return arr.vertex==game.value.currentMove.vertex && arr.number==game.value.currentMove.number;
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

        let alter = game.value.currentMode=='black'?'white':'black';

        let killed = game.value.groups.filter((g)=>{ //ищем убитые этим ходом группы
            return g.color==alter && g.dames.length==1 && g.dames[0][0]==coords[0] && g.dames[0][1]==coords[1];
        });
        
        if(game.value.ko.moveNum<game.value.moveNumber) game.value.ko = {coords:[], moveNum:null}; //сбрасываем ко после хода

        //проверяем на Ко
        if (
            killed.length==1 && 
            killed[0].stones.length==1 && 
            game.value.ko.moveNum==game.value.moveNumber && 
            (game.value.ko.coords[0]==coords[0] && game.value.ko.coords[1]==coords[1])
        ) return; 

        if(killed.length>0){
            killed.forEach((k)=>{
                game.value.groups = game.value.groups.filter((g)=>g.id!=k.id).map((g)=>{
                    let killedStones = g.contrGroup.filter((gc)=>k.stones.some((ks)=>ks[0] == gc[0] && ks[1] == gc[1]));
                    g.contrGroup = g.contrGroup.filter((gc)=>!k.stones.some((ks)=>ks[0] == gc[0] && ks[1] == gc[1]));
                    g.dames.push(...killedStones);
                    return g;
                });
            });
        }

        let dames = [], contrGroup = [];
        
        if (coords[0]-1>0) {
            let check = game.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]-1 && s[1]==coords[1]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0]-1, coords[1]]);
            }
            else dames.push([coords[0]-1, coords[1]]);
        }
        if (coords[0]+1<=settings.value.size[0]) {
            let check = game.value.groups.find((g)=>g.stones.some((s)=>s[0]==coords[0]+1 && s[1]==coords[1]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0]+1,coords[1]]);
            }
            else dames.push([coords[0]+1,coords[1]]);
        }
        if (coords[1]-1>0) {
            let check = game.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]-1 && s[0]==coords[0]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0], coords[1]-1]);
            }
            else dames.push([coords[0], coords[1]-1]);
        }
        if (coords[1]+1<=settings.value.size[1]) {
            let check = game.value.groups.find((g)=>g.stones.some((s)=>s[1]==coords[1]+1 && s[0]==coords[0]));
            if (check)  {
                if(check.color==alter) contrGroup.push([coords[0],coords[1]+1]);
            }
            else dames.push([coords[0],coords[1]+1]);
        }

        let connectedGroups = game.value.groups.filter((group)=>{
            return group.color==game.value.currentMode && group.dames.some((d)=>d[0]==coords[0] && d[1]==coords[1]);
        });

        let newGroup = {
            id:groupId.value,
            color:game.value.currentMode,
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

        game.value.groups = game.value.groups.filter((g)=>!connectedGroups.map((cg)=>cg.id).includes(g.id));
        game.value.groups.push(newGroup);
        groupId.value++;

        //если в каких-то группах было даме c этими координатами -- убираем
        game.value.groups = game.value.groups.map((g)=>{
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

        moveId.value++;

        let newMove = {
            id:moveId.value,
            number: game.value.moveNumber,
            color: game.value.currentMode,
            coords: coords,
            vertex: vertex,
            children:[],
            marks:[],
        };

        if(killed.length>0){
            game.value.prisoners[game.value.currentMode=='black'?0:1]+=killed.map(group=>{return group.stones.length;}).reduce((a, b) => a + b, 0);
        }

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

        game.value.currentMode=alter;
        game.value.moveNumber++;
        game.value.currentMove = newMove;

        if (killed.length==1 && killed[0].stones.length==1 && dames.length==1) {
            game.value.ko={coords:killed[0].stones[0], moveNum:game.value.moveNumber};
        }

        movesCache.value[newMove.id] = JSON.stringify({
            ko: game.value.ko,
            prisoners: game.value.prisoners,
            currentMode: game.value.currentMode, 
            currentMove: game.value.currentMove,
            moveNumber: game.value.moveNumber, 
            groups: game.value.groups,
            currentNodeBranch: currentNodeBranch.value
        });

        console.log(`move(): ${performance.now() - start} мс`);
    }

    const parse_sgf_settings = ref({
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
    });

    const parse_sgf_game = ref({
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
            settings : parse_sgf_errors.value.length>0 ? null : parse_sgf_settings.value, 
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
        console.log('commandSGF', command, text);

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

            if(goban_size[0]<=52 && goban_size[0]>0 && goban_size[1]<=52 && goban_size[1]>0) parse_sgf_settings.value.size = goban_size;
            else parse_sgf_errors.value.push('Ошибка чтения размера доски');
        }
        else if (command=='VW') // Видимая часть доски
        {
            let vw = text.split(':');

            if (text=='') parse_sgf_settings.value.visible_vertices = [];
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
                
                parse_sgf_settings.value.visible_vertices.push([[vw1+1, vw2+1],[vw3+1, vw4+1]]);
            }
            else if (vw.length==1) {
                let vw1 = abc.findIndex(s => s == vw[0].charAt(0));
                let vw2 = abc.findIndex(s => s == vw[0].charAt(1));
                
                if(vw1<0 || vw2<0) {
                    errors.value.push('Некорректное значение VW');
                    return;
                }

                settings.value.visible_vertices.push([[vw1+1, vw2+1]]);
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
            parse_sgf_settings.value.black_player_name = text;
        }
        else if (command=='PW') // Имя игрока белыми
        {
            parse_sgf_settings.value.white_player_name = text;
        }
        else if (command=='AB') // Черные камни перед первым ходом
        {
            //
        }
        else if (command=='AW') {}
        else if (command=='N') {}
        // else if (command=='FF') {} //Версия файла
        else if (command=='GM' && text!=='1') parse_sgf_errors.value.push('Запись не относится к игре "Го"');
    };

    return {
        settings, game, gobanAction, moveTo, createNewGame, parseSGF
    }
}