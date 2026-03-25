import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  fileType: "image/jpeg" as const,
  useWebWorker: true,
};

/**
 * Compresses an image file before upload.
 * Reduces size to max 2MB, max 1920px, output JPEG.
 */
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, COMPRESSION_OPTIONS);
}
