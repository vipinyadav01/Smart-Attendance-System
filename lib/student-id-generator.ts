import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface StudentIdOptions {
  strategy: 'name-based' | 'year-based' | 'sequential' | 'hybrid';
  university: string;
  studentName: string;
  admissionYear?: number;
  department?: string;
  rollNumber?: string;
}

export interface GenerationResult {
  studentId: string;
  isUnique: boolean;
  strategy: string;
  attempts: number;
}

class StudentIdGenerator {
  private async checkUniqueness(studentId: string, university: string): Promise<boolean> {
    try {
      const studentQuery = query(
        collection(db, "users"),
        where("studentId", "==", studentId),
        where("university", "==", university),
        where("role", "==", "student")
      );
      const snapshot = await getDocs(studentQuery);
      return snapshot.empty;
    } catch (error) {
      console.error("Error checking student ID uniqueness:", error);
      return false;
    }
  }

  private async getNextSequentialNumber(university: string): Promise<number> {
    try {
      const studentsQuery = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("university", "==", university),
        orderBy("createdAt", "asc")
      );
      const snapshot = await getDocs(studentsQuery);
      return snapshot.size + 1;
    } catch (error) {
      console.error("Error getting sequential number:", error);
      return Math.floor(Math.random() * 9000) + 1000; // Fallback to random 4-digit
    }
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z\s]/g, '') // Remove special characters
      .trim()
      .toUpperCase();
  }

  private getNamePrefix(name: string, length: number = 3): string {
    const sanitized = this.sanitizeName(name);
    
    // Handle multiple words - take first letter of each word
    const words = sanitized.split(' ').filter(word => word.length > 0);
    if (words.length > 1 && length >= words.length) {
      const prefix = words.map(word => word[0]).join('');
      return prefix.padEnd(length, 'X');
    }
    
    // Single word or need more characters
    const singleWordPrefix = sanitized.replace(/\s/g, '').substring(0, length);
    return singleWordPrefix.padEnd(length, 'X');
  }

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // Strategy 1: Name-based ID (current improved version)
  private async generateNameBasedId(options: StudentIdOptions): Promise<string> {
    const { university, studentName } = options;
    const namePrefix = this.getNamePrefix(studentName, 3);
    const sequentialNumber = await this.getNextSequentialNumber(university);
    return `${namePrefix}${sequentialNumber.toString().padStart(3, '0')}`;
  }

  // Strategy 2: Year-based ID (academic year + sequence)
  private async generateYearBasedId(options: StudentIdOptions): Promise<string> {
    const { university, studentName, admissionYear } = options;
    const year = admissionYear || this.getCurrentYear();
    const yearSuffix = year.toString().slice(-2); // Last 2 digits of year
    const namePrefix = this.getNamePrefix(studentName, 2);
    
    // Get count of students from same year
    const yearStudentsQuery = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("university", "==", university)
    );
    const snapshot = await getDocs(yearStudentsQuery);
    
    // Filter by year in client (Firestore limitation)
    let yearCount = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.studentId && data.studentId.includes(yearSuffix)) {
        yearCount++;
      }
    });
    
    const studentNumber = (yearCount + 1).toString().padStart(3, '0');
    return `${yearSuffix}${namePrefix}${studentNumber}`;
  }

  // Strategy 3: Sequential ID (university prefix + sequence)
  private async generateSequentialId(options: StudentIdOptions): Promise<string> {
    const { university } = options;
    const universityPrefix = university
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 3)
      .padEnd(3, 'U');
    
    const sequentialNumber = await this.getNextSequentialNumber(university);
    return `${universityPrefix}${sequentialNumber.toString().padStart(4, '0')}`;
  }

  // Strategy 4: Hybrid ID (year + name + sequence)
  private async generateHybridId(options: StudentIdOptions): Promise<string> {
    const { university, studentName, admissionYear } = options;
    const year = admissionYear || this.getCurrentYear();
    const yearSuffix = year.toString().slice(-2);
    const namePrefix = this.getNamePrefix(studentName, 2);
    const sequentialNumber = await this.getNextSequentialNumber(university);
    const seqSuffix = sequentialNumber.toString().padStart(2, '0');
    
    return `${yearSuffix}${namePrefix}${seqSuffix}`;
  }

  // Strategy 5: Roll Number Based ID
  private generateRollBasedId(options: StudentIdOptions): string {
    const { rollNumber, studentName } = options;
    if (!rollNumber) {
      throw new Error("Roll number required for roll-based ID generation");
    }
    
    const namePrefix = this.getNamePrefix(studentName, 2);
    const rollSuffix = rollNumber.slice(-4).padStart(4, '0'); // Last 4 digits of roll
    return `${namePrefix}${rollSuffix}`;
  }

  async generateStudentId(options: StudentIdOptions): Promise<GenerationResult> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      let studentId: string;
      
      try {
        switch (options.strategy) {
          case 'name-based':
            studentId = await this.generateNameBasedId(options);
            break;
          case 'year-based':
            studentId = await this.generateYearBasedId(options);
            break;
          case 'sequential':
            studentId = await this.generateSequentialId(options);
            break;
          case 'hybrid':
            studentId = await this.generateHybridId(options);
            break;
          default:
            studentId = await this.generateNameBasedId(options);
        }
        
        // Check uniqueness
        const isUnique = await this.checkUniqueness(studentId, options.university);
        
        if (isUnique) {
          return {
            studentId,
            isUnique: true,
            strategy: options.strategy,
            attempts
          };
        }
        
        // If not unique, add random suffix and try again
        if (attempts < maxAttempts) {
          const randomSuffix = Math.floor(Math.random() * 99).toString().padStart(2, '0');
          const modifiedId = studentId.slice(0, -2) + randomSuffix;
          const isModifiedUnique = await this.checkUniqueness(modifiedId, options.university);
          
          if (isModifiedUnique) {
            return {
              studentId: modifiedId,
              isUnique: true,
              strategy: `${options.strategy}-modified`,
              attempts
            };
          }
        }
      } catch (error) {
        console.error(`Error in strategy ${options.strategy}:`, error);
        continue;
      }
    }
    
    // Fallback: Generate random ID
    const fallbackId = `STU${Date.now().toString().slice(-6)}`;
    return {
      studentId: fallbackId,
      isUnique: false, // We're not checking this one
      strategy: 'fallback',
      attempts
    };
  }

  // Batch generation for multiple strategies
  async generateMultipleOptions(options: StudentIdOptions): Promise<GenerationResult[]> {
    const strategies: StudentIdOptions['strategy'][] = ['name-based', 'year-based', 'sequential', 'hybrid'];
    const results: GenerationResult[] = [];
    
    for (const strategy of strategies) {
      try {
        const result = await this.generateStudentId({ ...options, strategy });
        results.push(result);
      } catch (error) {
        console.error(`Error generating ${strategy} ID:`, error);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const studentIdGenerator = new StudentIdGenerator();

// Utility functions for validation
export async function validateRollNumberUniqueness(
  rollNumber: string, 
  university: string, 
  excludeUserId?: string
): Promise<{ isUnique: boolean; existingUser?: any }> {
  try {
    const rollQuery = query(
      collection(db, "users"),
      where("rollNumber", "==", rollNumber.trim()),
      where("university", "==", university.trim()),
      where("role", "==", "student")
    );
    const snapshot = await getDocs(rollQuery);
    
    if (snapshot.empty) {
      return { isUnique: true };
    }
    
    // If there's an excluded user (for updates), check if it's the same user
    if (excludeUserId) {
      const existingDoc = snapshot.docs[0];
      if (existingDoc.id === excludeUserId) {
        return { isUnique: true };
      }
    }
    
    return { 
      isUnique: false, 
      existingUser: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
    };
  } catch (error) {
    console.error("Error validating roll number uniqueness:", error);
    return { isUnique: false };
  }
}

export function generateRollNumberSuggestions(
  studentName: string, 
  university: string, 
  admissionYear?: number
): string[] {
  const year = admissionYear || new Date().getFullYear();
  const yearSuffix = year.toString().slice(-2);
  const namePrefix = studentName
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, '0');
  
  const suggestions: string[] = [];
  
  // Pattern 1: Year + Department Code + Sequential
  suggestions.push(`${year}0310100001`); // CSE example
  suggestions.push(`${year}0410100001`); // ECE example
  suggestions.push(`${year}0510100001`); // ME example
  
  // Pattern 2: Year + Name-based
  for (let i = 1; i <= 3; i++) {
    const seq = i.toString().padStart(3, '0');
    suggestions.push(`${yearSuffix}${namePrefix}${seq}`);
  }
  
  // Pattern 3: Full year + sequential
  for (let i = 1; i <= 3; i++) {
    const seq = i.toString().padStart(6, '0');
    suggestions.push(`${year}${seq}`);
  }
  
  return suggestions;
} 