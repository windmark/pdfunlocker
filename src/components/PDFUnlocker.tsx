import { useState, useCallback } from "react";
import { Lock, Unlock, Upload, Download, Loader2, X, FileText, Eye, EyeOff } from "lucide-react";
import { useMupdfWorker } from "@/hooks/useMupdfWorker";

type Status = "idle" | "loading" | "unlocked" | "error";

export const PDFUnlocker = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [unlockedPdf, setUnlockedPdf] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { decrypt, isReady } = useMupdfWorker();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setStatus("idle");
      setErrorMessage("");
      setUnlockedPdf(null);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setStatus("idle");
        setErrorMessage("");
        setUnlockedPdf(null);
      }
    },
    []
  );

  const handleUnlock = async () => {
    if (!file || !password) return;

    setStatus("loading");
    setErrorMessage("");

    const result = await decrypt(file, password);

    if (result.success && result.data) {
      setUnlockedPdf(result.data);
      setStatus("unlocked");
    } else {
      setStatus("error");
      const errorMsg = result.error?.toLowerCase() || "";
      if (errorMsg.includes("incorrect password") || errorMsg.includes("password")) {
        setErrorMessage("Incorrect password. Please try again.");
      } else if (errorMsg.includes("encrypted")) {
        setErrorMessage("This PDF uses unsupported encryption.");
      } else if (errorMsg.includes("worker")) {
        setErrorMessage("PDF processor is loading. Please try again.");
      } else {
        setErrorMessage(result.error || "Failed to unlock PDF.");
      }
    }
  };

  const handleDownload = () => {
    if (!unlockedPdf || !file) return;

    const pdfBytes = new Uint8Array(unlockedPdf).buffer;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(".pdf", "_unlocked.pdf");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPassword("");
    setStatus("idle");
    setErrorMessage("");
    setUnlockedPdf(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-6">
            {status === "unlocked" ? (
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

        {/* Drop Zone / File Display */}
        {!file ? (
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              block w-full p-12 rounded-2xl border-2 border-dashed cursor-pointer
              transition-all duration-200 ease-out
              ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-muted-foreground hover:bg-secondary/50"
              }
            `}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center text-center">
              <Upload
                className={`w-10 h-10 mb-4 transition-colors ${
                  isDragging ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <p className="text-foreground font-medium mb-1">
                Drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          </label>
        ) : (
          <div className="animate-scale-in">
            {/* File Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-background">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-background transition-colors"
                aria-label="Remove file"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {status !== "unlocked" && (
              <>
                {/* Password Input */}
                <div className="relative mb-4">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password"
                    className={`
                      w-full px-4 py-4 pr-12 rounded-xl bg-secondary border-2
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:border-primary transition-colors
                      ${status === "error" ? "border-destructive" : "border-transparent"}
                    `}
                    onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Error Message */}
                {status === "error" && (
                  <p className="text-destructive text-sm mb-4 animate-fade-in">
                    {errorMessage}
                  </p>
                )}

                {/* Unlock Button */}
                <button
                  onClick={handleUnlock}
                  disabled={!password || status === "loading" || !isReady}
                  className={`
                    w-full py-4 rounded-xl font-medium transition-all duration-200
                    flex items-center justify-center gap-2
                    ${
                      password && isReady
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    }
                  `}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Unlocking...
                    </>
                  ) : !isReady ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading processor...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Unlock PDF
                    </>
                  )}
                </button>
              </>
            )}

            {/* Success State */}
            {status === "unlocked" && (
              <div className="animate-fade-in">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                  <p className="text-primary text-center font-medium">
                    PDF unlocked successfully
                  </p>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-xl font-medium bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Unlocked PDF
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-3 mt-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                >
                  Unlock another PDF
                </button>
              </div>
            )}
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
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PDFUnlocker;
