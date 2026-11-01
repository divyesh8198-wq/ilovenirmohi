import { v2 as cloudinary } from 'cloudinary';

// Configure from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

/** Upload a local file buffer to Cloudinary and return the secure URL */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `our-little-universe/${folder}`,
        public_id: filename.replace(/\.[^.]+$/, ''),
        resource_type: resourceType,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

/** Delete a file from Cloudinary by public ID */
export async function deleteFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch { /* ignore */ }
}

/** Whether Cloudinary is configured */
export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}
