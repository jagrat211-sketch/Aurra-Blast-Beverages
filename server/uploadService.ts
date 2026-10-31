import fs from 'fs';
import path from 'path';

// Ensure uploads/beverages directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads', 'beverages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface UploadResult {
  url: string;
  filename: string;
  sizeBytes: number;
  provider: 'local_storage' | 'cloudinary';
  width?: number;
  height?: number;
}

export interface CloudinaryConfig {
  cloudName?: string;
  uploadPreset?: string;
  apiKey?: string;
  apiSecret?: string;
}

/**
 * Saves a base64 encoded image to either Cloudinary (if configured) or local persistent storage.
 */
export async function saveBeverageImage(
  base64Data: string,
  originalFilename?: string,
  customCloudinary?: CloudinaryConfig
): Promise<UploadResult> {
  // Check if Cloudinary is configured via custom args or environment variables
  const cloudName = customCloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = customCloudinary?.uploadPreset || process.env.CLOUDINARY_UPLOAD_PRESET;

  // 1. If Cloudinary credentials or preset provided, upload directly to Cloudinary
  if (cloudName && uploadPreset) {
    try {
      const formData = new URLSearchParams();
      formData.append('file', base64Data);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'aura_beverages');

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Cloudinary] Upload failed (${res.status}): ${errText}. Falling back to local storage.`);
      } else {
        const data = await res.json();
        return {
          url: data.secure_url || data.url,
          filename: data.public_id,
          sizeBytes: data.bytes || 0,
          provider: 'cloudinary',
          width: data.width,
          height: data.height,
        };
      }
    } catch (err) {
      console.warn('[Cloudinary] Network error, falling back to local storage:', err);
    }
  }

  // 2. Local persistent storage fallback
  // Extract extension and buffer
  let ext = 'jpg';
  let cleanBase64 = base64Data;

  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (matches) {
    const mime = matches[1].toLowerCase();
    ext = mime === 'jpeg' ? 'jpg' : mime === 'svg+xml' ? 'svg' : mime;
    cleanBase64 = matches[2];
  } else if (base64Data.startsWith('data:')) {
    const commaIndex = base64Data.indexOf(',');
    if (commaIndex !== -1) {
      cleanBase64 = base64Data.substring(commaIndex + 1);
    }
  }

  const buffer = Buffer.from(cleanBase64, 'base64');
  const timestamp = Date.now();
  const safeBaseName = originalFilename
    ? path.parse(originalFilename).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 24)
    : 'bev';
  const filename = `${safeBaseName}_${timestamp}.${ext}`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, buffer);

  // Return public URL path served by Express
  const publicUrl = `/uploads/beverages/${filename}`;

  return {
    url: publicUrl,
    filename,
    sizeBytes: buffer.length,
    provider: 'local_storage',
  };
}
