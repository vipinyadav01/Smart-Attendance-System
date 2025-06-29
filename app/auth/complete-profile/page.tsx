"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
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
import { validateStudentId } from "@/lib/validations"

export default function CompleteProfilePage() {
  const { user, firebaseUser, refreshUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [profilePhoto, setProfilePhoto] = useState("")
  const [useGooglePhoto, setUseGooglePhoto] = useState(true)

  useEffect(() => {
    if (!firebaseUser) {
      router.push("/auth/signin")
      return
    }

    if (user?.profileComplete) {
      router.push(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard")
      return
    }

    // Set initial profile photo preference
    if (firebaseUser.photoURL) {
      setProfilePhoto(firebaseUser.photoURL)
      setUseGooglePhoto(true)
    }
  }, [user, firebaseUser, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser || !user) return

    setLoading(true)

    try {
      // Validate student ID
      const validation = validateStudentId(studentId)
      if (!validation.isValid) {
        toast({
          title: "Invalid Student ID",
          description: validation.error,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Determine final profile photo
      const finalProfilePhoto = useGooglePhoto && firebaseUser.photoURL 
        ? firebaseUser.photoURL 
        : profilePhoto

      // Update user document
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        studentId: studentId.trim(),
        profilePhoto: finalProfilePhoto,
        profileComplete: true,
        updatedAt: new Date(),
      })

      // Refresh user data
      await refreshUser()

      toast({
        title: "Profile completed successfully!",
        description: "You can now access the system.",
      })

      // Redirect based on role
      router.push(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard")
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

  if (!user || !firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-full blur-xl"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-cyan-400"></div>
          </div>
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  const displayPhoto = useGooglePhoto && firebaseUser.photoURL 
    ? firebaseUser.photoURL 
    : profilePhoto

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-emerald-600/20 blur-3xl"></div>
              <CardTitle className="relative text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Complete Your Profile
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Please provide your student ID and profile photo to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Profile Photo Section */}
              <div className="space-y-4 sm:space-y-6">
                <Label className="text-slate-300 text-base sm:text-lg font-medium">Profile Photo</Label>
                
                {/* Current Photo Display */}
                <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-full blur-xl"></div>
                    <Avatar className="relative h-24 w-24 sm:h-32 sm:w-32 border-2 border-slate-700">
                      <AvatarImage src={displayPhoto || "/placeholder.svg"} alt="Profile" />
                      <AvatarFallback className="text-lg sm:text-xl bg-slate-800 text-slate-300">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {useGooglePhoto && firebaseUser.photoURL && (
                      <Badge 
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      >
                        Google
                      </Badge>
                    )}
                  </div>

                  {/* Photo Options */}
                  <div className="flex flex-col space-y-3 w-full">
                    {firebaseUser.photoURL && (
                      <Button
                        type="button"
                        variant={useGooglePhoto ? "default" : "outline"}
                        size="sm"
                        onClick={handleUseGooglePhoto}
                        className={useGooglePhoto 
                          ? "w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white h-10" 
                          : "w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-10"}
                      >
                        Use Google Photo
                      </Button>
                    )}
                    
                    <div className="w-full">
                      <ImageUpload
                        onUpload={handlePhotoUpload}
                        currentImage={!useGooglePhoto ? profilePhoto : ""}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Student ID */}
              <div className="space-y-3">
                <Label htmlFor="studentId" className="text-slate-300 text-base sm:text-lg font-medium">
                  Student ID
                </Label>
                <Input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter your student ID"
                  required
                  disabled={loading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-12 text-base"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium text-base disabled:opacity-50" 
                disabled={loading}
              >
                {loading ? "Completing Profile..." : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
