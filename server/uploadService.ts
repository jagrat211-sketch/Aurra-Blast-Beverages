import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Cloudinary default credentials provided by the user
export const CLOUDINARY_DEFAULTS = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'crmfblxb',
  apiKey: process.env.CLOUDINARY_API_KEY || '358848824773251',
  apiSecret: process.env.CLOUDINARY_API_SECRET || 'N56wBR13WVZ7u-9LnJYH97ClB98',
  uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'aurra_preset',
};

// Ensure uploads/beverages directory exists for fallback local storage
const uploadsDir = path.resolve(process.cwd(), 'uploads', 'beverages');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
    // Ignore in read-only environments
  }
}

export interface UploadResult {
  url: string;
  filename: string;
  sizeBytes: number;
  provider: 'cloudinary' | 'local_storage';
  folder?: string;
  width?: number;
  height?: number;
}

export interface CloudinaryConfig {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}

/**
 * Generates an authenticated SHA-1 signature for Cloudinary signed uploads.
 * Cloudinary signs all parameters (alphabetically sorted) concatenated with the API Secret.
 */
export function generateCloudinarySignature(
  paramsToSign: Record<string, string | number>,
  apiSecret: string = CLOUDINARY_DEFAULTS.apiSecret
): string {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(serialized + apiSecret).digest('hex');
}

/**
 * Creates signed parameters for client-side direct uploads to Cloudinary.
 * Enforces folder separation:
 * - "Aurra profile" for user profile pictures
 * - "Aurra products" for admin product images
 */
export function getSignedUploadParams(
  folder: 'Aurra profile' | 'Aurra products',
  customConfig?: CloudinaryConfig
) {
  const cloudName = customConfig?.cloudName || CLOUDINARY_DEFAULTS.cloudName;
  const apiKey = customConfig?.apiKey || CLOUDINARY_DEFAULTS.apiKey;
  const apiSecret = customConfig?.apiSecret || CLOUDINARY_DEFAULTS.apiSecret;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = generateCloudinarySignature(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  };
}

/**
 * Securely uploads an image to Cloudinary using signed authentication.
 * Never uses unsigned uploads.
 */
export async function uploadToCloudinarySigned(
  fileData: string,
  folder: 'Aurra profile' | 'Aurra products',
  customConfig?: CloudinaryConfig
): Promise<UploadResult> {
  const cloudName = customConfig?.cloudName || CLOUDINARY_DEFAULTS.cloudName;
  const apiKey = customConfig?.apiKey || CLOUDINARY_DEFAULTS.apiKey;
  const apiSecret = customConfig?.apiSecret || CLOUDINARY_DEFAULTS.apiSecret;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = generateCloudinarySignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary signed upload error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    url: data.secure_url || data.url,
    filename: data.public_id,
    sizeBytes: data.bytes || 0,
    provider: 'cloudinary',
    folder: data.asset_folder || folder,
    width: data.width,
    height: data.height,
  };
}

/**
 * Saves a beverage product image to Cloudinary (folder "Aurra products") using signed authentication.
 * Falls back to local storage if network fails.
 */
export async function saveBeverageImage(
  base64Data: string,
  originalFilename?: string,
  customCloudinary?: CloudinaryConfig
): Promise<UploadResult> {
  // Always attempt signed Cloudinary upload first
  try {
    return await uploadToCloudinarySigned(base64Data, 'Aurra products', customCloudinary);
  } catch (err: any) {
    console.warn('[Cloudinary Signed Upload] Failed, falling back to local storage:', err.message);
  }

  // Local storage fallback
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

  try {
    fs.writeFileSync(filePath, buffer);
  } catch (fsErr) {
    console.warn('Could not write to local uploads directory:', fsErr);
  }

  return {
    url: `/uploads/beverages/${filename}`,
    filename,
    sizeBytes: buffer.length,
    provider: 'local_storage',
    folder: 'local',
  };
}
