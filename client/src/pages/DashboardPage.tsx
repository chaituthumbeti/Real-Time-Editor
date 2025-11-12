import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { createDocument } from "../lib/createDocument";

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface DashboardPageProps {
  session: Session;
}

const DashboardPage = ({ session }: DashboardPageProps) => {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const [registeredUsers, setRegisteredUsers] = useState(0);
  const [recentActivity, setRecentActivity] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDocumentTitle, setNewDocumentTitle] = useState("");
  const [newDocumentLanguage, setNewDocumentLanguage] = useState("javascript");
  const [newDocumentFilename, setNewDocumentFilename] = useState(""); // new
  const [, setRecentDocs] = useState<Document[]>([]);

  // Function to fetch documents from the database
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Query the 'documents' table, selecting all columns
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching documents:", error);
      } else {
        setDocuments(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchRegisteredUsers = async () => {
    const { data, error } = await supabase.rpc("get_total_users");
    if (error) console.error("Error fetching user count:", error);
    else setRegisteredUsers(data);
  };

  const fetchRecentActivity = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // fetch up to 5 recent docs created in the last 7 days and get exact count
      const { data, count, error } = await supabase
        .from("documents")
        .select("id, title, created_at", { count: "exact" })
        .gte("created_at", oneWeekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching recent activity:", error);
        setRecentActivity(0);
        setRecentDocs([]);
        return;
      }

      // count may be null in some environments; fallback to data length
      setRecentActivity(typeof count === "number" ? count : data?.length ?? 0);
      setRecentDocs(data ?? []);
    } catch (err) {
      console.error("Unexpected error fetching recent activity:", err);
      setRecentActivity(0);
      setRecentDocs([]);
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (seconds < 60) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else if (weeks < 5) {
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else if (months < 12) {
      return `${months} month${months > 1 ? "s" : ""} ago`;
    } else {
      return `${years} year${years > 1 ? "s" : ""} ago`;
    }
  };
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocumentTitle.trim()) return;

    setCreating(true);

    try {
      // Use shared helper which attaches user_id, derives extension/filename etc.
      const doc = await createDocument(
        newDocumentTitle.trim(),
        newDocumentLanguage,
        newDocumentFilename?.trim() || undefined
      );
      if (doc?.id) {
        navigate(`/doc/${doc.id}`);
      } else {
        console.error("createDocument returned unexpected payload:", doc);
        alert("Failed to create document");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error creating document:", errorMessage);
      alert("Error creating document");
    } finally {
      setNewDocumentTitle("");
      setNewDocumentLanguage("javascript");
      setNewDocumentFilename("");
      setShowCreateModal(false);
      setCreating(false);
    }
  };

  // Delete a document by id (with confirmation)
  const handleDeleteDocument = async (id: string) => {
    if (!id) return;
    const ok = window.confirm(
      "Delete this document? This action cannot be undone."
    );
    if (!ok) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete document:", error);
        alert("Failed to delete document");
        return;
      }
      // refresh lists
      await fetchDocuments();
      await fetchRecentActivity();
    } catch (err) {
      console.error("Unexpected error deleting document:", err);
      alert("Error deleting document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchRegisteredUsers();
    fetchRecentActivity();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header
        className={`py-4 px-6 flex justify-between items-center border-b sticky top-0 z-10 backdrop-blur-sm transition-colors duration-200 ${
          theme === "dark"
            ? "bg-slate-800/80 border-slate-700 shadow-lg"
            : "bg-white/80 border-slate-200 shadow-md"
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-white"
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
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              theme === "dark"
                ? "hover:bg-slate-700/50 text-slate-300"
                : "hover:bg-slate-200 text-slate-700"
            }`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              // Moon Icon for Light Mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              // Sun Icon for Dark Mode (valid SVG)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 4a1 1 0 011 1v1a1 1 0 11-2 0V5a1 1 0 011-1zM10 13a3 3 0 100-6 3 3 0 000 6zM4 10a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm9.657-5.657a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM15.657 14.657a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM4.343 14.657a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4.343 5.343a1 1 0 010-1.414L5.05 3.222A1 1 0 116.464 4.636L5.757 5.343a1 1 0 01-1.414 0z" />
              </svg>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                <span className="text-white font-medium text-sm">
                  {session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform duration-200 ${
                  showUserMenu ? "rotate-180" : ""
                } ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 transition-colors duration-200 ${
                  theme === "dark"
                    ? "bg-slate-800 border border-slate-700"
                    : "bg-white border border-slate-200"
                }`}
              >
                <div
                  className={`px-4 py-3 border-b ${
                    theme === "dark" ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  <p
                    className={`text-sm font-medium truncate ${
                      theme === "dark" ? "text-slate-200" : "text-slate-900"
                    }`}
                  >
                    {session.user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    theme === "dark"
                      ? "text-red-400 hover:bg-slate-700 hover:text-red-300"
                      : "text-red-500 hover:bg-slate-100 hover:text-red-600"
                  }`}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-6">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1
            className={`text-3xl md:text-4xl font-bold mb-2 ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {session.user.email?.split("@")[0]}
            </span>
            !
          </h1>
          <p
            className={`max-w-2xl ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Collaborate with your team in real-time. Create new documents or
            continue working on existing ones.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div
            className={`rounded-xl p-6 hover:border-purple-500 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Total Documents
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {documents.length}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${
                    theme === "dark" ? "text-purple-400" : "text-purple-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-6 hover:border-indigo-500 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Active Collaborators
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {registeredUsers}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${
                    theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-6 hover:border-teal-500 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Recent Activity
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {recentActivity}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  theme === "dark" ? "bg-teal-900/30" : "bg-teal-100"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 ${
                    theme === "dark" ? "text-teal-400" : "text-teal-600"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Your Documents
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={creating}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium text-white transition-all duration-200 shadow-lg flex items-center space-x-2 disabled:opacity-70"
          >
            {creating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Create New Document</span>
              </>
            )}
          </button>
        </div>

        {/* Document Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div
              className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
                theme === "dark" ? "border-purple-500" : "border-purple-600"
              }`}
            ></div>
          </div>
        ) : documents.length === 0 ? (
          <div
            className={`rounded-xl p-12 text-center transition-colors duration-200 ${
              theme === "dark"
                ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                : "bg-white border border-slate-200 shadow-sm"
            }`}
          >
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                theme === "dark"
                  ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20"
                  : "bg-gradient-to-r from-purple-100 to-indigo-100"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-8 w-8 ${
                  theme === "dark" ? "text-purple-400" : "text-purple-600"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3
              className={`text-lg font-semibold mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-800"
              }`}
            >
              No documents found
            </h3>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Create your first document by clicking the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`relative rounded-xl p-4 transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                    : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                {/* small delete button top-right */}
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  title="Delete document"
                  aria-label="Delete document"
                  className={`absolute top-3 right-3 p-1.5 rounded-md transition-colors ${
                    theme === "dark"
                      ? "text-red-300 hover:bg-red-700/20"
                      : "text-red-600 hover:bg-red-100"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 7h12M10 11v6m4-6v6M9 7l1-3h4l1 3"
                    />
                  </svg>
                </button>

                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-semibold mb-2 ${
                        theme === "dark" ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      {doc.title}
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => navigate(`/doc/${doc.id}`)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                        theme === "dark"
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span>Open</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Document Modal */}
      {showCreateModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            theme === "dark" ? "bg-black/80" : "bg-white/80"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-xl p-6 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800 border border-slate-700"
                : "bg-white border border-slate-200 shadow-lg"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                theme === "dark" ? "text-slate-200" : "text-slate-800"
              }`}
            >
              Create a New Document
            </h3>
            <form onSubmit={handleCreateDocument}>
              <div className="mb-4">
                <label
                  htmlFor="document-title"
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Document Title
                </label>
                <input
                  type="text"
                  id="document-title"
                  value={newDocumentTitle}
                  onChange={(e) => setNewDocumentTitle(e.target.value)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400"
                      : "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-600"
                  }`}
                  placeholder="Untitled Document"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="document-language"
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Programming Language
                </label>
                <select
                  id="document-language"
                  value={newDocumentLanguage}
                  onChange={(e) => setNewDocumentLanguage(e.target.value)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-slate-200"
                      : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                </select>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="document-filename"
                  className={`block text-sm font-medium mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  File Name (optional)
                </label>
                <input
                  type="text"
                  id="document-filename"
                  value={newDocumentFilename}
                  onChange={(e) => setNewDocumentFilename(e.target.value)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400"
                      : "bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-600"
                  }`}
                  placeholder="e.g. my-document.js"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                    creating
                      ? "bg-indigo-600 text-white cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {creating ? (
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : null}
                  <span>{creating ? "Creating..." : "Create Document"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
