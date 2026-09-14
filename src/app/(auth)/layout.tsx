export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No forced centering: the auth pages are masthead-led and top-aligned,
  // full-width (a rail form beside tonight's page — never a centred card).
  // Pages that want centring (onboarding) provide their own wrapper.
  return (
    <div className="min-h-dvh bg-background text-foreground py-6 sm:py-8">
      {children}
    </div>
  );
}
