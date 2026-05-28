/**
 * Extract plain text from an uploaded file (PDF or text) directly from a Buffer.
 * Buffer-based so it works on platforms with ephemeral / read-only filesystems
 * (Railway, Render, Vercel) without ever writing the upload to disk.
 * Returns at most 20,000 chars to keep prompts within budget.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename = ""
): Promise<string> {
  if (!buffer?.length) return "";

  try {
    if (mimeType === "application/pdf" || /\.pdf$/i.test(filename)) {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return (data.text ?? "").slice(0, 20000);
    }

    if (
      mimeType.startsWith("text/") ||
      /\.(txt|md|csv)$/i.test(filename)
    ) {
      return buffer.toString("utf8").slice(0, 20000);
    }
  } catch (err) {
    console.error("[extractText] failed:", err);
  }

  return "";
}
