// The preview and DevTools documents, from solid-playground (MIT, see
// ./LICENSE.solid-playground). Code runs as blob modules behind an import map;
// chobitsu in the preview speaks the DevTools protocol to chii.

// Opaque-origin iframe: storage access throws, and chobitsu's getUrl() falls back to a
// cross-origin parent.location read that blanks chii's Sources panel.
const sandboxShim = `
  (() => {
    const make = () => {
      const m = new Map();
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
        clear: () => { m.clear(); },
        key: (i) => Array.from(m.keys())[i] ?? null,
        get length() { return m.size; },
      };
    };
    Object.defineProperty(window, 'localStorage', { value: make(), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: make(), configurable: true });
    const realParent = window.parent;
    window.parent = {
      location: { href: location.href, origin: location.origin || 'about:srcdoc' },
      postMessage: (msg, target, transfer) => realParent.postMessage(msg, target, transfer),
    };
  })();
`;


// Vitest-style globals for the docs' test examples: test/it/describe and an
// expect() with the common matchers. Results render in place of the app.
const testRuntime = `
  (() => {
    let tests = [];
    const fmt = (v) => {
      try { return typeof v === 'string' ? JSON.stringify(v) : typeof v === 'function' ? 'function' : JSON.stringify(v) ?? String(v); }
      catch { return String(v); }
    };
    const equal = (a, b) => {
      if (Object.is(a, b)) return true;
      if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
      if (Array.isArray(a) !== Array.isArray(b) || Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
      const ka = Object.keys(a), kb = Object.keys(b);
      return ka.length === kb.length && ka.every((k) => equal(a[k], b[k]));
    };
    const matchers = {
      toBe: (a, b) => [Object.is(a, b), 'to be ' + fmt(b)],
      toEqual: (a, b) => [equal(a, b), 'to equal ' + fmt(b)],
      toStrictEqual: (a, b) => [equal(a, b), 'to strictly equal ' + fmt(b)],
      toBeUndefined: (a) => [a === undefined, 'to be undefined'],
      toBeDefined: (a) => [a !== undefined, 'to be defined'],
      toBeNull: (a) => [a === null, 'to be null'],
      toBeTruthy: (a) => [!!a, 'to be truthy'],
      toBeFalsy: (a) => [!a, 'to be falsy'],
      toBeInstanceOf: (a, C) => [a instanceof C, 'to be an instance of ' + (C?.name ?? C)],
      toBeGreaterThan: (a, b) => [a > b, 'to be greater than ' + fmt(b)],
      toBeLessThan: (a, b) => [a < b, 'to be less than ' + fmt(b)],
      toContain: (a, b) => [a?.includes?.(b), 'to contain ' + fmt(b)],
      toHaveLength: (a, n) => [a?.length === n, 'to have length ' + n],
      toThrow: (fn) => { try { fn(); return [false, 'to throw']; } catch { return [true, 'to throw']; } },
    };
    const expect = (actual) => {
      const build = (negate) => Object.fromEntries(Object.entries(matchers).map(([name, check]) => [name, (...args) => {
        const [pass, what] = check(actual, ...args);
        if (pass === negate) throw new Error('Expected ' + fmt(actual) + (negate ? ' not ' : ' ') + what);
      }]));
      return Object.assign(build(false), { not: build(true) });
    };
    let prefix = [];
    const test = (name, fn) => tests.push({ name: [...prefix, name].join(' › '), fn });
    const describe = (name, fn) => { prefix.push(name); try { fn(); } finally { prefix.pop(); } };
    Object.assign(window, { test, it: test, describe, expect });

    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    window.__ekTests = {
      reset: () => { tests = []; },
      async run() {
        if (!tests.length) return;
        const results = [];
        for (const t of tests) {
          try { await t.fn(); results.push({ name: t.name }); }
          catch (e) { results.push({ name: t.name, error: e?.message ?? String(e) }); console.error('✗ ' + t.name + '\\n', e); }
        }
        const failed = results.filter((r) => r.error).length;
        const app = document.getElementById('app');
        app.innerHTML = '<div class="ek-tests"><p class="ek-tests-summary ' + (failed ? 'fail' : 'pass') + '">'
          + (failed ? failed + ' failed, ' : '') + (results.length - failed) + ' passed</p><ul>'
          + results.map((r) => '<li class="' + (r.error ? 'fail' : 'pass') + '"><span>' + (r.error ? '✗' : '✓') + '</span><div>' + esc(r.name)
            + (r.error ? '<pre>' + esc(r.error) + '</pre>' : '') + '</div></li>').join('') + '</ul></div>';
        console.log((failed ? '✗ ' : '✓ ') + (results.length - failed) + '/' + results.length + ' tests passed');
      },
    };
  })();
`;

