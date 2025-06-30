import { type NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { uploadPDF } from "@/lib/cloudinary"
import { Timestamp } from "firebase-admin/firestore"
import type { User } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { classId, startDate, endDate } = await request.json()

    // Verify admin authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Check if user is admin
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get class information
    const classDoc = await adminDb.collection("classes").doc(classId).get()
    if (!classDoc.exists) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    const classData = classDoc.data()

    // Query attendance records
    let query = adminDb.collection("attendance").where("classId", "==", classId).orderBy("timestamp", "desc")

    if (startDate) {
      const startTimestamp = Timestamp.fromDate(new Date(startDate))
      query = query.where("timestamp", ">=", startTimestamp)
    }
    if (endDate) {
      const endTimestamp = Timestamp.fromDate(new Date(endDate))
      query = query.where("timestamp", "<=", endTimestamp)
    }

    const attendanceSnapshot = await query.get()

    // Get student information
    const studentIds = [...new Set(attendanceSnapshot.docs.map((doc) => doc.data().studentId))]
    const studentsData = await Promise.all(
      studentIds.map(async (id) => {
        const studentDoc = await adminDb.collection("users").doc(id).get()
        if (studentDoc.exists) {
          return { id, ...studentDoc.data() } as User & { id: string }
        }
        return null
      }),
    )

    const studentsMap = new Map(
      studentsData
        .filter((student): student is User & { id: string } => student !== null)
        .map((student) => [student.id, student])
    )

    // Prepare CSV data
    const csvData = attendanceSnapshot.docs.map((doc) => {
      const data = doc.data()
      const student = studentsMap.get(data.studentId)

      // Handle timestamp conversion safely
      let date = "N/A"
      let time = "N/A"
      try {
        if (data.timestamp) {
          const timestampDate = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
          date = timestampDate.toLocaleDateString()
          time = timestampDate.toLocaleTimeString()
        }
      } catch (error) {
        console.error("Error converting timestamp:", error)
      }

      return {
        studentName: student?.name || "Unknown Student",
        rollNumber: student?.rollNumber || student?.studentId || "N/A",
        email: student?.email || "N/A",
        date,
        time,
        status: data.status || "absent",
        sessionId: data.sessionId || "N/A",
        deviceInfo: data.deviceInfo || "N/A",
      }
    })

    // Create CSV content manually (without csv-writer)
    const csvHeaders = ["Student Name", "Roll Number", "Email", "Date", "Time", "Status", "Session ID", "Device Info"]
    const csvRows = csvData.map((row) => [
      `"${row.studentName}"`,
      `"${row.rollNumber}"`,
      `"${row.email}"`,
      `"${row.date}"`,
      `"${row.time}"`,
      `"${row.status}"`,
      `"${row.sessionId}"`,
      `"${row.deviceInfo}"`,
    ])

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    // Convert CSV content to buffer
    const csvBuffer = Buffer.from(csvContent, "utf-8")

    // Upload to Cloudinary
    const className = classData?.name || "Unknown Class"
    const safeClassName = className.replace(/[^a-zA-Z0-9-_]/g, "-") // Replace special chars with hyphens
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `attendance-${safeClassName}-${dateStr}`
    const downloadUrl = await uploadPDF(csvBuffer, filename)

    return NextResponse.json({
      success: true,
      downloadUrl,
      recordCount: csvData.length,
      className: classData?.name || "Unknown Class",
      dateRange: {
        start: startDate || "All time",
        end: endDate || "All time"
      },
      exportedAt: new Date().toISOString(),
      filename: `${filename}.csv`
    })
  } catch (error) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
