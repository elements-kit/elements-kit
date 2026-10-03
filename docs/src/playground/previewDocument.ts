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
      script.onload = settle;
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
    </style>
    <script>${sandboxShim}</script>
    <script src="https://cdn.jsdelivr.net/npm/chobitsu@1.8.6/dist/chobitsu.min.js"></script>
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

