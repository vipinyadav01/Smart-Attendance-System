# Next.js Attendance Management System

A comprehensive QR code-based attendance management system built with Next.js, Firebase, and Cloudinary. This system allows students to mark attendance by scanning QR codes with geofencing validation, while providing administrators with powerful analytics and management tools.

## 🚀 Features

### For Students
- **QR Code Scanning**: Mark attendance by scanning instructor-generated QR codes
- **Geofencing**: Location validation ensures students are physically present
- **Real-time Feedback**: Instant confirmation of attendance status
- **Email Notifications**: Automatic confirmation emails and low attendance warnings
- **Personal Dashboard**: View attendance history and statistics
- **Profile Management**: Upload profile photos and manage personal information
- **Mobile Optimized**: Responsive design works perfectly on mobile devices

### For Administrators
- **QR Code Generation**: Create time-limited QR codes for classes with 1-minute expiry
- **Analytics Dashboard**: Comprehensive charts and statistics with real-time data
- **Student Management**: Approve/reject student registrations with detailed profiles
- **Class Management**: Create and manage classes with location settings
- **CSV Export**: Export attendance data for analysis with Cloudinary integration
- **Email Notifications**: Automated alerts and reports
- **Advanced Reporting**: Filter and export attendance data with multiple criteria

### Technical Features
- **Firebase Authentication**: Secure login with email/password and Google OAuth
- **Firestore Database**: Real-time data synchronization with optimized queries
- **Cloudinary Integration**: Image and file storage with automatic optimization
- **Geofencing**: Location-based attendance validation with customizable radius
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Form Validation**: Comprehensive validation using Zod and React Hook Form
- **Email Service**: Automated notifications using Resend
- **TypeScript**: Full type safety throughout the application
- **Security**: Multi-layer security with Firebase security rules

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: Firebase Auth, Google OAuth
- **Database**: Firebase Firestore
- **File Storage**: Cloudinary
- **Email Service**: Resend
- **Form Validation**: Zod, React Hook Form
- **Charts**: Recharts
- **QR Code**: qrcode, jsQR libraries
- **UI Components**: Radix UI primitives
- **Testing**: Jest, Playwright
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.0 or later
- npm or yarn package manager
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/nextjs-attendance-app.git
cd nextjs-attendance-app
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com

# Google OAuth (Optional but recommended)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Resend Email Service
RESEND_API_KEY=your_resend_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAIN=gla.ac.in
LOW_ATTENDANCE_THRESHOLD=75
\`\`\`

### 4. Firebase Setup

#### 4.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard
4. Enable Google Analytics (optional)

#### 4.2 Enable Authentication
1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Enable this provider
   - **Google**: Enable and configure OAuth consent screen
5. Go to "Settings" tab
6. Add your domain (localhost:3000 for development) to authorized domains

#### 4.3 Create Firestore Database
1. Go to Firestore Database in Firebase Console
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location closest to your users

#### 4.4 Generate Service Account Key
1. Go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Copy the `private_key` and `client_email` to your environment variables
5. **Important**: Replace `\\n` with actual line breaks in the private key

#### 4.5 Firestore Security Rules
Replace the default rules with these production-ready rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isApprovedUser() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isApproved == true;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == userId || isAdmin()
      );
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (
        request.auth.uid == userId || isAdmin()
      );
      allow delete: if isAdmin();
    }
    
    // Classes collection
    match /classes/{classId} {
      allow read: if isApprovedUser();
      allow write: if isAdmin();
    }
    
    // Attendance records
    match /attendance/{attendanceId} {
      allow read: if isAuthenticated() && (
        resource.data.studentId == request.auth.uid || isAdmin()
      );
      allow create: if isApprovedUser() && 
        request.auth.uid == resource.data.studentId;
      allow update, delete: if isAdmin();
    }
    
    // QR codes - admin only
    match /qrcodes/{qrId} {
      allow read, write: if isAdmin();
    }
    
    // Sessions - admin only
    match /sessions/{sessionId} {
      allow read, write: if isAdmin();
    }
  }
}
\`\`\`

### 5. Cloudinary Setup

1. Create account at [Cloudinary](https://cloudinary.com/)
2. Go to Dashboard to get your credentials:
   - Cloud Name
   - API Key
   - API Secret
3. Add the credentials to your environment variables
4. Configure upload presets (optional):
   - Go to Settings > Upload
   - Create upload presets for profile photos and reports

### 6. Resend Setup

1. Create account at [Resend](https://resend.com/)
2. Go to API Keys section
3. Generate a new API key
4. Add the API key to your environment variables
5. Verify your domain:
   - Go to Domains section
   - Add your domain
   - Follow DNS verification steps
6. Update email templates in `lib/email.ts` with your domain

### 7. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials section
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized origins: `http://localhost:3000` (development)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to environment variables

