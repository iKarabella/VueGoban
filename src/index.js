// Компоненты
export { default as Goban }         from './components/Goban.vue';
export { default as GameInfo }      from './components/GameInfo.vue';
export { default as MovesTree }     from './components/MovesTree.vue';
export { default as ControlPanel }  from './components/ControlPanel.vue';
export { default as Comments }      from './components/Comments.vue';
export { default as EditComments }      from './components/EditComments.vue';

// Ядро
export { useGoGame }   from './core/useGoGame.js';
export { GoEngine, BLACK, WHITE, EMPTY } from './core/GoEngine.js';
export { SGFParser }   from './core/SGFParser.js';

// Vue плагин — регистрирует все компоненты глобально
import Goban      from './components/Goban.vue';
import GameInfo     from './components/GameInfo.vue';
import MovesTree     from './components/MovesTree.vue';
import ControlPanel from './components/ControlPanel.vue';
import Comments from './components/Comments.vue';
import EditComments from './components/EditComments.vue';

const components = {
  Goban,
  GameInfo,
  MovesTree,
  ControlPanel,
  Comments,
  EditComments,
};

export const GobanPlugin = {
  install(app, options = {}) {
    // Префикс для компонентов: по умолчанию 'Go'
    // Goban, GoGameInfo, GoMovesTree, ...
    const prefix = options.prefix ?? 'Go';

    Object.entries(components).forEach(([name, component]) => {
      // Goban → Goban (префикс уже есть)
      // GameInfo → GoGameInfo
      const componentName = name.startsWith('Go')
        ? `${prefix}${name.slice(2)}`   // Goban → Goban
        : `${prefix}${name}`;           // GameInfo → GoGameInfo

      app.component(componentName, component);
    });
  },
};

// Default export — плагин
export default GobanPlugin;