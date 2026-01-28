import { AuthCard } from "@/components/auth";

export const metadata = {
  title: "Sign up | be.vocl",
  description: "Create your be.vocl account",
};

export default function SignupPage() {
  return <AuthCard initialMode="signup" />;
}
