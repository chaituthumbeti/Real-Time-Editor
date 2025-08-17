import { useEffect } from 'react';
import io from 'socket.io-client';
import Editor from './Editor';

const socket = io('https://real-time-editor-server-h96u.onrender.com/', {
  transports: ['websocket'],
  
});

function App() {

  useEffect(() => {
    
    socket.on('connect', () => {
      console.log('SUCCESS: Connected to server with ID:', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error(' ERROR: Connection failed:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('WARN: Disconnected from server:', reason);
    });
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, []);

  const handleDocChange = (doc: string) => {
    socket.emit('doc-change', doc);
  };

  return (
    <main className="h-screen bg-gray-800 text-white">
      <header className="bg-gray-900 p-4 shadow-md">
        <h1 className="text-xl font-bold">Real-Time Code Editor</h1>
      </header>

      <div className="h-[calc(100vh-64px)]">
        <Editor onDocChange={handleDocChange}/>
      </div>
    </main>
  );
}

export default App;