
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';

const Editor = () => {
  // Create a 'ref' to hold the editor's DOM element
  const editorRef = useRef<HTMLDivElement>(null);

  // 'useEffect' runs this code once when the component is first rendered
  useEffect(() => {
    // Don't do anything if the ref isn't attached to an element yet
    if (!editorRef.current) return;

    // Create the initial state of the editor
    const startState = EditorState.create({
      doc: 'console.log("Hey Chaitu!");', 
      extensions: [
        keymap.of(defaultKeymap), // Standard keyboard shortcuts
        javascript(),             // Enable JavaScript language support
      ],
    });

    // Create the editor view and attach it to our div
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    // This function cleans up the editor when the component is removed
    return () => {
      view.destroy();
    };
  }, []); // The empty array ensures this effect runs only once

  // This div is where the editor will be mounted
  return <div className="h-full" ref={editorRef} />;
};

export default Editor;