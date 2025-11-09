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

const size = computed(()=>{    
    for(let i = props.size; i>0; i--) //TODO может без цикла как-то можно это высчитать?
    {
        let field = Math.round(i/(props.descSize[0]+2));
        if (field>35) field = 35;
        let s = (i-field*2)/props.descSize[0]-1;
        if((s ^ 0) === s && s%2 !== 0) return i;
    }
    return props.size;
});

const fieldSize = computed(()=>{
    let field = Math.round(size.value/(props.descSize[0]+2));
    return field > 35 ? 35 : field;
});

const elSize = computed(()=>{
    return (size.value-fieldSize.value*2)/props.descSize[0]-1;
});

const svgSize = computed(()=>{
    return {
        width: size.value, 
        height: size.value
    };
});

const alphabet = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

const gobanLines = computed(()=>{
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

const stars = computed(()=>{

    let stars = {
        3: [{cx:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`}],
        5: [{cx:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*2)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`}],
        7: [{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`}],
        9: [{cx:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*3)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*5)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*5)-elSize.value/2}`}],
        13: [{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*7)-elSize.value/2}`}],
        19: [{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*4)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*10)-elSize.value/2}`},{cx:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*16)-elSize.value/2}`}]
    };

    if(props.descSize[0]==props.descSize[1] && props.descSize[0] % 2 !== 0){
        return stars[props.descSize[0]]!==undefined ? stars[props.descSize[0]] : [{cx:`${(fieldSize.value-1+(elSize.value+1)*(props.descSize[0]+1)/2)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*(props.descSize[0]+1)/2)-elSize.value/2}`}]
    }
    else return [];
});

</script>

<template>
    <div>
        <svg :width="`${svgSize.width}px`" :height="`${svgSize.height}px`" style="border:1px solid gray">
            <defs>
                <image id="white-shell-0-11-735" :width="elSize" :height="elSize" x="0" y="0" xlink:href=""></image>
            </defs>
            <g>
                <text v-for="i in descSize[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="fieldSize-1" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text v-for="i in descSize[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="size-fieldSize/1.5" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text v-for="i in descSize[0]" :x="fieldSize/2" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ i }}</text>
                <text v-for="i in descSize[0]" :x="size-(fieldSize*0.9)" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ i }}</text>
            </g>
            <g>
                <path :d="gobanLines" stroke="#442211" stroke-width="1px" stroke-linecap="square"></path>
                <circle v-for="star in stars" :cx="star.cx" :cy="star.cy" r="2.0px" fill="#000000"></circle>
            </g>
        </svg>
        <br/>[{{ descSize[0] }}|{{ elSize }}|{{ fieldSize }}]
    </div>
</template>