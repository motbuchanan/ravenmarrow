// Ravenmarrow · village-iso.js · v3.0 · Nov 18 2026
// The village seen the way The Keep's Isometric mode sees its world: an orthographic camera at a fixed slant, every
// building made of lit blocks, a real shadow map from the sun or the blood moon, warm torch light pooling on the ground,
// and fog closing in at the edges. It only draws what it is handed (parts made of boxes), so another game can reuse it.
// Loaded on demand when the Village tab opens. window.VIL: mount, update, unmount, setHour, stats, project.
(function(){
'use strict';
const PITCH = 35 * Math.PI / 180, YAW = 45 * Math.PI / 180;
const MAXL = 16, SHADOW = 1536;

// ---------- small math ----------
function mul(a, b){ const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++){ let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function ortho(l, r, b, t, n, f){ return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]); }
function norm(v){ const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b){ return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function lookAt(e, c, up){ const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(up, z)), y = cross(z, x);
 return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]); }
function inv(a){ const o = new Float32Array(16);
 const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5],
  b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12],
  b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
 let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return o; d = 1 / d;
 o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
 o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
 o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
 o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
 return o; }
function xform(m, p){ const x = p[0], y = p[1], z = p[2], w = m[3] * x + m[7] * y + m[11] * z + m[15];
 return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w]; }
function hash(x, y){ let h = (x * 374761393 + y * 668265263) >>> 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }

// ---------- shaders ----------
const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in float aM; layout(location=3) in float aAO;
uniform mat4 uVP; uniform mat4 uLVP;
out vec3 vW; out vec3 vN; flat out int vM; out float vAO; out vec4 vL;
void main(){ vW = aP; vN = aN; vM = int(aM + .5); vAO = aAO; vL = uLVP * vec4(aP, 1.0); gl_Position = uVP * vec4(aP, 1.0); }`;
const FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; flat in int vM; in float vAO; in vec4 vL;
uniform vec4 uMat[32]; uniform vec3 uAmb; uniform vec3 uSky; uniform vec3 uSunC; uniform vec3 uSunD; uniform vec3 uBg; uniform vec2 uCtr;
uniform int uNL; uniform vec4 uLP[${MAXL}]; uniform float uTime; uniform float uTorch; uniform sampler2DShadow uSh; uniform float uFlick;
out vec4 o;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float shade(){ vec3 p = vL.xyz / vL.w * .5 + .5; if (p.x < 0. || p.y < 0. || p.x > 1. || p.y > 1.) return 1.;
 float b = .0018, s = 0.; vec2 t = vec2(1.0 / ${SHADOW}.0);
 for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += texture(uSh, vec3(p.xy + vec2(i, j) * t, p.z - b));
 return s / 9.; }
void main(){
 vec4 m = uMat[vM]; vec3 base = m.rgb;
 // a little per-block grain so big faces are not flat
 base *= .92 + .16 * hash(floor(vW.xy * 8.0) + floor(vW.z * 8.0));
 vec3 n = normalize(vN);
 float ndl = max(dot(n, uSunD), 0.0), sh = ndl > 0. ? shade() : 0.;
 vec3 lit = uAmb * (.62 + .38 * n.z) + uSky * max(n.z, 0.) * .25 + uSunC * ndl * sh;
 vec3 warm = vec3(0.);
 for (int i = 0; i < ${MAXL}; i++){ if (i >= uNL) break; vec3 d = uLP[i].xyz - vW; float dist = length(d); float q = dist / uLP[i].w;
  if (q < 1.){ float k = (1. - q); k *= k; float f = 1. + uFlick * (.12 * sin(uTime * 9. + float(i) * 3.1) + .08 * sin(uTime * 23. + float(i)));
   warm += vec3(1.0, .62, .3) * k * f * (.35 + .65 * max(dot(n, d / max(dist, .001)), 0.)) * uTorch; } }
 vec3 c = base * (lit * vAO + warm) + base * m.a * 1.15;
 // fog: the forest edge sinks into the dark
 float r = length(vW.xy - uCtr); float f = smoothstep(13.0, 24.0, r);
 c = mix(c, uBg, f);
 o = vec4(pow(c, vec3(.94)), 1.0);
}`;
const VS_D = `#version 300 es
layout(location=0) in vec3 aP; uniform mat4 uLVP; void main(){ gl_Position = uLVP * vec4(aP, 1.0); }`;
const FS_D = `#version 300 es
precision mediump float; out vec4 o; void main(){ o = vec4(1.0); }`;

