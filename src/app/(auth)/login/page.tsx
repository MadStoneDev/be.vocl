import { Suspense } from "react";
import { AuthCard } from "@/components/auth";
import { LoadingSpinner } from "@/components/ui";

export const metadata = {
  title: "Log in | be.vocl",
  description: "Log in to your be.vocl account",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" className="mx-auto" />}>
      <AuthCard initialMode="login" />
    </Suspense>
  );
}
