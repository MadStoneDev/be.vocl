export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-3xl mx-auto">{children}</main>
    </div>
  );
}
