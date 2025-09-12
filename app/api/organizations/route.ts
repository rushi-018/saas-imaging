import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Get the current user's organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user in our database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    // If user doesn't exist in our database yet, they don't have an organization
    if (!user) {
      return NextResponse.json({ hasOrganization: false });
    }

    return NextResponse.json({
      hasOrganization: true,
      organization: user.organization,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Create a new organization
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "An organization with a similar name already exists" },
        { status: 400 }
      );
    }

    // Create the organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
          plan: "free",
        },
      });

      // Create the user with owner role
      const user = await tx.user.create({
        data: {
          id: userId,
          email: "", // This will be updated later
          organizationId: organization.id,
          role: "owner",
        },
      });

      // Create initial subscription record with free plan
      const subscription = await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: "free",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          videoCredits: 5, // Free plan credits
          imageCredits: 20, // Free plan credits
        },
      });

      return { organization, user, subscription };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Update organization details
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, organizationId } = await request.json();

    // Check if the user is an owner or admin of this organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: { in: ["owner", "admin"] },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "You don't have permission to update this organization" },
        { status: 403 }
      );
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: { name },
    });

    return NextResponse.json(updatedOrganization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
