/* 鼠标、键盘模块。监听器自行实现，没有使用控制器插件。 */
(function (root) {
  'use strict';
  function screenToWorld(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return [(2 * (clientX - rect.left) / rect.width - 1) * rect.width / rect.height,
            1 - 2 * (clientY - rect.top) / rect.height];
  }
  function bindInteraction(canvas, state, actions) {
    let previous = null;
    canvas.addEventListener('mousedown', event => {
      if (event.button !== 0) return;
      canvas.focus(); previous = [event.clientX, event.clientY];
      canvas.classList.add('dragging'); event.preventDefault();
    });
    root.addEventListener('mousemove', event => {
      if (!previous) return;
      if (!(event.buttons & 1)) { stopDrag(); return; }
      const height = canvas.getBoundingClientRect().height;
      // 与着色器中的横纵比修正一致，所以横向也按画布高度换算。
      state.offset[0] += 2 * (event.clientX - previous[0]) / height;
      state.offset[1] -= 2 * (event.clientY - previous[1]) / height;
      previous = [event.clientX, event.clientY]; actions.viewChanged();
    });
    function stopDrag() { previous = null; canvas.classList.remove('dragging'); }
    root.addEventListener('mouseup', stopDrag); root.addEventListener('blur', stopDrag);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const position = screenToWorld(canvas, event.clientX, event.clientY);
      // 把滚轮以“行/页”为单位的事件换算成近似像素，避免部分设备缩放太慢。
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      const oldScale = state.scale;
      const newScale = Math.max(0.2, Math.min(20, oldScale * Math.exp(-delta * 0.001)));
      const factor = newScale / oldScale;
      // 保持鼠标下的模型坐标不动，使缩放围绕光标发生。
      state.offset = position.map((value, i) => value - factor * (value - state.offset[i]));
      state.scale = newScale; actions.viewChanged();
    }, {passive: false});
    root.addEventListener('keydown', event => {
      const target = event.target;
      if (target && (target.matches('input, select, textarea, button') || target.isContentEditable)) return;
      const modes = {'1': 'points', '2': 'lines', '3': 'solid'};
      if (modes[event.key]) { event.preventDefault(); actions.setMode(modes[event.key]); }
      if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) actions.togglePause(); }
      if (event.key.toLowerCase() === 'r') actions.resetView();
    });
  }
  root.FractalInteraction = {bindInteraction, screenToWorld};
})(globalThis);
