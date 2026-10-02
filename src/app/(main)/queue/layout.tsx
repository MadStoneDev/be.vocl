import type { Metadata } from "next";
import { appPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = appPageMetadata("Queue");

export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
