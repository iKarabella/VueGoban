<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
    descSize:{type:Array, default:[19,19]}, //размер доски
    displayArea:{ //отображаемая часть доски
        type: Array,
        default: [[1,19],[1,19]]
    },
    stones:{type:Array, default:[]},
    showCoordinates:{type:Boolean, default:true},
    size:{type:Number, default:550},
});

const fieldSize = computed(()=>{
    let field = Math.round(props.size/(props.descSize[0]+2));
    return field > 35 ? 35 : field;
});

const elSize = computed(()=>{
    return (props.size-fieldSize.value*2)/props.descSize[0]-1;
});

const svgSize = computed(()=>{
    return {
        width: props.size, 
        height: props.size
    };
});

const alphabet = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

const gobanLines = computed(()=>
{
    let ret = '';
    let halfSize = elSize.value/2;

    for (let i = 0; i < props.descSize[0]; i++) {
        ret+=`M ${halfSize+fieldSize.value} ${halfSize+fieldSize.value+(elSize.value*i)+i} L ${(fieldSize.value+elSize.value*props.descSize[0]+props.descSize[0])-halfSize-1} ${halfSize+fieldSize.value+(elSize.value*i)+i} `;
    }
    for (let i = 0; i < props.descSize[1]; i++) {
       ret+=`M ${halfSize+fieldSize.value+(elSize.value*i)+i} ${halfSize+fieldSize.value} L ${halfSize+fieldSize.value+(elSize.value*i)+i} ${(fieldSize.value+elSize.value*props.descSize[0]+props.descSize[0])-halfSize-1} `;
    }

    return ret;
});
</script>

<template>
    <div>
        <svg :width="`${svgSize.width}px`" :height="`${svgSize.height}px`" style="border:1px solid gray">
            <g class="coordinates">
                <text v-for="i in descSize[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="fieldSize-1" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text v-for="i in descSize[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="size-fieldSize/1.5" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text v-for="i in descSize[0]" :x="fieldSize/2" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ i }}</text>
                <text v-for="i in descSize[0]" :x="size-(fieldSize/1.5)" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ i }}</text>
            </g>
            <g>
                <path :d="gobanLines" stroke="#442211" stroke-width="1px" stroke-linecap="square"></path>
            </g>
        </svg>
        <br/>[{{ descSize[0] }}|{{ elSize }}|{{ fieldSize }}|{{ size-fieldSize }}]
    </div>
</template>
<style scoped>
    .coordinates {
        text-align:center;
    }
</style>