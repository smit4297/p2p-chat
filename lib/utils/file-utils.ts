// File handling utilities

/**
 * Format file size to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get unique file name by appending counter if name exists
 * @param fileName - Original file name
 * @param existingNames - Array of existing file names
 * @returns Unique file name
 */
export function getUniqueFileName(
  fileName: string,
  existingNames: string[]
): string {
  if (!existingNames.includes(fileName)) {
    return fileName;
  }

  let counter = 1;
  const nameParts = fileName.split(".");
  const extension = nameParts.length > 1 ? nameParts.pop() : "";
  const name = nameParts.join(".");

  let uniqueName = extension
    ? `${name} (${counter}).${extension}`
    : `${name} (${counter})`;

  while (existingNames.includes(uniqueName)) {
    counter++;
    uniqueName = extension
      ? `${name} (${counter}).${extension}`
      : `${name} (${counter})`;
  }

  return uniqueName;
}

/**
 * Validate file before transfer
 * @param file - File to validate
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateFile(
  file: File,
  maxSize: number = 100 * 1024 * 1024
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}

/**
 * Get file extension
 * @param fileName - File name
 * @returns File extension without dot
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Get file icon based on extension
 * @param fileName - File name
 * @returns Icon name for lucide-react
 */
export function getFileIcon(fileName: string): string {
  const extension = getFileExtension(fileName);

  const iconMap: Record<string, string> = {
    // Images
    jpg: "Image",
    jpeg: "Image",
    png: "Image",
    gif: "Image",
    svg: "Image",
    webp: "Image",

    // Documents
    pdf: "FileText",
    doc: "FileText",
    docx: "FileText",
    txt: "FileText",

    // Spreadsheets
    xls: "Sheet",
    xlsx: "Sheet",
    csv: "Sheet",

    // Archives
    zip: "Archive",
    rar: "Archive",
    "7z": "Archive",
    tar: "Archive",
    gz: "Archive",

    // Videos
    mp4: "Video",
    avi: "Video",
    mov: "Video",
    mkv: "Video",

    // Audio
    mp3: "Music",
    wav: "Music",
    flac: "Music",
    m4a: "Music",

    // Code
    js: "Code",
    ts: "Code",
    jsx: "Code",
    tsx: "Code",
    py: "Code",
    java: "Code",
    cpp: "Code",
    c: "Code",
  };

  return iconMap[extension] || "File";
}

/**
 * Read file as array buffer
 * @param file - File to read
 * @returns Promise resolving to ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download file from blob URL
 * @param url - Blob URL
 * @param fileName - File name for download
 */
export function downloadFile(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
