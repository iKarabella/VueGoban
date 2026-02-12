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

//TODO temp
// const temp_sgf = `(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2]RU[Japanese]SZ[19]KM[6.50]TM[2700]OT[5x30 byo-yomi]PW[Adziroo]PB[Karabella]WR[3k]BR[11k]DT[2025-10-19]PC[The KGS Go Server at http://www.gokgs.com/]C[Karabella [11k?\]: Приятной игры *здесь был просто перевод строки* Adziroo [3k\]: Приятной игры]RE[B+Resign];B[oc]BL[2689.955];W[dp]WL[2685.832];B[qo]BL[2688.272];W[dd]WL[2669.196];B[fq]BL[2686.046];W[qd]WL[2630.345];B[qg]BL[2624.816];W[pe]WL[2618.406];B[md]BL[2621.401];W[pc]WL[2589.077];B[od]BL[2618.866];W[pb]WL[2576.755];B[og]BL[2599.815];W[pq]WL[2515.152];B[np]BL[2547.08]C[Karabella [11k?\]: не забыл тайшу? ) 
// Adziroo [3k\]: как же ее забыть];W[po]WL[2489.41];B[pp]BL[2542.56];W[op]WL[2484.161];B[qp]BL[2539.051];W[oq]WL[2481.101];B[oo]BL[2529.673];W[pn]WL[2478.616];B[qq]BL[2521.033];W[nq]WL[2474.671]C[Karabella [11k?\]: а вот я кажется забыл XD];B[on]BL[2491.744];W[qn]WL[2467.2];B[om]BL[2487.334];W[ro]WL[2448.657];B[rp]BL[2482.191];W[rm]WL[2447.063];B[so]BL[2475.677];W[rn]WL[2446.225];B[pr]BL[2468.846];W[or]WL[2445.071];B[qr]BL[2429.627];W[mp]WL[2441.339];B[no]BL[2417.46];W[qk]WL[2411.268];B[mq]BL[2409.971]C[Adziroo [3k\]: какой ужас Adziroo [3k\]: пора сдаваться];W[mr]WL[2315.104];B[lq]BL[2389.594];W[lr]WL[2313.561];B[os]BL[2382.824];W[nr]WL[2299.611];B[kq]BL[2377.763]C[Karabella [11k?\]: не уверен что ее тащить надо...Adziroo [3k\]: я хзKarabella [11k?\]: в принципе не особо плохо пока. у меня ток угол и стенка на центр];W[kr]WL[2241.666];B[jq]BL[2370.155];W[jr]WL[2241.106];B[iq]BL[2327.926];W[ir]WL[2238.92]C[Adziroo [3k\]: это ужасно];B[hr]BL[2299.275];W[ns]WL[2235.54];B[is]BL[2286.221];W[js]WL[2231.41];B[ls]BL[2283.487];W[gr]WL[2197.696];B[hq]BL[2278.487];W[hs]WL[2194.265]C[Adziroo [3k\]: если угол живет, я сдаюсьKarabella [11k?\]: вот и я думаю...];B[ps]BL[2166.392];W[gq]WL[2171.421];B[gp]BL[2163.614];W[fr]WL[2170.406];B[eq]BL[2150.946];W[dr]WL[2136.116];B[er]BL[2140.875];W[es]WL[2134.779];B[gs]BL[2134.663];W[fs]WL[2109.616];B[dq]BL[2133.365];W[cr]WL[2103.986];B[ds]BL[2126.75]C[Adziroo [3k\]: лучшая партия в жизни];W[cs]WL[2094.785];B[cq]BL[2123.297];W[bq]WL[2093.725];B[br]BL[2114.262];W[ar]WL[2083.377]C[Karabella [11k?\]: кажется ты выжил )];B[bp]BL[2102.391]C[Adziroo [3k\]: ого, успех!];W[bs]WL[2073.758]C[Adziroo [3k\]: не просто выжил, еще и 9 очков получилKarabella [11k?\]: а че теперь делать?Adziroo [3k\]: сдавайсяAdziroo [3k\]: )Adziroo [3k\]: группу справа атаковать, там будет еще 9 очков, остальное твое];B[cf]BL[1984.326];W[ok]WL[2039.343];B[fc]BL[1964.568];W[fd]WL[2032.735];B[gd]BL[1962.503];W[fe]WL[2032.19];B[ec]BL[1945.008];W[dc]WL[2004.862];B[ic]BL[1923.37];W[dj]WL[1975.495];B[ed]BL[1914.645];W[de]WL[1935.26];B[cp]BL[1510.634];W[go]WL[1918.626];B[hp]BL[1488.102];W[nf]WL[1886.76];B[qj]BL[1470.955];W[pk]WL[1833.102];B[rk]BL[1465.045];W[ph]WL[1705.073];B[ri]BL[1402.8];W[kc]WL[1681.482];B[ql]BL[1394.97];W[le]WL[1655.482];B[ld]BL[1387.582];W[kd]WL[1652.437];B[ke]BL[1382.093];W[id]WL[1629.343];B[je]BL[1369.591];W[ie]WL[1564.817];B[lf]BL[1361.256];W[me]WL[1542.377];B[mf]BL[1333.089];W[ne]WL[1540.143];B[jd]BL[1329.505];W[jc]WL[1538.702];B[ib]BL[1327.973];W[lb]WL[1395.681];B[oe]BL[1282.662];W[of]WL[1377.251];B[ng]BL[1276.123];W[pf]WL[1361.925];B[pg]BL[1272.966];W[if]WL[1337.507];B[jg]BL[1267.693];W[db]WL[1258.774];B[ee]BL[1251.591];W[ef]WL[1241.31];B[ff]BL[1246.05];W[ge]WL[1239.905];B[df]BL[1236.748];W[eg]WL[1238.664];B[he]BL[1151.031];W[gf]WL[1236.56];B[hf]BL[1148.966];W[gg]WL[1235.721];B[hd]BL[1143.843];W[ig]WL[1211.027];B[hg]BL[1140.638];W[ih]WL[1210.032];B[gh]BL[1136.029];W[fg]WL[1207.879];B[hh]BL[1131.887];W[ii]WL[1192.646];B[kh]BL[1107.613];W[hj]WL[1116.699];B[dh]BL[1087.967];W[gc]WL[883.499];B[gb]BL[1082.592];W[fb]WL[876.818];B[hc]BL[1077.901];W[eb]WL[875.917];B[gc]BL[1074.641];W[ei]WL[869.577];B[eh]BL[1057.559];W[fk]WL[816.917];B[fh]BL[1052.657];W[mg]WL[767.667];B[lg]BL[1026.963];W[mh]WL[765.881];B[ki]BL[1010.242];W[mj]WL[744.066];B[kk]BL[991.542];W[fo]WL[740.19];B[fp]BL[989.177];W[ll]WL[718.003];B[kl]BL[969.684];W[lm]WL[699.337];B[km]BL[946.898]C[Adziroo [3k\]: боже у меня же справа сдохли камниAdziroo [3k\]: спасибоKarabella [2k?\]: спасибо])`;
const temp_sgf = `(;FF[4]CA[UTF-8]GM[1]DT[2025-12-17]PC[OGS: https://online-go.com/game/82279109]GN[Ladder Challenge: Veter(#3) vs Karabella(#1)]PB[Karabella]PW[Veter]BR[1k]WR[3k]TM[259200]OT[86400 fischer]RE[W+7.5]SZ[19]KM[6.5]RU[Japanese]C[Veter: Приятной игры!Karabella: Приятной игры];B[oc]C[Karabella: Приятной игры](;W[qp]C[Veter: успехов на турнире) ](;B[ce]C[Karabella: Спасибо )](;W[dp](;B[op](;W[lp]C[Veter: Зачем опять проиграл?)Karabella: Где?](;B[qq](;W[rq]C[Veter: В 3 туре Karabella: Сдулся я к 3 туру /Karabella: Это не по 5 минут в день играть (](;B[pq]C[Karabella: Там рубилово было на всю доску и у меня соперник в есе реанимировал дохлую группу на моей ошибке](;W[ro]C[Veter: мм, понятно. Ну Макса хотя бы ) Veter: обыграй хотя бы) Veter: за него не мало рейтинга дадут)Veter: немало*Karabella: не тяну я длинные партии (Karabella: сейчас в ёсе зевнул группу ) почти последним ходом из + сделал -](;B[mq](;W[lq](;B[cq](;W[dq](;B[cp](;W[do]C[Veter: Мне кажется ты слишком торопишься и бросаешь позицию.Veter: хотя наверное не мне тебе давать советы)](;B[co](;W[cn]C[Karabella: ну... ты тоже прав )](;B[dn](;W[bn]C[Veter: ну этот твой ход точно ошибка)Veter: D6](;B[dr](;W[er]C[Karabella: да, я помню что это ошибкаKarabella: но не помню почему )Veter: ХДVeter: То есть ты решил меня спросить?)](;B[cr](;W[fq](;B[bo]C[Karabella: типа того )](;W[dm](;B[en](;W[cl](;B[gn](;W[fo](;B[em](;W[el](;B[fl](;W[ek](;B[fk](;W[ej](;B[eo](;W[hp](;B[ep](;W[eq](;B[fp](;W[gp](;B[gq](;W[gr]C[Veter: и не жалко тебе камней) ](;B[go]C[Karabella: пока нет )](;W[nq](;B[np](;W[mp](;B[or](;W[mr](;B[pn](;W[qm](;B[mo](;W[lo](;B[mn](;W[km](;B[pm](;W[ql](;B[dc](;W[fj](;B[gj](;W[gk](;B[gl](;W[hk](;B[hl](;W[ik](;B[il](;W[jk](;B[io](;W[ip](;B[qd](;W[ec](;B[dd](;W[db](;B[cb](;W[hc](;B[pj](;W[qf](;B[qh](;W[of](;B[ld](;W[mc](;B[lc](;W[pc]C[Veter: когда двух слабых групп мало, добавь ещё камень ))Veter: я тут поговорки коверкать стал, пора бы уже за собой записывать) Veter: Типо: не строй другому мойо, сам в него попадёшь.](;B[qc](;W[pd](;B[qe]C[Karabella: )](;W[pe](;B[pb](;W[rf](;B[rb](;W[ok](;B[pg](;W[pf](;B[nh](;W[mf](;B[ml](;W[mk](;B[rr](;W[sr](;B[rs](;W[lh](;B[lg](;W[mg](;B[mh](;W[le](;B[li](;W[kh](;B[ke](;W[kf](;B[me](;W[lf](;B[ne](;W[og](;B[rk](;W[qk](;B[qj](;W[rl](;B[ri](;W[ol](;B[mj](;W[lk](;B[oh]C[Karabella: ет ты нигде не разваливаешься в этот раз...Karabella: *четVeter: слежу за группами, приходиться тщательно считатьVeter: хотя некоторые моменты были рискованные](;W[nj]C[Veter: за что люблю игры оп переписке что нет ограничений по времени)Veter: по*](;B[rg](;W[pi](;B[oj](;W[qg](;B[ph](;W[ni](;B[oi](;W[sk](;B[sh](;W[rj](;B[si](;W[cg](;B[ed](;W[ef](;B[gc](;W[he](;B[je](;W[if](;B[ff](;W[fg](;B[eg](;W[eh](;B[bg](;W[bh](;B[ch](;W[bf](;B[dg](;W[cf](;B[df](;W[dh](;B[ee](;W[be](;B[bd](;W[gb](;B[fh](;W[gg](;B[ci](;W[di](;B[dj](;W[ei](;B[bi](;W[ag](;B[ae](;W[cj](;B[bj](;W[bk](;B[ck](;W[dk](;B[ad](;W[af](;B[ah](;W[ai](;B[aj](;W[cj](;B[ah](;W[fn](;B[fm](;W[ai](;B[gd](;W[hd](;B[ah](;W[ho](;B[hn](;W[ai](;B[hq](;W[iq](;B[ah](;W[im](;B[hm](;W[ai](;B[es](;W[hr](;B[ah](;W[sf](;B[sg](;W[ai](;B[gq](;W[hq](;B[ah](;W[pp](;B[nr](;W[ai](;B[ki]C[Karabella: хм... зачем я это сыграл?..Veter: Надо посчитать, так то не понятно пока. ](;W[ji]C[Veter: Пойдёт)](;B[ah](;W[mq](;B[oq](;W[ai](;B[jh](;W[kg](;B[ah](;W[kd]C[Karabella: ррр...](;B[jc](;W[ai](;B[qn](;W[ak]C[Veter: Продано :( ](;B[rn]C[Karabella: незнаю... мне казалось у тебя ко угроз большеVeter: увы нет. ](;W[kb](;B[lb]C[Karabella: тогда случилось чудо )Karabella: правда, не факт, что оно меня спасет...](;W[ib](;B[jb](;W[eb](;B[jj](;W[ii]C[Veter: Мне было лень считать ёсе :С ](;B[kk]C[Karabella: мне тоже )Karabella: играю то что на глаз падает )](;W[ll](;B[jl](;W[ij](;B[nl](;W[nk](;B[kl](;W[lm](;B[jo](;W[ca](;B[bb](;W[nn](;B[on](;W[nm](;B[no](;W[sm](;B[sn](;W[ao](;B[ap](;W[an](;B[gf](;W[hf](;B[kj](;W[hh](;B[mm](;W[ge](;B[fe](;W[fb](;B[ln](;W[kn](;B[in](;W[ko](;B[fd](;W[aq](;B[ar](;W[jp](;B[od](;W[jf](;B[jd](;W[sc](;B[rc](;W[sd](;B[sb](;W[bp](;B[bq](;W[ap](;B[bs](;W[ja](;B[kc](;W[ia](;B[om](;W[ka](;B[ba](;W[la](;B[ma](;W[mb](;B[na](;W[nb](;B[oa](;W[ob](;B[pa](;W[oe](;B[nd](;W[fs](;B[ds](;W[jm](;B[rd](;W[se](;B[da](;W[ea](;B[ms](;W[ls](;B[ns](;W[rm](;B[sj](;W[rk](;B[ca](;W[re](;B[qa](;W[nf](;B[mi](;W[ic](;B[](;W[]C[Veter: Спасибо за игру!)Karabella: Спасибо за игру! )Veter: ну вот, ещё не безнадёжен)) Karabella: если-б не ко — я бы очков 40 проиграл...Veter: значит это была моя ошибкаVeter: плохо считалKarabella: мне кажется если сдавать ко - то всяко можно было позжеKarabella: когда вопрос не на 20 очков + атака бул быVeter: а где угрозы? Karabella: [object Object\]Veter: это отрицательная ко угрозаKarabella: да и с группой черных справа тож не гладкоVeter: спарва группа живая, там миайVeter: справа* Karabella: [object Object\]Veter: O13 тебе надо было игратьVeter: K14Veter: мне нечем было ответить и я ждал холть немного близкую потерюVeter: хоть*Karabella: в есе мне кажется я налажал тож...Karabella: шанс ты мне дал, но я его упустил )Karabella: в этот разVeter: да не, я кажется хуже сыграл, у меня был больше перевесVeter: ну и L8 была бы финальной ошибкойKarabella: размер не важен )Veter: размер важен))Karabella: главное что пересилить перевес не получилосьVeter: значит надо было не лениться и считать ёсе) Karabella: [object Object\]Veter: Ага, тоже с разбором увидел, ко правда.. ])))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))`;
// const temp_sgf = '(;GM[1]AP[StoneBase:SGFParser.3.0.1]SZ[19]VW[ja:sj]CA[utf-8]HA[0]PB[Black]PW[White]AB[pb][sb][pa][qa][pf][qf][pe][re][pd][rd][pc][ra]AW[sg][rg][rb][oa][qg][og][pg][of][rf][oe][se][od][sd][oc][qc][rc][ob][qb]N[黑先 死活题]C[创作者：陈禧](;B[qd];W[sf];B[sc]TE[1]C[CORRECT])(;B[sc];W[sa](;B[sc];W[sb];B[qd];W[qe])(;B[sb];W[sc];B[qd];W[sf]))(;B[sa];W[sc]))'

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
        if (event.key=='ArrowLeft') moveTo(game.value.currentMove.number==0 ? null : navigationPoints.value.prevMove.id);
        else if (event.key=='ArrowRight') moveTo(navigationPoints.value.nextMove.id);
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown);

    createNewGame();
    parseSGF(temp_sgf);
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