'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { autocompletion, type CompletionContext } from '@codemirror/autocomplete';
import { cpp } from '@codemirror/lang-cpp';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';

const DEFAULT_CODE = `#include <stdio.h>

int main(void) {
    printf("Hello, CForge!\\n");
    return 0;
}`;
const DEFAULT_JS_CODE = `console.log("Hello, CForge!");
`;
type Language = 'c' | 'javascript';
type Project = { id: string; title: string; code: string; language?: Language };
type Result = { status?: { id: number; description: string }; stdout?: string | null; stderr?: string | null; compile_output?: string | null; message?: string | null; time?: string | null; memory?: number | null; error?: string };

const C_COMPLETIONS = [
  { label: 'printf', type: 'function', detail: 'Print formatted output' },
  { label: 'scanf', type: 'function', detail: 'Read formatted input' },
  { label: 'strlen', type: 'function', detail: 'Get string length' },
  { label: 'malloc', type: 'function', detail: 'Allocate memory' },
  { label: 'free', type: 'function', detail: 'Release memory' },
  { label: 'include', type: 'keyword' },
  { label: 'int', type: 'type' },
  { label: 'char', type: 'type' },
  { label: 'float', type: 'type' },
  { label: 'double', type: 'type' },
  { label: 'void', type: 'type' },
  { label: 'if', type: 'keyword' },
  { label: 'else', type: 'keyword' },
  { label: 'for', type: 'keyword' },
  { label: 'while', type: 'keyword' },
  { label: 'do', type: 'keyword' },
  { label: 'switch', type: 'keyword' },
  { label: 'case', type: 'keyword' },
  { label: 'return', type: 'keyword' },
  { label: 'struct', type: 'keyword' },
];
const JS_COMPLETIONS = [
  { label: 'console.log', type: 'function', detail: 'Print a value to stdout' },
  { label: 'console.error', type: 'function', detail: 'Print an error to stderr' },
  { label: 'process.stdin', type: 'variable', detail: 'Read standard input' },
  { label: 'process.stdout', type: 'variable', detail: 'Write to standard output' },
  { label: 'require', type: 'function', detail: 'Load a Node.js module' },
  { label: 'setTimeout', type: 'function', detail: 'Schedule a callback' },
  { label: 'JSON', type: 'class', detail: 'JSON utilities' },
  { label: 'Array', type: 'class', detail: 'Array constructor' },
  { label: 'Math', type: 'class', detail: 'Math utilities' },
  { label: 'const', type: 'keyword' },
  { label: 'let', type: 'keyword' },
  { label: 'function', type: 'keyword' },
  { label: 'return', type: 'keyword' },
  { label: 'if', type: 'keyword' },
  { label: 'else', type: 'keyword' },
  { label: 'for', type: 'keyword' },
  { label: 'while', type: 'keyword' },
  { label: 'async', type: 'keyword' },
  { label: 'await', type: 'keyword' },
];

function cCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: C_COMPLETIONS };
}
function javascriptCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z_$][A-Za-z0-9_$]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: JS_COMPLETIONS };
}

