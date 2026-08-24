import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return <div className="mx-auto max-w-4xl px-6 py-12">{children}</div>;
}
