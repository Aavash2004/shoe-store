import { prisma } from "@/lib/db/prisma";
import { AdminStaffClient, type AdminStaffRow } from "@/components/admin/AdminStaffClient";
import { requireAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  await requireAdmin();

  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      passwordChangedAt: true,
    },
  });

  const serializedStaff: AdminStaffRow[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    isActive: s.isActive,
    mustChangePassword: s.mustChangePassword,
    createdAt: s.createdAt.toISOString(),
    passwordChangedAt: s.passwordChangedAt?.toISOString() || null,
  }));

  return <AdminStaffClient initialStaff={serializedStaff} />;
}
