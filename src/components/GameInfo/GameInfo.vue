<script setup>
import { computed } from 'vue';

const props = defineProps({
    game:{type:Object, default: {
        black_player_name:'Black',
        white_player_name:'White',
        prisoners:[0,0]
    }},
});
const emit = defineEmits({revertColors:null});

const blackPrisoners = computed(()=>{
    if (!props.game.prisoners || !props.game.prisoners.length) return 0;
    return props.game.prisoners[0];
});
const whitePrisoners = computed(()=>{
    if (!props.game.prisoners || !props.game.prisoners.length) return 0;
    return props.game.prisoners[1];
});
const game_result = computed(()=>{
    let winner = '', score='';

    if(!props.game.game_result || !props.game.game_result.winner) return null;

    if(props.game.game_result.winner=='Draw') winner="Ничья";
    else if(props.game.game_result.winner=='black') winner = "Черные выиграли";
    else if (props.game.game_result.winner=='white') winner = 'Белые выиграли'
    
    if (props.game.game_result.score=='Resign') score=' по сдаче';
    else if (props.game.game_result.score=='Forfeit') score='';
    else if (props.game.game_result.score=='Time') score=' по времени';
    else {
        let word = 'очков';
        let num = parseFloat(props.game.game_result.score);

        if(/[\.,]/.test(props.game.game_result.score)){
            //TODO числительное если счет с 0,5
        }
        else {
            //TODO числительное если счет целый
        }
        score = ` ${num} ${word}`
    }
    
    return `${winner}${score}`
});
</script>
<template>
    <div>
        <div class="flex w-full">
            <div class="w-6/12 relative rounded border border-gray-500 p-4 mr-2 bg-gray-800 text-white">
                <div>
                    <div class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm">
                        {{ game.black_player_name }}
                    </div>
                </div>
                <div class="w-full block mt-2">
                    <span>{{ blackPrisoners }} {{ blackPrisoners==1?'пленный':'пленных' }}</span>
                </div>
            </div>
            <div class="w-6/12 relative rounded border border-gray-500 p-4 ml-2 bg-gray-100">
                <div>
                    <div class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-md shadow-sm">
                        {{ game.white_player_name }}
                    </div>
                </div>
                <div class="w-full block mt-2">
                    <span>{{ whitePrisoners }} {{ whitePrisoners==1?'пленный':'пленных' }}</span>
                </div>
            </div>
        </div>
        <div v-if="game_result!=null" class="text-gray-200 text-right">
            {{ game_result }}
        </div>
    </div>
</template>