/*
  Warnings:

  - A unique constraint covering the columns `[razorpayCustomerId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpaySubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Subscription" ADD COLUMN     "razorpayCustomerId" TEXT,
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpaySubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpayCustomerId_key" ON "public"."Subscription"("razorpayCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "public"."Subscription"("razorpaySubscriptionId");
