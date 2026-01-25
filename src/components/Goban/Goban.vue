<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';

const props = defineProps({
    displayArea:{ //отображаемая часть доски
        type: Array,
        default: [[1,19],[1,19]]
    },
    showCoordinates:{type:Boolean, default:true},
    size:{type:Number, default:550},
    game:{type:Object}
});

const emit = defineEmits(['action']);
const alphabet = 'abcdefghjklmnopqrstuvwxyz';

const size = computed(()=>{    
    for(let i = props.size; i>0; i--) //TODO может без цикла как-то можно это высчитать?
    {
        let field = Math.round(i/(props.game.size[0]+2));
        if (field>35) field = 35;
        let s = (i-field*2)/props.game.size[0]-1;
        if((s ^ 0) === s && s%2 !== 0) return i;
    }
    return props.size;
});

const fieldSize = computed(()=>{
    let field = Math.round(size.value/(props.game.size[0]+2));
    return field > 35 ? 35 : field;
});

const elSize = computed(()=>{
    return (size.value-fieldSize.value*2)/props.game.size[0]-1;
});

const svgSize = computed(()=>{
    return {
        width: size.value, 
        height: size.value
    };
});

const gobanLines = computed(()=>{
    let ret = '';
    let halfSize = elSize.value/2;

    for (let i = 0; i < props.game.size[0]; i++) {
        ret+=`M ${halfSize+fieldSize.value} ${halfSize+fieldSize.value+(elSize.value*i)+i} L ${(fieldSize.value+elSize.value*props.game.size[0]+props.game.size[0])-halfSize-1} ${halfSize+fieldSize.value+(elSize.value*i)+i} `;
    }
    for (let i = 0; i < props.game.size[1]; i++) {
       ret+=`M ${halfSize+fieldSize.value+(elSize.value*i)+i} ${halfSize+fieldSize.value} L ${halfSize+fieldSize.value+(elSize.value*i)+i} ${(fieldSize.value+elSize.value*props.game.size[0]+props.game.size[0])-halfSize-1} `;
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

    if(props.game.size[0]==props.game.size[1] && props.game.size[0] % 2 !== 0){
        return stars[props.game.size[0]]!==undefined ? stars[props.game.size[0]] : [{cx:`${(fieldSize.value-1+(elSize.value+1)*(props.game.size[0]+1)/2)-elSize.value/2}`, cy:`${(fieldSize.value-1+(elSize.value+1)*(props.game.size[0]+1)/2)-elSize.value/2}`}]
    }
    else return [];
});

const vertices = ref([]);

onBeforeMount(() => {
    vertexCalc();
});

const vertexCalc = function(){
    let comp_vertices = [];
    for(let x=props.game.size[0]; x>0; x--) {
        for(let y=1; y<=props.game.size[1]; y++){
            comp_vertices.push({
                coords: [x, y],
                class:''
            });
        }
    }
    vertices.value = comp_vertices;
};

const gobanSize = computed(()=>{
    return JSON.stringify(props.game.size);
});

watch(gobanSize, ()=>{
    vertexCalc();
});

const clickVertice = function(coords)
{    
    if (props.game.currentMode == 'white' || props.game.currentMode=='black') 
    {
        let stone = props.game.groups.some((g)=>{
            return g.stones.some((s)=>{return s[0]==coords[0] && s[1]==coords[1];});
        });
        if (!stone) emit('action', {type:'move', coords:coords});
    }
}

const hoverVertice = function(index, hover=true)
{
    if (hover) 
    {
        if (props.game.currentMode=='white') vertices.value[index].class='vertex white';
        else if (props.game.currentMode=='black') vertices.value[index].class='vertex black';
    }
    else vertices.value[index].class='';
}

const whiteStone = 'data:image/png;base64,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';
const blackStone = 'data:image/png;base64,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';
</script>

<template>
    <div class="goban-container">
        <svg :width="`${svgSize.width}px`" :height="`${svgSize.height}px`" style="border:1px solid gray">
            <defs>
                <image id="black-1" :width="elSize+1" :height="elSize+1" :xlink:href="blackStone"></image>
                <image id="white-1" :width="elSize+1" :height="elSize+1" :xlink:href="whiteStone"></image>
            </defs>
            <g>
                <text style="text-transform: uppercase;" v-for="i in game.size[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="fieldSize-1" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text style="text-transform: uppercase;" v-for="i in game.size[0]" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="size-fieldSize/1.5" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text style="text-transform: uppercase;" v-for="i in game.size[1]" :x="fieldSize/2" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ game.size[1]-i+1 }}</text>
                <text style="text-transform: uppercase;" v-for="i in game.size[1]" :x="size-(fieldSize*0.9)" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ game.size[1]-i+1 }}</text>
            </g>
            <g>
                <path :d="gobanLines" stroke="#442211" stroke-width="1px" stroke-linecap="square"></path>
                <circle v-for="star in stars" :cx="star.cx" :cy="star.cy" r="2.0px" fill="#000000"></circle>
            </g>
            <g>
                <g v-for="(group, gindex) in game.groups" :key="gindex">
                    <use v-for="e in group.stones" 
                        :href="group.color=='white'?'#white-1':'#black-1'" 
                        :opacity="e.opacity"
                        :transform="`translate(${(fieldSize+(elSize+1)*(e[1]-1))}, ${(fieldSize+(elSize+1)*(game.size[0]-e[0]))})`"
                    ></use>
                </g>
            </g>
        </svg>
        <div class="grid absolute" :style="`top: ${fieldSize}px; left:${fieldSize}px; grid-template-columns: repeat(${game.size[0]}, ${elSize+1}px); grid-auto-rows: ${elSize+1}px;`">
            <div v-for="(v, index) in vertices" :key="index" :ref="`vertex${index}`"
                 @click="clickVertice(v.coords)"
                 @mouseover="hoverVertice(index)" 
                 @mouseout="hoverVertice(index, false)"
                 :title="`${v.coords} ${alphabet[v.coords[0]-1]}${alphabet[v.coords[1]-1]}`"
                 :class="v.class"
            >
            </div>
        </div>
    </div>
</template>
<style scoped>
    .goban-container {
        position:relative;
    }
    svg{
        background-image:url('/board.png');
        background-repeat: no-repeat;
        background-size: 100% 100%;
    }
    .vertex{
        background-size: contain;
    }
    .white{
        background-image:url('data:image/png;base64,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');
    }
    .black{
        background-image:url('data:image/png;base64,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');
    }
</style>