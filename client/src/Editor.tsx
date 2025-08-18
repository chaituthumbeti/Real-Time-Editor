import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { oneDark } from "@codemirror/theme-one-dark";
//import { highlightingFor } from "@codemirror/language";
//import { tags } from "@lezer/highlight";

const serverURL = import.meta.env.VITE_SERVER_URL;
const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  serverURL,
  window.location.pathname,
  ydoc
);

const niceColors = [
  "#3498db",
  "#2ecc71",
  "#e74c3c",
  "#f1c40f",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
];
const userColor = niceColors[Math.floor(Math.random() * niceColors.length)];

provider.awareness.setLocalStateField("user", {
  name: "User " + Math.floor(Math.random() * 100),
  color: userColor,
});

const myTheme = EditorView.theme({
  ".cm-string": { color: "#98c379" },
});

const Editor = () => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const ytext = ydoc.getText("codemirror");

    const startState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        keymap.of([...defaultKeymap, ...yUndoManagerKeymap]),
        javascript(),
        yCollab(ytext, provider.awareness),
        oneDark,
        myTheme,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    return () => {
      view.destroy();
    };
  }, []);

  return <div className="h-full" ref={editorRef} />;
};

export default Editor;
