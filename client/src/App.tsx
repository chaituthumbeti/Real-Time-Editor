// src/App.tsx
import Editor from './Editor';

function App() {
  return (
    <main className="h-screen bg-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900 p-4 shadow-md">
        <h1 className="text-xl font-bold">Real-Time Code Editor</h1>
      </header>

      {/* Editor Container */}
      <div className="h-[calc(100vh-64px)]">
        <Editor />
      </div>
    </main>
  );
}

export default App;