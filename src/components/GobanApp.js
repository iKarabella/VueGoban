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
    
    let movestree = []; //Дерево ходов
    let ko = null; // ko
    let prisoners = [0,0]; //счетчик пленников [черных, белых]

    let stones = []; //Камни на доске (массив, содержащищий массивы - группы камней)

    /**
     * Парсим SGF
     * @param {String} sgf 
     */
    function parseSGF(sgf){
        //
    }

    return {
        settings, movestree, parseSGF, stones, ko, prisoners,
    }
}