"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./providers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Users, Shield, MapPin, Mail, CheckCircle, Smartphone, BarChart3, Sparkles, Zap, Star } from "lucide-react"
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
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 gradient-cyber rounded-full blur-xl animate-pulse"></div>
            <div className="relative loading-spinner mx-auto"></div>
            <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-pulse-ring"></div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-300 font-medium">Loading QRollCall</p>
            <div className="loading-dots text-cyan-400">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-slate-900/40 to-cyan-900/20 animate-gradient"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="flex items-center animate-slide-up">
              <div className="relative animate-float">
                <div className="absolute inset-0 gradient-cyber rounded-lg blur-lg"></div>
                <QrCode className="relative h-8 w-8 sm:h-10 sm:w-10 text-white shadow-neon" />
              </div>
              <h1 className="ml-3 text-xl sm:text-2xl font-bold text-gradient">
                QRollCall
              </h1>
              <div className="ml-2 px-2 py-1 glass-card rounded-md">
                <Sparkles className="h-3 w-3 text-cyan-400 animate-glow" />
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Button variant="outline" className="glass-button h-9 sm:h-10" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button className="btn-modern h-9 sm:h-10" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="animate-bounce-in mb-8">
              <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-6">
                <Star className="h-4 w-4 text-yellow-400 animate-glow" />
                <span className="text-sm font-medium text-slate-300">Modern Attendance System</span>
                <Zap className="h-4 w-4 text-cyan-400 animate-glow" />
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="text-gradient animate-shimmer">Smart Attendance</span>
                <br />
                <span className="text-white">Made Simple</span>
              </h2>
            </div>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 leading-relaxed max-w-3xl mx-auto animate-slide-up" style={{animationDelay: '0.3s'}}>
              Streamline attendance tracking with QR codes, geofencing, and real-time analytics. 
              Built for universities and educational institutions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto animate-slide-up" style={{animationDelay: '0.5s'}}>
              <Button size="lg" className="btn-modern h-12 sm:h-14 text-base sm:text-lg font-medium group" asChild>
                <Link href="/auth/signup">
                  <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-bounce" />
                  Sign Up as Student
                </Link>
              </Button>
              <Button size="lg" className="glass-button h-12 sm:h-14 text-base sm:text-lg font-medium group" asChild>
                <Link href="/auth/signin">
                  <Shield className="mr-2 h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-pulse" />
                  Admin Login
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center mb-12 sm:mb-16 animate-slide-up">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient mb-4 sm:mb-6">
              Everything You Need for Attendance Management
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Our comprehensive solution provides all the tools needed for efficient, secure, and accurate attendance tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: QrCode,
                title: "QR Code Scanning",
                description: "Quick and contactless attendance marking with time-limited QR codes",
                features: ["1-minute expiry for security", "Duplicate scan prevention", "Mobile-friendly interface"],
                gradient: "gradient-cyber",
                delay: "0s"
              },
              {
                icon: MapPin,
                title: "Geofencing",
                description: "Location-based verification ensures students are physically present",
                features: ["Customizable radius per class", "GPS-based verification", "Prevents remote attendance"],
                gradient: "gradient-success",
                delay: "0.1s"
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Comprehensive insights and reporting for administrators",
                features: ["Real-time attendance tracking", "CSV export functionality", "Low attendance alerts"],
                gradient: "gradient-primary",
                delay: "0.2s"
              },
              {
                icon: Shield,
                title: "Secure Authentication",
                description: "Multi-layer security with admin approval and domain restrictions",
                features: ["College email verification", "Admin approval workflow", "Google OAuth integration"],
                gradient: "gradient-warning",
                delay: "0.3s"
              },
              {
                icon: Mail,
                title: "Email Notifications",
                description: "Automated alerts and confirmations keep everyone informed",
                features: ["Attendance confirmations", "Low attendance warnings", "Admin notifications"],
                gradient: "gradient-success",
                delay: "0.4s"
              },
              {
                icon: Smartphone,
                title: "Mobile Responsive",
                description: "Works seamlessly on all devices with optimized mobile experience",
                features: ["Progressive Web App", "Touch-friendly interface", "Offline capability"],
                gradient: "gradient-accent",
                delay: "0.5s"
              }
            ].map((feature, index) => (
              <Card key={index} className="modern-card group animate-slide-up" style={{animationDelay: feature.delay}}>
                <CardHeader className="pb-4">
                  <div className="relative mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 animate-float group-hover:animate-bounce">
                    <div className={`absolute inset-0 ${feature.gradient} rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50`}></div>
                    <div className={`relative w-full h-full ${feature.gradient} rounded-full flex items-center justify-center shadow-glow`}>
                      <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-white text-lg sm:text-xl group-hover:text-gradient transition-all">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm sm:text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm sm:text-base text-slate-300 space-y-2">
                    {feature.features.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 lg:py-24 relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="text-center mb-12 sm:mb-16 animate-slide-up">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient mb-4 sm:mb-6">
              How It Works
            </h3>
            <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto">
              Simple steps to get started with digital attendance
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: "1",
                title: "Sign Up & Get Approved",
                description: "Register with your college email and wait for admin approval to access the system.",
                gradient: "gradient-cyber"
              },
              {
                step: "2", 
                title: "Scan QR Code",
                description: "Use your mobile device to scan the QR code displayed by your instructor in class.",
                gradient: "gradient-success"
              },
              {
                step: "3",
                title: "Track Progress", 
                description: "Monitor your attendance statistics and receive alerts if you fall below requirements.",
                gradient: "gradient-primary"
              }
            ].map((step, index) => (
              <div key={index} className="text-center group animate-slide-up" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20 animate-float group-hover:animate-bounce">
                  <div className={`absolute inset-0 ${step.gradient} rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50`}></div>
                  <div className={`relative ${step.gradient} rounded-full w-full h-full flex items-center justify-center shadow-glow border border-white/20`}>
                    <span className="text-xl sm:text-2xl font-bold text-white">{step.step}</span>
                  </div>
                </div>
                <h4 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white group-hover:text-gradient transition-all">{step.title}</h4>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 gradient-primary opacity-5"></div>
        
        <div className="relative max-w-4xl mx-auto text-center px-3 sm:px-4 lg:px-6">
          <div className="animate-bounce-in mb-6 sm:mb-8">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient mb-4 sm:mb-6">
              Ready to Modernize Your Attendance System?
            </h3>
          </div>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-12 leading-relaxed max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.2s'}}>
            Join thousands of students and educators already using our platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-md sm:max-w-none mx-auto animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Button size="lg" className="btn-modern h-12 sm:h-14 text-base sm:text-lg font-medium group" asChild>
              <Link href="/auth/signup">
                <CheckCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-spin" />
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" className="glass-button h-12 sm:h-14 text-base sm:text-lg font-medium" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="glass-header text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
            <div className="sm:col-span-2 lg:col-span-1 animate-slide-up">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="relative animate-float">
                  <div className="absolute inset-0 gradient-cyber rounded-lg blur-lg"></div>
                  <QrCode className="relative h-6 w-6 sm:h-8 sm:w-8 text-white mr-2 sm:mr-3" />
                </div>
                <span className="text-lg sm:text-xl font-bold text-gradient">
                  QRollCall
                </span>
              </div>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Modern attendance management for educational institutions worldwide.
              </p>
            </div>

            {[
              {
                title: "Features",
                items: ["QR Code Scanning", "Geofencing", "Analytics Dashboard", "Email Notifications"]
              },
              {
                title: "Support", 
                items: ["Documentation", "Help Center", "Contact Support", "System Status"]
              },
              {
                title: "Security",
                items: ["Data Protection", "Privacy Policy", "Terms of Service", "Security Features"]
              }
            ].map((section, index) => (
              <div key={index} className="animate-slide-up" style={{animationDelay: `${(index + 1) * 0.1}s`}}>
                <h4 className="text-lg font-semibold mb-4 sm:mb-6 text-white">{section.title}</h4>
                <ul className="space-y-2 sm:space-y-3 text-slate-400 text-sm sm:text-base">
                  {section.items.map((item, i) => (
                    <li key={i} className="hover:text-cyan-400 transition-colors cursor-pointer nav-item">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 mt-8 sm:mt-12 pt-8 text-center text-slate-400 animate-slide-up" style={{animationDelay: '0.6s'}}>
            <p className="text-sm sm:text-base">
              &copy; 2024 QRollCall. All rights reserved. 
              <span className="ml-2 text-gradient">Built with ❤️ for education</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
