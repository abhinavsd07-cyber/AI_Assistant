import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  Terminal,
  Sparkles,
  Columns2,
  RotateCw,
  Trash2
} from 'lucide-react';

interface CanvasStudioProps {
  initialCode: string;
  initialLanguage: string;
  title?: string;
  onClose: () => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'html', label: 'HTML / Tailwind' },
  { value: 'jsx', label: 'React (JSX)' },
  { value: 'tsx', label: 'React (TSX)' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'css', label: 'CSS' },
  { value: 'svg', label: 'SVG' },
  { value: 'python', label: 'Python (Pyodide)' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
];

const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useRef',
  'useMemo',
  'useCallback',
  'useReducer',
  'useContext',
  'useLayoutEffect',
  'createContext',
  'memo',
  'forwardRef',
  'Fragment',
];

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeScriptText = (str: string) => str.replace(/<\/script/gi, '<\\/script');

const normalizeLanguage = (lang: string) => {
  const clean = (lang || 'html').toLowerCase().trim();
  if (clean === 'js') return 'javascript';
  if (clean === 'ts') return 'typescript';
  if (clean === 'react') return 'jsx';
  if (clean === 'py') return 'python';
  if (clean === 'md') return 'markdown';
  if (clean === 'htm') return 'html';
  return clean || 'html';
};

