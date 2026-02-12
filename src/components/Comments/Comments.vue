<script setup>
import { computed, ref, watch } from 'vue';
import SecondaryButton from '../../UI/SecondaryButton.vue';
    
const props = defineProps({
    game: {type:Object, default:null},
    readonly: {type:Boolean, default:false}, // только чтение
    onlyCurrent: {type:Boolean, default:true}, //показывать коммент только текущего хода
    width:{type:Number, default:550}, //ширина контейнера с комментариями
    height:{type:Number, default:250}, //высота контейнера с комментариями
    currentNodes: {type:Array, default:[]}, //ноды текущего хода
});

const container_style = `width: ${props.width}px; height: ${props.height}px; overflow: auto; border: 1px solid #ccc; background-color:#c0c0c0; position:relative; border-radius: 7px;`;

const emit = defineEmits(['newComment']);
// emit('newComment', {num:0, comment:''});

const comments = ref([]);

const watcherCondition = computed(()=>{
    if (!props.game.movestree || !props.game.currentMove) return null;
    if (props.onlyCurrent) return `${JSON.stringify(props.game.movestree).length}-${props.game.currentMove.number}`
    else return JSON.stringify(props.game.movestree).length;
});

watch(watcherCondition, ()=>{
    readComments(props.game.movestree);
});

const currentNode = ref([]);
const currentNodeBranch = ref(null);

const readComments = ()=>
{
    if(props.onlyCurrent){
        if (!props.game.currentMove.id) comments.value=[{move:'0', text:props.game.comment}];
        else if (props.game.currentMove.comment) comments.value=[{move:props.game.currentMove.number+1, text:props.game.currentMove.comment}];
        else comments.value=[];
        return;
    }

    if(!props.game.movestree) return;

    let tempComments = [];
    if (props.game.comment && props.game.comment.length) tempComments.push({move:'0', text:props.game.comment});

    currentNode.value = props.game.movestree;

    let lastMove = null;
    
    //[ { "number": null, "branch": 2 }, { "number": 1, "branch": 0 } ]

    if (props.game.currentMove.id) props.currentNodes.forEach((node, index)=>
    {
        if(node.number==null && props.game.movestree[node.branch]) {
            currentNode.value = props.game.movestree;
        }
        else{
            let findIndex = currentNode.value[currentNodeBranch.value].findIndex(move=>move.number==node.number);
            if (findIndex>=0) currentNode.value = currentNode.value[currentNodeBranch.value][findIndex].children;
        }
        
        currentNodeBranch.value = node.branch;

        if(props.currentNodes[index+1]) lastMove = props.currentNodes[index+1].number;
        else lastMove = props.game.currentMove.number;

        currentNode.value[currentNodeBranch.value].forEach((move)=>{
            if(move.number<=lastMove && move.comment && move.comment.length) tempComments.push({move:move.number+1, text:move.comment.replace(/\n/g, "<br>")});
        });
    });

    comments.value = tempComments;
}

</script>
<template>
    <div :style="container_style">
        <div>
            <div v-for="comment in comments">
                <div>Ход {{ comment.move }}:</div>
                <div v-html="comment.text"/>
            </div>
        </div>
        <div v-if="!readonly">
            input string
        </div>
    </div>
</template>