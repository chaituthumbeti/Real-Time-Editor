// src/Editor.tsx
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';

// Define the props for our component
interface EditorProps {
  onDocChange: (doc: string) => void;
}

const Editor = ({ onDocChange }: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: 'console.log("Hello, World!");',
      extensions: [
        keymap.of(defaultKeymap),
        javascript(),
        // Add a listener that fires on every update
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // When the document changes, call the function from props
            onDocChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    return () => {
      view.destroy();
    };
  }, [onDocChange]); // Add onDocChange to the dependency array

  return <div className="h-full" ref={editorRef} />;
};

export default Editor;