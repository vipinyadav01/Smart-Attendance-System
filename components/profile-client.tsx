"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/app/providers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, School, Calendar, CheckCircle, Clock, Shield, Database, Eye, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface UserProfile {
    id: string
    name: string
    email: string
    university: string
    role: string
    profilePhoto?: string
    isApproved: boolean
    createdAt: any
    displayName?: string
}

export default function ProfileClient() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentDateTime, setCurrentDateTime] = useState("")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Don't redirect while auth is still loading
        if (authLoading) return

        if (!user) {
            router.push("/auth/signin")
            return
        }

        fetchUserProfile()

        const updateTime = () => {
            const now = new Date()
            const year = now.getUTCFullYear()
            const month = String(now.getUTCMonth() + 1).padStart(2, '0')
            const day = String(now.getUTCDate()).padStart(2, '0')
            const hours = String(now.getUTCHours()).padStart(2, '0')
            const minutes = String(now.getUTCMinutes()).padStart(2, '0')
            const seconds = String(now.getUTCSeconds()).padStart(2, '0')

            setCurrentDateTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`)
        }

        updateTime()
        const interval = setInterval(updateTime, 1000)

        return () => clearInterval(interval)
    }, [user, authLoading, router])

    const fetchUserProfile = async () => {
        if (!user) return

        try {
            setLoading(true)
            setError(null)

            const userId = user.id
            const userDoc = await getDoc(doc(db, "users", userId))

            if (userDoc.exists()) {
                const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile
                setUserProfile(userData)
            } else {
                const fallbackProfile: UserProfile = {
                    id: userId,
                    name: user.name || "Unknown User",
                    email: user.email || "",
                    university: user.university || "",
                    role: user.role || "student",
                    profilePhoto: user.profilePhoto,
                    isApproved: user.isApproved || false,
                    createdAt: new Date().toISOString(),
                    displayName: user.name
                }
                setUserProfile(fallbackProfile)
            }
        } catch (err) {
            console.error("Error fetching current user profile:", err)
            setError(`Failed to fetch your profile: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
            setLoading(false)
        }
    }

    const formatGooglePhotoUrl = (photoUrl?: string) => {
        if (!photoUrl) return null

        if (photoUrl.includes('googleusercontent.com')) {
            const baseUrl = photoUrl.split('=')[0]
            return `${baseUrl}=s96-c`
        }

        return photoUrl
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "Unknown"

        let date: Date
        if (timestamp.toDate) {
            date = timestamp.toDate()
        } else {
            date = new Date(timestamp)
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (!mounted || !user || loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-800 rounded-full animate-spin border-t-blue-500"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="bg-gray-900 border-red-500/30 max-w-lg w-full">
                    <CardContent className="p-6 text-center">
                        <div className="text-red-400 text-4xl mb-4">⚠️</div>
                        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                        <p className="text-gray-400 text-sm mb-4">{error}</p>
                        <button
                            onClick={fetchUserProfile}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!userProfile) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
                    <CardContent className="p-6 text-center">
                        <User className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
                        <p className="text-gray-400 mb-4">Your profile data could not be loaded.</p>
                        <button
                            onClick={fetchUserProfile}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const formattedPhotoUrl = formatGooglePhotoUrl(userProfile.profilePhoto)

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Header Section */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                            <User className="w-4 h-4" />
                            Back to Dashboard
                        </button>

                        <button
                            onClick={fetchUserProfile}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6">
                            {userProfile.role === 'admin' ? 'Admin' : 'User'} Profile
                        </h1>

                        {/* Status Cards - Simplified */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-medium text-gray-300">Time</span>
                                </div>
                                <p className="font-mono text-xs text-white truncate">
                                    {currentDateTime?.split(' ')[1] || "Loading..."}
                                </p>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-medium text-gray-300">Role</span>
                                </div>
                                <p className="text-xs text-white uppercase">
                                    {userProfile.role}
                                </p>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 col-span-2 lg:col-span-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-medium text-gray-300">Status</span>
                                </div>
                                <p className="text-xs text-white">
                                    {userProfile.isApproved ? 'Approved' : 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Profile Card */}
                <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/30 transition-colors duration-200">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {/* Profile Photo */}
                            <div className="relative flex-shrink-0">
                                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-blue-500/30">
                                    <AvatarImage
                                        src={formattedPhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || userProfile.name)}&background=374151&color=ffffff&size=96`}
                                        alt={userProfile.displayName || userProfile.name}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-gray-700 text-white text-xl">
                                        {(userProfile.displayName || userProfile.name)?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                            </div>

                            {/* Basic Info */}
                            <div className="flex-1 text-center sm:text-left min-w-0">
                                <CardTitle className="text-xl sm:text-2xl text-white mb-2 truncate">
                                    {userProfile.displayName || userProfile.name || "Unknown User"}
                                </CardTitle>
                                <CardDescription className="text-gray-400 text-sm mb-3 truncate">
                                    {userProfile.email}
                                </CardDescription>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <Badge
                                        className={`text-xs ${userProfile.role === 'admin'
                                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            }`}
                                    >
                                        {userProfile.role?.toUpperCase() || 'USER'}
                                    </Badge>
                                    <Badge
                                        className={`text-xs ${userProfile.isApproved
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                            }`}
                                    >
                                        {userProfile.isApproved ? (
                                            <>
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Approved
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-3 h-3 mr-1" />
                                                Pending
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Personal Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-medium text-gray-300">Email</span>
                                </div>
                                <p className="text-white text-sm truncate">{userProfile.email || "Not provided"}</p>
                            </div>

                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <School className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-medium text-gray-300">University</span>
                                </div>
                                <p className="text-white text-sm truncate">{userProfile.university || "Not specified"}</p>
                            </div>

                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 sm:col-span-2 lg:col-span-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-medium text-gray-300">Member Since</span>
                                </div>
                                <p className="text-white text-sm">{formatDate(userProfile.createdAt)}</p>
                            </div>
                        </div>

                        {/* Authentication Details */}
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                                Authentication Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="p-3 bg-gray-900/50 rounded-lg">
                                    <p className="text-gray-400 text-xs mb-1">User ID:</p>
                                    <p className="text-green-400 font-mono text-xs break-all">{user.id}</p>
                                </div>
                                <div className="p-3 bg-gray-900/50 rounded-lg">
                                    <p className="text-gray-400 text-xs mb-1">Login Method:</p>
                                    <p className="text-green-400 text-xs">Google OAuth</p>
                                </div>
                                <div className="p-3 bg-gray-900/50 rounded-lg">
                                    <p className="text-gray-400 text-xs mb-1">Role:</p>
                                    <p className="text-green-400 text-xs">{userProfile.role}</p>
                                </div>
                                <div className="p-3 bg-gray-900/50 rounded-lg">
                                    <p className="text-gray-400 text-xs mb-1">University:</p>
                                    <p className="text-green-400 text-xs truncate">{userProfile.university || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>


                    </CardContent>
                </Card>
            </div>
        </div>
    )
}