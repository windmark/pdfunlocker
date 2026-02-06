import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMupdfWorker } from "../useMupdfWorker";

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  simulateMessage(data: any) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  simulateError() {
    this.onerror?.(new ErrorEvent("error", { message: "Worker error" }));
  }
}

let mockWorkerInstance: MockWorker;

// Create a File-like object with working arrayBuffer()
function createMockFile(name = "test.pdf") {
  const content = new Uint8Array([1, 2, 3, 4]);
  const blob = new Blob([content], { type: "application/pdf" });
  const file = new File([blob], name, { type: "application/pdf" });
  // Polyfill arrayBuffer for jsdom
  if (!file.arrayBuffer) {
    (file as any).arrayBuffer = () =>
      new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      });
  }
  return file;
}

beforeEach(() => {
  mockWorkerInstance = new MockWorker();
  vi.stubGlobal(
    "Worker",
    class {
      constructor() {
        Object.assign(this, mockWorkerInstance);
        return mockWorkerInstance as any;
      }
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMupdfWorker", () => {
  it("initializes worker and waits for ready signal", () => {
    renderHook(() => useMupdfWorker());
    expect(mockWorkerInstance.onmessage).toBeDefined();
  });

  describe("autoUnlock", () => {
    it("queues message before worker is ready and flushes on ready", async () => {
      const { result } = renderHook(() => useMupdfWorker());
      const file = createMockFile();

      let promise: Promise<any>;
      await act(async () => {
        promise = result.current.autoUnlock(file);
        // Allow arrayBuffer() to resolve
        await new Promise((r) => setTimeout(r, 10));
      });

      // Message queued but worker not ready yet, so postMessage called after queue flush
      // Actually the sendMessage queues it. Let's signal ready now.
      expect(mockWorkerInstance.postMessage).not.toHaveBeenCalled();

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      expect(mockWorkerInstance.postMessage).toHaveBeenCalledTimes(1);
      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
      expect(msg.type).toBe("auto-unlock");

      // Resolve the promise
      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "success",
          id: msg.id,
          data: new ArrayBuffer(4),
        });
      });
      await promise!;
    });

    it("returns success with data on successful unlock", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.autoUnlock(file);
        await new Promise((r) => setTimeout(r, 10));
      });

      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
      const responseBuffer = new ArrayBuffer(4);

      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "success",
          id: msg.id,
          data: responseBuffer,
        });
      });

      const res = await promise!;
      expect(res.success).toBe(true);
      expect(res.data).toBeInstanceOf(Uint8Array);
    });

    it("returns needsPassword when worker says so", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.autoUnlock(file);
        await new Promise((r) => setTimeout(r, 10));
      });

      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];

      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "needs-password",
          id: msg.id,
        });
      });

      const res = await promise!;
      expect(res.success).toBe(false);
      expect(res.needsPassword).toBe(true);
    });

    it("returns error on worker error response", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.autoUnlock(file);
        await new Promise((r) => setTimeout(r, 10));
      });

      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];

      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "error",
          id: msg.id,
          error: "Corrupt PDF",
        });
      });

      const res = await promise!;
      expect(res.success).toBe(false);
      expect(res.error).toBe("Corrupt PDF");
    });
  });

  describe("decrypt", () => {
    it("sends decrypt message with password", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.decrypt(file, "mypassword");
        await new Promise((r) => setTimeout(r, 10));
      });

      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];
      expect(msg.type).toBe("decrypt");
      expect(msg.password).toBe("mypassword");

      // Clean up promise
      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "success",
          id: msg.id,
          data: new ArrayBuffer(4),
        });
      });
      await promise!;
    });

    it("returns success on correct password", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.decrypt(file, "pass");
        await new Promise((r) => setTimeout(r, 10));
      });

      const msg = mockWorkerInstance.postMessage.mock.calls[0][0];

      act(() => {
        mockWorkerInstance.simulateMessage({
          type: "success",
          id: msg.id,
          data: new ArrayBuffer(4),
        });
      });

      const res = await promise!;
      expect(res.success).toBe(true);
      expect(res.data).toBeInstanceOf(Uint8Array);
    });
  });

  describe("worker not initialized", () => {
    it("autoUnlock returns error if worker ref is null", async () => {
      const { result, unmount } = renderHook(() => useMupdfWorker());
      unmount();

      const file = createMockFile();
      const res = await result.current.autoUnlock(file);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Worker not initialized");
    });

    it("decrypt returns error if worker ref is null", async () => {
      const { result, unmount } = renderHook(() => useMupdfWorker());
      unmount();

      const file = createMockFile();
      const res = await result.current.decrypt(file, "pass");
      expect(res.success).toBe(false);
      expect(res.error).toBe("Worker not initialized");
    });
  });

  describe("worker onerror", () => {
    it("resolves all pending promises with error on worker crash", async () => {
      const { result } = renderHook(() => useMupdfWorker());

      act(() => {
        mockWorkerInstance.simulateMessage({ type: "ready" });
      });

      const file = createMockFile();
      let promise: Promise<any>;

      await act(async () => {
        promise = result.current.autoUnlock(file);
        await new Promise((r) => setTimeout(r, 10));
      });

      act(() => {
        mockWorkerInstance.simulateError();
      });

      const res = await promise!;
      expect(res.success).toBe(false);
      expect(res.error).toBe("Worker encountered an error");
    });
  });

  describe("cleanup", () => {
    it("terminates worker on unmount", () => {
      const { unmount } = renderHook(() => useMupdfWorker());
      unmount();
      expect(mockWorkerInstance.terminate).toHaveBeenCalled();
    });
  });
});
