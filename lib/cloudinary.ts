import { v2 as cloudinary } from "cloudinary"

// Server-side Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Force HTTPS
})

// Server-side upload function
export async function uploadImage(file: File, folder = "attendance-app"): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto:good" },
              { format: "webp" },
            ],
            allowed_formats: ["jpg", "jpeg", "png", "webp"],
            max_file_size: 5000000, // 5MB limit
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error)
              reject(new Error(`Upload failed: ${error.message}`))
            } else if (result) {
              resolve(result.secure_url)
            } else {
              reject(new Error("Upload failed: No result returned"))
            }
          },
        )
        .end(buffer)
    })
  } catch (error) {
    console.error("Error uploading image (server):", error)
    throw new Error("Failed to upload image")
  }
}

// Server-side PDF upload function with proper buffer handling
export async function uploadPDF(buffer: Buffer, filename: string, folder = "attendance-reports"): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: "raw",
            public_id: `${filename}_${Date.now()}`,
            format: "pdf",
            allowed_formats: ["pdf"],
            max_file_size: 10000000, // 10MB limit
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary PDF upload error:", error)
              reject(new Error(`PDF upload failed: ${error.message}`))
            } else if (result) {
              resolve(result.secure_url)
            } else {
              reject(new Error("PDF upload failed: No result returned"))
            }
          },
        )
        .end(buffer)
    })
  } catch (error) {
    console.error("Error uploading PDF:", error)
    throw new Error("Failed to upload PDF")
  }
}

// Delete file function
export async function deleteFile(publicId: string): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    if (result.result !== "ok") {
      throw new Error(`Delete failed: ${result.result}`)
    }
  } catch (error) {
    console.error("Error deleting file:", error)
    throw new Error("Failed to delete file")
  }
}

// Get optimized image URL (server-side version)
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    crop?: string
    quality?: string
    format?: string
  } = {},
): string {
  const { width = 400, height = 400, crop = "fill", quality = "auto:good", format = "webp" } = options

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
    secure: true,
  })
}

export default cloudinary