export default function CForgeEditor({ project, isAuthenticated }: { project?: Project; isAuthenticated: boolean }) {
  const [title, setTitle] = useState(project?.title ?? 'Untitled project');
  const [code, setCode] = useState(project?.code ?? DEFAULT_CODE);
  const [language, setLanguage] = useState<Language>(project?.language ?? 'c');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('READY');
  const [metrics, setMetrics] = useState({ time: '—', memory: '—' });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [projectId, setProjectId] = useState(project?.id);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const runRef = useRef<() => void>(() => {});

  const save = useCallback(async () => {
    if (!isAuthenticated) { setMessage('Sign in from the home page to save projects.'); return; }
    if (!title.trim() || !code.trim()) { setMessage('Add a title and some C code first.'); return; }
    setSaving(true); setMessage('');
    try {
      const response = await fetch(projectId ? `/api/saved-codes/${projectId}` : '/api/saved-codes', {
        method: projectId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), code, language }),
      });
      const payload = (await response.json()) as { error?: string; savedCode?: { id: string } };
      if (!response.ok) { setMessage(payload.error ?? 'Unable to save project.'); return; }
      setMessage('Saved just now.');
      if (!projectId && payload.savedCode?.id) {
        setProjectId(payload.savedCode.id);
        window.history.replaceState(null, '', `/editor/${payload.savedCode.id}`);
      }
    } catch { setMessage('Unable to save project right now.'); } finally { setSaving(false); }
  }, [code, isAuthenticated, language, projectId, title]);

  useEffect(() => {
    if (!projectId || !isAuthenticated) return;
    const timer = window.setTimeout(() => { void save(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [code, projectId, save]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true); setStatus('RUNNING'); setOutput(''); setMetrics({ time: '—', memory: '—' });
    try {
      const response = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceCode: code, stdin, language }) });
      const result = (await response.json()) as Result;
      if (!response.ok) throw new Error(result.error ?? 'Execution failed.');
      const accepted = result.status?.id === 3;
      setStatus(accepted ? 'ACCEPTED' : (result.status?.description ?? 'ERROR').toUpperCase());
      setOutput(result.compile_output || result.stderr || result.message || result.stdout || '');
      setMetrics({ time: result.time ? `${result.time}s` : '—', memory: result.memory == null ? '—' : `${result.memory} KB` });
    } catch (error) { setStatus('ERROR'); setOutput(error instanceof Error ? error.message : 'Unable to run code.'); }
    finally { setRunning(false); }
  }, [code, language, stdin, running]);

  function changeLanguage(nextLanguage: Language) {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    setCode(nextLanguage === 'c' ? DEFAULT_CODE : DEFAULT_JS_CODE);
    setOutput('');
    setStatus('READY');
  }

  useEffect(() => { runRef.current = () => { void run(); }; }, [run]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runRef.current(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={`editor-page${isFullscreen ? ' editor-fullscreen' : ''}`}>
      <header className="editor-nav">
        <Link href="/" className="brand"><span className="brand-mark">KS</span><span>Kasim Saifi <em>CForge Studio</em></span></Link>
        <div className="editor-nav-actions"><Link href="/dashboard" className="nav-link">Dashboard</Link><Link href="/" className="nav-link">Home</Link>{isAuthenticated ? <span className="save-state">{message || 'Autosave on'}</span> : <Link href="/?auth=required" className="nav-link">Sign in to save</Link>}</div>
      </header>
      <main className="editor-layout">
        <section className="code-panel">
          <div className="code-toolbar">
            <Link href="/dashboard" className="back-link">← Projects</Link>
            <span className="workspace-owner">Kasim Saifi</span>
            <div className="project-name">
              {isEditingTitle ? (
                <input
                  id="project-title"
                  className="project-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(event) => { if (event.key === 'Enter') setIsEditingTitle(false); }}
                  autoFocus
                  aria-label="Project name"
                />
              ) : (
                <>
                  <span className="project-title-text">{title}</span>
                  <button className="edit-title-button" onClick={() => setIsEditingTitle(true)} aria-label="Edit project name" title="Edit project name">✎</button>
                </>
              )}
            </div>
            <select className="language-select" value={language} onChange={(event) => changeLanguage(event.target.value as Language)} aria-label="Programming language">
              <option value="c">C</option>
              <option value="javascript">Node.js</option>
            </select>
            <button className="secondary-button small" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="run-button" onClick={() => void run()} disabled={running}>
              {running ? 'Running…' : '▶ Run'} <kbd>Ctrl ↵</kbd>
            </button>
            <button className="fullscreen-button" onClick={() => setIsFullscreen((current) => !current)} aria-label={isFullscreen ? 'Exit editor fullscreen' : 'Open editor fullscreen'} title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen editor'}>
              {isFullscreen ? '↙ Exit' : '↗ Focus'}
            </button>
          </div>
          <div className="editor-container">
            <CodeMirror
              value={code}
              height="100%"
              theme={oneDark}
              extensions={[
                language === 'c' ? cpp() : javascript(),
                autocompletion({
                  override: [language === 'c' ? cCompletionSource : javascriptCompletionSource],
                  activateOnTyping: true,
                  defaultKeymap: true,
                }),
                keymap.of([indentWithTab]),
              ]}
              onChange={setCode}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                autocompletion: false,
              }}
            />
          </div>
          <div className="editor-status"><span>{language === 'c' ? 'C / GNU 9.2.0' : 'JavaScript / Node.js 22'}</span><span>Suggestions enabled · Tab inserts spaces</span><span>UTF-8</span></div>
        </section>
        <aside className="run-panel"><div className="side-heading"><span>STANDARD INPUT</span><small>stdin</small></div><textarea className="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Enter input for your program…" /><div className="side-heading"><span>OUTPUT</span><strong className={`status-${status.toLowerCase()}`}>{status}</strong></div><div className="output">{running ? <div className="output-empty">Compiling and running…</div> : output ? <pre>{output}</pre> : <div className="output-empty">Run your program to see output.</div>}</div><div className="metrics"><span>Time <b>{metrics.time}</b></span><span>Memory <b>{metrics.memory}</b></span></div></aside>
      </main>
    </div>
  );
}
