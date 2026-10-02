import type { Metadata } from "next";

// The page is a client component, so it can't export metadata and its inline
// <title> wasn't applying reliably. Set the title here (server metadata); the
// root template turns it into "Communities | be.vocl".
export const metadata: Metadata = {
  title: "Communities",
};

export default function CommunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
