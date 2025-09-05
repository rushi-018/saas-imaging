import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20" // Use the latest API version
});

// Define plan details
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    videoCredits: 5,
    imageCredits: 20,
    storageLimit: 1, // GB
    features: ["Basic video compression", "Social media image formats", "1 user"]
  },
  creator: {
    name: "Creator",
    price: 1999, // $19.99
    videoCredits: 20,
    imageCredits: 100,
    storageLimit: 10, // GB
    features: ["Advanced compression", "All social platforms", "Brand kit", "Analytics"]
  },
  business: {
    name: "Business",
    price: 4999, // $49.99
    videoCredits: 100,
    imageCredits: 500,
    storageLimit: 50, // GB
    features: ["Team collaboration", "Multiple brand kits", "Advanced analytics", "Priority processing"]
  },
  agency: {
    name: "Agency",
    price: 12999, // $129.99
    videoCredits: 500,
    imageCredits: 2000,
    storageLimit: 250, // GB
    features: ["Unlimited users", "White-label exports", "API access", "Dedicated support"]
  }
};

// Get subscription details
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user to get their organization
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
        { error: "User or organization not found" },
        { status: 404 }
      );
    }
    
    // Get the subscription details
    const subscription = user.organization.subscription;
    
    // Get the available plans
    const availablePlans = Object.keys(PLANS).map(planId => ({
      id: planId,
      ...PLANS[planId as keyof typeof PLANS],
      current: planId === subscription?.plan
    }));
    
    return NextResponse.json({
      subscription,
      availablePlans
    });
    
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Create or update a subscription
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { planId } = await request.json();
    
    if (!planId || !PLANS[planId as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }
    
    // Find the user and organization
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
        { error: "User or organization not found" },
        { status: 404 }
      );
    }
    
    // Only owners can change subscription plans
    if (user.role !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can change subscription plans" },
        { status: 403 }
      );
    }
    
    const organization = user.organization;
    const currentSubscription = organization.subscription;
    
    // For free plan, simply update the database
    if (planId === "free") {
      const updatedSubscription = await prisma.subscription.update({
        where: { organizationId: organization.id },
        data: {
          plan: "free",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          videoCredits: PLANS.free.videoCredits,
          imageCredits: PLANS.free.imageCredits,
          storageLimit: PLANS.free.storageLimit
        }
      });
      
      await prisma.organization.update({
        where: { id: organization.id },
        data: { plan: "free" }
      });
      
      return NextResponse.json({ 
        subscription: updatedSubscription,
        redirectUrl: null 
      });
    }
    
    // For paid plans, create a Stripe checkout session
    let customer;
    
    // Use existing customer or create a new one
    if (currentSubscription?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(currentSubscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : undefined,
        metadata: {
          userId: user.id,
          organizationId: organization.id
        }
      });
    }
    
    // Create a checkout session
    const plan = PLANS[planId as keyof typeof PLANS];
    
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `CloudMedia Pro - ${plan.name} Plan`,
              description: `${plan.features.join(", ")}`,
            },
            unit_amount: plan.price,
            recurring: {
              interval: "month"
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        userId: user.id,
        organizationId: organization.id,
        planId
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    });
    
    // Return the checkout URL
    return NextResponse.json({ 
      redirectUrl: session.url 
    });
    
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Cancel a subscription
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the user and organization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: { subscription: true }
        }
      }
    });
    
    if (!user || !user.organization || !user.organization.subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }
    
    // Only owners can cancel subscription plans
    if (user.role !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can cancel subscription plans" },
        { status: 403 }
      );
    }
    
    const subscription = user.organization.subscription;
    
    // If there's a Stripe subscription, cancel it
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      // Update the subscription in our database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true
        }
      });
    } else {
      // For free plans or if no Stripe subscription exists
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: "free",
          status: "active",
          videoCredits: PLANS.free.videoCredits,
          imageCredits: PLANS.free.imageCredits,
          storageLimit: PLANS.free.storageLimit
        }
      });
      
      await prisma.organization.update({
        where: { id: user.organization.id },
        data: { plan: "free" }
      });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
