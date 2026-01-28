import { FloatingPostsBackground } from "@/components/auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FloatingPostsBackground />
      <div className="relative z-20 w-full">{children}</div>
    </div>
  );
}
