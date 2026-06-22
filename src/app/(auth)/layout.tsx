export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-10">
      <div className="relative z-20 w-full">{children}</div>
    </div>
  );
}
