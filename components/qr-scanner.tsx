"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, CameraOff, Loader2 } from "lucide-react"
import { scanQRFromImageData } from "@/lib/qr-utils"

interface QRScannerProps {
  onScan: (data: string) => void
  onError: (error: string) => void
  isScanning?: boolean
}

export function QRScanner({ onScan, onError, isScanning = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState("")
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const scanFrameRef = useRef<number | null>(null)

  useEffect(() => {
    // Clean up function to stop the camera stream when the component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current)
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      setError("")
      setHasPermission(null)

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      setStream(mediaStream)
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setIsActive(true)
            startScanning()
        }
      }
    } catch (error: any) {
      console.error("Camera access error:", error)
      setHasPermission(false)
      let errorMessage = "Camera access denied. Please allow camera permissions."
      if (error.name === "NotReadableError") {
        errorMessage = "Cannot access the camera. It might be in use by another application."
      }
      setError(errorMessage)
      onError(errorMessage)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current)
    }
    setIsActive(false)
  }

  const startScanning = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !isActive || videoRef.current.paused) {
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d", { willReadFrequently: true })

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanFrameRef.current = requestAnimationFrame(scanFrame)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      try {
        const qrData = scanQRFromImageData(imageData)
        if (qrData) {
          onScan(qrData)
          stopCamera()
          return
        }
      } catch (e) {
        console.error("Error scanning QR code:", e)
      }

      scanFrameRef.current = requestAnimationFrame(scanFrame)
    }

    scanFrameRef.current = requestAnimationFrame(scanFrame)
  }

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
            <CameraOff className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
            Camera Access Required
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Please allow camera access to scan QR codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
            <AlertDescription className="text-red-200 text-sm sm:text-base">
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={startCamera} 
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium"
          >
            <Camera className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Enable Camera
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
          <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
          QR Code Scanner
        </CardTitle>
        {!isActive && (
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Press the button to start scanning
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {isActive ? (
          <div className="space-y-4">
            <div className="qr-scanner-container relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="w-full aspect-square object-cover"
              />
              <div className="qr-scanner-overlay absolute inset-0 flex items-center justify-center">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                  {/* Modern animated corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-cyan-400 animate-pulse" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-cyan-400 animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-cyan-400 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-cyan-400 animate-pulse" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-75" />
                </div>
                
                {/* Scan instruction */}
                <div className="absolute bottom-4 left-4 right-4 text-center">
                  <p className="text-white text-sm font-medium bg-slate-950/70 backdrop-blur-sm rounded-lg px-3 py-2">
                    Position QR code within the frame
                  </p>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <Button 
              onClick={stopCamera} 
              variant="outline" 
              className="w-full h-11 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <CameraOff className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="space-y-4 sm:space-y-6">
              {/* Scanner icon with glow effect */}
              <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-full blur-xl"></div>
                <div className="relative w-full h-full bg-gradient-to-r from-violet-600 to-cyan-600 rounded-full flex items-center justify-center">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              </div>
              
              <Button 
                onClick={startCamera} 
                disabled={isScanning} 
                className="h-12 px-8 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium text-base sm:text-lg disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Start Scanning
                  </>
                )}
              </Button>
              
              {/* Helpful tips */}
              <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Make sure the QR code is well-lit and within camera range for best results
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}