import { type NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { generateQRCode, type QRData, cleanupExpiredQRCodes, cleanupExpiredSessions } from "@/lib/qr-utils";
import { generateSessionId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { classId, location } = await request.json();

    // Validate input
    if (!classId || !location?.latitude || !location?.longitude) {
      return NextResponse.json({ error: "Missing classId or location data" }, { status: 400 });
    }

    // Validate location coordinates are valid numbers
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ 
        error: "Invalid location coordinates. Latitude must be between -90 and 90, longitude between -180 and 180" 
      }, { status: 400 });
    }

    console.log("Input validation passed:", { classId, latitude: lat, longitude: lng });

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

    // Clean up expired QR codes and sessions before creating new ones
    console.log("Cleaning up expired QR codes and sessions...");
    const [qrCleanupResult, sessionCleanupResult] = await Promise.all([
      cleanupExpiredQRCodes(adminDb),
      cleanupExpiredSessions(adminDb)
    ]);
    
    if (qrCleanupResult.deletedCount > 0) {
      console.log(`Cleaned up ${qrCleanupResult.deletedCount} expired QR codes`);
    }
    if (sessionCleanupResult.deletedCount > 0) {
      console.log(`Cleaned up ${sessionCleanupResult.deletedCount} expired sessions`);
    }

    // Verify class exists
    const classDoc = await adminDb.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Generate session ID and QR data
    const sessionId = generateSessionId();
    const timestamp = Date.now();

    // Ensure location has proper number types
    const qrData: QRData = {
      classId,
      sessionId,
      timestamp,
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      },
    };

    // Validate QR data before generating code
    if (
      !qrData.classId ||
      !qrData.sessionId ||
      !qrData.timestamp ||
      !qrData.location ||
      typeof qrData.location.latitude !== "number" ||
      typeof qrData.location.longitude !== "number" ||
      isNaN(qrData.location.latitude) ||
      isNaN(qrData.location.longitude)
    ) {
      console.error("Invalid QR data before generation:", qrData);
      return NextResponse.json({ error: "Invalid QR data format" }, { status: 400 });
    }

    console.log("Generated QR data:", qrData);
    console.log("QR data validation:", {
      hasClassId: !!qrData.classId,
      hasSessionId: !!qrData.sessionId,
      hasTimestamp: !!qrData.timestamp,
      hasLocation: !!qrData.location,
      latitudeType: typeof qrData.location.latitude,
      longitudeType: typeof qrData.location.longitude,
      latitudeValue: qrData.location.latitude,
      longitudeValue: qrData.location.longitude,
    });

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
      location: {
        latitude: qrData.location.latitude,
        longitude: qrData.location.longitude,
      },
      isActive: true,
      createdAt: new Date(),
    };

    console.log("Storing QR code data:", qrCodeData);
    console.log("QR data string to be stored:", qrCodeData.data);

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