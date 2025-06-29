"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/providers";
import { QRScanner } from "@/components/qr-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, MapPin, Clock, Loader2, AlertTriangle } from "lucide-react";
import { parseQRData, isQRCodeExpired } from "@/lib/qr-utils";
import { isWithinGeofence } from "@/lib/utils";
import { sendAttendanceConfirmation } from "@/lib/email";

export default function ScanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    className?: string;
    timestamp?: Date;
  } | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    if (!user.isApproved) {
      router.push("/auth/pending-approval");
      return;
    }

    getCurrentLocation();
  }, [user, router]);

  const getCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Location error:", error);
        setLocationError(
          "Unable to get your location. Please enable location services and refresh the page."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleScan = async (qrDataString: string) => {
    if (!user || !location) {
      setResult({
        success: false,
        message: "User authentication or location is required.",
      });
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      console.log("Received QR data string:", qrDataString);
      
      // Parse the QR data from the string
      const qrData = parseQRData(qrDataString);
      if (!qrData) {
        console.error("Failed to parse QR data string:", qrDataString);
        
        // Provide more specific error messages based on the content
        let errorMessage = "Invalid QR code format. Please scan a valid attendance QR code.";
        
        try {
          const testParse = JSON.parse(qrDataString);
          if (testParse && typeof testParse === 'object') {
            errorMessage = "QR code is missing required attendance data. Please scan a valid attendance QR code.";
          }
        } catch {
          errorMessage = "QR code does not contain valid JSON data. Please scan a valid attendance QR code.";
        }
        
        setResult({ success: false, message: errorMessage });
        return;
      }

      console.log("Parsed QR data:", qrData);

      // Validate the parsed data structure
      if (
        !qrData.classId ||
        !qrData.sessionId ||
        !qrData.timestamp ||
        !qrData.location ||
        typeof qrData.location.latitude !== "number" ||
        typeof qrData.location.longitude !== "number"
      ) {
        console.error("Invalid QR data structure:", {
          classId: qrData.classId,
          sessionId: qrData.sessionId,
          timestamp: qrData.timestamp,
          location: qrData.location,
          fullData: qrData
        });
        setResult({ success: false, message: "QR code is missing required attendance information. Please scan a valid attendance QR code." });
        return;
      }

      if (isQRCodeExpired(qrData.timestamp)) {
        setResult({ success: false, message: "This QR code has expired. Please ask your instructor for a new one." });
        return;
      }

      const classDoc = await getDoc(doc(db, "classes", qrData.classId));
      console.log("Class doc exists:", classDoc.exists(), "Data:", classDoc.data());
      if (!classDoc.exists()) {
        setResult({ success: false, message: "Class not found." });
        return;
      }

      const classData = classDoc.data();
      if (!classData.location?.radius || !classData.name) {
        setResult({ success: false, message: "Class data is incomplete. Please contact your instructor." });
        return;
      }

      const isInLocation = isWithinGeofence(
        location.latitude,
        location.longitude,
        qrData.location.latitude,
        qrData.location.longitude,
        classData.location.radius
      );
      console.log("Geofence check:", {
        userLocation: { lat: location.latitude, lon: location.longitude },
        targetLocation: { lat: qrData.location.latitude, lon: qrData.location.longitude },
        radius: classData.location.radius,
        isInLocation,
      });

      if (!isInLocation) {
        setResult({ success: false, message: "You are not within the required location to mark attendance." });
        return;
      }

      const existingAttendance = await getDocs(
        query(
          collection(db, "attendance"),
          where("sessionId", "==", qrData.sessionId),
          where("studentId", "==", user.id)
        )
      );
      console.log("Existing attendance count:", existingAttendance.size);

      if (!existingAttendance.empty) {
        setResult({ success: false, message: "Attendance has already been marked for this session." });
        return;
      }

      const now = new Date();
      const sessionStart = new Date(qrData.timestamp);
      const minutesLate = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);
      const status = minutesLate > 15 ? "late" : "present";

      const attendanceRecord = {
        sessionId: qrData.sessionId,
        studentId: user.id,
        classId: qrData.classId,
        timestamp: now,
        status,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        scannedAt: now,
      };

      await addDoc(collection(db, "attendance"), attendanceRecord);
      await sendAttendanceConfirmation(user.email, user.name, classData.name, now);

      setResult({
        success: true,
        message: `Attendance marked successfully! Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        className: classData.name,
        timestamp: now,
      });
    } catch (error: any) {
      console.error("Attendance marking error:", error.message, error.stack);
      const errorMessage = error.code?.includes("unavailable")
        ? "Network error. Please check your connection and try again."
        : `An unexpected error occurred: ${error.message}`;
      setResult({ success: false, message: errorMessage });
    } finally {
      setScanning(false);
    }
  };

  const handleScanError = (error: string) => {
    setResult({ success: false, message: error });
  };

  const resetScanner = () => {
    setResult(null);
    setScanning(false);
    getCurrentLocation();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (result) {
      return (
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <span className="text-lg sm:text-xl">{result.success ? "Attendance Marked!" : "Scan Failed"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <Alert
              variant={result.success ? "default" : "destructive"}
              className={
                result.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }
            >
              <AlertDescription className="text-sm sm:text-base">{result.message}</AlertDescription>
            </Alert>

            {result.success && result.className && result.timestamp && (
              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30">
                    {result.className}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>{result.timestamp.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={resetScanner}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium h-11"
              >
                Scan Another Code
              </Button>
              <Button
                onClick={() => router.push("/student/dashboard")}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-11"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (location) {
      return (
        <div className="relative">
          <QRScanner onScan={handleScan} onError={handleScanError} isScanning={scanning} />
          {scanning && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
                <p className="text-white font-medium">Processing scan...</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (locationError) {
      return (
        <Alert variant="destructive" className="max-w-md bg-red-500/10 border-red-500/20 backdrop-blur-sm">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertTitle className="text-red-300 text-lg">Location Required</AlertTitle>
          <AlertDescription className="text-red-200 mt-2">
            {locationError}
            <p className="mt-2 text-sm">
              Ensure location services are enabled in your device settings and browser permissions.
              <a
                href="https://support.google.com/chrome/answer/142065"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Learn how to enable location
              </a>
            </p>
            <Button
              onClick={getCurrentLocation}
              variant="outline"
              size="sm"
              className="mt-3 w-full border-red-500/30 text-red-300 hover:bg-red-500/20"
            >
              Retry Location
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Card className="max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-full blur-xl"></div>
            <Loader2 className="relative h-12 w-12 animate-spin text-cyan-400" />
          </div>
          <p className="text-lg font-medium text-white mb-2">Getting your location...</p>
          <p className="text-sm text-slate-400 text-center">Please allow location access to mark attendance</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-emerald-600/20 blur-3xl"></div>
              <h1 className="relative text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Scan QR Code
              </h1>
            </div>
            <p className="text-base sm:text-lg text-slate-400 max-w-sm mx-auto leading-relaxed">
              Point your camera at the QR code to mark your attendance
            </p>
          </div>
          <div className="flex items-center justify-center">{renderContent()}</div>
          {location && (
            <div className="bg-slate-900/30 backdrop-blur-sm rounded-xl border border-slate-800 p-4">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <span className="font-mono text-xs sm:text-sm">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
              </div>
              <p className="text-xs text-slate-500 text-center mt-1">Current Location</p>
            </div>
          )}
          {!result && location && (
            <div className="bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-emerald-500/10 rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-slate-300">Ready to scan</p>
                <p className="text-xs text-slate-400">
                  Make sure you're within the classroom location and the QR code is clearly visible
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}