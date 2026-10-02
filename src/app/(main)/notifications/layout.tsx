import type { Metadata } from "next";
import { appPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = appPageMetadata("Activity");

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
