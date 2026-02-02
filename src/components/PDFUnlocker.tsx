import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Lock, Unlock, Upload, Download, Loader2, X, FileText } from 'lucide-react';

type Status = 'idle' | 'loading' | 'unlocked' | 'error';

export const PDFUnlocker = () => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [unlockedPdf, setUnlockedPdf] = useState<Uint8Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      setStatus('idle');
      setErrorMessage('');
      setUnlockedPdf(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setErrorMessage('');
      setUnlockedPdf(null);
    }
  }, []);

  const handleUnlock = async () => {
    if (!file || !password) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { 
        password,
        ignoreEncryption: false 
      } as { password: string; ignoreEncryption: boolean });
      const unlockedBytes = await pdfDoc.save();
      setUnlockedPdf(unlockedBytes);
      setStatus('unlocked');
    } catch (error) {
      setStatus('error');
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          setErrorMessage('Incorrect password');
        } else {
          setErrorMessage('Failed to unlock PDF');
        }
      }
    }
  };

  const handleDownload = () => {
    if (!unlockedPdf || !file) return;

    const blob = new Blob([new Uint8Array(unlockedPdf)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('.pdf', '_unlocked.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setPassword('');
    setStatus('idle');
    setErrorMessage('');
    setUnlockedPdf(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary mb-6">
            {status === 'unlocked' ? (
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
              ${isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-border hover:border-muted-foreground hover:bg-secondary/50'
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
              <Upload className={`w-10 h-10 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-foreground font-medium mb-1">
                Drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse
              </p>
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

            {status !== 'unlocked' && (
              <>
                {/* Password Input */}
                <div className="relative mb-4">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password"
                    className={`
                      w-full px-4 py-4 rounded-xl bg-secondary border-2
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:border-primary transition-colors
                      ${status === 'error' ? 'border-destructive' : 'border-transparent'}
                    `}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  />
                </div>

                {/* Error Message */}
                {status === 'error' && (
                  <p className="text-destructive text-sm mb-4 animate-fade-in">
                    {errorMessage}
                  </p>
                )}

                {/* Unlock Button */}
                <button
                  onClick={handleUnlock}
                  disabled={!password || status === 'loading'}
                  className={`
                    w-full py-4 rounded-xl font-medium transition-all duration-200
                    flex items-center justify-center gap-2
                    ${password 
                      ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]' 
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }
                  `}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Unlocking...
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
            {status === 'unlocked' && (
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
        <p className="text-center text-xs text-muted-foreground mt-12">
          Your files never leave your browser
        </p>
      </div>
    </div>
  );
};

export default PDFUnlocker;
