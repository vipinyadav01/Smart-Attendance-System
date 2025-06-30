import { Timestamp } from "firebase/firestore";

export interface User {
  id: string
  email: string
  name: string
  role: "student" | "admin"
  university: string
  rollNumber?: string
  studentId?: string
  profilePhoto?: string
  isApproved: boolean
  profileComplete?: boolean
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhoto?: string;
  classId: string;
  className: string;
  timestamp: Timestamp | Date;
  status: "present" | "absent" | "late";
  location?: string;
  deviceInfo?: string;
}

export interface Class {
  id: string;
  name: string;
  code: string; // Added to store a unique class code (e.g., "CS101")
  description?: string;
  instructor: string;
  instructorId: string;
  university: string;
  universityId: string;
  schedule: {
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  }[];
  location: {
    name?: string; // Optional location name (e.g., "Room 101")
    coordinates: {
      latitude: number;
      longitude: number;
    };
    radius: number; // Geofence radius in meters
  };
  isActive: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface QRCode {
  id: string;
  classId: string;
  className: string;
  instructorId: string;
  university: string;
  code: string;
  expiresAt: Timestamp | Date;
  isActive: boolean;
  maxScans?: number;
  currentScans: number;
  createdAt: Timestamp | Date;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  className: string;
  instructorId: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  qrCodeId?: string;
  isActive: boolean;
  attendanceRecords: string[]; // Array of attendance record IDs
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  createdAt: Timestamp | Date;
}

export interface SystemSettings {
  id: string;
  attendanceGracePeriod: number; // minutes
  qrCodeExpiryTime: number; // minutes
  maxAttendanceDistance: number; // meters
  allowLateAttendance: boolean;
  requireLocationVerification: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  updatedAt: Timestamp | Date;
  updatedBy: string;
}