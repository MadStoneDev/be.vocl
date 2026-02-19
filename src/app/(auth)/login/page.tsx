import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/components/auth";
import { LoadingSpinner } from "@/components/ui";

export const metadata = {
  title: "Log in | be.vocl",
  description: "Log in to your be.vocl account",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <Suspense fallback={<LoadingSpinner size="lg" className="mx-auto" />}>
      <AuthCard initialMode="login" />
    </Suspense>
  );
}
