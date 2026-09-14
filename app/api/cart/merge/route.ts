import { NextRequest, NextResponse } from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/db/prisma";
import {auth } from "@/lib/auth/auth";

const mergeSchema =z.object({
    items: z.array(
        z.object({
            variantId: z.string(),
            quantity: z.number().min(1),
        })
    ),
});

export async function POST(request: NextRequest) {
   const session =await auth();
   if(!session?.user) {
    return NextResponse.json({error:"Unauthorized"},{status:401});
   }

   const body = await request.json();
   const parsed = mergeSchema.safeParse(body);
   if (!parsed.success){
    return NextResponse.json({error:"Invalid input"}, {status:400});
   }
 const userId =( session.user as any).id;

 let cart =await prisma.cart.findUnique({where:{userId}});
 if (!cart) {
    cart =await prisma.cart.create({data: {userId}});
 }

  for (const item of parsed.data.items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      select: { stock: true, isActive: true },
    });

    if (!variant || !variant.isActive || variant.stock <= 0) continue;

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
    });

    if (existing) {
      const mergedQty = Math.min(existing.quantity + item.quantity, variant.stock);
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: mergedQty },
      });
    } else {
      const initialQty = Math.min(item.quantity, variant.stock);
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId: item.variantId, quantity: initialQty },
      });
    }
  }

  return NextResponse.json({ success: true });
}