import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DropZone } from "../DropZone";

const defaultProps = {
  isDragging: false,
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
  onFileSelect: vi.fn(),
};

describe("DropZone", () => {
  it("renders drop zone with instructions", () => {
    render(<DropZone {...defaultProps} />);
    expect(screen.getByText("Drop your PDFs here")).toBeInTheDocument();
    expect(screen.getByText(/files and folders supported/)).toBeInTheDocument();
  });

  it("contains a hidden file input accepting PDFs", () => {
    render(<DropZone {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toBe(".pdf");
    expect(input.multiple).toBe(true);
    expect(input.className).toContain("hidden");
  });

  it("applies dragging styles when isDragging is true", () => {
    const { container } = render(<DropZone {...defaultProps} isDragging={true} />);
    const label = container.querySelector("label");
    expect(label?.className).toContain("border-primary");
  });

  it("does not apply dragging styles when isDragging is false", () => {
    const { container } = render(<DropZone {...defaultProps} isDragging={false} />);
    const label = container.querySelector("label");
    expect(label?.className).toContain("border-border");
    expect(label?.className).not.toContain("border-primary");
  });

  it("calls onDragOver on dragover event", () => {
    const onDragOver = vi.fn();
    const { container } = render(<DropZone {...defaultProps} onDragOver={onDragOver} />);
    fireEvent.dragOver(container.querySelector("label")!);
    expect(onDragOver).toHaveBeenCalledTimes(1);
  });

  it("calls onDragLeave on dragleave event", () => {
    const onDragLeave = vi.fn();
    const { container } = render(<DropZone {...defaultProps} onDragLeave={onDragLeave} />);
    fireEvent.dragLeave(container.querySelector("label")!);
    expect(onDragLeave).toHaveBeenCalledTimes(1);
  });

  it("calls onDrop on drop event", () => {
    const onDrop = vi.fn();
    const { container } = render(<DropZone {...defaultProps} onDrop={onDrop} />);
    fireEvent.drop(container.querySelector("label")!);
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("calls onFileSelect when files are chosen", () => {
    const onFileSelect = vi.fn();
    render(<DropZone {...defaultProps} onFileSelect={onFileSelect} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([], "test.pdf")] } });
    expect(onFileSelect).toHaveBeenCalledTimes(1);
  });
});
