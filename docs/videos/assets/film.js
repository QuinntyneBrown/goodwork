// Runtime for film decks: docs/videos/*/slides.html with <body data-film>.
//
// A film is the same deck of <section> slides, but every pixel is a pure function of film time,
// so one page both plays live (against the narration and the music) and renders frame by frame
// (tools/video-build calls FILM.seek(seconds) and screenshots). Nothing uses CSS animation.
//
//   WebGPU  the background: a slow field of warped noise with a gold light that breathes with the
//           music's loudness, and a hundred instanced blocks that drift and swell on the beat.
//   WebGL   the transitions: brick, sweep and mark wipes drawn over the slides around each cut.
//   DOM     the slides: masked word rises, fades, pops and the Cornerstone mark assembling itself,
//           started by the narration (data-at), by the music (data-beat) or by the scene's clock.
//
// The times come from timing.js, which tools/video-build writes beside the deck: scene starts
// (data-cue, moved onto the nearest beat), phrase times (data-at) and the music's beats, hits and
// loudness. See docs/videos/README.md.
(() => {
  const body = document.body;
  const query = new URLSearchParams(location.search);
  const RENDER = query.has('render');
  const T = window.FILM_TIMING;
  const W = 1920;
  const H = 1080;
  const errors = [];

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  /** 0→1 progress of t through [at, at + dur]. */
  const prog = (t, at, dur) => clamp((t - at) / dur);
  const outQuint = (p) => 1 - Math.pow(1 - p, 5);
  const outBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

  if (!T) {
    body.insertAdjacentHTML('afterbegin', '<p class="film-error">timing.js is missing. Run tools/video-build/build-video.mjs on this folder with --check.</p>');
    return;
  }

  // ── The music ─────────────────────────────────────────────────────────────────────────────────
  const { beats, hits, envelope, envelopeRate } = T.music;
  /** The last entry of a sorted list at or before t, by its time. */
  const lastBefore = (list, t, time = (x) => x) => {
    let lo = 0;
    let hi = list.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (time(list[mid]) <= t) [found, lo] = [mid, mid + 1];
      else hi = mid - 1;
    }
    return found < 0 ? null : list[found];
  };
  /** 1 on a beat, decaying to 0 before the next. */
  const beatPulse = (t) => {
    const at = lastBefore(beats, t);
    return at === null ? 0 : Math.exp(-(t - at) * 6);
  };
  /** The strength of the last strum or kick, decaying fast. */
  const hitPulse = (t) => {
    const hit = lastBefore(hits, t, (h) => h.t);
    return hit ? hit.strength * Math.exp(-(t - hit.t) * 10) : 0;
  };
  const loudness = (t) => {
    const x = clamp(t * envelopeRate, 0, Math.max(0, envelope.length - 1));
    const i = Math.floor(x);
    const a = envelope[i] ?? 0;
    return a + ((envelope[i + 1] ?? a) - a) * (x - i);
  };

  // ── Scenes and the things that move in them ───────────────────────────────────────────────────
  const COVER = 0.4; // a transition covers the outgoing slide for this long before the cut
  const REVEAL = 0.55; // and uncovers the incoming one for this long after it
  const KINDS = { bricks: 1, sweep: 2, mark: 3 };

  const MARK =
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<rect x="4" y="4" width="17" height="12" rx="2.5"/><rect x="27" y="4" width="17" height="12" rx="2.5"/>' +
    '<rect x="27" y="22" width="17" height="22" rx="2.5"/><rect class="gold" x="4" y="22" width="17" height="22" rx="2.5"/></svg>';

  // Each entrance takes the element and its start time and returns a function of film time.
  const MOVES = {
    /** Masked word rise: every word slides up from behind its own line. */
    words(el, at) {
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="w"><span class="wi"></span></span>`).join(' ');
      const inner = Array.from(el.querySelectorAll('.wi'));
      inner.forEach((span, i) => (span.textContent = words[i]));
      return (t) =>
        inner.forEach((span, i) => {
          const p = outQuint(prog(t, at + i * 0.07, 0.55));
          span.style.transform = `translateY(${((1 - p) * 1.05).toFixed(4)}em)`;
          span.style.opacity = p;
        });
    },
    /** Fade and rise, for supporting text. */
    rise(el, at) {
      return (t) => {
        const p = outQuint(prog(t, at, 0.6));
        el.style.opacity = p;
        el.style.transform = `translateY(${((1 - p) * 32).toFixed(2)}px)`;
      };
    },
    /** A small overshoot, for things that land. */
    pop(el, at) {
      return (t) => {
        const p = prog(t, at, 0.45);
        el.style.opacity = clamp(p * 3);
        el.style.transform = `scale(${(0.7 + 0.3 * outBack(p)).toFixed(4)})`;
      };
    },
    /** The Cornerstone mark: three blocks land, the gold one last, and it swells on every beat after. */
    mark(el, at) {
      el.innerHTML = MARK;
      const blocks = Array.from(el.querySelectorAll('rect'));
      return (t) =>
        blocks.forEach((block, i) => {
          const landed = at + i * 0.11;
          const p = prog(t, landed, 0.5);
          const swell = block.classList.contains('gold') && t > landed + 0.5 ? 0.09 * beatPulse(t) : 0;
          block.style.opacity = clamp(p * 4);
          block.style.transform = `scale(${(Math.max(0, outBack(p)) + swell).toFixed(4)})`;
        });
    },
  };

  const scenes = Array.from(document.querySelectorAll('body > section')).map((el, i) => {
    const start = T.scenes[i]?.start ?? 0;
    const scene = { el, start, dark: el.classList.contains('dark'), kind: KINDS[el.dataset.transition] ?? 0, moves: [] };
    const firstBeat = beats.findIndex((b) => b >= start - 0.02);
    let order = 0;
    for (const item of el.querySelectorAll('[data-in]')) {
      // When it starts: on a narrated phrase, on the scene's nth beat, or in document order.
      let at = start + 0.15 + order++ * 0.12;
      if (item.dataset.at !== undefined) {
        at = T.at[item.dataset.at];
        if (at === undefined) errors.push(`no time for data-at="${item.dataset.at}"; rebuild timing.js`);
      } else if (item.dataset.beat !== undefined) {
        at = beats[firstBeat + Number(item.dataset.beat)] ?? at;
      }
      scene.moves.push(MOVES[item.dataset.in](item, at));
    }
    return scene;
  });
  const DURATION = T.duration;

  // ── WebGPU: the background ────────────────────────────────────────────────────────────────────
  const MOTES = 96;
  const WGSL = /* wgsl */ `
    struct Film { time: f32, loud: f32, beat: f32, hit: f32, dark: f32, a: f32, b: f32, c: f32 };
    @group(0) @binding(0) var<uniform> film: Film;

    const CREAM = vec3f(0.961, 0.941, 0.902);
    const LINEN = vec3f(0.890, 0.863, 0.804);
    const INK = vec3f(0.118, 0.176, 0.165);
    const INK_LIFT = vec3f(0.200, 0.318, 0.294);
    const GOLD = vec3f(0.725, 0.510, 0.165);
    const GOLD_LIGHT = vec3f(0.851, 0.659, 0.318);

    fn hash(p: vec2f) -> f32 {
      var q = fract(vec3f(p.xyx) * 0.1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }
    fn noise(p: vec2f) -> f32 {
      let i = floor(p);
      let f = fract(p);
      let s = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2f(1, 0)), s.x), mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), s.x), s.y);
    }
    fn fbm(start: vec2f) -> f32 {
      var p = start;
      var amp = 0.5;
      var sum = 0.0;
      for (var i = 0; i < 4; i++) {
        sum += amp * noise(p);
        p = p * 2.03 + vec2f(17.0, 9.0);
        amp *= 0.5;
      }
      return sum;
    }

    @vertex fn fieldVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
      let corners = array(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
      return vec4f(corners[i], 0, 1);
    }

    // Domain-warped noise in the brand's two grounds, lit by two gold lights whose reach follows
    // the loudness of the music and jumps on the beat.
    @fragment fn fieldFragment(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      let uv = pos.xy / vec2f(${W}, ${H});
      let p = vec2f(uv.x * 1.778, uv.y);
      let t = film.time * 0.05;
      let warp = vec2f(fbm(p * 1.3 + vec2f(t, -t * 0.7)), fbm(p * 1.3 + vec2f(-t * 0.8, t) + 5.2));
      let n = fbm(p * 1.1 + warp * 1.7 + vec2f(0.0, t * 0.5));
      let light = mix(CREAM, LINEN, smoothstep(0.25, 0.8, n));
      let dark = mix(INK * 0.72, INK_LIFT * 0.85, smoothstep(0.3, 0.85, n));
      var colour = mix(light, dark, film.dark);

      let reach = 0.55 + 0.25 * film.loud + 0.12 * film.beat;
      let low = vec2f(0.25 + 0.12 * sin(film.time * 0.21), 1.12);
      let high = vec2f(1.55 + 0.10 * cos(film.time * 0.17), -0.10);
      let glow = smoothstep(reach, 0.0, distance(p, low) + 0.25 * (n - 0.5))
        + 0.7 * smoothstep(reach * 0.8, 0.0, distance(p, high) + 0.25 * (n - 0.5));
      colour = mix(colour, mix(GOLD_LIGHT, GOLD, film.dark), glow * mix(0.34, 0.5, film.dark) * (0.75 + 0.25 * film.beat));

      // A pixel of static dither keeps the slow gradients from banding in the encode.
      colour += (hash(pos.xy) - 0.5) / 255.0;
      return vec4f(colour, 1);
    }

    struct Mote { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) alpha: f32, @location(2) gold: f32 };

    // Blocks, the shape of the mark's stones. Every one's path is a closed form of time and its
    // instance index, so any frame draws alone. They rise slowly, and swell with each beat.
    @vertex fn moteVertex(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Mote {
      let corners = array(vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1));
      let k = f32(instance);
      let r = vec4f(hash(vec2f(k, 1.0)), hash(vec2f(k, 2.0)), hash(vec2f(k, 3.0)), hash(vec2f(k, 4.0)));
      let depth = 0.25 + 0.75 * r.z;
      let y = fract(r.y - film.time * (0.008 + 0.03 * depth));
      let x = r.x + 0.015 * sin(film.time * 0.5 + k);
      let size = (8.0 + 26.0 * depth * r.w) * (1.0 + 0.5 * film.beat * depth + 0.4 * film.hit);
      let turn = film.time * 0.25 * (r.w - 0.5) + k;
      let corner = corners[vertex];
      let turned = vec2f(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
      let px = vec2f(x * ${W}.0, (y * 1.2 - 0.1) * ${H}.0) + turned * size;
      var out: Mote;
      out.pos = vec4f(px.x / ${W / 2}.0 - 1.0, 1.0 - px.y / ${H / 2}.0, 0, 1);
      out.uv = corner;
      out.alpha = depth * mix(0.6, 1.0, film.dark) * (0.10 + 0.22 * film.loud + 0.10 * film.beat) * smoothstep(0.0, 0.15, y) * smoothstep(1.0, 0.8, y);
      out.gold = step(0.62, r.x);
      return out;
    }

    @fragment fn moteFragment(mote: Mote) -> @location(0) vec4f {
      let edge = max(abs(mote.uv.x), abs(mote.uv.y));
      let shape = smoothstep(1.0, 0.82, edge);
      let stone = mix(INK, CREAM, film.dark);
      return vec4f(mix(stone, GOLD_LIGHT, mote.gold), shape * mote.alpha * mix(0.6, 1.0, mote.gold));
    }
  `;

  /** Sets up the background and returns draw(time, dark), or null where WebGPU is unavailable. */
  async function background(canvas) {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });
    const module = device.createShaderModule({ code: WGSL });
    const info = await module.getCompilationInfo();
    for (const m of info.messages) if (m.type === 'error') errors.push(`WGSL ${m.lineNum}: ${m.message}`);
    const uniforms = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const layout = device.createBindGroupLayout({
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} }],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const bindGroup = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uniforms } }] });
    const field = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module, entryPoint: 'fieldVertex' },
      fragment: { module, entryPoint: 'fieldFragment', targets: [{ format }] },
    });
    const blend = { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' };
    const motes = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module, entryPoint: 'moteVertex' },
      fragment: { module, entryPoint: 'moteFragment', targets: [{ format, blend: { color: blend, alpha: blend } }] },
    });
    const draw = (t, dark) => {
      device.queue.writeBuffer(uniforms, 0, new Float32Array([t, loudness(t), beatPulse(t), hitPulse(t), dark, 0, 0, 0]));
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store' }],
      });
      pass.setBindGroup(0, bindGroup);
      pass.setPipeline(field);
      pass.draw(3);
      pass.setPipeline(motes);
      pass.draw(6, MOTES);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };
    draw.settled = () => device.queue.onSubmittedWorkDone();
    // A lost device stops the background: the live deck falls back to the flat grounds, and a
    // render reports it rather than encoding empty frames.
    device.lost.then((lost) => {
      drawField = null;
      body.classList.add('no-webgpu');
      if (RENDER) errors.push(`the WebGPU device was lost: ${lost.message}`);
    });
    return draw;
  }

  // ── WebGL: the transitions ────────────────────────────────────────────────────────────────────
  const GLSL = /* glsl */ `
    precision highp float;
    uniform float p;      // 0 nothing, 0.5 the frame is covered (the cut), 1 nothing again
    uniform int kind;
    const vec2 RES = vec2(${W}.0, ${H}.0);
    const vec3 INK = vec3(0.118, 0.176, 0.165);
    const vec3 INK_LIFT = vec3(0.200, 0.318, 0.294);
    const vec3 GOLD = vec3(0.725, 0.510, 0.165);
    const vec3 GOLD_LIGHT = vec3(0.851, 0.659, 0.318);
    const vec3 CREAM = vec3(0.961, 0.941, 0.902);

    float hash(vec2 v) { return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
    float outQuart(float x) { return 1.0 - pow(1.0 - x, 4.0); }

    // Courses of stone laid left to right, then lifted away in the same order.
    vec4 bricks(vec2 uv) {
      const float ROWS = 6.0;
      const float COLS = 8.0;
      float row = floor(uv.y * ROWS);
      float shift = mod(row, 2.0) * 0.5;
      float x = uv.x * COLS + shift;
      vec2 cell = vec2(floor(x), row);
      vec2 f = vec2(fract(x), fract(uv.y * ROWS)) - 0.5;
      float across = (cell.x + 0.5 - shift) / COLS;
      float delay = across * 0.6 + hash(cell) * 0.3;
      float laid = p < 0.5 ? clamp(p * 3.8 - delay, 0.0, 1.0) : 1.0 - clamp((p - 0.5) * 3.8 - delay, 0.0, 1.0);
      float size = outQuart(laid) * 0.5;
      vec2 px = vec2(RES.x / COLS, RES.y / ROWS);
      vec2 d = (abs(f) - size) * px;
      float a = laid >= 1.0 ? 1.0 : clamp(0.5 - max(d.x, d.y), 0.0, 1.0);
      float pick = hash(cell + 7.0);
      vec3 colour = pick > 0.78 ? GOLD_LIGHT : pick < 0.14 ? INK : GOLD;
      return vec4(colour, a);
    }

    // A slanted ink panel with a gold leading edge crosses the frame, and takes the old slide with it.
    vec4 sweep(vec2 uv) {
      float x = uv.x + 0.2 * (1.0 - uv.y);
      float front = p < 0.5 ? pow(p * 2.0, 3.0) * 1.6 - 0.2 : outQuart((p - 0.5) * 2.0) * 1.6 - 0.2;
      float d = (p < 0.5 ? front - x : x - front) * RES.x;
      float a = clamp(d + 0.5, 0.0, 1.0);
      vec3 colour = d < 0.11 * RES.x ? (d < 0.045 * RES.x ? GOLD_LIGHT : GOLD) : INK;
      return vec4(colour, a);
    }

    // The mark's four stones grow from the centre until they fill the frame, then part.
    vec4 mark(vec2 uv) {
      vec2 d = (uv - vec2(0.5, 0.42)) * RES;
      vec3 colour = d.x < 0.0 ? (d.y > 0.0 ? GOLD : INK) : (d.y > 0.0 ? INK : INK_LIFT);
      vec2 q = abs(d);
      float a;
      if (p < 0.5) {
        float g = pow(p * 2.0, 3.0);
        float gap = (1.0 - g) * 26.0 * g;
        vec2 reach = vec2(RES.x, RES.x) * 0.62 * g;
        a = clamp(min(min(q.x, q.y) - gap, min(reach.x - q.x, reach.y - q.y)) + 0.5, 0.0, 1.0);
      } else {
        float away = outQuart((p - 0.5) * 2.0) * RES.x * 0.56;
        a = clamp(min(q.x, q.y) - away + 0.5, 0.0, 1.0);
      }
      return vec4(colour, a);
    }

    void main() {
      vec2 uv = vec2(gl_FragCoord.x / RES.x, 1.0 - gl_FragCoord.y / RES.y);
      vec4 c = kind == 1 ? bricks(uv) : kind == 2 ? sweep(uv) : mark(uv);
      gl_FragColor = vec4(c.rgb * c.a, c.a);
    }
  `;

  /** Sets up the transition layer and returns draw(kind, p), or null where WebGL is unavailable. */
  function transitions(canvas) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, 'attribute vec2 corner; void main() { gl_Position = vec4(corner, 0.0, 1.0); }'],
      [gl.FRAGMENT_SHADER, GLSL],
    ]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) errors.push(`GLSL: ${gl.getShaderInfoLog(shader)}`);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.bindAttribLocation(program, 0, 'corner');
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const p = gl.getUniformLocation(program, 'p');
    const kind = gl.getUniformLocation(program, 'kind');
    gl.clearColor(0, 0, 0, 0);
    return (k, progress) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!k || progress <= 0 || progress >= 1) return;
      gl.uniform1i(kind, k);
      gl.uniform1f(p, progress);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  }

  // ── The frame ─────────────────────────────────────────────────────────────────────────────────
  const canvas = (id) => {
    const el = document.createElement('canvas');
    el.id = id;
    el.width = W;
    el.height = H;
    return el;
  };
  const field = canvas('film-field');
  const wipes = canvas('film-wipes');
  body.prepend(field);
  body.append(wipes);
  let drawField = null;
  const drawWipe = transitions(wipes);
  if (!drawWipe) errors.push('WebGL is unavailable: the transitions cannot draw');

  let fit = 1;
  function layout() {
    // ?render=1 (the video builder) pins the scale: headless windows misreport their size.
    fit = RENDER ? 1 : Math.min(window.innerWidth / W, window.innerHeight / H);
    document.documentElement.style.setProperty('--fit', String(fit));
  }

  let shown = -1;
  function seek(time) {
    const t = clamp(time, 0, DURATION);
    let i = 0;
    while (i + 1 < scenes.length && scenes[i + 1].start <= t) i++;
    if (i !== shown) scenes.forEach((s, j) => s.el.classList.toggle('active', j === i));
    shown = i;
    const scene = scenes[i];
    for (const move of scene.moves) move(t);

    // A slow push in on every slide, about its centre (the slide's own transform is its fit scale).
    const end = scenes[i + 1]?.start ?? DURATION;
    const push = 1 + 0.035 * prog(t, scene.start, end - scene.start);
    scene.el.style.scale = push.toFixed(5);
    scene.el.style.translate = `${(-(push - 1) * (W / 2) * fit).toFixed(2)}px ${(-(push - 1) * (H / 2) * fit).toFixed(2)}px`;

    // For styles that follow the music (the bullets' stones swell with it).
    body.style.setProperty('--beat', beatPulse(t).toFixed(4));

    drawField?.(t, scene.dark ? 1 : 0);
    // Before the cut the next slide's transition covers this one; after it, this slide's uncovers it.
    const next = scenes[i + 1];
    if (next && t > next.start - COVER) drawWipe?.(next.kind, 0.5 * prog(t, next.start - COVER, COVER));
    else drawWipe?.(scene.kind, i === 0 ? 1 : 0.5 + 0.5 * prog(t, scene.start, REVEAL));
    return drawField?.settled();
  }

  const FILM = (window.FILM = {
    duration: DURATION,
    schedule: scenes.map((s, i) => ({ id: s.el.id, start: s.start, end: scenes[i + 1]?.start ?? DURATION })),
    errors,
    seek,
    ready: Promise.all([document.fonts.ready, background(field).then((draw) => (drawField = draw))]).then(() => {
      // The live deck falls back to a plain ground without WebGPU; a render must not.
      if (!drawField) (RENDER ? errors : []).push('WebGPU is unavailable: the background cannot draw');
      body.classList.toggle('no-webgpu', !drawField);
      layout();
      seek(Number(query.get('t')) || 0);
      body.classList.add('ready');
    }),
  });
  if (RENDER) {
    document.documentElement.classList.add('render');
    return;
  }

  // ── Live playback: the narration and the music, with the page following the narration's clock ──
  const narration = new Audio(body.dataset.narration);
  const music = body.dataset.music ? new Audio(body.dataset.music) : null;
  if (music) music.volume = Math.pow(10, Number(body.dataset.musicDb ?? -10.8) / 20);
  let origin = null; // performance.now() at film time 0 while playing
  let paused = Number(query.get('t')) || 0;
  const now = () => (origin === null ? paused : Math.min(DURATION, (performance.now() - origin) / 1000));

  const play = document.createElement('button');
  play.id = 'film-play';
  play.type = 'button';
  play.textContent = '▶ Play';
  play.setAttribute('aria-label', 'Play the video');
  body.append(play);

  function start(from) {
    paused = from >= DURATION ? 0 : from;
    origin = performance.now() - paused * 1000;
    for (const track of [narration, music]) {
      if (!track) continue;
      track.currentTime = Math.min(paused, track.duration || paused);
      if (paused < (track.duration || Infinity)) track.play().catch(() => {});
    }
    play.hidden = true;
  }
  function stop() {
    paused = now();
    origin = null;
    narration.pause();
    music?.pause();
    play.hidden = false;
  }
  const toggle = () => (origin === null ? start(paused) : stop());
  play.addEventListener('click', toggle);
  window.addEventListener('resize', layout);
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') toggle();
    const here = FILM.schedule.findIndex((s) => now() < s.end);
    if (['ArrowRight', 'PageDown'].includes(e.key)) start(FILM.schedule[Math.min(scenes.length - 1, here + 1)].start);
    if (['ArrowLeft', 'PageUp'].includes(e.key)) start(FILM.schedule[Math.max(0, here - 1)].start);
  });
  const loop = () => {
    if (origin !== null && now() >= DURATION) stop();
    seek(now());
    requestAnimationFrame(loop);
  };
  FILM.ready.then(loop);
})();
