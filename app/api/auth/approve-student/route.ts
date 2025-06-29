import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/email"

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
      if (approved) {
        await sendEmail({
          to: studentData.email,
          subject: "Account Approved - Attendance System",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Account Approved!</h2>
              <p>Dear ${studentData.name},</p>
              <p>Your account has been approved and you can now access the attendance system.</p>
              <p>You can now:</p>
              <ul>
                <li>Scan QR codes to mark attendance</li>
                <li>View your attendance history</li>
                <li>Access your student dashboard</li>
              </ul>
              <p>Welcome to the attendance system!</p>
              <p>Best regards,<br>The Attendance System Team</p>
            </div>
          `,
        })
      } else {
        await sendEmail({
          to: studentData.email,
          subject: "Account Status Update - Attendance System",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Account Status Update</h2>
              <p>Dear ${studentData.name},</p>
              <p>We regret to inform you that your account application has not been approved at this time.</p>
              <p>If you believe this is an error or would like to reapply, please contact your administrator.</p>
              <p>Best regards,<br>The Attendance System Team</p>
            </div>
          `,
        })
      }
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
