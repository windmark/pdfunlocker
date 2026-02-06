import {
  FileText,
  Check,
  Loader2,
  AlertCircle,
  Lock,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import type { PdfFile } from "@/types/pdf";

interface FileRowProps {
  pdfFile: PdfFile;
  onToggleSelect: (id: string) => void;
  onPasswordSubmit: (id: string, password: string) => void;
  onDownload: (id: string) => void;
}

export const FileRow = ({
  pdfFile,
  onToggleSelect,
  onPasswordSubmit,
  onDownload,
}: FileRowProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password) {
      onPasswordSubmit(pdfFile.id, password);
      setPassword("");
    }
  };

  return (
    <div className="rounded-xl bg-secondary p-3 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Checkbox for unlocked files */}
        <div className="flex-shrink-0 w-6 flex items-center justify-center">
          {pdfFile.status === "unlocked" ? (
            <button
              onClick={() => onToggleSelect(pdfFile.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                pdfFile.selected
                  ? "bg-primary border-primary"
                  : "border-muted-foreground hover:border-foreground"
              }`}
            >
              {pdfFile.selected && (
                <Check className="w-3 h-3 text-primary-foreground" />
              )}
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              {statusIcon()}
            </div>
          )}
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

      {/* Password input for files that need it */}
      {pdfFile.status === "needs-password" && (
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 pr-9 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={!password}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Unlock
          </button>
        </form>
      )}
    </div>
  );
};
