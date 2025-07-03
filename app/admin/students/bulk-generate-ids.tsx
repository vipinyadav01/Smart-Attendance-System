"use client"

import { useState } from "react"
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { studentIdGenerator } from "@/lib/student-id-generator"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function BulkGenerateIds({ universityId }: { universityId: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const bulkGenerateStudentIds = async () => {
    setLoading(true)
    try {
      // Get all students without student IDs
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("university", "==", universityId)
      )
      const snapshot = await getDocs(studentsQuery)
      
      const studentsWithoutIds = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(student => !student.studentId)

      if (studentsWithoutIds.length === 0) {
        toast({
          title: "No Action Needed",
          description: "All students already have student IDs",
        })
        return
      }

      // Generate IDs for all students
      const batch = writeBatch(db)
      let successCount = 0

      for (const student of studentsWithoutIds) {
        try {
          const result = await studentIdGenerator.generateStudentId({
            strategy: 'hybrid',
            university: universityId,
            studentName: student.name,
            admissionYear: new Date().getFullYear()
          })

          if (result.isUnique) {
            const studentRef = doc(db, "users", student.id)
            batch.update(studentRef, {
              studentId: result.studentId,
              updatedAt: new Date()
            })
            successCount++
          }
        } catch (error) {
          console.error(`Failed to generate ID for ${student.name}:`, error)
        }
      }

      await batch.commit()

      toast({
        title: "Bulk Generation Complete",
        description: `Generated student IDs for ${successCount}/${studentsWithoutIds.length} students`,
      })
    } catch (error) {
      console.error("Bulk generation error:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate student IDs in bulk",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={bulkGenerateStudentIds}
      disabled={loading}
      className="bg-purple-600 hover:bg-purple-700"
    >
      {loading ? "Generating..." : "Bulk Generate Student IDs"}
    </Button>
  )
} 