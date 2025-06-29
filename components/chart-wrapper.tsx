"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface ChartWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ChartWrapper({ children, fallback = null }: ChartWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
