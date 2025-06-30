import { type NextRequest, NextResponse } from "next/server"

import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendApprovalNotification } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization header missing or invalid format" }, 
        { status: 401 }
      )
    }

    const token = authHeader.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json(
        { error: "No token provided" }, 
        { status: 401 }
      )
    }

    // Verify the token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (tokenError) {
      console.error("Token verification failed:", tokenError)
      return NextResponse.json(
        { error: "Invalid or expired token" }, 
        { status: 401 }
      )
    }

    // Get admin user data
    const adminDocRef = adminDb.collection("users").doc(decodedToken.uid)
    const adminDoc = await adminDocRef.get()
    
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "Admin user not found" }, 
        { status: 404 }
      )
    }

    const adminData = adminDoc.data()
    if (!adminData || adminData.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" }, 
        { status: 403 }
      )
    }

    // Parse and validate request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      )
    }

    const { studentId, approved } = requestBody

    // Validate required fields
    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { error: "Student ID is required and must be a string" }, 
        { status: 400 }
      )
    }

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "Approved status must be a boolean value" }, 
        { status: 400 }
      )
    }

    // Get student data
    const studentDocRef = adminDb.collection("users").doc(studentId)
    const studentDoc = await studentDocRef.get()
    
    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: "Student not found" }, 
        { status: 404 }
      )
    }

    const studentData = studentDoc.data()
    if (!studentData) {
      return NextResponse.json(
        { error: "Student data is corrupted" }, 
        { status: 500 }
      )
    }

    if (studentData.role !== "student") {
      return NextResponse.json(
        { error: "The specified user is not a student" }, 
        { status: 400 }
      )
    }

    // Check if student is already approved (to prevent unnecessary updates)
    if (approved && studentData.isApproved === true) {
      return NextResponse.json({
        success: true,
        message: "Student is already approved",
        alreadyApproved: true
      })
    }

    // Validate required student data for approval
    if (approved) {
      if (!studentData.name || !studentData.email) {
        return NextResponse.json(
          { error: "Student profile is incomplete. Name and email are required for approval." }, 
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      isApproved: approved,
      updatedAt: new Date(),
      approvedBy: decodedToken.uid,
    }

    if (approved) {
      updateData.approvedAt = new Date()
    } else {
      // If rejecting, we might want to remove approval date
      updateData.approvedAt = null
    }

    // Update student approval status
    await studentDocRef.update(updateData)

    // Send email notification
    let emailSent = false
    let emailError = null
    
    if (studentData.email && studentData.name) {
      try {
        const emailResult = await sendApprovalNotification(
          studentData.email, 
          studentData.name, 
          approved
        )
        emailSent = emailResult.success
        if (!emailResult.success) {
          emailError = emailResult.message
        }
      } catch (error) {
        console.error("Failed to send email notification:", error)
        emailError = error instanceof Error ? error.message : "Unknown email error"
      }
    }

    // Prepare response
    const actionText = approved ? "approved" : "rejected"
    const response: any = {
      success: true,
      message: `Student ${actionText} successfully`,
      studentId,
      approved,
      emailSent,
      updatedAt: updateData.updatedAt,
    }

    if (emailError) {
      response.emailError = emailError
      response.warning = "Approval updated but email notification failed"
    }

    console.log(`[APPROVAL_SUCCESS] Student ${studentId} ${actionText} by admin ${decodedToken.uid}`, {
      emailSent,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error("Error in approve-student API:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    // Return appropriate error response
    const statusCode = error.code === 'permission-denied' ? 403 : 500
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}
