// Shared slide runtime for docs/videos/*/slides.html.
// One 1920x1080 <section> is visible at a time. Navigation: ?slide=N (1-based),
// #N, or the arrow keys. tools/video-build screenshots ?slide=N for every slide.
(function () {
  const body = document.body;
  const slides = Array.from(document.querySelectorAll('body > section'));
  const parts = (body.dataset.parts || '').split('|').filter(Boolean);
  const number = body.dataset.videoNumber || '';
  const title = body.dataset.videoTitle || '';

  // Progressive builds: <template id="x"> holding .item children, cloned into
  // <section data-template="x" data-show="N"> (first N visible) or
  // data-highlight="a-b" (items a..b focused, the rest dimmed).
  for (const s of slides) {
    const id = s.dataset.template;
    if (!id) continue;
    const tpl = document.getElementById(id);
    s.appendChild(tpl.content.cloneNode(true));
    const items = Array.from(s.querySelectorAll('.item'));
    if (s.dataset.show) {
      const n = Number(s.dataset.show);
      items.forEach((it, i) => it.classList.toggle('pending', i >= n));
    }
    if (s.dataset.highlight) {
      const [a, b] = s.dataset.highlight.split('-').map(Number);
      items.forEach((it, i) => {
        const on = i + 1 >= a && i + 1 <= (b || a);
        it.classList.toggle('focus', on);
        it.classList.toggle('dim', !on);
      });
    }
  }

  // Screen recordings: <section data-clip="clips/x.mp4"> plays the clip in a .clip box
  // (a <video> here; tools/video-build overlays the MP4 at the box's position instead).
  const renderMode = new URLSearchParams(location.search).has('render');
  for (const s of slides) {
    if (!s.dataset.clip) continue;
    s.classList.add('clip-slide');
    let box = s.querySelector('.clip');
    if (!box) {
      box = document.createElement('video');
      box.className = 'clip';
      s.prepend(box);
    }
    if (box.tagName === 'VIDEO' && !renderMode) {
      Object.assign(box, { src: s.dataset.clip, muted: true, loop: true, autoplay: true, playsInline: true });
    }
  }

  // Code: data-mark="2,5-7" highlights lines; // and # comments are dimmed.
  for (const pre of document.querySelectorAll('pre.code')) {
    const marks = new Set();
    for (const part of (pre.dataset.mark || '').split(',').filter(Boolean)) {
      const [a, b] = part.split('-').map(Number);
      for (let i = a; i <= (b || a); i++) marks.add(i);
    }
    const lines = pre.innerHTML.replace(/^\n/, '').replace(/\n\s*$/, '').split('\n');
    pre.innerHTML = lines
      .map((l, i) => {
        const cls = ['ln'];
        if (marks.has(i + 1)) cls.push('mark');
        if (/^\s*(\/\/|#(?!\w)|\/\*|\*)/.test(l)) cls.push('comment');
        return `<span class="${cls.join(' ')}">${l || ' '}</span>`;
      })
      .join('');
  }

  const chrome = document.createElement('header');
  chrome.className = 'chrome';
  chrome.innerHTML =
    '<span class="brand"><span class="dot"></span>Goodwork · Video ' +
    number +
    '</span><span class="part"></span><span class="count"></span>';
  body.prepend(chrome);
  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.innerHTML = parts.map(() => '<span></span>').join('');
  body.prepend(bar);

  const params = new URLSearchParams(location.search);
  if (params.has('render')) document.documentElement.classList.add('render');
  function fit() {
    // ?render=1 (the video builder) pins the scale: headless windows misreport their size.
    const k = params.has('render') ? 1 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--fit', String(k));
  }

  function show(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, j) => s.classList.toggle('active', j === i));
    const part = Number(slides[i].dataset.part || 0);
    chrome.querySelector('.part').textContent = parts[part] || '';
    chrome.querySelector('.count').textContent = i + 1 + ' / ' + slides.length;
    Array.from(bar.children).forEach((seg, j) => {
      seg.className = j < part ? 'done' : j === part ? 'now' : '';
    });
    body.classList.toggle('is-title', i === 0);
    current = i;
    document.title = 'Video ' + number + ' · ' + title + ' (' + (i + 1) + ')';
  }

  let current = 0;
  const q = params.get('slide');
  const h = location.hash.replace('#', '');
  show((Number(q || h) || 1) - 1);
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) show(current + 1);
    if (['ArrowLeft', 'PageUp'].includes(e.key)) show(current - 1);
    history.replaceState(null, '', '#' + (current + 1));
  });
  // ?audit=1 (tools/video-build --check): measure every slide for content that
  // overflows a code block or runs into the caption zone, and publish the
  // result on <body data-audit> for --dump-dom to read.
  if (params.has('audit')) {
    const problems = [];
    slides.forEach((s, i) => {
      show(i);
      const limit = 1080 - 150;
      for (const el of s.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.height && r.bottom > limit + 1) {
          problems.push({ slide: i + 1, id: s.id, issue: 'enters caption zone', el: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''), bottom: Math.round(r.bottom) });
          break;
        }
      }
      for (const el of s.querySelectorAll('pre, .card, td, .node')) {
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
          problems.push({ slide: i + 1, id: s.id, issue: 'clipped content', el: el.tagName.toLowerCase(), over: [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight] });
        }
      }
      if (s.scrollHeight > 1081) problems.push({ slide: i + 1, id: s.id, issue: 'slide taller than 1080', height: s.scrollHeight });
    });
    body.setAttribute('data-audit', JSON.stringify(problems));
    // Where each recording sits, for the builder's overlay.
    const clips = [];
    slides.forEach((s, i) => {
      if (!s.dataset.clip) return;
      show(i);
      const r = s.querySelector('.clip').getBoundingClientRect();
      clips.push({ slide: i + 1, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
    });
    body.setAttribute('data-clips', JSON.stringify(clips));
    show(0);
  }
  body.classList.add('ready');
})();
