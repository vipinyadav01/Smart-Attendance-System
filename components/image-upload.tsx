"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useUpload } from "@/hooks/use-upload"
import { Camera, Upload, X, Check } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  onUpload: (url: string) => void
  currentImage?: string
  className?: string
  disabled?: boolean
}

export function ImageUpload({ onUpload, currentImage, className, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const { uploading, progress, uploadImage } = useUpload()

  const handleFileSelect = async (file: File) => {
    try {
      const url = await uploadImage(file)
      if (url) {
        onUpload(url)
      }
    } catch (error) {
      console.error("Upload failed:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!disabled && !uploading ? openFileDialog : undefined}
      >
        <CardContent className="p-6">
          {uploading ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Uploading image...</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-gray-500">{progress}%</p>
              </div>
            </div>
          ) : currentImage ? (
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <img
                  src={currentImage || "/placeholder.svg"}
                  alt="Current upload"
                  className="h-24 w-24 rounded-lg object-cover mx-auto"
                />
                <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Image uploaded successfully</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openFileDialog()
                  }}
                  disabled={disabled}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Upload className="h-full w-full" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Upload an image</p>
                <p className="text-xs text-gray-500">
                  Drag and drop or click to select
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, WebP up to 5MB
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
