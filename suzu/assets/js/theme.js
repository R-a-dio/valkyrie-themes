// suzu theme easter egg test

const C = { // C(onfig)
  gravity: 0.2, bounce: 0.75, air: 0.998, groundFriction: 0.92, maxDtMs: 50, 
  initSpeedMin: 2.5, initSpeedMax: 5.0, spawnSpeedMin: 12.5, spawnSpeedMax: 13.5,
  minBalls: 2, maxBalls: 5, minSize: 25, maxSize: 75,
  minLaunch: Math.PI*0.15, maxLaunch: Math.PI*0.85,
  imageUrl: '/api/dj-image/50',
  minBounceVel: 0.9, separation: 0.5, damping: 0.8, upwardImpulse: 5
};
const rnd=(a,b)=>a+Math.random()*(b-a), rInt=(a,b)=>Math.floor(rnd(a,b+1));

const S = { balls:[], running:false, // S(tate)
  spawnBurst(x,y,count=rInt(C.minBalls,C.maxBalls), speedRange=[C.initSpeedMin,C.initSpeedMax], upward=C.upwardImpulse) {
    const arc = C.maxLaunch - C.minLaunch;
    for (let i=0; i < count; i++) {
      setTimeout(() => {
        const r = rnd(C.minSize,C.maxSize);
        const el = Object.assign(document.createElement('div'),{className:'ball pop'});
        el.style.setProperty('--d', (r*2)+'px');
        el.style.backgroundImage = `url(${C.imageUrl})`; el.style.backgroundSize='cover';

        const x0 = x + (Math.random()-0.5)*40, y0 = y + (Math.random()-0.5)*40;
        const t = (count>1)? i/(count-1) : 0.5;
        const angle = C.minLaunch + arc*t + (Math.random()-0.5)*0.25;   // random angle on spawn
        const sizeRatio = r / C.maxSize;
        const speed = rnd(...speedRange) * (1 + (1-sizeRatio)*0.5);     // random speed on spawn
        const vx = Math.cos(angle)*speed;
        const vy = -Math.abs(Math.sin(angle)*speed) - upward;

        const b = { el, x:x0, y:y0, vx, vy, r, rot:0 }; // b(all)
        document.body.appendChild(el);
        el.style.left = (b.x - b.r) + 'px';
        el.style.top  = (b.y - b.r) + 'px';
        S.balls.push(b);

        // balls also spawn balls
        el.addEventListener('click', e => {
          e.stopPropagation();
          b.vy -= C.upwardImpulse; // balls should pop upwards or it looks kinda bad
          S.spawnBurst(b.x, b.y, undefined, [C.spawnSpeedMin, C.spawnSpeedMax]);
          el.style.transform = 'scale(1.15)';
          setTimeout(()=>el.style.transform = '', 150);
        });

        setTimeout(()=>el.classList.remove('pop'), 300);
        if(!S.running){ S.running = true; S._last = performance.now(); requestAnimationFrame(S.loop); }
      }, i*30);
    }
  },

  // physics stuff
 loop(now) {
    if (!S._last) S._last = now || performance.now();
    let dtMs = (now || performance.now()) - S._last;
    S._last = now || performance.now();
    dtMs = Math.min(dtMs, C.maxDtMs);

    const baseline = 1000/60;   // 60fps sim
    const s = dtMs / baseline; 

    const B = S.balls, W = innerWidth, H = innerHeight;
    for (let i=0; i<B.length; i++) {
      const b = B[i];
      const sizeRatio = b.r / C.maxSize;

      b.vy += C.gravity * s * (0.8 + sizeRatio*0.4);    // gravity scaled by s

      const airMul = Math.pow(C.air, s);    // air drag
      b.vx *= airMul; b.vy *= airMul;

      b.rot += (b.vx / b.r) * s;
      b.x += b.vx * s;
      b.y += b.vy * s;

      // bounds
      if (b.x - b.r <= 0) { b.x = b.r; b.vx = Math.abs(b.vx) * C.bounce; }
      else if (b.x + b.r >= W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * C.bounce; }
      if (b.y - b.r <= 0) { b.y = b.r; b.vy = Math.abs(b.vy) * C.bounce; }
      else if (b.y + b.r >= H) {
        b.y = H - b.r; b.vy = -Math.abs(b.vy) * C.bounce;
        b.vx *= Math.pow(C.groundFriction, s);
        if (Math.abs(b.vy) < C.minBounceVel) b.vy = 0;
      }

      // clamp
      b.vx = Math.max(-1000, Math.min(1000, b.vx));
      b.vy = Math.max(-1000, Math.min(1000, b.vy));
    }

    // ball ball collisions
    for (let i=0; i<B.length; i++) {
      for (let j=i+1; j<B.length; j++) {
        const a=B[i], c=B[j];
        const dx=a.x-c.x, dy=a.y-c.y, dist=Math.hypot(dx,dy)||0.0001, minD=a.r+c.r;
        if (dist < minD) {
          const nx=dx/dist, ny=dy/dist, overlap=(minD-dist)*C.separation;
          a.x += nx*overlap; a.y += ny*overlap;
          c.x -= nx*overlap; c.y -= ny*overlap;

          const relV = (a.vx - c.vx)*nx + (a.vy - c.vy)*ny;
          if (relV < 0){
            const imp = relV * C.damping * s;
            a.vx -= imp*nx; a.vy -= imp*ny;
            c.vx += imp*nx; c.vy += imp*ny;
            // jitter to avoid break perfect stacking
            const rndf = 0.1;
            a.vx += (Math.random()-0.5)*rndf; a.vy += (Math.random()-0.5)*rndf;
            c.vx += (Math.random()-0.5)*rndf; c.vy += (Math.random()-0.5)*rndf;
          }
        }
      }
    }

    for (const b of B) {
      b.el.style.left = (b.x - b.r) + 'px';
      b.el.style.top  = (b.y - b.r) + 'px';
      b.el.style.transform = `rotate(${b.rot * (180/Math.PI)}deg)`;
    }

    if (S.balls.length) requestAnimationFrame(S.loop); else S.running = false;
  },
};

// attach click event to logo
document.addEventListener('click', function(event) {
    if (event.target.matches('img[src="/assets/images/logo_image_small.png"]')) {
        const r = event.target.getBoundingClientRect();
        S.spawnBurst(r.left + r.width / 2, r.top + r.height / 2);
    }
});