import { NoteItem } from "../../types";

/**
 * Utility functions for multi-format export of Revision Notes
 */

export function exportAsMarkdown(note: NoteItem) {
  const filename = `${sanitizeFilename(note.topic)}_Revision_Notes.md`;
  const header = `# ${note.topic}\n\n**Subject:** ${note.subject} | **Academic Level:** ${note.academicLevel || "General"}\n**Platform:** StudyPilot\n**Tutor:** Created by Mishra Ji\n**Date:** ${new Date(note.createdAt).toLocaleDateString()}\n\n---\n\n`;
  const fullContent = header + note.content;

  downloadBlob(new Blob([fullContent], { type: "text/markdown;charset=utf-8" }), filename);
}

export function exportAsPlainText(note: NoteItem) {
  const filename = `${sanitizeFilename(note.topic)}_Revision_Notes.txt`;
  // Strip common markdown markers for clean text
  const cleanContent = note.content
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  const header = `========================================================\n${note.topic.toUpperCase()}\nStudyPilot • Created by Mishra Ji\nSubject: ${note.subject} | Level: ${note.academicLevel || "General"}\nDate: ${new Date(note.createdAt).toLocaleDateString()}\n========================================================\n\n`;

  downloadBlob(new Blob([header + cleanContent], { type: "text/plain;charset=utf-8" }), filename);
}

export function exportAsHTML(note: NoteItem) {
  const filename = `${sanitizeFilename(note.topic)}_Revision_Notes.html`;
  
  // Format simple HTML document
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(note.topic)} — StudyPilot Revision Note</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: #1e293b;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 24px;
      background-color: #f8fafc;
    }
    .container {
      background: #ffffff;
      padding: 48px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .brand {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #0284c7;
      margin-bottom: 4px;
    }
    .tutor {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
    }
    .badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 10px;
      border-radius: 20px;
      font-weight: 600;
    }
    pre {
      background: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
    }
    code {
      font-family: monospace;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
    }
    blockquote {
      border-left: 4px solid #38bdf8;
      margin: 16px 0;
      padding-left: 16px;
      color: #475569;
      font-style: italic;
    }
    h2 {
      font-size: 20px;
      color: #0369a1;
      margin-top: 32px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    h3 {
      font-size: 16px;
      color: #1e293b;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">StudyPilot</div>
      <div class="tutor">Created by Mishra Ji</div>
      <h1>${escapeHTML(note.topic)}</h1>
      <div class="meta">
        <span class="badge">${escapeHTML(note.subject)}</span>
        <span>Level: ${escapeHTML(note.academicLevel || "General")}</span>
        <span>Date: ${new Date(note.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
    <div class="content">
      <pre style="white-space: pre-wrap; font-family: inherit; background: transparent; padding: 0;">${escapeHTML(note.content)}</pre>
    </div>
  </div>
</body>
</html>`;

  downloadBlob(new Blob([htmlContent], { type: "text/html;charset=utf-8" }), filename);
}

export function printOrSaveAsPDF(note: NoteItem) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate and print PDF notes.");
    return;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(note.topic)} — StudyPilot Note</title>
  <style>
    @media print {
      body { margin: 0; padding: 20mm; background: #fff; }
      .no-print { display: none; }
      @page { margin: 15mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
      max-width: 800px;
      margin: 20px auto;
      padding: 24px;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .brand {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #0369a1;
      text-transform: uppercase;
    }
    .tutor {
      font-size: 12px;
      color: #0284c7;
      font-weight: 600;
    }
    h1 {
      font-size: 24px;
      margin: 6px 0 10px 0;
      color: #0f172a;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      display: flex;
      gap: 12px;
    }
    .content {
      font-size: 13px;
      white-space: pre-wrap;
      line-height: 1.65;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-row">
      <div class="brand">StudyPilot</div>
      <div class="tutor">Created by Mishra Ji</div>
    </div>
    <h1>${escapeHTML(note.topic)}</h1>
    <div class="meta">
      <strong>Subject:</strong> ${escapeHTML(note.subject)} | 
      <strong>Level:</strong> ${escapeHTML(note.academicLevel || "General")} | 
      <strong>Date:</strong> ${new Date(note.createdAt).toLocaleDateString()}
    </div>
  </div>
  <div class="content">${escapeHTML(note.content)}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
