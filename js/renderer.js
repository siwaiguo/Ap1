/* WebGL 模块：CPU 顶点数组 -> VBO -> 着色器 -> drawArrays。 */
(function (root) {
  'use strict';
  const palettes = {
    blue: [[0.11, 0.31, 0.61], [0.26, 0.64, 0.88]],
    warm: [[0.72, 0.19, 0.16], [0.98, 0.65, 0.24]],
    green: [[0.07, 0.40, 0.29], [0.38, 0.72, 0.48]]
  };
  class FractalRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      // 配套 webgl-utils.js 的 setupWebGL 默认申请 WebGL 1，故这里直接申请 2.0。
      this.gl = canvas.getContext('webgl2', {antialias: true, preserveDrawingBuffer: true});
      if (!this.gl) throw new Error('无法创建 WebGL 2.0 上下文，请检查浏览器及硬件加速设置。');
      const gl = this.gl;
      this.program = root.initShaders(gl, 'vertex-shader', 'fragment-shader');
      if (this.program === -1) throw new Error('着色器编译或链接失败。');
      gl.useProgram(this.program);
      this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
      this.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      const position = gl.getAttribLocation(this.program, 'aPosition');
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(position);
      this.uniforms = {};
      for (const name of ['uScale', 'uOffset', 'uAspect', 'uPointSize', 'uColorLow', 'uColorHigh']) {
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      }
      this.maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
      this.vertexCount = 0;
    }
    upload(data) {
      const gl = this.gl;
      gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      this.vertexCount = data.length / 2;
    }
    resize() {
      const pixelRatio = Math.min(root.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(this.canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * pixelRatio));
      if (width !== this.canvas.width || height !== this.canvas.height) {
        this.canvas.width = width; this.canvas.height = height;
      }
      this.pixelRatio = pixelRatio;
      this.gl.viewport(0, 0, width, height);
    }
    draw(state) {
      this.resize();
      const gl = this.gl, u = this.uniforms;
      gl.useProgram(this.program); gl.bindVertexArray(this.vao);
      gl.clearColor(0.985, 0.989, 1.0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.uScale, state.scale); gl.uniform2fv(u.uOffset, state.offset);
      gl.uniform1f(u.uAspect, this.canvas.width / this.canvas.height);
      gl.uniform1f(u.uPointSize, Math.min(state.pointSize * this.pixelRatio, this.maxPointSize));
      const [low, high] = palettes[state.palette];
      gl.uniform3fv(u.uColorLow, low); gl.uniform3fv(u.uColorHigh, high);
      const primitive = {points: gl.POINTS, lines: gl.LINES, solid: gl.TRIANGLES}[state.mode];
      const count = state.mode === 'points' ? Math.min(Math.floor(state.visibleCount), this.vertexCount) : this.vertexCount;
      // 动画只增加 drawArrays 的 count，不重复生成数据或上传整个 VBO。
      gl.drawArrays(primitive, 0, count);
    }
    dispose() {
      this.gl.deleteBuffer(this.buffer); this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
    }
  }
  root.FractalRenderer = FractalRenderer;
})(globalThis);
