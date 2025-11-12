import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import Editor from "../Editor";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const EditorPage = () => {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { docId } = useParams<{ docId: string }>();
  const [documentTitle, setDocumentTitle] = useState("Loading...");
  const [initialContent, setInitialContent] = useState<Uint8Array | null>(null);
  const [documentLanguage, setDocumentLanguage] =
    useState<string>("javascript");
  const [documentFilename, setDocumentFilename] = useState<string | null>(null);

  // Resolve API base URL: use localhost during development, same-origin in production.
  const apiURL =
    import.meta.env.VITE_BACKEND_HTTP_URL ||
    (import.meta.env.DEV
      ? "http://localhost:3001"
      : "https://real-time-editor-server-h96u.onrender.com");

  // Log resolved API URL at startup to help debug 404 -> frontend host routing
  console.log("[Editor] resolved apiURL =", apiURL);

  useEffect(() => {
    // This function checks if a user is logged in
    const checkSessionAndFetchDoc = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // If no user is logged in, redirect to the homepage
        navigate("/");
        return;
      }
      setSession(session);
      if (!docId) {
        navigate("/");
        return;
      }

      async function loadDocument(docId: string) {
        const { data, error } = await supabase
          .from("documents")
          .select("id, content, title, language, filename, extension") // include filename + extension
          .eq("id", docId)
          .single();
        if (error) throw error;
        const initialContent = data.content
          ? new TextEncoder().encode(data.content)
          : new Uint8Array();
        return { ...data, initialContent };
      }

      try {
        const {
          initialContent: ic,
          title,
          language,
          filename,
        } = await loadDocument(docId);
        setDocumentTitle(title || "Untitled Document");
        setInitialContent(ic);
        setDocumentLanguage(language || "javascript");
        // pass filename to editor
        setDocumentFilename(filename || null); // <-- call directly
      } catch (err) {
        console.error("Failed to load document", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkSessionAndFetchDoc();
  }, [navigate, docId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // After logging out, redirect to the homepage
    navigate("/");
  };

  const handleConnectionStatusChange = (
    status: "connecting" | "connected" | "disconnected"
  ) => {
    setConnectionStatus(status);
  };

  // Show a loading spinner while checking for the session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 dark:border-purple-700"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-white flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-slate-100 dark:bg-slate-800 shadow-lg py-3 px-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 transition-colors duration-200">
        {/* Logo and Title */}
        <div className="flex items-center space-x-12">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-md transform transition-all duration-300 hover:scale-110">
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              CodeCollab
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200 tracking-wide">
                {documentTitle}
              </h1>
            </div>
            {/* Connection Status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-lg backdrop-blur-sm transition-colors duration-200">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {connectionStatus === "connected"
                  ? "Connected"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-700"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 7.072l.707-.707a1 1 0 10-1.414-1.414l-.707.707a1 1 0 101.414 1.414zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
                <span className="text-sm font-semibold text-white">
                  {session?.user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 hidden md:inline">
                {session?.user.email}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-10 animate-fadeIn transition-colors duration-200">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {session?.user.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors duration-200 flex items-center space-x-2"
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
            )}
          </div>
        </div>
      </header>
      {/* Editor Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 transition-colors duration-200">
        {initialContent !== null && docId && (
          <Editor
            docId={docId}
            initialContent={initialContent}
            title={documentTitle}
            language={documentLanguage} // pass the stored language
            filename={documentFilename || undefined}
            onConnectionStatusChange={handleConnectionStatusChange}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
};

export default EditorPage;
