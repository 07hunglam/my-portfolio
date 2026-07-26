// ============================================================================
// SORT TRACES - the JavaScript mirror of demo/sort.cpp
//
// Each function is a literal transcription of its C++ counterpart, including
// the operations that look redundant (quicksort's no-op self-swap, bubble
// sort's early exit) and the exact placement of the comparison and swap
// counters. That is what lets demo/test-parity.js assert the two produce
// identical totals, and what makes the numbers on the page true of the C++.
//
// No DOM here on purpose: this file runs unchanged in the browser and in node.
// ============================================================================
(function (root) {
    'use strict';

    // A step records the whole array. With a few dozen bars that costs almost
    // nothing and removes any chance of the replay drifting from the algorithm.
    function recorder() {
        const steps = [];
        const state = { comparisons: 0, swaps: 0, locked: new Set() };
        return {
            state,
            steps,
            push(a, line, kind, active) {
                steps.push({
                    line: line || null,
                    kind: kind,
                    array: a.slice(),
                    active: active || [],
                    locked: new Set(state.locked),
                    comparisons: state.comparisons,
                    swaps: state.swaps
                });
            }
        };
    }

    function finish(r, a, n) {
        for (let k = 0; k < n; k++) r.state.locked.add(k);
        r.push(a, null, 'done', []);
        return r.steps;
    }

    function bubble(input, lines) {
        const L = lines || {};
        const a = input.slice();
        const r = recorder();
        const n = a.length;

        for (let i = 0; i + 1 < n; i++) {
            let swapped = false;
            for (let j = 0; j + 1 < n - i; j++) {
                r.state.comparisons++;
                r.push(a, L['bubble.compare'], 'compare', [j, j + 1]);
                if (a[j] > a[j + 1]) {
                    const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                    r.state.swaps++;
                    r.push(a, L['bubble.swap'], 'swap', [j, j + 1]);
                    swapped = true;
                }
            }
            r.state.locked.add(n - 1 - i);
            if (!swapped) {
                for (let k = 0; k < n - i; k++) r.state.locked.add(k);
                r.push(a, L['bubble.settled'], 'settled', []);
                break;
            }
        }
        return finish(r, a, n);
    }

    function insertion(input, lines) {
        const L = lines || {};
        const a = input.slice();
        const r = recorder();
        const n = a.length;
        if (n) r.state.locked.add(0);

        for (let i = 1; i < n; i++) {
            const key = a[i];
            r.push(a, L['insertion.lift'], 'lift', [i]);
            let j = i;
            while (j > 0) {
                r.state.comparisons++;
                r.push(a, L['insertion.compare'], 'compare', [j - 1, j]);
                if (a[j - 1] <= key) break;
                a[j] = a[j - 1];
                r.state.swaps++;
                r.push(a, L['insertion.shift'], 'shift', [j - 1, j]);
                j--;
            }
            a[j] = key;
            r.push(a, L['insertion.drop'], 'drop', [j]);
            r.state.locked.add(i);
        }
        return finish(r, a, n);
    }

    function quick(input, lines) {
        const L = lines || {};
        const a = input.slice();
        const r = recorder();
        const n = a.length;

        function partition(lo, hi) {
            const pivot = a[hi];
            r.push(a, L['quick.pivot'], 'pivot', [hi]);
            let boundary = lo;
            for (let j = lo; j < hi; j++) {
                r.state.comparisons++;
                r.push(a, L['quick.compare'], 'compare', [j, hi]);
                if (a[j] < pivot) {
                    // std::swap runs even when boundary === j; counted the same way
                    const t = a[boundary]; a[boundary] = a[j]; a[j] = t;
                    r.state.swaps++;
                    r.push(a, L['quick.swap'], 'swap', [boundary, j]);
                    boundary++;
                }
            }
            const t = a[boundary]; a[boundary] = a[hi]; a[hi] = t;
            r.state.swaps++;
            r.push(a, L['quick.place'], 'place', [boundary, hi]);
            r.state.locked.add(boundary);
            return boundary;
        }

        function sort(lo, hi) {
            if (lo >= hi) {
                if (lo === hi) r.state.locked.add(lo);
                return;
            }
            const p = partition(lo, hi);
            r.push(a, L['quick.left'], 'recurse', []);
            if (p > 0) sort(lo, p - 1);
            r.push(a, L['quick.right'], 'recurse', []);
            sort(p + 1, hi);
        }

        if (n) sort(0, n - 1);
        return finish(r, a, n);
    }

    const SortTrace = { bubble: bubble, insertion: insertion, quick: quick };

    if (typeof module !== 'undefined' && module.exports) module.exports = SortTrace;
    else root.SortTrace = SortTrace;
})(typeof globalThis !== 'undefined' ? globalThis : this);
