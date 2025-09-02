# SaaS Imaging Platform

A comprehensive Next.js-based SaaS platform for image and video processing with social media optimization features.

## 🚀 Features

### Authentication & Security

- **Clerk Authentication**: Secure user authentication and session management
- **Protected Routes**: Middleware-based route protection
- **User Dashboard**: Personalized user experience

### Image Processing

- **Social Media Formats**: Transform images for Instagram, Twitter, Facebook
- **Custom Save Dialogs**: File System Access API for better UX
- **Multiple Export Options**: PNG, JPEG support with custom filenames
- **Real-time Previews**: Live image transformation previews

### Video Processing

- **Cloudinary Integration**: Professional video compression and optimization
- **Database Storage**: PostgreSQL with Prisma ORM
- **Upload Management**: Secure file uploads with validation

### UI/UX

- **DaisyUI Components**: Modern, accessible UI components
- **Tailwind CSS**: Responsive design system
- **Dark/Light Themes**: Multiple theme options
- **Loading States**: Smooth user feedback

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **Authentication**: Clerk
- **Database**: PostgreSQL (Neon), Prisma ORM
- **File Processing**: Cloudinary, Next-Cloudinary
- **Deployment**: Vercel-ready

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rushi-018/saas-imaging.git
   cd saas-imaging
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with the following variables:

   ```env
   # Database
   DATABASE_URL="your_postgresql_connection_string"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

   # Cloudinary
   CLOUDINARY_API_KEY="your_cloudinary_api_key"
   CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
   ```

4. **Database Setup**

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Run Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
├── app/
│   ├── (app)/                 # Protected app routes
│   │   ├── home/             # Dashboard
│   │   ├── social-share/     # Image transformation
│   │   └── video-upload/     # Video processing
│   ├── (auth)/               # Authentication pages
│   ├── api/                  # API routes
│   │   ├── image-upload/     # Image processing API
│   │   ├── video-upload/     # Video processing API
│   │   └── video/           # Video data API
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── prisma/
│   ├── migrations/          # Database migrations
│   └── schema.prisma        # Database schema
├── middleware.ts            # Route protection
└── tailwind.config.ts       # Tailwind configuration
```

## 🎨 Available Social Media Formats

- **Instagram Square (1:1)**: 1080x1080px
- **Instagram Portrait (4:5)**: 1080x1350px
- **Twitter Post (16:9)**: 1200x675px
- **Twitter Header (3:1)**: 1500x500px
- **Facebook Cover (205:78)**: 820x312px

## 🔒 Authentication Flow

1. **Public Routes**: Landing page (`/`)
2. **Authentication**: Sign-in (`/sign-in`), Sign-up (`/sign-up`)
3. **Protected Routes**: Dashboard (`/home`), Features (`/social-share`, `/video-upload`)
4. **Auto-redirect**: Authenticated users redirected from auth pages

## 📊 Database Schema

```prisma
model video {
  id             String   @id @default(cuid())
  title          String
  description    String
  publicId       String
  originalSize   String
  compressedSize String
  duration       Float
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub repository
2. Connect to Vercel
3. Add environment variables
4. Deploy automatically

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Clerk](https://clerk.com/) - Authentication platform
- [Cloudinary](https://cloudinary.com/) - Media management
- [DaisyUI](https://daisyui.com/) - Tailwind CSS components
- [Prisma](https://prisma.io/) - Database toolkit

---

Built with ❤️ by [Rushi](https://github.com/rushi-018)
