"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import QrScanner from "qr-scanner";
import { parseQRData, scanQRFromImage, type QRData } from "@/lib/qr-utils";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: string) => void;
  isScanning?: boolean;
}

export function QRScanner({ onScan, onError, isScanning = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setIsInitializing(false);
  }, [stream]);

  const handleVideoReady = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isMounted) return;

    try {
      qrScannerRef.current = new QrScanner(
        video,
        (result) => {
          if (result && result.data) {
            // Pass the raw QR data string to the parent component
            onScan(result.data);
            cleanup();
          }
        },
        {
          onDecodeError: (error) => {
            console.debug("QR decode error:", error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
      setIsActive(true);
      setIsInitializing(false);
      setError("");
    } catch (err) {
      console.error("Error starting QR scanner:", err);
      const errorMsg = err instanceof Error ? `Scanner error: ${err.message}` : "Failed to start QR scanner";
      setError(errorMsg);
      onError(errorMsg);
      setIsInitializing(false);
      setIsActive(false);
    }
  }, [onScan, onError, cleanup, isMounted]);

  const startCamera = async () => {
    if (isInitializing || !isMounted) return;

    try {
      setError("");
      setHasPermission(null);
      setIsInitializing(true);

      if (!window.isSecureContext) {
        throw new Error("Camera requires secure connection (HTTPS)");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access not supported");
      }

      if (!(await QrScanner.hasCamera())) {
        throw new Error("No camera found on this device");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setHasPermission(true);

      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      const video = videoRef.current;
      video.srcObject = mediaStream;
      video.setAttribute("autoplay", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");

      video.onloadedmetadata = () => {
        handleVideoReady();
      };

      video.onerror = () => {
        throw new Error("Video element error");
      };

      setTimeout(() => {
        if (isInitializing && !isActive && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          handleVideoReady();
        }
      }, 3000);
    } catch (error: any) {
      console.error("Camera error:", error);
      setHasPermission(false);
      setIsInitializing(false);

      let errorMessage = "Camera access denied. Please allow permissions.";
      switch (error.name) {
        case "NotReadableError":
          errorMessage = "Camera is busy or unavailable.";
          break;
        case "NotAllowedError":
          errorMessage = "Camera access was denied. Please enable permissions.";
          break;
        case "NotFoundError":
          errorMessage = "No camera found on this device.";
          break;
        case "OverconstrainedError":
          errorMessage = "Camera constraints could not be satisfied.";
          break;
        case "AbortError":
          errorMessage = "Camera access was aborted.";
          break;
        case "SecurityError":
          errorMessage = "Camera blocked for security reasons.";
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        const qrData = await scanQRFromImage(img);
        if (qrData) {
          // Pass the raw QR data string to the parent component
          onScan(qrData);
        } else {
          onError("No QR code found in image");
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        onError("Failed to load image");
      };
    } catch (error: any) {
      onError(`Image scan error: ${error.message}`);
    }
  };

  const stopCamera = () => {
    cleanup();
  };

  if (!isMounted) {
    return (
      <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-700">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
            <CameraOff className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
            Camera Access Required
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Please allow camera access in your browser settings and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertDescription className="text-red-200 text-sm sm:text-base">
              {error}
              <br />
              <a
                href="https://support.google.com/chrome/answer/2693767"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Learn how to enable camera permissions
              </a>
            </AlertDescription>
          </Alert>
          <Button
            onClick={startCamera}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700"
            disabled={isInitializing}
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Retry Camera Access
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-slate-900/50 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
          <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          QR Code Scanner
        </CardTitle>
        {!isActive && !isInitializing && (
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Press the button to start scanning
          </CardDescription>
        )}
        {isInitializing && (
          <CardDescription className="text-blue-400 text-sm sm:text-base">
            Initializing camera...
          </CardDescription>
        )}
        {isActive && (
          <CardDescription className="text-green-400 text-sm sm:text-base">
            📹 Camera active - Point at QR code to scan
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {isActive ? (
          <div className="space-y-4">
            <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs font-medium">SCANNING</span>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <p className="text-white text-sm font-medium">📱 Position QR code in view</p>
                  <p className="text-slate-300 text-xs mt-1">Keep steady and well-lit</p>
                </div>
              </div>
            </div>
            <Button
              onClick={stopCamera}
              variant="outline"
              className="w-full h-11 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <CameraOff className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Stop Scanning
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <video ref={videoRef} playsInline muted autoPlay className="hidden" />
            <div className="space-y-4 sm:space-y-6">
              <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              </div>
              <Button
                onClick={startCamera}
                disabled={isScanning || isInitializing}
                className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-base sm:text-lg disabled:opacity-50"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Initializing Camera...
                  </>
                ) : isScanning ? (
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
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-4 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white file:hover:bg-blue-700"
              />
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  📸 Make sure the QR code is well-lit and within camera range for best results
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}