"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Mail, CheckCircle, ArrowLeft } from "lucide-react"

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (user.isApproved) {
      if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/student/dashboard")
      }
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-full blur-xl"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-amber-400"></div>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 py-6 sm:py-8">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-full blur-xl"></div>
              <Clock className="relative h-8 w-8 sm:h-10 sm:w-10 text-amber-400" />
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-red-600/20 blur-3xl"></div>
              <CardTitle className="relative text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                Approval Pending
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Your account is waiting for administrator approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8">
            <Alert className="bg-cyan-500/10 border-cyan-500/20 backdrop-blur-sm">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              <AlertDescription className="text-cyan-200 text-sm sm:text-base leading-relaxed">
                We've received your registration request. An administrator will review and approve your account shortly.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
                <h3 className="font-medium text-white mb-3 sm:mb-4 text-base sm:text-lg">Account Details</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span className="font-medium text-slate-300 min-w-0 w-20 sm:w-24">Name:</span>
                    <span className="text-white truncate">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span className="font-medium text-slate-300 min-w-0 w-20 sm:w-24">Email:</span>
                    <span className="text-white truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span className="font-medium text-slate-300 min-w-0 w-20 sm:w-24">Roll No:</span>
                    <span className="text-white truncate">{user.rollNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm sm:text-base">
                    <span className="font-medium text-slate-300 min-w-0 w-20 sm:w-24">University:</span>
                    <span className="text-white truncate">{user.university}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/20 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-medium text-emerald-300 mb-2 sm:mb-3 text-base sm:text-lg">What happens next?</h4>
                    <ul className="space-y-1 sm:space-y-2 text-sm sm:text-base text-emerald-100">
                      <li>• Administrator reviews your registration</li>
                      <li>• You'll receive an email notification</li>
                      <li>• Once approved, you can access the system</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-3 sm:space-y-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full h-11 sm:h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium"
              >
                Check Status
              </Button>
              <Button 
                onClick={signOut} 
                variant="ghost" 
                className="w-full h-11 sm:h-12 text-slate-400 hover:bg-slate-800 hover:text-white font-medium"
              >
                Sign Out
              </Button>
            </div>

            <div className="text-center pt-2">
              <p className="text-sm sm:text-base text-slate-400">
                Need help?{" "}
                <a href="mailto:admin@yourdomain.com" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                  Contact Administrator
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
