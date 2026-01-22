<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  game: Object,
  width:{type:Number, default:550}, //ширина контейнера с SVG
  height:{type:Number, default:250}, //высота контейнера с SVG
});

const emit = defineEmits(['moveTo']);

/**
 * строка стилевого оформления контейнера SVG
 */
const container_style = `width: ${props.width}px; height: ${props.height}px; overflow: hidden; border: 1px solid #ccc; background-color:#c0c0c0; position:relative; border-radius: 7px;`;

/**
 * изображение белого камня в base64
 */
const whiteStone = 'data:image/png;base64,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';

/**
 * изображение черного камня в base64
 */
const blackStone = 'data:image/png;base64,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';

/**
 * Массив веток выделенных из movestree
 */
const branches = ref([]);

/**
 * Цвета линий веток
 */
const branchLines = ['#ff0000', '#0f000e', '#e2a344', '#a5ef6f', '#cdfefe', '#a0a0a0', '#123456'];

/**
 * Счетчик веток
 */
const branchIndent = ref(0);

/**
 * Количество веток выше текущего хода
 */
const currentMoveBranchIndent = ref(0);

/**
 * Максимальное количество ходов в movestree
 */
const maxMoveNumber = ref(0);

/**
 * Текущий горизонтальный сдвиг SVG относительно контейнера в пикселях
 */
const movestreeHorizontalIndent = ref(0);

/**
 * Текущий вертикальный сдвиг SVG относительно контейнера в пикселях
 */
const movestreeVerticalIndent = ref(0);

/**
 * Зафиксированные параметры курсора/сдвига SVG при "ручном" перетаскивании дерева ходов
 */
const cursorCoords = ref({x:null, y:null, fixIndentX:null, fixIndentY:null});

/**
 * Размер камня в пикселях
 */
const elSize = computed(()=>{
    return 28;
});

/**
 * Размер шрифта
 */
const fontSize = computed(() => {
    return Math.floor(elSize.value/2);
});

/**
 * Возвращает код цвета ветки по индексу
 * @param index индекс ветки
 * @return string код цвета
 */
const branchLineColor = function(index){
    return branchLines[index] ? branchLines[index] : '#c0a5f1';
};

/**
 * Рекурсивная функция чтения узла и выделения веток из movestree в одномерный массив
 * 
 * @param node узел для чтения
 * @param nodes передаваемые в рекурсию узлы
 * @param addNode добавить узел в рекурсии
 * @param parentIndent отступ от родительской ветки в рекурсии
 * @return [array] массив с извлеченными ветками
 */
const readBranch = function(node, nodes=[], addNodeNum=null, parentIndent=0)
{
    let branches = [];
    //Если передан родительский узел - добавляем его в узлы

    node.forEach((branch, branchIndex)=> //перебираем ветки узла. branch - ветка, branchIndex - индекс ветки в узле
    {
        let currentBranch = { //создаем объект текущей ветки, которую выделяем из movestree
            moves:[], //ходы ветки
            indent:branchIndent.value, //отступ сверху до текущей ветки
            parentIndent:parentIndent //отступ сверху до родительской ветки
        };
        
        let childBranches = []; //дочерние ветки

        for(let i=branch.length-1; i>=0; i--) //передвигаемся по ходам ветки с конца ветки к началу, i - индекс хода в ветке
        {
            if (branch[i].id == props.game.currentMove.id) currentMoveBranchIndent.value = branchIndent.value;
            if (maxMoveNumber.value<branch[i].number+1) maxMoveNumber.value = branch[i].number+1;

            // добавляем ход в создаваемую текущую ветку
            let newMove = {
                number:branch[i].number+1, 
                color:branch[i].color, 
                nodes:nodes.slice(0), 
                id:branch[i].id
            };
            if (addNodeNum!==null) newMove.nodes.push({number:addNodeNum, branch:branchIndex});

            currentBranch.moves.unshift(newMove);

            if (branch[i].children.length>0) //если есть дочерние ветки от этого хода
            {
                branchIndent.value++; //поднимаем отступ
                //читаем узел с дочерними ветками
                if (addNodeNum!==null) nodes.push({number:addNodeNum, branch:branchIndex});
                childBranches.push(...readBranch(branch[i].children, nodes.slice(0), branch[i].number, currentBranch.indent));
            }
        }
        if (currentBranch.moves.length>0) branches.push(currentBranch, ...childBranches);
    });

    return branches;
};

