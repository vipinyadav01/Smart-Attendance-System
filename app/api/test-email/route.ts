import { NextRequest, NextResponse } from "next/server"
import { sendApprovalNotification } from "@/lib/email"

export async function GET(request: NextRequest) {
  try {
    // Check if this is an admin request (basic check)
    const searchParams = request.nextUrl.searchParams
    const testEmail = searchParams.get("email")
    
    if (!testEmail) {
      return NextResponse.json({
        error: "Please provide an email parameter: ?email=your@email.com"
      }, { status: 400 })
    }
    
    console.log("[EMAIL_TEST] Testing email with:", {
      email: testEmail,
      hasResendKey: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.EMAIL_FROM || "qrollcall@gmail.com"
    })
    
    // Test sending approval email
    const result = await sendApprovalNotification(
      testEmail,
      "Test Student", 
      true
    )
    
    return NextResponse.json({
      success: result.success,
      message: result.message || "Email test completed",
      emailSent: result.success,
      testEmail,
      environment: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.EMAIL_FROM || "qrollcall@gmail.com",
        nodeEnv: process.env.NODE_ENV
      }
    })
  } catch (error: any) {
    console.error("[EMAIL_TEST] Test failed:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      environment: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.EMAIL_FROM || "qrollcall@gmail.com",
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 })
  }
} 