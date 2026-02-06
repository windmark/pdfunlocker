import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileRow } from "../FileRow";
import type { PdfFile } from "@/types/pdf";

const makePdfFile = (overrides: Partial<PdfFile> = {}): PdfFile => ({
  id: "test-1",
  file: new File(["content"], "test.pdf", { type: "application/pdf" }),
  status: "queued",
  selected: false,
  ...overrides,
});

describe("FileRow", () => {
  it("renders file name and size", () => {
    const pdfFile = makePdfFile();
    render(<FileRow pdfFile={pdfFile} onDownload={vi.fn()} />);
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByText(/MB/)).toBeInTheDocument();
  });

  it("shows spinner for queued status", () => {
    render(<FileRow pdfFile={makePdfFile({ status: "queued" })} onDownload={vi.fn()} />);
    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it("shows spinner for processing status", () => {
    render(<FileRow pdfFile={makePdfFile({ status: "processing" })} onDownload={vi.fn()} />);
    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it("shows Unlocked label and download button for unlocked status", () => {
    const onDownload = vi.fn();
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "unlocked", unlockedData: new Uint8Array([1]) })}
        onDownload={onDownload}
      />
    );
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    const downloadBtn = screen.getByLabelText("Download unlocked PDF");
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(downloadBtn);
    expect(onDownload).toHaveBeenCalledWith("test-1");
  });

  it("shows Password required label for needs-password status", () => {
    render(
      <FileRow pdfFile={makePdfFile({ status: "needs-password" })} onDownload={vi.fn()} />
    );
    expect(screen.getByText("Password required")).toBeInTheDocument();
  });

  it("shows error message for error status", () => {
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "error", errorMessage: "Bad file" })}
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText("Bad file")).toBeInTheDocument();
  });

  it("shows individual password input when showIndividualPassword and needs-password", () => {
    const onUnlock = vi.fn();
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password" })}
        onDownload={vi.fn()}
        showIndividualPassword={true}
        onUnlockWithPassword={onUnlock}
      />
    );
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("does not show individual password input when showIndividualPassword is false", () => {
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password" })}
        onDownload={vi.fn()}
        showIndividualPassword={false}
      />
    );
    expect(screen.queryByPlaceholderText("Enter password")).not.toBeInTheDocument();
  });

  it("submits individual password", () => {
    const onUnlock = vi.fn();
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password" })}
        onDownload={vi.fn()}
        showIndividualPassword={true}
        onUnlockWithPassword={onUnlock}
      />
    );

    const input = screen.getByPlaceholderText("Enter password");
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.submit(input.closest("form")!);
    expect(onUnlock).toHaveBeenCalledWith("test-1", "secret");
  });

  it("disables unlock button when password is empty", () => {
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password" })}
        onDownload={vi.fn()}
        showIndividualPassword={true}
        onUnlockWithPassword={vi.fn()}
      />
    );
    const unlockBtn = screen.getByRole("button", { name: "Unlock" });
    expect(unlockBtn).toBeDisabled();
  });

  it("toggles password visibility", () => {
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password" })}
        onDownload={vi.fn()}
        showIndividualPassword={true}
        onUnlockWithPassword={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Enter password") as HTMLInputElement;
    expect(input.type).toBe("password");

    // Find the toggle button (sibling of input inside the relative div)
    const toggleButtons = screen.getAllByRole("button");
    const toggleBtn = toggleButtons.find((b) => b.getAttribute("type") === "button");
    fireEvent.click(toggleBtn!);
    expect(input.type).toBe("text");
  });

  it("shows error message in individual password mode", () => {
    render(
      <FileRow
        pdfFile={makePdfFile({ status: "needs-password", errorMessage: "Incorrect password" })}
        onDownload={vi.fn()}
        showIndividualPassword={true}
        onUnlockWithPassword={vi.fn()}
      />
    );
    expect(screen.getByText("Incorrect password")).toBeInTheDocument();
  });

  it("does not show download button for non-unlocked statuses", () => {
    render(
      <FileRow pdfFile={makePdfFile({ status: "processing" })} onDownload={vi.fn()} />
    );
    expect(screen.queryByLabelText("Download unlocked PDF")).not.toBeInTheDocument();
  });
});
