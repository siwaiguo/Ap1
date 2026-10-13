/* HTML 控件模块。参数输入与 WebGL 绘制分开管理。 */
(function (root) {
  'use strict';
  function bindUI(state, actions) {
    const ids = ['mode', 'algorithm', 'point-count', 'depth', 'point-size', 'palette', 'polygon', 'ratio', 'pause', 'restart', 'reset', 'export'];
    const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    const on = (id, action) => elements[id].addEventListener('change', action);
    on('mode', event => actions.setMode(event.target.value));
    on('algorithm', event => {state.algorithm = event.target.value; actions.rebuild();});
    elements['point-count'].addEventListener('input', event => {state.pointCount = Number(event.target.value); actions.rebuild();});
    elements.depth.addEventListener('input', event => {state.depth = Number(event.target.value); actions.rebuild();});
    elements['point-size'].addEventListener('input', event => {state.pointSize = Number(event.target.value); sync();});
    on('palette', event => {state.palette = event.target.value; sync();});
    on('polygon', event => {
      state.polygon = Number(event.target.value);
      state.ratio = {3: 0.5, 5: 0.618, 6: 0.667}[state.polygon];
      actions.rebuild();
    });
    elements.ratio.addEventListener('input', event => {state.ratio = Number(event.target.value); actions.rebuild();});
    elements.pause.addEventListener('click', actions.togglePause);
    elements.restart.addEventListener('click', actions.restart);
    elements.reset.addEventListener('click', actions.resetView);
    elements.export.addEventListener('click', actions.exportImage);
    function sync() {
      const isPoint = state.mode === 'points', isChaos = isPoint && state.algorithm === 'chaos';
      elements.mode.value = state.mode;
      elements.algorithm.value = isPoint ? state.algorithm : 'recursive';
      elements.algorithm.disabled = !isPoint;
      elements['point-count'].disabled = !isPoint;
      elements.depth.disabled = isChaos;
      elements['point-size'].disabled = !isPoint;
      elements.polygon.disabled = !isChaos; elements.polygon.value = state.polygon;
      elements.ratio.disabled = !isChaos || state.polygon === 3; elements.ratio.value = state.ratio;
      elements.pause.disabled = !isPoint; elements.restart.disabled = !isPoint;
      elements.pause.textContent = state.paused ? '继续生长' : '暂停生长';
      document.getElementById('count-value').textContent = state.pointCount.toLocaleString();
      document.getElementById('depth-value').textContent = state.depth;
      document.getElementById('size-value').textContent = state.pointSize + ' px';
      document.getElementById('ratio-value').textContent = state.ratio.toFixed(3);
      document.getElementById('zoom-label').textContent = '缩放 ' + state.scale.toFixed(2) + '×';
      const modeName = {points:'点云', lines:'线框', solid:'实体'}[state.mode];
      const name = isChaos ? (state.polygon === 3 ? '混沌游戏' : state.polygon + ' 边形混沌游戏') : '递归细分';
      document.getElementById('scene-title').textContent = name + ' · ' + modeName;
    }
    function updateStatistics(total) {
      const isPoint = state.mode === 'points';
      document.getElementById('statistics').textContent = isPoint
        ? '顶点 ' + Math.min(Math.floor(state.visibleCount), total).toLocaleString() + ' / ' + total.toLocaleString()
        : '深度 ' + state.depth + ' · ' + (3 ** state.depth).toLocaleString() + ' 个三角形 · ' + total.toLocaleString() + ' 个顶点';
      document.getElementById('animation-status').textContent = !isPoint ? '静态绘制' : state.paused ? '已暂停' : state.visibleCount >= total ? '生长完成' : '逐点生长中';
    }
    sync(); return {sync, updateStatistics};
  }
  root.FractalUI = {bindUI};
})(globalThis);
