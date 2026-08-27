import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";

export interface AttachedDocument {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  extension: string;
  category: "pdf" | "word" | "spreadsheet" | "presentation" | "text" | "image" | "apple" | "other";
  status: "parsing" | "ready" | "error";
  errorMessage?: string;
  textContent?: string;
  base64?: string;
  mimeType?: string;
  isMultimodal?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileCategory(extension: string): AttachedDocument["category"] {
  const ext = extension.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["docx", "doc", "odt", "rtf"].includes(ext)) return "word";
  if (["xlsx", "xls", "csv", "ods"].includes(ext)) return "spreadsheet";
  if (["pptx", "ppt", "odp"].includes(ext)) return "presentation";
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return "image";
  if (["txt", "md", "json", "xml", "html", "htm"].includes(ext)) return "text";
  if (["pages", "numbers", "key"].includes(ext)) return "apple";
  return "other";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function extractRtfText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\b[0]?/g, "")
    .replace(/\\i[0]?/g, "")
    .replace(/\\ul[0]?/g, "")
    .replace(/\\cf[0-9]+/g, "")
    .replace(/\\fs[0-9]+/g, "")
    .replace(/\\f[0-9]+/g, "")
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => {
      try {
        return String.fromCharCode(parseInt(m.substring(2), 16));
      } catch {
        return "";
      }
    })
    .replace(/\{[^{}]*\}/g, "")
    .replace(/\\[a-zA-Z0-9_-]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * Parses any supported document into text content or multimodal base64 for Gemini.
 */
export async function parseUploadedDocument(file: File): Promise<AttachedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const category = getFileCategory(extension);
  const formattedSize = formatFileSize(file.size);
  const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Size guard: 20MB limit
  if (file.size > 20 * 1024 * 1024) {
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      formattedSize,
      extension,
      category,
      status: "error",
      errorMessage: "This file is too large to process. Please upload a smaller file (under 20MB).",
    };
  }

  try {
    // 1. PDF Documents -> Multimodal Base64
    if (extension === "pdf") {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        base64,
        mimeType: "application/pdf",
        isMultimodal: true,
      };
    }

    // 2. Images -> Multimodal Base64
    if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      let mimeType = "image/jpeg";
      if (extension === "png") mimeType = "image/png";
      else if (extension === "webp") mimeType = "image/webp";

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        base64,
        mimeType,
        isMultimodal: true,
      };
    }

    // 3. Plain Text, Markdown, CSV, JSON, XML, HTML
    if (["txt", "md", "json", "xml", "html", "htm"].includes(extension)) {
      const text = await file.text();
      if (!text.trim()) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "error",
          errorMessage: "The uploaded file appears to be empty.",
        };
      }
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        textContent: text,
      };
    }

    // 4. Word Documents (.docx)
    if (extension === "docx") {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = result.value.trim();
      if (!text) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "error",
          errorMessage: "Unable to extract readable text from this DOCX. It may contain only images.",
        };
      }
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        textContent: text,
      };
    }

    // 5. Rich Text Format (.rtf)
    if (extension === "rtf") {
      const raw = await file.text();
      const extracted = extractRtfText(raw);
      if (!extracted) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "error",
          errorMessage: "Unable to parse RTF content. Please try PDF or TXT format.",
        };
      }
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        textContent: extracted,
      };
    }

    // 6. Spreadsheets (.xlsx, .xls, .csv, .ods)
    if (["xlsx", "xls", "ods", "csv"].includes(extension)) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetTexts: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const csvContent = XLSX.utils.sheet_to_csv(sheet);
        if (csvContent.trim()) {
          sheetTexts.push(`### Sheet: ${sheetName}\n\`\`\`csv\n${csvContent.trim()}\n\`\`\``);
        }
      }

      const combinedText = sheetTexts.join("\n\n");
      if (!combinedText.trim()) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "error",
          errorMessage: "Spreadsheet contains no readable data in its sheets.",
        };
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        textContent: combinedText,
      };
    }

    // 7. Presentations (.pptx)
    if (extension === "pptx") {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter((f) =>
        f.match(/^ppt\/slides\/slide[0-9]+\.xml$/)
      );

      slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/[0-9]+/)?.[0] || "0", 10);
        const numB = parseInt(b.match(/[0-9]+/)?.[0] || "0", 10);
        return numA - numB;
      });

      const slideTexts: string[] = [];
      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async("string");
        const texts: string[] = [];
        const regex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(xml)) !== null) {
          const t = match[1]?.trim();
          if (t) texts.push(t);
        }
        const slideNum = sf.match(/[0-9]+/)?.[0] || "?";
        if (texts.length > 0) {
          slideTexts.push(`### Slide ${slideNum}\n${texts.join("\n")}`);
        }
      }

      const combinedPpt = slideTexts.join("\n\n");
      if (!combinedPpt.trim()) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "error",
          errorMessage: "Unable to extract slide text. The presentation may contain only images.",
        };
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "ready",
        textContent: combinedPpt,
      };
    }

    // 8. OpenDocument Text (.odt) & Presentation (.odp)
    if (["odt", "odp"].includes(extension)) {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      const contentFile = zip.file("content.xml");
      if (contentFile) {
        const xml = await contentFile.async("string");
        // Strip XML tags cleanly
        const cleanText = xml
          .replace(/<text:p[^>]*>/g, "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanText) {
          return {
            id,
            file,
            name: file.name,
            size: file.size,
            formattedSize,
            extension,
            category,
            status: "ready",
            textContent: cleanText,
          };
        }
      }
    }

    // 9. Legacy binary formats (.doc, .ppt)
    if (["doc", "ppt"].includes(extension)) {
      // Attempt ASCII string extraction on binary
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let extracted = "";
      let currentChunk = "";
      for (let i = 0; i < bytes.length; i++) {
        const code = bytes[i];
        if (code >= 32 && code <= 126) {
          currentChunk += String.fromCharCode(code);
        } else if (code === 10 || code === 13) {
          if (currentChunk.length >= 4) {
            extracted += currentChunk + "\n";
          }
          currentChunk = "";
        } else {
          if (currentChunk.length >= 4) {
            extracted += currentChunk + " ";
          }
          currentChunk = "";
        }
      }
      if (currentChunk.length >= 4) {
        extracted += currentChunk;
      }

      if (extracted.length > 100) {
        return {
          id,
          file,
          name: file.name,
          size: file.size,
          formattedSize,
          extension,
          category,
          status: "ready",
          textContent: extracted.slice(0, 50000),
        };
      }

      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "error",
        errorMessage: `Legacy .${extension} format cannot be fully parsed. For best AI comprehension, please save or export as .${extension === "doc" ? "docx" : "pptx"} or .pdf.`,
      };
    }

    // 10. Apple iWork (.pages, .numbers, .key)
    if (["pages", "numbers", "key"].includes(extension)) {
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        // Look for preview text / XML
        const previewFile = zip.file("preview.jpg") || zip.file("Index/Document.iwa");
        if (previewFile) {
          // Graceful explanation
          return {
            id,
            file,
            name: file.name,
            size: file.size,
            formattedSize,
            extension,
            category,
            status: "error",
            errorMessage: `Apple .${extension} files use proprietary compression. Please export from Apple Pages/Numbers/Keynote as PDF, DOCX, or XLSX for full AI comprehension.`,
          };
        }
      } catch {
        // Continue to fallback error
      }
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        formattedSize,
        extension,
        category,
        status: "error",
        errorMessage: `Apple .${extension} format is not directly supported. Please export as PDF or DOCX.`,
      };
    }

    // Unsupported format fallback
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      formattedSize,
      extension,
      category: "other",
      status: "error",
      errorMessage: "This file format isn't currently supported. Please upload PDF, DOCX, TXT, RTF, PPTX, XLSX, or an image.",
    };
  } catch (err: any) {
    console.error("Document parsing error for", file.name, err);
    return {
      id,
      file,
      name: file.name,
      size: file.size,
      formattedSize,
      extension,
      category,
      status: "error",
      errorMessage: "Unable to read this document. Please try a supported format such as PDF, DOCX, TXT, or RTF.",
    };
  }
}
