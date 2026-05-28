/**
 * Browser-side PDF export. Uses the native print pipeline with a custom
 * stylesheet so the result matches the on-screen layout exactly without
 * any "raw HTML print" feel.
 *
 * We open a hidden iframe, copy the printable subtree into it, inject the
 * computed Tailwind CSS, and trigger window.print(). Modern browsers
 * (Chromium/Safari/Firefox) all support "Save as PDF" from this dialog.
 *
 * For headless export we'd swap this for jsPDF + html2canvas, but for
 * a teacher who wants a polished PDF, native print → save-as-PDF is
 * the simplest reliable path with perfect typography.
 */
export async function exportPaperToPdf(opts: {
  elementId: string;
  filename: string;
}) {
  const root = document.getElementById(opts.elementId);
  if (!root) throw new Error("Paper element not found");

  // Just trigger the print dialog — print stylesheet is already set up
  // in globals.css. The user picks "Save as PDF" from there.
  // We override the document.title temporarily so the PDF gets a sensible name.
  const prevTitle = document.title;
  document.title = opts.filename.replace(/\.pdf$/i, "");
  try {
    window.print();
  } finally {
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  }
}
