import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PDFUnlocker from "../PDFUnlocker";

// Mock the worker hook
const mockAutoUnlock = vi.fn();
const mockDecrypt = vi.fn();

vi.mock("@/hooks/useMupdfWorker", () => ({
  useMupdfWorker: () => ({
    autoUnlock: mockAutoUnlock,
    decrypt: mockDecrypt,
  }),
}));

// Mock URL.createObjectURL / revokeObjectURL
vi.stubGlobal("URL", {
  ...globalThis.URL,
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
});

const createPdfFile = (name = "test.pdf") =>
  new File(["pdf content"], name, { type: "application/pdf" });

const createNonPdfFile = (name = "test.txt") =>
  new File(["text content"], name, { type: "text/plain" });

describe("PDFUnlocker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1, 2, 3]) });
    mockDecrypt.mockResolvedValue({ success: true, data: new Uint8Array([1, 2, 3]) });
  });

  describe("Initial state", () => {
    it("renders header and drop zone", () => {
      render(<PDFUnlocker />);
      expect(screen.getByText("PDF Unlocker")).toBeInTheDocument();
      expect(screen.getByText("Remove password protection from PDFs")).toBeInTheDocument();
      expect(screen.getByText("Drop your PDFs here")).toBeInTheDocument();
    });

    it("shows privacy footer", () => {
      render(<PDFUnlocker />);
      expect(screen.getByText(/files never leave your browser/)).toBeInTheDocument();
    });

    it("shows GitHub link", () => {
      render(<PDFUnlocker />);
      expect(screen.getByLabelText("View on GitHub")).toBeInTheDocument();
    });
  });

  describe("File selection", () => {
    it("processes PDF files selected via input", async () => {
      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(mockAutoUnlock).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    it("filters out non-PDF files", async () => {
      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, { target: { files: [createNonPdfFile()] } });

      await waitFor(() => {
        expect(mockAutoUnlock).not.toHaveBeenCalled();
      });
    });

    it("handles multiple PDF files", async () => {
      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [createPdfFile("a.pdf"), createPdfFile("b.pdf")] },
      });

      await waitFor(() => {
        expect(mockAutoUnlock).toHaveBeenCalledTimes(2);
      });
      expect(screen.getByText("a.pdf")).toBeInTheDocument();
      expect(screen.getByText("b.pdf")).toBeInTheDocument();
    });

    it("accepts files with .pdf extension even without correct MIME", async () => {
      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["data"], "doc.pdf", { type: "" });

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockAutoUnlock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Drag and drop", () => {
    it("sets dragging state on dragover", () => {
      render(<PDFUnlocker />);
      const dropLabel = document.querySelector("label")!;

      fireEvent.dragOver(dropLabel);
      expect(dropLabel.className).toContain("border-primary");
    });

    it("removes dragging state on dragleave", () => {
      render(<PDFUnlocker />);
      const dropLabel = document.querySelector("label")!;

      fireEvent.dragOver(dropLabel);
      fireEvent.dragLeave(dropLabel);
      expect(dropLabel.className).toContain("border-border");
    });
  });

  describe("Processing results", () => {
    it("shows unlocked status when auto-unlock succeeds", async () => {
      mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1]) });
      render(<PDFUnlocker />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Unlocked")).toBeInTheDocument();
      });
    });

    it("shows needs-password status when password is required", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });
      render(<PDFUnlocker />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Password required")).toBeInTheDocument();
        expect(screen.getByText(/1 file requires a password/)).toBeInTheDocument();
      });
    });

    it("shows error status on processing failure", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, error: "Corrupt file" });
      render(<PDFUnlocker />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Corrupt file")).toBeInTheDocument();
      });
    });
  });

  describe("Password unlock", () => {
    it("shows shared password input for files needing password", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });
      render(<PDFUnlocker />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
      });
    });

    it("unlocks file with shared password", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });
      mockDecrypt.mockResolvedValue({ success: true, data: new Uint8Array([1]) });

      render(<PDFUnlocker />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
      });

      const pwInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(pwInput, { target: { value: "secret123" } });
      fireEvent.submit(pwInput.closest("form")!);

      await waitFor(() => {
        expect(mockDecrypt).toHaveBeenCalledWith(expect.any(File), "secret123");
        expect(screen.getByText("Unlocked")).toBeInTheDocument();
      });
    });

    it("shows error for incorrect password", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });
      mockDecrypt.mockResolvedValue({ success: false, error: "Incorrect password" });

      render(<PDFUnlocker />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
      });

      const pwInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(pwInput, { target: { value: "wrong" } });
      fireEvent.submit(pwInput.closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("Incorrect password")).toBeInTheDocument();
      });
    });

    it("shows 'Same for all' toggle when multiple files need password", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });

      render(<PDFUnlocker />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, {
        target: { files: [createPdfFile("a.pdf"), createPdfFile("b.pdf")] },
      });

      await waitFor(() => {
        expect(screen.getByText("Same for all")).toBeInTheDocument();
        expect(screen.getByText(/2 files require a password/)).toBeInTheDocument();
      });
    });
  });

  describe("Download", () => {
    it("shows download button per unlocked file", async () => {
      mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1]) });

      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByLabelText("Download unlocked PDF")).toBeInTheDocument();
      });
    });

    it("shows Download all button when all files are unlocked and count > 1", async () => {
      mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1]) });

      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [createPdfFile("a.pdf"), createPdfFile("b.pdf")] },
      });

      await waitFor(() => {
        expect(screen.getByText(/Download all/)).toBeInTheDocument();
      });
    });
  });

  describe("Progress bar", () => {
    it("shows progress bar while processing", async () => {
      // Make autoUnlock hang (never resolve)
      mockAutoUnlock.mockReturnValue(new Promise(() => {}));

      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Processing files…")).toBeInTheDocument();
      });
    });
  });

  describe("Clear all / Reset", () => {
    it("clears all files when Clear all is clicked", async () => {
      mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1]) });

      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Unlocked")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Clear all"));

      expect(screen.getByText("Drop your PDFs here")).toBeInTheDocument();
      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    });
  });

  describe("Add more files", () => {
    it("shows Add more button after files are added", async () => {
      mockAutoUnlock.mockResolvedValue({ success: true, data: new Uint8Array([1]) });

      render(<PDFUnlocker />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByText("Add more")).toBeInTheDocument();
      });
    });
  });

  describe("Password visibility toggle", () => {
    it("toggles shared password visibility", async () => {
      mockAutoUnlock.mockResolvedValue({ success: false, needsPassword: true });

      render(<PDFUnlocker />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [createPdfFile()] } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
      });

      const pwInput = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
      expect(pwInput.type).toBe("password");

      // Find toggle button
      const toggleButtons = screen.getAllByRole("button").filter(
        (b) => b.getAttribute("type") === "button"
      );
      const toggleBtn = toggleButtons[0];
      fireEvent.click(toggleBtn);
      expect(pwInput.type).toBe("text");
    });
  });
});
