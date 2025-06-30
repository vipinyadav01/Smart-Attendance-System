"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { QrCode, MapPin, Clock, RefreshCw, Download, Share2 } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface ClassOption {
  id: string;
  name: string;
  code: string;
  location: {
    name?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    radius: number;
  };
}

export default function GenerateQRPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [qrResult, setQrResult] = useState<{
    qrCode: string
    sessionId: string
    expiresAt: Date
    className: string
  } | null>(null)
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [locationError, setLocationError] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (user.role !== "admin") {
      router.push("/student/dashboard")
      return
    }

    fetchClasses()
    getCurrentLocation()
  }, [user, router])

  const fetchClasses = async () => {
    if (!user) return

    try {
      setLoading(true)
      const classesQuery = query(collection(db, "classes"), where("universityId", "==", user.university))
      const classesSnapshot = await getDocs(classesQuery)

      const classesData = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClassOption[]

      setClasses(classesData)
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({
        title: "Error",
        description: "Failed to fetch classes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = () => {
    setLocationError("")
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location obtained:", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationError("")
      },
      (error) => {
        console.error("Location error:", error)
        let errorMessage = "Unable to get your location. Please enable location services."
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please enable location permissions and refresh the page."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again."
            break
        }
        
        setLocationError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      },
    )
  }

  const generateQRCode = async () => {
    if (!selectedClass || !location || !user) {
      toast({
        title: "Error",
        description: "Please select a class and ensure location is available",
        variant: "destructive",
      })
      return
    }

    // Validate selected class has location data
    const selectedClassData = classes.find((c) => c.id === selectedClass)
    if (!selectedClassData) {
      toast({
        title: "Error",
        description: "Selected class not found",
        variant: "destructive",
      })
      return
    }

    // Validate class has complete location data
    if (
      !selectedClassData.name ||
      !selectedClassData.code ||
      !selectedClassData.location?.radius ||
      !selectedClassData.location?.coordinates?.latitude ||
      !selectedClassData.location?.coordinates?.longitude
    ) {
      toast({
        title: "Error",
        description: "Selected class has incomplete location data. Please update class information.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      // Ensure location coordinates are properly formatted as numbers
      const locationData = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      }

      // Validate location coordinates
      if (isNaN(locationData.latitude) || isNaN(locationData.longitude)) {
        throw new Error("Invalid location coordinates")
      }

      console.log("Generating QR code with data:", {
        classId: selectedClass,
        location: locationData,
        className: selectedClassData.name,
      })

      const response = await fetch("/api/qr/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: selectedClass,
          location: locationData,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error("QR generation failed:", data)
        throw new Error(data.error || `Failed to generate QR code (${response.status})`)
      }

      console.log("QR generation response:", data)

      if (!data.qrCode || !data.sessionId || !data.expiresAt) {
        throw new Error("Invalid response from server - missing required data")
      }

      setQrResult({
        qrCode: data.qrCode,
        sessionId: data.sessionId,
        expiresAt: new Date(data.expiresAt),
        className: selectedClassData.name || "Unknown Class",
      })

      toast({
        title: "Success",
        description: `QR code generated successfully for ${selectedClassData.name}`,
      })
    } catch (error: any) {
      console.error("QR generation error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR code",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrResult) return

    const link = document.createElement("a")
    link.download = `qr-${qrResult.sessionId}.png`
    link.href = qrResult.qrCode
    link.click()
  }

  const shareQRCode = async () => {
    if (!qrResult) return

    if (navigator.share) {
      try {
        // Convert data URL to blob
        const response = await fetch(qrResult.qrCode)
        const blob = await response.blob()
        const file = new File([blob], `qr-${qrResult.sessionId}.png`, { type: "image/png" })

        await navigator.share({
          title: `QR Code - ${qrResult.className}`,
          text: `Attendance QR Code for ${qrResult.className}`,
          files: [file],
        })
      } catch (error) {
        console.error("Error sharing:", error)
        // Fallback to download
        downloadQRCode()
      }
    } else {
      // Fallback to download
      downloadQRCode()
    }
  }

  const resetQRCode = () => {
    setQrResult(null)
    setSelectedClass("")
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-800 rounded-full animate-spin border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Generate QR Code</h1>
              <p className="text-sm text-gray-400">Create attendance QR codes for your classes</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push("/admin/dashboard")}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* QR Generation Form */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <QrCode className="h-5 w-5 text-blue-400" />
                Generate QR Code
              </CardTitle>
              <CardDescription className="text-gray-400">Select a class and generate a time-limited QR code for attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {locationError && (
                <Alert className="bg-red-900/20 border-red-500/30">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">
                    {locationError}
                    <Button
                      onClick={getCurrentLocation}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full bg-red-900/30 border-red-500/30 text-red-400 hover:bg-red-900/50"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry Location
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!location && !locationError && (
                <Alert className="bg-blue-900/20 border-blue-500/30">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-400">Getting your location...</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="text-white hover:bg-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{cls.name}</span>
                          <span className="text-xs text-gray-400">{cls.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-400 mb-2">Class Information</h4>
                  {(() => {
                    const cls = classes.find((c) => c.id === selectedClass)
                    return cls ? (
                      <div className="space-y-1 text-sm text-gray-300">
                        <p>
                          <span className="text-gray-400">Name:</span> {cls.name}
                        </p>
                        <p>
                          <span className="text-gray-400">Code:</span> {cls.code}
                        </p>
                        <p>
                          <span className="text-gray-400">Location:</span> {cls.location?.name || "Not specified"}
                        </p>
                        <p>
                          <span className="text-gray-400">Radius:</span> {cls.location?.radius || 50}m
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {location && (
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                  <h4 className="font-medium text-green-400 mb-2">Current Location</h4>
                  <div className="space-y-1 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400">Latitude:</span> {location.latitude.toFixed(6)}
                    </p>
                    <p>
                      <span className="text-gray-400">Longitude:</span> {location.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-lg">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-400">Important Notes</h4>
                    <ul className="mt-2 text-sm text-gray-300 space-y-1">
                      <li>• QR codes expire after 1 minute</li>
                      <li>• Students must be within the class location radius</li>
                      <li>• Each student can scan only once per session</li>
                      <li>• Generate a new code for each class session</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateQRCode} 
                disabled={!selectedClass || !location || generating} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Generated QR Code</CardTitle>
              <CardDescription className="text-gray-400">
                {qrResult
                  ? "Share this QR code with your students to mark attendance"
                  : "QR code will appear here after generation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qrResult ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center">
                    {qrResult.qrCode ? (
                      <img
                        src={qrResult.qrCode}
                        alt="Attendance QR Code"
                        className="mx-auto border border-gray-700 rounded-lg shadow-lg bg-white p-4"
                        style={{ maxWidth: "280px", width: "100%" }}
                        onError={(e) => {
                          console.error("QR code image failed to load")
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="mx-auto border border-gray-700 rounded-lg shadow-lg bg-gray-800 p-4 flex items-center justify-center" style={{ maxWidth: "280px", width: "100%", height: "280px" }}>
                        <div className="text-center">
                          <QrCode className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">QR Code Loading...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-400">Class:</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-center sm:text-left">{qrResult.className}</Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-400">Session ID:</span>
                      <code className="text-xs bg-gray-800 text-green-400 px-2 py-1 rounded border border-gray-700 break-all">{qrResult.sessionId}</code>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-400">Expires At:</span>
                      <span className="text-sm text-red-400 font-medium">
                        {qrResult.expiresAt.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button 
                      onClick={downloadQRCode} 
                      variant="outline" 
                      className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      onClick={shareQRCode} 
                      variant="outline" 
                      className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>

                  <Button 
                    onClick={resetQRCode} 
                    variant="ghost" 
                    className="w-full text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    Generate New QR Code
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <QrCode className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No QR code generated yet</p>
                  <p className="text-sm text-gray-500 mt-1">Select a class and click generate to create a QR code</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6 sm:mt-8 bg-gray-900 border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">Common tasks for attendance management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/classes")}
                className="h-auto p-4 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-blue-500/30 transition-all duration-200"
              >
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold">Manage Classes</div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1">Add or edit class information</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/students")}
                className="h-auto p-4 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-green-500/30 transition-all duration-200"
              >
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold">Manage Students</div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1">Approve or manage student accounts</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/reports")}
                className="h-auto p-4 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-purple-500/30 transition-all duration-200 sm:col-span-2 lg:col-span-1"
              >
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold">View Reports</div>
                  <div className="text-xs sm:text-sm text-gray-400 mt-1">Generate attendance reports</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
