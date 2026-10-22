(function(){
// "See in 3D" act of the method figure: the RGB-D frame the agent observed at the start of run 1,
// lifted into the robot's frame, and the model it fitted to it, stage by stage as its scripts did.
// how.js drives it: RAX.perceive.show(on) and RAX.perceive.set(k) with k the act's progress in [0, 1].
const THREE=window.THREE;

const root = document.getElementById('howRoot');
const media = root && root.querySelector('.pl-media');
window.RAX = window.RAX || {};
const COL = { body: 0x2a78d6, handle: 0xa07cff, act: 0xe34948, cand: 0xe8edf0, d: 0xa07cff };
const BG = new THREE.Color(0x0d0f12);

const sm = (a, b, k) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
const lerp = (a, b, x) => a + (b - a) * x;

// What the agent was doing at each stretch of the act, as the caption chip shows it.
const STAGES = [
  [0.00, 'franka_observe()', 'left camera: rgb + depth'],
  [0.08, 'geom.backproject()', 'every depth pixel to a point in the robot frame'],
  [0.30, 'a1.py', 'the right camera, fused in the same frame'],
  [0.40, 'a1.py', 'height above the table'],
  [0.52, 'a2.py', 'dark points are the handle; a circle fit per slice gives the axis'],
  [0.655, 'a3.py, a13.py', 'pull direction and the handle’s profile'],
  [0.80, 'a22.py', '308 candidate grasps, each through IK and a clearance check'],
  [0.92, 'a23.py', 'approach, grasp and 15 cm pull, checked against the model']
];

function turbo(x) {
  // polynomial fit of the turbo colormap
  x = Math.min(1, Math.max(0, x));
  const r = 0.13572138 + x * (4.6153926 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))));
  const g = 0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))));
  const b = 0.1066733 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))));
  return [Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b))];
}

function decode(cloud) {
  const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const q = new Int16Array(bytes(cloud.pos).buffer), rgb = bytes(cloud.rgb), dark = bytes(cloud.dark);
  const n = cloud.n, P = new Float32Array(n * 3), C = new Float32Array(n * 3), F = new Float32Array(n * 3);
  const T = cloud.T, o = [T[0][3], T[1][3], T[2][3]], f = [T[0][2], T[1][2], T[2][2]];
  for (let i = 0; i < n; i++) {
    let zc = 0;
    for (let j = 0; j < 3; j++) { P[3 * i + j] = q[3 * i + j] / 10000; C[3 * i + j] = rgb[3 * i + j] / 255; zc += (P[3 * i + j] - o[j]) * f[j]; }
    // the same pixel on a flat plane 0.62 m in front of the camera: the photo before depth is used
    for (let j = 0; j < 3; j++) F[3 * i + j] = o[j] + (P[3 * i + j] - o[j]) * (0.62 / zc);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(F), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
  return { g, P, C, F, dark, n };
}

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const fade = (obj, a) => {
  obj.visible = a > 0.01;
  obj.traverse((m) => { if (m.material) { m.material.transparent = true; m.material.opacity = a * (m.userData.alpha ?? 1); } });
};
function mat(color, alpha = 1, kind = 'basic') {
  const m = kind === 'line' ? new THREE.LineBasicMaterial({ color }) : new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false });
  return m;
}
function line(pts, color, alpha = 1) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat(color, 1, 'line'));
  l.userData.alpha = alpha;
  return l;
}
function ring(cx, cy, r, z, color) {
  const pts = [];
  for (let k = 0; k <= 96; k++) { const a = (k / 96) * Math.PI * 2; pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), z)); }
  return line(pts, color);
}
function rod(a, b, radius, color, alpha = 1) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10, 1), mat(color));
  m.userData.alpha = alpha;
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
function arrow(a, b, color, r = 0.0018) {
  const g = new THREE.Group(), dir = new THREE.Vector3().subVectors(b, a).normalize();
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 16), mat(color));
  tip.position.copy(b);
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.add(rod(a, b.clone().addScaledVector(dir, -0.011), r, color), tip);
  return g;
}
// A hand pose as in fryer3d.js: base square at the tool point facing the approach axis, apex toward the hand.
function pyramid(pose, color) {
  const g = new THREE.Group(), p = V(pose.p), R = pose.R;
  const col = (j) => new THREE.Vector3(R[0][j], R[1][j], R[2][j]);
  const X = col(0), Y = col(1), Z = col(2);
  const at = (x, y, z) => p.clone().addScaledVector(X, x).addScaledVector(Y, y).addScaledVector(Z, z);
  const h = 0.02, L = 0.05, apex = at(0, 0, -L), b = [at(h, h, 0), at(-h, h, 0), at(-h, -h, 0), at(h, -h, 0)];
  const v = [];
  for (let k = 0; k < 4; k++) v.push(apex, b[k], b[(k + 1) % 4]);
  v.push(b[0], b[1], b[2], b[0], b[2], b[3]);
  const face = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(v), mat(color));
  face.userData.alpha = 0.4;
  const e = [];
  for (let k = 0; k < 4; k++) e.push(apex, b[k], b[k], b[(k + 1) % 4]);
  g.add(face, new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(e), mat(color, 1, 'line')));
  return g;
}

