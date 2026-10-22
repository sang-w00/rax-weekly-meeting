// How RAX works: the air-fryer session in four acts, each a clip of the raw left camera with what the
// agent or its program was doing at the same moments (tool calls, the code it wrote, the fix, the program running).
(function () {
  'use strict';
  var root = document.getElementById('howRoot');
  if (!root || !window.RAX || !RAX.code || !RAX.code.airfry) return;
  var externallyActive = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hms(s) { var p = s.split(':'); return +p[0] * 3600 + +p[1] * 60 + +(p[2] || 0); }
  var PROG = RAX.code.airfry;

  // Wall-clock times are EDT; each clip lists its segments [start, end, speed].
  var ACTS = [
    // No clip: perceive3d.js rebuilds the 09:19:21 RGB-D frame in 3D and the model the agent fitted to it.
    // The segments map the 26 s of the act onto the 44 min it took, so each stage lands when its script ran.
    { id: 'see', title: 'Perceive in 3D', sub: 'depth to points to a model', still: 'assets/img/how/r1_left.jpg', when: 'Run 1, 09:19–10:03', hold: 26000,
      segs: [['09:19:15', '09:20:40', 10.897], ['09:20:40', '09:25:20', 48.95], ['09:25:20', '09:28:10', 40.865],
             ['09:28:10', '09:51:20', 445.5], ['09:51:20', '10:03:00', 224.36], ['10:03:00', '10:03:45', 21.63]],
      text: 'Before it moves, the agent writes its own 3D perception. It lifts the depth of two cameras into the robot’s frame, finds the handle by its dark colour, fits circles to the body slice by slice for the axis, measures the handle’s profile, and checks every candidate grasp for clearance against the model it built.',
      stat: '44 min and 23 analysis scripts before the first grasp', mode: 'feed', head: 'The agent’s tool calls and its scripts’ output, in step with the 3D view',
      dia: { on: ['agent', 'robot'], agent: 'perceiving in 3D', prog: 'not written yet', edges: ['down', 'up'], notes: [] },
      feed: [
        ['09:19:21', 'call', 'franka_observe()  → left, right, wrist: rgb + depth'],
        ['09:19:41', 'call', "franka_pixel_to_position(camera='left', pixels=[[690, 250], …])  → 15 points in 3D"],
        ['09:20:27', 'edit', 'write code/airfry/geom.py: load_frame, backproject, project'],
        ['09:20:36', 'run', 'python a1.py   # left + right depth → robot frame, height map'],
        ['09:20:38', 'log', 'left 12919 + right 20896 points above the table, z 0.10–0.42 m'],
        ['09:25:06', 'run', 'python a2.py   # dark = handle; circle fit to the body per slice'],
        ['09:25:15', 'log', 'body z[0.14,0.20] center (0.616, -0.214) r=0.116'],
        ['09:25:15', 'log', 'body z[0.32,0.38] center (0.608, -0.205) r=0.090', 1],
        ['09:27:43', 'run', 'python a3.py   # handle along the pull direction d = 141°'],
        ['09:27:51', 'log', 'grip: 0.153–0.179 m out from the axis, z 0.142–0.214 m'],
        ['09:35:04', 'edit', 'write code/airfry/collide.py: Fryer(c, d, grip, arm), clearance(q)'],
        ['09:36:18', 'say', '~1 cm between the hand and the handle arm, so the arm-top height matters. Let me measure it properly rather than assume 0.25 m.'],
        ['09:54:52', 'run', 'python a22.py   # candidate grasps: IK + clearance'],
        ['10:02:38', 'log', '308 grasps searched; best: tilt 85°, 0.156 m out, z 0.256 m'],
        ['10:03:20', 'run', 'python a23.py   # approach, grasp, 15 cm pull'],
        ['10:03:25', 'ok', 'descend and pull: every pose reachable, ≥ 12.4 mm clearance'],
        ['10:03:39', 'edit', 'memory/PROGRESS.md: grasp analysis, handle is a Γ shape …']
      ] },
    { id: 'explore', title: 'Explore with tool calls', sub: 'the agent drives the robot', vid: 'how/a1_explore', when: 'Run 1, 09:19–10:36',
      segs: [['09:19:15', '09:19:45', 10], ['10:03:35', '10:06:20', 48], ['10:18:45', '10:19:30', 18], ['10:26:45', '10:27:35', 20], ['10:30:05', '10:34:15', 100]],
      text: 'The agent itself moves the arm, one tool call at a time: it looks, lines up on the handle, grasps it at 50 N, pulls the drawer, drops the banana in and pushes the drawer shut.',
      stat: '72 min of the agent’s own inference, 262k output tokens', mode: 'feed', head: 'The agent’s tool calls, in step with the clip',
      dia: { on: ['agent', 'robot', 'mem'], agent: 'exploring', prog: 'not written yet', edges: ['down', 'up', 'write'], notes: [] },
      feed: [
        ['09:19:21', 'call', 'franka_observe()  → left, right, wrist: rgb + depth'],
        ['09:19:41', 'call', "franka_pixel_to_position(camera='left', pixels=[[690, 250], …])"],
        ['10:03:41', 'call', 'franka_move_pose([0.48, -0.106, 0.356], quaternion=[…])'],
        ['10:04:53', 'call', 'franka_move_pose([0.490, -0.108, 0.256], …)'],
        ['10:05:07', 'call', "franka_gripper('grasp', width=0.025, force=50)"],
        ['10:05:25', 'call', 'franka_move_pose([-0.016, 0.013, 0], relative=True, tolerance_mm=5)'],
        ['10:05:35', 'call', 'franka_move_pose([-0.023, 0.019, 0], relative=True, tolerance_mm=5)'],
        ['10:18:57', 'call', "franka_gripper('grasp', width=0.02, force=20)   # banana"],
        ['10:27:23', 'call', "franka_gripper('open')   # drop it in"],
        ['10:30:19', 'call', "franka_gripper('grasp', width=0.025, force=50)   # handle again"],
        ['10:34:12', 'call', "franka_move_joints(preset='home')"],
        ['10:36:18', 'call', "request_operator('Manual episode 1 succeeded (drawer opened ~12.6 cm, …)')"]
      ] },
    { title: 'Write the program', sub: 'from what worked', vid: 'how/a2_program', when: '10:36–10:44', hold: 7000,
      text: 'It turns what it measured in run 1 into a controller: its own perception, a plan checked before any motion, and the actions that worked. About 1,500 lines of Python, condensed here.',
      stat: 'Clip: run 2, the first controller takes the handle', mode: 'type',
      dia: { on: ['agent', 'mem', 'prog', 'robot'], agent: 'writing the code', prog: 'being written', ver: 'v1', edges: ['read', 'code', 'run', 'runup'],
        wm: ['← PROGRESS.md, TIPS.md'], notes: ['PROGRESS.md: run 1 done', 'TIPS.md: grasp 50 N'],
        cues: [[0.03, 'read', ''], [0.3, 'code', ''], [0.62, 'run', 'step_open()'], [0.8, 'run', 'robot.grasp()']] } },
    { title: 'Hand back when unsure', sub: 'a failed check stops it', vid: 'how/a3_unsure', when: 'Run 5, 11:22–11:25',
      segs: [['11:22:30', '11:25:06', 30]],
      text: 'Every check that fails stops the program and returns control to the agent. Here the arm stopped 3.7 mm short of the handle; the agent made that descent tolerant and resumed from the close step.',
      stat: 'Resumed close step: 81 s, handle 1.5 mm from where it began', mode: 'feed', head: 'What happened, in step with the clip',
      dia: { on: ['agent', 'prog', 'robot'], agent: 'watching', prog: 'running', step: 'step_close()', ver: 'v3', edges: ['run', 'runup', 'unsure', 'code', 'write'],
        notes: ['RUNS.md: runs 1–4', 'TIPS.md: grasp 50 N'] },
      feed: [
        ['11:22:37', 'call', 'franka_move_joints([…])   # above the handle'],
        ['11:22:52', 'call', 'franka_move_pose([0.391, -0.032, 0.223], timeout_s=15, …)'],
        ['11:22:52', 'error', 'TimeoutError: pose not reached in 15.0s: position error 3.7 mm'],
        ['11:22:52', 'error', 'the controller stops (report ok = False); control returns to the agent'],
        ['11:23:15', 'edit', 'edit code/airfry/controller.py: descend_to_grasp', 1],
        ['11:23:15', 'edit', '+ ok, rep = robot.try_move_pose(grasp, quat, tol_mm=3, timeout_s=10)', 1],
        ['11:23:15', 'edit', '+ acceptable = np.linalg.norm(e) < 0.008   # residual < 8 mm', 1],
        ['11:23:42', 'run', 'python code/airfry/controller.py --steps close --resume 20261004T112042'],
        ['11:24:11', 'say', 'descent residual 6.6 mm: within tolerance'],
        ['11:24:11', 'call', "franka_gripper('grasp', width=0.025, force=50)"],
        ['11:24:16', 'call', 'franka_move_pose(…)   # push the drawer, 4 steps'],
        ['11:25:03', 'ok', 'close: ok, face shift 1.5 mm']
      ] },
    { title: 'The program runs alone', sub: 'no agent in the loop', vid: 'how/a4_alone', when: 'Run 9, 11:50, fryer rotated',
      segs: [['11:50:07.4', '11:52:55', 12]],
      text: 'The program perceives the fryer anew, plans the whole pull before it moves, opens the drawer, drops the banana, closes it, and checks every step. The arrow follows the line it is running.',
      stat: '178 s unattended; 18–23 s of inference per run, against 72 min in run 1', mode: 'run',
      dia: { on: ['prog', 'robot'], agent: 'not in the loop', prog: 'running', ver: 'v9', edges: ['run', 'runup'],
        notes: ['RUNS.md: runs 6, 7 clean', 'TIPS.md: accept < 8 mm'] },
      // seconds after the run start -> line of the condensed program, from the run's own call log
      sched: [[0, 0], [2, 1], [7.6, 2], [9, 3], [11, 4], [12, 5], [13, 6], [14, 7], [15, 9], [18, 10], [25.5, 11], [27, 12], [30, 13],
              [36, 14], [37, 15], [43.6, 16], [48, 17], [52, 18], [61.3, 19], [72, 20], [90, 21], [97.7, 22], [109.6, 23], [111, 24],
              [114, 26], [118, 27], [124, 28], [135.5, 29], [146, 30], [150, 31], [163.1, 32], [166, 33]] }
  ];

  var actsEl = root.querySelector('.acts'), video = root.querySelector('video'), tag = root.querySelector('.pl-tag');
  var bar = root.querySelector('.pl-progress span'), btn = root.querySelector('.pl-btn');
  var capK = root.querySelector('.how-k'), capH = root.querySelector('.how-h'), capP = root.querySelector('.how-p'), capS = root.querySelector('.how-stat');
  var head = root.querySelector('.cc-code-head'), pre = root.querySelector('.cc-pre'), feedEl = root.querySelector('.cc-feed');
  var KIND = { call: 'robot', run: 'shell', edit: 'edit', say: 'agent', error: 'stop', ok: 'done', log: 'output' };
  var still = document.createElement('img');
  still.className = 'pl-still p3-still'; still.alt = ''; still.hidden = true;
  video.parentNode.insertBefore(still, video.nextSibling);
  // perceive3d.js is a module and arrives after this script; it reads this state when it is ready
  RAX.howState = { see: false, k: 0 };
  function p3(fn, arg) { if (RAX.perceive) RAX.perceive[fn](arg); }

  /* ---------- the architecture diagram; the clip sits inside the robot box ---------- */
  var NS = 'http://www.w3.org/2000/svg', svg = root.querySelector('svg.how-svg');
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, str, cls, anchor) {
    var t = sv('text', { x: x, y: y, class: cls || '', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }
  function cut(str, n) { return str.length > n ? str.slice(0, n - 1) + '…' : str; }
  svg.setAttribute('viewBox', '0 0 600 470');
  var mk = sv('marker', { id: 'howArrow', viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, sv('defs', {}, svg));
  sv('path', { d: 'M0,0 L8,4 L0,8 z', class: 'hw-arrowhead' }, mk);
  function node(x, y, w, h, cls) {
    var g = sv('g', { class: 'hw-node ' + cls }, svg);
    sv('rect', { x: x, y: y, width: w, height: h, rx: 12 }, g);
    return g;
  }
  var gMem = node(10, 14, 168, 128, 'mem');
  txt(gMem, 24, 38, 'Memory', 'hw-title');
  txt(gMem, 24, 58, 'Working memory', 'hw-k');
  var wmT = [txt(gMem, 24, 73, '', 'hw-mono'), txt(gMem, 24, 86, '', 'hw-mono')];
  txt(gMem, 24, 104, 'Notes · skills', 'hw-k');
  var noteT = [txt(gMem, 24, 119, '', 'hw-mono'), txt(gMem, 24, 132, '', 'hw-mono')];
  var gAgent = node(224, 14, 152, 128, 'agent');
  txt(gAgent, 300, 48, 'Coding agent', 'hw-title inv', 'middle');
  txt(gAgent, 300, 67, 'frozen LLM', 'hw-sub inv', 'middle');
  sv('rect', { x: 236, y: 86, width: 128, height: 26, rx: 13, class: 'hw-pill' }, gAgent);
  var agentS = txt(gAgent, 300, 103, '', 'hw-status inv', 'middle');
  var gProg = node(422, 14, 168, 128, 'prog');
  txt(gProg, 436, 38, 'Robot program', 'hw-title');
  txt(gProg, 436, 58, 'airfry/controller.py', 'hw-mono');
  var progS = txt(gProg, 436, 86, '', 'hw-status');
  var progStep = txt(gProg, 436, 106, '', 'hw-mono');
  var progV = txt(gProg, 436, 128, '', 'hw-mono muted');
  sv('line', { x1: 10, x2: 590, y1: 160, y2: 160, class: 'hw-boundary' }, svg);
  txt(svg, 12, 154, 'isolation boundary', 'hw-k muted');
  txt(svg, 36, 178, 'Franka FR3, 3 RGB-D cameras', 'hw-k');
  var gRobot = node(36, 184, 480, 277, 'robot');
  var P = {
    write: 'M222,64 H180', read: 'M180,92 H222', code: 'M378,56 H420', unsure: 'M420,104 H378',
    down: 'M280,142 V184', up: 'M320,184 V142', run: 'M548,142 V280 H520', runup: 'M520,330 H576 V142'
  };
  var edges = {};
  Object.keys(P).forEach(function (k) {
    edges[k] = sv('path', { d: P[k], class: 'hw-edge' + (k === 'unsure' ? ' dashed' : ''), 'marker-end': 'url(#howArrow)' }, svg);
  });
  [[201, 56, 'write', 'middle'], [201, 108, 'read', 'middle'], [399, 48, 'code', 'middle'], [399, 120, 'Unsure()', 'middle'],
   [274, 156, 'calls', 'end'], [326, 156, 'observations', 'start']].forEach(function (l) { txt(svg, l[0], l[1], l[2], 'hw-elab', l[3]); });
  var runLab = txt(svg, 591, 250, 'program runs alone', 'hw-elab', 'middle');
  runLab.setAttribute('transform', 'rotate(-90 591 250)');
  var packets = sv('g', {}, svg);
  var showDia = window.matchMedia ? !window.matchMedia('(max-width: 560px)').matches : true;

  function packet(key, label, warn, delay) {
    if (reduced || !showDia) return;
    if (['write', 'read', 'code', 'unsure'].indexOf(key) >= 0) label = '';
    setTimeout(function () {
      var path = edges[key], L = path.getTotalLength();
      var g = sv('g', { class: 'hw-packet' + (warn ? ' warn' : '') }, packets);
      sv('circle', { r: 5 }, g);
      if (label) {
        var tw = Math.max(40, label.length * 6.3 + 12), left = key === 'down' || key === 'run' || key === 'runup';
        sv('rect', { height: 18, width: tw, rx: 9, x: left ? -8 - tw : 8, y: -9 }, g);
        txt(g, left ? -2 - tw : 14, 4, label, 'hw-ptext');
      }
      var t0 = performance.now(), dur = 1000;
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var p = path.getPointAtLength(e * L);
        g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ')');
        g.setAttribute('opacity', k > 0.85 ? (1 - k) / 0.15 : 1);
        if (k < 1) requestAnimationFrame(step); else g.remove();
      })(t0);
    }, delay || 0);
  }
  function fname(str) { var m = /([A-Za-z_][\w.]*)\(/.exec(str); return m ? m[1] + '()' : ''; }
  var D = {};
  function setDia(st) {
    Object.keys(st).forEach(function (k) { D[k] = st[k]; });
    [['agent', gAgent], ['mem', gMem], ['prog', gProg], ['robot', gRobot]].forEach(function (p) {
      p[1].classList.toggle('on', D.on.indexOf(p[0]) >= 0);
    });
    gAgent.classList.toggle('idle', D.agent === 'not in the loop');
    agentS.textContent = D.agent;
    progS.textContent = D.prog;
    progStep.textContent = D.step || '';
    progV.textContent = D.ver ? 'version ' + D.ver : '';
    gProg.classList.toggle('empty', D.prog === 'not written yet');
    gProg.classList.toggle('warn', !!D.warn);
    gRobot.classList.toggle('warn', !!D.warn);
    wmT.forEach(function (t, k) { t.textContent = cut((D.wm || [])[k] || '', 24); });
    noteT.forEach(function (t, k) { t.textContent = cut((D.notes || [])[k] || '', 24); });
    Object.keys(edges).forEach(function (k) { edges[k].classList.toggle('live', D.edges.indexOf(k) >= 0); });
  }
  function enterAct(a) {
    packets.innerHTML = '';
    D = {};
    setDia({ on: a.dia.on, agent: a.dia.agent, prog: a.dia.prog, step: a.dia.step || '', ver: a.dia.ver || '', warn: false,
      wm: (a.dia.wm || []).slice(), notes: (a.dia.notes || []).slice(), edges: a.dia.edges });
  }
  // a feed line just appeared in act 1 or 3: send it along the edge it travelled
  function onFeed(a, l, quiet) {
    var kind = l[1], text = l[2], wm = D.wm.slice();
    function remember(x) { wm = [x].concat(wm).slice(0, 2); }
    if (a.id === 'see') {
      if (l[3]) return;
      if (kind === 'call') {
        remember('→ ' + fname(text));
        if (!quiet) { packet('down', fname(text)); packet('up', /observe/.test(text) ? 'rgb + depth' : '3D points', false, 550); }
        setDia({ wm: wm });
      } else if (kind === 'edit' && /^memory/.test(text)) {
        remember('→ PROGRESS.md');
        if (!quiet) packet('write', '');
        setDia({ wm: wm, on: ['agent', 'mem', 'prog'], notes: ['PROGRESS.md: grasp analysis', 'handle: Γ shape'] });
      } else if (kind === 'edit') {
        // geom.py and collide.py become the perception and checks of the program it writes later
        var f = /(\w+\.py)/.exec(text)[1];
        remember('→ write ' + f);
        if (!quiet) packet('code', '');
        setDia({ wm: wm, on: ['agent', 'robot', 'prog'], prog: 'perception', step: f === 'geom.py' ? 'geom.py' : 'geom.py, collide.py' });
      } else if (kind === 'run') {
        remember('→ ' + (/(a\d+\.py)/.exec(text) || ['', 'python'])[1]);
        setDia({ wm: wm });
      }
      return;
    }
    if (a.id === 'explore') {
      if (/^request_operator/.test(text)) {
        remember('→ request_operator()');
        if (!quiet) packet('write', '');
        setDia({ wm: wm, agent: 'writing notes', on: ['agent', 'mem'], notes: ['PROGRESS.md: run 1 done', 'TIPS.md: grasp 50 N'] });
        return;
      }
      remember('→ ' + fname(text));
      if (!quiet) { packet('down', fname(text)); packet('up', /observe|pixel_to/.test(text) ? (/observe/.test(text) ? 'rgb + depth' : '3D point') : '', false, 550); }
      setDia({ wm: wm });
      return;
    }
    if (l[3]) return;   // continuation of an edit
    if (kind === 'call') { if (!quiet) { packet('run', fname(text)); packet('runup', '', false, 550); } return; }
    if (kind === 'error') {
      if (D.warn) return;
      if (!quiet) packet('unsure', '', true);
      remember('← TimeoutError, 3.7 mm');
      setDia({ wm: wm, warn: true, prog: 'stopped', agent: 'fixing the code', on: ['agent', 'prog', 'mem'] });
      return;
    }
    if (kind === 'edit') {
      if (!quiet) packet('code', '');
      remember('→ edit descend_to_grasp');
      setDia({ wm: wm, ver: 'v4', prog: 'fixed' });
      return;
    }
    if (kind === 'run') {
      if (!quiet) packet('code', '');
      remember('→ --steps close --resume');
      setDia({ wm: wm, warn: false, prog: 'resumed', agent: 'watching', on: ['agent', 'prog', 'robot'] });
      return;
    }
    if (kind === 'ok') {
      if (!quiet) { packet('runup', 'done'); packet('write', '', false, 700); }
      remember('← close: ok');
      setDia({ wm: wm, prog: 'done', on: ['agent', 'prog', 'robot', 'mem'], notes: ['RUNS.md: run 5, resumed', 'TIPS.md: accept < 8 mm'] });
    }
  }
  // act 4: the program line now running
  function onLine(t) {
    var top = /^(?:P|r) = (step_\w+)/.exec(t);
    if (top) setDia({ step: top[1] + '()' });
    var m = /(per\.\w+|robot\.\w+|descend_to_grasp|view_from|scene_from_frames)\(/.exec(t);
    if (!m) return;
    if (/^per\.|scene_from|view_from/.test(m[1])) { packet('run', m[1] === 'view_from' ? 'move to view' : 'observe()'); packet('runup', 'rgb + depth', false, 550); }
    else packet('run', m[1] + '()');
  }
  var acts = ACTS.map(function (a, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<b>' + (i + 1) + '</b><span><strong>' + esc(a.title) + '</strong><em>' + esc(a.sub) + '</em></span><i></i>';
    b.addEventListener('click', function () { go(i); });
    var li = document.createElement('li'); li.appendChild(b); actsEl.appendChild(li);
    return b;
  });
  function hl(code) {
    var h = code.indexOf('#'), body = h >= 0 ? code.slice(0, h) : code, com = h >= 0 ? code.slice(h) : '';
    return esc(body).replace(/\b(def|for|in|if|not|is|None|or|and|return|raise|else)\b/g, '<span class="kw">$1</span>')
      .replace(/(StepFailure)/g, '<span class="err">$1</span>') + (com ? '<span class="c">' + esc(com) + '</span>' : '');
  }
  pre.innerHTML = PROG.lines.map(function (l) { return '<span class="ln">' + (hl(l.t) || ' ') + '</span>'; }).join('');
  var lines = Array.prototype.slice.call(pre.children);

  var cued = 0, cur = 0, playing = !reduced, visible = false, holdTimer = null, t0 = 0, held = 0, raf = null, feedLines = [], shown = -1, ptr = -1, typed = -1;
  // wall-clock seconds at time t of the clip
  function wallAt(a, t) {
    var acc = 0;
    for (var i = 0; i < a.segs.length; i++) {
      var s = a.segs[i], len = (hms(s[1]) - hms(s[0])) / s[2];
      if (t <= acc + len || i === a.segs.length - 1) return hms(s[0]) + Math.min(t - acc, len) * s[2];
      acc += len;
    }
  }
  function render() {
    var a = ACTS[cur];
    acts.forEach(function (b, j) { b.setAttribute('aria-current', j === cur ? 'step' : 'false'); b.classList.toggle('done', j < cur); b.querySelector('i').style.width = j < cur ? '100%' : '0%'; });
    capK.textContent = 'Act ' + (cur + 1) + ' of ' + ACTS.length + ' · ' + a.when;
    capH.textContent = a.title;
    capP.textContent = a.text;
    capS.textContent = a.stat;
    tag.textContent = a.when;
    video.loop = !!a.hold;
    // an act with a still has no clip: the 3D view covers it once perceive3d.js is ready
    still.hidden = !a.still; video.hidden = !!a.still;
    if (a.still) { still.src = a.still; video.pause(); }
    else {
      var src = 'assets/vid/' + a.vid + '.mp4';
      if (video.getAttribute('src') !== src) { video.poster = 'assets/vid/' + a.vid + '.jpg'; video.src = src; }
      else { try { video.currentTime = 0; } catch (e) { /* not loaded yet */ } }
    }
    RAX.howState.see = a.id === 'see'; RAX.howState.k = 0;
    p3('show', a.id === 'see');
    pre.hidden = a.mode === 'feed'; feedEl.hidden = a.mode !== 'feed';
    enterAct(a); cued = 0;
    shown = -1; ptr = -1; typed = -1;
    if (a.mode === 'feed') {
      head.textContent = a.head;
      feedEl.innerHTML = a.feed.map(function (l) {
        var t = esc(l[2]);
        if (l[1] === 'edit' && /^[+-] /.test(l[2])) t = '<span class="add">' + t + '</span>';
        return '<span class="fl k-' + l[1] + '"><span class="tm">' + (l[3] ? '' : l[0]) + '</span><span class="kd">' + KIND[l[1]] + '</span><span class="tx">' + t + '</span></span>';
      }).join('');
      feedLines = Array.prototype.slice.call(feedEl.children);
      feedEl.scrollTop = 0;
    } else {
      head.textContent = (a.mode === 'type' ? 'Writing ' : 'Running ') + PROG.file + ' (condensed)';
      pre.classList.toggle('typing', a.mode === 'type');
      pre.classList.toggle('focus', a.mode === 'run');
      lines.forEach(function (l) { l.classList.remove('cur', 'on', 'shown'); });
      pre.scrollTop = 0;
    }
    held = 0;
    progress(0, 0);
    arm();
  }
  function progress(k, t) {
    bar.style.width = (k * 100) + '%';
    acts[cur].querySelector('i').style.width = (k * 100) + '%';
    var a = ACTS[cur];
    if (a.id === 'see') { RAX.howState.k = k; p3('set', k); }
    if (a.mode === 'feed') {
      var w = wallAt(a, t || 0), want = -1;
      a.feed.forEach(function (l, j) { if (hms(l[0]) <= w + 0.5) want = j; });
      if (k >= 0.98) want = a.feed.length - 1;
      if (want === shown) return;
      for (var j0 = Math.max(0, shown + 1); j0 <= want; j0++) onFeed(a, a.feed[j0], want - j0 > 1);
      feedLines.forEach(function (l, j) { l.classList.toggle('shown', j <= want); l.classList.toggle('new', j === want); });
      shown = want;
      if (want >= 0) { var last = feedLines[want]; feedEl.scrollTop = Math.max(0, last.offsetTop - feedEl.offsetTop - feedEl.clientHeight + last.offsetHeight + 12); }
    } else if (a.mode === 'type') {
      while (cued < a.dia.cues.length && k >= a.dia.cues[cued][0]) { var c0 = a.dia.cues[cued++]; packet(c0[1], c0[2]); if (c0[1] === 'code') setDia({ prog: 'written' }); if (c0[1] === 'run') setDia({ prog: 'running', step: c0[2] }); }
      var n = Math.min(lines.length, Math.ceil(k * 1.15 * lines.length));
      if (n === typed) return;
      lines.forEach(function (l, j) { l.classList.toggle('shown', j < n); });
      typed = n;
      if (n > 0) { var ln = lines[n - 1]; pre.scrollTop = Math.max(0, ln.offsetTop - pre.offsetTop - pre.clientHeight + 40); }
    } else {
      var rt = wallAt(a, t || 0) - hms(a.segs[0][0]), q = 0;
      a.sched.forEach(function (s) { if (s[0] <= rt) q = s[1]; });
      if (k >= 0.99 && D.prog !== 'done') { setDia({ prog: 'done', step: 'every check passed' }); packet('runup', 'done'); }
      if (q === ptr) return;
      for (var j1 = Math.max(0, ptr + 1); j1 <= q; j1++) if (q - j1 < 2) onLine(PROG.lines[j1].t);
      lines.forEach(function (l, j) { l.classList.toggle('on', j <= q); l.classList.toggle('cur', j === q); });
      ptr = q;
      var c = lines[q];
      pre.scrollTo({ top: Math.max(0, c.offsetTop - pre.offsetTop - pre.clientHeight / 2), behavior: reduced ? 'auto' : 'smooth' });
    }
  }
  function tickHold(now) {
    held = Math.min(ACTS[cur].hold, now - t0);
    var k = held / ACTS[cur].hold;
    progress(k, held / 1000);
    if (k < 1) raf = requestAnimationFrame(tickHold);
  }
  function arm() {
    clearTimeout(holdTimer); cancelAnimationFrame(raf);
    if (!playing || !visible || !externallyActive) { video.pause(); return; }
    if (!ACTS[cur].still) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    // a paused hold resumes where it stopped
    if (ACTS[cur].hold) { t0 = performance.now() - held; raf = requestAnimationFrame(tickHold); holdTimer = setTimeout(next, ACTS[cur].hold - held + (ACTS[cur].still ? 900 : 0)); }
  }
  function next() { go((cur + 1) % ACTS.length); }
  function go(i) { cur = i; render(); }
  video.addEventListener('timeupdate', function () { if (!ACTS[cur].hold && video.duration) progress(video.currentTime / video.duration, video.currentTime); });
  video.addEventListener('ended', function () { if (ACTS[cur].hold) return; progress(1, video.duration); if (playing && visible) holdTimer = setTimeout(next, 900); });
  function sync() { btn.classList.toggle('paused', !playing); btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
  btn.addEventListener('click', function () { playing = !playing; sync(); arm(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v !== visible) { visible = v; arm(); } }, { threshold: 0.3 }).observe(video.parentNode);
  } else { visible = true; }
  window.RAX.method = {
    select: function(i) { go(Math.max(0, Math.min(ACTS.length-1, Number(i)||0))); },
    play: function(){playing=true;sync();arm();},
    pause: function(){playing=false;sync();arm();},
    setActive: function(on){externallyActive=!!on;arm();},
    replay: function(){go(cur);},
    seek: function(k){k=Math.max(0,Math.min(1,Number(k)||0));if(ACTS[cur].hold){held=k*ACTS[cur].hold;progress(k,held/1000);arm();}else if(video.duration){video.currentTime=k*video.duration;progress(k,video.currentTime);}},
    get state(){return {act:cur,title:ACTS[cur].title,playing:playing,active:externallyActive,progress:RAX.howState.k,videoTime:video.currentTime,videoDuration:video.duration};}
  };
  window.addEventListener('message',function(e){var d=e.data;if(d&&d.type==='rax-slide-visibility')window.RAX.method.setActive(d.visible);});
  document.querySelector('.replay').addEventListener('click',function(){window.RAX.method.replay();});
  sync(); render();
})();