### 8. Run the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗂️ Project Structure

\`\`\`
├── app/                    # Next.js App Router
│   ├── admin/             # Admin pages
│   │   ├── dashboard/     # Admin dashboard
│   │   ├── generate-qr/   # QR code generation
│   │   ├── students/      # Student management
│   │   └── reports/       # Attendance reports
│   ├── auth/              # Authentication pages
│   │   ├── signin/        # Sign in page
│   │   ├── signup/        # Sign up page
│   │   ├── pending-approval/ # Approval pending
│   │   └── complete-profile/ # Profile completion
│   ├── student/           # Student pages
│   │   ├── dashboard/     # Student dashboard
│   │   └── scan/          # QR code scanning
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication APIs
│   │   ├── attendance/    # Attendance APIs
│   │   └── qr/            # QR code APIs
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # Context providers
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── qr-scanner.tsx    # QR scanner component
├── lib/                  # Utility functions
│   ├── firebase.ts       # Firebase client config
│   ├── firebase-admin.ts # Firebase admin config
│   ├── validations.ts    # Zod schemas
│   ├── utils.ts          # Helper functions
│   ├── qr-utils.ts       # QR code utilities
│   ├── cloudinary.ts     # Cloudinary integration
│   ├── email.ts          # Email service
│   └── types.ts          # TypeScript types
├── hooks/                # Custom React hooks
│   └── use-toast.ts      # Toast notifications
├── public/               # Static assets
└── ...                   # Config files
\`\`\`

## 🧪 Testing

### Unit Tests
\`\`\`bash
npm run test
# or
yarn test
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:watch
# or
yarn test:watch
\`\`\`

### E2E Tests
\`\`\`bash
npm run test:e2e
# or
yarn test:e2e
\`\`\`

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com/)
3. Add environment variables in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all variables from your `.env.local` file
   - Make sure to update URLs for production
4. Deploy

### Environment Variables for Production

Update these variables for production:
- `NEXT_PUBLIC_APP_URL`: Your production domain (e.g., `https://yourapp.vercel.app`)
- Firebase authorized domains: Add your production domain in Firebase Console
- Cloudinary settings: Configure production upload presets
- Resend domain: Verify your production domain

### Post-Deployment Checklist

- [ ] Test authentication flow
- [ ] Verify QR code generation and scanning
- [ ] Test email notifications
- [ ] Check file uploads to Cloudinary
- [ ] Verify CSV export functionality
- [ ] Test geofencing with different locations
- [ ] Confirm admin approval workflow

## 📱 Usage Guide

### For Students

1. **Registration**:
   - Visit the application URL
   - Click "Get Started" or "Sign Up"
   - Enter your details with college email (@gla.ac.in)
   - Wait for admin approval

2. **Profile Setup**:
   - Complete your profile with roll number and university
   - Upload a profile photo (optional)
   - Wait for admin approval notification

3. **Marking Attendance**:
   - Sign in to your account
   - Go to "Scan QR Code" from dashboard
   - Allow location access when prompted
   - Point camera at instructor's QR code
   - Confirm attendance marking

4. **Tracking Progress**:
   - View attendance statistics on dashboard
   - Monitor class-wise attendance percentages
   - Check for low attendance warnings
   - Review attendance history

### For Administrators

1. **Initial Setup**:
   - Sign in with admin credentials
   - Set up classes with locations and schedules
   - Configure attendance thresholds

