// Checks the translation dictionary against the markup that consumes it.
//
// The site broke this way once already: the dictionary drifted away from the
// HTML and switching language silently rewrote real content. This fails the
// build on any of:
//   - a data-i18n key the dictionary does not have
//   - a key present in one language but missing from the other
//   - a dictionary key nothing references (dead weight that invites drift)
//   - an 'en' value that disagrees with the hard-coded HTML it replaces
//
// Run:  node tools/check-i18n.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const PAGES = ['index.html', 'about.html', '404.html'];
const SCRIPTS = ['js/main.js', 'js/sort-visualizer.js'];

function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

// Pull the `const i18n = { ... };` literal out of main.js and evaluate just that
function loadDictionary() {
    const src = read('js/main.js');
    const start = src.indexOf('const i18n = {');
    if (start === -1) throw new Error('could not find the i18n object in js/main.js');
    const open = src.indexOf('{', start);
    let depth = 0;
    let end = -1;
    let inStr = null;
    for (let i = open; i < src.length; i++) {
        const c = src[i];
        if (inStr) {
            if (c === '\\') i++;
            else if (c === inStr) inStr = null;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) throw new Error('unbalanced braces in the i18n object');
    return vm.runInNewContext('(' + src.slice(open, end) + ')');
}

// Keys referenced from markup, with the literal fallback text they replace
function keysFromMarkup() {
    const used = new Map();   // key -> { attr, htmlText }
    for (const page of PAGES) {
        const html = read(page);
        const re = /data-i18n(-html|-aria)?="([\w.]+)"([^>]*)>([^<]*)/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            const attr = m[1] || '';
            const key = m[2];
            const text = attr === '-aria' ? null : m[4];
            if (!used.has(key)) used.set(key, { attr, page, text });
        }
        // aria labels carry their fallback in the attribute, not the body
        const ariaRe = /data-i18n-aria="([\w.]+)"\s+aria-label="([^"]*)"/g;
        while ((m = ariaRe.exec(html)) !== null) {
            used.set(m[1], { attr: '-aria', page, text: m[2] });
        }
    }
    return used;
}

// Keys looked up by name in JavaScript rather than through an attribute
function keysFromScripts() {
    const found = new Set();
    for (const file of SCRIPTS) {
        const src = read(file);
        const re = /i18n\[lang\]\[(\w+)\]|'(sd_play|sd_pause|aria_close)'/g;
        let m;
        while ((m = re.exec(src)) !== null) if (m[2]) found.add(m[2]);
        // setAttribute('data-i18n', key) style indirection
        const dyn = src.match(/playing \? '(\w+)' : '(\w+)'/);
        if (dyn) { found.add(dyn[1]); found.add(dyn[2]); }
    }
    return found;
}

const ENTITIES = {
    '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'",
    '&nbsp;': ' ', '&copy;': '©', '&mdash;': '—', '&ndash;': '–',
    '&amp;': '&'   // last: expanding it first would corrupt the others
};

function decodeEntities(s) {
    let out = s;
    for (const [entity, char] of Object.entries(ENTITIES)) {
        out = out.split(entity).join(char);
    }
    return out;
}

function main() {
    const dict = loadDictionary();
    const langs = Object.keys(dict);
    const markup = keysFromMarkup();
    const scripted = keysFromScripts();
    const referenced = new Set([...markup.keys(), ...scripted]);

    const problems = [];

    // 1. every referenced key exists in every language
    for (const key of referenced) {
        for (const lang of langs) {
            if (dict[lang][key] === undefined) {
                problems.push(`missing key "${key}" in language "${lang}"`);
            }
        }
    }

    // 2. languages agree on which keys they define
    const [a, b] = langs;
    for (const key of Object.keys(dict[a])) {
        if (dict[b][key] === undefined) problems.push(`key "${key}" is in "${a}" but not "${b}"`);
    }
    for (const key of Object.keys(dict[b])) {
        if (dict[a][key] === undefined) problems.push(`key "${key}" is in "${b}" but not "${a}"`);
    }

    // 3. nothing defined but unused
    for (const key of Object.keys(dict[a])) {
        if (!referenced.has(key)) problems.push(`key "${key}" is defined but never referenced`);
    }

    // 4. the English value must match the markup it replaces, or switching to
    //    English silently rewrites the page - the original bug
    let compared = 0;
    for (const [key, info] of markup) {
        if (info.attr === '-html') continue;         // markup on both sides
        if (dict.en[key] === undefined) continue;    // already reported above
        const htmlText = decodeEntities((info.text || '').trim());
        const dictText = decodeEntities(String(dict.en[key]).trim());
        if (!htmlText) continue;
        compared++;
        if (htmlText !== dictText) {
            problems.push(
                `en value for "${key}" disagrees with ${info.page}\n` +
                `      html: ${JSON.stringify(htmlText)}\n` +
                `      dict: ${JSON.stringify(dictText)}`
            );
        }
    }

    console.log(`languages: ${langs.join(', ')}`);
    console.log(`keys defined: ${Object.keys(dict[a]).length}`);
    console.log(`keys referenced: ${referenced.size} (${markup.size} in markup, ${scripted.size} from JS)`);
    console.log(`en values compared against markup: ${compared}`);

    if (problems.length) {
        console.error(`\nFAIL: ${problems.length} problem(s)`);
        problems.forEach(p => console.error('  - ' + p));
        process.exit(1);
    }
    console.log('PASS: dictionary and markup agree');
}

main();
