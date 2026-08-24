import { NextRequest , NextResponse } from "next/server";
import {prisma } from "@/lib/db/prisma";

export async function GET(
    request: NextRequest,
{params}: {params: Promise<{slug:string}>})
 {
    const {slug}= await params;

    const product = await prisma.product.findFirst({
        where: { slug, isActive: true, deletedAt: null},
        include:{
            category: true,
            images:{ orderBy: { position:"asc"}},
            variants: { where: { isActive: true } },
            reviews: true,
        },
    })
        if (!product) {
            return NextResponse.json({error: "Product not found "}, { status:404});
        }
        return NextResponse.json({product})
    
}