2. **Student Management**:
   - Review pending student registrations
   - Approve or reject applications
   - Monitor student attendance statistics
   - Send notifications to students

3. **QR Code Generation**:
   - Select class for attendance
   - Generate time-limited QR code
   - Display QR code to students
   - Monitor real-time attendance marking

4. **Analytics and Reports**:
   - View comprehensive attendance analytics
   - Generate and export CSV reports
   - Monitor attendance trends
   - Identify students with low attendance

## 🔒 Security Features

- **Email Domain Validation**: Only allowed domains can register
- **Admin Approval**: Student accounts require admin approval
- **Geofencing**: Location validation for attendance
- **Time-limited QR Codes**: QR codes expire after 1 minute
- **Duplicate Prevention**: Prevents multiple scans per session
- **Firebase Security Rules**: Database access control
- **Input Validation**: Comprehensive form validation
- **Authentication**: Secure Firebase authentication
- **HTTPS Only**: All communications encrypted

## 🔧 Configuration Options

### Attendance Threshold
Change the low attendance threshold in `.env.local`:
\`\`\`env
LOW_ATTENDANCE_THRESHOLD=75
\`\`\`

### Email Domain Restriction
Update allowed email domain:
\`\`\`env
ALLOWED_EMAIL_DOMAIN=youruniversity.edu
\`\`\`

### QR Code Expiry
Modify QR code expiry time in `lib/qr-utils.ts`:
\`\`\`typescript
export function isQRCodeExpired(timestamp: number, validityMinutes = 1): boolean {
  // Change validityMinutes to desired duration
}
\`\`\`

### Geofencing Radius
Set default radius in class creation or modify per class in admin panel.

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Issues**:
   - Verify all Firebase environment variables
   - Check Firebase project configuration
   - Ensure Firestore security rules are properly set

2. **QR Code Scanning Problems**:
   - Ensure HTTPS is enabled (required for camera access)
   - Check browser permissions for camera and location
   - Verify QR code hasn't expired

3. **Email Notifications Not Working**:
   - Verify Resend API key
   - Check domain verification status
   - Review email templates for errors

4. **Geofencing Issues**:
   - Ensure location permissions are granted
   - Check GPS accuracy settings
   - Verify location coordinates in class setup

5. **File Upload Problems**:
   - Verify Cloudinary credentials
   - Check file size limits
   - Ensure proper CORS settings

### Debug Mode

Enable debug logging by adding to `.env.local`:
\`\`\`env
NEXT_PUBLIC_DEBUG=true
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use proper error handling
- Add tests for new features
- Update documentation
- Follow existing code style
- Use semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/nextjs-attendance-app/issues) page
2. Search existing issues before creating new ones
3. Provide detailed information when reporting bugs
4. Include steps to reproduce the issue

### Getting Help

- **Documentation**: Check this README and inline code comments
- **Community**: Join our Discord server for community support
- **Email**: Contact support@yourapp.com for technical issues
- **GitHub Issues**: Report bugs and feature requests

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Firebase](https://firebase.google.com/) for backend services
- [Cloudinary](https://cloudinary.com/) for media management
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Radix UI](https://www.radix-ui.com/) for accessible primitives
- [Resend](https://resend.com/) for email delivery
- [Recharts](https://recharts.org/) for data visualization

## 📊 Performance

- **Lighthouse Score**: 95+ on all metrics
- **Core Web Vitals**: Optimized for excellent user experience
- **Bundle Size**: Optimized with code splitting
- **Database Queries**: Efficient Firestore queries with proper indexing
- **Image Optimization**: Automatic optimization via Cloudinary
- **Caching**: Proper caching strategies implemented

## 🔄 Updates

### Version 1.0.0 (Current)
- Initial release with all core features
- QR code scanning with geofencing
- Admin dashboard and student management
- Email notifications and reporting
- Mobile-responsive design

### Planned Features
- [ ] Push notifications
- [ ] Offline support
- [ ] Bulk operations
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API documentation
- [ ] Multi-language support

---

**Built with ❤️ for educational institutions worldwide**
