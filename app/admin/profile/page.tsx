import AdminNavbar from "@/components/admin-navbar"
import ProfileClient from "../../../components/profile-client"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNavbar currentPage="Profile" />
      <ProfileClient />
    </div>
  )
}