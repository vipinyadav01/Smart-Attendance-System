"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ImageUpload } from "@/components/image-upload"
import { useAuth } from "@/app/providers"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
// Remove validateStudentId import as we're not validating student ID format anymore
import { Upload, Camera, User, Sparkles, CheckCircle, UserCircle, Hash, School } from "lucide-react"

export default function CompleteProfilePage() {
  const { user, firebaseUser, loading: authLoading, refreshUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [university, setUniversity] = useState("")
  const [generatingId, setGeneratingId] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState("")
  const [useGooglePhoto, setUseGooglePhoto] = useState(true)

  // Auto-generate student ID based on name and registration order
  const generateStudentId = async () => {
    if (!user?.name || !user?.university) return
    
    setGeneratingId(true)
    try {
      // Get count of existing students from same university
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("university", "==", user.university),
        orderBy("createdAt", "asc")
      )
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentCount = studentsSnapshot.size + 1
      
      // Generate ID: First 3 letters of name + student number (padded to 3 digits)
      const namePrefix = user.name
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .substring(0, 3)
        .padEnd(3, 'X')
      
      const studentNumber = studentCount.toString().padStart(3, '0')
      const generatedId = `${namePrefix}${studentNumber}`
      
      setStudentId(generatedId)
      
      toast({
        title: "Student ID Generated",
        description: `Your student ID: ${generatedId}`,
      })
    } catch (error) {
      console.error("Error generating student ID:", error)
      toast({
        title: "Generation Failed",
        description: "Could not auto-generate Student ID. Please enter manually.",
        variant: "destructive",
      })
    } finally {
      setGeneratingId(false)
    }
  }

  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) return

    // Redirect if not authenticated
    if (!firebaseUser) {
      router.push("/auth/signin")
      return
    }

    // Redirect if profile is already complete and has all required fields
    if (user?.profileComplete && user?.university && user?.rollNumber && user?.studentId) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else if (user.isApproved) {
        router.push("/student/dashboard")
      } else {
        router.push("/auth/pending-approval")
      }
      return
    }

    // Set initial values from existing user data
    if (user) {
      setStudentId(user.studentId || "")
      setRollNumber(user.rollNumber || "")
      setUniversity(user.university || "")
      
      // Auto-generate student ID if not present
      if (!user.studentId) {
        generateStudentId()
      }
    }

    // Set initial profile photo preference
    if (firebaseUser.photoURL) {
      setProfilePhoto(firebaseUser.photoURL)
      setUseGooglePhoto(true)
    }
  }, [user, firebaseUser, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return

    setLoading(true)

    try {
      // Validate required fields
      if (!studentId.trim()) {
        toast({
          title: "Student ID Required",
          description: "Please enter your student ID or click 'Generate ID'",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!rollNumber.trim()) {
        toast({
          title: "Roll Number Required", 
          description: "Please enter your roll number",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!university.trim()) {
        toast({
          title: "University Required",
          description: "Please enter your university name",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Check if roll number is unique (roll number should be unique)
      try {
        const rollNumberQuery = query(
          collection(db, "users"),
          where("rollNumber", "==", rollNumber.trim()),
          where("university", "==", university.trim())
        )
        const rollNumberSnapshot = await getDocs(rollNumberQuery)
        
        // If roll number exists and it's not the current user
        if (!rollNumberSnapshot.empty && rollNumberSnapshot.docs[0].id !== firebaseUser.uid) {
          toast({
            title: "Roll Number Already Exists",
            description: "This roll number is already registered. Please check and try again.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      } catch (error) {
        console.error("Error checking roll number uniqueness:", error)
        toast({
          title: "Validation Error",
          description: "Could not validate roll number. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Determine final profile photo
      const finalProfilePhoto = useGooglePhoto && firebaseUser.photoURL ? firebaseUser.photoURL : profilePhoto

      // Update user document
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        studentId: studentId.trim(),
        rollNumber: rollNumber.trim(),
        university: university.trim(),
        profilePhoto: finalProfilePhoto,
        profileComplete: true,
        updatedAt: new Date(),
      })

      // Refresh user data
      await refreshUser()

      toast({
        title: "Profile completed successfully!",
        description: "Your profile is now complete and pending admin approval.",
      })

      // Redirect based on role and approval status
      if (user?.role === "admin") {
        router.push("/admin/dashboard")
      } else if (user?.isApproved) {
        router.push("/student/dashboard")
      } else {
        router.push("/auth/pending-approval")
      }
    } catch (error) {
      console.error("Error completing profile:", error)
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = (url: string) => {
    setProfilePhoto(url)
    setUseGooglePhoto(false)
  }

  const handleUseGooglePhoto = () => {
    if (firebaseUser?.photoURL) {
      setProfilePhoto(firebaseUser.photoURL)
      setUseGooglePhoto(true)
    }
  }

  // Loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-gray-800 border-t-blue-500 border-r-purple-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-white text-lg font-medium">Loading authentication</p>
            <p className="text-gray-400 text-sm">Please wait while we verify your account...</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state while user data is loading
  if (firebaseUser && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-gray-800 border-t-blue-500 border-r-purple-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-white text-lg font-medium">Loading your profile</p>
            <p className="text-gray-400 text-sm">Getting your details ready...</p>
          </div>
        </div>
      </div>
    )
  }

  const displayPhoto = useGooglePhoto && firebaseUser?.photoURL ? firebaseUser.photoURL : profilePhoto
  const userName = user?.name || firebaseUser?.displayName || ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-lg bg-gradient-to-br from-gray-900 to-black border-gray-800 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg opacity-20 blur-sm"></div>
          <div className="relative bg-gray-900/90 rounded-lg backdrop-blur-xl">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-60"></div>
                  <div className="relative bg-black rounded-full p-4">
                    <Sparkles className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="relative mb-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Complete Your Profile
                </CardTitle>
              </div>
              <CardDescription className="text-gray-400 text-base leading-relaxed">
                Let's set up your profile to get you started with QRollCall
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8 px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Profile Photo Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <Label className="text-gray-300 text-lg font-semibold">Profile Photo</Label>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-6">
                    {/* Photo Display */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                      <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-gray-700/50 shadow-2xl">
                          <AvatarImage src={displayPhoto || "/placeholder.svg"} alt="Profile" className="object-cover" />
                          <AvatarFallback className="text-2xl bg-gradient-to-br from-gray-800 to-black text-gray-300 border-2 border-gray-700">
                            <UserCircle className="w-12 h-12" />
                          </AvatarFallback>
                        </Avatar>
                        {useGooglePhoto && firebaseUser?.photoURL && (
                          <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Google
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Photo Options */}
                    <div className="flex flex-col space-y-3 w-full">
                      {firebaseUser?.photoURL && (
                        <Button
                          type="button"
                          variant={useGooglePhoto ? "default" : "outline"}
                          size="lg"
                          onClick={handleUseGooglePhoto}
                          className={useGooglePhoto 
                            ? "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg transition-all duration-300" 
                            : "w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-all duration-300"
                          }
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Use Google Photo
                        </Button>
                      )}
                      
                      <div className="relative">
                        <ImageUpload
                          onUpload={handlePhotoUpload}
                          currentImage={!useGooglePhoto ? profilePhoto : ""}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student ID Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-blue-400" />
                      <Label htmlFor="studentId" className="text-gray-300 text-lg font-semibold">
                        Student ID
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateStudentId}
                      disabled={loading || generatingId || !user?.name || !user?.university}
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    >
                      {generatingId ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent"></div>
                          <span className="text-xs">Generating...</span>
                        </div>
                      ) : (
                        <span className="text-xs">Generate ID</span>
                      )}
                    </Button>
                  </div>
                  <div className="relative group">
                    <Input
                      id="studentId"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Auto-generated or enter manually (e.g., VIP001)"
                      required
                      disabled={loading || generatingId}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-14 text-lg px-4 transition-all duration-300 hover:bg-gray-800/70 group-focus-within:border-blue-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-md pointer-events-none opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Student ID will be auto-generated based on your name and registration order
                  </p>
                </div>

                {/* Roll Number Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Hash className="w-5 h-5 text-blue-400" />
                    <Label htmlFor="rollNumber" className="text-gray-300 text-lg font-semibold">
                      Roll Number
                    </Label>
                  </div>
                  <div className="relative group">
                    <Input
                      id="rollNumber"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Enter your roll number (e.g., 220310100001)"
                      required
                      disabled={loading}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-14 text-lg px-4 transition-all duration-300 hover:bg-gray-800/70 group-focus-within:border-blue-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-md pointer-events-none opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Roll number must be unique within your university
                  </p>
                </div>

                {/* University Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <School className="w-5 h-5 text-blue-400" />
                    <Label htmlFor="university" className="text-gray-300 text-lg font-semibold">
                      University
                    </Label>
                  </div>
                  <div className="relative group">
                    <Input
                      id="university"
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="Enter your university name (e.g., GLA University)"
                      required
                      disabled={loading}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 h-14 text-lg px-4 transition-all duration-300 hover:bg-gray-800/70 group-focus-within:border-blue-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-md pointer-events-none opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"></div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold text-lg border-0 shadow-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Completing Profile...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5" />
                      <span>Complete Profile</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* Welcome Message */}
              <div className="text-center pt-4 border-t border-gray-700/50">
                <p className="text-gray-400 text-sm">
                  Welcome to <span className="text-blue-400 font-semibold">QRollCall</span>, {userName.split(' ')[0] || 'there'}! 👋
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Complete your profile to access all features
                </p>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
