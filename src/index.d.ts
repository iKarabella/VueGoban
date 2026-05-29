// src/index.d.ts
import type { App, DefineComponent, Ref, ComputedRef } from 'vue';

// ─── Типы ядра ───────────────────────────────────────────────────

export declare const BLACK  = 1;
export declare const WHITE  = 2;
export declare const EMPTY  = 0;

export type StoneColor = typeof BLACK | typeof WHITE;
export type CellValue  = typeof BLACK | typeof WHITE | typeof EMPTY;

export interface Coords {
  x: number;
  y: number;
}

export interface MoveNode {
  id:          number;
  moveNumber:  number;
  color:       StoneColor | null;
  colorName:   'black' | 'white' | null;
  coords:      Coords | null;
  comment:     string;
  captures:    number;
  timestamp:   number;
  parent:      MoveNode | null;
  children:    MoveNode[];
  branchIndex: number;
}

export interface GameInfo {
  playerBlack: string;
  playerWhite: string;
  date:        string;
  event:       string;
  result:      string;
}

export interface GameState {
  boardSize:         number;
  komi:              number;
  gameInfo:          GameInfo;
  rootNode:          MoveNode;
  currentNode:       MoveNode;
  board:             CellValue[][];
  captures:          Record<number, number>;
  ko:                Coords | null;
  currentColor:      StoneColor;
  isGameOver:        boolean;
  consecutivePasses: number;
  hoveredCell:       Coords | null;
  showTerritory:     boolean;
  territory:         Record<number, number> | null;
  statusMessage:     string;
  lastError:         string;
}

export interface Score {
  black: number;
  white: number;
}

export interface NewGameOptions {
  size?:        number;
  komi?:        number;
  playerBlack?: string;
  playerWhite?: string;
}

export interface PlaceStoneResult {
  success:   boolean;
  error?:    string;
  captures?: number;
  ko?:       Coords | null;
}

// ─── useGoGame ───────────────────────────────────────────────────

export interface UseGoGameReturn {
  state: GameState;

  // computed
  moveNumber:        ComputedRef<number>;
  currentColor:      ComputedRef<StoneColor>;
  currentColorName:  ComputedRef<string>;
  currentPlayerName: ComputedRef<string>;
  capturesBlack:     ComputedRef<number>;
  capturesWhite:     ComputedRef<number>;
  currentNode:       ComputedRef<MoveNode>;
  currentComment:    ComputedRef<string>;
  canUndo:           ComputedRef<boolean>;
  canRedo:           ComputedRef<boolean>;
  currentBranches:   ComputedRef<MoveNode[]>;
  score:             ComputedRef<Score | null>;

  // константы
  BLACK:  typeof BLACK;
  WHITE:  typeof WHITE;
  EMPTY:  typeof EMPTY;

  // действия
  placeStone(x: number, y: number): boolean;
  pass(): void;
  undo(): boolean;
  redo(): boolean;
  goToNode(node: MoveNode): void;
  goToStart(): void;
  goToEnd(): void;
  nextMove(): void;
  prevMove(): void;
  endGame(): void;
  newGame(options?: NewGameOptions): void;
  setComment(comment: string): void;
  setHoveredCell(cell: Coords | null): void;
  toggleTerritory(): void;
  loadSGF(sgfString: string): boolean;
  exportSGF(): string;

  // утилиты
  pathToRoot(node: MoveNode): MoveNode[];
  flattenTree(root: MoveNode): Array<{ node: MoveNode; depth: number }>;
}

export declare function useGoGame(): UseGoGameReturn;

// ─── GoEngine ────────────────────────────────────────────────────

export declare class GoEngine {
  size:     number;
  board:    CellValue[][];
  captures: Record<number, number>;
  ko:       Coords | null;

  constructor(size?: number);
  reset(): void;
  placeStone(x: number, y: number, color: StoneColor): PlaceStoneResult;
  undo(): boolean;
  countTerritory(): Record<number, number>;
  getBoardState(): {
    board:    CellValue[][];
    captures: Record<number, number>;
    ko:       Coords | null;
  };
}

// ─── SGFParser ───────────────────────────────────────────────────

export declare class SGFParser {
  parse(sgfString: string): any;
  static sgfToCoords(sgfCoord: string, size?: number): Coords | null;
  static coordsToSGF(x: number, y: number): string;
  static extractMoves(rootNode: any): any[];
  static generateSGF(moves: any[], gameInfo?: object): string;
}

// ─── Компоненты ──────────────────────────────────────────────────

export declare const GoBoard:       DefineComponent<{}, {}, any>;
export declare const GameInfo:      DefineComponent<{}, {}, any>;
export declare const MoveTree:      DefineComponent<{}, {}, any>;
export declare const ControlPanel:  DefineComponent<{}, {}, any>;
export declare const MoveComments:  DefineComponent<{}, {}, any>;

// ─── Плагин ──────────────────────────────────────────────────────

export interface GoBoardPluginOptions {
  prefix?: string;
}

export declare const GoBoardPlugin: {
  install(app: App, options?: GoBoardPluginOptions): void;
};

export default GoBoardPlugin;