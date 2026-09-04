/* Portrait reveal.
 *
 * The headshot first arrives as if it had been observed by an integral field
 * unit: hexagonal spaxels on a fibre pitch, per-spaxel read noise, and a
 * scatter of dead fibres. Once somebody has actually been looking at the page
 * for a few seconds, the dead spaxels are filled in and the mosaic resolves
 * into the photograph — the way a spectrospatial model infers the truth
 * behind the data.
 *
 * Progressive enhancement throughout: the markup is a plain <img>, and if this
 * script never loads, bails, or hits an error, that photograph is simply what
 * stays on the page. Skipped entirely under prefers-reduced-motion.
 */
(function () {
    "use strict";

    if (!window.matchMedia || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* --- tuning -------------------------------------------------------- */

    var DWELL_MS = 2600;    // active viewing before the reveal starts
    var PITCH = 13;         // target spaxel pitch, CSS px
    var MIN_ACROSS = 11;
    var MAX_ACROSS = 20;
    var FILL = 0.9;         // hex size vs. cell; < 1 leaves fibre gaps
    var DEAD_FRAC = 0.05;   // scattered dead fibres
    var DEAD_PATCHES = 2;   // plus a couple of clustered failures
    var NOISE = 0.075;      // per-spaxel read noise, fraction of full scale

    var INFER_STAGGER = 450; // phase 1: dead spaxels are filled in
    var INFER_TILE = 400;
    var WAVE_MS = 900;       // phase 2: the mosaic dissolves into the photo,
    var RESOLVE_TILE = 520;  //          as a wave running out from the centre

    var INFER_MS = INFER_STAGGER + INFER_TILE;
    var TOTAL_MS = INFER_MS + WAVE_MS + RESOLVE_TILE + 80;

    var VISIBLE_RATIO = 0.45;

    /* --- helpers ------------------------------------------------------- */

    function clamp01(t) {
        return t < 0 ? 0 : t > 1 ? 1 : t;
    }

    function ease(t) {
        t = clamp01(t);
        return t * t * (3 - 2 * t);
    }

    // Cheap approximately-normal deviate; good enough for read noise.
    function gauss() {
        return (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    }

    function byte(v) {
        return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }

    function hexPath(ctx, x, y, r) {
        ctx.beginPath();
        for (var k = 0; k < 6; k++) {
            var a = k * Math.PI / 3;   // flat-top, matching the site mark
            var px = x + r * Math.cos(a);
            var py = y + r * Math.sin(a);
            if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
    }

    function cssVar(name, fallback) {
        var v = getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim();
        return v || fallback;
    }

    /* --- one portrait -------------------------------------------------- */

    function observe(img) {
        var rect = img.getBoundingClientRect();
        var w = rect.width, h = rect.height;
        if (!w || !h || !img.naturalWidth) return;

        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = Math.round(w * dpr), H = Math.round(h * dpr);

        /* Sample the photograph off-screen. Same-origin, so this is readable;
           if it ever is not, we leave the plain photo alone. */
        var src = document.createElement("canvas");
        src.width = W;
        src.height = H;
        var sctx = src.getContext("2d");
        if (!sctx) return;

        // Reproduce object-fit: cover, so the mosaic lines up with the photo.
        var scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
        var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
        var ox = (W - dw) / 2, oy = (H - dh) / 2;
        sctx.drawImage(img, ox, oy, dw, dh);

        var data;
        try {
            data = sctx.getImageData(0, 0, W, H).data;
        } catch (e) {
            return;
        }

        /* Hexagonal fibre bundle over the portrait. Flat-top hexes of
           circumradius R tile at 1.5R horizontally and R*sqrt(3) vertically,
           with alternate columns offset by half a row. */
        var across = Math.max(MIN_ACROSS,
            Math.min(MAX_ACROSS, Math.round(w / PITCH)));
        var R = W / (1.5 * across + 0.5);
        var colStep = 1.5 * R;
        var rowStep = Math.sqrt(3) * R;
        var midX = W / 2, midY = H / 2;
        var radius = W / 2;
        var sampleR = R * 0.75;
        var step = Math.max(1, Math.round(sampleR / 2));

        var tiles = [];
        var cols = Math.ceil((W + 2 * R) / colStep) + 1;
        var rows = Math.ceil((H + 2 * rowStep) / rowStep) + 1;

        for (var ci = 0; ci < cols; ci++) {
            var x = -R + ci * colStep;
            var yOff = (ci % 2) ? rowStep / 2 : 0;
            for (var ri = 0; ri < rows; ri++) {
                var y = -rowStep + yOff + ri * rowStep;
                var dist = Math.sqrt((x - midX) * (x - midX) + (y - midY) * (y - midY));
                if (dist > radius + R) continue;

                var rt = 0, gt = 0, bt = 0, n = 0;
                var y0 = Math.round(y - sampleR), y1 = y + sampleR;
                var x0 = Math.round(x - sampleR), x1 = x + sampleR;
                for (var sy = y0; sy <= y1; sy += step) {
                    if (sy < 0 || sy >= H) continue;
                    for (var sx = x0; sx <= x1; sx += step) {
                        if (sx < 0 || sx >= W) continue;
                        var i = (sy * W + sx) * 4;
                        rt += data[i];
                        gt += data[i + 1];
                        bt += data[i + 2];
                        n++;
                    }
                }
                if (!n) continue;

                // Read noise is close enough to achromatic: one draw per spaxel.
                var noise = gauss() * NOISE * 255;
                tiles.push({
                    x: x,
                    y: y,
                    css: "rgb(" + byte(rt / n + noise) + "," +
                        byte(gt / n + noise) + "," +
                        byte(bt / n + noise) + ")",
                    dead: Math.random() < DEAD_FRAC,
                    delay: Math.random() * INFER_STAGGER,
                    wave: clamp01(dist / (radius + R)) * WAVE_MS
                });
            }
        }
        if (!tiles.length) return;

        // A couple of clustered failures, which is how fibres actually die.
        for (var p = 0; p < DEAD_PATCHES; p++) {
            var seed = tiles[Math.floor(Math.random() * tiles.length)];
            var reach = R * (1.4 + Math.random());
            for (var q = 0; q < tiles.length; q++) {
                var t = tiles[q];
                var ddx = t.x - seed.x, ddy = t.y - seed.y;
                if (Math.sqrt(ddx * ddx + ddy * ddy) <= reach) t.dead = true;
            }
        }

        /* The canvas stands in for the <img> while the portrait resolves. It
           copies the class list so every rule that shaped the photograph —
           the circle, the border, the absolute placement in the left margin
           on the About page — applies to it unchanged. */
        var canvas = document.createElement("canvas");
        canvas.className = img.className + " spaxel-canvas";
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", img.alt || "");

        var ctx = canvas.getContext("2d");
        if (!ctx) return;

        var ground = cssVar("--bg-deep", "#070a11");
        var line = cssVar("--line-strong", "#2d3a5c");
        var accent = cssVar("--accent", "#79cfc4");
        var hexR = R * FILL;
        var stroke = Math.max(1, dpr * 0.7);

        function draw(elapsed) {
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = ground;
            ctx.fillRect(0, 0, W, H);

            var resolveT = elapsed - INFER_MS;
            if (resolveT > 0) ctx.drawImage(img, ox, oy, dw, dh);

            for (var i = 0; i < tiles.length; i++) {
                var t = tiles[i];

                // Phase 2: this spaxel dissolves, uncovering the photograph.
                var cover = resolveT > 0
                    ? 1 - ease((resolveT - t.wave) / RESOLVE_TILE)
                    : 1;
                if (cover <= 0.002) continue;

                // Phase 1: dead spaxels are inferred back in.
                var filled = t.dead
                    ? ease((elapsed - t.delay) / INFER_TILE)
                    : 1;

                if (filled < 1) {
                    ctx.globalAlpha = (1 - filled) * 0.45 * cover;
                    ctx.strokeStyle = line;
                    ctx.lineWidth = stroke;
                    hexPath(ctx, t.x, t.y, hexR);
                    ctx.stroke();
                }

                if (filled > 0) {
                    hexPath(ctx, t.x, t.y, hexR);
                    ctx.globalAlpha = filled * cover;
                    ctx.fillStyle = t.css;
                    ctx.fill();

                    // Inferred spaxels glow in the accent as they arrive.
                    if (t.dead && filled < 1) {
                        ctx.globalAlpha = Math.sin(filled * Math.PI) * 0.5 * cover;
                        ctx.fillStyle = accent;
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        /* --- run it ---------------------------------------------------- */

        var raf = 0, lastTs = 0, dwell = 0, elapsed = 0;
        var running = false, done = false, seen = false;

        function stop() {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
        }

        function finish() {
            stop();
            done = true;
            if (canvas.parentNode) canvas.replaceWith(img);
        }

        function frame(ts) {
            raf = requestAnimationFrame(frame);
            if (!lastTs) lastTs = ts;
            var dt = Math.min(ts - lastTs, 50);
            lastTs = ts;

            if (!running) {
                dwell += dt;
                if (dwell < DWELL_MS) return;
                running = true;
            }

            elapsed += dt;
            draw(elapsed);
            if (elapsed >= TOTAL_MS) finish();
        }

        // Only count time when the tab is open and the portrait is on screen.
        function pump() {
            if (done) return;
            var active = seen && document.visibilityState === "visible";
            if (active && !raf) {
                lastTs = 0;
                raf = requestAnimationFrame(frame);
            } else if (!active) {
                stop();
            }
        }

        draw(0);
        img.replaceWith(canvas);

        new IntersectionObserver(function (entries) {
            seen = entries[entries.length - 1].intersectionRatio >= VISIBLE_RATIO;
            pump();
        }, { threshold: [0, VISIBLE_RATIO, 1] }).observe(canvas);

        document.addEventListener("visibilitychange", pump);

        /* A layout change would leave the canvas the wrong size, and it is
           only ever a stand-in — so hand the real photograph back instead.
           Width, not height, because mobile browsers fire resize whenever the
           URL bar collapses. */
        window.addEventListener("resize", function () {
            if (done) return;
            if (Math.abs(canvas.getBoundingClientRect().width - w) > 1) finish();
        });
    }

    function start(img) {
        try {
            observe(img);
        } catch (e) {
            /* leave the photograph as it is */
        }
    }

    Array.prototype.forEach.call(
        document.querySelectorAll("img[data-spaxel]"),
        function (img) {
            if (img.complete && img.naturalWidth) start(img);
            else img.addEventListener("load", function () { start(img); }, { once: true });
        }
    );
}());
