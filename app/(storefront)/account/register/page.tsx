import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/AuthForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create an account to track orders and save your details.",
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user] = await Promise.all([searchParams, getSessionUser()]);
  if (user) redirect("/account");

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Faster checkout, saved addresses and early access to small-run releases."
      image="/images/products/alma-linen-dress.jpg"
      quote={{ text: "I have never had a store remember my sizes so precisely.", author: "Ruth O. — Accra" }}
    >
      <RegisterForm next={next} />
    </AuthLayout>
  );
}
