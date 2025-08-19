import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { oneDark } from "@codemirror/theme-one-dark";
import { supabase } from "./supabaseClient";
import { useParams } from "react-router-dom";
import debounce from "lodash.debounce";

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
  const { docId } = useParams<{ docId: string }>();

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
    let view: EditorView | null = null;
    const ydoc = new Y.Doc();

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
          oneDark,
        ],
      });

      view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });
    };

    initialize();

    return () => {
      provider?.destroy();
      view?.destroy();
      ydoc.destroy();
    };
  }, [docId, onConnectionStatusChange, saveDocument]);

  return <div className="h-full flex-1" ref={editorRef} />;
};

export default Editor;
