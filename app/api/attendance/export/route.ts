import { type NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { User } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { classId, startDate, endDate, status } = await request.json()

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

    // Prepare CSV data with status filtering
    let attendanceRecords = attendanceSnapshot.docs.map((doc) => {
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

    // Apply status filter if specified
    if (status && status !== "all") {
      attendanceRecords = attendanceRecords.filter((record) => record.status === status)
    }

    // Create CSV content
    const csvHeaders = ["Student Name", "Roll Number", "Email", "Date", "Time", "Status", "Session ID", "Device Info"]
    const csvRows = attendanceRecords.map((row) => [
      `"${row.studentName}"`,
      `"${row.rollNumber}"`,
      `"${row.email}"`,
      `"${row.date}"`,
      `"${row.time}"`,
      `"${row.status}"`,
      `"${row.sessionId}"`,
      `"${row.deviceInfo}"`,
    ])

    const csvData = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    return NextResponse.json({
      success: true,
      csvData,
      recordCount: attendanceRecords.length,
      className: classData?.name || "Unknown Class",
      dateRange: {
        start: startDate || "All time",
        end: endDate || "All time"
      },
      statusFilter: status || "all",
      exportedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
