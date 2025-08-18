import { useState } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import Editor from "../Editor";

interface EditorPageProps {
  session: Session;
}

const EditorPage = ({ session }: EditorPageProps) => {
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleConnectionStatusChange = (
    status: "connecting" | "connected" | "disconnected"
  ) => {
    setConnectionStatus(status);
  };

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-800 shadow-lg py-3 px-6 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              CodeCollab
            </h1>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-slate-300">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
              <span className="text-sm font-semibold text-white">
                {session.user.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <span className="text-sm text-slate-300 hidden md:inline">
              {session.user.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-200 flex items-center space-x-1.5 text-sm shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1">
        <Editor onConnectionStatusChange={handleConnectionStatusChange} />
      </div>
    </div>
  );
};

export default EditorPage;
