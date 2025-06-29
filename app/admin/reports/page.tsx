"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Download, FileText, CalendarIcon, Filter, BarChart3, Users, TrendingUp, Clock } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ReportFilters {
  classId: string
  startDate: Date | undefined
  endDate: Date | undefined
  status: string
}

interface ClassOption {
  id: string
  name: string
  code: string
}

interface ReportStats {
  totalRecords: number
  presentCount: number
  lateCount: number
  absentCount: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [filters, setFilters] = useState<ReportFilters>({
    classId: "",
    startDate: undefined,
    endDate: undefined,
    status: "all",
  })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalRecords: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
  })

  useEffect(() => {
    if (!user) {
      router.push("/auth/signin")
      return
    }

    if (user.role !== "admin") {
      router.push("/student/dashboard")
      return
    }

    fetchClasses()
  }, [user, router])

  useEffect(() => {
    if (filters.classId) {
      fetchReportStats()
    } else {
      // Reset stats when no class is selected
      setReportStats({
        totalRecords: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
      })
    }
  }, [filters])

  const fetchClasses = async () => {
    if (!user) return

    try {
      setLoading(true)
      const classesQuery = query(collection(db, "classes"), where("universityId", "==", user.university))
      const classesSnapshot = await getDocs(classesQuery)

      const classesData = classesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClassOption[]

      setClasses(classesData)
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({
        title: "Error",
        description: "Failed to fetch classes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchReportStats = async () => {
    if (!filters.classId) return

    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("classId", "==", filters.classId),
        orderBy("timestamp", "desc"),
      )

      const attendanceSnapshot = await getDocs(attendanceQuery)
      const records = attendanceSnapshot.docs.map((doc) => doc.data())

      // Apply date filters
      let filteredRecords = records
      if (filters.startDate) {
        filteredRecords = filteredRecords.filter((record) => {
          const recordDate = record.timestamp?.toDate ? record.timestamp.toDate() : new Date(record.timestamp)
          return recordDate >= filters.startDate!
        })
      }
      if (filters.endDate) {
        filteredRecords = filteredRecords.filter((record) => {
          const recordDate = record.timestamp?.toDate ? record.timestamp.toDate() : new Date(record.timestamp)
          return recordDate <= filters.endDate!
        })
      }

      // Apply status filter
      if (filters.status !== "all") {
        filteredRecords = filteredRecords.filter((record) => record.status === filters.status)
      }

      const stats: ReportStats = {
        totalRecords: filteredRecords.length,
        presentCount: filteredRecords.filter((r) => r.status === "present").length,
        lateCount: filteredRecords.filter((r) => r.status === "late").length,
        absentCount: filteredRecords.filter((r) => r.status === "absent").length,
      }

      setReportStats(stats)
    } catch (error) {
      console.error("Error fetching report stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch report statistics",
        variant: "destructive",
      })
    }
  }

  const exportReport = async () => {
    if (!filters.classId) {
      toast({
        title: "Error",
        description: "Please select a class to export",
        variant: "destructive",
      })
      return
    }

    setExporting(true)

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/attendance/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: filters.classId,
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
          status: filters.status !== "all" ? filters.status : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to export report")
      }

      const data = await response.json()

      // Create and download the CSV file
      if (data.csvData) {
        const blob = new Blob([data.csvData], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `attendance-report-${filters.classId}-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: "Success",
        description: `Report exported successfully (${data.recordCount || reportStats.totalRecords} records)`,
      })
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to export report",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const getSelectedClassName = () => {
    const selectedClass = classes.find((c) => c.id === filters.classId)
    return selectedClass?.name || "Unknown Class"
  }

  const getPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-800 rounded-full animate-spin border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Attendance Reports</h1>
              <p className="text-sm text-gray-400">Generate and export attendance reports</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push("/admin/dashboard")}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Filters */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Filter className="h-5 w-5 text-blue-400" />
                  Report Filters
                </CardTitle>
                <CardDescription className="text-gray-400">Configure your report parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-white">Select Class</Label>
                  <Select
                    value={filters.classId}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, classId: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="text-white hover:bg-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium">{cls.name}</span>
                            <span className="text-xs text-gray-400">{cls.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Date Range</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
                            !filters.startDate && "text-gray-400",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, "PPP") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                        <Calendar
                          mode="single"
                          selected={filters.startDate}
                          onSelect={(date) => setFilters((prev) => ({ ...prev, startDate: date }))}
                          initialFocus
                          className="bg-gray-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
                            !filters.endDate && "text-gray-400",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.endDate ? format(filters.endDate, "PPP") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                        <Calendar
                          mode="single"
                          selected={filters.endDate}
                          onSelect={(date) => setFilters((prev) => ({ ...prev, endDate: date }))}
                          initialFocus
                          className="bg-gray-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white">Attendance Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                      <SelectItem value="present" className="text-white hover:bg-gray-700">Present Only</SelectItem>
                      <SelectItem value="late" className="text-white hover:bg-gray-700">Late Only</SelectItem>
                      <SelectItem value="absent" className="text-white hover:bg-gray-700">Absent Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <Button 
                    onClick={exportReport} 
                    disabled={!filters.classId || exporting} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-colors duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Total</p>
                      <p className="text-lg sm:text-2xl font-bold text-white">{reportStats.totalRecords}</p>
                    </div>
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 hover:border-green-500/30 transition-colors duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Present</p>
                      <p className="text-lg sm:text-2xl font-bold text-green-400">{reportStats.presentCount}</p>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {getPercentage(reportStats.presentCount, reportStats.totalRecords)}%
                      </p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 hover:border-yellow-500/30 transition-colors duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Late</p>
                      <p className="text-lg sm:text-2xl font-bold text-yellow-400">{reportStats.lateCount}</p>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {getPercentage(reportStats.lateCount, reportStats.totalRecords)}%
                      </p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800 hover:border-red-500/30 transition-colors duration-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-400">Absent</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-400">{reportStats.absentCount}</p>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {getPercentage(reportStats.absentCount, reportStats.totalRecords)}%
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Report Preview</CardTitle>
                <CardDescription className="text-gray-400">
                  {filters.classId
                    ? `Showing data for ${getSelectedClassName()}`
                    : "Select a class to preview report data"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filters.classId ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <h4 className="font-medium mb-3 text-white">Attendance Distribution</h4>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-sm text-gray-400">Present</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${getPercentage(reportStats.presentCount, reportStats.totalRecords)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-white w-6">{reportStats.presentCount}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-sm text-gray-400">Late</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${getPercentage(reportStats.lateCount, reportStats.totalRecords)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-white w-6">{reportStats.lateCount}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-sm text-gray-400">Absent</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${getPercentage(reportStats.absentCount, reportStats.totalRecords)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-white w-6">{reportStats.absentCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-3 text-white">Report Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                            <span className="text-gray-400">Class:</span>
                            <span className="font-medium text-white break-words">{getSelectedClassName()}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                            <span className="text-gray-400">Date Range:</span>
                            <span className="font-medium text-white text-right">
                              {filters.startDate && filters.endDate
                                ? `${format(filters.startDate, "MMM dd")} - ${format(filters.endDate, "MMM dd")}`
                                : filters.startDate
                                  ? `From ${format(filters.startDate, "MMM dd")}`
                                  : filters.endDate
                                    ? `Until ${format(filters.endDate, "MMM dd")}`
                                    : "All dates"}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                            <span className="text-gray-400">Status Filter:</span>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 w-fit">
                              {filters.status === "all" ? "All Status" : filters.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                            <span className="text-gray-400">Total Records:</span>
                            <span className="font-medium text-white">{reportStats.totalRecords}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {reportStats.totalRecords > 0 && (
                      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-400 mb-2">Export Information</h4>
                        <p className="text-sm text-gray-300">
                          The CSV export will include student names, roll numbers, dates, times, and attendance status.
                          Profile photos are not included in exports for privacy and file size considerations.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a class to preview report data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
