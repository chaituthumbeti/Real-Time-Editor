import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { count, error } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo.toISOString());
    if (error) console.error("Error fetching recent activity:", error);
    else setRecentActivity(count || 0);
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
    e.preventDefault(); // Prevent default form submission
    if (!newDocumentTitle.trim()) return; // Don't create if title is empty

    setCreating(true);
    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          title: newDocumentTitle, // Use the title from the input
          // user_id is set automatically by the default value in your Supabase table
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating document:", error.message);
    } else if (data) {
      navigate(`/doc/${data.id}`); // Navigate to the new document
    }

    setNewDocumentTitle("");
    setShowCreateModal(false);
    setCreating(false);
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
              // Sun Icon for Dark Mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
          <button
            className={`p-2 rounded-lg transition-colors duration-200 ${
              theme === "dark"
                ? "hover:bg-slate-700/50 text-slate-300"
                : "hover:bg-slate-200 text-slate-700"
            }`}
          >
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
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
              className={`text-xl font-medium mb-2 ${
                theme === "dark" ? "text-slate-200" : "text-slate-900"
              }`}
            >
              No documents yet
            </h3>
            <p
              className={`max-w-md mx-auto mb-6 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Create your first document to start collaborating with your team
              in real-time.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg font-medium text-white transition-all duration-200 shadow-lg inline-flex items-center space-x-2 disabled:opacity-70"
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
                  <span>Create Your First Document</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/doc/${doc.id}`)}
                className={`rounded-xl p-6 hover:border-purple-500 transition-all duration-300 group cursor-pointer ${
                  theme === "dark"
                    ? "bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                    : "bg-white border border-slate-200 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                      theme === "dark"
                        ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20"
                        : "bg-gradient-to-r from-purple-100 to-indigo-100"
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
                  <button
                    className={`transition-opacity ${
                      theme === "dark"
                        ? "text-slate-500 hover:text-slate-300"
                        : "text-slate-400 hover:text-slate-600"
                    } opacity-0 group-hover:opacity-100`}
                  >
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
                        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                      />
                    </svg>
                  </button>
                </div>
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {doc.title || "Untitled Document"}
                </h3>
                <div
                  className={`flex items-center text-sm mb-4 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Created {formatDate(doc.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex -space-x-2">
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 border-slate-800"
                          : "bg-gradient-to-r from-indigo-500 to-purple-500 border-white"
                      }`}
                    ></div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-teal-500 to-cyan-500 border-slate-800"
                          : "bg-gradient-to-r from-teal-500 to-cyan-500 border-white"
                      }`}
                    ></div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        theme === "dark"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 border-slate-800"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 border-white"
                      }`}
                    ></div>
                  </div>
                  <button
                    className={`text-sm font-medium flex items-center transition-colors ${
                      theme === "dark"
                        ? "text-purple-400 hover:text-purple-300"
                        : "text-purple-600 hover:text-purple-700"
                    }`}
                  >
                    Open
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`py-6 px-6 border-t text-center text-sm transition-colors duration-200 ${
          theme === "dark"
            ? "border-slate-800 text-slate-500"
            : "border-slate-200 text-slate-500"
        }`}
      >
        <p>© {new Date().getFullYear()} CodeCollab. All rights reserved.</p>
      </footer>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-slate-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white">
              Create New Document
            </h2>
            <form onSubmit={handleCreateDocument}>
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Document Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={newDocumentTitle}
                  onChange={(e) => setNewDocumentTitle(e.target.value)}
                  placeholder="My awesome project"
                  className="w-full px-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white ..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="..."
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="...">
                  {creating ? "Creating..." : "Create Document"}
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
