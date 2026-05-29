<!-- src/components/MoveTree.vue -->
<template>
    <div class="move-tree">
      <div class="move-tree__header">
        <h2 class="move-tree__title">Дерево ходов</h2>
        <div class="move-tree__meta">
          <span class="meta-chip">{{ totalNodes }} ходов</span>
          <span class="meta-chip">{{ totalBranches }} веток</span>
        </div>
      </div>
  
      <div
        class="move-tree__viewport"
        ref="viewport"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @click="onClick"
        @wheel.prevent="onWheel"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <canvas ref="canvas" class="move-tree__canvas" />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
  import { useGoGame } from '../core/useGoGame.js';
  
  const { state, goToNode, pathToRoot, BLACK } = useGoGame();
  
  // ─── Refs ────────────────────────────────────────────────────────
  const viewport = ref(null);
  const canvas   = ref(null);
  
  // ─── Константы ───────────────────────────────────────────────────
  const NODE_R    = 14;
  const COL_W     = 36;
  const ROW_H     = 36;
  const PAD_X     = 20;
  const PAD_Y     = 20;
  const FONT_SIZE = 10;
  
  // ─── Палитра веток ───────────────────────────────────────────────
  const BRANCH_COLORS = [
    '#9a7a3a',  // 0 — главная (тёмно-золотой, близко к фону)
    '#e07040',  // 1 — оранжевый
    '#60a8e0',  // 2 — голубой
    '#70c070',  // 3 — зелёный
    '#c070c0',  // 4 — фиолетовый
    '#d4b030',  // 5 — жёлтый
    '#50c8b0',  // 6 — бирюзовый
    '#e06080',  // 7 — розовый
    '#9090d0',  // 8 — лавандовый
    '#c09060',  // 9 — коричневый
  ];
  
  function getBranchColor(branchId) {
    return BRANCH_COLORS[branchId % BRANCH_COLORS.length];
  }
  
  function lightenColor(hex, factor) {
    const r  = parseInt(hex.slice(1, 3), 16);
    const g  = parseInt(hex.slice(3, 5), 16);
    const b  = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, Math.round(r + (255 - r) * factor));
    const lg = Math.min(255, Math.round(g + (255 - g) * factor));
    const lb = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;
  }
  
  // ─── Pan state ───────────────────────────────────────────────────
  const offsetX = ref(0);
  const offsetY = ref(0);
  
  let isDragging  = false;
  let hasDragged  = false;
  let dragStartX  = 0;
  let dragStartY  = 0;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let lastTouchX  = 0;
  let lastTouchY  = 0;
  
  // ─── Layout ──────────────────────────────────────────────────────
  function computeLayout(root) {
    const layout       = new Map();
    let   maxRow       = 0;
    let   branchCounter = 0;
  
    function dfs(node, col, row, branchId) {
      layout.set(node.id, { col, row, node, branchId });
      maxRow = Math.max(maxRow, row);
  
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (i === 0) {
          dfs(child, col + 1, row, branchId);
        } else {
          branchCounter++;
          dfs(child, col + 1, ++maxRow, branchCounter);
        }
      }
    }
  
    dfs(root, 0, 0, 0);
    return layout;
  }
  
  function canvasDimensions(layout) {
    let maxCol = 0;
    let maxRow = 0;
    for (const { col, row } of layout.values()) {
      maxCol = Math.max(maxCol, col);
      maxRow = Math.max(maxRow, row);
    }
    return {
      w: PAD_X * 2 + maxCol * COL_W + NODE_R * 2,
      h: PAD_Y * 2 + maxRow * ROW_H + NODE_R * 2,
    };
  }
  
  function nodeXY(col, row) {
    return {
      x: PAD_X + NODE_R + col * COL_W,
      y: PAD_Y + NODE_R + row * ROW_H,
    };
  }
  
  // ─── Рёбра ───────────────────────────────────────────────────────
  function drawEdges(ctx, layout) {
    const currentPathIds = new Set(
      pathToRoot(state.currentNode).map(n => n.id)
    );
  
    for (const { col, row, node } of layout.values()) {
      const { x: px, y: py } = nodeXY(col, row);
  
      for (const child of node.children) {
        const cl = layout.get(child.id);
        if (!cl) continue;
  
        const { x: cx, y: cy } = nodeXY(cl.col, cl.row);
        const isOnPath  = currentPathIds.has(node.id) && currentPathIds.has(child.id);
        const isSameRow = py === cy;
  
        const baseColor   = getBranchColor(cl.branchId);
        const strokeColor = isOnPath ? lightenColor(baseColor, 0.35) : baseColor;
        const lineWidth   = isOnPath ? 1.5 : 1;
        const alpha       = isOnPath ? 1.0 : 0.75;
  
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = lineWidth;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
  
        if (isSameRow) {
          ctx.moveTo(px + NODE_R, py);
          ctx.lineTo(cx - NODE_R, cy);
        } else {
          const startX = px;
          const startY = py + NODE_R;
          const endX   = cx - NODE_R;
          const endY   = cy;
          const cp1X   = startX;
          const cp1Y   = startY + (endY - startY) * 0.55;
          const cp2X   = endX   - (endX - startX) * 0.25;
          const cp2Y   = endY;
  
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
        }
  
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  
  // ─── Узлы ────────────────────────────────────────────────────────
  function drawNode(ctx, x, y, node, branchId) {
    const isCurrent   = node === state.currentNode;
    const isRoot      = node.moveNumber === 0;
    const isBlack     = node.color === BLACK;
    const isOnPath    = pathToRoot(state.currentNode).some(n => n.id === node.id);
    const branchColor = getBranchColor(branchId);
  
    ctx.save();
  
    if (isRoot) {
      ctx.beginPath();
      ctx.moveTo(x,          y - NODE_R * 0.9);
      ctx.lineTo(x + NODE_R, y + NODE_R * 0.7);
      ctx.lineTo(x - NODE_R, y + NODE_R * 0.7);
      ctx.closePath();
      ctx.fillStyle   = isCurrent ? 'rgba(204,34,0,0.5)' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.strokeStyle = isCurrent ? '#ff6644' : '#5a3e1b';
      ctx.lineWidth   = isCurrent ? 1.5 : 0.8;
      ctx.stroke();
  
    } else {
      ctx.beginPath();
      ctx.arc(x, y, NODE_R, 0, Math.PI * 2);
  
      if (isCurrent) {
        ctx.fillStyle   = '#cc2200';
        ctx.fill();
        ctx.strokeStyle = '#ff8866';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
  
      } else {
        const grad = ctx.createRadialGradient(
          x - NODE_R * 0.3, y - NODE_R * 0.3, NODE_R * 0.05,
          x, y, NODE_R
        );
        if (isBlack) {
          grad.addColorStop(0,   '#888');
          grad.addColorStop(0.4, '#333');
          grad.addColorStop(1,   '#000');
        } else {
          grad.addColorStop(0,   '#fff');
          grad.addColorStop(0.5, '#ddd');
          grad.addColorStop(1,   '#aaa');
        }
  
        ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur    = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle     = grad;
        ctx.fill();
        ctx.shadowColor   = 'transparent';
  
        // Обводка в цвет ветки
        ctx.strokeStyle = isOnPath
          ? lightenColor(branchColor, 0.3)
          : (isBlack ? '#555' : '#999');
        ctx.lineWidth   = isOnPath ? 1.5 : 1;
        ctx.stroke();
      }
  
      // Номер хода
      ctx.fillStyle    = isCurrent ? '#fff' : (isBlack ? '#eee' : '#222');
      ctx.font         = `bold ${FONT_SIZE}px Arial`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = 'transparent';
      ctx.fillText(node.moveNumber, x, y);
    }
  
    // Точка комментария
    if (node.comment?.trim()) {
      ctx.beginPath();
      ctx.arc(x + NODE_R * 0.72, y - NODE_R * 0.72, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#90caf9';
      ctx.fill();
    }
  
    ctx.restore();
  }
  
  // ─── Главная отрисовка ────────────────────────────────────────────
  function draw() {
    const ctx = canvas.value?.getContext('2d');
    if (!ctx) return;
  
    const layout   = computeLayout(state.rootNode);
    const { w, h } = canvasDimensions(layout);
  
    canvas.value.width  = w;
    canvas.value.height = h;
  
    ctx.fillStyle = '#717172';
    ctx.fillRect(0, 0, w, h);
  
    drawEdges(ctx, layout);
  
    for (const { col, row, node, branchId } of layout.values()) {
      const { x, y } = nodeXY(col, row);
      drawNode(ctx, x, y, node, branchId);
    }
  }
  
  // ─── Скролл к текущему узлу ──────────────────────────────────────
  function clampOffset(offset, viewSize, contentSize) {
    return Math.max(Math.min(0, viewSize - contentSize), Math.min(0, offset));
  }
  
  function applyTransform() {
    if (canvas.value) {
      canvas.value.style.transform =
        `translate(${offsetX.value}px, ${offsetY.value}px)`;
    }
  }
  
  function scrollToCurrentNode() {
    if (!viewport.value || !canvas.value) return;
  
    const layout = computeLayout(state.rootNode);
    const entry  = layout.get(state.currentNode?.id);
    if (!entry) return;
  
    const { x, y } = nodeXY(entry.col, entry.row);
    const vw = viewport.value.clientWidth;
    const vh = viewport.value.clientHeight;
    const cw = canvas.value.width;
    const ch = canvas.value.height;
  
    offsetX.value = clampOffset(vw / 2 - x, vw, cw);
    offsetY.value = clampOffset(vh / 2 - y, vh, ch);
    applyTransform();
  }
  
  // ─── Клик ────────────────────────────────────────────────────────
  function onClick(e) {
    if (hasDragged) return;
  
    const rect   = canvas.value.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const layout = computeLayout(state.rootNode);
  
    for (const { col, row, node } of layout.values()) {
      const { x, y } = nodeXY(col, row);
      const dx = clickX - x;
      const dy = clickY - y;
      if (dx * dx + dy * dy <= NODE_R * NODE_R) {
        goToNode(node);
        return;
      }
    }
  }
  
  // ─── Mouse drag ──────────────────────────────────────────────────
  function onMouseDown(e) {
    isDragging  = true;
    hasDragged  = false;
    dragStartX  = e.clientX;
    dragStartY  = e.clientY;
    dragOffsetX = offsetX.value;
    dragOffsetY = offsetY.value;
    if (viewport.value) viewport.value.style.cursor = 'grabbing';
  }
  
  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged = true;
  
    const vw = viewport.value.clientWidth;
    const vh = viewport.value.clientHeight;
    const cw = canvas.value.width;
    const ch = canvas.value.height;
  
    offsetX.value = clampOffset(dragOffsetX + dx, vw, cw);
    offsetY.value = clampOffset(dragOffsetY + dy, vh, ch);
    applyTransform();
  }
  
  function onMouseUp() {
    isDragging = false;
    if (viewport.value) viewport.value.style.cursor = 'grab';
  }
  
  // ─── Touch ───────────────────────────────────────────────────────
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }
  
  function onTouchMove(e) {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastTouchX;
    const dy = e.touches[0].clientY - lastTouchY;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  
    const vw = viewport.value.clientWidth;
    const vh = viewport.value.clientHeight;
    const cw = canvas.value.width;
    const ch = canvas.value.height;
  
    offsetX.value = clampOffset(offsetX.value + dx, vw, cw);
    offsetY.value = clampOffset(offsetY.value + dy, vh, ch);
    applyTransform();
  }
  
  function onTouchEnd() {}
  
  // ─── Wheel ───────────────────────────────────────────────────────
  function onWheel(e) {
    const vw = viewport.value.clientWidth;
    const vh = viewport.value.clientHeight;
    const cw = canvas.value.width;
    const ch = canvas.value.height;
  
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      offsetX.value = clampOffset(offsetX.value - (e.deltaX || e.deltaY), vw, cw);
    } else {
      offsetY.value = clampOffset(offsetY.value - e.deltaY, vh, ch);
    }
    applyTransform();
  }
  
  // ─── Статистика ──────────────────────────────────────────────────
  const totalNodes = computed(() => {
    let n = 0;
    function dfs(node) { n++; node.children.forEach(dfs); }
    dfs(state.rootNode);
    return n - 1;
  });
  
  const totalBranches = computed(() => {
    let n = 0;
    function dfs(node) {
      if (node.children.length > 1) n += node.children.length - 1;
      node.children.forEach(dfs);
    }
    dfs(state.rootNode);
    return n;
  });
  
  // ─── Реактивность ────────────────────────────────────────────────
  watch(
    () => state.currentNode,
    async () => {
      draw();
      await nextTick();
      scrollToCurrentNode();
    }
  );
  
  watch(
    () => state.rootNode,
    async () => {
      draw();
      await nextTick();
      scrollToCurrentNode();
    },
    { deep: true }
  );
  
  // ─── Lifecycle ───────────────────────────────────────────────────
  let resizeObserver = null;
  
  onMounted(async () => {
    if (viewport.value) viewport.value.style.cursor = 'grab';
    draw();
    await nextTick();
    scrollToCurrentNode();
  
    resizeObserver = new ResizeObserver(() => applyTransform());
    resizeObserver.observe(viewport.value);
  });
  
  onUnmounted(() => resizeObserver?.disconnect());
  </script>
  
  <style scoped>
  .move-tree {
    background: #1e2430;
    border-radius: 12px;
    padding: 14px;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .move-tree__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  
  .move-tree__title {
    font-size: 1rem;
    font-weight: 600;
    color: #90caf9;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .move-tree__meta {
    display: flex;
    gap: 6px;
  }
  
  .meta-chip {
    font-size: 0.72rem;
    padding: 2px 8px;
    background: rgba(255,255,255,0.07);
    border-radius: 10px;
    color: #aaa;
  }
  
  .move-tree__viewport {
    position: relative;
    width: 100%;
    height: 220px;
    overflow: hidden;
    border-radius: 8px;
    background: #717172;
    border: 1px solid #3f3e3f;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.3);
    user-select: none;
    -webkit-user-select: none;
  }
  
  .move-tree__canvas {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
  }
  </style>