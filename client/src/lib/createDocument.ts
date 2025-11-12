import { supabase } from "../supabaseClient";

export async function createDocument(
  title: string,
  language = "javascript",
  filename?: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  // derive extension from filename or fallback to language mapping
  const extFromFilename = filename?.includes(".")
    ? filename.split(".").pop()?.toLowerCase()
    : undefined;
  const extFromLanguageMap: Record<string, string> = {
    javascript: "js",
    python: "py",
    cpp: "cpp",
    c: "c",
    java: "java",
  };
  const extension = extFromFilename || extFromLanguageMap[language] || "js";

  // ensure filename exists
  const safeFilename =
    filename && filename.includes(".")
      ? filename
      : `${title.replace(/\s+/g, "-")}.${extension}`;

  const { data, error } = await supabase
    .from("documents")
    .insert([
      {
        title,
        content: "",
        user_id: userId,
        language,
        filename: safeFilename,
        extension,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}