// ---------- state ----------
let canvas = null, gl = null, host = null, labelLayer = null, P = null, PD = null, shTex = null, shFb = null;
let geo = null, dyn = null, lastScene = null, lost = false;
const cam = {tx:14, ty:14, zoom:9.5, minZ:4.5, maxZ:22, fitted:false};
const st = {dirty:true, raf:0, last:0, t0:performance.now(), frames:0, fpsT:0, fps:0, verts:0, hour:null, mounted:false, onTap:null, reduce:false, labels:[], parts:[], lights:[], smokeSrc:[], puffs:[], cost:8, visible:true};

function compile(type, src){ const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
function program(vs, fs, names){ const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
 if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); const u = {}; names.forEach(n => u[n] = gl.getUniformLocation(p, n)); return {p, u}; }

function initGL(){
 gl = canvas.getContext('webgl2', {antialias:true, alpha:false, preserveDrawingBuffer:false, powerPreference:'default'});
 if (!gl) return false;
 P = program(VS, FS, ['uVP', 'uLVP', 'uMat', 'uAmb', 'uSky', 'uSunC', 'uSunD', 'uBg', 'uCtr', 'uNL', 'uLP', 'uTime', 'uTorch', 'uSh', 'uFlick']);
 PD = program(VS_D, FS_D, ['uLVP']);
 shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shTex);
 gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW, SHADOW);
 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
 shFb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shTex, 0);
 gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
 geo = null; dyn = null;
 return true;
}

// ---------- geometry: boxes to faces ----------
// faces: top, +x, -x, +y, -y (no bottoms, nothing sits under the ground)
const FACES = [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
function pushBox(V, I, b, ox, oy){
 const x0 = b[0] + ox, y0 = b[1] + oy, z0 = b[2], x1 = x0 + b[3], y1 = y0 + b[4], z1 = z0 + b[5], m = b[6];
 const low = z0 < .2 ? .62 : .82; // contact shading where a block meets the ground
 const quads = [
  [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
  [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
  [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]],
  [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]],
  [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]];
 for (let f = 0; f < 5; f++){ const q = quads[f], n = FACES[f], base = V.length / 8;
  for (let k = 0; k < 4; k++){ const p = q[k], ao = f === 0 ? 1 : (p[2] === z0 ? low : 1); V.push(p[0], p[1], p[2], n[0], n[1], n[2], m, ao); }
  I.push(base, base + 1, base + 2, base, base + 2, base + 3); }
}
function upload(target, V, I){
 if (!target){ target = {vao:gl.createVertexArray(), vb:gl.createBuffer(), ib:gl.createBuffer(), n:0}; }
 gl.bindVertexArray(target.vao);
 gl.bindBuffer(gl.ARRAY_BUFFER, target.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(V), gl.DYNAMIC_DRAW);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, target.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.DYNAMIC_DRAW);
 const S = 32; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
 gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
 gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 24);
 gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 28);
 gl.bindVertexArray(null); target.n = I.length; return target;
}

