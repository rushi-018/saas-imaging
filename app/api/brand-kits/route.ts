import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Get all brand kits for the organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the user's organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get brand kits for the organization
    const brandKits = await prisma.brandKit.findMany({
      where: {
        organizationId: user.organizationId
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(brandKits);
    
  } catch (error) {
    console.error("Error fetching brand kits:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand kits" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Create a new brand kit
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    
    // Check if the user can create a brand kit based on their plan
    const organization = user.organization;
    const maxBrandKits = {
      free: 1,
      creator: 1,
      business: 3,
      agency: 10
    }[organization.plan];
    
    // Count existing brand kits
    const brandKitCount = await prisma.brandKit.count({
      where: { organizationId: organization.id }
    });
    
    if (brandKitCount >= maxBrandKits) {
      return NextResponse.json(
        { 
          error: `Maximum number of brand kits (${maxBrandKits}) reached for your plan`,
          currentCount: brandKitCount,
          maxAllowed: maxBrandKits
        },
        { status: 403 }
      );
    }
    
    const { name, logoPublicId, primaryColor, secondaryColor, fontFamily } = await request.json();
    
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Brand kit name is required" },
        { status: 400 }
      );
    }
    
    // Create the brand kit
    const brandKit = await prisma.brandKit.create({
      data: {
        name,
        logoPublicId,
        primaryColor,
        secondaryColor,
        fontFamily,
        organizationId: organization.id
      }
    });
    
    return NextResponse.json(brandKit);
    
  } catch (error) {
    console.error("Error creating brand kit:", error);
    return NextResponse.json(
      { error: "Failed to create brand kit" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Update a brand kit
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id, name, logoPublicId, primaryColor, secondaryColor, fontFamily } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Brand kit ID is required" },
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
    
    // Verify the brand kit belongs to the user's organization
    const brandKit = await prisma.brandKit.findUnique({
      where: { id }
    });
    
    if (!brandKit) {
      return NextResponse.json(
        { error: "Brand kit not found" },
        { status: 404 }
      );
    }
    
    if (brandKit.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "You don't have permission to update this brand kit" },
        { status: 403 }
      );
    }
    
    // Update the brand kit
    const updatedBrandKit = await prisma.brandKit.update({
      where: { id },
      data: {
        name: name || brandKit.name,
        logoPublicId: logoPublicId !== undefined ? logoPublicId : brandKit.logoPublicId,
        primaryColor: primaryColor !== undefined ? primaryColor : brandKit.primaryColor,
        secondaryColor: secondaryColor !== undefined ? secondaryColor : brandKit.secondaryColor,
        fontFamily: fontFamily !== undefined ? fontFamily : brandKit.fontFamily
      }
    });
    
    return NextResponse.json(updatedBrandKit);
    
  } catch (error) {
    console.error("Error updating brand kit:", error);
    return NextResponse.json(
      { error: "Failed to update brand kit" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Delete a brand kit
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
        { error: "Brand kit ID is required" },
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
    
    // Verify the brand kit belongs to the user's organization
    const brandKit = await prisma.brandKit.findUnique({
      where: { id }
    });
    
    if (!brandKit) {
      return NextResponse.json(
        { error: "Brand kit not found" },
        { status: 404 }
      );
    }
    
    if (brandKit.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: "You don't have permission to delete this brand kit" },
        { status: 403 }
      );
    }
    
    // Delete the brand kit
    await prisma.brandKit.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error deleting brand kit:", error);
    return NextResponse.json(
      { error: "Failed to delete brand kit" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
