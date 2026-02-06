/// <reference lib="webworker" />

import * as mupdf from "mupdf";

interface DecryptMessage {
  type: "decrypt";
  id: number;
  data: ArrayBuffer;
  password: string;
}

interface AutoUnlockMessage {
  type: "auto-unlock";
  id: number;
  data: ArrayBuffer;
}

type WorkerMessage = DecryptMessage | AutoUnlockMessage;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id } = event.data;

  if (type === "auto-unlock") {
    try {
      const result = await tryAutoUnlock(event.data.data);
      if (result) {
        self.postMessage({ type: "success", id, data: result }, [result]);
      } else {
        self.postMessage({ type: "needs-password", id });
      }
    } catch (error) {
      self.postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else if (type === "decrypt") {
    try {
      const result = await decryptPDF(event.data.data, event.data.password);
      self.postMessage({ type: "success", id, data: result }, [result]);
    } catch (error) {
      self.postMessage({
        type: "error",
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};

function tryAutoUnlock(arrayBuffer: ArrayBuffer): ArrayBuffer | null {
  const data = new Uint8Array(arrayBuffer);
  const doc = mupdf.Document.openDocument(data, "application/pdf");

  if (!doc.needsPassword()) {
    // Not encrypted at all, or only has owner password (restrictions-only)
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      doc.destroy();
      return null;
    }
    // Save with decrypt to strip any owner-password restrictions
    const buffer = pdfDoc.saveToBuffer("decrypt,garbage=deduplicate,compress");
    const bytes = buffer.asUint8Array();
    const result = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(result).set(bytes);
    doc.destroy();
    return result;
  }

  // Try empty password (some PDFs use empty user password)
  const authResult = doc.authenticatePassword("");
  if (authResult > 0) {
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      doc.destroy();
      return null;
    }
    const buffer = pdfDoc.saveToBuffer("decrypt,garbage=deduplicate,compress");
    const bytes = buffer.asUint8Array();
    const result = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(result).set(bytes);
    doc.destroy();
    return result;
  }

  doc.destroy();
  return null;
}

function decryptPDF(arrayBuffer: ArrayBuffer, password: string): ArrayBuffer {
  const data = new Uint8Array(arrayBuffer);
  const doc = mupdf.Document.openDocument(data, "application/pdf");

  if (doc.needsPassword()) {
    const authResult = doc.authenticatePassword(password);
    if (authResult === 0) {
      doc.destroy();
      throw new Error("Incorrect password");
    }
  }

  const pdfDoc = doc.asPDF();
  if (!pdfDoc) {
    doc.destroy();
    throw new Error("Not a valid PDF document");
  }

  const buffer = pdfDoc.saveToBuffer("decrypt,garbage=deduplicate,compress");
  const bytes = buffer.asUint8Array();
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  doc.destroy();
  return result;
}

self.postMessage({ type: "ready" });
