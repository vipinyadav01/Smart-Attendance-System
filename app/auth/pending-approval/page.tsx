"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Mail, CheckCircle, ArrowLeft, RefreshCw, LogOut, User } from "lucide-react"

export default function PendingApprovalPage() {
  const { user, firebaseUser, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) return

    // Redirect if not authenticated
    if (!firebaseUser) {
      router.push("/auth/signin")
      return
    }

    // Redirect if already approved
    if (user?.isApproved) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/student/dashboard")
      }
    }
  }, [user, firebaseUser, authLoading, router])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Force a page reload to check latest approval status
      window.location.reload()
    } catch (error) {
      console.error("Error refreshing status:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-slate-800 border-t-amber-500 border-r-orange-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-300 text-lg font-medium">Checking authentication</p>
            <p className="text-slate-500 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state while user data is loading
  if (firebaseUser && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-slate-800 border-t-amber-500 border-r-orange-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-300 text-lg font-medium">Loading your profile</p>
            <p className="text-slate-500 text-sm">Getting latest approval status...</p>
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.name || firebaseUser?.displayName || "User"
  const userEmail = user?.email || firebaseUser?.email || ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          {/* Gradient Border Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-lg opacity-20 blur-sm"></div>
          <div className="relative bg-slate-900/90 rounded-lg">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full blur-xl opacity-60"></div>
                  <div className="relative bg-slate-900 rounded-full p-4">
                    <Clock className="w-10 h-10 text-amber-400" />
                  </div>
                </div>
              </div>
              <div className="relative mb-4">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                  Approval Pending
                </CardTitle>
              </div>
              <CardDescription className="text-slate-400 text-base leading-relaxed">
                Your account is waiting for administrator approval
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-8 pb-8">
              <Alert className="bg-cyan-500/10 border-cyan-500/20 backdrop-blur-sm">
                <Mail className="h-5 w-5 text-cyan-400" />
                <AlertDescription className="text-cyan-200 text-base leading-relaxed">
                  We've received your registration request. An administrator will review and approve your account shortly.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Account Details */}
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white text-lg">Account Details</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-300 min-w-0 w-24">Name:</span>
                      <span className="text-white truncate">{userName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-300 min-w-0 w-24">Email:</span>
                      <span className="text-white truncate">{userEmail}</span>
                    </div>
                    {user?.rollNumber && (
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 min-w-0 w-24">Roll No:</span>
                        <span className="text-white truncate">{user.rollNumber}</span>
                      </div>
                    )}
                    {user?.studentId && (
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 min-w-0 w-24">Student ID:</span>
                        <span className="text-white truncate">{user.studentId}</span>
                      </div>
                    )}
                    {user?.university && (
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 min-w-0 w-24">University:</span>
                        <span className="text-white truncate">{user.university}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-300 min-w-0 w-24">Role:</span>
                      <span className="text-white truncate capitalize">{user?.role || "Student"}</span>
                    </div>
                  </div>
                </div>

                {/* What happens next */}
                <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/20 p-6 rounded-xl backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-emerald-300 mb-3 text-lg">What happens next?</h4>
                      <ul className="space-y-2 text-emerald-100">
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Administrator reviews your registration details</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>You'll receive an email notification upon approval</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Once approved, you can access all system features</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>This process typically takes 1-2 business days</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium border-0 shadow-lg transition-all duration-300"
                >
                  {isRefreshing ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking Status...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Check Approval Status</span>
                    </div>
                  )}
                </Button>
                
                <Button 
                  onClick={handleSignOut} 
                  variant="outline"
                  className="w-full h-12 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 font-medium transition-all duration-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>

              {/* Contact Support */}
              <div className="text-center pt-4 border-t border-slate-700/50">
                <p className="text-slate-400 text-sm mb-2">
                  Need help or have questions?
                </p>
                <a 
                  href="mailto:admin@yourdomain.com" 
                  className="text-amber-400 hover:text-amber-300 transition-colors font-medium text-sm"
                >
                  Contact Administrator
                </a>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
