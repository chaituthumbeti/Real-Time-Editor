import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { oneDark } from "@codemirror/theme-one-dark";
import { supabase } from "./supabaseClient";

const serverURL = import.meta.env.VITE_SERVER_URL || "ws://localhost:3001";
const niceColors = [
  "#8b5cf6",
  "#6366f1",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
];

interface StatusEvent {
  status: "connecting" | "connected" | "disconnected";
}

interface EditorProps {
  onConnectionStatusChange?: (
    status: "connecting" | "connected" | "disconnected"
  ) => void;
}

const Editor = ({ onConnectionStatusChange }: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      serverURL,
      window.location.pathname,
      ydoc
    );

    const setupAwareness = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const userColor =
          niceColors[Math.floor(Math.random() * niceColors.length)];
        provider.awareness.setLocalStateField("user", {
          name: session.user.email || "Anonymous",
          color: userColor,
        });
      }
    };

    setupAwareness();

    // Listen for connection status changes
    provider.on("status", (event: StatusEvent) => {
      if (onConnectionStatusChange) {
        onConnectionStatusChange(event.status);
      }
    });

    const ytext = ydoc.getText("codemirror");
    const startState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        keymap.of([...defaultKeymap, ...yUndoManagerKeymap]),
        javascript(),
        yCollab(ytext, provider.awareness),
        oneDark,
        EditorView.theme({
          "&": {
            fontSize: "14px",
            backgroundColor: "#0f172a",
            color: "#e2e8f0",
            height: "100%",
          },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          },
          ".cm-content": {
            caretColor: "#a5b4fc",
            padding: "16px",
          },
          ".cm-cursor": {
            borderLeftColor: "#a5b4fc",
          },
          ".cm-selectionBackground": {
            backgroundColor: "#334155",
          },
          ".cm-line": {
            padding: "0 4px",
          },
          ".cm-string": { color: "#a5b4fc" },
          ".cm-keyword": { color: "#c084fc" },
          ".cm-atom": { color: "#f472b6" },
          ".cm-number": { color: "#fbbf24" },
          ".cm-comment": { color: "#64748b", fontStyle: "italic" },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    return () => {
      provider.destroy();
      ydoc.destroy();
      view.destroy();
    };
  }, [onConnectionStatusChange]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors duration-200 flex items-center space-x-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
            <span>Save</span>
          </button>

          <button className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-md text-sm transition-all duration-200 flex items-center space-x-1.5 shadow-md">
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
            <span>Run</span>
          </button>

          <div className="w-px h-6 bg-slate-600"></div>

          <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors duration-200 flex items-center space-x-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 00-.895-.01V8zM12 8a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span>Share</span>
          </button>

          <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition-colors duration-200 flex items-center space-x-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L8.586 10l-2.879 2.879a1 1 0 11-1.414-1.414L7.172 10 5.707 8.707a1 1 0 010-1.414zm8.586 0a1 1 0 011.414 0l2.879 2.879a1 1 0 11-1.414 1.414L14.414 10l2.879-2.879a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>Settings</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <span>JavaScript</span>
          <div className="w-px h-4 bg-slate-600"></div>
          <span>main.js</span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <div className="h-full" ref={editorRef} />
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span>Ln 1, Col 1</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L8.586 10l-2.879 2.879a1 1 0 11-1.414-1.414L7.172 10 5.707 8.707a1 1 0 010-1.414zm8.586 0a1 1 0 011.414 0l2.879 2.879a1 1 0 11-1.414 1.414L14.414 10l2.879-2.879a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>Spaces: 2</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-green-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>LF</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-purple-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
