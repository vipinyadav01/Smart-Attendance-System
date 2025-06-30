"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChartWrapper } from "@/components/chart-wrapper"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Users,
  Calendar,
  TrendingUp,
  QrCode,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  Activity,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import type { User, AttendanceRecord, Class } from "@/lib/types"

interface DashboardStats {
  totalStudents: number
  totalClasses: number
  todayAttendance: number
  averageAttendance: number
  pendingApprovals: number
  approvedStudents: number
}

interface AttendanceData {
  date: string
  present: number
  absent: number
  late: number
  total: number
}

interface RecentActivity {
  id: string
  type: "attendance" | "registration" | "approval"
  studentName: string
  studentPhoto?: string
  message: string
  timestamp: Date
}

export default function AdminDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClasses: 0,
    todayAttendance: 0,
    averageAttendance: 0,
    pendingApprovals: 0,
    approvedStudents: 0,
  })
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [pendingStudents, setPendingStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return

    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (user.role !== "admin") {
      router.push("/student/dashboard")
      return
    }

    fetchDashboardData()
  }, [user, authLoading, router])

  // Close mobile menu on escape key or outside click
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = e.target as Element
        if (!target.closest('[data-mobile-menu]')) {
          setIsMobileMenuOpen(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch students
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("university", "==", user.university),
      )
      const studentsSnapshot = await getDocs(studentsQuery)
      const students = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]

      const totalStudents = students.length
      const approvedStudents = students.filter((s) => s.isApproved).length
      const pendingStudents = students.filter((s) => !s.isApproved)

      // Fetch classes
      const classesQuery = query(collection(db, "classes"), where("universityId", "==", user.university))
      const classesSnapshot = await getDocs(classesQuery)
      const totalClasses = classesSnapshot.size

      // Get classes data for mapping
      const classes = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Class[]

      // Fetch attendance records
      const attendanceQuery = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(500))
      const attendanceSnapshot = await getDocs(attendanceQuery)
      const attendanceRecords = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp),
      })) as AttendanceRecord[]

      // Create maps for quick lookup
      const studentMap = new Map(students.map(s => [s.id, s]))
      const classMap = new Map(classes.map(c => [c.id, c]))

      // Calculate today's attendance
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayAttendance = attendanceRecords.filter((record) => {
        const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : 
                          record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp)
        return recordDate >= today && recordDate < tomorrow
      }).length

      // Process attendance data for charts (last 7 days)
      const attendanceByDate: { [key: string]: { present: number; absent: number; late: number; total: number } } = {}

      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split("T")[0]
        attendanceByDate[dateKey] = { present: 0, absent: 0, late: 0, total: 0 }
      }

      // Fill with actual data
      attendanceRecords.forEach((record) => {
        const recordDate = record.timestamp instanceof Timestamp ? record.timestamp.toDate() : 
                          record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp)
        const dateKey = recordDate.toISOString().split("T")[0]

        if (attendanceByDate[dateKey]) {
          const status = record.status || "absent"
          if (status === "present" || status === "late" || status === "absent") {
            attendanceByDate[dateKey][status]++
            attendanceByDate[dateKey].total++
          }
        }
      })

      const chartData = Object.entries(attendanceByDate)
        .map(([date, counts]) => ({
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          ...counts,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate average attendance
      const totalAttendanceRecords = attendanceRecords.length
      const presentCount = attendanceRecords.filter(
        (record) => record.status === "present" || record.status === "late",
      ).length
      const averageAttendance =
        totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0

      // Generate recent activity
      const activity: RecentActivity[] = []

      // Add recent attendance records (only for students in this university)
      attendanceRecords
        .filter(record => {
          // Only include attendance for students in this university
          const student = studentMap.get(record.studentId)
          return student && student.university === user.university
        })
        .slice(0, 8)
        .forEach((record) => {
          const student = studentMap.get(record.studentId)
          const classInfo = classMap.get(record.classId)
          
          activity.push({
            id: record.id,
            type: "attendance",
            studentName: student?.name || record.studentName || "Unknown Student",
            studentPhoto: student?.profilePhoto || record.studentPhoto,
            message: `Marked as ${record.status} for ${classInfo?.name || record.className || "Unknown Class"}`,
            timestamp: record.timestamp instanceof Timestamp ? record.timestamp.toDate() : 
                      record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp),
          })
        })

      // Add recent registrations
      students
        .sort((a, b) => {
          const aDate = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : 
                       a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
          const bDate = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : 
                       b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
          return bDate.getTime() - aDate.getTime()
        })
        .slice(0, 3)
        .forEach((student) => {
          const studentTimestamp = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : 
                                  student.createdAt instanceof Date ? student.createdAt : new Date(student.createdAt)
          
          activity.push({
            id: `reg-${student.id}`,
            type: "registration",
            studentName: student.name,
            studentPhoto: student.profilePhoto,
            message: "Registered for the system",
            timestamp: studentTimestamp,
          })
        })

      // Sort activity by timestamp
      activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      setStats({
        totalStudents,
        totalClasses,
        todayAttendance,
        averageAttendance,
        pendingApprovals: pendingStudents.length,
        approvedStudents,
      })
      setAttendanceData(chartData)
      setRecentActivity(activity.slice(0, 10))
      setPendingStudents(pendingStudents.slice(0, 5))
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/auth/signin")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const pieData = [
    {
      name: "Present",
      value: attendanceData.reduce((sum, day) => sum + day.present, 0),
      color: "#00ff88",
    },
    {
      name: "Late",
      value: attendanceData.reduce((sum, day) => sum + day.late, 0),
      color: "#ffaa00",
    },
    {
      name: "Absent",
      value: attendanceData.reduce((sum, day) => sum + day.absent, 0),
      color: "#ff4466",
    },
  ].filter((item) => item.value > 0)

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-white/20 rounded-full animate-spin border-t-white"></div>
          <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-blue-500" style={{ animationDelay: '0.1s' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile-First Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile Left - Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
                Admin Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 inline" />
                Manage attendance system
              </p>
            </div>

            {/* Desktop User Info - Hidden on mobile */}
            <div className="hidden lg:flex items-center gap-4 bg-white/5 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10 shadow-2xl mx-4">
              <div className="relative">
                <img
                  src={user.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=1f2937&color=ffffff&size=40`}
                  alt={user.name || 'User'}
                  className="w-10 h-10 rounded-full ring-2 ring-blue-500/50 shadow-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=1f2937&color=ffffff&size=40`;
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black shadow-lg animate-pulse"></div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium text-sm">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate max-w-32">
                  {user.university || user.email}
                </p>
              </div>
            </div>

            {/* Mobile/Tablet Actions */}
            <div className="flex items-center gap-2">
              {/* Desktop Actions - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="sm"
                  className="group bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                  <span className="hidden lg:inline ml-2">Refresh</span>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300"
                >
                  <Link href="/admin/generate-qr">
                    <QrCode className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">Generate QR</span>
                  </Link>
                </Button>

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
                className="sm:hidden bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                data-mobile-menu
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg" data-mobile-menu>
              <div className="p-4 space-y-4">
                {/* Mobile User Info */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="relative">
                    <img
                      src={user.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=1f2937&color=ffffff&size=40`}
                      alt={user.name || 'User'}
                      className="w-10 h-10 rounded-full ring-2 ring-blue-500/50 shadow-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=1f2937&color=ffffff&size=40`;
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black shadow-lg animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.university || user.email}
                    </p>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <RefreshCw className={`mr-3 h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh Dashboard
                  </Button>

                  <Button
                    asChild
                    className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300"
                  >
                    <Link href="/admin/generate-qr" onClick={() => setIsMobileMenuOpen(false)}>
                      <QrCode className="mr-3 h-4 w-4" />
                      Generate QR Code
                    </Link>
                  </Button>

                  <Button
                    asChild
                    className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <Link href="/admin/students" onClick={() => setIsMobileMenuOpen(false)}>
                      <Users className="mr-3 h-4 w-4" />
                      Manage Students
                      {stats.pendingApprovals > 0 && (
                        <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                          {stats.pendingApprovals}
                        </Badge>
                      )}
                    </Link>
                  </Button>

                  <Button
                    asChild
                    className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <Link href="/admin/classes" onClick={() => setIsMobileMenuOpen(false)}>
                      <Calendar className="mr-3 h-4 w-4" />
                      Manage Classes
                    </Link>
                  </Button>

                  <Button
                    onClick={handleLogout}
                    className="w-full justify-start bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 hover:border-red-600/50 hover:text-red-300 transition-all duration-300"
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Students</CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.totalStudents}</div>
              <p className="text-xs text-gray-500 hidden sm:block">Registered</p>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Approved</CardTitle>
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.approvedStudents}</div>
              <p className="text-xs text-gray-500 hidden sm:block">Active</p>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-red-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Pending</CardTitle>
              <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.pendingApprovals}</div>
              {stats.pendingApprovals > 0 && (
                <Badge className="mt-1 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-xs hidden sm:inline-block">
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Classes</CardTitle>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.totalClasses}</div>
              <p className="text-xs text-gray-500 hidden sm:block">Created</p>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Today</CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.todayAttendance}</div>
              <p className="text-xs text-gray-500 hidden sm:block">Records</p>
            </CardContent>
          </Card>

          <Card className="group bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:scale-[1.02] sm:hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-300 truncate">Average</CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300 flex-shrink-0" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{stats.averageAttendance}%</div>
              <p className="text-xs text-gray-500 hidden sm:block">Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-gray-900 border-gray-800 p-1 rounded-xl w-full grid grid-cols-3 h-auto">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg transition-all duration-300 hover:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Overview</span>
              <span className="xs:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg transition-all duration-300 hover:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Trends</span>
              <span className="xs:hidden">Chart</span>
            </TabsTrigger>
            <TabsTrigger 
              value="actions" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg transition-all duration-300 hover:text-white text-xs sm:text-sm py-2 sm:py-3"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Actions</span>
              <span className="xs:hidden">Tools</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                    Daily Attendance
                  </CardTitle>
                  <CardDescription className="text-gray-400">Attendance records for the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartWrapper
                    fallback={
                      <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500">No attendance data available</p>
                        </div>
                      </div>
                    }
                  >
                    {attendanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={attendanceData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#ffffff'
                            }} 
                          />
                          <Bar dataKey="present" fill="#00ff88" name="Present" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="late" fill="#ffaa00" name="Late" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="absent" fill="#ff4466" name="Absent" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500">No attendance data available</p>
                        </div>
                      </div>
                    )}
                  </ChartWrapper>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-purple-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                    Attendance Distribution
                  </CardTitle>
                  <CardDescription className="text-gray-400">Overall attendance status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartWrapper
                    fallback={
                      <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500">No attendance data available</p>
                        </div>
                      </div>
                    }
                  >
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1F2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#ffffff'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500">No attendance data available</p>
                        </div>
                      </div>
                    )}
                  </ChartWrapper>
                </CardContent>
              </Card>
            </div>

            {/* Pending Students and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-orange-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-orange-400" />
                      Pending Approvals
                    </div>
                    {stats.pendingApprovals > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                        {stats.pendingApprovals}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">Students waiting for approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No pending approvals</p>
                      <p className="text-sm text-gray-500 mt-1">All students have been processed</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-blue-500/50 transition-all duration-300">
                              <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
                              <AvatarFallback className="bg-gray-700 text-white">
                                {student.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{student.name}</p>
                              <p className="text-xs text-gray-400 truncate">{student.email}</p>
                            </div>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Pending
                          </Badge>
                        </div>
                      ))}
                      {stats.pendingApprovals > 5 && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" asChild className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                            <Link href="/admin/students?tab=pending">View All ({stats.pendingApprovals - 5} more)</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-green-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-green-400" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription className="text-gray-400">Latest system activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all duration-300 group">
                          <Avatar className="h-8 w-8 ring-2 ring-white/20 group-hover:ring-blue-500/50 transition-all duration-300">
                            <AvatarImage src={activity.studentPhoto || "/placeholder.svg"} alt={activity.studentName} />
                            <AvatarFallback className="text-xs bg-gray-700 text-white">
                              {activity.studentName?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">{activity.studentName}</span>{" "}
                              <span className="text-gray-400">{activity.message}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.timestamp.toLocaleDateString()} at{" "}
                              {activity.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              activity.type === "attendance"
                                ? "bg-green-500"
                                : activity.type === "registration"
                                  ? "bg-blue-500"
                                  : "bg-yellow-500"
                            } animate-pulse`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
                  Attendance Trends
                </CardTitle>
                <CardDescription className="text-gray-400">Track attendance patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartWrapper
                  fallback={
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">No attendance data available</p>
                      </div>
                    </div>
                  }
                >
                  {attendanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#ffffff'
                          }} 
                        />
                        <Line type="monotone" dataKey="present" stroke="#00ff88" name="Present" strokeWidth={3} dot={{ fill: '#00ff88', strokeWidth: 2, r: 4 }} />
                        <Line type="monotone" dataKey="late" stroke="#ffaa00" name="Late" strokeWidth={3} dot={{ fill: '#ffaa00', strokeWidth: 2, r: 4 }} />
                        <Line type="monotone" dataKey="absent" stroke="#ff4466" name="Absent" strokeWidth={3} dot={{ fill: '#ff4466', strokeWidth: 2, r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">No attendance data available</p>
                      </div>
                    </div>
                  )}
                </ChartWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-blue-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-gray-400">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300 hover:scale-105">
                    <Link href="/admin/students">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Students
                      {stats.pendingApprovals > 0 && (
                        <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                          {stats.pendingApprovals}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
                    <Link href="/admin/classes">
                      <Calendar className="mr-2 h-4 w-4" />
                      Manage Classes
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
                    <Link href="/admin/generate-qr">
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate QR Code
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105">
                    <Link href="/admin/reports">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Reports
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 hover:border-green-500/30 transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
                    System Overview
                  </CardTitle>
                  <CardDescription className="text-gray-400">Current system status and metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-white">System Status</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Online
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
                        <div className="text-2xl font-bold text-blue-400">{stats.totalStudents}</div>
                        <div className="text-xs text-gray-400">Total Students</div>
                      </div>
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
                        <div className="text-2xl font-bold text-green-400">{stats.approvedStudents}</div>
                        <div className="text-xs text-gray-400">Approved</div>
                      </div>
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
                        <div className="text-2xl font-bold text-purple-400">{stats.totalClasses}</div>
                        <div className="text-xs text-gray-400">Classes</div>
                      </div>
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300">
                        <div className="text-2xl font-bold text-orange-400">{stats.todayAttendance}</div>
                        <div className="text-xs text-gray-400">Today's Records</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">Overall Attendance Rate</span>
                        <span className="font-medium text-white">{stats.averageAttendance}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 shadow-lg"
                          style={{ width: `${stats.averageAttendance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}