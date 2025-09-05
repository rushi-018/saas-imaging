import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Try to use the standard Prisma query
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        publicId: true,
        // Try to be flexible with the column name
        originalSize: true,
        compressedSize: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error in GET /api/videos:", error);

    // Fallback to raw query if the standard query fails
    try {
      const rawVideos = await prisma.$queryRaw`
        SELECT * FROM video ORDER BY "createdAt" DESC
      `;
      return NextResponse.json(rawVideos);
    } catch (secondError) {
      console.error("Fallback query also failed:", secondError);
      return NextResponse.json(
        { error: "Error fetching videos", details: (error as Error).message },
        { status: 500 }
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