export const CanvasStudio: React.FC<CanvasStudioProps> = ({
  initialCode,
  initialLanguage = 'html',
  title = 'Interactive Canvas Studio',
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);
  const [liveCode, setLiveCode] = useState(initialCode);
  const [language, setLanguage] = useState(() => normalizeLanguage(initialLanguage));
  const [activeTab, setActiveTab] = useState<'split' | 'preview' | 'code'>('split');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isRunningPython, setIsRunningPython] = useState(false);
  const [pythonPlots, setPythonPlots] = useState<string[]>([]);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pyodideRef = useRef<any>(null);
  const previewChannelRef = useRef(`nebula-canvas-${Math.random().toString(36).slice(2, 10)}`);

  const isPython = language === 'python' || language === 'py';

  // Sync state if initial props change
  useEffect(() => {
    const normalized = normalizeLanguage(initialLanguage);
    setCode(initialCode);
    setLiveCode(initialCode);
    setLanguage(normalized);
    setConsoleOutput([]);
    setPythonPlots([]);
    setIsSyncing(false);
    setPreviewNonce((n) => n + 1);
  }, [initialCode, initialLanguage]);

  // Debounce live editor updates so Split/Preview reflects code changes smoothly without CDN thrashing
  useEffect(() => {
    if (code === liveCode) {
      setIsSyncing(false);
      return;
    }
    setIsSyncing(true);
    const timer = window.setTimeout(() => {
      setLiveCode(code);
      setIsSyncing(false);
      if (!isPython) {
        setConsoleOutput([]);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [code, liveCode, isPython]);

  // Receive forwarded console logs and runtime errors from the preview iframe
  useEffect(() => {
    const channel = previewChannelRef.current;
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'nebula-canvas' || data.channel !== channel) return;
      if (iframeRef.current && event.source && event.source !== iframeRef.current.contentWindow) return;

      const prefix = data.level === 'error' ? '❌ [error]' : data.level === 'warn' ? '⚠️ [warn]' : `[${data.level || 'log'}]`;
      setConsoleOutput((prev) => [...prev.slice(-199), `${prefix}: ${data.message}`]);
      if (data.level === 'error') {
        setIsConsoleOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Determine file extension
  const getExtension = (lang: string) => {
    const map: Record<string, string> = {
      python: 'py', py: 'py',
      javascript: 'js', js: 'js',
      typescript: 'ts', ts: 'ts',
      tsx: 'tsx', jsx: 'jsx',
      html: 'html', css: 'css',
      json: 'json', markdown: 'md', md: 'md',
      svg: 'svg', sql: 'sql',
    };
    return map[lang] || 'txt';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = getExtension(language);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula_${language}_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildConsoleBridge = (channelId: string) => `<script>
(function() {
  var CHANNEL = ${JSON.stringify(channelId)};
  function fmt(val) {
    if (val instanceof Error) return val.stack || val.message || String(val);
    if (typeof val === 'object' && val !== null) {
      try { return JSON.stringify(val, null, 2); } catch (e) { return String(val); }
    }
    return String(val);
  }
  function emit(level, args) {
    try {
      var text = Array.prototype.slice.call(args).map(fmt).join(' ');
      window.parent.postMessage({ source: 'nebula-canvas', channel: CHANNEL, level: level, message: text }, '*');
    } catch (e) {}
  }
  var oLog = console.log, oInfo = console.info, oWarn = console.warn, oErr = console.error;
  console.log = function() { emit('log', arguments); if (oLog) oLog.apply(console, arguments); };
  console.info = function() { emit('info', arguments); if (oInfo) oInfo.apply(console, arguments); };
  console.warn = function() { emit('warn', arguments); if (oWarn) oWarn.apply(console, arguments); };
  console.error = function() { emit('error', arguments); if (oErr) oErr.apply(console, arguments); };
  window.addEventListener('error', function(e) {
    var msg = (e && e.message) ? e.message : 'Uncaught runtime error';
    if (e && e.lineno) msg += ' (line ' + e.lineno + ')';
    emit('error', [msg]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    var r = e ? e.reason : 'Unhandled Promise rejection';
    emit('error', [r && r.message ? r.message : String(r)]);
  });
})();
</script>`;

  const prepareReactSource = (rawCode: string) => {
    const fallbackSymbols: Array<{ name: string; pkg: string }> = [];
    let needsMotionShim = false;

    const importRegex = /^[ \t]*import[ \t]+(?:type[ \t]+)?(?:([\w*{}\r\n\t, $]+?)[ \t]+from[ \t]+)?['"]([^'"]+)['"][ \t]*;?[ \t]*$/gm;
    let body = rawCode.replace(importRegex, (fullMatch, clause: string | undefined, pkg: string) => {
      if (!clause || pkg === 'react' || pkg === 'react-dom' || pkg === 'react-dom/client') {
        return '';
      }
      if (/^[ \t]*import[ \t]+type\b/.test(fullMatch)) {
        return '';
      }
      const namedMatch = clause.match(/\{([\s\S]*?)\}/);
      if (namedMatch) {
        namedMatch[1].split(',').forEach((entry) => {
          const cleaned = entry.trim().replace(/^type[ \t]+/, '');
          if (!cleaned) return;
          const asParts = cleaned.split(/\s+as\s+/);
          const localName = (asParts[1] || asParts[0]).trim();
          if (pkg === 'framer-motion' && localName === 'motion') {
            needsMotionShim = true;
            return;
          }
          if (/^[A-Z][\w$]*$/.test(localName)) {
            fallbackSymbols.push({ name: localName, pkg });
          }
        });
      }
      const defaultPart = clause.replace(/\{[\s\S]*?\}/g, '').replace(/,/g, '').trim();
      if (defaultPart && !defaultPart.startsWith('*') && /^[A-Z][\w$]*$/.test(defaultPart)) {
        fallbackSymbols.push({ name: defaultPart, pkg });
      }
      return '';
    });

    let defaultExportName: string | null = null;

    // Preserve function/class names cleanly when unwrapping export default
    body = body
      .replace(
        /^[ \t]*export[ \t]+default[ \t]+(async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)/gm,
        (_m, asyncKw = '', fnName: string) => {
          defaultExportName = fnName;
          return `${asyncKw}function ${fnName}`;
        }
      )
      .replace(
        /^[ \t]*export[ \t]+default[ \t]+(async[ \t]+)?function(?=[ \t]*\()/gm,
        (_m, asyncKw = '') => {
          defaultExportName = '__NebulaDefaultExport__';
          return `${asyncKw}function __NebulaDefaultExport__`;
        }
      )
      .replace(
        /^[ \t]*export[ \t]+default[ \t]+class[ \t]+([A-Za-z_$][\w$]*)/gm,
        (_m, clsName: string) => {
          defaultExportName = clsName;
          return `class ${clsName}`;
        }
      )
      .replace(
        /^[ \t]*export[ \t]+default[ \t]+([A-Za-z_$][\w$]*)[ \t]*;?[ \t]*$/gm,
        (_m, idName: string) => {
          defaultExportName = idName;
          return '';
        }
      )
      .replace(/^[ \t]*export[ \t]+default[ \t]+/gm, () => {
        defaultExportName = '__NebulaDefaultExport__';
        return 'const __NebulaDefaultExport__ = ';
      })
      .replace(/^[ \t]*export[ \t]*\{[^}]*\}[ \t]*;?[ \t]*$/gm, '')
      .replace(
        /^[ \t]*export[ \t]+(?=(?:async[ \t]+)?(?:function|const|let|var|class|interface|type|enum)\b)/gm,
        ''
      );

    const isDeclared = (ident: string) =>
      new RegExp(`(?:^|[^.\\w$])(?:const|let|var|function|class)\\s*(?:\\{[^}]*)?\\b${ident}\\b`).test(body);

    const missingHooks = REACT_HOOKS.filter((hook) => !isDeclared(hook));
    const hookHeader = missingHooks.length > 0 ? `const { ${missingHooks.join(', ')} } = React;\n` : '';

    const seenStubs = new Set<string>();
    const stubLines: string[] = [];
    if (needsMotionShim && !isDeclared('motion')) {
      stubLines.push(
        `const motion = new Proxy({}, { get: (_, tag) => ({ children, initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...rest }) => React.createElement(typeof tag === 'string' ? tag : 'div', rest, children) });`
      );
    }
    fallbackSymbols.forEach(({ name, pkg }) => {
      if (seenStubs.has(name) || isDeclared(name) || REACT_HOOKS.includes(name)) return;
      seenStubs.add(name);
      stubLines.push(
        `const ${name} = ({ size = 16, className = '', children, ...props }) => React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'inline-block shrink-0 ' + className, 'aria-label': ${JSON.stringify(`${pkg}:${name}`)}, ...props }, children || React.createElement('rect', { x: 4, y: 4, width: 16, height: 16, rx: 4 }));`
      );
    });

    const componentCandidates: string[] = [];
    const declRegex = /^[ \t]*(?:async[ \t]+function|function|const|let|var|class)[ \t]+([A-Z][\w$]*)\b/gm;
    let declMatch: RegExpExecArray | null;
    while ((declMatch = declRegex.exec(body)) !== null) {
      componentCandidates.push(declMatch[1]);
    }
    const orderedFallbacks = Array.from(
      new Set([
        ...(defaultExportName ? [defaultExportName] : []),
        'App',
        'Component',
        'Main',
        ...componentCandidates.reverse(),
      ])
    );

    const resolverLines = orderedFallbacks
      .map((name) => `(typeof ${name} !== 'undefined' ? ${name} : null)`)
      .join(' || ');

    const assembledSource = `${hookHeader}${stubLines.length ? stubLines.join('\n') + '\n' : ''}${body}

const __TargetComponent__ = ${resolverLines || 'null'};
window.__NebulaMountTarget__ = __TargetComponent__;
`;
    return assembledSource;
  };

  // Build the sandboxed HTML document from the debounced liveCode
  const previewHtml = useMemo(() => {
    const cleanLang = normalizeLanguage(language);
    const trimmed = liveCode.trim();
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const channelId = previewChannelRef.current;
    const bridgeScript = buildConsoleBridge(channelId);
    const darkHeadConfig = `<script>window.tailwind = window.tailwind || {}; window.tailwind.config = { darkMode: 'class' };</script>`;

    // 1. SVG rendering
    if (cleanLang === 'svg' || (trimmed.startsWith('<svg') && !trimmed.toLowerCase().includes('<html'))) {
      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-[#121212]">
  <div class="max-w-full max-h-[85vh] p-4 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-auto">
    ${liveCode}
  </div>
</body>
</html>`;
    }

    // 2. React / JSX / TSX rendering (also auto-detect React snippets saved under js/ts)
    const looksLikeReact =
      cleanLang === 'jsx' ||
      cleanLang === 'tsx' ||
      /\bimport\s+(?:React|\{[^}]*\})\s+from\s+['"]react['"]/.test(liveCode) ||
      /\bexport\s+default\s+function\b/.test(liveCode) ||
      ((cleanLang === 'javascript' || cleanLang === 'typescript') &&
        (/\bReactDOM\b|\bcreateRoot\b/.test(liveCode) || /return\s*\(\s*</.test(liveCode)));

    if (looksLikeReact) {
      const transformedUserSource = escapeScriptText(prepareReactSource(liveCode));

      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-4">
  <div id="root"></div>
  <script id="__nebula_react_source__" type="text/plain">${transformedUserSource}</script>
  <script>
    (function() {
      var rootEl = document.getElementById('root');
      function showError(title, err) {
        var message = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
        console.error(title + ': ' + message);
        rootEl.innerHTML = '';
        var box = document.createElement('div');
        box.className = 'p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl font-mono text-xs whitespace-pre-wrap break-words';
        var strong = document.createElement('strong');
        strong.textContent = title + '\\n';
        box.appendChild(strong);
        box.appendChild(document.createTextNode(message));
        rootEl.appendChild(box);
      }

      if (!window.React || !window.ReactDOM || !window.Babel) {
        showError('Preview Runtime Unavailable', 'Could not load React or Babel CDN scripts. Check your internet connection and click Refresh.');
        return;
      }

      try {
        var rawSource = document.getElementById('__nebula_react_source__').textContent || '';
        var compiled = window.Babel.transform(rawSource, {
          presets: ['react', 'typescript'],
          filename: 'CanvasComponent.tsx'
        }).code;

        window.__NebulaMountTarget__ = null;
        var runner = new Function('React', 'ReactDOM', compiled);
        runner(window.React, window.ReactDOM);

        var TargetComp = window.__NebulaMountTarget__;
        if (TargetComp) {
          var ErrorBoundary = (function(_super) {
            function Boundary(props) {
              this.props = props;
              this.state = { error: null };
            }
            Boundary.prototype = Object.create(_super.prototype);
            Boundary.prototype.constructor = Boundary;
            Boundary.getDerivedStateFromError = function(error) {
              return { error: error };
            };
            Boundary.prototype.componentDidCatch = function(error) {
              console.error(error);
            };
            Boundary.prototype.render = function() {
              if (this.state.error) {
                return window.React.createElement(
                  'div',
                  { className: 'p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl font-mono text-xs whitespace-pre-wrap' },
                  'Render Error: ' + (this.state.error.message || String(this.state.error))
                );
              }
              return this.props.children;
            };
            return Boundary;
          })(window.React.Component);

          var element = typeof TargetComp === 'function' || (typeof TargetComp === 'object' && TargetComp.$$typeof)
            ? window.React.createElement(TargetComp)
            : TargetComp;
          window.ReactDOM.createRoot(rootEl).render(
            window.React.createElement(ErrorBoundary, null, element)
          );
        } else {
          rootEl.innerHTML = '<div class="p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-700 dark:text-amber-300 font-mono text-xs">No root React component detected. Export a default component or declare <code>function App()</code>.</div>';
        }
      } catch (err) {
        showError('Compile / Runtime Error', err);
      }
    })();
  </script>
</body>
</html>`;
    }

    // 3. JavaScript / TypeScript standalone live execution
    if (cleanLang === 'javascript' || cleanLang === 'typescript') {
      const isTs = cleanLang === 'typescript';
      const cleanedScript = escapeScriptText(
        liveCode
          .replace(/^[ \t]*import[ \t]+[\s\S]*?['"][^'"]+['"][ \t]*;?[ \t]*$/gm, '')
          .replace(/^[ \t]*export[ \t]+default[ \t]+/gm, '')
          .replace(/^[ \t]*export[ \t]+(?=(?:async[ \t]+)?(?:function|const|let|var|class|interface|type|enum)\b)/gm, '')
      );

      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
  ${isTs ? '<script src="https://unpkg.com/@babel/standalone/babel.min.js"><' + '/script>' : ''}
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-4 space-y-4">
  <div id="app" class="rounded-xl border border-gray-200 dark:border-gray-800 p-4 empty:hidden"></div>
  <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-[#0D1117] text-gray-200 overflow-hidden shadow-xs">
    <div class="px-3.5 py-2 bg-[#161B22] border-b border-gray-800 text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center justify-between">
      <span>Live ${isTs ? 'TypeScript' : 'JavaScript'} Output</span>
      <span id="__status_badge__" class="text-gray-400">Ready</span>
    </div>
    <div id="__live_logs__" class="p-3.5 font-mono text-xs space-y-1.5 min-h-[120px] whitespace-pre-wrap break-words"></div>
  </div>
  <script id="__nebula_script_source__" type="text/plain">${cleanedScript}</script>
  <script>
    (function() {
      var logBox = document.getElementById('__live_logs__');
      var badge = document.getElementById('__status_badge__');
      function appendLine(text, tone) {
        var row = document.createElement('div');
        row.className = tone === 'error' ? 'text-red-400' : tone === 'warn' ? 'text-amber-300' : tone === 'meta' ? 'text-gray-500 italic' : 'text-emerald-200';
        row.textContent = text;
        logBox.appendChild(row);
      }
      var prevLog = console.log, prevWarn = console.warn, prevErr = console.error, prevInfo = console.info;
      var formatVals = function(args) {
        return Array.prototype.slice.call(args).map(function(v) {
          if (typeof v === 'object' && v !== null) { try { return JSON.stringify(v, null, 2); } catch(e) { return String(v); } }
          return String(v);
        }).join(' ');
      };
      console.log = function() { appendLine('> ' + formatVals(arguments), 'log'); prevLog.apply(console, arguments); };
      console.info = function() { appendLine('> ' + formatVals(arguments), 'log'); prevInfo.apply(console, arguments); };
      console.warn = function() { appendLine('! ' + formatVals(arguments), 'warn'); prevWarn.apply(console, arguments); };
      console.error = function() { appendLine('x ' + formatVals(arguments), 'error'); prevErr.apply(console, arguments); };

      try {
        var raw = document.getElementById('__nebula_script_source__').textContent || '';
        var execCode = raw;
        if (${isTs ? 'true' : 'false'}) {
          if (!window.Babel) throw new Error('TypeScript compiler unavailable');
          execCode = window.Babel.transform(raw, { presets: ['typescript'], filename: 'script.ts' }).code;
        }
        var result = (new Function(execCode))();
        if (result !== undefined) {
          appendLine('<= ' + formatVals([result]), 'log');
        }
        if (!logBox.childNodes.length && !document.getElementById('app').innerHTML.trim()) {
          appendLine('Executed cleanly with no console output.', 'meta');
        }
        badge.textContent = 'Executed';
      } catch (err) {
        badge.textContent = 'Error';
        badge.className = 'text-red-400';
        console.error(err && (err.stack || err.message) ? (err.stack || err.message) : String(err));
      }
    })();
  </script>
</body>
</html>`;
    }

    // 4. CSS Live Stylesheet Playground
    if (cleanLang === 'css' || cleanLang === 'scss') {
      const safeCss = liveCode.replace(/<\/style/gi, '<\\/style');
      const discoveredClasses = Array.from(
        new Set(
          Array.from(liveCode.matchAll(/\.([a-zA-Z_-][\w-]*)/g)).map((m) => m[1])
        )
      ).slice(0, 8);

      const customClassDemos = discoveredClasses
        .map(
          (cls) =>
            `<div class="${escapeHtml(cls)} demo-detected"><code>.${escapeHtml(cls)}</code> preview element — edit your CSS rules live to see changes here.</div>`
        )
        .join('\n');

      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${bridgeScript}
  <style>
    .nebula-css-shell { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; min-height: 100vh; box-sizing: border-box; background: ${isDark ? '#121212' : '#f8fafc'}; color: ${isDark ? '#e5e7eb' : '#0f172a'}; }
    .nebula-css-note { font-size: 11px; opacity: 0.65; margin-bottom: 16px; font-family: monospace; }
    .nebula-css-stage { display: flex; flex-direction: column; gap: 12px; }
    .demo-detected { padding: 12px 16px; border: 1px dashed ${isDark ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
  </style>
  <style>${safeCss}</style>
</head>
<body class="nebula-css-shell">
  <div class="nebula-css-note">Live CSS Playground — Detected classes & base elements update in real time</div>
  <div class="nebula-css-stage">
    ${customClassDemos}
    <div class="card container box">
      <h1>Heading One Sample</h1>
      <h2>Subheading Two Sample</h2>
      <p>Live paragraph text inside a <code>.card.container.box</code> element with a <a href="#demo" onclick="return false">sample link</a>.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn button primary">Primary Button</button>
        <input class="input" type="text" placeholder="Sample text input" />
      </div>
    </div>
  </div>
</body>
</html>`;
    }

    // 5. JSON Live Validator & Tree View
    if (cleanLang === 'json') {
      let valid = true;
      let formatted = liveCode;
      let errMsg = '';
      try {
        const parsed = JSON.parse(liveCode || '{}');
        formatted = JSON.stringify(parsed, null, 2);
      } catch (err: any) {
        valid = false;
        errMsg = err?.message || 'Invalid JSON';
      }

      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-4">
  <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181818] overflow-hidden shadow-xs">
    <div class="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-mono">
      <span class="font-semibold">JSON Live Inspector</span>
      <span class="px-2 py-0.5 rounded-full ${valid ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}">
        ${valid ? 'Valid JSON' : escapeHtml(errMsg)}
      </span>
    </div>
    <pre class="p-4 text-xs font-mono leading-relaxed overflow-auto text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">${escapeHtml(formatted)}</pre>
  </div>
</body>
</html>`;
    }

    // 6. Markdown Live Document Preview
    if (cleanLang === 'markdown') {
      const escaped = escapeHtml(liveCode);
      const renderedHtml = escaped
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2 border-b border-gray-200 dark:border-gray-800 pb-1">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-2 mb-3">$1</h1>')
        .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-emerald-500 pl-3 italic text-gray-600 dark:text-gray-400 my-2">$1</blockquote>')
        .replace(/^---$/gm, '<hr class="my-4 border-gray-200 dark:border-gray-800" />')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-xs">$1</code>')
        .replace(/\n/g, '<br />');

      return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-6">
  <article class="max-w-3xl mx-auto leading-relaxed text-sm space-y-1">
    ${renderedHtml}
  </article>
</body>
</html>`;
    }

    // 7. Full HTML Document vs HTML Fragment
    const lowerTrimmed = trimmed.toLowerCase();
    if (lowerTrimmed.startsWith('<!doctype') || lowerTrimmed.includes('<html')) {
      if (/<head[\s>]/i.test(liveCode)) {
        return liveCode.replace(/<head([^>]*)>/i, `<head$1>\n  ${bridgeScript}`);
      }
      return `${bridgeScript}\n${liveCode}`;
    }

    return `<!DOCTYPE html>
<html class="${isDark ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${bridgeScript}
  ${darkHeadConfig}
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
  ${liveCode}
</body>
</html>`;
  }, [liveCode, language]);

  // Run Python via cached Pyodide WebAssembly runtime in browser
  const runPythonCode = async (sourceOverride?: string) => {
    const pythonSource = typeof sourceOverride === 'string' ? sourceOverride : code;
    setIsRunningPython(true);
    setIsConsoleOpen(true);
    setPythonPlots([]);
    setConsoleOutput(['⚡ Running Python 3.11 WebAssembly environment...']);

    try {
      const win = window as any;
      if (!pyodideRef.current) {
        setConsoleOutput(['⏳ Initializing Pyodide Python 3.11 WebAssembly Runtime...']);
        if (!win.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Pyodide script'));
          });
        }
        pyodideRef.current = await win.loadPyodide();
      }

      const pyodide = pyodideRef.current;
      if (typeof pyodide.setStdout === 'function') {
        pyodide.setStdout({
          batched: (text: string) => {
            setConsoleOutput((prev) => [...prev, `[stdout]: ${text}`]);
          },
        });
      }
      if (typeof pyodide.setStderr === 'function') {
        pyodide.setStderr({
          batched: (text: string) => {
            setConsoleOutput((prev) => [...prev, `[stderr]: ${text}`]);
          },
        });
      }

      const usesMatplotlib = pythonSource.includes('matplotlib') || pythonSource.includes('plt.');
      if (usesMatplotlib) {
        await pyodide.loadPackage(['matplotlib', 'numpy']);
        await pyodide.runPythonAsync(`
import io, base64, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
__nebula_plots__ = []
def __nebula_capture_show__(*args, **kwargs):
    for fignum in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(fignum).savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        __nebula_plots__.append(base64.b64encode(buf.read()).decode('ascii'))
    plt.close('all')
plt.show = __nebula_capture_show__
`);
      }

      const result = await pyodide.runPythonAsync(pythonSource);

      if (usesMatplotlib) {
        const capturedJson = await pyodide.runPythonAsync(`
import json
for fignum in plt.get_fignums():
    buf = io.BytesIO()
    plt.figure(fignum).savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    __nebula_plots__.append(base64.b64encode(buf.read()).decode('ascii'))
plt.close('all')
json.dumps(__nebula_plots__)
`);
        const imgs = JSON.parse(String(capturedJson || '[]')) as string[];
        if (imgs.length > 0) {
          setPythonPlots(imgs);
        }
      }

      if (result !== undefined && result !== null) {
        setConsoleOutput((prev) => [...prev, `[return]: ${String(result)}`]);
      }
      setConsoleOutput((prev) => [...prev, '✅ Python execution completed successfully!']);
    } catch (err: any) {
      setConsoleOutput((prev) => [...prev, `❌ Python Error: ${err.message}`]);
    } finally {
      setIsRunningPython(false);
    }
  };

  const handleForceRun = () => {
    setLiveCode(code);
    setIsSyncing(false);
    if (isPython) {
      runPythonCode(code);
    } else {
      setConsoleOutput([]);
      setPreviewNonce((n) => n + 1);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleForceRun();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = `${code.slice(0, start)}  ${code.slice(end)}`;
      setCode(updated);
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  };

  const showEditor = activeTab === 'split' || activeTab === 'code';
  const showPreview = activeTab === 'split' || activeTab === 'preview';
  const languageOptions = SUPPORTED_LANGUAGES.some((opt) => opt.value === language)
    ? SUPPORTED_LANGUAGES
    : [...SUPPORTED_LANGUAGES, { value: language, label: language.toUpperCase() }];
  const hasErrorLog = consoleOutput.some((line) => line.startsWith('❌'));

  return (
    <div
      className={`flex flex-col bg-white dark:bg-[#161616] border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 w-screen h-screen z-50'
          : activeTab === 'split'
            ? 'fixed inset-0 z-50 w-full h-full lg:static lg:z-40 lg:w-[56vw] xl:w-[58vw]'
            : 'fixed inset-0 z-50 w-full h-full lg:static lg:z-40 lg:w-[50vw] xl:w-[48vw]'
      }`}
    >
      {/* Top Studio Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1B1B1B]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[160px] sm:max-w-[240px]">
              {title}
            </span>
            <select
              aria-label="Canvas runtime language"
              value={language}
              onChange={(e) => {
                setLanguage(normalizeLanguage(e.target.value));
                setConsoleOutput([]);
                setPythonPlots([]);
                setPreviewNonce((n) => n + 1);
              }}
              className="text-[10px] text-gray-500 dark:text-gray-400 bg-transparent font-mono uppercase tracking-wider outline-none cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 w-fit"
            >
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1B1B1B] text-gray-900 dark:text-gray-100">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* 3-Way Tab Switcher: Split (Live Code + Running UI), Preview, Code */}
          <div className="flex items-center p-0.5 rounded-lg bg-gray-200/60 dark:bg-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('split')}
              title="Real-Time Split View (Code + Live Preview)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Columns2 size={13} />
              <span>Split</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              title="Preview Only"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              title="Code Only"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <Code2 size={13} />
              <span>Code</span>
            </button>
          </div>

          {/* Viewport controls for web previews */}
          {showPreview && !isPython && (
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-200/60 dark:bg-gray-800">
              <button
                onClick={() => setViewport('desktop')}
                title="Desktop View"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Monitor size={13} />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                title="Tablet View (768px)"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewport === 'tablet'
                    ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Tablet size={13} />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                title="Mobile View (375px)"
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Smartphone size={13} />
              </button>
            </div>
          )}

          {/* Run / Refresh Button */}
          {isPython ? (
            <button
              onClick={() => runPythonCode(code)}
              disabled={isRunningPython}
              title="Run Python (Ctrl+Enter)"
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Play size={12} className={isRunningPython ? 'animate-spin' : ''} />
              <span>{isRunningPython ? 'Running...' : 'Run Python'}</span>
            </button>
          ) : (
            <button
              onClick={handleForceRun}
              title="Re-run / Refresh Live View (Ctrl+Enter)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <RotateCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing' : 'Refresh'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            title="Download Code File"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Download size={14} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden sm:block cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close Canvas */}
          <button
            onClick={onClose}
            title="Close Canvas"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Workspace Stage */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#F8F9FA] dark:bg-[#0F0F0F] overflow-hidden">
        <div className={`flex-1 flex min-h-0 overflow-hidden ${activeTab === 'split' ? 'flex-col md:flex-row' : 'flex-col'}`}>
          {/* Live Editable Code Editor */}
          {showEditor && (
            <div
              className={`flex flex-col p-2.5 sm:p-3 overflow-hidden min-h-0 ${
                activeTab === 'split'
                  ? 'h-1/2 md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800'
                  : 'flex-1 h-full'
              }`}
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#161B22] border border-gray-800 rounded-t-xl text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Code2 size={13} className="text-blue-400" />
                  <span>Source Editor</span>
                </span>
                <span className="flex items-center gap-2 text-[11px]">
                  <span className={`inline-flex items-center gap-1 ${isSyncing ? 'text-amber-400' : 'text-emerald-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {isPython ? 'Ctrl+Enter to Run' : isSyncing ? 'Updating...' : 'Live Sync'}
                  </span>
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                placeholder="Edit your code here to see live updates..."
                className="flex-1 w-full p-3.5 sm:p-4 font-mono text-xs md:text-[13px] leading-relaxed bg-[#0D1117] text-gray-100 rounded-b-xl border border-t-0 border-gray-800 outline-none resize-none overflow-auto"
              />
            </div>
          )}

          {/* Live Running Output / Preview Pane */}
          {showPreview && (
            <div
              className={`flex flex-col min-h-0 overflow-hidden ${
                activeTab === 'split' ? 'h-1/2 md:h-full md:w-1/2' : 'flex-1 h-full'
              }`}
            >
              <div className="flex-1 flex items-center justify-center p-2.5 sm:p-3 overflow-auto min-h-0">
                {isPython ? (
                  <div className="w-full h-full flex flex-col p-3.5 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
                        <Terminal size={14} className="text-emerald-500" />
                        <span>Python 3.11 WebAssembly Sandbox</span>
                      </div>
                      <button
                        onClick={() => runPythonCode(code)}
                        disabled={isRunningPython}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Play size={12} className={isRunningPython ? 'animate-spin' : ''} />
                        <span>{isRunningPython ? 'Running...' : 'Run Script'}</span>
                      </button>
                    </div>

                    {/* Rendered Matplotlib Plots (if any) */}
                    {pythonPlots.length > 0 && (
                      <div className="mt-3 p-2.5 rounded-xl bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-gray-800 max-h-60 overflow-y-auto flex flex-col gap-2">
                        {pythonPlots.map((b64, idx) => (
                          <img
                            key={idx}
                            src={`data:image/png;base64,${b64}`}
                            alt={`Matplotlib Output ${idx + 1}`}
                            className="max-w-full rounded-lg mx-auto bg-white"
                          />
                        ))}
                      </div>
                    )}

                    {/* Python Output Terminal */}
                    <div className="flex-1 overflow-y-auto mt-3 p-3 rounded-xl bg-[#0D1117] text-gray-200 font-mono text-xs space-y-1">
                      {consoleOutput.length === 0 ? (
                        <div className="text-gray-500 italic py-6 text-center">
                          Click &quot;Run Script&quot; or press Ctrl+Enter in the editor to execute Python live in WebAssembly.
                        </div>
                      ) : (
                        consoleOutput.map((line, idx) => (
                          <div
                            key={idx}
                            className={
                              line.startsWith('❌')
                                ? 'text-red-400'
                                : line.startsWith('✅')
                                  ? 'text-emerald-400'
                                  : 'text-gray-300 whitespace-pre-wrap break-words'
                            }
                          >
                            {line}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`h-full max-w-full transition-all duration-300 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col ${
                      viewport === 'mobile' ? 'w-[375px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full'
                    }`}
                  >
                    <iframe
                      key={`${previewChannelRef.current}-${language}-${previewNonce}`}
                      ref={iframeRef}
                      title="Canvas Preview"
                      sandbox="allow-scripts allow-modals"
                      srcDoc={previewHtml}
                      className="w-full h-full border-none bg-white dark:bg-[#121212]"
                    />
                  </div>
                )}
              </div>

              {/* Expandable Console Bar for Live Web/React/JS Previews */}
              {consoleOutput.length > 0 && !isPython && (
                <div className="border-t border-gray-200 dark:border-gray-800 bg-[#0D1117] text-gray-300 shrink-0">
                  <div className="flex items-center justify-between px-4 py-1.5 text-xs font-mono text-gray-400">
                    <button
                      onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                      className="flex items-center gap-2 hover:text-white cursor-pointer"
                    >
                      <Terminal size={12} className={hasErrorLog ? 'text-red-400' : 'text-emerald-400'} />
                      <span className={hasErrorLog ? 'text-red-300 font-semibold' : ''}>
                        Console ({consoleOutput.length})
                      </span>
                      <span className="text-[10px]">{isConsoleOpen ? 'Hide ▲' : 'Show ▼'}</span>
                    </button>
                    <button
                      onClick={() => setConsoleOutput([])}
                      title="Clear Console"
                      className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-200 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {isConsoleOpen && (
                    <div className="max-h-36 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#090D13] border-t border-gray-800/70">
                      {consoleOutput.map((c, i) => (
                        <div
                          key={i}
                          className={`whitespace-pre-wrap break-words ${
                            c.startsWith('❌')
                              ? 'text-red-400'
                              : c.startsWith('⚠️')
                                ? 'text-amber-300'
                                : 'text-gray-300'
                          }`}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
