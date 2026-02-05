import { useCallback, useEffect, useRef, useState } from "react";

interface DecryptResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
}

export function useMupdfWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, (result: DecryptResult) => void>>(
    new Map()
  );
  const idRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Create the worker using Vite's native Web Worker support
    const worker = new Worker(
      new URL("../workers/mupdf.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const { type, id, data, error } = event.data;

      if (type === "ready") {
        setIsReady(true);
        return;
      }

      const resolve = pendingRef.current.get(id);
      if (resolve) {
        pendingRef.current.delete(id);
        if (type === "success") {
          resolve({ success: true, data: new Uint8Array(data) });
        } else {
          resolve({ success: false, error });
        }
      }
    };

    worker.onerror = (error) => {
      console.error("MuPDF Worker error:", error);
      // Reject all pending operations
      pendingRef.current.forEach((resolve) => {
        resolve({ success: false, error: "Worker encountered an error" });
      });
      pendingRef.current.clear();
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const decrypt = useCallback(
    async (file: File, password: string): Promise<DecryptResult> => {
      if (!workerRef.current) {
        return { success: false, error: "Worker not initialized" };
      }

      const arrayBuffer = await file.arrayBuffer();
      const id = idRef.current++;

      return new Promise((resolve) => {
        pendingRef.current.set(id, resolve);

        workerRef.current!.postMessage(
          {
            type: "decrypt",
            id,
            data: arrayBuffer,
            password,
          },
          [arrayBuffer]
        );
      });
    },
    []
  );

  return { decrypt, isReady };
}
