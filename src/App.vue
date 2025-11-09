<script setup>
import Goban from './components/Goban'; //отображение гобана
import Dashboard from './components/Dashboard'; //отображение гобана
import MovesTree from './components/MovesTree'; //отображение гобана
import GobanApp from './components/GobanApp.js'; //функционал гобана
import { computed, ref } from "vue";

const { settings, movestree, parseSGF, stones, ko, prisoners } = GobanApp();

const size = ref(504);
const gobanSize = ref(19);
const gobanSizeComputed = computed(()=>{
    return [gobanSize.value, gobanSize.value];
})

const sgf = '(;GM[1]AP[StoneBase:SGFParser.3.0.1]SZ[19]VW[ja:sj]CA[utf-8]HA[0]PB[Black]PW[White]AB[pb][sb][pa][qa][pf][qf][pe][re][pd][rd][pc][ra]AW[sg][rg][rb][oa][qg][og][pg][of][rf][oe][se][od][sd][oc][qc][rc][ob][qb]N[黑先 死活题]C[创作者：陈禧](;B[qd];W[sf];B[sc]TE[1]C[CORRECT])(;B[sc];W[sa](;B[sc];W[sb];B[qd];W[qe])(;B[sb];W[sc];B[qd];W[sf]))(;B[sa];W[sc]))'

parseSGF(sgf);

</script>

<template>
    <div style="display:flex; align-items: stretch; display: flex; flex-direction: row;">
        <div style="align-items: stretch; display: flex; flex-basis: 50%; flex-direction: column; flex-grow: 1; flex-shrink: 1; width: 100%;">
            <Goban :stones="stones" :descSize="gobanSizeComputed" :size="size"/>
            <Dashboard ref="dashboardBlock"/>
            <input type="number" v-model="size" style="max-width:200px;"/>
            <input type="number" v-model="gobanSize" style="max-width:200px;"/>
        </div>
        <div>
            <MovesTree/>
        </div>
    </div>
</template>