import { useEffect, useRef, useState, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment } from "@codemirror/state";
import { supabase } from "./supabaseClient";
import { useParams } from "react-router-dom";
import debounce from "lodash.debounce";

interface StatusEvent {
  status: "connecting" | "connected" | "disconnected";
}

const serverURL = import.meta.env.VITE_SERVER_URL || "ws://localhost:3001";
const apiURL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const niceColors = [
  "#8b5cf6",
  "#6366f1",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
];

interface EditorProps {
  onConnectionStatusChange?: (
    status: "connecting" | "connected" | "disconnected"
  ) => void;
  theme?: "light" | "dark";
}

// Create a light theme for CodeMirror
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
const Editor = ({ onConnectionStatusChange, theme = "dark" }: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { docId } = useParams<{ docId: string }>();
  const [view, setView] = useState<EditorView | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);

  const handleRunCode = async () => {
    if (!view) return;
    setIsRunning(true);
    setOutput("Executing...");
    const codeToRun = view.state.doc.toString();
    try {
      const response = await fetch(`${apiURL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeToRun }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.stdout) {
        setOutput(result.stdout);
      } else if (result.stderr) {
        setOutput(`Error:\n${result.stderr}`);
      } else if (result.compile_output) {
        setOutput(`Compile Error:\n${result.compile_output}`);
      } else {
        setOutput("Execution finished with no output.");
      }
    } catch (error) {
      console.error("Failed to run code:", error);
      setOutput("Failed to connect to the execution service.");
    } finally {
      setIsRunning(false);
    }
  };

  const saveDocument = useCallback(
    debounce(async (doc: Y.Doc) => {
      if (!docId) return;
      const content = Y.encodeStateAsUpdate(doc);
      await supabase
        .from("documents")
        .update({ content: Array.from(content) })
        .eq("id", docId);
    }, 2000),
    [docId]
  );

  useEffect(() => {
    if (!editorRef.current || !docId) return;
    let provider: WebsocketProvider | null = null;
    let editorView: EditorView | null = null;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const initialize = async () => {
      if (!editorRef.current) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const token = session.access_token;
      provider = new WebsocketProvider(
        `${serverURL}?token=${token}`,
        docId,
        ydoc
      );
      provider.on("status", (event: StatusEvent) => {
        if (onConnectionStatusChange) onConnectionStatusChange(event.status);
      });
      const userColor =
        niceColors[Math.floor(Math.random() * niceColors.length)];
      provider.awareness.setLocalStateField("user", {
        name: session.user.email || "Anonymous",
        color: userColor,
      });

      const { data: docData, error } = await supabase
        .from("documents")
        .select("content")
        .eq("id", docId)
        .single();
      if (error) console.error("Error fetching document:", error);
      if (
        docData?.content &&
        Array.isArray(docData.content) &&
        docData.content.length > 0
      ) {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(docData.content));
        } catch (e) {
          console.error("Failed to apply update from DB:", e);
        }
      }

      const ytext = ydoc.getText("codemirror");
      ydoc.on("update", (_update, origin) => {
        if (origin !== provider) saveDocument(ydoc);
      });

      const startState = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          keymap.of([...defaultKeymap, ...yUndoManagerKeymap]),
          javascript(),
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
  }, [docId, onConnectionStatusChange, saveDocument]);

  useEffect(() => {
    if (!view) return;

    // Update the theme using the compartment
    view.dispatch({
      effects: themeCompartment.reconfigure(
        theme === "dark" ? oneDark : lightTheme
      ),
    });
  }, [theme, view]);

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-900" : "bg-white"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`px-4 py-2 flex items-center justify-end border-b transition-colors duration-200 ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-slate-100 border-slate-200"
        }`}
      >
        <button
          onClick={handleRunCode}
          disabled={isRunning}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 ${
            theme === "dark"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isRunning ? (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span>{isRunning ? "Running..." : "Run"}</span>
        </button>
      </div>

      {/* Editor and Output Panes */}
      <div className="flex-1 flex h-[calc(100%-49px)] overflow-hidden">
        {/* Editor Pane */}
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

        {/* Output Pane */}
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
            Output
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
    </div>
  );
};

export default Editor;
