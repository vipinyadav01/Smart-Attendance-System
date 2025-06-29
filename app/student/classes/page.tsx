"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Search, Calendar, Clock, Users, QrCode, BookOpen, TrendingUp, Award, Target, ChevronRight, Filter, MapPin, User, BarChart3 } from 'lucide-react'

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
  studentCount?: number
}

interface AttendanceRecord {
  id: string
  classId: string
  studentId: string
  timestamp: any
  className: string
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function StudentClassesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [classes, setClasses] = useState<Class[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDay, setSelectedDay] = useState<string>("all")

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (!user.isApproved) {
      router.push("/auth/pending-approval")
      return
    }

    fetchClasses()
    fetchAttendanceRecords()
  }, [user, router])

  const fetchClasses = async () => {
    if (!user) return

    try {
      const classesQuery = query(
        collection(db, "classes"),
        where("university", "==", user.university),
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      )

      const snapshot = await getDocs(classesQuery)
      const classesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Class[]

      setClasses(classesData)
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      })
    }
  }

  const fetchAttendanceRecords = async () => {
    if (!user) return

    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", user.id),
        orderBy("timestamp", "desc")
      )

      const snapshot = await getDocs(attendanceQuery)
      const attendanceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AttendanceRecord[]

      setAttendanceRecords(attendanceData)
    } catch (error) {
      console.error("Error fetching attendance records:", error)
    } finally {
      setLoading(false)
    }
  }

  const getClassAttendanceStats = (classId: string) => {
    const classAttendance = attendanceRecords.filter((record) => record.classId === classId)
    const totalSessions = classAttendance.length
    const attendancePercentage = totalSessions > 0 ? 100 : 0

    return {
      totalSessions,
      attendancePercentage,
      lastAttended: totalSessions > 0 ? classAttendance[0].timestamp.toDate() : null,
    }
  }

  const getOverallStats = () => {
    const totalClasses = classes.length
    const attendedClasses = new Set(attendanceRecords.map((record) => record.classId)).size
    const totalSessions = attendanceRecords.length
    const averageAttendance = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0

    return {
      totalClasses,
      attendedClasses,
      totalSessions,
      averageAttendance,
    }
  }

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDay = selectedDay === "all" || 
                      cls.schedule.some((schedule) => schedule.day === selectedDay)

    return matchesSearch && matchesDay
  })

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: "default" as const, label: "Excellent", color: "bg-green-500" }
    if (percentage >= 75) return { variant: "secondary" as const, label: "Good", color: "bg-blue-500" }
    if (percentage >= 60) return { variant: "outline" as const, label: "Average", color: "bg-yellow-500" }
    return { variant: "destructive" as const, label: "Needs Improvement", color: "bg-red-500" }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gradient-to-r from-violet-900/30 to-cyan-900/30 rounded-xl w-3/4"></div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-800/50 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-800/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stats = getOverallStats()

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                My Classes
              </h1>
              <p className="text-slate-400 text-sm sm:text-base mt-1">Track your attendance and manage your classes</p>
            </div>
            <Button 
              onClick={() => router.push("/student/scan")} 
              className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white font-medium shadow-lg h-10 sm:h-11 w-full sm:w-auto"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 lg:p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Total Classes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyan-400">{stats.totalClasses}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-cyan-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors border border-cyan-500/20">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 group-hover:from-emerald-500/20 group-hover:to-green-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 lg:p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Attended</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400">{stats.attendedClasses}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-emerald-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors border border-emerald-500/20">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-amber-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 lg:p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Sessions</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-400">{stats.totalSessions}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-amber-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-amber-500/30 transition-colors border border-amber-500/20">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group bg-slate-900/50 border-slate-800 hover:border-violet-500/30 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10 group-hover:from-violet-500/20 group-hover:to-purple-500/20 transition-all duration-300"></div>
            <CardContent className="p-3 sm:p-4 lg:p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-400">Average</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-violet-400">{stats.averageAttendance}%</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-violet-500/20 rounded-lg lg:rounded-xl flex items-center justify-center group-hover:bg-violet-500/30 transition-colors border border-violet-500/20">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search classes, instructors, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedDay === "all" ? "default" : "outline"}
                  onClick={() => setSelectedDay("all")}
                  size="sm"
                  className={selectedDay === "all" 
                    ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600" 
                    : "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"}
                >
                  All Days
                </Button>
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
                    onClick={() => setSelectedDay(day)}
                    size="sm"
                    className={`whitespace-nowrap ${selectedDay === day 
                      ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600" 
                      : "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classes Grid */}
        {filteredClasses.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-8 sm:p-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No Classes Found</h3>
              <p className="text-slate-400">
                {searchTerm || selectedDay !== "all" 
                  ? "Try adjusting your search or filter criteria."
                  : "No classes are available for your university yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((cls) => {
              const stats = getClassAttendanceStats(cls.id)
              const performanceBadge = getPerformanceBadge(stats.attendancePercentage)

              return (
                <Card key={cls.id} className="group bg-slate-900/50 border-slate-800 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg group-hover:text-cyan-400 transition-colors text-white line-clamp-2">
                          {cls.name}
                        </CardTitle>
                        <CardDescription className="mt-1 text-slate-400 line-clamp-2">
                          {cls.description}
                        </CardDescription>
                      </div>
                      <Badge 
                        className={`${performanceBadge.color} text-white border-none flex-shrink-0`}
                      >
                        {performanceBadge.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Instructor */}
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{cls.instructor}</span>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-2">
                      {cls.schedule.slice(0, 2).map((schedule, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                          <Calendar className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                          <span className="font-medium text-cyan-400">{schedule.day}</span>
                          <Clock className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                          <span className="truncate">{schedule.startTime} - {schedule.endTime}</span>
                          {schedule.location && (
                            <>
                              <MapPin className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                              <span className="truncate">{schedule.location}</span>
                            </>
                          )}
                        </div>
                      ))}
                      {cls.schedule.length > 2 && (
                        <p className="text-xs text-slate-500">+{cls.schedule.length - 2} more sessions</p>
                      )}
                    </div>

                    {/* Attendance Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Attendance Progress</span>
                        <span className="font-medium text-cyan-400">{stats.attendancePercentage}%</span>
                      </div>
                      <Progress 
                        value={stats.attendancePercentage} 
                        className="h-2 bg-slate-800"
                      />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-xl font-bold text-cyan-400">{stats.totalSessions}</p>
                        <p className="text-xs text-slate-400">Sessions</p>
                      </div>
                      <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-sm font-bold text-emerald-400">
                          {stats.lastAttended ? stats.lastAttended.toLocaleDateString() : "Never"}
                        </p>
                        <p className="text-xs text-slate-400">Last Attended</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700"
                        onClick={() => router.push("/student/scan")}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Scan QR
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={() => router.push(`/student/classes/${cls.id}`)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
