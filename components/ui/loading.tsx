"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "minimal" | "page"
  message?: string
  className?: string
}

export function Loading({ 
  size = "md", 
  variant = "default", 
  message = "Loading...",
  className 
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  }

  if (variant === "page") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 gradient-cyber rounded-full blur-xl animate-pulse"></div>
            <div className="relative loading-spinner mx-auto"></div>
            <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-pulse-ring"></div>
          </div>
          <div className="space-y-2">
            <p className="text-slate-300 font-medium">{message}</p>
            <div className="loading-dots text-cyan-400">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <div className={cn("border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin", sizeClasses[size])}></div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <div className={cn("border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin", sizeClasses[size])}></div>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  )
}

export function LoadingSpinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 h-4 w-4", className)}
      {...props}
    />
  )
}
