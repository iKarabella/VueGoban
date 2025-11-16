//Собственно вся логика гобана тут.

import { ref, computed } from "vue";

export default function () {

    const settings = ref({
        size: [9,9],
        white_player_name: 'White',
        white_player_rank: null,
        black_player_name: 'Black',
        black_player_rank: null,
        game_date: null, //YYYY-MM-DD
        game_result: null, //B+Resign
        main_time: null, //Основное время в секундах
        overtime: null, //Контроль времени
        comment: null, //комментарий до первого хода
        zero_white: [], //белые камни до первого хода 
        zero_black: [], //черные камни до первого хода
    });

    const game = ref({
        movestree: [], //Дерево ходов
        ko: {coords:null, moveNum:null}, // ko
        prisoners: [0,0], //счетчик пленников [черных, белых]
        currentMode: 'black', //текущий режим (black, white, буквы, цифры)
        moveNumber: 0, //номер текущего хода
        groups: [], //Камни на доске (массив, содержащищий массивы - группы камней)
    });

    const groupId = ref(0);

    /**
     * Список буквенных координат SGF
     */
    const abc = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

    function gobanAction(action){
        if (action.type=='move') move(action.coords);
    }

    function move(coords){

        if(game.value.groups.some((g)=>g.stones.some((s)=>s[0]==coords[0] && s[1]==coords[1]))) return; //место занято

        let alter = game.value.currentMode=='black'?'white':'black';

        let killed = game.value.groups.filter((g)=>{ //ищем убитые этим ходом группы
            return g.color==alter && g.dames.length==1 && g.dames[0][0]==coords[0] && g.dames[0][1]==coords[1];
        });

        if (
            killed.length==1 && 
            killed[0].stones.length==1 && 
            game.value.ko.moveNum==game.value.moveNumber && 
            (game.value.ko.coords[0]==coords[0] && game.value.ko.coords[1]==coords[1])
        ){
            //ход запрещен правилом Ко
            return;
        }

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

        //TODO если камень объединяет группы
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
        game.value.currentMode=alter;
        game.value.moveNumber++;
        //TODO добавить ход в movestree
    }

    /**
     * Парсим SGF
     * @param {String} sgf 
     */
    function parseSGF(sgf){ //TODO
        let currentSymb = '';
        let prevSymbol     = '';    //предыдущий символ
        let level          = 0;     //уровень чтения по '()'
        let currentBranch  = null;  //текущая ветка, ветки разделяются символами '()', но первая дочерняя ветка является частью родительской ветки
        let currentMove    = null;  //текущий ход (ходы разделяются символом ';', может быть несколько ходов с одним номером, если они находятся в разных ветках)
        let text           = '';    //текст в []
        let squareBrackets = false; //строка в квадратных скобках (могут быть любые символы, но их просто пишем в text)
        let command        = '';    //Начало записи команды (записываем command до '[', потом пишем текст в [] в text, и на ']' - выполняем команду с текстом.)
        let commandSymbs = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
        
        for (let i = 0; i < sgf.length; i++) 
        {
            currentSymb = sgf.charAt(i);
            if (commandSymbs.includes(currentSymb) && !squareBrackets) //команда
            {
                command+=currentSymb; 
                continue;
            }
            else if (currentSymb=='[' && !squareBrackets) //начался текст команды
            {
                squareBrackets = true; 
                continue;
            }
            else if (currentSymb==']' && prevSymbol!='\\' && squareBrackets) //закончился текст команды
            {
                //
            }

            if (!currentSymb) prevSymbol = currentSymb;
            if (squareBrackets && currentSymb!='\\') text+=currentSymb;
        }
    }

    return {
        settings, game, parseSGF, gobanAction
    }
}