/* Portrait reveal.
 *
 * The headshot first arrives as if it had been observed by an integral field
 * unit: a hexagonal bundle of hexagonal spaxels, per-spaxel read noise, and a
 * scatter of dead fibres. Once somebody has actually been looking at the page
 * for a few seconds the dead spaxels are inferred back in, and then each
 * spaxel resolves into its real pixels and grows just past the fibre gap, so
 * the mosaic knits into the photograph.
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
    var PITCH = 11;         // target fibre pitch, CSS px
    var MIN_ROWS = 4;       // lattice rows from the bundle centre to its edge
    /* Spaxel orientation. Turned 30 degrees from the bundle reads better at
       the size this is actually viewed at, so this wants to be the opposite
       of whichever way --hex-clip has the portrait facing. */
    var POINTY = false;
    var FILL = 0.9;         // hex size vs. cell; < 1 leaves fibre gaps
    var SEAL = 1.05;        // and > 1 closes them again once resolved
    var DEAD_FRAC = 0.055;  // dead fibres
    var PAIR_FRAC = 0.4;    // how often a dead fibre takes its neighbour too

    var INFER_STAGGER = 450; // phase 1: dead spaxels are filled in
    var INFER_TILE = 400;
    var HOLD_MS = 500;       // phase 2: a beat to take in the complete mosaic
    var SCATTER_MS = 1000;   // phase 3: spaxels resolve in a random order,
    var SEAL_MS = 300;       //          spread over this long, each one
                             //          taking SEAL_MS to seal

    var INFER_MS = INFER_STAGGER + INFER_TILE;
    var TOTAL_MS = INFER_MS + HOLD_MS + SCATTER_MS + SEAL_MS + 80;

    var VISIBLE_RATIO = 0.45;
    var ROOT3 = Math.sqrt(3);

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

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    // Appends to the current path; the caller owns beginPath, so a run of
    // these can be unioned into one clip.
    function addHex(ctx, x, y, r, turn) {
        for (var k = 0; k < 6; k++) {
            var a = k * Math.PI / 3 + turn;
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

        /* Fibres sit on a triangular lattice at `pitch` centre to centre, and
           each spaxel is that lattice point's cell: a hexagon of circumradius
           pitch/sqrt(3). Rotating the cells 30 degrees rotates the lattice
           with them, so both orientations come from one pair of basis
           vectors 60 degrees apart.

           A hexagon cannot be tiled by smaller hexagons, so the bundle edge
           is always stepped. What it can be is *in phase*: pick the pitch so
           a whole number of fibre rows spans the bundle's inradius and the
           edge falls along spaxel edges, cutting alternate ones cleanly in
           half instead of shaving every one of them by some random amount.
           The lattice is centred on the bundle centre and both have six-fold
           symmetry, so putting one edge in phase does all six. */
        /* The bundle is the hexagon the element is clipped to in CSS, so its
           orientation follows the box: taller than wide means pointy-top.
           Its inradius — centre to the middle of a flat edge — is then the
           short half-axis whichever way up it is. */
        var bundlePointy = H > W;
        var inradius = Math.min(W, H) / 2;
        /* Lattice step perpendicular to a bundle edge, as a fraction of the
           pitch: half a pitch when spaxels and bundle face the same way,
           sqrt(3)/2 when they are turned 30 degrees from each other. */
        var vunit = (POINTY === bundlePointy) ? 0.5 : ROOT3 / 2;
        var rows = Math.max(MIN_ROWS,
            Math.round(inradius / (PITCH * dpr * vunit)));
        var pitch = inradius / (rows * vunit);
        var R = pitch / ROOT3;
        var rot = POINTY ? Math.PI / 6 : 0;
        var spaxelTurn = rot;
        var a1x = pitch * Math.cos(rot + Math.PI / 6);
        var a1y = pitch * Math.sin(rot + Math.PI / 6);
        var a2x = pitch * Math.cos(rot + Math.PI / 2);
        var a2y = pitch * Math.sin(rot + Math.PI / 2);
        var midX = W / 2, midY = H / 2;
        var sampleR = R * 0.75;
        var step = Math.max(1, Math.round(sampleR / 2));

        /* Grow the bundle enough to pick up every spaxel that overlaps it —
           1.2 circumradii covers it whichever way the two are turned
           relative to each other — and let the CSS clip trim the overhang,
           the way a real bundle mask would. `along` runs toward a bundle
           vertex, `across` toward the middle of an edge. */
        var bundleA = Math.max(W, H) / 2 + R * 1.2;
        var bundleB = bundleA * ROOT3 / 2;
        function inBundle(x, y) {
            var px = Math.abs(x - midX), py = Math.abs(y - midY);
            var along = bundlePointy ? py : px;
            var across = bundlePointy ? px : py;
            return across <= bundleB && along / bundleA + across / (2 * bundleB) <= 1;
        }

        var tiles = [];
        var reach = Math.ceil(W / pitch) + 2;

        for (var ci = -reach; ci <= reach; ci++) {
            for (var ri = -reach; ri <= reach; ri++) {
                var x = midX + ci * a1x + ri * a2x;
                var y = midY + ci * a1y + ri * a2y;
                if (!inBundle(x, y)) continue;

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
                var noise = gauss() * 0.075 * 255;
                tiles.push({
                    x: x,
                    y: y,
                    css: "rgb(" + byte(rt / n + noise) + "," +
                        byte(gt / n + noise) + "," +
                        byte(bt / n + noise) + ")",
                    dead: false,
                    nb: [],
                    delay: Math.random() * INFER_STAGGER,
                    turn: Math.random() * SCATTER_MS
                });
            }
        }
        if (!tiles.length) return;

        /* Kill some fibres. The six neighbours of a hex sit at exactly
           sqrt(3)*R, so adjacency is a distance test with a little slack. */
        var near = R * ROOT3 * 1.12;
        for (var a1 = 0; a1 < tiles.length; a1++) {
            for (var a2 = a1 + 1; a2 < tiles.length; a2++) {
                var ax = tiles[a1].x - tiles[a2].x, ay = tiles[a1].y - tiles[a2].y;
                if (Math.sqrt(ax * ax + ay * ay) <= near) {
                    tiles[a1].nb.push(tiles[a2]);
                    tiles[a2].nb.push(tiles[a1]);
                }
            }
        }

        function deadNeighbours(t) {
            var c = 0;
            for (var k = 0; k < t.nb.length; k++) if (t.nb[k].dead) c++;
            return c;
        }

        /* Singles and pairs only, never a bigger blob: a fibre can only die
           if nothing beside it is already dead, and can only take a
           neighbour whose sole dead neighbour is itself. */
        var target = Math.round(tiles.length * DEAD_FRAC);
        for (var placed = 0, guard = 0; placed < target && guard < target * 60; guard++) {
            var seed = pick(tiles);
            if (seed.dead || deadNeighbours(seed)) continue;
            seed.dead = true;
            placed++;
            if (Math.random() >= PAIR_FRAC) continue;
            var mates = [];
            for (var m = 0; m < seed.nb.length; m++) {
                if (!seed.nb[m].dead && deadNeighbours(seed.nb[m]) === 1) {
                    mates.push(seed.nb[m]);
                }
            }
            if (mates.length) {
                pick(mates).dead = true;
                placed++;
            }
        }

        /* The canvas stands in for the <img> while the portrait resolves. It
           copies the class list so every rule that shaped the photograph —
           the hexagonal clip, the shadow, the absolute placement in the left
           margin on the About page — applies to it unchanged. */
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

            var resolveT = elapsed - INFER_MS - HOLD_MS;

            /* Everything that has resolved shows its real pixels, inside a
               hexagon grown just past the fibre gap so neighbours meet and
               the seams disappear. One clip and one draw for the lot. */
            if (resolveT > 0) {
                ctx.save();
                ctx.beginPath();
                var any = false;
                for (var i = 0; i < tiles.length; i++) {
                    var t = tiles[i];
                    if (resolveT <= t.turn) continue;
                    any = true;
                    var grow = ease((resolveT - t.turn) / SEAL_MS);
                    addHex(ctx, t.x, t.y, R * (FILL + (SEAL - FILL) * grow), spaxelTurn);
                }
                if (any) {
                    ctx.clip();
                    ctx.drawImage(img, ox, oy, dw, dh);
                }
                ctx.restore();
            }

            // Everything that has not: flat spaxel colour, or an empty socket.
            for (var j = 0; j < tiles.length; j++) {
                var s = tiles[j];
                if (resolveT > s.turn) continue;

                var filled = s.dead ? ease((elapsed - s.delay) / INFER_TILE) : 1;

                if (filled < 1) {
                    ctx.globalAlpha = (1 - filled) * 0.45;
                    ctx.strokeStyle = line;
                    ctx.lineWidth = stroke;
                    ctx.beginPath();
                    addHex(ctx, s.x, s.y, hexR, spaxelTurn);
                    ctx.stroke();
                }

                if (filled > 0) {
                    ctx.beginPath();
                    addHex(ctx, s.x, s.y, hexR, spaxelTurn);
                    ctx.globalAlpha = filled;
                    ctx.fillStyle = s.css;
                    ctx.fill();

                    // Inferred spaxels glow in the accent as they arrive.
                    if (s.dead && filled < 1) {
                        ctx.globalAlpha = Math.sin(filled * Math.PI) * 0.5;
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
