import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket'; 
import { yCollab } from 'y-codemirror.next';

// 2. Get the server URL from the environment variable
const serverURL = import.meta.env.VITE_SERVER_URL;

const ydoc = new Y.Doc();

// 3. Connect to your server using the WebsocketProvider
//    The room name can be 'my-collaboration-room' for now.
const provider = new WebsocketProvider(serverURL, 'my-collaboration-room', ydoc);

const Editor = () => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const ytext = ydoc.getText('codemirror');

    const startState = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        keymap.of(defaultKeymap),
        javascript(),
        // 4. The yCollab part remains the same
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