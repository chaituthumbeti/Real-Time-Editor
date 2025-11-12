import React, { useEffect, useRef, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { oneDark } from "@codemirror/theme-one-dark";
import { supabase } from "./supabaseClient";
const serverURL =
  import.meta.env.MODE === "development"
    ? "ws://localhost:3001"
    : "wss://real-time-editor-server-h96u.onrender.com";

function resolveApiBase(): string {
  try {
    if (import.meta.env && import.meta.env.DEV) {
      return "http://localhost:3001";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // ignore
  }
  return `${location.protocol}//${location.host}`;
}
console.log("[Editor DEBUG] api base resolver ->", resolveApiBase());

interface StatusEvent {
  status: "connecting" | "connected" | "disconnected";
}

const niceColors = [
  "#8b5cf6",
  "#6366f1",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
];

const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  ".cm-content": {
    caretColor: "#1e293b",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#1e293b",
  },
  ".cm-selectionBackground": {
    backgroundColor: "#e2e8f0",
  },
  ".cm-activeLine": {
    backgroundColor: "#f1f5f9",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    border: "none",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "#64748b",
  },
});

const themeCompartment = new Compartment();
const languageCompartment = new Compartment();

function getLangExtension(lang: string) {
  switch ((lang || "").toLowerCase()) {
    case "javascript":
    case "js":
      return javascript();
    case "python":
    case "py":
      return python();
    case "c":
    case "cpp":
    case "c++":
      return cpp();
    case "java":
      return java();
    default:
      return javascript();
  }
}

interface EditorProps {
  docId: string;
  initialContent: Uint8Array;
  title?: string;
  onConnectionStatusChange?: (
    status: "connecting" | "connected" | "disconnected"
  ) => void;
  theme?: "light" | "dark";
  language?: string;
  filename?: string;
}

function inferLanguageFromFilename(filename?: string): string | undefined {
  if (!filename) return undefined;
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  const map: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    java: "java",
  };
  return map[ext];
}

