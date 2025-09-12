import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    // Get videos for the user's organization with optional filtering
    const videos = await prisma.video.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        transforms: true,
        brandKit: {
          select: {
            name: true,
            primaryColor: true,
          },
        },
      },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error in GET /api/videos:", error);
    return NextResponse.json(
      { error: "Error fetching videos", details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
