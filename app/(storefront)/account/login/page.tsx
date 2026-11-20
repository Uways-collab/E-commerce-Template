import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to view your orders, addresses and tracking.",
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getSessionUser()]);
  if (user) redirect(next && next.startsWith("/") ? next : "/account");

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track orders, save addresses and check out faster."
      quote={{ text: "The linen arrived in two days and has not left my body since.", author: "Amina B. — Lagos" }}
    >
      <LoginForm next={next} />
    </AuthLayout>
  );
}
