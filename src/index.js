import Comments from './components/Comments/Comments.vue'
import CreateGame from './components/CreateGame/CreateGame.vue'
import Dashboard from './components/Dashboard/Dashboard.vue'
import GameInfo from './components/GameInfo/GameInfo.vue'
import Goban from './components/Goban/Goban.vue'
import MovesTree from './components/MovesTree/MovesTree.vue'
import GobanApp from './components/GobanApp.js'

export {
  Comments,
  CreateGame,
  Dashboard,
  GameInfo,
  Goban,
  MovesTree,
  GobanApp,
}

// export default {
//   install(app) {
//     app.component('Comments', Comments)
//     app.component('CreateGame', CreateGame)
//     app.component('Dashboard', Dashboard)
//     app.component('GameInfo', GameInfo)
//     app.component('Goban', Goban)
//     app.component('MovesTree', MovesTree)
//   },
// }