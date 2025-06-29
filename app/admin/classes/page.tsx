"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Class, User } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Edit, Trash2, Users, Calendar, Clock, BookOpen, Filter, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

interface ClassFormData {
  name: string
  description: string
  schedule: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }[]
}

export default function AdminClassesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [formData, setFormData] = useState<ClassFormData>({
    name: "",
    description: "",
    schedule: [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
  })
  const [submitting, setSubmitting] = useState(false)

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
    fetchStudents()
  }, [user, router])

  const fetchClasses = async () => {
    try {
      if (!user) return

      const classesQuery = query(
        collection(db, "classes"),
        where("universityId", "==", user.university),
        orderBy("createdAt", "desc"),
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
        description: "Failed to fetch classes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      if (!user) return

      const studentsQuery = query(
        collection(db, "users"),
        where("university", "==", user.university),
        where("role", "==", "student"),
        where("isApproved", "==", true),
      )

      const snapshot = await getDocs(studentsQuery)
      const studentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]

      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  const handleCreateClass = async () => {
    if (!user || !formData.name.trim()) return

    setSubmitting(true)
    try {
      const classData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        instructor: user.name,
        instructorId: user.id,
        university: user.university,
        universityId: user.university,
        schedule: formData.schedule,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await addDoc(collection(db, "classes"), classData)

      toast({
        title: "Success",
        description: "Class created successfully",
      })

      setIsCreateDialogOpen(false)
      resetForm()
      fetchClasses()
    } catch (error) {
      console.error("Error creating class:", error)
      toast({
        title: "Error",
        description: "Failed to create class",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClass = async () => {
    if (!editingClass || !formData.name.trim()) return

    setSubmitting(true)
    try {
      const classRef = doc(db, "classes", editingClass.id)
      await updateDoc(classRef, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        schedule: formData.schedule,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Class updated successfully",
      })

      setIsEditDialogOpen(false)
      setEditingClass(null)
      resetForm()
      fetchClasses()
    } catch (error) {
      console.error("Error updating class:", error)
      toast({
        title: "Error",
        description: "Failed to update class",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClass = async (classId: string) => {
    try {
      await deleteDoc(doc(db, "classes", classId))

      toast({
        title: "Success",
        description: "Class deleted successfully",
      })

      fetchClasses()
    } catch (error) {
      console.error("Error deleting class:", error)
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive",
      })
    }
  }

  const handleToggleStatus = async (classItem: Class) => {
    try {
      const classRef = doc(db, "classes", classItem.id)
      await updateDoc(classRef, {
        isActive: !classItem.isActive,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: `Class ${classItem.isActive ? "deactivated" : "activated"} successfully`,
      })

      fetchClasses()
    } catch (error) {
      console.error("Error updating class status:", error)
      toast({
        title: "Error",
        description: "Failed to update class status",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (classItem: Class) => {
    setEditingClass(classItem)
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      schedule: classItem.schedule,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      schedule: [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
    })
  }

  const addScheduleSlot = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
    }))
  }

  const removeScheduleSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index),
    }))
  }

  const updateScheduleSlot = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    }))
  }

  const formatSchedule = (schedule: Class["schedule"]) => {
    return schedule
      .map((slot) => {
        const day = DAYS_OF_WEEK.find((d) => d.value === slot.dayOfWeek)?.label
        return `${day} ${slot.startTime}-${slot.endTime}`
      })
      .join(", ")
  }

  const getEnrolledStudentsCount = (classId: string) => {
    // This would typically come from enrollment data
    return Math.floor(Math.random() * 50) + 10
  }

  const filteredClasses = classes.filter((classItem) => {
    const matchesSearch =
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && classItem.isActive) ||
      (filterStatus === "inactive" && !classItem.isActive)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-800 rounded-full animate-spin border-t-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Class Management</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your classes and schedules</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>Add a new class to your university</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Class Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Computer Science 101"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Class description..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Schedule</Label>
                  <div className="space-y-3">
                    {formData.schedule.map((slot, index) => (
                      <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-800 rounded-lg">
                        <Select
                          value={slot.dayOfWeek.toString()}
                          onValueChange={(value) => updateScheduleSlot(index, "dayOfWeek", Number.parseInt(value))}
                        >
                          <SelectTrigger className="w-full sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateScheduleSlot(index, "startTime", e.target.value)}
                            className="flex-1 sm:w-24"
                          />
                          <span className="text-gray-400">to</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateScheduleSlot(index, "endTime", e.target.value)}
                            className="flex-1 sm:w-24"
                          />
                        </div>
                        {formData.schedule.length > 1 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => removeScheduleSlot(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addScheduleSlot} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Schedule Slot
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleCreateClass} disabled={submitting || !formData.name.trim()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                  {submitting ? "Creating..." : "Create Class"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-40 bg-gray-800 border-gray-700 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{classes.length}</p>
                </div>
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800 hover:border-green-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Active</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{classes.filter((c) => c.isActive).length}</p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800 hover:border-purple-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Students</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">{students.length}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800 hover:border-orange-500/30 transition-colors duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400">Avg</p>
                  <p className="text-lg sm:text-2xl font-bold text-white">
                    {classes.length > 0 ? Math.round(students.length / classes.length) : 0}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-colors duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-white truncate">{classItem.name}</CardTitle>
                    <CardDescription className="mt-1 text-gray-400 text-sm">
                      {classItem.description || "No description provided"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem onClick={() => openEditDialog(classItem)} className="text-white hover:bg-gray-700">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(classItem)} className="text-white hover:bg-gray-700">
                        {classItem.isActive ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete Class</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-400">
                              Are you sure you want to delete "{classItem.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClass(classItem.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={classItem.isActive ? "default" : "secondary"} className={classItem.isActive ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-gray-600/20 text-gray-400 border-gray-600/30"}>
                    {classItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-sm text-gray-400">{getEnrolledStudentsCount(classItem.id)} students</span>
                </div>

                <div className="border-t border-gray-800 pt-3 space-y-2">
                  <div className="flex items-center text-sm text-gray-300">
                    <Users className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{classItem.instructor}</span>
                  </div>
                  <div className="flex items-start text-sm text-gray-300">
                    <Calendar className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="break-words">{formatSchedule(classItem.schedule)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 text-xs"
                    onClick={() => router.push(`/admin/classes/${classItem.id}`)}
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                    onClick={() => router.push(`/admin/generate-qr?classId=${classItem.id}`)}
                  >
                    QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">No classes found</h3>
              <p className="text-gray-400 mb-4">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by creating your first class"}
              </p>
              {!searchTerm && filterStatus === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Class</DialogTitle>
              <DialogDescription className="text-gray-400">Update class information and schedule</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name" className="text-white">Class Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Computer Science 101"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-white">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Class description..."
                  rows={3}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Schedule</Label>
                <div className="space-y-3">
                  {formData.schedule.map((slot, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-800 rounded-lg">
                      <Select
                        value={slot.dayOfWeek.toString()}
                        onValueChange={(value) => updateScheduleSlot(index, "dayOfWeek", Number.parseInt(value))}
                      >
                        <SelectTrigger className="w-full sm:w-32 bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateScheduleSlot(index, "startTime", e.target.value)}
                          className="flex-1 sm:w-24 bg-gray-700 border-gray-600 text-white"
                        />
                        <span className="text-gray-400">to</span>
                        <Input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateScheduleSlot(index, "endTime", e.target.value)}
                          className="flex-1 sm:w-24 bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      {formData.schedule.length > 1 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removeScheduleSlot(index)} className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addScheduleSlot} className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Schedule Slot
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                Cancel
              </Button>
              <Button onClick={handleEditClass} disabled={submitting || !formData.name.trim()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                {submitting ? "Updating..." : "Update Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
