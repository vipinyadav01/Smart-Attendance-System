import { type NextRequest, NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendApprovalNotification } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get admin user data
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { studentId, approved } = await request.json()

    if (!studentId || typeof approved !== "boolean") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Get student data
    const studentDoc = await adminDb.collection("users").doc(studentId).get()
    if (!studentDoc.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const studentData = studentDoc.data()
    if (studentData?.role !== "student") {
      return NextResponse.json({ error: "Invalid student" }, { status: 400 })
    }

    // Update student approval status
    await adminDb.collection("users").doc(studentId).update({
      isApproved: approved,
      updatedAt: new Date(),
      approvedBy: decodedToken.uid,
      approvedAt: new Date(),
    })

    // Send email notification
    try {
      await sendApprovalNotification(
        studentData.email, 
        studentData.name, 
        approved
      )
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Student ${approved ? "approved" : "rejected"} successfully`,
    })
  } catch (error: any) {
    console.error("Error in approve-student API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
