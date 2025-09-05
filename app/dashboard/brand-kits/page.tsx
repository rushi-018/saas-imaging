import { Metadata } from "next";
import BrandKitManager from "../../components/brand-kit/BrandKitManager";

export const metadata: Metadata = {
  title: "Brand Kits | CloudMedia Pro",
  description: "Manage your brand kits to create consistent branded videos",
};

export default function BrandKitsPage() {
  return <BrandKitManager />;
}
