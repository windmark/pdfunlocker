/// <reference lib="webworker" />

// MuPDF Worker - runs in a separate thread to handle WASM operations
// This avoids main thread blocking and allows proper WASM initialization

import * as mupdf from "mupdf";

interface WorkerMessage {
  type: "decrypt";
  id: number;
  data: ArrayBuffer;
  password: string;
}

interface WorkerResponse {
  type: "success" | "error";
  id: number;
  data?: ArrayBuffer;
  error?: string;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data, password } = event.data;

  if (type === "decrypt") {
    try {
      const result = await decryptPDF(data, password);
      const response: WorkerResponse = {
        type: "success",
        id,
        data: result,
      };
      self.postMessage(response, [result]);
    } catch (error) {
      const response: WorkerResponse = {
        type: "error",
        id,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
      self.postMessage(response);
    }
  }
};

async function decryptPDF(
  arrayBuffer: ArrayBuffer,
  password: string
): Promise<ArrayBuffer> {
  const data = new Uint8Array(arrayBuffer);

  // Open the document with mupdf
  const doc = mupdf.Document.openDocument(data, "application/pdf");

  // Check if password is needed and authenticate
  if (doc.needsPassword()) {
    const authResult = doc.authenticatePassword(password);

    if (authResult === 0) {
      doc.destroy();
      throw new Error("Incorrect password");
    }
  }

  // Get the PDF-specific document for saving
  const pdfDoc = doc.asPDF();
  if (!pdfDoc) {
    doc.destroy();
    throw new Error("Not a valid PDF document");
  }

  // Save the document without encryption
  // The 'compress' option keeps file size small, no encryption options = no encryption
  const buffer = pdfDoc.saveToBuffer("compress");
  const unlockedBytes = buffer.asUint8Array();

  // Create a copy since the original buffer is tied to mupdf memory
  const result = new ArrayBuffer(unlockedBytes.byteLength);
  new Uint8Array(result).set(unlockedBytes);

  // Clean up
  doc.destroy();

  return result;
}

// Signal that the worker is ready
self.postMessage({ type: "ready" });
