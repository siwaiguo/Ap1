(async function (root) {
  'use strict';
  const message = document.getElementById('message'), button = document.getElementById('download');
  const modes = ['points', 'lines', 'solid'], renderers = [], files = [];
  button.disabled = true;
  try {
    const G = root.FractalGeometry, leaves = G.subdivide(G.triangle, 5);
    for (const mode of modes) {
      const canvas = document.getElementById(mode), renderer = new root.FractalRenderer(canvas);
      renderers.push(renderer);
      renderer.upload(mode === 'points' ? G.chaosGame(20000) : G.trianglesToVertices(leaves, mode));
      renderer.draw({mode, palette:'blue', scale:1, offset:[0,0], pointSize:2, visibleCount:20000});
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 导出失败');
      files.push({name:'AP1/screenshots/' + mode + '.png', data:new Uint8Array(await blob.arrayBuffer())});
    }
    message.textContent = '三张图已生成。点击按钮下载最终提交包。'; button.disabled = false;
    button.addEventListener('click', async () => {
      button.disabled = true; message.textContent = '正在读取源码和说明…';
      try {
        const allPaths = await fetch('package-files.json').then(response => {
          if (!response.ok) throw new Error('文件清单读取失败'); return response.json();
        });
        const paths = allPaths.filter(path => !path.startsWith('screenshots/'));
        const sourceFiles = await Promise.all(paths.map(async path => {
          const response = await fetch(path);
          if (!response.ok) throw new Error('读取失败：' + path);
          let data;
          if (path === 'README.md') {
            const text = await response.text();
            data = new TextEncoder().encode(text.replace(/<!-- SCREENSHOT_STATUS -->[^\n]+/,
              '<!-- SCREENSHOT_STATUS -->本包内 screenshots/ 的三张 PNG 已由浏览器中的 WebGL 渲染器实际生成并导出。'));
          } else data = new Uint8Array(await response.arrayBuffer());
          return {name:'AP1/' + path, data};
        }));
        const blob = root.FractalZip.zipFiles([...sourceFiles, ...files]);
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'AP1_完整作业_含截图.zip'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        message.textContent = '下载已触发。README、源码和三种模式 PNG 均已放入 ZIP。';
      } catch (error) {message.textContent = error.message + '。请通过静态服务器运行本页。';}
      finally {button.disabled = false;}
    });
  } catch (error) {message.textContent = error.message;}
})(globalThis);
