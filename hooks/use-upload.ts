"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface UploadOptions {
  folder?: string
  onProgress?: (progress: number) => void
}

interface UploadResult {
  success: boolean
  url: string
  message?: string
}

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  })
  const { toast } = useToast()

  const uploadImage = async (file: File, options: UploadOptions = {}): Promise<string | null> => {
    const { folder = "attendance-app", onProgress } = options

    // Client-side validation
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

    if (!allowedTypes.includes(file.type)) {
      const error = "Please select a valid image file (JPEG, PNG, or WebP)"
      setState((prev) => ({ ...prev, error }))
      toast({
        title: "Invalid file type",
        description: error,
        variant: "destructive",
      })
      return null
    }

    if (file.size > maxSize) {
      const error = "File size must be less than 5MB"
      setState((prev) => ({ ...prev, error }))
      toast({
        title: "File too large",
        description: error,
        variant: "destructive",
      })
      return null
    }

    setState({
      uploading: true,
      progress: 0,
      error: null,
    })

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)

      return new Promise<string | null>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setState((prev) => ({ ...prev, progress }))
            onProgress?.(progress)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const response: UploadResult = JSON.parse(xhr.responseText)
              if (response.success && response.url) {
                setState({
                  uploading: false,
                  progress: 100,
                  error: null,
                })
                toast({
                  title: "Upload successful",
                  description: "Your image has been uploaded successfully.",
                })
                resolve(response.url)
              } else {
                throw new Error(response.message || "Upload failed")
              }
            } catch (parseError) {
              throw new Error("Invalid response from server")
            }
          } else {
            throw new Error(`Upload failed with status: ${xhr.status}`)
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"))
        })

        xhr.open("POST", "/api/upload/image")
        xhr.send(formData)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      setState({
        uploading: false,
        progress: 0,
        error: errorMessage,
      })
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
      return null
    }
  }

  const reset = () => {
    setState({
      uploading: false,
      progress: 0,
      error: null,
    })
  }

  return {
    ...state,
    uploadImage,
    reset,
  }
}
