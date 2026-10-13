// 运行：node tests/check.cjs。无需安装 npm 依赖；不替代浏览器/GPU 验收。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const context = vm.createContext({console, Float32Array, Blob, TextEncoder});
function load(name) {vm.runInContext(fs.readFileSync(path.join(base, name), 'utf8'), context, {filename:name});}
load('Common/MV.js'); load('js/geometry.js');
const G = context.FractalGeometry;
let groups = 0;
function pass(message) {groups++; console.log('PASS ' + message);}
function area(t) {const [a,b,c]=t; return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
function barycentric(p,t=G.triangle) {
  const [a,b,c]=t, d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/d;
  const v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/d;
  return [u,v,1-u-v];
}
let seed = 12345;
const random = () => {seed=(1664525*seed+1013904223)>>>0; return seed/4294967296;};
for(let depth=0;depth<=6;depth++) {
  const leaves=G.subdivide(G.triangle,depth);
  assert.equal(leaves.length,3**depth);
  assert.equal(G.trianglesToVertices(leaves,'solid').length,6*3**depth);
  assert.equal(G.trianglesToVertices(leaves,'lines').length,12*3**depth);
  const total=leaves.reduce((sum,t)=>sum+area(t),0);
  assert.ok(Math.abs(total-area(G.triangle)*(3/4)**depth)<1e-9);
}
assert.throws(()=>G.subdivide(G.triangle,7));
assert.throws(()=>G.subdivide(G.triangle,-1));
assert.throws(()=>G.subdivide(G.triangle,1.5));
pass('递归深度 0—6：三角形数、图元顶点数、保留面积及深度约束');
const chaos=G.chaosGame(100000,G.triangle,0.5,random);
assert.ok(chaos instanceof Float32Array); assert.equal(chaos.length,200000);
for(let i=0;i<chaos.length;i+=2) {
  const p=[chaos[i],chaos[i+1]], weights=barycentric(p);
  assert.ok(weights.every(w=>w>=-1e-6&&w<=1+1e-6));
  assert.ok(Math.max(...weights)>=0.5-1e-6,'点必须在第一层保留的三个角内');
}
// 用常量随机数让算法总选择顶点 A，与手算 25 次中点迭代比较。
const constant=()=>0.1, deterministic=G.chaosGame(5,G.triangle,0.5,constant);
let p=G.triangle.map(()=>0); p=G.triangle[0].map((value,j)=>value+0.1*(G.triangle[1][j]-value)+0.1*(G.triangle[2][j]-value));
for(let i=0;i<25;i++) {
  p=p.map((value,j)=>(value+G.triangle[0][j])/2);
  if(i>=20) {assert.ok(Math.abs(deterministic[(i-20)*2]-p[0])<1e-6); assert.ok(Math.abs(deterministic[(i-20)*2+1]-p[1])<1e-6);}
}
pass('混沌游戏：100000 点类型、长度、三角形范围、第一层空洞、中点迭代');
for(const n of [5,6]) {
  const vertices=G.regularPolygon(n), data=G.chaosGame(5000,vertices,n===5?0.618:0.667,random);
  assert.equal(vertices.length,n); assert.equal(data.length,10000);
  for(let i=0;i<data.length;i+=2) assert.ok(Math.hypot(data[i],data[i+1])<=0.850001);
}
pass('多边形扩展：五、六边形顶点数与点坐标范围');
const leaves=G.subdivide(G.triangle,4), sampled=G.recursivePoints(leaves,5000,random);
for(let i=0;i<sampled.length;i+=2) {
  const p=[sampled[i],sampled[i+1]];
  assert.ok(leaves.some(t=>barycentric(p,t).every(w=>w>=-1e-5)));
}
pass('递归点云：5000 个点确实处于深度 4 的叶子三角形中');

const globalEvents={}, canvasEvents={};
context.addEventListener=(name,fn)=>{globalEvents[name]=fn;};
const canvas={width:800,height:400,clientWidth:800,clientHeight:400,focus(){},
  classList:{add(){},remove(){}}, addEventListener(name,fn){canvasEvents[name]=fn;},
  getBoundingClientRect(){return {left:0,top:0,width:800,height:400};}};
load('js/interaction.js');
let modeCalls=[],pauseCalls=0,resetCalls=0;
const state={scale:1,offset:[0,0]};
context.FractalInteraction.bindInteraction(canvas,state,{viewChanged(){},setMode(m){modeCalls.push(m);},togglePause(){pauseCalls++;},resetView(){resetCalls++;}});
canvasEvents.mousedown({button:0,clientX:100,clientY:100,preventDefault(){}});
globalEvents.mousemove({buttons:1,clientX:140,clientY:120});
assert.equal(state.offset[0],0.2); assert.equal(state.offset[1],-0.1); globalEvents.mouseup();
const q=context.FractalInteraction.screenToWorld(canvas,500,150);
const anchor=q.map((v,i)=>(v-state.offset[i])/state.scale);
canvasEvents.wheel({clientX:500,clientY:150,deltaY:-120,deltaMode:0,preventDefault(){}});
for(let i=0;i<2;i++) assert.ok(Math.abs((q[i]-state.offset[i])/state.scale-anchor[i])<1e-12);
canvasEvents.wheel({clientX:500,clientY:150,deltaY:-100000,deltaMode:0,preventDefault(){}}); assert.equal(state.scale,20);
canvasEvents.wheel({clientX:500,clientY:150,deltaY:100000,deltaMode:0,preventDefault(){}}); assert.equal(state.scale,0.2);
const keyboard=(key,code,target={matches:()=>false},repeat=false)=>globalEvents.keydown({key,code,target,repeat,preventDefault(){}});
keyboard('1','Digit1');keyboard('2','Digit2');keyboard('3','Digit3');keyboard(' ','Space');keyboard(' ','Space',undefined,true);keyboard('r','KeyR');
assert.deepEqual(modeCalls,['points','lines','solid']); assert.equal(pauseCalls,1); assert.equal(resetCalls,1);
keyboard('1','Digit1',{matches:()=>true}); assert.equal(modeCalls.length,3);
pass('模拟鼠标/键盘：拖动、光标缩放、倍率限制、模式键、空格、防重复与控件焦点');

const calls=[],gl={};
for(const [i,key] of ['ARRAY_BUFFER','STATIC_DRAW','FLOAT','POINTS','LINES','TRIANGLES','COLOR_BUFFER_BIT','ALIASED_POINT_SIZE_RANGE'].entries()) gl[key]=i+1;
for(const method of ['useProgram','bindVertexArray','bindBuffer','vertexAttribPointer','enableVertexAttribArray','viewport','clearColor','clear','uniform1f','uniform2fv','uniform3fv','deleteBuffer','deleteVertexArray','deleteProgram']) gl[method]=(...args)=>calls.push([method,...args]);
gl.createVertexArray=()=>({});gl.createBuffer=()=>({});gl.getAttribLocation=()=>0;gl.getUniformLocation=(_,name)=>name;gl.getParameter=()=>[1,8];
gl.bufferData=(...args)=>calls.push(['bufferData',...args]); gl.drawArrays=(...args)=>calls.push(['drawArrays',...args]);
context.initShaders=()=>({});context.devicePixelRatio=1;canvas.getContext=name=>{assert.equal(name,'webgl2');return gl;};
load('js/renderer.js');const renderer=new context.FractalRenderer(canvas);
const renderState={scale:1,offset:[0,0],pointSize:2,palette:'blue',visibleCount:5000,mode:'points'};
renderer.upload(chaos);renderer.draw(renderState);
assert.equal(calls.find(c=>c[0]==='bufferData')[2],chaos);
assert.deepEqual(calls.filter(c=>c[0]==='drawArrays').at(-1),['drawArrays',gl.POINTS,0,5000]);
renderState.visibleCount=200000;renderer.draw(renderState);
assert.equal(calls.filter(c=>c[0]==='drawArrays').at(-1)[3],100000);
for(const [mode,primitive] of [['lines',gl.LINES],['solid',gl.TRIANGLES]]) {
  const data=G.trianglesToVertices(leaves,mode);renderer.upload(data);renderer.draw({...renderState,mode});
  assert.deepEqual(calls.filter(c=>c[0]==='drawArrays').at(-1),['drawArrays',primitive,0,data.length/2]);
}
assert.equal(calls.filter(c=>c[0]==='bufferData').length,3,'多帧绘制不重复上传');
pass('模拟 WebGL：Float32Array 上传、三种图元、动画绘制数量上限与 VBO 复用');

const html=fs.readFileSync(path.join(base,'index.html'),'utf8'), capture=fs.readFileSync(path.join(base,'截图与打包.html'),'utf8');
for(const page of [html,capture]) for(const match of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if(!match[1].includes('://')) assert.ok(fs.existsSync(path.join(base,match[1])),'缺少文件 '+match[1]);
}
for(const id of ['vertex-shader','fragment-shader']) {
  const pattern=new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)</script>');
  const a=html.match(pattern)[1],b=capture.match(pattern)[1];
  assert.equal(a,b);assert.ok(a.startsWith('#version 300 es'));
}
const packagePaths=JSON.parse(fs.readFileSync(path.join(base,'package-files.json'),'utf8'));
for(const item of packagePaths) assert.ok(fs.statSync(path.join(base,item)).isFile());
pass('页面依赖、打包清单及两页的 GLSL ES 3.00 着色器一致性');

// 将辅助 ZIP 写入临时位置，另由 Python 标准库检查 CRC、UTF-8 名称和内容。
load('js/zip.js');
(async()=>{
  const blob=context.FractalZip.zipFiles([{name:'测试/说明.md',data:new TextEncoder().encode('AP1 ZIP 检查')},{name:'AP1/index.html',data:new TextEncoder().encode(html)}]);
  fs.writeFileSync(path.join(require('node:os').tmpdir(),'ap1-zip-check.zip'),Buffer.from(await blob.arrayBuffer()));
  pass('辅助 ZIP 生成，供标准库复核');
  console.log('共通过 '+groups+' 组检查。真实浏览器/GPU 渲染尚未验证。');
})();
