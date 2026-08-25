import { prisma } from "@/lib/db/prisma";

type VariantWithProduct = {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: any;
  product: {
    name: string;
    slug: string;
  };
};

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
    include: {
      product: { select: { name: true, slug: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
          Stock
        </span>
        <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          Inventory
        </h1>
        <p className="mt-1 text-xs text-[var(--color-navy)]/60">
          {variants.length} active variants
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Size</th>
              <th className="px-6 py-4">Color</th>
              <th className="px-6 py-4 text-right">Stock</th>
              <th className="px-6 py-4 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-sand)]/70">
            {variants.map((v: VariantWithProduct) => (
              <tr key={v.id} className="hover:bg-[var(--color-sand)]/20">
                <td className="px-6 py-4 font-medium text-[var(--color-navy)]">
                  {v.product.name}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-navy)]/70">
                  {v.size}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-navy)]/70">
                  {v.color}
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`font-medium ${
                      v.stock <= 5 ? "text-rose-600" : "text-[var(--color-navy)]"
                    }`}
                  >
                    {v.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[var(--color-navy)]">
                  ${Number(v.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}