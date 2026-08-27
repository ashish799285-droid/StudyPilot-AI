import React from "react";
import { AttachedDocument } from "../../utils/documentParser";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  File,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface AttachmentPreviewListProps {
  attachments: AttachedDocument[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}

export const AttachmentPreviewList: React.FC<AttachmentPreviewListProps> = ({
  attachments,
  onRemove,
  onClearAll,
}) => {
  if (attachments.length === 0) return null;

  const getFileIcon = (category: AttachedDocument["category"]) => {
    switch (category) {
      case "pdf":
        return <FileText className="h-4 w-4 text-rose-600" />;
      case "word":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
      case "presentation":
        return <Presentation className="h-4 w-4 text-amber-600" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-purple-600" />;
      case "text":
        return <FileCode className="h-4 w-4 text-indigo-600" />;
      case "apple":
        return <File className="h-4 w-4 text-slate-600" />;
      default:
        return <File className="h-4 w-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: AttachedDocument["category"]) => {
    switch (category) {
      case "pdf":
        return "bg-rose-50 border-rose-200/80 text-rose-700";
      case "word":
        return "bg-blue-50 border-blue-200/80 text-blue-700";
      case "spreadsheet":
        return "bg-emerald-50 border-emerald-200/80 text-emerald-700";
      case "presentation":
        return "bg-amber-50 border-amber-200/80 text-amber-700";
      case "image":
        return "bg-purple-50 border-purple-200/80 text-purple-700";
      case "text":
        return "bg-indigo-50 border-indigo-200/80 text-indigo-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  return (
    <div className="mb-2.5 rounded-xl border border-slate-200 bg-white/90 p-2.5 shadow-xs">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
            {attachments.length}
          </span>
          <span>Attached Study {attachments.length === 1 ? "Document" : "Documents"}</span>
          <span className="text-[11px] font-normal text-slate-400">
            ({attachments.filter((a) => a.status === "ready").length} ready for AI reasoning)
          </span>
        </div>
        {attachments.length > 1 && onClearAll && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {attachments.map((doc) => {
          const isError = doc.status === "error";
          const isParsing = doc.status === "parsing";

          return (
            <div
              key={doc.id}
              className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all shadow-2xs ${
                isError
                  ? "border-rose-300 bg-rose-50/70 text-rose-900"
                  : isParsing
                  ? "border-indigo-200 bg-indigo-50/50 text-slate-700 animate-pulse"
                  : getCategoryBadgeClass(doc.category)
              }`}
            >
              <div className="shrink-0">
                {isParsing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : isError ? (
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                ) : (
                  getFileIcon(doc.category)
                )}
              </div>

              <div className="min-w-0 max-w-[200px] sm:max-w-[260px]">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-medium text-xs leading-tight" title={doc.name}>
                    {doc.name}
                  </p>
                  <span className="rounded bg-black/5 px-1 py-0.2 text-[9px] font-mono text-slate-600 shrink-0">
                    {doc.formattedSize}
                  </span>
                </div>
                {isError && (
                  <p className="truncate text-[10px] text-rose-600 font-normal" title={doc.errorMessage}>
                    {doc.errorMessage || "Failed to process file"}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                className="ml-1 rounded-md p-0.5 text-slate-400 hover:bg-black/10 hover:text-slate-700 transition shrink-0"
                title={`Remove ${doc.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
