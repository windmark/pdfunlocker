import { useState, useCallback, useRef } from "react";
import { Lock, Unlock, Download, Plus, Loader2, Eye, EyeOff } from "lucide-react";
import { useMupdfWorker } from "@/hooks/useMupdfWorker";
import { DropZone } from "@/components/DropZone";
import { FileRow } from "@/components/FileRow";
import { Progress } from "@/components/ui/progress";
import type { PdfFile } from "@/types/pdf";

export const PDFUnlocker = () => {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [sharedPassword, setSharedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { autoUnlock, decrypt, isReady } = useMupdfWorker();

  const processFile = useCallback(
    async (pdfFile: PdfFile) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === pdfFile.id ? { ...f, status: "processing" } : f
        )
      );

      const result = await autoUnlock(pdfFile.file);

      if (result.success && result.data) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdfFile.id
              ? { ...f, status: "unlocked", unlockedData: result.data }
              : f
          )
        );
      } else if (result.needsPassword) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdfFile.id ? { ...f, status: "needs-password" } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdfFile.id
              ? { ...f, status: "error", errorMessage: result.error || "Failed to process" }
              : f
          )
        );
      }
    },
    [autoUnlock]
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const pdfFiles: PdfFile[] = newFiles
        .filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"))
        .map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          status: "queued" as const,
          selected: false,
        }));

      if (pdfFiles.length === 0) return;

      setFiles((prev) => [...prev, ...pdfFiles]);

      if (isReady) {
        pdfFiles.forEach((pf) => processFile(pf));
      }
    },
    [isReady, processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(Array.from(e.target.files));
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const handleUnlockWithPassword = useCallback(async () => {
    if (!sharedPassword) return;

    const needsPassword = files.filter((f) => f.status === "needs-password");

    // Set all to processing
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "needs-password" ? { ...f, status: "processing" } : f
      )
    );

    // Decrypt each file with the shared password
    for (const pdfFile of needsPassword) {
      const result = await decrypt(pdfFile.file, sharedPassword);

      if (result.success && result.data) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdfFile.id
              ? { ...f, status: "unlocked", unlockedData: result.data }
              : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdfFile.id
              ? {
                  ...f,
                  status: "needs-password",
                  errorMessage: result.error?.includes("password")
                    ? "Incorrect password"
                    : result.error,
                }
              : f
          )
        );
      }
    }
  }, [files, sharedPassword, decrypt]);

  const downloadFile = (pdfFile: PdfFile) => {
    if (!pdfFile.unlockedData) return;
    const blob = new Blob([pdfFile.unlockedData.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFile.file.name.replace(".pdf", "_unlocked.pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = useCallback(
    (id: string) => {
      const pdfFile = files.find((f) => f.id === id);
      if (pdfFile) downloadFile(pdfFile);
    },
    [files]
  );

  const handleDownloadAll = useCallback(() => {
    const unlocked = files.filter((f) => f.status === "unlocked" && f.unlockedData);
    // Stagger downloads to avoid browser throttling
    unlocked.forEach((f, i) => {
      setTimeout(() => downloadFile(f), i * 150);
    });
  }, [files]);

  const handleReset = () => {
    setFiles([]);
    setSharedPassword("");
  };

  const totalFiles = files.length;
  const processedFiles = files.filter(
    (f) => f.status === "unlocked" || f.status === "needs-password" || f.status === "error"
  ).length;
  const unlockedFiles = files.filter((f) => f.status === "unlocked");
  const needsPasswordFiles = files.filter((f) => f.status === "needs-password");
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0;
  const isProcessing = files.some(
    (f) => f.status === "queued" || f.status === "processing"
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-6">
            {unlockedFiles.length > 0 ? (
              <Unlock className="w-8 h-8 text-primary" />
            ) : (
              <Lock className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            PDF Unlocker
          </h1>
          <p className="text-muted-foreground">
            Remove password protection from PDFs
          </p>
        </div>

        {/* Drop Zone - always visible when no files */}
        {files.length === 0 ? (
          <DropZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
          />
        ) : (
          <div className="space-y-4 animate-scale-in">
            {/* Progress bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing files…</span>
                  <span>
                    {processedFiles} / {totalFiles}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* File list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {files.map((pdfFile) => (
                <FileRow
                  key={pdfFile.id}
                  pdfFile={pdfFile}
                  onDownload={handleDownloadSingle}
                />
              ))}
            </div>

            {/* Shared password input for files that need it */}
            {needsPasswordFiles.length > 0 && !isProcessing && (
              <div className="rounded-xl bg-secondary p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  {needsPasswordFiles.length === 1
                    ? "1 file requires a password"
                    : `${needsPasswordFiles.length} files require a password`}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUnlockWithPassword();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={sharedPassword}
                      onChange={(e) => setSharedPassword(e.target.value)}
                      placeholder="Enter password for all files"
                      className="w-full px-3 py-2 pr-9 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
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
                    disabled={!sharedPassword}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Unlock
                  </button>
                </form>
                {needsPasswordFiles.some((f) => f.errorMessage) && (
                  <p className="text-xs text-destructive">
                    {needsPasswordFiles.find((f) => f.errorMessage)?.errorMessage}
                  </p>
                )}
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-2 pt-2">
              {/* Add more files */}
              <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 cursor-pointer transition-all">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  ref={fileInputRef}
                />
                <Plus className="w-4 h-4" />
                Add more
              </label>

              <div className="flex-1" />

              {/* Download all */}
              {unlockedFiles.length > 1 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download all ({unlockedFiles.length})
                </button>
              )}
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Worker loading state */}
        {!isReady && files.length === 0 && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading PDF processor…
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 mt-12">
          <p className="text-center text-xs text-muted-foreground">
            Your files never leave your browser • Native PDF decryption
          </p>
          <a
            href="https://github.com/windmark/pdfunlocker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View on GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PDFUnlocker;
