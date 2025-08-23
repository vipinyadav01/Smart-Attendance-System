"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface LoadingContextType {
  isPageLoading: boolean
  setPageLoading: (loading: boolean) => void
  loadingMessage: string
  setLoadingMessage: (message: string) => void
}

const LoadingContext = createContext<LoadingContextType>({
  isPageLoading: false,
  setPageLoading: () => {},
  loadingMessage: "Loading...",
  setLoadingMessage: () => {},
})

export function useGlobalLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useGlobalLoading must be used within a LoadingProvider")
  }
  return context
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isPageLoading, setPageLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading...")

  // Auto-hide loading after a maximum timeout to prevent infinite loading
  useEffect(() => {
    if (isPageLoading) {
      const timeout = setTimeout(() => {
        setPageLoading(false)
      }, 10000) // 10 second max

      return () => clearTimeout(timeout)
    }
  }, [isPageLoading])

  return (
    <LoadingContext.Provider 
      value={{
        isPageLoading,
        setPageLoading,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}
