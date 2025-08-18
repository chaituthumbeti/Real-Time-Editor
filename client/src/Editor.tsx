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

  return <div className="flex-1" ref={editorRef} />;
};

export default Editor;
