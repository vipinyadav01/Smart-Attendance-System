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