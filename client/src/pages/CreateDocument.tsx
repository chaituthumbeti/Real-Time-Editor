import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument } from "../lib/createDocument";

/** UI component you can render on the dashboard to create a document and pick language */
export default function CreateDocumentForm() {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [filename, setFilename] = useState(""); // new
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const doc = await createDocument(title.trim(), language, filename || undefined);
      navigate(`/doc/${doc.id}`);
    } catch (err) {
      console.error("Create document failed", err);
      alert("Failed to create document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        className="w-full px-3 py-2 rounded border"
        required
      />
      <input
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder="Filename (e.g. main.js) — optional"
        className="w-full px-3 py-2 rounded border"
      />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full px-3 py-2 rounded border"
      >
        <option value="javascript">JavaScript (Node)</option>
        <option value="python">Python</option>
        <option value="c">C (gcc)</option>
        <option value="cpp">C++ (g++)</option>
        <option value="java">Java</option>
      </select>
      <div className="flex items-center space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Creating..." : "Create Document"}
        </button>
      </div>
    </form>
  );
}
