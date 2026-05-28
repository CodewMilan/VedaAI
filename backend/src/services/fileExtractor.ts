import fs from "fs/promises";
import path from "path";

/**
 * Extract plain text from an uploaded file (PDF or text).
 * Returns at most 20,000 chars to keep prompts within budget.
 */
export async function extractText(
  filePath: string,
  mimeType: string
): Promise<string> {
  if (!filePath) return "";
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (mimeType === "application/pdf" || ext === ".pdf") {
      // Lazy import — pdf-parse loads test fixtures at module load otherwise.
      const pdfParse = (await import("pdf-parse")).default;
      const buf = await fs.readFile(filePath);
      const data = await pdfParse(buf);
      return (data.text ?? "").slice(0, 20000);
    }

    if (
      mimeType.startsWith("text/") ||
      ext === ".txt" ||
      ext === ".md" ||
      ext === ".csv"
    ) {
      const text = await fs.readFile(filePath, "utf8");
      return text.slice(0, 20000);
    }
  } catch (err) {
    console.error("[extractText] failed:", err);
  }

  return "";
}
