<script setup>
import Goban from './components/Goban'; //отображение гобана
import Dashboard from './components/Dashboard'; //отображение гобана
import MovesTree from './components/MovesTree'; //отображение гобана
import GobanApp from './components/GobanApp.js'; //функционал гобана
import CreateGame from './components/CreateGame'; //создание новой игры
import Comments from './components/Comments'; //комментарии к ходам
import {computed, onBeforeMount, onMounted, onUnmounted, ref } from "vue";
import GameInfo from './components/GameInfo';
import Modal from './UI/Modal.vue';
import SecondaryButton from './UI/SecondaryButton.vue';

const { game, parseSGF, gobanAction, moveTo, createNewGame, currentNodes} = GobanApp();

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
    if (!newGame) {
        createNewGameModal.value=false;
        return;
    }

    if (typeof newGame === 'object') createNewGame(newGame);
    else if (typeof newGame === 'string') parseSGF(newGame);
    
    createNewGameModal.value=false;
}

const handleGlobalKeydown = (event) => {
    if (!event.altKey && !event.shiftKey && !event.ctrlKey){
        if (event.key=='ArrowLeft') moveTo(game.value.currentMove.number==0 ? null : navigationPoints.value.prevMove.id);
        else if (event.key=='ArrowRight') moveTo(navigationPoints.value.nextMove.id);
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
    createNewGame();
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
                <Comments :game="game" :readonly="false" :width="leftColumnWidth" :currentNodes="currentNodes"/>
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