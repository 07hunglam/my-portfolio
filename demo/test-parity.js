// Proves js/sort-trace.js and demo/sort.cpp are the same computation.
//
// Feeds identical random arrays to both and asserts they agree on the sorted
// result AND on the comparison and swap totals - the two numbers the page puts
// on screen. If someone changes one implementation without the other, this
// fails instead of the site quietly lying about what the C++ does.
//
// Run:  node demo/test-parity.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SortTrace = require('../js/sort-trace.js');

const here = __dirname;
const cppFile = path.join(here, 'sort.cpp');
const binary = path.join(os.tmpdir(), 'sort_parity_check' + (process.platform === 'win32' ? '.exe' : ''));

const ALGOS = ['bubble', 'insertion', 'quick'];
const CASES = 300;

function compile() {
    execFileSync('g++', ['-std=c++11', '-O2', '-Wall', '-Wextra', cppFile, '-o', binary], { stdio: 'pipe' });
}

// One process run reports all three algorithms for the given input
function runCpp(values) {
    const out = execFileSync(binary, { input: values.join(' ') + '\n', encoding: 'utf8' });
    const result = {};
    for (const line of out.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        result[parts[0]] = {
            comparisons: Number(parts[1]),
            swaps: Number(parts[2]),
            array: parts.slice(3).map(Number)
        };
    }
    return result;
}

function runJs(algo, values) {
    const steps = SortTrace[algo](values, {});
    const last = steps[steps.length - 1];
    return { comparisons: last.comparisons, swaps: last.swaps, array: last.array };
}

function randomCase() {
    // mix of sizes plus the edge cases: empty, single, sorted, reversed, all-equal
    const size = Math.floor(Math.random() * 24);
    const shape = Math.random();
    const a = [];
    for (let i = 0; i < size; i++) a.push(Math.floor(Math.random() * 100));
    if (shape < 0.1) a.sort((x, y) => x - y);
    else if (shape < 0.2) a.sort((x, y) => y - x);
    else if (shape < 0.3) a.fill(7);
    return a;
}

const fixtures = [[], [1], [2, 1], [5, 5, 5, 5], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1]];

function main() {
    if (!fs.existsSync(cppFile)) throw new Error('missing ' + cppFile);
    process.stdout.write('compiling sort.cpp ... ');
    compile();
    console.log('ok');

    // Every @step marker the visualiser looks up must exist in the source
    const source = fs.readFileSync(cppFile, 'utf8');
    const markers = new Set();
    source.split('\n').forEach(l => {
        const m = l.match(/@step\s+([\w.]+)/);
        if (m) markers.add(m[1]);
    });
    const required = [
        'bubble.compare', 'bubble.swap', 'bubble.settled',
        'insertion.lift', 'insertion.compare', 'insertion.shift', 'insertion.drop',
        'quick.pivot', 'quick.compare', 'quick.swap', 'quick.place', 'quick.left', 'quick.right'
    ];
    const missing = required.filter(k => !markers.has(k));
    if (missing.length) {
        console.error('FAIL: sort.cpp is missing @step markers: ' + missing.join(', '));
        process.exit(1);
    }
    console.log(`markers: all ${required.length} present`);

    const cases = fixtures.concat(Array.from({ length: CASES }, randomCase));
    let checked = 0;
    const failures = [];

    for (const values of cases) {
        const cpp = runCpp(values);
        for (const algo of ALGOS) {
            const js = runJs(algo, values);
            const ref = cpp[algo];
            const same =
                js.comparisons === ref.comparisons &&
                js.swaps === ref.swaps &&
                js.array.length === ref.array.length &&
                js.array.every((v, i) => v === ref.array[i]);
            if (!same) {
                failures.push({ algo, input: values, cpp: ref, js });
            }
            checked++;
        }
    }

    console.log(`compared ${checked} runs across ${cases.length} inputs`);

    if (failures.length) {
        console.error(`\nFAIL: ${failures.length} mismatch(es)`);
        failures.slice(0, 5).forEach(f => {
            console.error(`  ${f.algo}  input=[${f.input}]`);
            console.error(`    cpp: cmp=${f.cpp.comparisons} swp=${f.cpp.swaps} -> [${f.cpp.array}]`);
            console.error(`    js : cmp=${f.js.comparisons} swp=${f.js.swaps} -> [${f.js.array}]`);
        });
        process.exit(1);
    }

    console.log('PASS: C++ and JavaScript agree on results, comparisons and swaps');
}

main();
