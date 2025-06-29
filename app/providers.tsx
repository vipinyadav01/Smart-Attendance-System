"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import type { User } from "@/lib/types"

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within a Providers component")
  }
  return context
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    if (!firebaseUser) return

    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data() as User

        // Use Google photo if user doesn't have a custom profile photo
        const profilePhoto = userData.profilePhoto || firebaseUser.photoURL || ""

        setUser({
          ...userData,
          profilePhoto,
        })
      }
    } catch (error) {
      console.error("Error refreshing user data:", error)
    }
  }

  const signOut = async () => {
    try {
      await auth.signOut()
      setUser(null)
      setFirebaseUser(null)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data() as User

            // Use Google photo if user doesn't have a custom profile photo
            const profilePhoto = userData.profilePhoto || firebaseUser.photoURL || ""

            setUser({
              ...userData,
              profilePhoto,
            })
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          setUser(null)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value = {
    user,
    firebaseUser,
    loading,
    refreshUser,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
