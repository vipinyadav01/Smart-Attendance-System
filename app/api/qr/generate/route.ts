import { type NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { generateQRCode, type QRData } from "@/lib/qr-utils";
import { generateSessionId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { classId, location } = await request.json();

    // Validate input
    if (!classId || !location?.latitude || !location?.longitude) {
      return NextResponse.json({ error: "Missing classId or location data" }, { status: 400 });
    }

    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log("Decoded token:", decodedToken);

    // Check if user is admin
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    console.log("Admin doc:", adminDoc.data());
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify class exists
    const classDoc = await adminDb.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Generate session ID and QR data
    const sessionId = generateSessionId();
    const timestamp = Date.now();

    const qrData: QRData = {
      classId,
      sessionId,
      timestamp,
      location,
    };

    // Generate QR code image
    const qrCodeDataURL = await generateQRCode(qrData);

    // Create attendance session
    const sessionData = {
      id: sessionId,
      classId,
      date: new Date().toISOString().split("T")[0],
      startTime: new Date(),
      endTime: new Date(timestamp + 60 * 60 * 1000), // 1 hour session
      qrCodeId: sessionId,
      createdBy: decodedToken.uid,
      isActive: true,
    };

    await adminDb.collection("sessions").doc(sessionId).set(sessionData);

    // Store QR code data
    const qrCodeData = {
      id: sessionId,
      classId,
      sessionId,
      data: JSON.stringify(qrData),
      expiresAt: new Date(timestamp + 60 * 1000 + 30000), // 1 minute + 30 seconds
      location,
      isActive: true,
      createdAt: new Date(),
    };

    await adminDb.collection("qrcodes").doc(sessionId).set(qrCodeData);

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      sessionId,
      expiresAt: qrCodeData.expiresAt,
    });
  } catch (error: any) {
    console.error("Error generating QR code:", error.message, error.stack);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}