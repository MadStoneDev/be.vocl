import { Suspense } from "react";
import { AuthCard } from "@/components/auth";
import { LoadingSpinner } from "@/components/ui";

export const metadata = {
  title: "Sign up | be.vocl",
  description: "Create your be.vocl account",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" className="mx-auto" />}>
      <AuthCard initialMode="signup" />
    </Suspense>
  );
}
