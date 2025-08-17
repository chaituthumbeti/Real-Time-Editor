// src/Editor.tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { yCollab } from 'y-codemirror.next';

// 1. Create a Yjs document
const ydoc = new Y.Doc();

// 2. Create a "provider" to sync the document over the network.
// We're using a WebRTC provider here which is great for peer-to-peer connections.
// 'my-collaboration-room' can be any unique name for your document.
const provider = new WebrtcProvider('my-collaboration-room', ydoc);

const Editor = () => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // 3. Get the shared text type from the Yjs document
    const ytext = ydoc.getText('codemirror');

    const startState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        keymap.of(defaultKeymap),
        javascript(),
        // 4. Add the Yjs collaboration plugin
        yCollab(ytext, provider.awareness),
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