// the ground, paths and the forest ring around the grid; scene.ground: {w, h, path:Set('x,y'), clear:Set('x,y'), seed}
function groundBoxes(sc){
 const B = [], w = sc.w, h = sc.h, path = sc.path || new Set(), clear = sc.clear || new Set(), busy = sc.busy || new Set();
 B.push([-26, -26, -.06, w + 52, h + 52, .04, 15]);
 for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
  const k = x + ',' + y, r = hash(x + 7, y + 3);
  const m = path.has(k) ? 3 : (r < .18 ? 1 : r > .9 ? 2 : 0);
  B.push([x, y, -.02, 1, 1, .04 + (path.has(k) ? 0 : r * .02), m]);
  if (!path.has(k) && !busy.has(k) && !clear.has(k) && r > .975) B.push([x + .3, y + .4, 0, .25, .2, .12, 7]); // a stray stone
 }
 // pines outside the walls and beyond the grid
 const tree = (x, y, s) => { B.push([x - .07 * s, y - .07 * s, 0, .14 * s, .14 * s, .45 * s, 23]);
  for (let i = 0; i < 4; i++){ const r = (.62 - i * .14) * s; B.push([x - r, y - r, (.35 + i * .32) * s, r * 2, r * 2, .3 * s, i % 2 ? 15 : 14]); } };
 for (let y = -9; y < h + 9; y++) for (let x = -9; x < w + 9; x++){
  const inGrid = x >= 0 && y >= 0 && x < w && y < h, k = x + ',' + y;
  if (inGrid && (path.has(k) || clear.has(k) || busy.has(k))) continue;
  const ring = sc.ring, inside = ring && x >= ring[0] - 1 && y >= ring[1] - 1 && x <= ring[2] + 1 && y <= ring[3] + 1;
  if (inside) continue;
  const r = hash(x * 3 + 11, y * 5 + 2), d = Math.max(0, Math.hypot(x - w / 2, y - h / 2) - 11);
  if (Math.hypot(x - w / 2, y - h / 2) > 24) continue;
  if (r < Math.min(.5, .14 + d * .05)) tree(x + .5 + (hash(x, y) - .5) * .5, y + .5 + (hash(y, x) - .5) * .5, .8 + hash(x + 1, y + 9) * .7);
 }
 return B;
}

function build(sc){
 const V = [], I = [];
 groundBoxes(sc).forEach(b => pushBox(V, I, b, 0, 0));
 st.lights = []; st.smokeSrc = []; st.labels.forEach(l => l.el.remove()); st.labels = []; st.parts = [];
 (sc.parts || []).forEach(p => {
  p.boxes.forEach(b => pushBox(V, I, b, p.x, p.y));
  (p.lights || []).forEach(L => st.lights.push([L[0] + p.x, L[1] + p.y, L[2], L[3]]));
  (p.smoke || []).forEach(s => st.smokeSrc.push([s[0] + p.x, s[1] + p.y, s[2]]));
  if (p.tap) st.parts.push({id:p.id, x0:p.x, y0:p.y, x1:p.x + p.fw, y1:p.y + p.fh, top:p.top || 1});
  if (p.label){ const el = document.createElement('div'); el.className = 'vlab' + (p.labelCls ? ' ' + p.labelCls : ''); el.innerHTML = p.label; el.dataset.b = p.id; labelLayer.appendChild(el);
   st.labels.push({el, x:p.x + p.fw / 2, y:p.y + p.fh / 2, z:(p.top || 1) + .2}); }
 });
 geo = upload(geo, V, I); st.verts = V.length / 8; st.dirty = true;
}

// ---------- time of day: the sun by day, a blood moon by night ----------
function sky(){
 const d = new Date(), h = st.hour != null ? st.hour : d.getHours() + d.getMinutes() / 60;
 // day weight: 0 at night, 1 at midday, soft at dawn and dusk
 const day = Math.max(0, Math.min(1, Math.min((h - 5.5) / 2, (19.5 - h) / 2)));
 const t = (h - 6) / 12 * Math.PI, sunD = norm([-Math.cos(t) * .8 - .2, .55, Math.max(.35, Math.sin(t)) * 1.2]);
 const moonD = norm([-.55, .35, .9]);
 const L = (a, b) => a.map((v, i) => v + (b[i] - v) * day);
 return {day, dir:norm(L(moonD, sunD)), sunC:L([.52, .2, .24], [1.0, .86, .7]), amb:L([.17, .16, .26], [.42, .41, .46]), sky:L([.12, .05, .08], [.34, .36, .44]),
  bg:L([.035, .02, .03], [.12, .1, .09]), torch:1.25 - .75 * day};
}

