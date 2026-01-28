import { AuthCard } from "@/components/auth";

export const metadata = {
  title: "Log in | be.vocl",
  description: "Log in to your be.vocl account",
};

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
