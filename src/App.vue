<script setup>
import Goban from './components/Goban'; //отображение гобана
import Dashboard from './components/Dashboard'; //отображение гобана
import MovesTree from './components/MovesTree'; //отображение гобана
import GobanApp from './components/GobanApp.js'; //функционал гобана
import CreateGame from './components/CreateGame'; //создание новой игры
import { ref } from "vue";
import GameInfo from './components/GameInfo';
import Modal from './UI/Modal.vue';
import SecondaryButton from './UI/SecondaryButton.vue';

const { settings, game, parseSGF, gobanAction, moveTo, createNewGame } = GobanApp();
const screenSize = {
    height:window.innerHeight-50,
    width:window.innerWidth
};
const size = ref(screenSize.height>screenSize.width?screenSize.width:screenSize.height);
//const sgf = '(;GM[1]AP[StoneBase:SGFParser.3.0.1]SZ[19]VW[ja:sj]CA[utf-8]HA[0]PB[Black]PW[White]AB[pb][sb][pa][qa][pf][qf][pe][re][pd][rd][pc][ra]AW[sg][rg][rb][oa][qg][og][pg][of][rf][oe][se][od][sd][oc][qc][rc][ob][qb]N[黑先 死活题]C[创作者：陈禧](;B[qd];W[sf];B[sc]TE[1]C[CORRECT])(;B[sc];W[sa](;B[sc];W[sb];B[qd];W[qe])(;B[sb];W[sc];B[qd];W[sf]))(;B[sa];W[sc]))'
const createNewGameModal = ref();

const createNewGameFromForm = (newGame)=>{
    if (newGame==null) {
        createNewGameModal.value=false;
        return;
    }

    createNewGame(newGame);

    createNewGameModal.value=false;
}
</script>

<template>
    <div class="main_container">
        <div class="goban_container">
            <Goban :size="size" :settings="settings" :game="game" @action="gobanAction"/>
            <Dashboard ref="dashboardBlock"/>
        </div>
        <div>
            <GameInfo :prisoners="game.prisoners" :gameInfo="settings"/>
            <MovesTree :width="550" :game="game" @moveTo="moveTo"/>
            <SecondaryButton @click="createNewGameModal=true">Новая</SecondaryButton>
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