// ---------- camera ----------
function camMats(){
 const asp = canvas.width / canvas.height, hh = cam.zoom, hw = hh * asp;
 const dir = [Math.cos(PITCH) * Math.sin(YAW), Math.cos(PITCH) * Math.cos(YAW), Math.sin(PITCH)], c = [cam.tx, cam.ty, 0];
 const eye = [c[0] + dir[0] * 60, c[1] + dir[1] * 60, dir[2] * 60];
 const V = lookAt(eye, c, [0, 0, 1]), Pm = ortho(-hw, hw, -hh, hh, 1, 140);
 return {VP:mul(Pm, V), dir, eye};
}
function lightMat(dir){
 const c = [14, 14, 0], e = [c[0] + dir[0] * 50, c[1] + dir[1] * 50, c[2] + dir[2] * 50];
 return mul(ortho(-24, 24, -24, 24, 1, 120), lookAt(e, c, Math.abs(dir[2]) > .98 ? [0, 1, 0] : [0, 0, 1]));
}
function project(wx, wy, wz){ const m = camMats(), p = xform(m.VP, [wx, wy, wz]), r = canvas.getBoundingClientRect();
 return [(p[0] * .5 + .5) * r.width, (1 - (p[1] * .5 + .5)) * r.height]; }
function placeLabels(){ if (!st.labels.length) return; const m = camMats(), r = canvas.getBoundingClientRect();
 st.labels.forEach(l => { const p = xform(m.VP, [l.x, l.y, l.z]); l.el.style.transform = `translate(${((p[0] * .5 + .5) * r.width).toFixed(1)}px, ${((1 - (p[1] * .5 + .5)) * r.height).toFixed(1)}px)`; }); }
// the whole walled village fits the width: half of the ring's diagonal, a little margin
function fit(){ const r = canvas.getBoundingClientRect(), asp = (r.width || 1) / (r.height || 1); cam.tx = 14; cam.ty = 14; cam.zoom = 15 / Math.max(.4, asp); cam.maxZ = Math.max(cam.zoom, 12); clampCam(); st.dirty = true; }
function clampCam(){ cam.zoom = Math.max(cam.minZ, Math.min(cam.maxZ, cam.zoom)); cam.tx = Math.max(4, Math.min(24, cam.tx)); cam.ty = Math.max(4, Math.min(25, cam.ty)); }

// a tap: the nearest tappable footprint box the ray passes through
function pick(px, py){
 const r = canvas.getBoundingClientRect(), m = camMats(), iv = inv(m.VP);
 const nx = (px / r.width) * 2 - 1, ny = 1 - (py / r.height) * 2;
 const a = xform(iv, [nx, ny, -1]), b = xform(iv, [nx, ny, 1]), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
 let best = null, bt = Infinity;
 for (const p of st.parts){
  let t0 = 0, t1 = 1, ok = true; const lo = [p.x0, p.y0, 0], hi = [p.x1, p.y1, p.top];
  for (let k = 0; k < 3 && ok; k++){ if (Math.abs(d[k]) < 1e-9){ if (a[k] < lo[k] || a[k] > hi[k]) ok = false; continue; }
   let u = (lo[k] - a[k]) / d[k], v = (hi[k] - a[k]) / d[k]; if (u > v){ const s = u; u = v; v = s; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) ok = false; }
  if (ok && t0 < bt){ bt = t0; best = p; }
 }
 return best ? best.id : null;
}

// ---------- smoke: a few grey blocks drifting up from chimneys ----------
function stepSmoke(dt){
 if (st.reduce) { st.puffs.length = 0; return; }
 st.smokeSrc.forEach((s, i) => { s.acc = (s.acc || hash(i, 3)) + dt; if (s.acc > .7){ s.acc = 0; if (st.puffs.length < 70) st.puffs.push({x:s[0], y:s[1], z:s[2], age:0, sz:.16 + Math.random() * .08}); } });
 st.puffs.forEach(p => { p.age += dt; p.z += dt * .35; p.x -= dt * .12; p.y += dt * .05; });
 st.puffs = st.puffs.filter(p => p.age < 3.2);
}
function smokeGeo(){
 const V = [], I = [];
 st.puffs.forEach(p => { const s = p.sz * (1 + p.age * .5); pushBox(V, I, [p.x - s / 2, p.y - s / 2, p.z, s, s, s, 24], 0, 0); });
 dyn = upload(dyn, V, I);
}

