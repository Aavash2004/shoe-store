import { prisma } from "@/lib/db/prisma";

type UserWithCount = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  _count: {
    orders: number;
  };
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
          Customers
        </span>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          Users
        </h1>
        <p className="mt-1 text-xs text-[var(--color-navy)]/60">
          {users.length} registered users
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Orders</th>
              <th className="px-6 py-4 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-sand)]/70">
            {users.map((user: UserWithCount) => (
              <tr key={user.id} className="hover:bg-[var(--color-sand)]/20">
                <td className="px-6 py-4 font-medium text-[var(--color-navy)]">
                  {user.name || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-navy)]/70">
                  {user.email}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      user.role === "ADMIN"
                        ? "bg-[var(--color-navy)]/10 text-[var(--color-navy)]"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-[var(--color-navy)]/70">
                  {user._count.orders}
                </td>
                <td className="px-6 py-4 text-right text-xs text-[var(--color-navy)]/50">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}