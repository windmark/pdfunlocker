import { useCallback } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DropZone = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: DropZoneProps) => {
  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
        multiple
        onChange={onFileSelect}
        className="hidden"
      />
      <div className="flex flex-col items-center text-center">
        <Upload
          className={`w-10 h-10 mb-4 transition-colors ${
            isDragging ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <p className="text-foreground font-medium mb-1">
          Drop your PDFs here
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse • multiple files supported
        </p>
      </div>
    </label>
  );
};