/**
 * Расчет сдвига SVG картинки относительно контейнера
 * 
 * @return void, результат записывается в movestreeHorizontalIndent и movestreeVerticalIndent
 */
const calculateIndent = () => {

    /**
     * Новые новые значения сдвига SVG от начала контейнера
     */
    let newIndents = {x:false, y:false};

    /**
     * сдвиг текущего хода от начала SVG в px по горизонтали
     */
    let hIndent = (elSize.value+5)*props.game.currentMove.number+1;

    /**
     * расстояние от границы контейнера при котором пересчитываем сдвиг
     */    
    let fieldMove = {
        x:(elSize.value+5)*3, 
        y:(elSize.value+5)*2
    };

    /**
     * сдвиг текущего хода от начала контейнера по горизонтали
     */
    let hc1Indent = hIndent+movestreeHorizontalIndent.value;

    /**
     * расстояние текущего хода до конца контейнера по горизонтали
     */
    let hc2Indent = props.width - hc1Indent;
    
    //если пересчитываем сдвиг к концу контейнера
    if (hc2Indent<fieldMove.x) newIndents.x = props.width - hIndent - fieldMove.x;
    //если пересчитываем сдвиг к началу контейнера
    else if (hc1Indent<fieldMove.x) newIndents.x = fieldMove.x-hIndent; 

    /**
     * Индекс ветки из branches с текущим ходом
     */
    let currentBranch = branches.value.findIndex(branch=>{
        return branch.moves.some(move=>move.id==props.game.currentMove.id);
    });

    /**
     * сдвиг текущего хода от начала SVG в px по вертикали
     */
    let vIndent = (elSize.value+5)*currentBranch+1;

    /**
     * сдвиг текущего хода от начала контейнера по вертикали
     */
    let vc1Indent = vIndent+movestreeVerticalIndent.value;

    /**
     * расстояние текущего хода до конца контейнера по вертикали
     */
    let vc2Indent = props.height - vc1Indent;
    
    //если пересчитываем сдвиг к концу контейнера
    if (vc2Indent<fieldMove.y) newIndents.y = props.height - vIndent - fieldMove.y;
    //если пересчитываем сдвиг к началу контейнера
    else if (vc1Indent<fieldMove.y) newIndents.y = fieldMove.y-vIndent; 

    if (newIndents.x!==false) movestreeHorizontalIndent.value = newIndents.x > 0 ? 0 : newIndents.x;
    if (newIndents.y!==false) movestreeVerticalIndent.value = newIndents.y > 0 ? 0 : newIndents.y;
}

/**
 * Выбор хода из дерева
 * 
 * @param nodes узлы ведущие к этому ходу
 * @param number номер хода
 * @param mid ID хода
 */
const clickMove = (nodes, number, mid) => {
    if (props.game.currentMove.id && props.game.currentMove.id==mid) return;
    emit('moveTo', {nodes:nodes, number:number, id:mid});
    calculateIndent();
};

/**
 * Расчет кривой линии к дочерней ветке
 * @param start координаты начала линии
 * @param end координаты конца линии
 * @return строка для атрибута d тэга <path>
 */
const calculatePath = (start, end) => {
    const center = {
      x: (start.x + end.x)/1.75,
      y: (start.y + end.y)/1.75,
	}

	return `M ${start.x},${start.y} Q ${center.x},${center.y} ${end.x},${end.y}`;
}

/**
 * "Перетаскивание" SVG с деревом ходов мышкой
 * @param e 
 */
