<script setup>
import whiteStone from '../../assets/white-stone.png';
import blackStone from '../../assets/black-stone.png';
import { computed, ref } from 'vue';

const props = defineProps({
    // displayArea:{ //отображаемая часть доски
    //     type: Array,
    //     default: [[1,19],[1,19]]
    // },
    // showCoordinates:{type:Boolean, default:true},
    size:{type:Number, default:550},
    game:{type:Object, required:true}
});

const emit = defineEmits(['action']);
const alphabet = 'abcdefghjklmnopqrstuvwxyz';

const size = computed(() => {
    const boardSize = props.game.size[0];
    // s должен быть нечётным целым: s = (i - field*2) / boardSize - 1
    // Перебираем нечётные значения s начиная с максимального
    const maxField = Math.min(35, Math.round(props.size / (boardSize + 2)));
    
    for (let s = 99; s >= 1; s -= 2) { // только нечётные
        const i = (s + 1) * boardSize + maxField * 2;
        if (i <= props.size) return i;
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

const STAR_POSITIONS = {
    3:  [[2,2]],
    5:  [[2,2],[4,2],[2,4],[4,4],[3,3]],
    9:  [[3,3],[3,7],[7,3],[7,7],[5,5]],
    13: [[4,4],[4,10],[10,4],[10,10],[7,7]],
    19: [[4,4],[4,10],[4,16],[10,4],[10,10],[10,16],[16,4],[16,10],[16,16]]
};

const starCoord = (n) => 
    (fieldSize.value - 1 + (elSize.value + 1) * n) - elSize.value / 2;

const stars = computed(() => {
    const { size } = props.game;
    if (size[0] !== size[1] || size[0] % 2 === 0) return [];
    
    const positions = STAR_POSITIONS[size[0]] ?? 
        [[(size[0]+1)/2, (size[0]+1)/2]];
    
    return positions.map(([x, y]) => ({
        cx: starCoord(x),
        cy: starCoord(y)
    }));
});

const vertices = computed(() => {
    let comp_vertices = [];
    if (props.game && props.game.size) {
        for (let y = 1; y <= props.game.size[1]; y++) {
            for (let x = 1; x <= props.game.size[0]; x++) {
                comp_vertices.push({
                    coords: [x, y]
                });
            }
        }
    }
    return comp_vertices;
});

const occupiedVertices = computed(() => {
    const set = new Set();
    for (const group of props.game.groups) 
    {
        for (const stone of group.stones) {
            set.add(`${stone[0]},${stone[1]}`);
        }
    }
    return set;
});

const clickVertex = function(coords) {
    if (props.game.currentMode === 'white' || props.game.currentMode === 'black') 
    {
        if (!occupiedVertices.value.has(`${coords[0]},${coords[1]}`)) 
        {
            emit('action', { type: 'move', coords: coords });
        }
    }
}

const hoveredIndex = ref(null);

</script>

<template>
    <div class="goban-container" v-if="game.size">
        <svg :width="`${svgSize.width}px`" :height="`${svgSize.height}px`" style="border:1px solid gray">
            <g>
                <rect v-for="(v, index) in vertices"
                    :x="fieldSize + (elSize+1)*(v.coords[0]-1)"
                    :y="fieldSize + (elSize+1)*(v.coords[1]-1)"
                    :width="elSize+1" :height="elSize+1"
                    fill="transparent"
                    @click="clickVertex(v.coords)"
                    @mouseover="hoveredIndex = index"
                    @mouseout="hoveredIndex = null"
                />
            </g>
            <g pointer-events="none">
                <use 
                    v-if="hoveredIndex !== null"
                    :href="game.currentMode === 'white' ? '#white-1' : '#black-1'"
                    :opacity="0.5"
                    
                    :transform="`translate(
                        ${fieldSize + (elSize+1)*(vertices[hoveredIndex].coords[0]-1)}, 
                        ${fieldSize + (elSize+1)*(vertices[hoveredIndex].coords[1]-1)}
                    )`"
                />
            </g>
            <defs>
                <image id="black-1" :width="elSize+1" :height="elSize+1" :href="blackStone"></image>
                <image id="white-1" :width="elSize+1" :height="elSize+1" :href="whiteStone"></image>
            </defs>
            <g>
                <text style="text-transform: uppercase;" v-for="(i,index) in game.size[0]" :key="index" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="fieldSize-1" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text style="text-transform: uppercase;" v-for="(i,index) in game.size[0]" :key="index" :x="(elSize/2+fieldSize+(elSize+1)*(i-1))-fieldSize/6" :y="size-fieldSize/1.5" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ alphabet[i-1] }}</text>
                <text style="text-transform: uppercase;" v-for="(i,index) in game.size[1]" :key="index" :x="fieldSize/2" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ game.size[1]-i+1 }}</text>
                <text style="text-transform: uppercase;" v-for="(i,index) in game.size[1]" :key="index" :x="size-(fieldSize*0.9)" :y="elSize/2+fieldSize+(elSize+1)*(i-1)+fieldSize/6" :font-size="`${fieldSize/2}px`" font-weight="bold" fill="#444444">{{ game.size[1]-i+1 }}</text>
            </g>
            <g pointer-events="none">
                <path :d="gobanLines" stroke="#442211" stroke-width="1px" stroke-linecap="square"></path>
                <circle v-for="(star, index) in stars" :key="index" :cx="star.cx" :cy="star.cy" r="2.0px" fill="#000000"></circle>
            </g>
            <g>
                <g v-for="(group, gindex) in game.groups" :key="gindex">
                    <use v-for="(e, sindex) in group.stones" 
                        :key="sindex"
                        :href="group.color=='white'?'#white-1':'#black-1'" 
                        :opacity="e.opacity"
                        :transform="`translate(${(fieldSize+(elSize+1)*(e[0]-1))}, ${(fieldSize+(elSize+1)*(e[1]-1))})`"
                    ></use>
                </g>
            </g>
        </svg>
    </div>
</template>
<style scoped>
    .goban-container {
        position:relative;
    }
    svg{
        background-image:url('../../assets/board.png');
        background-repeat: no-repeat;
        background-size: 100% 100%;
    }
</style>