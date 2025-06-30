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
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugData, setDebugData] = useState<any[]>([])

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

      // Use case-insensitive query due to university name variations
      let studentsSnapshot
      try {
        // Skip exact match query since we have case mismatches
        console.log("Using fallback query due to potential case mismatches in university names")
        throw new Error("Using fallback for case-insensitive matching")
      } catch (indexError) {
        console.warn("Using case-insensitive fallback query:", indexError)
        
        // Fallback: Query by role only and filter university in memory
        const fallbackQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          orderBy("createdAt", "desc"),
        )
        const allStudentsSnapshot = await getDocs(fallbackQuery)
        
        // Filter by university in memory (case-insensitive)
        console.log(`Admin university: "${user.university}" (normalized: "${user.university?.toLowerCase().trim()}")`)
        
        const filteredDocs = allStudentsSnapshot.docs.filter(doc => {
          const data = doc.data()
          const studentUniversity = data.university?.toLowerCase().trim() || ""
          const adminUniversity = user.university?.toLowerCase().trim() || ""
          const matches = studentUniversity === adminUniversity
          
          console.log(`Student: ${data.name} - University: "${data.university}" (normalized: "${studentUniversity}") - Matches: ${matches}`)
          
          return matches
        })
        
        // Create a mock snapshot with filtered documents
        studentsSnapshot = {
          docs: filteredDocs,
          empty: filteredDocs.length === 0,
          size: filteredDocs.length
        }
      }

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

      console.log(`Successfully fetched ${studentsWithStats.length} students`)
      console.log("Students data:", studentsWithStats.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        isApproved: s.isApproved,
        university: s.university,
        createdAt: s.createdAt
      })))
      
      setStudents(studentsWithStats)
    } catch (error: any) {
      console.error("Error fetching students:", error)
      toast({
        title: "Error",
        description: `Failed to fetch students: ${error.message || error}`,
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

  const handleDebugDatabase = async () => {
    try {
      setLoading(true)
      
      // Query ALL users in the database
      const allUsersQuery = query(collection(db, "users"))
      const allUsersSnapshot = await getDocs(allUsersQuery)
      
      const allUsers = allUsersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        docData: doc.data() // Raw document data
      }))
      
      console.log("DEBUG: All users in database:", allUsers)
      setDebugData(allUsers)
      setShowDebugModal(true)
    } catch (error: any) {
      console.error("Debug query failed:", error)
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
        approvedBy: user?.id || null,
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
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge variant="destructive">Low Attendance</Badge>
    }

    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
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
      <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <div className="text-white text-lg font-medium">Loading students...</div>
          <div className="text-gray-400 text-sm">Please wait while we fetch the data</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-gray-900 to-black text-white">
      {/* Modern Bento Grid Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Mobile: Stacked Layout */}
        <div className="block lg:hidden space-y-4 pb-6">
          {/* Mobile Header Card */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white leading-tight">Student Management</h1>
                  <p className="text-gray-400 text-xs mt-1">Manage registrations & attendance</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDebugDatabase} 
                    disabled={loading}
                    className="border-orange-600 text-orange-300 hover:bg-orange-800 min-w-[44px] h-10"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 min-w-[44px] h-10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => router.push("/admin/dashboard")}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 h-12 text-sm"
              >
                ← Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Mobile Stats Overview */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-lg p-4 min-h-[80px] flex flex-col justify-between touch-manipulation"
                onClick={() => setStatusFilter("all")}
              >
                <div className="flex items-center justify-between">
                  <Users className="h-6 w-6 text-purple-400" />
                  <div className="text-2xl font-bold text-white">{totalStudents}</div>
                </div>
                <div className="text-xs text-purple-300 font-medium">Total Students</div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-lg p-4 min-h-[80px] flex flex-col justify-between touch-manipulation cursor-pointer"
                onClick={() => setStatusFilter("pending")}
              >
                <div className="flex items-center justify-between">
                  <Clock className="h-6 w-6 text-amber-400" />
                  <div className="text-2xl font-bold text-white">{pendingStudents.length}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-amber-300 font-medium">Pending</div>
                  {pendingStudents.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      Action
                    </Badge>
                  )}
                </div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-lg p-4 min-h-[80px] flex flex-col justify-between touch-manipulation cursor-pointer"
                onClick={() => setStatusFilter("approved")}
              >
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div className="text-2xl font-bold text-white">{approvedStudents.length}</div>
                </div>
                <div className="text-xs text-green-300 font-medium">Active</div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-lg p-4 min-h-[80px] flex flex-col justify-between touch-manipulation cursor-pointer"
                onClick={() => setStatusFilter("low-attendance")}
              >
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-6 w-6 text-red-400" />
                  <div className="text-2xl font-bold text-white">{lowAttendanceStudents.length}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-red-300 font-medium">Low Attendance</div>
                  {lowAttendanceStudents.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                      Alert
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Search and Filter */}
          <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search students by name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 h-12 bg-gray-800 border-gray-600 text-white placeholder-gray-400 rounded-lg text-base"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value: "all" | "approved" | "pending" | "low-attendance") => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-12 bg-gray-800 border-gray-600 text-white rounded-lg">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-700 h-12">
                      All ({filteredStudents.length})
                    </SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-gray-700 h-12">
                      Pending ({pendingStudents.length})
                    </SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-gray-700 h-12">
                      Approved ({approvedStudents.length})
                    </SelectItem>
                    <SelectItem value="low-attendance" className="text-white hover:bg-gray-700 h-12">
                      Low Attendance ({lowAttendanceStudents.length})
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                  }}
                  className="h-12 border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Students List */}
          <div className="space-y-3">
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <div className="text-sm text-gray-400">
                  Showing {filteredStudents.length} of {totalStudents} students
                </div>
                <div className="text-xs text-gray-500">
                  {statusFilter !== "all" && `Filtered: ${statusFilter.replace("-", " ")}`}
                </div>
              </div>
            )}
            
            <StudentsList
              students={filteredStudents}
              onApprove={handleApproveStudent}
              onViewDetails={setSelectedStudent}
              actionLoading={actionLoading}
              isMobile={true}
            />
          </div>
        </div>

        {/* Desktop: Bento Grid Layout */}
        <div className="hidden lg:block">
          {/* Bento Grid Container */}
          <div className="grid grid-cols-12 grid-rows-12 gap-6 h-screen max-h-[calc(100vh-3rem)]">
            
            {/* Header Section - spans full width, 2 rows */}
            <div className="col-span-12 row-span-2 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center h-full">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Student Management</h1>
                  <p className="text-gray-400">Manage student registrations and monitor attendance across your institution</p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleDebugDatabase} 
                    disabled={loading}
                    className="border-orange-600 text-orange-300 hover:bg-orange-800"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Debug DB
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/admin/dashboard")}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </div>

            {/* Total Students - Large Card */}
            <div className="col-span-3 row-span-3 bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-purple-400" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{totalStudents}</div>
                    <div className="text-sm text-purple-300">Total Students</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-purple-200">Registered students in your institution</div>
                  <div className="h-2 bg-purple-900/50 rounded-full">
                    <div className="h-2 bg-purple-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Approval - Warning Card */}
            <div className="col-span-3 row-span-3 bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-8 w-8 text-amber-400" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{pendingStudents.length}</div>
                    <div className="text-sm text-amber-300">Pending Approval</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {pendingStudents.length > 0 ? (
                    <>
                      <Badge variant="destructive" className="text-xs">
                        Action Required
                      </Badge>
                      <div className="text-sm text-amber-200">Students waiting for approval</div>
                    </>
                  ) : (
                    <div className="text-sm text-amber-200">All students processed</div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Students */}
            <div className="col-span-3 row-span-3 bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{approvedStudents.length}</div>
                    <div className="text-sm text-green-300">Active Students</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-green-200">Approved and active students</div>
                  <div className="h-2 bg-green-900/50 rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full transition-all duration-500" 
                      style={{ width: `${totalStudents > 0 ? (approvedStudents.length / totalStudents) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Low Attendance Warning */}
            <div className="col-span-3 row-span-3 bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-700/50 rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-red-400" />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{lowAttendanceStudents.length}</div>
                    <div className="text-sm text-red-300">Low Attendance</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {lowAttendanceStudents.length > 0 ? (
                    <>
                      <Badge variant="destructive" className="text-xs">
                        Needs Attention
                      </Badge>
                      <div className="text-sm text-red-200">Students below 75% attendance</div>
                    </>
                  ) : (
                    <div className="text-sm text-red-200">All students meeting requirements</div>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="col-span-8 row-span-2 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-6 h-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search students by name, email, roll number, or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-12 text-lg"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value: "all" | "approved" | "pending" | "low-attendance") => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-64 bg-gray-800 border-gray-600 text-white h-12">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all" className="text-white hover:bg-gray-700">All Students ({filteredStudents.length})</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-gray-700">Pending ({pendingStudents.length})</SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-gray-700">Approved ({approvedStudents.length})</SelectItem>
                    <SelectItem value="low-attendance" className="text-white hover:bg-gray-700">Low Attendance ({lowAttendanceStudents.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="col-span-4 row-span-2 bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-2xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <h3 className="text-lg font-semibold text-blue-200">Quick Actions</h3>
                </div>
                
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-12 font-medium"
                    onClick={() => setStatusFilter("pending")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    View Pending ({pendingStudents.length})
                    {pendingStudents.length > 0 && (
                      <Badge className="ml-2 bg-amber-800 text-amber-100 hover:bg-amber-800">
                        {pendingStudents.length}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-2 border-red-600/50 text-red-300 hover:bg-red-900/30 hover:border-red-500 hover:text-red-200 backdrop-blur-sm transition-all duration-200 h-12 font-medium"
                    onClick={() => setStatusFilter("low-attendance")}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Review Low Attendance
                    {lowAttendanceStudents.length > 0 && (
                      <Badge variant="destructive" className="ml-2 bg-red-800 text-red-100">
                        {lowAttendanceStudents.length}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-2 border-green-600/50 text-green-300 hover:bg-green-900/30 hover:border-green-500 hover:text-green-200 backdrop-blur-sm transition-all duration-200 h-12 font-medium"
                    onClick={() => setStatusFilter("approved")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    View Active Students
                    <Badge className="ml-2 bg-green-800 text-green-100">
                      {approvedStudents.length}
                    </Badge>
                  </Button>
                </div>
                
                <div className="mt-4 pt-3 border-t border-blue-700/30">
                  <div className="flex justify-between text-xs text-blue-300">
                    <span>Total Students</span>
                    <span className="font-semibold">{totalStudents}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="col-span-12 row-span-5 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm overflow-hidden">
              <div className="h-full overflow-y-auto">
                <StudentsList
                  students={filteredStudents}
                  onApprove={handleApproveStudent}
                  onViewDetails={setSelectedStudent}
                  actionLoading={actionLoading}
                  isMobile={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Student Details</DialogTitle>
            <DialogDescription className="text-gray-400">Detailed information and attendance statistics</DialogDescription>
          </DialogHeader>
          {selectedStudent && <StudentDetailsContent student={selectedStudent} />}
        </DialogContent>
      </Dialog>

      {/* Debug Modal */}
      <Dialog open={showDebugModal} onOpenChange={setShowDebugModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Database Debug Information
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              All users in the database (Total: {debugData.length})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">Total Users: <span className="text-white font-semibold">{debugData.length}</span></p>
                  <p className="text-gray-300">Students: <span className="text-white font-semibold">{debugData.filter(u => u.role === "student").length}</span></p>
                  <p className="text-gray-300">Pending Students: <span className="text-orange-400 font-semibold">{debugData.filter(u => u.role === "student" && !u.isApproved).length}</span></p>
                  <p className="text-gray-300">Approved Students: <span className="text-green-400 font-semibold">{debugData.filter(u => u.role === "student" && u.isApproved).length}</span></p>
                  <p className="text-gray-300">Your University ({user?.university}): <span className="text-white font-semibold">{debugData.filter(u => u.university === user?.university).length}</span></p>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Universities Found</h3>
                <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                  {Array.from(new Set(debugData.map(u => u.university).filter(Boolean))).map(uni => (
                    <p key={uni} className="text-gray-300">{uni}</p>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">All Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-2 text-gray-300">Name</th>
                      <th className="text-left p-2 text-gray-300">Email</th>
                      <th className="text-left p-2 text-gray-300">Role</th>
                      <th className="text-left p-2 text-gray-300">University</th>
                      <th className="text-left p-2 text-gray-300">Approved</th>
                      <th className="text-left p-2 text-gray-300">Created</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto">
                    {debugData.map(user => (
                      <tr key={user.id} className="border-b border-gray-700/50">
                        <td className="p-2 text-white">{user.name || "No name"}</td>
                        <td className="p-2 text-gray-300">{user.email}</td>
                        <td className="p-2">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-300">{user.university || "Not set"}</td>
                        <td className="p-2">
                          {user.role === "student" ? (
                            <Badge variant={user.isApproved ? "default" : "destructive"}>
                              {user.isApproved ? "Yes" : "No"}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="p-2 text-gray-400">
                          {user.createdAt ? 
                            (user.createdAt.toDate ? 
                              user.createdAt.toDate().toLocaleDateString() : 
                              new Date(user.createdAt).toLocaleDateString()
                            ) : "Unknown"
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
  isMobile = false,
}: {
  students: StudentWithStats[]
  onApprove: (studentId: string, approved: boolean) => void
  onViewDetails: (student: StudentWithStats) => void
  actionLoading: string | null
  isMobile?: boolean
}) {
  const getStatusBadge = (student: StudentWithStats) => {
    if (!student.isApproved) {
      return (
        <Badge variant="secondary" className="bg-amber-900/50 text-amber-200 border-amber-700">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge variant="destructive" className="bg-red-900/50 text-red-200 border-red-700">Low Attendance</Badge>
    }

    return (
      <Badge variant="default" className="bg-green-900/50 text-green-200 border-green-700">
        Active
      </Badge>
    )
  }

  if (students.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">No students found</h3>
          <p className="text-gray-400">No students match your current search and filter criteria.</p>
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    // Mobile-optimized layout
    return (
      <div className="space-y-3">
        {students.map((student) => (
          <Card key={student.id} className="bg-gray-800 border-gray-700 rounded-lg overflow-hidden touch-manipulation">
            <CardContent className="p-0">
              {/* Mobile Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-gray-600">
                    <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
                    <AvatarFallback className="bg-gray-700 text-white text-sm">
                      {student.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-white truncate">{student.name}</h3>
                      {getStatusBadge(student)}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{student.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {student.rollNumber ? `Roll: ${student.rollNumber}` : 
                       student.studentId ? `ID: ${student.studentId}` : "No ID"}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Content */}
              {student.isApproved && (
                <div className="p-4 bg-gray-850">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className={`text-lg font-bold ${student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}`}>
                        {student.attendancePercentage}%
                      </div>
                      <div className="text-xs text-gray-400">Attendance</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">
                        {student.attendedSessions}/{student.totalSessions}
                      </div>
                      <div className="text-xs text-gray-400">Sessions</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {student.lastAttendance ? 
                          student.lastAttendance.toLocaleDateString("en-US", { month: 'short', day: 'numeric' }) : 
                          "Never"}
                      </div>
                      <div className="text-xs text-gray-400">Last Seen</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile Actions */}
              <div className="p-4 bg-gray-800">
                <div className="flex gap-2">
                  {!student.isApproved ? (
                    <>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 font-medium"
                        onClick={() => onApprove(student.id, true)}
                        disabled={actionLoading === student.id}
                      >
                        {actionLoading === student.id ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 font-medium"
                        onClick={() => onApprove(student.id, false)}
                        disabled={actionLoading === student.id}
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
                        onClick={() => onViewDetails(student)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 border-red-600 text-red-400 hover:bg-red-900/50 h-12"
                        onClick={() => onApprove(student.id, false)}
                        disabled={actionLoading === student.id}
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Desktop layout (existing code)
  return (
    <div className="space-y-4">
      {students.map((student) => (
        <Card key={student.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <Avatar className="h-12 w-12 border-2 border-gray-600">
                  <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold truncate text-white">{student.name}</h3>
                    {getStatusBadge(student)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-300 mb-2">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate">
                        {student.rollNumber
                          ? `Roll: ${student.rollNumber}`
                          : student.studentId
                            ? `ID: ${student.studentId}`
                            : "No ID"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{student.university}</span>
                    </div>
                  </div>

                  {student.isApproved && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-300">
                      <div>
                        <span className="font-medium text-gray-200">Attendance:</span>{" "}
                        <span className={student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}>
                          {student.attendancePercentage}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Sessions:</span> {student.attendedSessions}/
                        {student.totalSessions}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">Last Seen:</span>{" "}
                        {student.lastAttendance ? student.lastAttendance.toLocaleDateString() : "Never"}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-400">
                    Joined:{" "}
                    {student.createdAt instanceof Timestamp
                      ? student.createdAt.toDate().toLocaleDateString()
                      : new Date(student.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewDetails(student)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  View Details
                </Button>

                {!student.isApproved ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onApprove(student.id, true)}
                      disabled={actionLoading === student.id}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
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
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600"
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
                    className="text-red-400 border-red-600 hover:bg-red-900/50 hover:text-red-300"
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
      return (
        <Badge variant="secondary" className="bg-amber-900/50 text-amber-200 border-amber-700">
          Pending
        </Badge>
      )
    }

    if (student.attendancePercentage < 75) {
      return <Badge variant="destructive" className="bg-red-900/50 text-red-200 border-red-700">Low Attendance</Badge>
    }

    return (
      <Badge variant="default" className="bg-green-900/50 text-green-200 border-green-700">
        Active
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={student.profilePhoto || "/placeholder.svg"} alt={student.name} />
          <AvatarFallback className="text-lg">
            {student.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold text-white">{student.name}</h2>
          <p className="text-gray-300">{student.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(student)}
            {student.profileComplete && <Badge variant="outline" className="border-gray-600 text-gray-300">Profile Complete</Badge>}
          </div>
        </div>
      </div>

      {/* Student Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Student ID:</span>
              <span className="text-gray-200">{student.studentId || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Roll Number:</span>
              <span className="text-gray-200">{student.rollNumber || "Not provided"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">University:</span>
              <span className="text-gray-200">{student.university}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Joined:</span>
              <span className="text-gray-200">
                {student.createdAt instanceof Timestamp
                  ? student.createdAt.toDate().toLocaleDateString()
                  : new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Status:</span>
              <span className="text-gray-200">{student.isApproved ? "Approved" : "Pending Approval"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Attendance Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Total Sessions:</span>
              <span className="text-gray-200">{student.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Attended:</span>
              <span className="text-gray-200">{student.attendedSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Attendance Rate:</span>
              <span className={`font-bold ${student.attendancePercentage >= 75 ? "text-green-400" : "text-red-400"}`}>
                {student.attendancePercentage}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-300">Last Attendance:</span>
              <span className="text-gray-200">{student.lastAttendance ? student.lastAttendance.toLocaleDateString() : "Never"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Progress */}
      {student.isApproved && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Attendance Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Progress to 75% minimum</span>
                <span className="text-gray-200">{student.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    student.attendancePercentage >= 75 ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(student.attendancePercentage, 100)}%` }}
                />
              </div>
              {student.attendancePercentage < 75 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-300">Below minimum attendance requirement (75%)</p>
                </div>
              )}
              {student.attendancePercentage >= 75 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-900/30 border border-green-700/50 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <p className="text-sm text-green-300">Meeting attendance requirements</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
