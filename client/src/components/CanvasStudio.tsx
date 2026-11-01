import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';

interface CanvasStudioProps {
  initialCode: string;
  initialLanguage: string;
  title?: string;
  onClose: () => void;
}

export const CanvasStudio: React.FC<CanvasStudioProps> = ({
  initialCode,
  initialLanguage = 'html',
  title = 'Interactive Canvas Studio',
  onClose,
}) => {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage.toLowerCase());
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isRunningPython, setIsRunningPython] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync state if initial props change
  useEffect(() => {
    setCode(initialCode);
    setLanguage(initialLanguage.toLowerCase());
    setConsoleOutput([]);
  }, [initialCode, initialLanguage]);

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

  // Build the sandboxed HTML document
  const generatePreviewHtml = () => {
    const cleanLang = language.toLowerCase();

    // 1. SVG rendering
    if (cleanLang === 'svg' || code.trim().startsWith('<svg')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-[#121212]">
  <div class="max-w-full max-h-[85vh] p-4 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center">
    ${code}
  </div>
</body>
</html>`;
    }

    // 2. React / JSX / TSX rendering
    if (cleanLang === 'jsx' || cleanLang === 'tsx' || cleanLang === 'react' || code.includes('import React') || code.includes('export default function')) {
      // Strip import/export statements for in-browser standalone execution
      let componentCode = code
        .replace(/import\s+.*?\s+from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+function\s+/g, 'function App ')
        .replace(/export\s+default\s+/g, 'const App = ')
        .replace(/export\s+/g, '');

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 p-4">
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${componentCode}

      const TargetComp = typeof App !== 'undefined' ? App : (typeof Component !== 'undefined' ? Component : null);
      if (TargetComp) {
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(TargetComp));
      } else {
        document.getElementById('root').innerHTML = '<div class="p-6 text-amber-500 font-mono text-sm">⚠️ Please define a function named "App" to mount the component.</div>';
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div class="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-mono text-xs"><strong>Runtime Error:</strong><br>' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
    }

    // 3. Standard HTML / Tailwind / CSS / JS rendering
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100">
  ${code}
</body>
</html>`;
  };

  // Run Python via Pyodide WebAssembly in browser
  const runPythonCode = async () => {
    setIsRunningPython(true);
    setIsConsoleOpen(true);
    setConsoleOutput(['⏳ Initializing Pyodide Python 3.11 WebAssembly Runtime...']);

    try {
      // Check if pyodide is already on window
      const win = window as any;
      if (!win.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        });
      }

      setConsoleOutput(prev => [...prev, '⚡ Compiling and executing Python environment...']);
      const pyodide = await win.loadPyodide({
        stdout: (text: string) => {
          setConsoleOutput(prev => [...prev, `[stdout]: ${text}`]);
        },
        stderr: (text: string) => {
          setConsoleOutput(prev => [...prev, `[stderr]: ${text}`]);
        },
      });

      // Prepare matplotlib figure capture if matplotlib is used
      if (code.includes('matplotlib') || code.includes('plt.')) {
        await pyodide.loadPackage(['matplotlib', 'numpy']);
      }

      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined) {
        setConsoleOutput(prev => [...prev, `[return]: ${String(result)}`]);
      }
      setConsoleOutput(prev => [...prev, '✅ Python execution completed successfully!']);
    } catch (err: any) {
      setConsoleOutput(prev => [...prev, `❌ Python Error: ${err.message}`]);
    } finally {
      setIsRunningPython(false);
    }
  };

  const isPython = language === 'python' || language === 'py';

  return (
    <div className={`flex flex-col bg-white dark:bg-[#161616] border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-all duration-300 z-40 ${
      isFullscreen 
        ? 'fixed inset-0 w-screen h-screen' 
        : 'w-full lg:w-[50vw] xl:w-[48vw] h-full'
    }`}>
      {/* Top Studio Control Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1B1B1B]">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px] md:max-w-[280px]">
              {title}
            </span>
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
              {language}
            </span>
          </div>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Tab Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-gray-200/60 dark:bg-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
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
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
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
          {activeTab === 'preview' && !isPython && (
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-200/60 dark:bg-gray-800">
              <button
                onClick={() => setViewport('desktop')}
                title="Desktop View"
                className={`p-1 rounded-md transition-all ${
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
                className={`p-1 rounded-md transition-all ${
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
                className={`p-1 rounded-md transition-all ${
                  viewport === 'mobile' 
                    ? 'bg-white dark:bg-[#252525] text-black dark:text-white shadow-2xs' 
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Smartphone size={13} />
              </button>
            </div>
          )}

          {/* Run Python Button */}
          {isPython && (
            <button
              onClick={runPythonCode}
              disabled={isRunningPython}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Play size={12} className={isRunningPython ? 'animate-spin' : ''} />
              <span>{isRunningPython ? 'Running...' : 'Run Python'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownload}
            title="Download Code File"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={14} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden sm:block"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close Canvas */}
          <button
            onClick={onClose}
            title="Close Canvas"
            className="p-1.5 rounded-lg text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Workspace Stage */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-[#F8F9FA] dark:bg-[#0F0F0F] overflow-hidden">
        {/* Preview Tab */}
        {activeTab === 'preview' ? (
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto">
            {isPython ? (
              <div className="w-full h-full flex flex-col p-4 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
                    <Terminal size={14} className="text-emerald-500" />
                    <span>Python 3.11 WebAssembly Sandbox</span>
                  </div>
                  <button
                    onClick={runPythonCode}
                    disabled={isRunningPython}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Run Script</span>
                  </button>
                </div>

                {/* Python Output Terminal */}
                <div className="flex-1 overflow-y-auto mt-3 p-3 rounded-xl bg-[#0D1117] text-gray-200 font-mono text-xs space-y-1">
                  {consoleOutput.length === 0 ? (
                    <div className="text-gray-500 italic py-6 text-center">
                      Click "Run Script" above to execute this Python code live in your browser via WebAssembly.
                    </div>
                  ) : (
                    consoleOutput.map((line, idx) => (
                      <div key={idx} className={line.startsWith('❌') ? 'text-red-400' : line.startsWith('✅') ? 'text-emerald-400' : 'text-gray-300'}>
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className={`h-full transition-all duration-300 bg-white dark:bg-[#181818] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col ${
                viewport === 'mobile' ? 'w-[375px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full'
              }`}>
                <iframe
                  ref={iframeRef}
                  title="Canvas Preview"
                  sandbox="allow-scripts allow-modals"
                  srcDoc={generatePreviewHtml()}
                  className="w-full h-full border-none"
                />
              </div>
            )}
          </div>
        ) : (
          /* Code Tab (Live Editable Code Editor) */
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161B22] border border-gray-800 rounded-t-xl text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Code2 size={13} className="text-blue-400" />
                <span>Editable Source Code</span>
              </span>
              <span className="text-[11px] text-gray-500">Live Auto-Reload</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 font-mono text-xs md:text-[13px] leading-relaxed bg-[#0D1117] text-gray-100 rounded-b-xl border border-t-0 border-gray-800 outline-none resize-none overflow-auto"
            />
          </div>
        )}

        {/* Expandable Console Bar */}
        {consoleOutput.length > 0 && !isPython && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-[#0D1117] text-gray-300">
            <button
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-mono text-gray-400 hover:text-white"
            >
              <div className="flex items-center gap-2">
                <Terminal size={12} />
                <span>Console Output ({consoleOutput.length})</span>
              </div>
              <span className="text-[10px]">{isConsoleOpen ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            {isConsoleOpen && (
              <div className="max-h-36 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#090D13]">
                {consoleOutput.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
