import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View Credentials' below to copy your API secret
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  url: string;
  folder?: string;
  original_filename?: string;
  bit_rate?: number;
  frame_rate?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary credentials not found" },
        { status: 500 }
      );
    }

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        {
          error:
            "User organization not found. Please create an organization first.",
        },
        { status: 404 }
      );
    }

    const organization = user.organization;
    const subscription = organization.subscription;

    // Check if the user has enough video credits
    if (subscription && subscription.videoCredits <= 0) {
      return NextResponse.json(
        {
          error: "Video processing credits exhausted for this billing period",
          subscription,
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const originalSize = formData.get("originalSize") as string;
    const brandKitId = formData.get("brandKitId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine quality based on subscription plan
    const qualitySettings = {
      free: { quality: "auto", fetch_format: "mp4" },
      creator: { quality: "80", fetch_format: "mp4" },
      business: { quality: "90", fetch_format: "mp4" },
      agency: { quality: "100", fetch_format: "mp4" },
    };

    const planQuality =
      qualitySettings[organization.plan as keyof typeof qualitySettings] ||
      qualitySettings.free;

    // Extract file extension for determining resolution limits
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    // Determine max resolution based on plan
    const maxResolutions = {
      free: 720,
      creator: 1080,
      business: 1440,
      agency: 2160, // 4K
    };

    const maxHeight =
      maxResolutions[organization.plan as keyof typeof maxResolutions] || 720;

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: `cloudmedia/${organization.id}`,
            transformation: [
              { ...planQuality, height: maxHeight, crop: "limit" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as CloudinaryUploadResult);
          }
        );
        uploadStream.end(buffer);
      }
    );

    // Create the video in a transaction along with updating credits
    const { video } = await prisma.$transaction(async (tx) => {
      // Create the video
      const video = await tx.video.create({
        data: {
          title,
          description,
          publicId: result.public_id,
          originalSize: originalSize,
          compressedSize: String(result.bytes),
          duration: result.duration || 0,
          format: "mp4",
          resolution: `${Math.min(result.height || 720, maxHeight)}p`,
          userId: userId,
          organizationId: organization.id,
          brandKitId: brandKitId || undefined,
        },
      });

      // Deduct a video credit if on a paid plan
      if (subscription && organization.plan !== "free") {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            videoCredits: {
              decrement: 1,
            },
          },
        });
      }

      return { video };
    });

    return NextResponse.json(video);
  } catch (error) {
    console.log("UPload video failed", error);
    return NextResponse.json({ error: "UPload video failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
