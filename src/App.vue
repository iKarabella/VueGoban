<script setup>
import Goban from './components/Goban'; //отображение гобана
import Dashboard from './components/Dashboard'; //отображение гобана
import MovesTree from './components/MovesTree'; //отображение гобана
import GobanApp from './components/GobanApp.js'; //функционал гобана
import CreateGame from './components/CreateGame'; //создание новой игры
import { computed, onMounted, onUnmounted, ref } from "vue";
import GameInfo from './components/GameInfo';
import Modal from './UI/Modal.vue';
import SecondaryButton from './UI/SecondaryButton.vue';

const { game, parseSGF, gobanAction, moveTo, createNewGame } = GobanApp();

/**
 * Размеры экрана в пикселях
 */
const screenSize = {
    height:window.innerHeight-50,
    width:window.innerWidth
};

/** 
 * Ширина правой колонки
 */
const leftColumnWidth = computed(()=>{
    //TODO для мобильных должно быть равным ширине экрана, т.к. колонка будет не справа а под гобаном
    return 550;
});

/**
 * Размер гобана в пикселях
 */
const gobanSizePx = ref(screenSize.height>screenSize.width?screenSize.width:screenSize.height);

//TODO temp
const temp_sgf = '(;GM[1]AP[StoneBase:SGFParser.3.0.1]SZ[19]VW[ja:sj]CA[utf-8]HA[0]PB[Black]PW[White]AB[pb][sb][pa][qa][pf][qf][pe][re][pd][rd][pc][ra]AW[sg][rg][rb][oa][qg][og][pg][of][rf][oe][se][od][sd][oc][qc][rc][ob][qb]N[黑先 死活题]C[创作者：陈禧](;B[qd];W[sf];B[sc]TE[1]C[CORRECT])(;B[sc];W[sa](;B[sc];W[sb];B[qd];W[qe])(;B[sb];W[sc];B[qd];W[sf]))(;B[sa];W[sc]))'

/**
 * Модальное окно с формой создания новой игры
 */
const createNewGameModal = ref();

/**
 * "Якорные" точки навигации из компонента MovesTree.vue
 */
const navigationPoints = ref({});
const updateNavigationPoints = (points) => {
    navigationPoints.value = points;
};

/**
 * Создание новой игры
 * 
 * @param newGame данные из формы модального окна CreateGame.vue
 */
const createNewGameFromForm = (newGame)=>{
    if (newGame==null) {
        createNewGameModal.value=false;
        return;
    }
    createNewGame(newGame);

    createNewGameModal.value=false;
}

const handleGlobalKeydown = (event) => {
    if (!event.altKey && !event.shiftKey && !event.ctrlKey){
        if (event.key=='ArrowLeft') {
            console.log('ArrLeft', game.value.currentMove.number);
            moveTo(game.value.currentMove.number==0 ? {id:null, nodes:[]} : navigationPoints.value.prevMove);
        }
        else if (event.key=='ArrowRight') moveTo(navigationPoints.value.nextMove);
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown);

    console.log(parseSGF(temp_sgf));
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
    <div class="main_container">
        <div class="goban_container">
            <Goban :size="gobanSizePx" :game="game" @action="gobanAction"/>
            <Dashboard ref="dashboardBlock"/>
        </div>
        <div :style="`width: ${leftColumnWidth+40}px; padding:10px 20px; overflow-y:auto; overflow-x:hidden;`">
            <div class="flex flex-col gap-2" :style="`width:${leftColumnWidth}px;`">
                <GameInfo :game="game"/>
                <MovesTree :width="leftColumnWidth" :game="game" @moveTo="moveTo" @navigationPoints="updateNavigationPoints"/>
                <div class="flex flex-wrap gap-2">
                    <SecondaryButton @click="createNewGameModal=true">Новая</SecondaryButton>
                    <SecondaryButton>Сохранить SGF</SecondaryButton>
                </div>
            </div>
        </div>
    </div>
    <Modal :show="createNewGameModal" @close="createNewGameModal=false">
        <CreateGame @createNewGame="createNewGameFromForm"/>
    </Modal>
</template>
<style>
    @import "tailwindcss";
    .main_container{
        display:flex; 
        height:100vh;
        overflow:hidden;
        align-items: stretch; 
        display: flex; 
        @media (max-width: 480px) {
            flex-direction: row;
        };
        @media (min-width: 480px) {
            flex-direction: row;
        }
    }
    .main_container .goban_container {
        align-items: stretch; display: flex; flex-basis: 50%; flex-direction: column; flex-grow: 1; flex-shrink: 1; width: 100%;
    }
</style>