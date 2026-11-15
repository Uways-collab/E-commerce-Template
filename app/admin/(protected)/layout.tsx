import { requireAdmin } from "@/lib/auth";

export const metadata = {
  title: { default: "Dashboard", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
