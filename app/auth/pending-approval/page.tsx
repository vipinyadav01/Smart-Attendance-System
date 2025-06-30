"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Mail, CheckCircle, ArrowLeft, RefreshCw, LogOut, User, Shield, AlertCircle, HelpCircle, Settings, Calendar, MapPin, School, Sparkles, Timer, Hash } from "lucide-react"

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
      <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-gray-800 border-t-orange-500 border-r-red-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-white text-lg font-medium">Checking authentication</p>
            <p className="text-gray-400 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state while user data is loading
  if (firebaseUser && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-gray-800 border-t-orange-500 border-r-red-500"></div>
          </div>
          <div className="space-y-2">
            <p className="text-white text-lg font-medium">Loading your profile</p>
            <p className="text-gray-400 text-sm">Getting latest approval status...</p>
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.name || firebaseUser?.displayName || "User"
  const userEmail = user?.email || firebaseUser?.email || ""

  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 sticky top-0 z-50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-lg opacity-60"></div>
                <div className="relative bg-gray-900 rounded-full p-2">
                  <Timer className="w-6 h-6 text-orange-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Approval Pending</h1>
                <p className="text-sm text-gray-400 hidden sm:block">Waiting for administrator review</p>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Bento Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Mobile Layout (Small Screens) */}
        <div className="lg:hidden space-y-4">
          {/* Hero Card */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-orange-500/30 transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-orange-500/30 shadow-2xl">
                    <AvatarImage src={user?.profilePhoto || firebaseUser?.photoURL || "/placeholder.svg"} alt={userName} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-gray-800 to-black text-gray-300">
                      {userName?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-orange-500 rounded-full border-2 border-black flex items-center justify-center">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{userName}</h2>
                  <p className="text-gray-400">{userEmail}</p>
                </div>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  Awaiting Approval
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Status Alert */}
          <Alert className="bg-blue-500/10 border-blue-500/20 backdrop-blur-sm">
            <Mail className="h-5 w-5 text-blue-400" />
            <AlertDescription className="text-blue-200">
              We've received your registration request. An administrator will review and approve your account shortly.
            </AlertDescription>
          </Alert>

          {/* Account Details */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {user?.university && (
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">University</span>
                    </div>
                    <span className="text-white font-medium">{user.university}</span>
                  </div>
                )}
                {user?.studentId && (
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Student ID</span>
                    </div>
                    <span className="text-white font-medium">{user.studentId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">Role</span>
                  </div>
                  <span className="text-white font-medium capitalize">{user?.role || "Student"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Timeline */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Process Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 shadow-lg shadow-green-500/50"></div>
                  <div>
                    <p className="text-white font-medium text-sm">Registration Submitted</p>
                    <p className="text-green-400 text-xs">Completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse shadow-lg shadow-orange-500/50"></div>
                  <div>
                    <p className="text-white font-medium text-sm">Admin Review</p>
                    <p className="text-orange-400 text-xs">In Progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-400 font-medium text-sm">Account Activation</p>
                    <p className="text-gray-500 text-xs">Pending</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium border-0 shadow-lg transition-all duration-300 group"
            >
              {isRefreshing ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Status...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Check Approval Status</span>
                </div>
              )}
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              variant="outline"
              className="w-full h-12 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 font-medium transition-all duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Help & Support */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <HelpCircle className="h-6 w-6 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">Need Help?</p>
                    <p className="text-purple-200 text-sm">Contact support</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => window.open("mailto:admin@yourdomain.com", "_blank")}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Large Screen Layout (Bento Grid) */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:grid-rows-6 gap-6 h-[calc(100vh-200px)]">
          {/* Hero Section - Takes up large area */}
          <Card className="col-span-5 row-span-4 bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-orange-500/30 transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardContent className="p-8 h-full flex flex-col justify-center items-center text-center space-y-6 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                <Avatar className="relative h-32 w-32 border-4 border-orange-500/30 shadow-2xl">
                  <AvatarImage src={user?.profilePhoto || firebaseUser?.photoURL || "/placeholder.svg"} alt={userName} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-gray-800 to-black text-gray-300">
                    {userName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-orange-500 rounded-full border-4 border-black flex items-center justify-center animate-pulse">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-white">{userName}</h2>
                <p className="text-gray-400 text-lg">{userEmail}</p>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-base px-4 py-2">
                  <Timer className="w-4 h-4 mr-2" />
                  Awaiting Approval
                </Badge>
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-300 text-lg">Welcome to QRollCall!</p>
                <p className="text-gray-500">Your account is being reviewed by our administrators</p>
              </div>
            </CardContent>
          </Card>

          {/* Status Alert */}
          <Card className="col-span-7 row-span-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
            <CardContent className="p-6 h-full flex items-center">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <Mail className="h-8 w-8 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Registration Received</h3>
                  <p className="text-blue-200 text-lg leading-relaxed">
                    We've received your registration request. An administrator will review and approve your account shortly. 
                    You'll receive an email notification once your account is approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="col-span-4 row-span-4 bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-blue-500/30 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3 text-xl">
                <User className="w-6 h-6 text-blue-400" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {user?.university && (
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors group">
                    <div className="flex items-center gap-3">
                      <School className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-gray-400">University</span>
                    </div>
                    <span className="text-white font-medium">{user.university}</span>
                  </div>
                )}
                {user?.studentId && (
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors group">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-gray-400">Student ID</span>
                    </div>
                    <span className="text-white font-medium">{user.studentId}</span>
                  </div>
                )}
                {user?.rollNumber && (
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Hash className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-gray-400">Roll Number</span>
                    </div>
                    <span className="text-white font-medium">{user.rollNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-gray-400">Role</span>
                  </div>
                  <span className="text-white font-medium capitalize">{user?.role || "Student"}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-gray-400">Joined</span>
                  </div>
                  <span className="text-white font-medium">
                    {user?.createdAt ? 
                      (user.createdAt instanceof Date ? 
                        user.createdAt.toLocaleDateString() : 
                        user.createdAt.toDate?.() ? 
                          user.createdAt.toDate().toLocaleDateString() : 
                          "Today"
                      ) : 
                      "Today"
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Timeline */}
          <Card className="col-span-3 row-span-4 bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-green-500/30 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3 text-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Process Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0 shadow-lg shadow-green-500/50"></div>
                  <div>
                    <h4 className="text-white font-medium">Registration Submitted</h4>
                    <p className="text-green-400 text-sm">Completed</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 flex-shrink-0 animate-pulse shadow-lg shadow-orange-500/50"></div>
                  <div>
                    <h4 className="text-white font-medium">Admin Review</h4>
                    <p className="text-orange-400 text-sm">In Progress</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="text-gray-400 font-medium">Email Notification</h4>
                    <p className="text-gray-500 text-sm">Pending</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="text-gray-400 font-medium">Account Activation</h4>
                    <p className="text-gray-500 text-sm">Pending</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-medium text-sm">Estimated Time</span>
                </div>
                <p className="text-green-300 text-sm">1-2 business days</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="col-span-5 row-span-2 bg-gradient-to-br from-gray-900 to-black border-gray-800">
            <CardContent className="p-6 h-full flex items-center space-x-4">
              <Button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium border-0 shadow-lg transition-all duration-300 group text-lg"
              >
                {isRefreshing ? (
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Checking Status...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                    <span>Check Approval Status</span>
                  </div>
                )}
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline"
                className="flex-1 h-14 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 font-medium transition-all duration-300 text-lg"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card className="col-span-7 row-span-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
            <CardContent className="p-6 h-full flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500/20 p-3 rounded-full">
                  <HelpCircle className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Need Help?</h3>
                  <p className="text-purple-200">Contact our support team for assistance</p>
                </div>
              </div>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                onClick={() => window.open("mailto:admin@yourdomain.com", "_blank")}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Admin
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
