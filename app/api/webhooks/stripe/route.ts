import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Define plan credits
const PLAN_CREDITS = {
  creator: {
    videoCredits: 20,
    imageCredits: 100,
    storageLimit: 10,
  },
  business: {
    videoCredits: 100,
    imageCredits: 500,
    storageLimit: 50,
  },
  agency: {
    videoCredits: 500,
    imageCredits: 2000,
    storageLimit: 250,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Invalid signature:", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { organizationId, planId } = session.metadata || {};

        if (organizationId && planId) {
          // Update organization plan
          await prisma.organization.update({
            where: { id: organizationId },
            data: { plan: planId },
          });

          // Get subscription details from Stripe
          if (session.subscription) {
            const stripeSubscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            // Update our subscription record
            await prisma.subscription.update({
              where: { organizationId },
              data: {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                plan: planId,
                status: stripeSubscription.status,
                currentPeriodStart: new Date(
                  (stripeSubscription as any).current_period_start * 1000
                ),
                currentPeriodEnd: new Date(
                  (stripeSubscription as any).current_period_end * 1000
                ),
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                videoCredits:
                  PLAN_CREDITS[planId as keyof typeof PLAN_CREDITS]
                    ?.videoCredits || 5,
                imageCredits:
                  PLAN_CREDITS[planId as keyof typeof PLAN_CREDITS]
                    ?.imageCredits || 20,
                storageLimit:
                  PLAN_CREDITS[planId as keyof typeof PLAN_CREDITS]
                    ?.storageLimit || 1,
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            (invoice as any).subscription as string
          );

          // Find our subscription by Stripe subscription ID
          const ourSubscription = await prisma.subscription.findFirst({
            where: {
              stripeSubscriptionId: (invoice as any).subscription as string,
            },
          });

          if (ourSubscription) {
            // Reset credits for the new billing period
            await prisma.subscription.update({
              where: { id: ourSubscription.id },
              data: {
                status: subscription.status,
                currentPeriodStart: new Date(
                  (subscription as any).current_period_start * 1000
                ),
                currentPeriodEnd: new Date(
                  (subscription as any).current_period_end * 1000
                ),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                videoCredits:
                  PLAN_CREDITS[
                    ourSubscription.plan as keyof typeof PLAN_CREDITS
                  ]?.videoCredits || 5,
                imageCredits:
                  PLAN_CREDITS[
                    ourSubscription.plan as keyof typeof PLAN_CREDITS
                  ]?.imageCredits || 20,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find our subscription by Stripe subscription ID
        const ourSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (ourSubscription) {
          await prisma.subscription.update({
            where: { id: ourSubscription.id },
            data: {
              status: subscription.status,
              currentPeriodEnd: new Date(
                (subscription as any).current_period_end * 1000
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find our subscription by Stripe subscription ID
        const ourSubscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
          include: { organization: true },
        });

        if (ourSubscription) {
          // Downgrade to free plan
          await prisma.subscription.update({
            where: { id: ourSubscription.id },
            data: {
              plan: "free",
              status: "canceled",
              videoCredits: 5,
              imageCredits: 20,
              storageLimit: 1,
            },
          });

          await prisma.organization.update({
            where: { id: ourSubscription.organizationId },
            data: { plan: "free" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error in Stripe webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
