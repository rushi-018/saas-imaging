import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Get all video transforms for a specific video
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }
    
    // Get the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Verify the video belongs to the user's organization
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { transforms: true }
    });
    
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }
    
    if (video.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "You don't have permission to access this video" },
        { status: 403 }
      );
    }
    
    // Return the transforms
    return NextResponse.json(video.transforms);
    
  } catch (error) {
    console.error("Error fetching video transforms:", error);
    return NextResponse.json(
      { error: "Failed to fetch video transforms" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Create a new video transform
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { videoId, name, transformType, settings, brandKitId } = await request.json();
    
    if (!videoId || !transformType) {
      return NextResponse.json(
        { error: "Video ID and transform type are required" },
        { status: 400 }
      );
    }
    
    // Get the user and their organization with subscription details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { subscription: true }
        }
      }
    });
    
    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 404 }
      );
    }
    
    // Verify the video belongs to the user's organization
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }
    
    if (video.organizationId !== user.organization.id) {
      return NextResponse.json(
        { error: "You don't have permission to access this video" },
        { status: 403 }
      );
    }
    
    // Check transform limits based on subscription
    const organization = user.organization;
    const planLimits: Record<string, number> = {
      free: 1,
      creator: 3,
      business: 10,
      agency: 50
    };
    const maxTransformsPerVideo = planLimits[organization.plan] || 1;
    
    // Count existing transforms for this video
    const transformCount = await prisma.videoTransform.count({
      where: { videoId }
    });
    
    if (transformCount >= maxTransformsPerVideo) {
      return NextResponse.json(
        { 
          error: `Maximum number of transforms (${maxTransformsPerVideo}) reached for your plan`,
          currentCount: transformCount,
          maxAllowed: maxTransformsPerVideo
        },
        { status: 403 }
      );
    }
    
    // Check if brand kit belongs to organization if provided
    if (brandKitId) {
      const brandKit = await prisma.brandKit.findUnique({
        where: { id: brandKitId }
      });
      
      if (!brandKit || brandKit.organizationId !== organization.id) {
        return NextResponse.json(
          { error: "Invalid brand kit selected" },
          { status: 400 }
        );
      }
    }
    
    // Initialize Cloudinary transformation options
    let transformOptions: any = {
      resource_type: "video",
      type: "upload"
    };
    
    let cloudinaryTransformation: any[] = [];
    
    // Apply transform settings based on type
    switch (transformType) {
      case "resize":
        // Handle resize transformation
        if (settings?.width && settings?.height) {
          cloudinaryTransformation.push({
            width: settings.width,
            height: settings.height,
            crop: settings.crop || "fill"
          });
        }
        break;
        
      case "social":
        // Handle social media format transformation
        const platform = settings?.platform || "instagram";
        const aspectRatios: Record<string, string> = {
          instagram: "1:1",
          tiktok: "9:16",
          youtube: "16:9",
          facebook: "16:9",
          twitter: "16:9",
          linkedin: "1.91:1"
        };
        const aspectRatio = aspectRatios[platform] || "16:9";
        
        const [width, height] = aspectRatio.split(":").map(Number);
        cloudinaryTransformation.push({
          aspect_ratio: aspectRatio,
          width: 1080,
          crop: "fill"
        });
        break;
        
      case "trim":
        // Handle video trimming
        if (settings?.startTime || settings?.endTime) {
          transformOptions.start_offset = settings.startTime || 0;
          if (settings.endTime) {
            transformOptions.end_offset = settings.endTime;
          }
        }
        break;
        
      case "watermark":
        // Handle watermarking (with logo or text)
        if (settings?.text) {
          cloudinaryTransformation.push({
            overlay: {
              font_family: settings.fontFamily || "Arial",
              font_size: settings.fontSize || 30,
              text: settings.text
            },
            color: settings.textColor || "white",
            gravity: settings.position || "south_east",
            y: 20,
            x: 20
          });
        } else if (settings?.logoPublicId) {
          cloudinaryTransformation.push({
            overlay: settings.logoPublicId,
            gravity: settings.position || "south_east",
            width: settings.logoWidth || 100,
            opacity: settings.opacity || 70,
            y: 20,
            x: 20
          });
        }
        break;
        
      case "brandKit":
        // Apply brand kit settings if provided
        if (brandKitId) {
          const brandKit = await prisma.brandKit.findUnique({
            where: { id: brandKitId }
          });
          
          if (brandKit?.logoPublicId) {
            cloudinaryTransformation.push({
              overlay: brandKit.logoPublicId,
              gravity: settings?.position || "south_east",
              width: settings?.logoWidth || 100,
              opacity: settings?.opacity || 70,
              y: 20,
              x: 20
            });
          }
        }
        break;
    }
    
    if (cloudinaryTransformation.length > 0) {
      transformOptions.transformation = cloudinaryTransformation;
    }
    
    // Create a new transformation in Cloudinary
    const result = await cloudinary.uploader.explicit(
      video.publicId,
      transformOptions
    );
    
    // Save the transform details in the database
    const transform = await prisma.videoTransform.create({
      data: {
        name: name || `${transformType} ${new Date().toISOString()}`,
        transformType,
        settings: settings || {},
        outputUrl: result.secure_url,
        outputPublicId: result.public_id,
        status: "completed",
        videoId,
        brandKitId: brandKitId || null
      }
    });
    
    // Track usage for the organization
    await prisma.usage.create({
      data: {
        organizationId: organization.id, 
        type: "videoTransform",
        count: 1,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }
    });
    
    return NextResponse.json(transform);
    
  } catch (error) {
    console.error("Error creating video transform:", error);
    return NextResponse.json(
      { error: "Failed to create video transform" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Delete a video transform
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!id) {
      return NextResponse.json(
        { error: "Transform ID is required" },
        { status: 400 }
      );
    }
    
    // Get the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get the transform
    const transform = await prisma.videoTransform.findUnique({
      where: { id },
      include: { video: true }
    });
    
    if (!transform) {
      return NextResponse.json(
        { error: "Transform not found" },
        { status: 404 }
      );
    }
    
    // Verify the transform's video belongs to the user's organization
    if (transform.video.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "You don't have permission to delete this transform" },
        { status: 403 }
      );
    }
    
    // Delete the transform resource in Cloudinary if it has a separate public ID
    if (transform.outputPublicId && transform.outputPublicId !== transform.video.publicId) {
      try {
        await cloudinary.uploader.destroy(transform.outputPublicId, {
          resource_type: "video"
        });
      } catch (cloudinaryError) {
        console.error("Error deleting Cloudinary resource:", cloudinaryError);
        // Continue with deletion in database even if Cloudinary deletion fails
      }
    }
    
    // Delete the transform from the database
    await prisma.videoTransform.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error deleting video transform:", error);
    return NextResponse.json(
      { error: "Failed to delete video transform" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
