import QRCode from "qrcode"
import jsQR from "jsqr"

export interface QRData {
  classId: string
  sessionId: string
  timestamp: number
  location: {
    latitude: number
    longitude: number
  }
}

export async function generateQRCode(data: QRData): Promise<string> {
  const qrString = JSON.stringify(data)

  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return qrCodeDataURL
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export function parseQRData(qrString: string): QRData | null {
  try {
    const data = JSON.parse(qrString)

    // Validate QR data structure
    if (!data.classId || !data.sessionId || !data.timestamp || !data.location) {
      return null
    }

    return data as QRData
  } catch (error) {
    console.error("Error parsing QR data:", error)
    return null
  }
}

export function isQRCodeExpired(timestamp: number, validityMinutes = 1): boolean {
  const now = Date.now()
  const expiryTime = timestamp + validityMinutes * 60 * 1000
  return now > expiryTime
}

export function scanQRFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  return code ? code.data : null
}
