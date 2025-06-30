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
import { Users, Search, CheckCircle, XCircle, Clock, Mail, MapPin, TrendingUp, RefreshCw, UserCheck, UserX, AlertTriangle, Calendar, LogOut } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import type { User } from "@/lib/types"

interface StudentWithStats extends User {
  totalSessions: number
  attendedSessions: number
  attendancePercentage: number
  lastAttendance?: Date
}

export default function StudentsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "low-attendance">("all")
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

    fetchStudents()
  }, [user, authLoading, router])

  useEffect(() => {
    // Filter students based on search term and status
    let filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.rollNumber && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.studentId && student.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Apply status filter
    switch (statusFilter) {
      case "approved":
        filtered = filtered.filter(s => s.isApproved)
        break
      case "pending":
        filtered = filtered.filter(s => !s.isApproved)
        break
      case "low-attendance":
        filtered = filtered.filter(s => s.isApproved && s.attendancePercentage < 75)
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
        orderBy("createdAt", "desc")
      )
      const studentsSnapshot = await getDocs(studentsQuery)

      // Get attendance statistics for each student
      const studentsWithStats = await Promise.all(
        studentsSnapshot.docs.map(async (studentDoc) => {
          const studentData = { id: studentDoc.id, ...studentDoc.data() } as User

          try {
            // Fetch attendance records for this student
            const attendanceQuery = query(
              collection(db, "attendance"), 
              where("studentId", "==", studentData.id)
            )
            const attendanceSnapshot = await getDocs(attendanceQuery)

            const attendanceRecords = attendanceSnapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
                status: data.status || "absent"
              }
            })

            const totalSessions = attendanceRecords.length
            const attendedSessions = attendanceRecords.filter(
              (record) => record.status === "present" || record.status === "late"
            ).length
            const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0

            // Get last attendance date
            const lastAttendance = attendanceRecords.length > 0
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
        })
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

  const handleApproveStudent = async (studentId: string, approved: boolean) => {
    setActionLoading(studentId)

    try {
      // Update student approval status directly in Firestore
      const studentRef = doc(db, "users", studentId)
      await updateDoc(studentRef, {
        isApproved: approved,
        updatedAt: new Date(),
        approvedBy: user!.id,
        approvedAt: new Date(),
      })

      // Update local state immediately
      setStudents((prev) =>
        prev.map((student) => 
          student.id === studentId 
            ? { ...student, isApproved: approved, updatedAt: new Date() } 
            : student
        )
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
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pending</Badge>
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low Attendance</Badge>
    }

    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
  }

  // Statistics
  const totalStudents = students.length
  const pendingStudents = students.filter((s) => !s.isApproved)
  const approvedStudents = students.filter((s) => s.isApproved)
  const lowAttendanceStudents = approvedStudents.filter((s) => s.attendancePercentage < 75)

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-800 rounded-full animate-spin border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Student Management</h1>
              <p className="text-sm text-gray-400">
                Manage student registrations and monitor attendance
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh} 
                disabled={refreshing}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push("/admin/dashboard")}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Back
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="bg-red-600/20 border-red-600/30 text-red-400 hover:bg-red-600/30 hover:border-red-600/50 hover:text-red-300 transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{totalStudents}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-orange-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Pending</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{pendingStudents.length}</p>
                  {pendingStudents.length > 0 && (
                    <Badge className="mt-1 bg-red-500/20 text-red-400 border-red-500/30 text-xs hidden sm:inline-block">
                      Action Required
                    </Badge>
                  )}
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-green-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Active</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{approvedStudents.length}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-red-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Low Attendance</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{lowAttendanceStudents.length}</p>
                  {lowAttendanceStudents.length > 0 && (
                    <Badge className="mt-1 bg-red-500/20 text-red-400 border-red-500/30 text-xs hidden sm:inline-block">
                      Attention
                    </Badge>
                  )}
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 bg-gray-900 border-gray-800">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: "all" | "approved" | "pending" | "low-attendance") => 
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All</SelectItem>
                  <SelectItem value="pending" className="text-white hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="approved" className="text-white hover:bg-gray-700">Approved</SelectItem>
                  <SelectItem value="low-attendance" className="text-white hover:bg-gray-700">Low Attendance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Tabs */}
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)} className="space-y-6">
          <TabsList className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-lg p-1 w-full max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-1 h-auto">
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white text-xs sm:text-sm p-2 sm:p-3 rounded-md transition-all"
            >
              <span className="hidden sm:inline">All </span>({filteredStudents.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pending"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white text-xs sm:text-sm p-2 sm:p-3 rounded-md transition-all"
            >
              <span className="hidden sm:inline">Pending </span>({pendingStudents.length})
              {pendingStudents.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs h-4 w-4 rounded-full p-0 hidden lg:inline-flex items-center justify-center">
                  {pendingStudents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="approved"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white text-xs sm:text-sm p-2 sm:p-3 rounded-md transition-all"
            >
              <span className="hidden sm:inline">Active </span>({approvedStudents.length})
            </TabsTrigger>
            <TabsTrigger 
              value="low-attendance"
              className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white text-xs sm:text-sm p-2 sm:p-3 rounded-md transition-all"
            >
              <span className="hidden sm:inline">Low </span>({lowAttendanceStudents.length})
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

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Student Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed information and attendance statistics
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && <StudentDetailsContent student={selectedStudent} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Students List Component
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
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pending</Badge>
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low Attendance</Badge>
    }

    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
  }

  if (students.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">No students found</h3>
          <p className="text-gray-400">
            No students match your current search and filter criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {students.map((student) => (
        <Card key={student.id} className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-all duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mt-1">
                  <AvatarImage 
                    src={student.profilePhoto || "/placeholder.svg"} 
                    alt={student.name} 
                  />
                  <AvatarFallback className="bg-gray-800 text-white">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-white truncate">{student.name}</h3>
                    {getStatusBadge(student)}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {student.rollNumber || student.studentId || 'No ID'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {student.createdAt instanceof Timestamp 
                          ? student.createdAt.toDate().toLocaleDateString()
                          : new Date(student.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {student.isApproved && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Attendance:</span>
                        <span className={`font-medium ${student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}`}>
                          {student.attendancePercentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Sessions:</span>
                        <span className="text-white">{student.attendedSessions}/{student.totalSessions}</span>
                      </div>
                      {student.lastAttendance && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Last:</span>
                          <span className="text-white">{student.lastAttendance.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-auto lg:min-w-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewDetails(student)}
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full sm:w-auto"
                >
                  Details
                </Button>

                {!student.isApproved ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(student.id, true)}
                      disabled={actionLoading === student.id}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                    >
                      {actionLoading === student.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onApprove(student.id, false)}
                      disabled={actionLoading === student.id}
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApprove(student.id, false)}
                    disabled={actionLoading === student.id}
                    className="bg-gray-800 border-red-500/30 text-red-400 hover:bg-red-900/20 w-full sm:w-auto"
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Revoke</span>
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

// Student Details Component
function StudentDetailsContent({ student }: { student: StudentWithStats }) {
  const getStatusBadge = (student: StudentWithStats) => {
    if (!student.isApproved) {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Pending</Badge>
    }

    if (student.attendancePercentage < 75) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low Attendance</Badge>
    }

    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Basic Information */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 mx-auto sm:mx-0">
          <AvatarImage 
            src={student.profilePhoto || "/placeholder.svg"} 
            alt={student.name} 
          />
          <AvatarFallback className="text-lg bg-gray-800 text-white">
            {student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-white">{student.name}</h2>
          <p className="text-gray-400">{student.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
            {getStatusBadge(student)}
            {student.profileComplete && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Profile Complete</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Student ID:</span>
              <span className="text-white">{student.studentId || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Roll Number:</span>
              <span className="text-white">{student.rollNumber || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">University:</span>
              <span className="text-white">{student.university}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Joined:</span>
              <span className="text-white">
                {student.createdAt instanceof Timestamp
                  ? student.createdAt.toDate().toLocaleDateString()
                  : new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-white">{student.isApproved ? "Approved" : "Pending Approval"}</span>
            </div>
          </CardContent>
        </Card>

        {student.isApproved && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Attendance Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-900 rounded-lg">
                  <div className="text-xl font-bold text-white">{student.totalSessions}</div>
                  <div className="text-gray-400">Total Sessions</div>
                </div>
                <div className="text-center p-3 bg-gray-900 rounded-lg">
                  <div className="text-xl font-bold text-white">{student.attendedSessions}</div>
                  <div className="text-gray-400">Attended</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Attendance Rate:</span>
                  <span 
                    className={`font-bold text-lg ${
                      student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {student.attendancePercentage}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      student.attendancePercentage >= 75 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(student.attendancePercentage, 100)}%` }}
                  />
                </div>
                
                {student.attendancePercentage < 75 ? (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">
                      Below minimum attendance requirement (75%)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-400">
                      Meeting attendance requirements
                    </p>
                  </div>
                )}
                
                {student.lastAttendance && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <span className="text-gray-400">Last Attendance:</span>
                    <span className="text-white">{student.lastAttendance.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
