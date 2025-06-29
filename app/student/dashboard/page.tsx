"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  QrCode,
  BookOpen,
  TrendingUp,
  Award,
  Target,
  Star,
  Zap,
  Trophy,
  Activity,
  MapPin,
  User,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from "lucide-react"

interface Class {
  id: string
  name: string
  description: string
  instructor: string
  university: string
  schedule: Array<{
    day: string
    startTime: string
    endTime: string
    location?: string
  }>
  isActive: boolean
  createdAt: any
}

interface AttendanceRecord {
  id: string
  classId: string
  studentId: string
  timestamp: any
  className: string
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [classes, setClasses] = useState<Class[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (!user.isApproved) {
      router.push("/auth/pending-approval")
      return
    }

    fetchData()
  }, [user, router])

  const fetchData = async () => {
    if (!user) return

    try {
      // Fetch classes
      const classesQuery = query(
        collection(db, "classes"),
        where("university", "==", user.university),
        where("isActive", "==", true),
        orderBy("createdAt", "desc"),
      )

      const classesSnapshot = await getDocs(classesQuery)
      const classesData = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Class[]

      // Fetch attendance records
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", user.id),
        orderBy("timestamp", "desc"),
        limit(50),
      )

      const attendanceSnapshot = await getDocs(attendanceQuery)
      const attendanceData = attendanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[]

      setClasses(classesData)
      setAttendanceRecords(attendanceData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStats = () => {
    const totalClasses = classes.length
    const attendedClasses = new Set(attendanceRecords.map((record) => record.classId)).size
    const totalSessions = attendanceRecords.length
    const averageAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0

    // Calculate streak (consecutive days with attendance)
    const today = new Date()
    let streak = 0
    const attendanceDates = attendanceRecords
      .map((record) => new Date(record.timestamp.toDate()).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    for (let i = 0; i < attendanceDates.length; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)

      if (attendanceDates.includes(checkDate.toDateString())) {
        streak++
      } else {
        break
      }
    }

    return {
      totalClasses,
      attendedClasses,
      totalSessions,
      averageAttendance,
      streak,
    }
  }

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 90) return { level: "Excellent", color: "text-green-600", bgColor: "bg-green-100", icon: Trophy }
    if (percentage >= 75) return { level: "Good", color: "text-blue-600", bgColor: "bg-blue-100", icon: Star }
    if (percentage >= 60) return { level: "Average", color: "text-yellow-600", bgColor: "bg-yellow-100", icon: Target }
    return { level: "Needs Improvement", color: "text-red-600", bgColor: "bg-red-100", icon: AlertCircle }
  }

  const getTodaysClasses = () => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" })
    return classes.filter((cls) => cls.schedule.some((schedule) => schedule.day === today))
  }

  const getRecentActivity = () => {
    return attendanceRecords.slice(0, 5).map((record) => ({
      ...record,
      date: record.timestamp.toDate(),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="animate-pulse space-y-6">
            <div className="h-32 sm:h-40 bg-gradient-to-r from-violet-900/30 to-cyan-900/30 rounded-2xl"></div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/50 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stats = getStats()
  const performance = getPerformanceLevel(stats.averageAttendance)
  const todaysClasses = getTodaysClasses()
  const recentActivity = getRecentActivity()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-violet-600 via-cyan-600 to-emerald-600 text-white mb-4 sm:mb-6">
          <div className="absolute inset-0 bg-slate-900/30"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
          
          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Mobile-first header with avatar */}
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-3 border-white/30 ring-2 ring-white/20">
                  <AvatarImage src={user?.profilePhoto || "/placeholder.svg"} alt={user?.name} />
                  <AvatarFallback className="text-lg sm:text-xl bg-white/20 text-white font-bold">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 leading-tight">
                    Welcome back, {user?.name?.split(" ")[0]}! 👋
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base">Ready to continue your learning journey?</p>
                </div>
              </div>

              {/* Badges section */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm text-xs sm:text-sm">
                  <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  {user?.university}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-400/30 hover:bg-emerald-500/30 backdrop-blur-sm text-xs sm:text-sm">
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  {stats.streak} Day Streak
                </Badge>
                <Badge className={`${performance.bgColor.replace('bg-', 'bg-').replace('-100', '-500/20')} ${performance.color.replace('text-', 'text-').replace('-600', '-100')} border-0 backdrop-blur-sm text-xs sm:text-sm`}>
                  <performance.icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  {performance.level}
                </Badge>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  className="bg-white text-violet-700 hover:bg-white/90 font-semibold shadow-lg h-11 sm:h-12 text-sm sm:text-base"
                  onClick={() => router.push("/student/scan")}
                >
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Scan QR Code
                </Button>
                <Button
                  variant="outline"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm h-11 sm:h-12 text-sm sm:text-base"
                  onClick={() => router.push("/student/classes")}
                >
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  My Classes
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Total Classes</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-cyan-400">{stats.totalClasses}</p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Available courses</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-cyan-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors border border-cyan-500/20">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 group-hover:from-emerald-500/20 group-hover:to-green-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Attendance</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-400">{stats.averageAttendance}%</p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Overall rate</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-emerald-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors border border-emerald-500/20">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Sessions</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-400">{stats.totalSessions}</p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Classes attended</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-amber-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-amber-500/30 transition-colors border border-amber-500/20">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10 group-hover:from-violet-500/20 group-hover:to-purple-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Streak</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-violet-400">{stats.streak}</p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Consecutive days</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-violet-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-violet-500/30 transition-colors border border-violet-500/20">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-1 w-full max-w-2xl mx-auto grid grid-cols-3 h-auto">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg transition-all"
            >
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg transition-all"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-300 hover:text-white flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg transition-all"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Quick Actions */}
              <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-white">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-400">Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
                  <Button
                    className="w-full justify-start h-11 sm:h-12 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium text-sm sm:text-base shadow-lg"
                    onClick={() => router.push("/student/scan")}
                  >
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    Scan QR Code for Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-10 sm:h-11 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 text-sm sm:text-base"
                    onClick={() => router.push("/student/classes")}
                  >
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    View All Classes
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-10 sm:h-11 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 text-sm sm:text-base"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                    Update Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Performance Overview */}
              <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-white">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    Performance Overview
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-400">Your attendance performance</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Overall Attendance</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.averageAttendance}%</span>
                  </div>
                  <Progress value={stats.averageAttendance} className="h-3 bg-slate-800" />

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                    <div className="text-center p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
                      <p className="text-lg sm:text-2xl font-bold text-emerald-400">{stats.attendedClasses}</p>
                      <p className="text-xs text-slate-400">Classes Attended</p>
                    </div>
                    <div className="text-center p-3 bg-violet-500/20 border border-violet-500/30 rounded-lg backdrop-blur-sm">
                      <p className="text-lg sm:text-2xl font-bold text-violet-400">{stats.streak}</p>
                      <p className="text-xs text-slate-400">Day Streak</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 p-3 rounded-lg ${performance.bgColor.replace('bg-', 'bg-').replace('-100', '-500/20')} border ${performance.color.replace('text-', 'border-').replace('-600', '-500/30')} backdrop-blur-sm`}>
                    <performance.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${performance.color.replace('text-', 'text-').replace('-600', '-400')}`} />
                    <span className={`text-sm font-medium ${performance.color.replace('text-', 'text-').replace('-600', '-400')}`}>
                      Performance Level: {performance.level}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 sm:space-y-6 mt-4">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-white">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                  Today's Classes
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-400">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {todaysClasses.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">No Classes Today</h3>
                    <p className="text-sm text-slate-400">Enjoy your free day!</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {todaysClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all duration-200"
                      >
                        <div className="flex-1 mb-4 lg:mb-0">
                          <h4 className="font-semibold text-base sm:text-lg text-white mb-1">{cls.name}</h4>
                          <p className="text-sm text-slate-400 mb-2">{cls.instructor}</p>
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                            {cls.schedule
                              .filter((s) => s.day === new Date().toLocaleDateString("en-US", { weekday: "long" }))
                              .map((schedule, index) => (
                                <div key={index} className="flex items-center gap-1.5 text-slate-300">
                                  <Clock className="h-4 w-4 text-cyan-400" />
                                  <span>
                                    {schedule.startTime} - {schedule.endTime}
                                  </span>
                                  {schedule.location && (
                                    <>
                                      <MapPin className="h-4 w-4 text-cyan-400 ml-2" />
                                      <span>{schedule.location}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                        <Button 
                          className="bg-cyan-600 hover:bg-cyan-700 text-white h-10 lg:h-11 w-full lg:w-auto"
                          onClick={() => router.push("/student/scan")}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Scan QR
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 sm:space-y-6 mt-4">
            <Card className="bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm">
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-400">Your latest attendance records</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Activity className="h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">No Recent Activity</h3>
                    <p className="text-sm text-slate-400">Start attending classes to see your activity here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivity.map((record) => (
                      <div key={record.id} className="flex items-center gap-3 sm:gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500/30 transition-all duration-200">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm sm:text-base text-white">{record.className}</h4>
                          <p className="text-xs sm:text-sm text-slate-400">
                            Attended on {record.date.toLocaleDateString()} at {record.date.toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                          Present
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}