const Editor: React.FC<EditorProps> = ({
  docId,
  initialContent,
  onConnectionStatusChange,
  theme = "dark",
  language: initialLanguage = "javascript",
  filename: initialFilename,
}) => {
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stdinInput, setStdinInput] = useState<string>("");
  const [showInputModal, setShowInputModal] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);

  // infer language from filename (runs once / when props change)
  useEffect(() => {
    const inferred = inferLanguageFromFilename(initialFilename);
    setLanguage(initialLanguage || inferred || "javascript");
  }, [initialLanguage, initialFilename]);

  const handleExecuteCode = () => {
    if (!view) return;

    const codeToRun = view.state.doc.toString();

    console.log("[Editor] Starting execution via REST API...");
    setOutput("Running...\n");
    setShowInputModal(false);

    const base = resolveApiBase().replace(/\/$/, "");
    const execUrl = `${base}/execute`;

    try {
      fetch(execUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToRun,
          language,
          stdin: stdinInput,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((result) => {
          console.log("[Editor] Result received:", result);

          let resultOutput = result.stdout || "";
          if (result.stderr) {
            resultOutput +=
              (resultOutput ? "\n" : "") + "Error:\n" + result.stderr;
          }
          if (result.compile_output) {
            resultOutput +=
              (resultOutput ? "\n" : "") +
              "Compile Error:\n" +
              result.compile_output;
          }
          setOutput(resultOutput || "Execution finished with no output.");
          setIsRunning(false);
        })
        .catch((error) => {
          console.error("[Editor] Execution error:", error);
          setOutput(`Failed to execute: ${error.message}`);
          setIsRunning(false);
        });
    } catch (error) {
      console.error("Execution error:", error);
      setOutput(`Failed to start execution: ${error}`);
      setIsRunning(false);
    }
  };

  const handleRunClick = () => {
    setShowInputModal(true);
  };

  const handleExecuteWithInput = () => {
    setIsRunning(true);
    handleExecuteCode();
  };

  useEffect(() => {
    if (!editorRef.current || !docId) return;
    let provider: WebsocketProvider | null = null;
    let editorView: EditorView | null = null;
    const ydoc = new Y.Doc();

    if (initialContent && initialContent.length > 0) {
      try {
        Y.applyUpdate(ydoc, initialContent);
      } catch (_e) {
        console.warn(_e);
      }
    }

    const initialize = async () => {
      if (!editorRef.current) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;

      const wsUrl = `${serverURL.replace(/\/$/, "")}/${encodeURIComponent(
        docId
      )}?token=${encodeURIComponent(token)}`;

      provider = new WebsocketProvider(wsUrl, docId, ydoc);

      provider.on("status", (event: StatusEvent) => {
        if (onConnectionStatusChange) onConnectionStatusChange(event.status);
      });

      const userColor =
        niceColors[Math.floor(Math.random() * niceColors.length)];
      provider.awareness.setLocalStateField("user", {
        name: session.user?.email || "Anonymous",
        color: userColor,
      });

      const ytext = ydoc.getText("codemirror");

      const startState = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          keymap.of([...defaultKeymap, ...yUndoManagerKeymap]),
          languageCompartment.of(getLangExtension(language)),
          yCollab(ytext, provider.awareness),
          themeCompartment.of(theme === "dark" ? oneDark : lightTheme),
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { overflow: "auto" },
          }),
        ],
      });

      editorView = new EditorView({
        state: startState,
        parent: editorRef.current,
      });
      setView(editorView);
    };

    initialize();

    return () => {
      provider?.destroy();
      editorView?.destroy();
      ydoc.destroy();
    };
  }, [docId, initialContent, onConnectionStatusChange, theme, language]);

  useEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(
        theme === "dark" ? oneDark : lightTheme
      ),
    });
  }, [theme, view]);

  useEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: languageCompartment.reconfigure(getLangExtension(language)),
    });
  }, [language, view]);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-900" : "bg-white"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`px-4 py-2 flex items-center justify-between border-b transition-colors duration-200 ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-slate-100 border-slate-200"
        }`}
      >
        <div className="flex items-center">
          <button
            onClick={() => window.history.back()}
            className={`px-3 py-1 rounded-md text-sm font-medium mr-2 transition-colors duration-200 ${
              theme === "dark"
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-800"
            }`}
          >
            Back
          </button>

          <div
            className={`text-sm px-2 py-1 rounded-md ${
              theme === "dark"
                ? "bg-slate-700 text-white"
                : "bg-white text-slate-800"
            }`}
          >
            Language: {language}
          </div>
        </div>

        <button
          onClick={handleRunClick}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 ${
            theme === "dark"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isRunning ? "Running..." : "Run"}
        </button>
      </div>

      {/* Editor and Output Panes */}
      <div className="flex-1 flex h-[calc(100%-49px)] overflow-hidden">
        {/* Editor Pane (left) */}
        <div
          className={`w-1/2 h-full flex flex-col ${
            theme === "dark" ? "bg-slate-800" : "bg-slate-50"
          }`}
        >
          <div
            className={`px-4 py-2 text-sm font-medium border-b ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            Editor
          </div>
          <div className="h-full flex-1" ref={editorRef} />
        </div>

        {/* Output Pane (right) */}
        <div
          className={`w-1/2 h-full flex flex-col border-l ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div
            className={`px-4 py-2 text-sm font-medium border-b ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}
          >
            Output{" "}
            {isRunning && (
              <span className="text-xs text-yellow-400 ml-2">(Running...)</span>
            )}
          </div>

          <div
            className={`flex-1 p-4 font-mono text-sm overflow-auto ${
              theme === "dark"
                ? "bg-slate-900 text-slate-300"
                : "bg-white text-slate-800"
            }`}
          >
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        </div>
      </div>

      {/* Input Modal (before execution) */}
      {showInputModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            theme === "dark" ? "bg-black/80" : "bg-white/80"
          }`}
          onClick={() => !isRunning && setShowInputModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-xl p-6 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800 border border-slate-700"
                : "bg-white border border-slate-200 shadow-lg"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                theme === "dark" ? "text-slate-200" : "text-slate-800"
              }`}
            >
              Program Input (stdin)
            </h3>
            <p
              className={`text-sm mb-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Enter any input your program needs. Leave empty if no input is
              required.
            </p>

            <textarea
              value={stdinInput}
              onChange={(e) => setStdinInput(e.target.value)}
              placeholder="Enter input here (one item per line)..."
              className={`w-full h-40 p-3 rounded-lg border transition-all duration-200 resize-none ${
                theme === "dark"
                  ? "bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400"
                  : "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-600"
              }`}
              autoFocus
            />

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowInputModal(false)}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteWithInput}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 ${
                  theme === "dark"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {isRunning ? "Running..." : "Run Program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
