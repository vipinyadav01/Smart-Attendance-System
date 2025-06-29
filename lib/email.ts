import { Resend } from "resend"

// Types for better type safety
interface EmailResponse {
  success: boolean
  message?: string
  data?: any
}

interface AttendanceEmailData {
  to: string
  studentName: string
  className: string
  timestamp: Date
}

interface ApprovalEmailData {
  to: string
  studentName: string
  isApproved: boolean
}

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "Attendance System <noreply@yourdomain.com>",
  domain: process.env.DOMAIN || "yourdomain.com"
} as const

// Modern email template utilities
const createEmailWrapper = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f9fafb;
    }
    
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 32px 40px;
      text-align: center;
    }
    
    .header h1 {
      color: white;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    
    .content {
      padding: 40px;
    }
    
    .greeting {
      font-size: 16px;
      margin-bottom: 24px;
      color: #111827;
    }
    
    .highlight-box {
      background: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .highlight-box.success {
      background: #ecfdf5;
      border-left-color: #10b981;
    }
    
    .highlight-box.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    
    .detail-item {
      margin: 12px 0;
      font-size: 15px;
    }
    
    .detail-label {
      font-weight: 600;
      color: #374151;
    }
    
    .detail-value {
      color: #6b7280;
    }
    
    .footer {
      background: #f9fafb;
      padding: 32px 40px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    
    @media (max-width: 640px) {
      .container {
        margin: 20px;
        border-radius: 8px;
      }
      
      .header, .content, .footer {
        padding: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from the Attendance System.</p>
      <p>© ${new Date().getFullYear()} Attendance System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`

const createAttendanceTemplate = (data: AttendanceEmailData) => {
  const content = `
    <p class="greeting">Hello ${data.studentName},</p>
    <p>Your attendance has been successfully recorded! ✅</p>
    
    <div class="highlight-box">
      <div class="detail-item">
        <span class="detail-label">Class:</span>
        <span class="detail-value">${data.className}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date & Time:</span>
        <span class="detail-value">${data.timestamp.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}</span>
      </div>
    </div>
    
    <p>Thank you for attending your class. Keep up the great work! 🎓</p>
  `
  
  return createEmailWrapper(content, "Attendance Confirmed")
}

const createApprovalTemplate = (data: ApprovalEmailData) => {
  const { studentName, isApproved } = data
  const title = isApproved ? "Account Approved! 🎉" : "Registration Received"
  const status = isApproved ? "approved" : "received and is under review"
  
  const content = `
    <p class="greeting">Hello ${studentName},</p>
    <p>Your account registration has been ${status}.</p>
    
    ${isApproved 
      ? `<div class="highlight-box success">
           <p style="color: #065f46; margin: 0; font-weight: 500;">
             🎉 <strong>Congratulations! You can now access all features of the attendance system.</strong>
           </p>
         </div>
         <p>You can now:</p>
         <ul style="margin: 16px 0; padding-left: 20px;">
           <li>Mark your attendance using QR codes</li>
           <li>View your attendance history</li>
           <li>Access class schedules and materials</li>
         </ul>`
      : `<div class="highlight-box warning">
           <p style="color: #92400e; margin: 0; font-weight: 500;">
             ⏳ <strong>Please wait for admin approval to access the system.</strong>
           </p>
         </div>
         <p>What happens next:</p>
         <ul style="margin: 16px 0; padding-left: 20px;">
           <li>An administrator will review your registration</li>
           <li>You'll receive another email when approved</li>
           <li>This process typically takes 1-2 business days</li>
         </ul>`
    }
    
    <p>If you have any questions, please don't hesitate to contact our support team.</p>
  `
  
  return createEmailWrapper(content, title)
}

// Enhanced error logging
const logEmailError = (context: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`[EMAIL_ERROR] ${context}:`, {
    message: errorMessage,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined
  })
}

export async function sendAttendanceConfirmation(
  to: string, 
  studentName: string, 
  className: string, 
  timestamp: Date
): Promise<EmailResponse> {
  if (!resend) {
    const message = "Resend API key not configured. Email notification skipped."
    console.warn(`[EMAIL_WARNING] ${message}`)
    return { success: false, message }
  }

  // Validate inputs
  if (!to || !studentName || !className || !timestamp) {
    const message = "Missing required parameters for attendance confirmation email"
    console.error(`[EMAIL_ERROR] ${message}`)
    return { success: false, message }
  }

  try {
    const emailData: AttendanceEmailData = { to, studentName, className, timestamp }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject: `✅ Attendance Confirmed - ${className}`,
      html: createAttendanceTemplate(emailData),
    })

    if (error) {
      logEmailError("Resend API error during attendance confirmation", error)
      return { success: false, message: error.message }
    }

    console.log(`[EMAIL_SUCCESS] Attendance confirmation sent to ${to}`, { emailId: data?.id })
    return { success: true, data }
  } catch (error) {
    logEmailError("Unexpected error sending attendance confirmation", error)
    return { success: false, message: "Failed to send email notification" }
  }
}

export async function sendApprovalNotification(
  to: string, 
  studentName: string, 
  isApproved: boolean
): Promise<EmailResponse> {
  if (!resend) {
    const message = "Resend API key not configured. Email notification skipped."
    console.warn(`[EMAIL_WARNING] ${message}`)
    return { success: false, message }
  }

  // Validate inputs
  if (!to || !studentName || typeof isApproved !== 'boolean') {
    const message = "Missing required parameters for approval notification email"
    console.error(`[EMAIL_ERROR] ${message}`)
    return { success: false, message }
  }

  try {
    const emailData: ApprovalEmailData = { to, studentName, isApproved }
    const subject = isApproved 
      ? `🎉 Account Approved - Welcome to Attendance System!` 
      : `📋 Registration Received - Pending Approval`

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject,
      html: createApprovalTemplate(emailData),
    })

    if (error) {
      logEmailError("Resend API error during approval notification", error)
      return { success: false, message: error.message }
    }

    const action = isApproved ? "approval" : "registration confirmation"
    console.log(`[EMAIL_SUCCESS] Account ${action} sent to ${to}`, { emailId: data?.id })
    return { success: true, data }
  } catch (error) {
    logEmailError("Unexpected error sending approval notification", error)
    return { success: false, message: "Failed to send email notification" }
  }
}
