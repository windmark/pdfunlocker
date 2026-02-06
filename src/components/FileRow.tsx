import { useState } from "react";
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
import type { PdfFile } from "@/types/pdf";

interface FileRowProps {
  pdfFile: PdfFile;
  onDownload: (id: string) => void;
  showIndividualPassword?: boolean;
  onUnlockWithPassword?: (id: string, password: string) => void;
}

export const FileRow = ({
  pdfFile,
  onDownload,
  showIndividualPassword,
  onUnlockWithPassword,
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

  return (
    <div className="rounded-xl bg-secondary p-3 animate-fade-in space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-6 flex items-center justify-center">
          {statusIcon()}
        </div>

        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background flex-shrink-0">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>

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

      {/* Individual password input */}
      {showIndividualPassword &&
        pdfFile.status === "needs-password" &&
        onUnlockWithPassword && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) onUnlockWithPassword(pdfFile.id, password);
            }}
            className="flex gap-2 ml-9"
          >
            <div className="relative flex-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                className="w-full px-3 py-1.5 pr-9 rounded-lg bg-background border border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={!password}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Unlock
            </button>
          </form>
        )}

      {/* Show error for individual password mode */}
      {showIndividualPassword &&
        pdfFile.status === "needs-password" &&
        pdfFile.errorMessage && (
          <p className="text-xs text-destructive ml-9">{pdfFile.errorMessage}</p>
        )}
    </div>
  );
};