// ---------- draw ----------
function draw(now){
 if (!gl || lost || !geo) return;
 const S = sky(), m = camMats(), LVP = lightMat(S.dir);
 // shadow pass
 gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.viewport(0, 0, SHADOW, SHADOW); gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
 gl.useProgram(PD.p); gl.uniformMatrix4fv(PD.u.uLVP, false, LVP);
 gl.bindVertexArray(geo.vao); gl.drawElements(gl.TRIANGLES, geo.n, gl.UNSIGNED_INT, 0);
 gl.bindFramebuffer(gl.FRAMEBUFFER, null);
 // main pass
 gl.viewport(0, 0, canvas.width, canvas.height);
 gl.clearColor(S.bg[0], S.bg[1], S.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 gl.useProgram(P.p); const u = P.u;
 gl.uniformMatrix4fv(u.uVP, false, m.VP); gl.uniformMatrix4fv(u.uLVP, false, LVP);
 gl.uniform4fv(u.uMat, st.mats); gl.uniform3fv(u.uAmb, S.amb); gl.uniform3fv(u.uSky, S.sky); gl.uniform3fv(u.uSunC, S.sunC); gl.uniform3fv(u.uSunD, S.dir);
 gl.uniform3fv(u.uBg, S.bg); gl.uniform2f(u.uCtr, 14, 14); gl.uniform1f(u.uTime, (now - st.t0) / 1000); gl.uniform1f(u.uTorch, S.torch); gl.uniform1f(u.uFlick, st.reduce ? 0 : 1);
 // the lights nearest the camera's focus
 const Ls = st.lights.slice().sort((a, b) => Math.hypot(a[0] - cam.tx, a[1] - cam.ty) - Math.hypot(b[0] - cam.tx, b[1] - cam.ty)).slice(0, MAXL), lp = new Float32Array(MAXL * 4);
 Ls.forEach((L, i) => lp.set(L, i * 4)); gl.uniform1i(u.uNL, Ls.length); gl.uniform4fv(u.uLP, lp);
 gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shTex); gl.uniform1i(u.uSh, 0);
 gl.bindVertexArray(geo.vao); gl.drawElements(gl.TRIANGLES, geo.n, gl.UNSIGNED_INT, 0);
 if (st.puffs.length){ smokeGeo(); gl.bindVertexArray(dyn.vao); gl.drawElements(gl.TRIANGLES, dyn.n, gl.UNSIGNED_INT, 0); }
 gl.bindVertexArray(null);
 if (host) host.style.background = `rgb(${S.bg.map(v => Math.round(v * 255)).join(',')})`;
}
function loop(now){
 if (!st.mounted) return;
 if (!canvas.isConnected){ st.mounted = false; return; }
 st.raf = requestAnimationFrame(loop);
 // nothing to draw when the app is in the background, the tab is hidden, or the village is scrolled out of sight
 if (document.hidden || !canvas.offsetWidth || !st.visible) return;
 // idle animation (torch flicker, smoke) runs at about 24 fps, slower if frames are expensive on this phone
 const dt = Math.min(.1, (now - (st.last || now)) / 1000), animate = !st.reduce, idleGap = Math.max(42, st.cost * 4), due = st.dirty || (animate && now - st.last >= idleGap);
 if (!due) return;
 stepSmoke(dt); st.last = now;
 if (st.dirty) placeLabels();
 st.dirty = false; const t0 = performance.now(); draw(now); st.cost = st.cost * .8 + (performance.now() - t0) * .2;
 st.frames++; if (now - st.fpsT > 1000){ st.fps = Math.round(st.frames * 1000 / (now - st.fpsT)); st.frames = 0; st.fpsT = now; }
}

// ---------- input: drag pans, pinch and wheel zoom, a short still touch taps ----------
const ptr = new Map(); let pinch0 = 0, zoom0 = 0, downAt = 0, moved = 0, downXY = null;
function onDown(e){ canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
 if (ptr.size === 1){ downAt = performance.now(); moved = 0; downXY = [e.clientX, e.clientY]; const r = canvas.getBoundingClientRect(); window.VIL.lastPick = pick(e.clientX - r.left, e.clientY - r.top); }
 if (ptr.size === 2){ const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = cam.zoom; } }
