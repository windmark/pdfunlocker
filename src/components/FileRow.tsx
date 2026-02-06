import {
  FileText,
  Check,
  Loader2,
  AlertCircle,
  Lock,
  Download,
} from "lucide-react";
import type { PdfFile } from "@/types/pdf";

interface FileRowProps {
  pdfFile: PdfFile;
  onDownload: (id: string) => void;
}

export const FileRow = ({ pdfFile, onDownload }: FileRowProps) => {
  const statusIcon = () => {
    switch (pdfFile.status) {
      case "queued":
      case "processing":
        return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
      case "unlocked":
        return <Check className="w-5 h-5 text-primary" />;
      case "needs-password":
        return <Lock className="w-5 h-5 text-accent" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  return (
    <div className="rounded-xl bg-secondary p-3 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div className="flex-shrink-0 w-6 flex items-center justify-center">
          {statusIcon()}
        </div>

        {/* File icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background flex-shrink-0">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{pdfFile.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB
            {pdfFile.status === "unlocked" && (
              <span className="text-primary ml-2">Unlocked</span>
            )}
            {pdfFile.status === "needs-password" && (
              <span className="text-accent ml-2">Password required</span>
            )}
            {pdfFile.status === "error" && (
              <span className="text-destructive ml-2">
                {pdfFile.errorMessage || "Error"}
              </span>
            )}
            {(pdfFile.status === "queued" || pdfFile.status === "processing") && (
              <span className="text-muted-foreground ml-2">Processing…</span>
            )}
          </p>
        </div>

        {/* Download button for unlocked */}
        {pdfFile.status === "unlocked" && (
          <button
            onClick={() => onDownload(pdfFile.id)}
            className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Download unlocked PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
