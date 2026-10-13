/* 几何生成模块：只计算坐标，不操作 DOM 和 WebGL。 */
(function (root) {
  'use strict';
  const triangle = [[-0.8, -0.692820323], [0.8, -0.692820323], [0, 0.692820323]];
  const midpoint = (a, b) => root.mix(a, b, 0.5); // 教材 MV.js 的向量插值。

  // 返回叶子三角形，后续三种绘制模式共用它们。
  function subdivide(vertices, depth) {
    if (!Number.isInteger(depth) || depth < 0 || depth > 6) throw new RangeError('深度应为 0—6 的整数');
    const leaves = [];
    function visit(a, b, c, remaining) {
      if (remaining === 0) { leaves.push([a, b, c]); return; }
      const ab = midpoint(a, b), ac = midpoint(a, c), bc = midpoint(b, c);
      // 中间的倒三角形不递归，相当于挖去中央区域。
      visit(a, ab, ac, remaining - 1);
      visit(ab, b, bc, remaining - 1);
      visit(ac, bc, c, remaining - 1);
    }
    visit(vertices[0], vertices[1], vertices[2], depth);
    return leaves;
  }

  function regularPolygon(n) {
    if (n === 3) return triangle;
    if (![5, 6].includes(n)) throw new RangeError('本实验提供三、五、六边形');
    return Array.from({length: n}, (_, i) => {
      const angle = Math.PI / 2 + 2 * Math.PI * i / n;
      return [0.85 * Math.cos(angle), 0.85 * Math.sin(angle)];
    });
  }

  // 在三角形内均匀随机采样。r+s>1 时折回，避免采到三角形外。
  function sampleTriangle(vertices, random = Math.random) {
    let r = random(), s = random();
    if (r + s > 1) { r = 1 - r; s = 1 - s; }
    const [a, b, c] = vertices;
    return [a[0] + r * (b[0] - a[0]) + s * (c[0] - a[0]),
            a[1] + r * (b[1] - a[1]) + s * (c[1] - a[1])];
  }

  function chaosGame(count, vertices = triangle, ratio = 0.5, random = Math.random) {
    if (!Number.isInteger(count) || count < 1 || count > 100000) throw new RangeError('顶点数超出范围');
    if (!(ratio > 0 && ratio < 1)) throw new RangeError('移动比例应在 0 和 1 之间');
    // 对三角形，初始点就在内部；多边形用前三顶点组成的内部三角形。
    let p = sampleTriangle(vertices.slice(0, 3), random);
    const data = new Float32Array(count * 2);
    // 前 20 次作为预迭代，减弱随机初始点对图形的影响，不计入目标点数。
    for (let i = -20; i < count; i++) {
      const target = vertices[Math.floor(random() * vertices.length)];
      p = root.mix(p, target, ratio); // 三角形基线就是 p=(p+target)/2。
      if (i >= 0) { data[2 * i] = p[0]; data[2 * i + 1] = p[1]; }
    }
    return data;
  }

  function recursivePoints(leaves, count, random = Math.random) {
    const data = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      // 每个叶子面积相等，可等概率选择，再在叶子内部采样。
      const leaf = leaves[Math.floor(random() * leaves.length)];
      const p = sampleTriangle(leaf, random);
      data[2 * i] = p[0]; data[2 * i + 1] = p[1];
    }
    return data;
  }

  function trianglesToVertices(leaves, mode) {
    const points = [];
    for (const [a, b, c] of leaves) {
      if (mode === 'lines') points.push(a, b, b, c, c, a); // 每两个顶点组成一条边。
      else points.push(a, b, c); // 实体与原始递归顶点点云均用这一组坐标。
    }
    return root.flatten(points); // MV.js 展平为连续的 Float32Array。
  }

  root.FractalGeometry = {triangle, subdivide, regularPolygon, chaosGame, recursivePoints, trianglesToVertices};
})(globalThis);