function onMove(e){ if (!ptr.has(e.pointerId)) return; const prev = ptr.get(e.pointerId), cur = [e.clientX, e.clientY]; ptr.set(e.pointerId, cur);
 if (ptr.size === 1){ const dx = cur[0] - prev[0], dy = cur[1] - prev[1]; moved += Math.abs(dx) + Math.abs(dy);
  const r = canvas.getBoundingClientRect(), k = 2 * cam.zoom / r.height;
  // screen right is world (cos, -sin) of the yaw; screen up is the ground forward, stretched by the slant
  const rx = Math.cos(YAW), ry = -Math.sin(YAW), fx = -Math.sin(YAW), fy = -Math.cos(YAW), s = 1 / Math.sin(PITCH);
  cam.tx -= (dx * rx - dy * fx * s) * k; cam.ty -= (dx * ry - dy * fy * s) * k; clampCam(); st.dirty = true; }
 else if (ptr.size === 2){ const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) { cam.zoom = zoom0 * pinch0 / d; clampCam(); st.dirty = true; moved = 99; } } }
function onUp(e){ const was = ptr.size; ptr.delete(e.pointerId); if (ptr.size < 2) pinch0 = 0;
 if (was === 1 && moved < 10 && performance.now() - downAt < 600 && st.onTap){ const r = canvas.getBoundingClientRect(), id = pick(e.clientX - r.left, e.clientY - r.top); if (id) st.onTap(id); } }
function onWheel(e){ e.preventDefault(); cam.zoom *= Math.exp(e.deltaY * .0012); clampCam(); st.dirty = true; }
function resize(){ if (!canvas || !host) return; const r = host.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
 const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr)); if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; } st.dirty = true; }

// ---------- public ----------
function mount(el, opts){
 opts = opts || {};
 if (!canvas){
  canvas = document.createElement('canvas'); canvas.className = 'vilcv';
  labelLayer = document.createElement('div'); labelLayer.className = 'vlabs';
  try { if (!initGL()) { canvas = null; return false; } } catch (err){ console.warn('village renderer', err); canvas = null; gl = null; return false; }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { try { initGL(); lost = false; if (lastScene) build(lastScene); st.dirty = true; } catch (err){ console.warn(err); } });
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, {passive:false});
  window.addEventListener('resize', resize);
  if (window.IntersectionObserver){ new IntersectionObserver(es => { st.visible = es[es.length - 1].isIntersecting; if (st.visible) st.dirty = true; }).observe(canvas); }
 }
 if (lost) return false;
 host = el; host.appendChild(canvas); host.appendChild(labelLayer);
 st.onTap = opts.onTap || null; st.reduce = !!opts.reduce;
 st.mats = new Float32Array(32 * 4); (opts.mats || []).forEach((m, i) => { if (i < 32) st.mats.set([m[0] / 255, m[1] / 255, m[2] / 255, m[3] || 0], i * 4); });
 st.mounted = true; resize(); if (!cam.fitted){ fit(); cam.fitted = true; } cancelAnimationFrame(st.raf); st.last = 0; st.raf = requestAnimationFrame(loop);
 return true;
}
function update(scene){ lastScene = scene; if (!gl || lost) return; build(scene); }
function unmount(){ st.mounted = false; cancelAnimationFrame(st.raf); if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); if (labelLayer && labelLayer.parentNode) labelLayer.parentNode.removeChild(labelLayer); host = null; }
window.VIL = {mount, update, unmount, project,
 setHour(h){ st.hour = h; st.dirty = true; },
 stats(){ return {fps:st.fps, verts:st.verts, lights:st.lights.length, lost, zoom:cam.zoom}; },
 view(v){ if (v){ Object.assign(cam, v); clampCam(); st.dirty = true; } return {tx:cam.tx, ty:cam.ty, zoom:cam.zoom}; },
 pick(px, py){ return pick(px, py); },
 fit(){ fit(); return {tx:cam.tx, ty:cam.ty, zoom:cam.zoom}; },
 loseContext(){ const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext){ ext.loseContext(); setTimeout(() => ext.restoreContext(), 300); return true; } return false; }};
})();
