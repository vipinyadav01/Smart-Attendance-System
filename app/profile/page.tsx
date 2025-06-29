"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  School,
  BadgeIcon as IdCard,
  Shield,
  Calendar,
  Camera,
  Save,
  Lock,
  AlertCircle,
  CheckCircle,
  Edit3,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileFormData {
  name: string
  email: string
  rollNumber: string
  studentId: string
  university: string
  bio: string
  profilePhoto: string
}

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, firebaseUser, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    rollNumber: "",
    studentId: "",
    university: "",
    bio: "",
    profilePhoto: "",
  })

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!firebaseUser) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        rollNumber: user.rollNumber || "",
        studentId: user.studentId || "",
        university: user.university || "",
        bio: "", // We'll add bio to the User type later
        profilePhoto: user.profilePhoto || "",
      })
      setLoading(false)
    }
  }, [user, firebaseUser, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (user?.role === "student") {
      if (!formData.rollNumber.trim()) {
        newErrors.rollNumber = "Roll number is required"
      }
      if (!formData.studentId.trim()) {
        newErrors.studentId = "Student ID is required"
      }
    }

    if (!formData.university.trim()) {
      newErrors.university = "University is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePassword = () => {
    const newErrors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required"
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required"
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters"
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateForm() || !user || !firebaseUser) return

    setSaving(true)
    try {
      // Update Firestore document
      const userRef = doc(db, "users", user.id)
      await updateDoc(userRef, {
        name: formData.name,
        rollNumber: formData.rollNumber,
        studentId: formData.studentId,
        university: formData.university,
        profilePhoto: formData.profilePhoto,
        updatedAt: new Date(),
      })

      // Update email if changed
      if (formData.email !== user.email) {
        await updateEmail(firebaseUser, formData.email)
        await updateDoc(userRef, {
          email: formData.email,
        })
      }

      await refreshUser()
      setEditMode(false)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePassword() || !firebaseUser) return

    setChangingPassword(true)
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(firebaseUser.email!, passwordData.currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential)

      // Update password
      await updatePassword(firebaseUser, passwordData.newPassword)

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      setShowPasswordForm(false)

      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      })
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleImageUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, profilePhoto: url }))
  }

  const getProfileCompletionPercentage = () => {
    if (!user) return 0

    const fields = [
      user.name,
      user.email,
      user.university,
      user.profilePhoto,
      ...(user.role === "student" ? [user.rollNumber, user.studentId] : []),
    ]

    const completedFields = fields.filter((field) => field && field.trim()).length
    return Math.round((completedFields / fields.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gradient-to-r from-violet-900/30 to-cyan-900/30 rounded-xl w-3/4 mx-auto"></div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="h-64 bg-slate-800/50 rounded-xl"></div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-slate-800/50 rounded-xl"></div>
                <div className="h-32 bg-slate-800/50 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md bg-red-500/10 border-red-500/20 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            Unable to load profile. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const completionPercentage = getProfileCompletionPercentage()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-10 w-10 p-0 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                 User Profile 
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-2">
                Manage your account settings and preferences
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                className={user.isApproved 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"}
              >
                {user.isApproved ? "Approved" : "Pending Approval"}
              </Badge>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 capitalize">
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Profile Completion Alert */}
        {completionPercentage < 100 && (
          <Alert className="bg-amber-500/10 border-amber-500/20 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              Your profile is {completionPercentage}% complete. Complete your profile to access all features.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Photo & Basic Info */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-400" />
                  Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-full blur-xl"></div>
                    <Avatar className="relative h-24 w-24 sm:h-32 sm:w-32 border-2 border-slate-700">
                      <AvatarImage src={formData.profilePhoto || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback className="text-xl sm:text-2xl bg-slate-800 text-slate-300">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {editMode && (
                    <ImageUpload onUpload={handleImageUpload} currentImage={formData.profilePhoto} className="w-full" />
                  )}
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <User className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <span className="font-medium text-white truncate">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Mail className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    <span className="text-slate-300 truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <School className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 truncate">{user.university}</span>
                  </div>
                  {user.role === "student" && (
                    <>
                      <div className="flex items-center gap-3 text-sm sm:text-base">
                        <IdCard className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="text-slate-300 truncate">{user.rollNumber}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm sm:text-base">
                        <IdCard className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="text-slate-300 truncate">{user.studentId}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400">
                      Joined{" "}
                      {new Date(
                        typeof user.createdAt === 'object' && user.createdAt && 'toDate' in user.createdAt 
                          ? user.createdAt.toDate() 
                          : user.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-violet-400" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm sm:text-base mt-2">
                      Update your personal details and contact information
                    </CardDescription>
                  </div>
                  <Button
                    variant={editMode ? "outline" : "default"}
                    className={editMode 
                      ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto" 
                      : "bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white w-full sm:w-auto"}
                    onClick={() => {
                      if (editMode) {
                        setEditMode(false)
                        setErrors({})
                        // Reset form data
                        setFormData({
                          name: user.name || "",
                          email: user.email || "",
                          rollNumber: user.rollNumber || "",
                          studentId: user.studentId || "",
                          university: user.university || "",
                          bio: "",
                          profilePhoto: user.profilePhoto || "",
                        })
                      } else {
                        setEditMode(true)
                      }
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {editMode ? "Cancel" : "Edit"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 text-sm sm:text-base">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      disabled={!editMode}
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400",
                        editMode && "focus:border-cyan-500 focus:ring-cyan-500/20",
                        errors.name && "border-red-500"
                      )}
                    />
                    {errors.name && <p className="text-sm text-red-400">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300 text-sm sm:text-base">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      disabled={!editMode}
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400",
                        editMode && "focus:border-cyan-500 focus:ring-cyan-500/20",
                        errors.email && "border-red-500"
                      )}
                    />
                    {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="university" className="text-slate-300 text-sm sm:text-base">University</Label>
                    <Input
                      id="university"
                      value={formData.university}
                      onChange={(e) => setFormData((prev) => ({ ...prev, university: e.target.value }))}
                      disabled={!editMode}
                      className={cn(
                        "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400",
                        editMode && "focus:border-cyan-500 focus:ring-cyan-500/20",
                        errors.university && "border-red-500"
                      )}
                    />
                    {errors.university && <p className="text-sm text-red-400">{errors.university}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm sm:text-base">Role</Label>
                    <div className="flex items-center gap-3 h-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 capitalize">
                        {user.role}
                      </Badge>
                    </div>
                  </div>

                  {user.role === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="rollNumber" className="text-slate-300 text-sm sm:text-base">Roll Number</Label>
                        <Input
                          id="rollNumber"
                          value={formData.rollNumber}
                          onChange={(e) => setFormData((prev) => ({ ...prev, rollNumber: e.target.value }))}
                          disabled={!editMode}
                          className={cn(
                            "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400",
                            editMode && "focus:border-cyan-500 focus:ring-cyan-500/20",
                            errors.rollNumber && "border-red-500"
                          )}
                        />
                        {errors.rollNumber && <p className="text-sm text-red-400">{errors.rollNumber}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="studentId" className="text-slate-300 text-sm sm:text-base">Student ID</Label>
                        <Input
                          id="studentId"
                          value={formData.studentId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, studentId: e.target.value }))}
                          disabled={!editMode}
                          className={cn(
                            "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400",
                            editMode && "focus:border-cyan-500 focus:ring-cyan-500/20",
                            errors.studentId && "border-red-500"
                          )}
                        />
                        {errors.studentId && <p className="text-sm text-red-400">{errors.studentId}</p>}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-slate-300 text-sm sm:text-base">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                    disabled={!editMode}
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                    className={cn(
                      "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 resize-none",
                      editMode && "focus:border-cyan-500 focus:ring-cyan-500/20"
                    )}
                  />
                </div>

                {editMode && (
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saving}
                      className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white h-11"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
                  <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                  Security Settings
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base mt-2">
                  Manage your account security and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-700 rounded-xl bg-slate-800/30">
                  <div>
                    <h4 className="font-medium text-white text-sm sm:text-base">Password</h4>
                    <p className="text-xs sm:text-sm text-slate-400">Last updated: Never</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto"
                  >
                    Change Password
                  </Button>
                </div>

                {showPasswordForm && (
                  <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 border border-slate-700 rounded-xl bg-slate-800/50 backdrop-blur-sm">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-slate-300 text-sm sm:text-base">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        className={cn(
                          "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20",
                          errors.currentPassword && "border-red-500"
                        )}
                      />
                      {errors.currentPassword && <p className="text-sm text-red-400">{errors.currentPassword}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-slate-300 text-sm sm:text-base">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className={cn(
                          "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20",
                          errors.newPassword && "border-red-500"
                        )}
                      />
                      {errors.newPassword && <p className="text-sm text-red-400">{errors.newPassword}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-300 text-sm sm:text-base">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className={cn(
                          "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20",
                          errors.confirmPassword && "border-red-500"
                        )}
                      />
                      {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleChangePassword} 
                        disabled={changingPassword}
                        className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white h-11"
                      >
                        {changingPassword ? "Changing..." : "Change Password"}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-11"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          })
                          setErrors({})
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-700 rounded-xl bg-slate-800/30">
                  <div>
                    <h4 className="font-medium text-white text-sm sm:text-base">Account Status</h4>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Your account is {user.isApproved ? "approved and active" : "pending approval"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.isApproved ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    )}
                    <Badge 
                      className={user.isApproved 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"}
                    >
                      {user.isApproved ? "Active" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
