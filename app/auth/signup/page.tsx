"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db, googleProvider } from "@/lib/firebase"
import { z } from "zod"

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  rollNumber: z.string().min(1, "Roll number is required"),
  university: z.string().min(1, "University is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type SignUpInput = z.infer<typeof signUpSchema>
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { isEmailFromAllowedDomain, getFormattedDomainList, getDomainValidationMessage } from "@/lib/domain-utils"
import { toast } from "@/hooks/use-toast"

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  const onSubmit = async (data: SignUpInput) => {
    setLoading(true)
    setError("")

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        id: userCredential.user.uid,
        email: data.email,
        name: data.name,
        rollNumber: data.rollNumber,
        university: data.university,
        role: "student",
        isApproved: false, // Requires admin approval
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      toast({
        title: "Account Created",
        description: "Your account has been created and is pending approval",
      })

      router.push("/auth/pending-approval")
    } catch (error: any) {
      console.error("Signup error:", error)
      let errorMessage = "Failed to create account"

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists"
          break
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please use at least 8 characters"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled"
          break
        default:
          errorMessage = error.message || "Failed to create account"
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      // Sign up with Google using Firebase
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      console.log("Google sign-up successful:", user.email)

      // Check if email domain is allowed
      if (!isEmailFromAllowedDomain(user.email || "")) {
        await auth.signOut()
        setError(getDomainValidationMessage())
        return
      }

      // Check if user already exists
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (userDoc.exists()) {
        // User already exists, redirect to appropriate page
        const userData = userDoc.data()

        if (!userData.isApproved) {
          router.push("/auth/pending-approval")
        } else if (!userData.rollNumber || !userData.university) {
          router.push("/auth/complete-profile")
        } else if (userData.role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/student/dashboard")
        }
        return
      }

      // Create new user document
      const newUserData = {
        id: user.uid,
        email: user.email,
        name: user.displayName || "",
        rollNumber: "", // Will be completed in next step
        university: "", // Will be completed in next step
        profilePhoto: user.photoURL || "",
        role: "student",
        isApproved: false, // Requires admin approval
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await setDoc(doc(db, "users", user.uid), newUserData)

      toast({
        title: "Account Created",
        description: "Please complete your profile information",
      })

      router.push("/auth/complete-profile")
    } catch (error: any) {
      console.error("Google signup error:", error)
      let errorMessage = "Failed to sign up with Google"

      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Sign-up cancelled"
          break
        case "auth/popup-blocked":
          errorMessage = "Popup blocked. Please allow popups and try again"
          break
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-up cancelled"
          break
        case "auth/account-exists-with-different-credential":
          errorMessage = "An account already exists with this email using a different sign-in method"
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection"
          break
        default:
          errorMessage = error.message || "Failed to sign up with Google"
      }

      setError(errorMessage)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="space-y-4 sm:space-y-6 pb-6">
            <div className="text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-emerald-600/20 blur-3xl"></div>
                <CardTitle className="relative text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Create Account
                </CardTitle>
              </div>
              <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Sign up with your college email to get started
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-slate-300 text-sm sm:text-base font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  {...register("name")}
                  disabled={loading || googleLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-11 sm:h-12 text-base"
                />
                {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-slate-300 text-sm sm:text-base font-medium">
                  College Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={`your.email@${getFormattedDomainList()}`}
                  {...register("email")}
                  disabled={loading || googleLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-11 sm:h-12 text-base"
                />
                {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <Label htmlFor="rollNumber" className="text-slate-300 text-sm sm:text-base font-medium">
                    Roll Number
                  </Label>
                  <Input
                    id="rollNumber"
                    type="text"
                    placeholder="Enter your roll number"
                    {...register("rollNumber")}
                    disabled={loading || googleLoading}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-11 sm:h-12 text-base"
                  />
                  {errors.rollNumber && <p className="text-sm text-red-400">{errors.rollNumber.message}</p>}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="university" className="text-slate-300 text-sm sm:text-base font-medium">
                    University
                  </Label>
                  <Input
                    id="university"
                    type="text"
                    placeholder="GLA University"
                    {...register("university")}
                    disabled={loading || googleLoading}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-11 sm:h-12 text-base"
                  />
                  {errors.university && <p className="text-sm text-red-400">{errors.university.message}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-slate-300 text-sm sm:text-base font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    {...register("password")}
                    disabled={loading || googleLoading}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-11 sm:h-12 text-base pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || googleLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium text-base disabled:opacity-50" 
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4 sm:mt-6 h-11 sm:h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium"
                onClick={handleGoogleSignUp}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-sm sm:text-base text-slate-400">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
