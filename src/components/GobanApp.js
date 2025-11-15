//Собственно вся логика гобана тут.

import { ref, computed } from "vue";

export default function () {

    let settings = {
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
        zero_white: [], //белые камни до первого хода 
        zero_black: [], //черные камни до первого хода
    }

    let game = {
        movestree: [], //Дерево ходов
        ko: null, // ko
        prisoners: [0,0], //счетчик пленников [черных, белых]
        currentMode: 'black', //текущий режим (black, white, буквы, цифры)
        stones: [], //Камни на доске (массив, содержащищий массивы - группы камней)
    };

    /**
     * Список буквенных координат SGF
     */
    const abc = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

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
        settings, parseSGF, game
    }
}