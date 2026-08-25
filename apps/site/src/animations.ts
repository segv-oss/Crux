import { animate, createTimeline, stagger, utils } from 'animejs';

type AnimLike = {
  revert?: () => void;
  pause?: () => void;
  play?: () => void;
};

const norm = (result: unknown): AnimLike[] =>
  (Array.isArray(result) ? result : [result]) as AnimLike[];

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const q = <T extends Element>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll<T>(sel));

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function onEnter(
  root: Element,
  threshold: number,
  run: () => AnimLike[],
  opts: { once?: boolean; pauseResume?: boolean } = {},
): () => void {
  const anims: AnimLike[] = [];
  let built = false;
  const { once = true, pauseResume = false } = opts;

  const build = () => {
    if (built) return;
    built = true;
    anims.push(...norm(run()));
    if (pauseResume) for (const a of anims) a.pause?.();
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          build();
          for (const a of anims) a.play?.();
          if (once) io.disconnect();
        } else if (pauseResume) {
          for (const a of anims) a.pause?.();
        }
      }
    },
    { threshold },
  );
  io.observe(root);
  return () => {
    io.disconnect();
    for (const a of anims) {
      a.pause?.();
      a.revert?.();
    }
  };
}

function initHero(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#hero');
  if (!root) return null;
  const cleanups: Array<() => void> = [];

  const reveal = onEnter(
    root,
    0.2,
    () => {
      const texts = q<HTMLElement>(root, '[data-h]');
      const markImg = root.querySelector<HTMLElement>('[data-mark-img]');
      const prehidden = document.documentElement.classList.contains('anim');
      if (!prehidden) return [];

      const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 600 } });
      tl.add(texts, { opacity: [0, 1], translateY: [24, 0], delay: stagger(85) });
      if (markImg) {
        tl.add(
          markImg,
          {
            opacity: [0, 1],
            scale: [0.7, 1],
            rotate: [-14, 0],
            duration: 900,
            ease: 'outBack(1.4)',
          },
          '-=600',
        );
      }
      return [tl];
    },
    { once: true },
  );
  if (reveal) cleanups.push(reveal);

  const mark = root.querySelector<HTMLElement>('[data-mark]');
  if (mark && matchMedia('(pointer: fine)').matches && !reduced()) {
    const img = mark.querySelector<HTMLElement>('[data-mark-img]');
    const ring = mark.querySelector<HTMLElement>('[data-mark-ring]');
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const step = () => {
      cx = lerp(cx, tx, 0.08);
      cy = lerp(cy, ty, 0.08);
      mark.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(cx - tx) > 0.05 || Math.abs(cy - ty) > 0.05) {
        raf = requestAnimationFrame(step);
      } else {
        raf = 0;
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      const r = mark.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      tx = nx * 12;
      ty = ny * 12;
      schedule();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      schedule();
      if (img) animate(img, { scale: 1, duration: 450, ease: 'outExpo' });
    };
    const onEnterMark = () => {
      if (img) animate(img, { scale: 1.05, rotate: -3, duration: 400, ease: 'outExpo' });
    };
    let bursting = false;
    const onClick = () => {
      if (bursting) return;
      bursting = true;
      const tl = createTimeline({
        defaults: { ease: 'outExpo' },
        onComplete: () => {
          bursting = false;
        },
      });
      if (img) {
        tl.add(img, { scale: [1.05, 0.96], duration: 140, ease: 'outQuad' }).add(img, {
          scale: [0.96, 1.05],
          rotate: [0, -3],
          duration: 600,
          ease: 'outBack(1.7)',
        });
      }
      if (ring) {
        tl.add(
          ring,
          { scale: [0.5, 2.2], opacity: [0.7, 0], duration: 700, ease: 'outQuad' },
          '-=600',
        );
      }
    };

    mark.addEventListener('pointermove', onMove);
    mark.addEventListener('pointerenter', onEnterMark);
    mark.addEventListener('pointerleave', onLeave);
    mark.addEventListener('click', onClick);
    cleanups.push(() => {
      mark.removeEventListener('pointermove', onMove);
      mark.removeEventListener('pointerenter', onEnterMark);
      mark.removeEventListener('pointerleave', onLeave);
      mark.removeEventListener('click', onClick);
      if (raf) cancelAnimationFrame(raf);
      mark.style.transform = '';
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

function initProblem(): (() => void) | null {
  const track = document.querySelector<HTMLElement>('[data-ps-track]');
  if (!track) return null;

  const nodes = new Map<string, HTMLElement>();
  for (const el of q<HTMLElement>(track, '[data-ps]')) {
    if (el.dataset.ps) nodes.set(el.dataset.ps, el);
  }
  const lines = new Map<string, SVGLineElement>();
  for (const el of q<SVGLineElement>(track, '[data-ps-line]')) {
    if (el.dataset.psLine) lines.set(el.dataset.psLine, el);
  }

  const WINS = [
    { key: 'slack', x: -1, y: -0.85, r: -5, rx: -120, ry: -42, rr: -6 },
    { key: 'linear', x: 1, y: -0.55, r: 4, rx: 120, ry: -30, rr: 5 },
    { key: 'github', x: -0.75, y: 1, r: -3, rx: 0, ry: 58, rr: -2.5 },
  ];
  const PAIRS: Array<[string, string]> = [
    ['slack', 'linear'],
    ['linear', 'github'],
    ['github', 'slack'],
  ];

  const apply = (p: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dx = Math.min(w * 0.3, 460);
    const dy = Math.min(h * 0.27, 320);
    const sc = easeOutCubic(seg(p, 0.04, 0.5));
    const sn = seg(p, 0.5, 0.62);
    const cv = easeOutCubic(seg(p, 0.66, 0.96));

    const centers: Record<string, { x: number; y: number }> = {};
    for (const win of WINS) {
      const el = nodes.get(win.key);
      if (!el) continue;
      const x = lerp(win.rx, win.x * dx, sc) * (1 - cv);
      const y = lerp(win.ry, win.y * dy, sc) * (1 - cv);
      const rot = lerp(win.rr, win.r, sc) * (1 - cv);
      centers[win.key] = { x: w / 2 + x, y: h / 2 + y };
      const s = lerp(1.06, 0.94, sc) * lerp(1, 0.55, cv);
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${s})`;
      el.style.opacity = `${clamp01(1 - cv * 1.1)}`;
    }

    PAIRS.forEach(([a, b], i) => {
      const line = lines.get(`${a}-${b}`);
      const chip = nodes.get(`chip-${i}`);
      const ca = centers[a];
      const cb = centers[b];
      if (!ca || !cb) return;
      if (line) {
        const len = Math.hypot(cb.x - ca.x, cb.y - ca.y);
        line.setAttribute('x1', `${ca.x}`);
        line.setAttribute('y1', `${ca.y}`);
        line.setAttribute('x2', `${cb.x}`);
        line.setAttribute('y2', `${cb.y}`);
        line.style.strokeDasharray = `${len}`;
        line.style.strokeDashoffset = `${len * (1 - sc)}`;
        line.style.opacity = `${(sc * (1 - sn)).toFixed(3)}`;
      }
      if (chip) {
        chip.style.left = `${(ca.x + cb.x) / 2}px`;
        chip.style.top = `${(ca.y + cb.y) / 2}px`;
        chip.style.opacity = `${(sn * (1 - clamp01(cv * 1.8))).toFixed(3)}`;
        chip.style.transform = `translate(-50%, -50%) scale(${lerp(0.7, 1, sn)})`;
      }
    });

    const frame = nodes.get('frame');
    if (frame) {
      frame.style.opacity = `${cv}`;
      frame.style.transform = `translate(-50%, -50%) scale(${lerp(0.9, 1, cv)})`;
    }
    const point = nodes.get('point');
    point?.style.setProperty('opacity', `${cv}`);
    const cols = nodes.get('frame-cols');
    if (cols) {
      cols.style.opacity = `${cv}`;
      cols.style.transform = `translateY(${(1 - cv) * 12}px)`;
    }

    const ha = nodes.get('ha');
    if (ha) {
      const fade = seg(p, 0.55, 0.68);
      ha.style.opacity = `${1 - fade}`;
      ha.style.transform = `translateY(${-14 * fade}px)`;
    }
    const hb = nodes.get('hb');
    if (hb) {
      const inc = seg(p, 0.72, 0.86);
      hb.style.opacity = `${inc}`;
      hb.style.transform = `translateY(${(1 - inc) * 18}px)`;
    }

    for (let i = 0; i < 3; i++) {
      const stat = nodes.get(`stat-${i}`);
      if (!stat) continue;
      const inc = seg(p, 0.28 + i * 0.07, 0.4 + i * 0.07);
      stat.style.opacity = `${inc * (1 - cv)}`;
      stat.style.transform = `translateY(${(1 - inc) * 14}px)`;
    }
  };

  if (reduced()) {
    apply(1);
    return null;
  }

  let raf = 0;
  let active = false;
  const tick = () => {
    if (!active) return;
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = total > 0 ? clamp01(-rect.top / total) : 1;
    apply(p);
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !active) {
          active = true;
          raf = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && active) {
          active = false;
          cancelAnimationFrame(raf);
        }
      }
    },
    { rootMargin: '10% 0px' },
  );
  io.observe(track);
  apply(0);
  return () => {
    active = false;
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}

function initCockpit(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#cockpit');
  if (!root) return null;
  return onEnter(
    root,
    0.25,
    () => {
      const diffs = q<HTMLElement>(root, '[data-cx="diff"]');
      const comment = q<HTMLElement>(root, '[data-cx="comment"]');
      const slack = q<HTMLElement>(root, '[data-cx="slack"]');
      const linOld = q<HTMLElement>(root, '[data-cx="lin-old"]');
      const linNew = q<HTMLElement>(root, '[data-cx="lin-new"]');
      const ciPending = q<HTMLElement>(root, '[data-cx="ci-pending"]');
      const ciPass = q<HTMLElement>(root, '[data-cx="ci-pass"]');
      const brief = q<HTMLElement>(root, '[data-cx="brief"]');
      const bullets = q<HTMLElement>(root, '[data-cx="bullet"]');
      const spinner = q<HTMLElement>(root, '[data-cx="spinner"]');

      const feed = [...slack, ...ciPending, ...ciPass, ...linOld, ...linNew, ...brief];
      utils.set(diffs, { opacity: 0, translateY: 8 });
      utils.set(comment, { opacity: 0, scale: 0.92 });
      utils.set(feed, { opacity: 0, translateY: 10 });
      utils.set(bullets, { opacity: 0, translateX: -8 });

      const spin = animate(spinner, { rotate: 360, duration: 900, ease: 'linear', loop: true });

      const tl = createTimeline({
        defaults: { ease: 'outExpo', duration: 420 },
        loop: true,
        loopDelay: 1400,
      });
      tl.add(diffs, { opacity: [0, 1], translateY: [8, 0], delay: stagger(80), duration: 320 })
        .add(comment, { opacity: [0, 1], scale: [0.92, 1] }, '-=120')
        .add(slack, { opacity: [0, 1], translateY: [10, 0] }, '+=150')
        .add(linOld, { opacity: [0, 1], translateY: [10, 0] }, '-=250')
        .add(linNew, { opacity: [0, 1], translateY: [10, 0] }, '+=350')
        .add(linOld, { opacity: [1, 0], translateY: [0, -10], duration: 300 }, '<')
        .add(ciPending, { opacity: [0, 1], translateY: [10, 0] }, '+=250')
        .add(ciPass, { opacity: [0, 1], translateY: [10, 0] }, '+=1400')
        .add(ciPending, { opacity: [1, 0], duration: 250 }, '<')
        .add(brief, { opacity: [0, 1], translateY: [10, 0], duration: 450 }, '+=200')
        .add(bullets, { opacity: [0, 1], translateX: [-8, 0], delay: stagger(140) }, '-=150')
        .add(root, { opacity: [1, 1], duration: 1500 });
      return [tl, spin];
    },
    { once: false, pauseResume: true },
  );
}

function initBriefs(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#briefs');
  if (!root) return null;
  return onEnter(root, 0.2, () => {
    const rows = q<HTMLElement>(root, '[data-b="row"]');
    const lines = q<HTMLElement>(root, '[data-b="line"]');
    const marks = q<HTMLElement>(root, '[data-b="mark"]');
    const card = q<HTMLElement>(root, '[data-b="card"]');
    const bullets = q<HTMLElement>(root, '[data-b="bullet"]');

    utils.set(rows, { opacity: 0, translateY: 18 });
    utils.set(lines, { opacity: 0, translateY: 8 });
    utils.set(marks, { opacity: 0 });
    utils.set(card, { opacity: 0, translateY: 16, scale: 0.96 });
    utils.set(bullets, { opacity: 0, translateX: -8 });

    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 500 } });
    tl.add(rows, { opacity: [0, 1], translateY: [18, 0], delay: stagger(90) })
      .add(
        lines,
        { opacity: [0, 1], translateY: [8, 0], delay: stagger(70), duration: 350 },
        '-=600',
      )
      .add(marks, { opacity: [0, 1], duration: 300, delay: stagger(350) }, '-=200')
      .add(card, { opacity: [0, 1], translateY: [16, 0], scale: [0.96, 1], duration: 550 }, '-=150')
      .add(bullets, { opacity: [0, 1], translateX: [-8, 0], delay: stagger(130), duration: 380 });
    return [tl];
  });
}

function initSandbox(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#sandbox');
  if (!root) return null;
  return onEnter(root, 0.2, () => {
    const copy = q<HTMLElement>(root, '[data-s="copy"]');
    const chars = q<HTMLElement>(root, '[data-s="char"]');
    const out = q<HTMLElement>(root, '[data-s="out"]');

    utils.set(copy, { opacity: 0, translateY: 18 });
    utils.set(chars, { opacity: 0 });
    utils.set(out, { opacity: 0 });

    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    tl.add(copy, { opacity: [0, 1], translateY: [18, 0], delay: stagger(100), duration: 550 })
      .add(chars, { opacity: [0, 1], delay: stagger(22), duration: 1, ease: 'linear' }, '+=250')
      .add(out, { opacity: [0, 1], duration: 400 }, '+=150');
    return [tl];
  });
}

function initIntegrations(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#integrations');
  if (!root) return null;
  return onEnter(root, 0.2, () => {
    const line = q<HTMLElement>(root, '[data-i="line"]');
    const marks = q<HTMLElement>(root, '[data-i="mark"]');
    const caption = q<HTMLElement>(root, '[data-i="caption"]');

    utils.set(line, { scaleX: 0 });
    utils.set(marks, { opacity: 0, scale: 0.7 });
    utils.set(caption, { opacity: 0, translateY: 12 });

    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 550 } });
    tl.add(line, { scaleX: [0, 1], duration: 700, ease: 'inOutQuad' })
      .add(marks, { opacity: [0, 1], scale: [0.7, 1], delay: stagger(130) }, '-=350')
      .add(caption, { opacity: [0, 1], translateY: [12, 0] }, '-=200');
    return [tl];
  });
}

function initCTA(): (() => void) | null {
  const root = document.querySelector<HTMLElement>('#cta');
  if (!root) return null;
  return onEnter(root, 0.2, () => {
    const items = q<HTMLElement>(root, '[data-c]');
    utils.set(items, { opacity: 0, translateY: 22 });
    const tl = createTimeline({ defaults: { ease: 'outExpo', duration: 650 } });
    tl.add(items, { opacity: [0, 1], translateY: [22, 0], delay: stagger(110) });
    return [tl];
  });
}

export function initLanding(): () => void {
  const cleanups: Array<() => void> = [];
  if (reduced()) return () => {};

  const registrars = [
    initHero,
    initProblem,
    initCockpit,
    initBriefs,
    initSandbox,
    initIntegrations,
    initCTA,
  ];
  for (const registrar of registrars) {
    const cleanup = registrar();
    if (cleanup) cleanups.push(cleanup);
  }
  return () => {
    for (const fn of cleanups) fn();
  };
}
