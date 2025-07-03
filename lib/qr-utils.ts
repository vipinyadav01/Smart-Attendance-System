import QRCode from "qrcode";
import QrScanner from "qr-scanner";

export interface QRData {
  classId: string;
  sessionId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export async function generateQRCode(data: QRData): Promise<string> {
  // Validate QRData
  if (
    !data.classId ||
    !data.sessionId ||
    !data.timestamp ||
    typeof data.location?.latitude !== "number" ||
    typeof data.location?.longitude !== "number"
  ) {
    console.error("Invalid QR data:", data);
    throw new Error("Invalid QR data provided");
  }

  const qrString = JSON.stringify(data);

  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrCodeDataURL;
  } catch (error: any) {
    console.error("Error generating QR code:", error.message, error.stack);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

export function parseQRData(qrString: string): QRData | null {
  try {
    console.log("Attempting to parse QR string:", qrString);
    
    // Trim whitespace and check if it's empty
    const trimmedString = qrString.trim();
    if (!trimmedString) {
      console.error("QR string is empty or only whitespace");
      return null;
    }

    const data = JSON.parse(trimmedString);
    console.log("Parsed JSON data:", data);

    // Validate QR data structure
    if (
      !data.classId ||
      !data.sessionId ||
      !data.timestamp ||
      !data.location ||
      typeof data.location.latitude !== "number" ||
      typeof data.location.longitude !== "number"
    ) {
      console.error("Invalid QR data structure:", {
        hasClassId: !!data.classId,
        hasSessionId: !!data.sessionId,
        hasTimestamp: !!data.timestamp,
        hasLocation: !!data.location,
        locationLatType: typeof data.location?.latitude,
        locationLonType: typeof data.location?.longitude,
        data
      });
      return null;
    }

    console.log("QR data validation passed");
    return data as QRData;
  } catch (error: any) {
    console.error("Error parsing QR data:", {
      error: error.message,
      qrString: qrString.substring(0, 100) + (qrString.length > 100 ? "..." : ""),
      stack: error.stack
    });
    return null;
  }
}

export function isQRCodeExpired(timestamp: number, validityMinutes = 1): boolean {
  const now = Date.now();
  const expiryTime = timestamp + validityMinutes * 60 * 1000 + 30000; // 30-second buffer
  console.log("Expiry check:", { now, timestamp, expiryTime });
  return now > expiryTime;
}

export async function scanQRFromImage(image: HTMLImageElement): Promise<string | null> {
  try {
    const result = await QrScanner.scanImage(image, {
      returnDetailedScanResult: true,
    });
    return result ? result.data : null;
  } catch (error: any) {
    console.error("Error scanning QR from image:", error.message);
    return null;
  }
}

// Add cleanup functions for expired QR codes
export async function cleanupExpiredQRCodes(adminDb: any): Promise<{ deletedCount: number; error?: string }> {
  try {
    console.log("Starting cleanup of expired QR codes...");
    
    const now = new Date();
    
    // Query for expired QR codes
    const expiredQRQuery = adminDb
      .collection("qrcodes")
      .where("expiresAt", "<=", now)
      .where("isActive", "==", true);
    
    const expiredQRSnapshot = await expiredQRQuery.get();
    
    if (expiredQRSnapshot.empty) {
      console.log("No expired QR codes found");
      return { deletedCount: 0 };
    }
    
    console.log(`Found ${expiredQRSnapshot.size} expired QR codes to delete`);
    
    // Delete expired QR codes in batches (Firestore batch limit is 500)
    const batch = adminDb.batch();
    let deletedCount = 0;
    
    expiredQRSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    
    console.log(`Successfully deleted ${deletedCount} expired QR codes`);
    return { deletedCount };
    
  } catch (error: any) {
    console.error("Error cleaning up expired QR codes:", error);
    return { deletedCount: 0, error: error.message };
  }
}

export async function cleanupExpiredSessions(adminDb: any): Promise<{ deletedCount: number; error?: string }> {
  try {
    console.log("Starting cleanup of expired sessions...");
    
    const now = new Date();
    
    // Query for expired sessions
    const expiredSessionsQuery = adminDb
      .collection("sessions")
      .where("endTime", "<=", now)
      .where("isActive", "==", true);
    
    const expiredSessionsSnapshot = await expiredSessionsQuery.get();
    
    if (expiredSessionsSnapshot.empty) {
      console.log("No expired sessions found");
      return { deletedCount: 0 };
    }
    
    console.log(`Found ${expiredSessionsSnapshot.size} expired sessions to update`);
    
    // Mark sessions as inactive instead of deleting (preserve data for reports)
    const batch = adminDb.batch();
    let updatedCount = 0;
    
    expiredSessionsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { 
        isActive: false,
        deactivatedAt: now,
        deactivatedReason: "expired"
      });
      updatedCount++;
    });
    
    await batch.commit();
    
    console.log(`Successfully marked ${updatedCount} expired sessions as inactive`);
    return { deletedCount: updatedCount };
    
  } catch (error: any) {
    console.error("Error cleaning up expired sessions:", error);
    return { deletedCount: 0, error: error.message };
  }
}

export async function cleanupOldQRCodes(adminDb: any, daysOld = 7): Promise<{ deletedCount: number; error?: string }> {
  try {
    console.log(`Starting cleanup of QR codes older than ${daysOld} days...`);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Query for old QR codes
    const oldQRQuery = adminDb
      .collection("qrcodes")
      .where("createdAt", "<=", cutoffDate);
    
    const oldQRSnapshot = await oldQRQuery.get();
    
    if (oldQRSnapshot.empty) {
      console.log("No old QR codes found");
      return { deletedCount: 0 };
    }
    
    console.log(`Found ${oldQRSnapshot.size} old QR codes to delete`);
    
    // Delete old QR codes in batches
    const batch = adminDb.batch();
    let deletedCount = 0;
    
    oldQRSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    
    console.log(`Successfully deleted ${deletedCount} old QR codes`);
    return { deletedCount };
    
  } catch (error: any) {
    console.error("Error cleaning up old QR codes:", error);
    return { deletedCount: 0, error: error.message };
  }
}