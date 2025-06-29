"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db, googleProvider } from "@/lib/firebase"
import { z } from "zod"

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type SignInInput = z.infer<typeof signInSchema>
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from "next/link"
import { isEmailFromAllowedDomain, getFormattedDomainList, getDomainValidationMessage } from "@/lib/domain-utils"
import { toast } from "@/hooks/use-toast"

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data: SignInInput) => {
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password)

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()

        if (!userData.isApproved) {
          router.push("/auth/pending-approval")
          return
        }

        // Redirect based on role
        if (userData.role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/student/dashboard")
        }
      } else {
        setError("User profile not found. Please contact administrator.")
      }
    } catch (error: any) {
      console.error("Signin error:", error)
      let errorMessage = "Failed to sign in"

      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address"
          break
        case "auth/wrong-password":
          errorMessage = "Incorrect password"
          break
        case "auth/invalid-email":
          errorMessage = "Invalid email address"
          break
        case "auth/user-disabled":
          errorMessage = "This account has been disabled"
          break
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later"
          break
        default:
          errorMessage = error.message || "Failed to sign in"
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError("")

    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      console.log("Google sign-in successful:", user.email)

      // Check if email domain is allowed
      if (!isEmailFromAllowedDomain(user.email || "")) {
        await auth.signOut()
        setError(getDomainValidationMessage())
        return
      }

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid))

      if (!userDoc.exists()) {
        // Create new user document for first-time Google users
        const newUserData = {
          id: user.uid,
          email: user.email,
          name: user.displayName || "",
          rollNumber: "", // Will need to be updated in profile completion
          university: "", // Will need to be updated in profile completion
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
      } else {
        const userData = userDoc.data()

        // Update profile photo if it has changed
        if (user.photoURL && user.photoURL !== userData.profilePhoto) {
          await setDoc(
            doc(db, "users", user.uid),
            {
              ...userData,
              profilePhoto: user.photoURL,
              updatedAt: new Date(),
            },
            { merge: true },
          )
        }

        if (!userData.isApproved) {
          router.push("/auth/pending-approval")
          return
        }

        // Check if profile is complete
        if (!userData.rollNumber || !userData.university) {
          router.push("/auth/complete-profile")
          return
        }

        // Redirect based on role
        if (userData.role === "admin") {
          router.push("/admin/dashboard")
        } else {
          router.push("/student/dashboard")
        }
      }
    } catch (error: any) {
      console.error("Google signin error:", error)
      let errorMessage = "Failed to sign in with Google"

      switch (error.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Sign-in cancelled"
          break
        case "auth/popup-blocked":
          errorMessage = "Popup blocked. Please allow popups and try again"
          break
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-in cancelled"
          break
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your connection"
          break
        default:
          errorMessage = error.message || "Failed to sign in with Google"
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
                  Welcome Back
                </CardTitle>
              </div>
              <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Sign in to your account to continue
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-slate-300 text-sm sm:text-base font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={`your.email@${getFormattedDomainList()}`}
                  {...register("email")}
                  disabled={loading || googleLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-12 text-base"
                />
                {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-slate-300 text-sm sm:text-base font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    disabled={loading || googleLoading}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 h-12 text-base pr-12"
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
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium text-base disabled:opacity-50" 
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
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
                className="w-full mt-4 sm:mt-6 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
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
                Don't have an account?{" "}
                <Link href="/auth/signup" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
