// ============================================================================
// SORTING VISUALISER - presentation layer
//
// The algorithms themselves live in js/sort-trace.js, which mirrors
// demo/sort.cpp and is verified against it by demo/test-parity.js. This file
// only draws: bars, the source panel, the controls, and playback.
//
// demo/sort.cpp is fetched and displayed as-is, and the line to highlight is
// found by scanning it for "@step <id>" markers - no line numbers are
// hard-coded, so editing the C++ cannot desynchronise the highlight.
// ============================================================================
(() => {
    const root = document.getElementById('sort-demo');
    if (!root) return;

    if (typeof SortTrace === 'undefined') {
        console.error('sort-trace.js must load before sort-visualizer.js');
        return;
    }

    const CPP_URL = '/demo/sort.cpp';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const el = {
        bars: root.querySelector('.sd-bars'),
        code: root.querySelector('.sd-code'),
        status: root.querySelector('.sd-status'),
        compares: root.querySelector('.sd-compares'),
        swaps: root.querySelector('.sd-swaps'),
        play: root.querySelector('.sd-play'),
        step: root.querySelector('.sd-step'),
        shuffle: root.querySelector('.sd-shuffle'),
        speed: root.querySelector('.sd-speed'),
        algoButtons: [...root.querySelectorAll('.sd-algo')]
    };

    // ---------------------------------------------------------------- state
    let markers = {};          // "@step id" -> 1-based line number
    let codeLines = [];        // rendered <div> per source line
    let algo = 'bubble';
    let values = [];
    let steps = [];
    let cursor = -1;
    let timer = null;

    const ALGO_LABEL = { bubble: 'Bubble sort', insertion: 'Insertion sort', quick: 'Quicksort' };

    // The algorithms live in js/sort-trace.js so they can be exercised outside
    // the browser; demo/test-parity.js runs them against the compiled C++.
    const TRACERS = (typeof SortTrace !== 'undefined') ? SortTrace : null;

    // ------------------------------------------------------------ rendering
    function barCount() {
        return window.innerWidth < 700 ? 12 : 24;
    }

    function randomValues(count) {
        const out = [];
        for (let i = 0; i < count; i++) out.push(6 + Math.floor(Math.random() * 95));
        return out;
    }

    function buildBars(count) {
        el.bars.replaceChildren();
        for (let i = 0; i < count; i++) {
            const bar = document.createElement('div');
            bar.className = 'sd-bar';
            el.bars.appendChild(bar);
        }
    }

    function paint(step) {
        const bars = el.bars.children;
        const max = Math.max(...step.array, 1);
        for (let i = 0; i < bars.length; i++) {
            const bar = bars[i];
            bar.style.height = ((step.array[i] / max) * 100) + '%';
            bar.classList.toggle('is-active', step.active.includes(i));
            bar.classList.toggle('is-locked', step.locked.has(i));
        }
        el.compares.textContent = step.comparisons.toLocaleString();
        el.swaps.textContent = step.swaps.toLocaleString();
        highlight(step.line);
    }

    function highlight(line) {
        codeLines.forEach(node => node.classList.remove('is-current'));
        if (!line || !codeLines[line - 1]) return;
        const node = codeLines[line - 1];
        node.classList.add('is-current');
        // keep the active line in view without scrolling the page itself
        const pane = el.code;
        const target = node.offsetTop - (pane.clientHeight / 2) + (node.offsetHeight / 2);
        pane.scrollTo({ top: Math.max(0, target), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    // ------------------------------------------------------------- playback
    function stopPlaying() {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        el.play.setAttribute('aria-pressed', 'false');
        setPlayLabel(false);
    }

    function setPlayLabel(playing) {
        const key = playing ? 'sd_pause' : 'sd_play';
        const label = el.play.querySelector('.sd-play-text');
        label.setAttribute('data-i18n', key);
        if (typeof i18n !== 'undefined') {
            const lang = document.documentElement.lang === 'vi' ? 'vi' : 'en';
            label.textContent = (i18n[lang] && i18n[lang][key]) || (playing ? 'Pause' : 'Play');
        } else {
            label.textContent = playing ? 'Pause' : 'Play';
        }
        el.play.querySelector('use').setAttribute('href', playing ? '/icons.svg#icon-pause' : '/icons.svg#icon-play');
    }

    function delay() {
        // slider 1..10 maps to a slow-to-fast step interval
        return 260 - (Number(el.speed.value) * 24);
    }

    function advance() {
        if (cursor >= steps.length - 1) { stopPlaying(); announce(true); return false; }
        cursor++;
        paint(steps[cursor]);
        return true;
    }

    function tick() {
        if (!advance()) return;
        timer = setTimeout(tick, delay());
    }

    function play() {
        if (cursor >= steps.length - 1) reset(values);
        el.play.setAttribute('aria-pressed', 'true');
        setPlayLabel(true);
        tick();
    }

    function announce(done) {
        const step = steps[Math.max(0, cursor)];
        const lang = document.documentElement.lang === 'vi' ? 'vi' : 'en';
        const name = ALGO_LABEL[algo];
        if (done) {
            el.status.textContent = lang === 'vi'
                ? `${name}: đã sắp xếp xong sau ${step.comparisons.toLocaleString()} lượt so sánh và ${step.swaps.toLocaleString()} lượt đổi chỗ.`
                : `${name}: sorted in ${step.comparisons.toLocaleString()} comparisons and ${step.swaps.toLocaleString()} swaps.`;
        } else {
            el.status.textContent = lang === 'vi'
                ? `${name}: ${values.length} cột, sẵn sàng.`
                : `${name}: ${values.length} bars, ready.`;
        }
    }

    function reset(vals) {
        stopPlaying();
        values = vals;
        steps = TRACERS[algo](values, markers);
        cursor = 0;
        paint(steps[0]);
        announce(false);
    }

    function shuffle() {
        const count = barCount();
        if (el.bars.children.length !== count) buildBars(count);
        reset(randomValues(count));
    }

    // --------------------------------------------------------- source panel
    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const KEYWORDS = /\b(for|while|if|else|return|break|void|int|bool|const|char|std|vector|size_t|true|false|swap|cout|include)\b/g;

    function renderSource(text) {
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        el.code.replaceChildren();
        codeLines = lines.map((raw, idx) => {
            const row = document.createElement('div');
            row.className = 'sd-line';

            const num = document.createElement('span');
            num.className = 'sd-linenum';
            num.textContent = String(idx + 1);
            num.setAttribute('aria-hidden', 'true');

            const body = document.createElement('code');
            // split the trailing comment off first so keyword colouring cannot
            // reach inside it, then colour only the code half
            const at = raw.indexOf('//');
            const codePart = at === -1 ? raw : raw.slice(0, at);
            const commentPart = at === -1 ? '' : raw.slice(at);
            let html = escapeHtml(codePart)
                .replace(KEYWORDS, '<b>$1</b>')
                .replace(/\b(\d+)\b/g, '<i>$1</i>');
            if (commentPart) {
                const cls = commentPart.includes('@step') ? 'sd-marker' : 'sd-comment';
                html += `<span class="${cls}">${escapeHtml(commentPart)}</span>`;
            }
            body.innerHTML = html;

            row.append(num, body);
            el.code.appendChild(row);
            return row;
        });
        return lines;
    }

    function readMarkers(lines) {
        const found = {};
        lines.forEach((line, idx) => {
            const m = line.match(/@step\s+([\w.]+)/);
            if (m) found[m[1]] = idx + 1;
        });
        return found;
    }

    // ------------------------------------------------------------ listeners
    el.play.addEventListener('click', () => {
        if (timer !== null) { stopPlaying(); return; }
        play();
    });

    el.step.addEventListener('click', () => {
        stopPlaying();
        if (!advance()) return;
        if (cursor >= steps.length - 1) announce(true);
    });

    el.shuffle.addEventListener('click', shuffle);

    el.speed.addEventListener('input', () => {
        if (timer !== null) { clearTimeout(timer); timer = setTimeout(tick, delay()); }
    });

    el.algoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            algo = btn.dataset.algo;
            el.algoButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            reset(values);
        });
    });

    // Pause when the tab goes away; nobody is watching and the timer is waste
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopPlaying();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (el.bars.children.length !== barCount()) shuffle();
        }, 250);
    }, { passive: true });

    // Re-announce in the new language when the site language changes
    document.addEventListener('languagechange', () => {
        announce(cursor >= steps.length - 1);
        setPlayLabel(timer !== null);
    });

    // ----------------------------------------------------------------- boot
    fetch(CPP_URL)
        .then(res => {
            if (!res.ok) throw new Error(`${CPP_URL} responded ${res.status}`);
            return res.text();
        })
        .then(text => {
            const lines = renderSource(text);
            markers = readMarkers(lines);
            root.classList.add('is-ready');
        })
        .catch(err => {
            // The bars still work without the source panel
            console.error('Could not load the C++ source:', err);
            el.code.textContent = 'demo/sort.cpp could not be loaded.';
        })
        .finally(shuffle);
})();