const trackMouseInContainer = (e)=>{
    if(cursorCoords.value.x!==null){
        let calcX = cursorCoords.value.fixIndentX + (e.clientX - cursorCoords.value.x);
        let calcY = cursorCoords.value.fixIndentY + (e.clientY - cursorCoords.value.y);
        
        if (calcX<1 && (elSize.value+5)*maxMoveNumber.value+calcX > props.width) movestreeHorizontalIndent.value = calcX;
        if (calcY<1 && (elSize.value+5)*branches.value.length+calcY > props.height) movestreeVerticalIndent.value = calcY;
    }
};
const handleMouseDownLeft = (e)=>{ //TODO попробовать отслеживать зажатие левой кнопки через event listeners. 
                                   // сейчас при выходе курсора из блока потом некорректно нажатие отрабатывает
    cursorCoords.value.x = e.clientX;
    cursorCoords.value.y = e.clientY;
    cursorCoords.value.fixIndentX = movestreeHorizontalIndent.value;
    cursorCoords.value.fixIndentY = movestreeVerticalIndent.value;
};
const handleMouseClickLeft = ()=>{
    cursorCoords.value.x = null;
    cursorCoords.value.y = null;
    cursorCoords.value.fixIndentX=null;
    cursorCoords.value.fixIndentY=null;
}

const movestreeJson = computed(()=>{
    return JSON.stringify(props.game.movestree);
});

watch(movestreeJson, ()=>{
    branches.value = readBranch(props.game.movestree);
    branchIndent.value=0;
    calculateIndent();
});

</script>

<template>
    <div :style="container_style" 
         @mousemove="trackMouseInContainer" 
         @mousedown.left="handleMouseDownLeft" 
         @click.left="handleMouseClickLeft"
         @mouseleave="handleMouseClickLeft"
    >
        <svg :width="(elSize+5)*maxMoveNumber" :height="(elSize+5)*branches.length" :style="`position:absolute; left:${movestreeHorizontalIndent+5}px; top:${movestreeVerticalIndent+5}px; overflow:hidden;`">
            <defs>
                <image id="mt_black-1" :width="elSize" :height="elSize" :xlink:href="blackStone"></image>
                <image id="mt_white-1" :width="elSize" :height="elSize" :xlink:href="whiteStone"></image>
            </defs>
            <g v-for="(branch, bi) in branches" :key="bi" :transform="`translate(${(elSize+5)*((branch.moves[0].number??1)-1)},0)`">
                <path v-if="branch.indent>0" 
                    :d="calculatePath({x:-(elSize/2+5), y:elSize+(elSize+5)*(bi-(branch.indent-branch.parentIndent))}, {x:0, y:elSize/2+(elSize+5)*bi})"
                    :stroke="branchLineColor(bi)" 
                    stroke-width="1"
                    fill="none">
                </path>
                <g class="move" @click="clickMove(move.nodes, move.number-1, move.id)" v-for="(move, mi) in branch.moves" :key="mi">
                    <path v-if="mi>0" 
                        :d="`M${(elSize+5)*mi-7} ${elSize/2+(elSize+5)*bi} H ${(elSize+5)*mi+(elSize/2-2.5)}`" 
                        :stroke="branchLineColor(bi)" 
                        stroke-width="1"
                        fill="none">
                    </path>
                    <use
                        :href="move.color=='white'?'#mt_white-1':'#mt_black-1'" 
                        :transform="`translate(${(elSize+5)*mi}, ${(elSize+5)*bi})`"
                        :ref="`moveid_${move.id}`"
                    ></use>
                    <circle v-if="move.id==game.currentMove.id" :cx="elSize/2+(elSize+5)*mi" :cy="elSize/2+(elSize+5)*bi" :r="elSize/2" fill="none" :stroke="move.color=='black'?'#ffffff':'#000000'" stroke-width="1px"></circle>
                    <text :x="fontSize+(elSize+5)*mi" :y="(fontSize+1)+(elSize+5)*bi" :width="elSize" :height="elSize" 
                        :font-size="`${fontSize}px`" :fill="move.color=='black'?'#ffffff':'#000000'" font-weight="bold" 
                        alignment-baseline="middle" text-anchor="middle" dominant-baseline="middle">
                        {{move.number}}
                    </text>
                </g>
            </g>
        </svg>
    </div>
</template>
<style scoped>
    g .move {
        cursor:pointer;
    }
</style>