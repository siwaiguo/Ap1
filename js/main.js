/* 主程序只负责连接各模块和维护当前状态。 */
(function (root) {
  'use strict';
  const canvas = document.getElementById('gl-canvas');
  const state = {mode:'points', algorithm:'chaos', pointCount:20000, depth:5, pointSize:2,
    palette:'blue', polygon:3, ratio:0.5, scale:1, offset:[0,0], paused:false, visibleCount:0};
  let renderer, ui, lastTime = null, lastStatisticsTime = 0, animationFrame;
  const G = root.FractalGeometry;
  let cachedDepth = -1, cachedLeaves;
  function leaves() {
    if (cachedDepth !== state.depth) {
      cachedLeaves = G.subdivide(G.triangle, state.depth); cachedDepth = state.depth;
    }
    return cachedLeaves;
  }
  function rebuild() {
    let data;
    if (state.mode === 'points') {
      data = state.algorithm === 'chaos'
        ? G.chaosGame(state.pointCount, G.regularPolygon(state.polygon), state.polygon === 3 ? 0.5 : state.ratio)
        : G.recursivePoints(leaves(), state.pointCount);
    } else data = G.trianglesToVertices(leaves(), state.mode);
    renderer.upload(data);
    state.visibleCount = 0; lastTime = null;
    ui.sync(); ui.updateStatistics(renderer.vertexCount);
  }
  function setMode(mode) {state.mode = mode; rebuild();}
  function togglePause() {if (state.mode === 'points') {state.paused = !state.paused; ui.sync();}}
  function restart() {state.visibleCount = 0; state.paused = false; lastTime = null; ui.sync();}
  function resetView() {state.scale = 1; state.offset = [0,0]; ui.sync();}
  function exportImage() {
    renderer.draw(state);
    canvas.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement('a'), url = URL.createObjectURL(blob);
      link.download = state.mode + '.png'; link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }
  function animate(time) {
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    if (state.mode === 'points' && !state.paused) {
      state.visibleCount = Math.min(renderer.vertexCount, state.visibleCount + dt * 6000);
    }
    renderer.draw(state);
    if (time - lastStatisticsTime > 100) {ui.updateStatistics(renderer.vertexCount); lastStatisticsTime = time;}
    animationFrame = root.requestAnimFrame(animate);
  }
  function showError(message) {
    const element = document.getElementById('error'); element.textContent = message; element.hidden = false;
    document.querySelectorAll('aside input, aside select, aside button').forEach(el => {el.disabled = true;});
  }
  try {
    renderer = new root.FractalRenderer(canvas);
    const actions = {rebuild, setMode, togglePause, restart, resetView, exportImage, viewChanged:() => ui.sync()};
    ui = root.FractalUI.bindUI(state, actions);
    root.FractalInteraction.bindInteraction(canvas, state, actions);
    rebuild(); animationFrame = root.requestAnimFrame(animate);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); root.cancelAnimationFrame(animationFrame);
      showError('WebGL 上下文丢失，请刷新页面重新初始化。');
    });
    root.addEventListener('pagehide', event => {
      if (!event.persisted) {root.cancelAnimationFrame(animationFrame); renderer.dispose();}
    });
  } catch (error) {showError(error.message);}
})(globalThis);
