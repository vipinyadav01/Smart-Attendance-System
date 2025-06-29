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
    const data = JSON.parse(qrString);

    // Validate QR data structure
    if (
      !data.classId ||
      !data.sessionId ||
      !data.timestamp ||
      !data.location ||
      typeof data.location.latitude !== "number" ||
      typeof data.location.longitude !== "number"
    ) {
      console.error("Invalid QR data structure:", data);
      return null;
    }

    return data as QRData;
  } catch (error: any) {
    console.error("Error parsing QR data:", error.message);
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