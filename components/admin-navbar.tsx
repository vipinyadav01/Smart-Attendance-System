"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  QrCode, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Activity,
  User,
  FileText,
  RefreshCw
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/app/providers"

interface AdminNavbarProps {
  currentPage?: string
  onRefresh?: () => void
  refreshing?: boolean
  pendingApprovals?: number
}

export default function AdminNavbar({ 
  currentPage = "Dashboard", 
  onRefresh, 
  refreshing = false,
  pendingApprovals = 0 
}: AdminNavbarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: Activity,
      current: currentPage === "Dashboard"
    },
    {
      name: "Students",
      href: "/admin/students",
      icon: Users,
      current: currentPage === "Students",
      badge: pendingApprovals > 0 ? pendingApprovals : undefined
    },
    {
      name: "Classes",
      href: "/admin/classes",
      icon: Calendar,
      current: currentPage === "Classes"
    },
    {
      name: "Generate QR",
      href: "/admin/generate-qr",
      icon: QrCode,
      current: currentPage === "Generate QR"
    },
    {
      name: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
      current: currentPage === "Reports"
    },
    {
      name: "Profile",
      href: "/admin/profile",
      icon: User,
      current: currentPage === "Profile"
    }
  ]

  return (
    <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left - Title and Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {currentPage}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 inline" />
                Admin Control Panel
              </p>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      item.current
                        ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                    {item.badge && (
                      <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right - User Info and Actions */}
          <div className="flex items-center gap-4">
            {/* Desktop User Info */}
            <div className="hidden lg:flex items-center gap-4 bg-white/5 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10 shadow-2xl">
              <div className="relative">
                <img
                  src={user?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1f2937&color=ffffff&size=40`}
                  alt={user?.name || 'User'}
                  className="w-10 h-10 rounded-full ring-2 ring-blue-500/50 shadow-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1f2937&color=ffffff&size=40`;
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black shadow-lg animate-pulse"></div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium text-sm">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-32">
                  {user?.university || user?.email}
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={refreshing}
                  size="sm"
                  className="group bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                  <span className="hidden lg:inline ml-2">Refresh</span>
                </Button>
              )}

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-red-600/20 border-red-600/30 text-red-400 hover:bg-red-600/30 hover:border-red-600/50 hover:text-red-300 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline ml-2">Logout</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg">
            <div className="p-4 space-y-4">
              {/* Mobile User Info */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="relative">
                  <img
                    src={user?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1f2937&color=ffffff&size=40`}
                    alt={user?.name || 'User'}
                    className="w-10 h-10 rounded-full ring-2 ring-blue-500/50 shadow-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1f2937&color=ffffff&size=40`;
                    }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black shadow-lg animate-pulse"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.university || user?.email}
                  </p>
                </div>
              </div>

              {/* Mobile Navigation */}
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center justify-between w-full p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        item.current
                          ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                          : "bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </div>
                      {item.badge && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Mobile Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-800">
                {onRefresh && (
                  <Button
                    onClick={() => {
                      onRefresh()
                      setIsMobileMenuOpen(false)
                    }}
                    disabled={refreshing}
                    className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <RefreshCw className={`mr-3 h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh {currentPage}
                  </Button>
                )}

                <Button
                  onClick={() => {
                    handleLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full justify-start bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 hover:border-red-600/50 transition-all duration-300"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