async function init() {
  let data;
  data = window.RAX_PERCEIVE_DATA; if (!data) return;

  const holder = document.createElement('div');
  holder.className = 'p3';
  holder.innerHTML = '<div class="p3-chip"><b></b><span></span></div>';
  media.insertBefore(holder, media.querySelector('.pl-tag'));
  const chipB = holder.querySelector('b'), chipS = holder.querySelector('span');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  holder.prepend(renderer.domElement);
  const scene = new THREE.Scene();

  const L = data.left, R = data.right, M = data.model, PL = data.plan;
  const vfov = 2 * Math.atan(L.size[1] / 2 / L.K[1][1]) * 180 / Math.PI;
  const camera = new THREE.PerspectiveCamera(vfov, 16 / 9, 0.01, 10);

  const left = decode(L), right = decode(R);
  const pm = new THREE.PointsMaterial({ size: 0.0042, vertexColors: true, sizeAttenuation: true });
  const ptsL = new THREE.Points(left.g, pm), ptsR = new THREE.Points(right.g, pm.clone());
  scene.add(ptsL, ptsR);

  // the agent's model, in the robot base frame
  const c = M.c, d = new THREE.Vector3(M.d[0], M.d[1], 0), t = new THREE.Vector3(M.t[0], M.t[1], 0);
  const onAxis = (s, z) => new THREE.Vector3(c[0], c[1], z).addScaledVector(d, s);
  const rings = M.bands.map((b) => {
    const g = new THREE.Group(), zm = (b[0] + b[1]) / 2;
    g.add(ring(b[2], b[3], b[4], zm, COL.body));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(b[4], b[4], b[1] - b[0], 64, 1, true), mat(COL.body));
    sh.userData.alpha = 0.12; sh.rotation.x = Math.PI / 2; sh.position.set(b[2], b[3], zm);
    g.add(sh);
    scene.add(g);
    return g;
  });
  const axis = rod(new THREE.Vector3(c[0], c[1], M.table_z), new THREE.Vector3(c[0], c[1], 0.47), 0.0016, COL.body);
  scene.add(axis);
  const pull = arrow(onAxis(0.0, 0.2), onAxis(0.27, 0.2), COL.d);
  scene.add(pull);
  const prof = new THREE.Group();
  [-0.017, 0.017].forEach((w) => {
    const pts = M.profile.map((p) => onAxis(p[0], p[1]).addScaledVector(t, w));
    pts.push(pts[0].clone());
    prof.add(line(pts, COL.handle));
  });
  M.profile.forEach((p) => prof.add(line([onAxis(p[0], p[1]).addScaledVector(t, -0.017), onAxis(p[0], p[1]).addScaledVector(t, 0.017)], COL.handle, 0.7)));
  [M.grip, M.arm].forEach((b) => {
    const geo = new THREE.BoxGeometry(b[0][1] - b[0][0], b[1][1] - b[1][0], b[2][1] - b[2][0]);
    const box = new THREE.Mesh(geo, mat(COL.handle)); box.userData.alpha = 0.18;
    const g = new THREE.Group(); g.add(box);
    const basis = new THREE.Matrix4().makeBasis(d, t, new THREE.Vector3(0, 0, 1));
    basis.setPosition(onAxis((b[0][0] + b[0][1]) / 2, (b[2][0] + b[2][1]) / 2).addScaledVector(t, (b[1][0] + b[1][1]) / 2));
    g.applyMatrix4(basis);
    prof.add(g);
  });
  scene.add(prof);
  const cands = PL.cands.map((p) => { const g = pyramid(p, COL.cand); scene.add(g); return g; });
  const chosen = pyramid(PL.grasp, COL.act);
  const path = new THREE.Group();
  path.add(rod(V(PL.pre), V(PL.grasp.p), 0.0014, COL.act, 0.8), arrow(V(PL.grasp.p), V(PL.pull), COL.act, 0.0016));
  const preDot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 14, 10), mat(COL.act));
  preDot.position.copy(V(PL.pre)); path.add(preDot);
  scene.add(chosen, path);

  const pins = [];
  const pin = (text, color, at, show) => {
    const e = document.createElement('span');
    e.className = 'p3-lbl'; e.textContent = text; e.style.background = '#' + color.toString(16).padStart(6, '0');
    holder.appendChild(e);
    pins.push({ e, at, show });
  };
  pin('axis c', COL.body, new THREE.Vector3(c[0], c[1], 0.49), (k) => sm(0.6, 0.63, k));
  pin('r 0.116 → 0.090 m', COL.body, new THREE.Vector3(c[0], c[1], 0.17).addScaledVector(t, -0.15), (k) => sm(0.55, 0.58, k) * (1 - sm(0.64, 0.66, k)));
  pin('handle', 0x7b3fd1, onAxis(0.2, 0.15), (k) => sm(0.54, 0.57, k) * (1 - sm(0.65, 0.67, k)));
  pin('pull d', 0x7b3fd1, onAxis(0.3, 0.2), (k) => sm(0.655, 0.685, k) * (1 - sm(0.9, 0.92, k)));
  pin('Γ profile', 0x7b3fd1, onAxis(0.15, 0.31), (k) => sm(0.71, 0.74, k) * (1 - sm(0.8, 0.82, k)));
  pin('grasp, 12.4 mm clear', COL.act, V(PL.grasp.p).add(new THREE.Vector3(0, 0, 0.075)), (k) => sm(0.9, 0.93, k));
  pin('15 cm pull', COL.act, V(PL.pull).add(new THREE.Vector3(0, 0, -0.035)), (k) => sm(0.95, 0.98, k));

  // camera: from the left camera's own pose, out to a view of the fryer, then a slow orbit around it
  const T = L.T, camO = new THREE.Vector3(T[0][3], T[1][3], T[2][3]);
  const camF = new THREE.Vector3(T[0][2], T[1][2], T[2][2]), camU = new THREE.Vector3(-T[0][1], -T[1][1], -T[2][1]);
  const target = new THREE.Vector3(c[0], c[1], 0.23).addScaledVector(d, 0.1);
  const rel = new THREE.Vector3().subVectors(camO, target);
  const az0 = Math.atan2(rel.y, rel.x), r0 = Math.hypot(rel.x, rel.y), h0 = rel.z;
  const look = new THREE.Vector3(), pos = new THREE.Vector3(), up = new THREE.Vector3();
  function placeCamera(k) {
    const out = sm(0.08, 0.3, k);
    // swing a little toward the handle's side; the cameras saw only this side of the fryer
    const az = az0 - 0.3 * out - 0.2 * sm(0.3, 1, k) + 0.1 * sm(0.8, 1, k);
    const r = lerp(r0, 0.7, out) * lerp(1, 0.9, sm(0.5, 0.66, k)) * lerp(1, 0.92, sm(0.8, 0.95, k));
    const h = lerp(h0, 0.36, out) - 0.08 * sm(0.66, 0.8, k);
    pos.set(target.x + r * Math.cos(az), target.y + r * Math.sin(az), target.z + h);
    // blend the aim from straight ahead of the camera to the fryer
    look.copy(camO).addScaledVector(camF, rel.length()).lerp(target, out);
    up.copy(camU).lerp(new THREE.Vector3(0, 0, 1), out).normalize();
    camera.position.lerpVectors(camO, pos, out);
    camera.up.copy(up);
    camera.lookAt(look);
    // narrow the lens as it leaves the camera, so the fryer fills the view
    const fov = lerp(vfov, 46, out) * lerp(1, 0.92, sm(0.5, 0.66, k));
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  const box = (x, y, z) => x > 0.3 && x < 0.8 && y > -0.42 && y < 0.12 && z > 0.06 && z < 0.5;
  const tmp = [0, 0, 0];
  function paint(cloud, k, lift, from) {
    const pa = cloud.g.attributes.position.array, ca = cloud.g.attributes.color.array;
    const hgt = sm(0.4, 0.46, k) * (1 - sm(0.52, 0.58, k)), gray = sm(0.52, 0.58, k), hl = sm(0.53, 0.57, k);
    const dim = sm(0.3, 0.4, k) * 0.9;
    for (let i = 0; i < cloud.n; i++) {
      const i3 = 3 * i;
      for (let j = 0; j < 3; j++) pa[i3 + j] = lerp(cloud.F[i3 + j], cloud.P[i3 + j], lift);
      const x = cloud.P[i3], y = cloud.P[i3 + 1], z = cloud.P[i3 + 2];
      let r = cloud.C[i3], g = cloud.C[i3 + 1], b = cloud.C[i3 + 2];
      if (hgt > 0) { const tc = turbo((z - 0.09) / 0.36); r = lerp(r, tc[0], hgt); g = lerp(g, tc[1], hgt); b = lerp(b, tc[2], hgt); }
      if (gray > 0) { const l = 0.3 * r + 0.59 * g + 0.11 * b; const v = 0.2 + 0.5 * l; r = lerp(r, v, gray); g = lerp(g, v, gray); b = lerp(b, v * 1.05, gray); }
      if (hl > 0 && cloud.dark[i]) { r = lerp(r, 0.63, hl); g = lerp(g, 0.49, hl); b = lerp(b, 1.0, hl); }
      if (dim > 0 && !box(x, y, z)) { r = lerp(r, BG.r, dim); g = lerp(g, BG.g, dim); b = lerp(b, BG.b, dim); }
      ca[i3] = r; ca[i3 + 1] = g; ca[i3 + 2] = b;
    }
    cloud.g.attributes.position.needsUpdate = true;
    cloud.g.attributes.color.needsUpdate = true;
  }

  let shown = false, K = 0, drawnK = -1;
  function draw() {
    if (!shown) return;
    const k = K;
    if (Math.abs(k - drawnK) < 1e-4) return;
    drawnK = k;
    paint(left, k, sm(0.08, 0.3, k));
    ptsR.visible = k > 0.3;
    if (ptsR.visible) { paint(right, k, sm(0.3, 0.4, k)); ptsR.material.opacity = sm(0.3, 0.34, k); ptsR.material.transparent = true; ptsR.material.size = pm.size; }
    pm.size = lerp(0.0072, 0.0042, sm(0.08, 0.3, k));
    rings.forEach((g, i) => fade(g, sm(0.55 + i * 0.018, 0.57 + i * 0.018, k) * (1 - 0.6 * sm(0.8, 0.84, k))));
    fade(axis, sm(0.61, 0.64, k));
    fade(pull, sm(0.655, 0.685, k) * (1 - sm(0.9, 0.92, k)));
    fade(prof, sm(0.71, 0.75, k) * (1 - 0.4 * sm(0.92, 0.95, k)));
    cands.forEach((g, i) => fade(g, sm(0.8 + i * 0.006, 0.81 + i * 0.006, k) * (1 - 0.85 * sm(0.9, 0.92, k))));
    fade(chosen, sm(0.9, 0.92, k));
    fade(path, sm(0.92, 0.96, k));
    placeCamera(k);
    renderer.render(scene, camera);
    const w = holder.clientWidth, h = holder.clientHeight, v = new THREE.Vector3();
    pins.forEach((p) => {
      const a = p.show(k);
      v.copy(p.at).project(camera);
      p.e.style.opacity = a;
      p.e.style.display = a < 0.01 || v.z > 1 ? 'none' : '';
      p.e.style.left = ((v.x + 1) / 2) * w + 'px';
      p.e.style.top = ((1 - v.y) / 2) * h + 'px';
    });
    let s = STAGES[0];
    STAGES.forEach((x) => { if (k >= x[0]) s = x; });
    if (chipS.textContent !== s[2]) { chipB.textContent = s[1]; chipS.textContent = s[2]; }
  }
  function resize() {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    drawnK = -1; draw();
  }
  new ResizeObserver(resize).observe(holder);
  let raf = 0;
  const api = {
    show(on) { shown = on; holder.classList.toggle('on', on); media.classList.toggle('p3-on', on); if (on) { drawnK = -1; resize(); } },
    set(k) { K = k; if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }
  };
  window.RAX.perceive = api;
  const st = window.RAX.howState;
  if (st) { K = st.k || 0; api.show(!!st.see); }
}

if (media) {
  const io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { io.disconnect(); init(); }
  }, { rootMargin: '600px' });
  io.observe(media);
}

})();