const mainIframeScript = `
  (() => {
    let loading = false;
    let queued = undefined;
    let cache = {};

    const buildModule = (name, source, sources) => {
      if (cache[name]) return cache[name];
      cache[name] = 'error:cyclic import';
      const out = source.replace(/(['"])solidrepl:([^'"]+)\\1/g, (_, q, rel) => {
        if (sources[rel] == null) return q + rel + q;
        return q + buildModule(rel, sources[rel], sources) + q;
      });
      const blob = new Blob([out], { type: 'text/javascript' });
      cache[name] = URL.createObjectURL(blob);
      return cache[name];
    };

    const runCode = (sources) => {
      window.dispose?.();
      window.dispose = undefined;

      const app = document.getElementById('app');
      if (app) app.innerHTML = '';

      console.clear();

      document.getElementById('appsrc')?.remove();
      document.getElementById('load')?.remove();

      for (const url of Object.values(cache)) {
        if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
      cache = {};

      window.__ekTests.reset();
      loading = true;
      const settle = () => {
        loading = false;
        const next = queued;
        queued = undefined;
        if (next) runCode(next);
      };
      const script = document.createElement('script');
      script.id = 'appsrc';
      script.type = 'module';
      script.onload = () => window.__ekTests.run().finally(settle);
      script.onerror = settle;
      script.src = buildModule('./main', sources['./main'], sources);
      document.body.appendChild(script);
    };

    chobitsu.setOnMessage((message) => window.parent.postMessage(message, '*'));

    let pageSource = '';
    const pageDomain = chobitsu.domain('Page');
    if (pageDomain) {
      pageDomain.getResourceContent = (params) =>
        Promise.resolve({ base64Encoded: false, content: params.frameId === '1' ? pageSource : '' });
    }

    const handlers = {
      CODE_UPDATE: (sources) => {
        if (!sources || typeof sources['./main'] !== 'string') return;
        if (loading) queued = sources;
        else runCode(sources);
      },
      IMPORT_MAP: (imports) => {
        document.getElementById('importmap')?.remove();
        const importMap = document.createElement('script');
        importMap.id = 'importmap';
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({ imports });
        document.head.appendChild(importMap);
      },
      DARK: (isDark) => {
        document.documentElement.classList.toggle('dark', isDark);
      },
      PAGE_SOURCE: (source) => {
        pageSource = source;
      },
      DEV: (message) => {
        chobitsu.sendRawMessage(message);
      },
    };

    window.addEventListener('message', (e) => {
      try {
        handlers[e.data?.event]?.(e.data.value);
      } catch (err) {
        console.error(err);
      }
    });

  })();
`;

export const iframeHtml = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- srcdoc resolves links against the parent page; "#/route" should stay in the preview. -->
    <base href="about:srcdoc" />
    <link href="https://ga.jspm.io/npm:modern-normalize@3.0.1/modern-normalize.css" rel="stylesheet" />
    <style>
      html, body { position: relative; width: 100%; height: 100%; }
      body {
        color: #333; margin: 0; padding: 8px; box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        max-width: 100%;
      }
      .dark body { color: #e5e7eb; }
      .dark { color-scheme: dark; }
      input, button, select, textarea {
        padding: 0.4em; margin: 0 0 0.5em 0; box-sizing: border-box;
        border: 1px solid #ccc; border-radius: 2px;
      }
      button { color: #333; background-color: #f4f4f4; outline: none; }
      button:disabled { color: #999; }
      button:not(:disabled):active { background-color: #ddd; }
      button:focus { border-color: #666; }
      .dark input, .dark select, .dark textarea { background: #1a1a1a; color: inherit; border-color: #444; }
      .dark button { color: #e5e7eb; background-color: #2a2a2a; border-color: #444; }
      .dark button:disabled { color: #777; }
      .dark button:not(:disabled):active { background-color: #3a3a3a; }
      .dark a { color: #60a5fa; }
      .ek-tests { font-size: 14px; }
      .ek-tests-summary { margin: 0 0 8px; font-weight: 600; }
      .ek-tests ul { list-style: none; margin: 0; padding: 0; }
      .ek-tests li { display: flex; gap: 8px; padding: 4px 0; border-top: 1px solid #8882; }
      .ek-tests .pass > span, .ek-tests-summary.pass { color: #16a34a; }
      .ek-tests .fail > span, .ek-tests-summary.fail { color: #dc2626; }
      .ek-tests pre { margin: 4px 0 0; white-space: pre-wrap; color: #dc2626; font-size: 12px; }
    </style>
    <script>${sandboxShim}</script>
    <script src="https://cdn.jsdelivr.net/npm/chobitsu@1.8.6/dist/chobitsu.min.js"></script>
    <script>${testRuntime}</script>
    <script>${mainIframeScript}</script>
  </head>
  <body>
    <div id="load" style="display: flex; height: 80vh; align-items: center; justify-content: center">
      <p style="font-size: 1.5rem">Loading the playground...</p>
    </div>
    <div id="app"></div>
  </body>
</html>`;

export const devtoolsHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <meta charset="utf-8">
  <title>DevTools</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body {
        background-color: rgb(41 42 45);
      }
    }
  </style>
  <meta name="referrer" content="no-referrer">
  <script src="https://unpkg.com/@ungap/custom-elements/es.js"></script>
  <script type="module" src="https://cdn.jsdelivr.net/npm/chii@1.15.5/public/front_end/entrypoints/chii_app/chii_app.js"></script>
  <body class="undocked" id="-blink-dev-tools">`;

