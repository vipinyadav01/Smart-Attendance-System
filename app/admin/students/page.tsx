"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, doc, updateDoc, orderBy, Timestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Activity,
  Menu,
  X,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"

interface StudentWithStats extends User {
  totalSessions: number
  attendedSessions: number
  attendancePercentage: number
  lastAttendance?: Date
}

export default function StudentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "low-attendance">("all")
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (user.role !== "admin") {
      router.push("/student/dashboard")
      return
    }

    fetchStudents()
  }, [user, router])

  useEffect(() => {
    // Filter students based on search term and status
    let filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.rollNumber && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.studentId && student.studentId.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    // Apply status filter
    switch (statusFilter) {
      case "approved":
        filtered = filtered.filter((s) => s.isApproved)
        break
      case "pending":
        filtered = filtered.filter((s) => !s.isApproved)
        break
      case "low-attendance":
        filtered = filtered.filter((s) => s.isApproved && s.attendancePercentage < 75)
        break
      default:
        // "all" - no additional filtering
        break
    }

    setFilteredStudents(filtered)
  }, [students, searchTerm, statusFilter])

  const fetchStudents = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch all students from the same university
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("university", "==", user.university),
        orderBy("createdAt", "desc"),
      )
      const studentsSnapshot = await getDocs(studentsQuery)

      // Get attendance statistics for each student
      const studentsWithStats = await Promise.all(
        studentsSnapshot.docs.map(async (studentDoc) => {
          const studentData = { id: studentDoc.id, ...studentDoc.data() } as User

          try {
            // Fetch attendance records for this student
            const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", studentData.id))
            const attendanceSnapshot = await getDocs(attendanceQuery)

            const attendanceRecords = attendanceSnapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
                status: data.status || "absent",
              }
            })

            const totalSessions = attendanceRecords.length
            const attendedSessions = attendanceRecords.filter(
              (record) => record.status === "present" || record.status === "late",
            ).length
            const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0

            // Get last attendance date
            const lastAttendance =
              attendanceRecords.length > 0
                ? new Date(Math.max(...attendanceRecords.map((r) => new Date(r.timestamp).getTime())))
                : undefined

            return {
              ...studentData,
              totalSessions,
              attendedSessions,
              attendancePercentage,
              lastAttendance,
            } as StudentWithStats
          } catch (error) {
            console.error(`Error fetching attendance for student ${studentData.id}:`, error)
            return {
              ...studentData,
              totalSessions: 0,
              attendedSessions: 0,
              attendancePercentage: 0,
              lastAttendance: undefined,
            } as StudentWithStats
          }
        }),
      )

      setStudents(studentsWithStats)
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "Error",
        description: "Failed to fetch students. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStudents()
  }

  const handleApproveStudent = async (studentId: string, approved: boolean) => {
    setActionLoading(studentId)

    try {
      // Update student approval status directly in Firestore
      const studentRef = doc(db, "users", studentId)
      await updateDoc(studentRef, {
        isApproved: approved,
        updatedAt: new Date(),
        approvedBy: user?.id,
        approvedAt: new Date(),
      })

      // Update local state immediately
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentId ? { ...student, isApproved: approved, updatedAt: new Date() } : student,
        ),
      )

      toast({
        title: "Success",
        description: `Student ${approved ? "approved" : "rejected"} successfully`,
      })

      // Try to call the API for additional processing (email notifications, etc.)
      try {
        const token = await auth.currentUser?.getIdToken()
        if (token) {
          const response = await fetch("/api/auth/approve-student", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              studentId,
              approved,
            }),
          })

          if (!response.ok) {
            console.warn("API call failed, but local update succeeded")
          }
        }
      } catch (apiError) {
        console.warn("API call failed, but local update succeeded:", apiError)
      }
    } catch (error: any) {
      console.error("Error updating student:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update student status",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (student: StudentWithStats) => {
    if (!student.isApproved) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30 transition-all duration-300 text-xs">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 transition-all duration-300 text-xs">Low Attendance</Badge>
    }

    return (
      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 transition-all duration-300 text-xs">
        Active
      </Badge>
    )
  }

  // Statistics
  const totalStudents = students.length
  const pendingStudents = students.filter((s) => !s.isApproved)
  const approvedStudents = students.filter((s) => s.isApproved)
  const lowAttendanceStudents = approvedStudents.filter((s) => s.attendancePercentage < 75)

  if (!user || loading) {
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
      {/* Mobile-Responsive Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile Left - Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
                Student Management
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:flex items-center gap-2 mt-1">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                Manage student registrations and monitor attendance
              </p>
            </div>

            {/* Desktop Actions - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={refreshing}
                size="sm"
                className="group bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
              >
                <RefreshCw className={`mr-2 h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                <span className="hidden lg:inline">Refresh</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push("/admin/dashboard")}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 transition-all duration-300"
              >
                <span className="hidden lg:inline">Back to Dashboard</span>
                <span className="lg:hidden">Dashboard</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg">
              <div className="p-4 space-y-3">
                <Button 
                  variant="outline" 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 transition-all duration-500 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    router.push("/admin/dashboard")
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 transition-all duration-300"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile-Responsive Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-300">Total Students</CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold text-white">{totalStudents}</div>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">Registered students</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-300">Pending</CardTitle>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold text-white">{pendingStudents.length}</div>
              {pendingStudents.length > 0 && (
                <Badge className="mt-1 sm:mt-2 bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-300">Active</CardTitle>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold text-white">{approvedStudents.length}</div>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">Approved students</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-300">Low Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold text-white">{lowAttendanceStudents.length}</div>
              {lowAttendanceStudents.length > 0 && (
                <Badge className="mt-1 sm:mt-2 bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                  Needs Attention
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile-Responsive Search and Filter */}
        <Card className="mb-6 sm:mb-8 bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all duration-200 text-sm sm:text-base"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "approved" | "pending" | "low-attendance") => setStatusFilter(value)}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-blue-500/50 focus:ring-blue-500/20 text-sm sm:text-base">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 backdrop-blur-xl">
                  <SelectItem value="all" className="text-gray-200 focus:bg-white/10">All Students</SelectItem>
                  <SelectItem value="pending" className="text-gray-200 focus:bg-white/10">Pending Approval</SelectItem>
                  <SelectItem value="approved" className="text-gray-200 focus:bg-white/10">Approved</SelectItem>
                  <SelectItem value="low-attendance" className="text-gray-200 focus:bg-white/10">Low Attendance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-Responsive Students Tabs */}
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-white/5 backdrop-blur-xl border border-white/10 p-1 shadow-2xl">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-gray-300 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">All ({filteredStudents.length})</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pending"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-orange-600 data-[state=active]:text-white text-gray-300 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">Pending ({pendingStudents.length})</span>
              <span className="sm:hidden">Pending</span>
              {pendingStudents.length > 0 && (
                <Badge className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs bg-red-500 text-white border-0">
                  {pendingStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="approved"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-gray-300 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">Approved ({approvedStudents.length})</span>
              <span className="sm:hidden">Active</span>
            </TabsTrigger>
            <TabsTrigger 
              value="low-attendance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-pink-600 data-[state=active]:text-white text-gray-300 transition-all duration-300 text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">Low Attendance ({lowAttendanceStudents.length})</span>
              <span className="sm:hidden">Low</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="space-y-4">
            <StudentsList
              students={filteredStudents}
              onApprove={handleApproveStudent}
              onViewDetails={setSelectedStudent}
              actionLoading={actionLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile-Responsive Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border-white/10 text-white shadow-2xl mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Student Details
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm sm:text-base">Detailed information and attendance statistics</DialogDescription>
          </DialogHeader>
          {selectedStudent && <StudentDetailsContent student={selectedStudent} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mobile-Responsive Students List Component
function StudentsList({
  students,
  onApprove,
  onViewDetails,
  actionLoading,
}: {
  students: StudentWithStats[]
  onApprove: (studentId: string, approved: boolean) => void
  onViewDetails: (student: StudentWithStats) => void
  actionLoading: string | null
}) {
  const getStatusBadge = (student: StudentWithStats) => {
    if (!student.isApproved) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30 transition-all duration-300 text-xs">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 transition-all duration-300 text-xs">Low Attendance</Badge>
    }

    return (
      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 transition-all duration-300 text-xs">
        Active
      </Badge>
    )
  }

  if (students.length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardContent className="text-center py-12 sm:py-16">
          <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 mx-auto mb-4 sm:mb-6" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gray-200">No students found</h3>
          <p className="text-gray-400 text-sm sm:text-base">No students match your current search and filter criteria.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {students.map((student) => (
        <Card key={student.id} className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-300 hover:shadow-black/20">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-6 flex-1">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-white/20 shadow-lg flex-shrink-0">
                  <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm sm:text-lg font-bold">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                    <h3 className="text-lg sm:text-xl font-bold text-white truncate">{student.name}</h3>
                    {getStatusBadge(student)}
                  </div>

                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-blue-400" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-purple-400" />
                      <span className="truncate">
                        {student.rollNumber
                          ? `Roll: ${student.rollNumber}`
                          : student.studentId
                            ? `ID: ${student.studentId}`
                            : "No ID"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-green-400" />
                      <span className="truncate">{student.university}</span>
                    </div>
                  </div>

                  {student.isApproved && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/10">
                      <div className="flex justify-between sm:block">
                        <span className="font-medium text-gray-400">Attendance:</span>
                        <span className={`font-bold ${student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}`}>
                          {student.attendancePercentage}%
                        </span>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="font-medium text-gray-400">Sessions:</span>
                        <span className="text-gray-200">{student.attendedSessions}/{student.totalSessions}</span>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="font-medium text-gray-400">Last Seen:</span>
                        <span className="text-gray-200">{student.lastAttendance ? student.lastAttendance.toLocaleDateString() : "Never"}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Joined:{" "}
                    {student.createdAt instanceof Timestamp
                      ? student.createdAt.toDate().toLocaleDateString()
                      : new Date(student.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:ml-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewDetails(student)}
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 text-xs sm:text-sm"
                >
                  View Details
                </Button>

                {!student.isApproved ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(student.id, true)}
                      disabled={actionLoading === student.id}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      {actionLoading === student.id ? (
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                      <span className="ml-1 sm:ml-2">Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(student.id, false)}
                      disabled={actionLoading === student.id}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white border-0 transition-all duration-300 text-xs sm:text-sm flex-1 sm:flex-none"
                    >
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="ml-1 sm:ml-2">Reject</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(student.id, false)}
                    disabled={actionLoading === student.id}
                    className="bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30 hover:border-red-400/50 transition-all duration-300 text-xs sm:text-sm"
                  >
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="ml-1 sm:ml-2">Revoke</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Mobile-Responsive Student Details Component
function StudentDetailsContent({ student }: { student: StudentWithStats }) {
  const getStatusBadge = (student: StudentWithStats) => {
    if (!student.isApproved) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30 transition-all duration-300 text-xs">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 transition-all duration-300 text-xs">Low Attendance</Badge>
    }

    return (
      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 transition-all duration-300 text-xs">
        Active
      </Badge>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Basic Information */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-white/20 shadow-lg flex-shrink-0">
          <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
          <AvatarFallback className="text-lg sm:text-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
            {student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {student.name}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mt-1">{student.email}</p>
          <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-3 mt-3">
            {getStatusBadge(student)}
            {student.profileComplete && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">Profile Complete</Badge>}
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-white">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Student ID:</span>
              <span className="text-gray-200 text-right">{student.studentId || "Not provided"}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Roll Number:</span>
              <span className="text-gray-200 text-right">{student.rollNumber || "Not provided"}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">University:</span>
              <span className="text-gray-200 text-right">{student.university}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Joined:</span>
              <span className="text-gray-200 text-right">
                {student.createdAt instanceof Timestamp
                  ? student.createdAt.toDate().toLocaleDateString()
                  : new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Status:</span>
              <span className="text-gray-200 text-right">{student.isApproved ? "Approved" : "Pending Approval"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-white">Attendance Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Total Sessions:</span>
              <span className="text-gray-200">{student.totalSessions}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Attended:</span>
              <span className="text-gray-200">{student.attendedSessions}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Attendance Rate:</span>
              <span className={`font-bold text-lg sm:text-xl ${student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}`}>
                {student.attendancePercentage}%
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="font-medium text-gray-400">Last Attendance:</span>
              <span className="text-gray-200 text-right">{student.lastAttendance ? student.lastAttendance.toLocaleDateString() : "Never"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Progress */}
      {student.isApproved && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-white">Attendance Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress to 75% minimum</span>
                <span className="text-gray-200 font-bold">{student.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 sm:h-3">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all duration-500 ${
                    student.attendancePercentage >= 75 ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-pink-400"
                  }`}
                  style={{ width: `${Math.min(student.attendancePercentage, 100)}%` }}
                />
              </div>
              {student.attendancePercentage < 75 && (
                <div className="flex items-start sm:items-center gap-3 mt-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-xl">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-xs sm:text-sm text-red-300">Below minimum attendance requirement (75%)</p>
                </div>
              )}
              {student.attendancePercentage >= 75 && (
                <div className="flex items-start sm:items-center gap-3 mt-4 p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg backdrop-blur-xl">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-xs sm:text-sm text-green-300">Meeting attendance requirements</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
