// Client-side Cloudinary utilities (no server imports)

// Client-side upload function using Cloudinary's unsigned upload
export async function uploadImageClient(file: File, folder = "attendance-app"): Promise<string> {
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "attendance_preset")
    formData.append("folder", folder)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    )

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error("Error uploading image (client):", error)
    throw new Error("Failed to upload image")
  }
}

// Validate file before upload
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File too large. Please upload an image smaller than 5MB.",
    }
  }

  return { valid: true }
}

// Get optimized image URL (client-side version)
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

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName) {
    console.warn("Cloudinary cloud name not configured")
    return publicId
  }

  const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`
}
