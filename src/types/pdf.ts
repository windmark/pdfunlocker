export type FileStatus =
  | "queued"
  | "processing"
  | "unlocked"
  | "needs-password"
  | "error";

export interface PdfFile {
  id: string;
  file: File;
  status: FileStatus;
  errorMessage?: string;
  unlockedData?: Uint8Array;
  password?: string;
  selected: boolean;
}
