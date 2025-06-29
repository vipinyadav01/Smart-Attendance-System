"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./providers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Users, Shield, MapPin, Mail, CheckCircle, Smartphone, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (!user.isApproved) {
        router.push("/auth/pending-approval")
      } else if (user.role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/student/dashboard")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-full blur-xl"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-cyan-400"></div>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-lg blur-lg"></div>
                <QrCode className="relative h-8 w-8 sm:h-10 sm:w-10 text-cyan-400 mr-3" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                AttendanceApp
              </h1>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-9 sm:h-10" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white h-9 sm:h-10" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-slate-900/40 to-cyan-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-cyan-600/10"></div>
        
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-emerald-600/20 blur-3xl"></div>
              <h2 className="relative text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-6 leading-tight">
                Modern Attendance Management
              </h2>
            </div>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 leading-relaxed max-w-3xl mx-auto">
              Streamline attendance tracking with QR codes, geofencing, and real-time analytics. Built for universities
              and educational institutions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white h-12 sm:h-14 text-base sm:text-lg font-medium" asChild>
                <Link href="/auth/signup">
                  <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  Sign Up as Student
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 sm:h-14 text-base sm:text-lg font-medium" asChild>
                <Link href="/auth/signin">
                  <Shield className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  Admin Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-4 sm:mb-6">
              Everything You Need for Attendance Management
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive solution provides all the tools needed for efficient, secure, and accurate attendance
              tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-cyan-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <QrCode className="relative h-12 w-12 sm:h-16 sm:w-16 text-cyan-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">QR Code Scanning</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Quick and contactless attendance marking with time-limited QR codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• 1-minute expiry for security</li>
                  <li>• Duplicate scan prevention</li>
                  <li>• Mobile-friendly interface</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-emerald-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <MapPin className="relative h-12 w-12 sm:h-16 sm:w-16 text-emerald-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">Geofencing</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Location-based verification ensures students are physically present
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• Customizable radius per class</li>
                  <li>• GPS-based verification</li>
                  <li>• Prevents remote attendance</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-violet-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <BarChart3 className="relative h-12 w-12 sm:h-16 sm:w-16 text-violet-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">Analytics Dashboard</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Comprehensive insights and reporting for administrators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• Real-time attendance tracking</li>
                  <li>• CSV export functionality</li>
                  <li>• Low attendance alerts</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-amber-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-red-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <Shield className="relative h-12 w-12 sm:h-16 sm:w-16 text-amber-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">Secure Authentication</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Multi-layer security with admin approval and domain restrictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• College email verification</li>
                  <li>• Admin approval workflow</li>
                  <li>• Google OAuth integration</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-emerald-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <Mail className="relative h-12 w-12 sm:h-16 sm:w-16 text-emerald-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">Email Notifications</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Automated alerts and confirmations keep everyone informed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• Attendance confirmations</li>
                  <li>• Low attendance warnings</li>
                  <li>• Admin notifications</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm text-center group hover:border-cyan-500/30 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <Smartphone className="relative h-12 w-12 sm:h-16 sm:w-16 text-cyan-400 mx-auto" />
                </div>
                <CardTitle className="text-white text-lg sm:text-xl">Mobile Responsive</CardTitle>
                <CardDescription className="text-slate-400 text-sm sm:text-base">
                  Works seamlessly on all devices with optimized mobile experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                  <li>• Progressive Web App</li>
                  <li>• Touch-friendly interface</li>
                  <li>• Offline capability</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 lg:py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4 sm:mb-6">
              How It Works
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto">
              Simple steps to get started with digital attendance
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center group">
              <div className="relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full w-full h-full flex items-center justify-center border border-cyan-500/30">
                  <span className="text-xl sm:text-2xl font-bold text-white">1</span>
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Sign Up & Get Approved</h4>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Register with your college email and wait for admin approval to access the system.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-r from-emerald-600 to-green-600 rounded-full w-full h-full flex items-center justify-center border border-emerald-500/30">
                  <span className="text-xl sm:text-2xl font-bold text-white">2</span>
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Scan QR Code</h4>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Use your mobile device to scan the QR code displayed by your instructor in class.
              </p>
            </div>

            <div className="text-center group">
              <div className="relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-full w-full h-full flex items-center justify-center border border-violet-500/30">
                  <span className="text-xl sm:text-2xl font-bold text-white">3</span>
                </div>
              </div>
              <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">Track Progress</h4>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Monitor your attendance statistics and receive alerts if you fall below requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-900/50 to-cyan-900/30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-cyan-600/20"></div>
        
        <div className="relative max-w-4xl mx-auto text-center px-3 sm:px-4 lg:px-6">
          <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-emerald-600/20 blur-3xl"></div>
            <h3 className="relative text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-4 sm:mb-6">
              Ready to Modernize Your Attendance System?
            </h3>
          </div>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto">
            Join thousands of students and educators already using our platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto">
            <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white h-12 sm:h-14 text-base sm:text-lg font-medium" asChild>
              <Link href="/auth/signup">
                <CheckCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                Get Started Free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 sm:h-14 text-base sm:text-lg font-medium"
              asChild
            >
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 rounded-lg blur-lg"></div>
                  <QrCode className="relative h-6 w-6 sm:h-8 sm:w-8 text-cyan-400 mr-2 sm:mr-3" />
                </div>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  AttendanceApp
                </span>
              </div>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Modern attendance management for educational institutions.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 sm:mb-6 text-white">Features</h4>
              <ul className="space-y-2 sm:space-y-3 text-slate-400 text-sm sm:text-base">
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">QR Code Scanning</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Geofencing</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Analytics Dashboard</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Email Notifications</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 sm:mb-6 text-white">Support</h4>
              <ul className="space-y-2 sm:space-y-3 text-slate-400 text-sm sm:text-base">
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Documentation</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Contact Support</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">System Status</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 sm:mb-6 text-white">Security</h4>
              <ul className="space-y-2 sm:space-y-3 text-slate-400 text-sm sm:text-base">
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Data Protection</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Terms of Service</li>
                <li className="hover:text-cyan-400 transition-colors cursor-pointer">Security Features</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 sm:mt-12 pt-8 text-center text-slate-400">
            <p className="text-sm sm:text-base">&copy; 2024 AttendanceApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
