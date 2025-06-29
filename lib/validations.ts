import { z } from "zod"

export const studentIdSchema = z.string()
  .min(1, "Student ID is required")
  .regex(/^[A-Za-z0-9-_]+$/, "Student ID can only contain letters, numbers, hyphens, and underscores")
  .min(3, "Student ID must be at least 3 characters long")
  .max(20, "Student ID must be less than 20 characters long")

export const validateStudentId = (studentId: string): { isValid: boolean; error?: string } => {
  try {
    studentIdSchema.parse(studentId)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message }
    }
    return { isValid: false, error: "Invalid student ID" }
  }
}

export const emailSchema = z.string().email("Invalid email address")

export const nameSchema = z.string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters long")
  .max(100, "Name must be less than 100 characters long")

export const universitySchema = z.string()
  .min(1, "University is required")
  .min(2, "University name must be at least 2 characters long")
  .max(200, "University name must be less than 200 characters long")

export const rollNumberSchema = z.string()
  .min(1, "Roll number is required")
  .regex(/^[A-Za-z0-9-_]+$/, "Roll number can only contain letters, numbers, hyphens, and underscores")
  .min(3, "Roll number must be at least 3 characters long")
  .max(20, "Roll number must be less than 20 characters long")

export const validateRollNumber = (rollNumber: string): { isValid: boolean; error?: string } => {
  try {
    rollNumberSchema.parse(rollNumber)
    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message }
    }
    return { isValid: false, error: "Invalid roll number" }
  }
}
