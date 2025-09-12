import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

// Get all users in the organization
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user to get their organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Get all users in the organization
    const users = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Add a new user to the organization
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role, newUserId } = await request.json();

    // Find the current user to get their organization and check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { subscription: true },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Check if current user is an owner or admin
    if (!["owner", "admin"].includes(currentUser.role)) {
      return NextResponse.json(
        { error: "You don't have permission to add users" },
        { status: 403 }
      );
    }

    // Check if the organization has reached its user limit based on subscription
    const orgUsers = await prisma.user.count({
      where: { organizationId: currentUser.organizationId },
    });

    const planLimits = {
      free: 1,
      creator: 1,
      business: 5,
      agency: 15,
    };

    const currentPlan = currentUser.organization.subscription?.plan || "free";
    const maxUsers = planLimits[currentPlan as keyof typeof planLimits];

    if (orgUsers >= maxUsers) {
      return NextResponse.json(
        {
          error: "User limit reached for your subscription plan",
          currentUsers: orgUsers,
          maxUsers,
        },
        { status: 403 }
      );
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        id: newUserId,
        email,
        organizationId: currentUser.organizationId,
        role: role || "member",
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Error adding user:", error);
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Update a user's role
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId, role } = await request.json();

    // Find the current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Only owners can change roles
    if (currentUser.role !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can change roles" },
        { status: 403 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Ensure users are in the same organization
    if (currentUser.organizationId !== targetUser.organizationId) {
      return NextResponse.json(
        { error: "You can only update users in your organization" },
        { status: 403 }
      );
    }

    // Prevent changing the role of the organization owner
    if (targetUser.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the role of the organization owner" },
        { status: 403 }
      );
    }

    // Update the user role
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Remove a user from the organization
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Find the current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Only owners and admins can remove users
    if (!["owner", "admin"].includes(currentUser.role)) {
      return NextResponse.json(
        { error: "You don't have permission to remove users" },
        { status: 403 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Ensure users are in the same organization
    if (currentUser.organizationId !== targetUser.organizationId) {
      return NextResponse.json(
        { error: "You can only remove users from your organization" },
        { status: 403 }
      );
    }

    // Prevent removing the organization owner
    if (targetUser.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove the organization owner" },
        { status: 403 }
      );
    }

    // Remove the user
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing user:", error);
    return NextResponse.json(
      { error: "Failed to remove user" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
