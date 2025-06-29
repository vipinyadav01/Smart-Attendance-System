import { type NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { uploadPDF } from "@/lib/cloudinary"

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
      query = query.where("timestamp", ">=", new Date(startDate))
    }
    if (endDate) {
      query = query.where("timestamp", "<=", new Date(endDate))
    }

    const attendanceSnapshot = await query.get()

    // Get student information
    const studentIds = [...new Set(attendanceSnapshot.docs.map((doc) => doc.data().studentId))]
    const studentsData = await Promise.all(
      studentIds.map(async (id) => {
        const studentDoc = await adminDb.collection("users").doc(id).get()
        return { id, ...studentDoc.data() }
      }),
    )

    const studentsMap = new Map(studentsData.map((student) => [student.id, student]))

    // Prepare CSV data
    const csvData = attendanceSnapshot.docs.map((doc) => {
      const data = doc.data()
      const student = studentsMap.get(data.studentId)

      return {
        studentName: student?.name || "Unknown",
        rollNumber: student?.rollNumber || "N/A",
        date: new Date(data.timestamp.toDate()).toLocaleDateString(),
        time: new Date(data.timestamp.toDate()).toLocaleTimeString(),
        status: data.status,
        sessionId: data.sessionId,
      }
    })

    // Create CSV content manually (without csv-writer)
    const csvHeaders = ["Student Name", "Roll Number", "Date", "Time", "Status", "Session ID"]
    const csvRows = csvData.map((row) => [
      `"${row.studentName}"`,
      `"${row.rollNumber}"`,
      `"${row.date}"`,
      `"${row.time}"`,
      `"${row.status}"`,
      `"${row.sessionId}"`,
    ])

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    // Convert CSV content to buffer
    const csvBuffer = Buffer.from(csvContent, "utf-8")

    // Upload to Cloudinary
    const filename = `attendance-${classData?.name || classId}-${new Date().toISOString().split("T")[0]}`
    const downloadUrl = await uploadPDF(csvBuffer, filename)

    return NextResponse.json({
      success: true,
      downloadUrl,
      recordCount: csvData.length,
    })
  } catch (error) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
