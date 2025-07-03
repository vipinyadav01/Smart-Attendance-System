import { type NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { cleanupExpiredQRCodes, cleanupExpiredSessions, cleanupOldQRCodes } from "@/lib/qr-utils";

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check if user is admin
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { cleanupType = "all", daysOld = 7 } = await request.json();

    console.log(`Starting manual cleanup: ${cleanupType}`);

    let results = {
      expiredQRCodes: { deletedCount: 0 },
      expiredSessions: { deletedCount: 0 },
      oldQRCodes: { deletedCount: 0 },
    };

    // Perform cleanup based on type
    if (cleanupType === "all" || cleanupType === "expired") {
      results.expiredQRCodes = await cleanupExpiredQRCodes(adminDb);
      results.expiredSessions = await cleanupExpiredSessions(adminDb);
    }

    if (cleanupType === "all" || cleanupType === "old") {
      results.oldQRCodes = await cleanupOldQRCodes(adminDb, daysOld);
    }

    const totalDeleted = 
      results.expiredQRCodes.deletedCount + 
      results.expiredSessions.deletedCount + 
      results.oldQRCodes.deletedCount;

    console.log(`Manual cleanup completed. Total items processed: ${totalDeleted}`);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully. Processed ${totalDeleted} items.`,
      results,
      cleanupType,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Error during manual cleanup:", error);
    return NextResponse.json({ 
      error: `Cleanup failed: ${error.message}` 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check if user is admin
    const adminDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get stats about QR codes and sessions
    const [qrSnapshot, sessionSnapshot] = await Promise.all([
      adminDb.collection("qrcodes").get(),
      adminDb.collection("sessions").get(),
    ]);

    const now = new Date();
    let expiredQRCount = 0;
    let activeQRCount = 0;
    let expiredSessionCount = 0;
    let activeSessionCount = 0;

    // Count expired QR codes
    qrSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.expiresAt && data.expiresAt.toDate() <= now) {
        expiredQRCount++;
      } else if (data.isActive) {
        activeQRCount++;
      }
    });

    // Count expired sessions
    sessionSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.endTime && data.endTime.toDate() <= now && data.isActive) {
        expiredSessionCount++;
      } else if (data.isActive) {
        activeSessionCount++;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        qrCodes: {
          total: qrSnapshot.size,
          active: activeQRCount,
          expired: expiredQRCount,
        },
        sessions: {
          total: sessionSnapshot.size,
          active: activeSessionCount,
          expired: expiredSessionCount,
        },
        timestamp: now.toISOString(),
      },
    });

  } catch (error: any) {
    console.error("Error getting cleanup stats:", error);
    return NextResponse.json({ 
      error: `Failed to get stats: ${error.message}` 
    }, { status: 500 });
  }
} 