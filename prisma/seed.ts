import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import slugify from "slugify";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          name: "System Administrator",
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
      console.log(`Admin account created: ${adminEmail}`);
    } else {
      if (existingAdmin.role !== "ADMIN") {
        await prisma.user.update({
          where: { email: adminEmail },
          data: { role: "ADMIN" },
        });
        console.log(`Updated existing user ${adminEmail} to ADMIN role`);
      } else {
        console.log(`Admin account already exists: ${adminEmail}`);
      }
    }
  } else {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not found in env.");
  }

  // 2. Seed Catalog Data
  const running = await prisma.category.upsert({
    where: { slug: "running" },
    update: {},
    create: { name: "Running" , slug:"running"},

    });

    const lifestyle =await prisma.category.upsert({
        where: { slug: "lifestyle"},
        update: {},
        create:{name:"lifestyle", slug:"lifestyle"},
    });

    const products =[
        {
            name:"Air Zoom Pulse",
            category: running.id,
            brand: "Nike",
             description: "A lightweight running shoe built for daily mileage.",
      images: ["/images/Shoes/s05.avif", "/images/Shoes/s06.avif"],
      variants: [
        { size: "40", color: "Blue", price: 129, stock: 10 },
        { size: "41", color: "Blue", price: 129, stock: 8 },
        { size: "42", color: "Cream", price: 129, stock: 5 },
      ],
    },
     {
        name:"React Street",
        category: lifestyle.id,
         brand: "Nike",
      description: "A clean, everyday sneaker with a minimal silhouette.",
      images: ["/images/Shoes/so1.webp", "/images/Shoes/so2.webp"],
      variants: [
        { size: "39", color: "White", price: 99, stock: 12 },
        { size: "40", color: "Black", price: 99, stock: 7 },
      ],
     },
     {
      name: "Terrex Trail",
      category: running.id,
      brand: "Nike",
      description: "Rugged trail-ready construction with reinforced grip.",
      images: ["/images/Shoes/so3.avif", "/images/Shoes/so4.avif"],
      variants: [
        { size: "42", color: "Olive", price: 149, stock: 6 },
        { size: "43", color: "Grey", price: 149, stock: 4 },
      ],  
     } ,
     {
          name: "Superstar Classic",
      category: lifestyle.id,
      brand: "Adidas",
      description: "A timeless low-top silhouette that pairs with everything.",
      images: ["/images/Shoes/a01.avif"],
      variants: [
        { size: "40", color: "Cream", price: 89, stock: 15 },
        { size: "41", color: "Navy", price: 89, stock: 9 },
      ],
    },
      {
      name: "Ultraboost Flow",
      category: running.id,
      brand: "Adidas",
      description: "Responsive cushioning built for long-distance comfort.",
      images: ["/images/Shoes/a01.avif"],
      variants: [
        { size: "41", color: "Black", price: 179, stock: 8 },
        { size: "42", color: "Black", price: 179, stock: 5 },
        ],
    },
    {
      name: "Court Vintage",
      category: lifestyle.id,
      brand: "Nike",
      description: "Retro-inspired court sneaker with premium leather.",
      images: ["/images/Shoes/so2.webp"],
      variants: [
        { size: "40", color: "White", price: 109, stock: 10 },
        { size: "41", color: "White", price: 109, stock: 6 },
      ],
    },
    {
      name: "Ridge Runner",
      category: running.id,
      brand: "Nike",
      description: "All-terrain grip with a breathable mesh upper.",
      images: ["/images/Shoes/s06.avif"],
      variants: [
        { size: "39", color: "Grey", price: 139, stock: 9 },
        { size: "40", color: "Grey", price: 139, stock: 7 },
      ],
    },
    {
      name: "Metro Slip",
      category: lifestyle.id,
      brand: "Adidas",
      description: "Slip-on comfort with a clean minimal profile.",
      images: ["/images/Shoes/so4.avif"],
      variants: [
        { size: "38", color: "Cream", price: 79, stock: 11 },
        { size: "39", color: "Navy", price: 79, stock: 6 },
      ],
    },
    
  ]; 
    
  for ( const p of products){
    const slug =slugify(p.name, {lower: true});

    await prisma.product.upsert({
        where:{slug},
        update: {},
        create: {
            name: p.name,
            slug,
            description:p.description,
            brand: p.brand,
            categoryId: p.category,
            images:{
                create: p.images.map((url, i)=>({
                    url,
                    isPrimary: i ===0,
                    position: i,
                })),
            },
            variants:{
                create: p.variants.map((v) => ({
            size: v.size,
            color: v.color,
            price: v.price,
            stock: v.stock,
            sku: `${slug}-${v.size}-${v.color}`.toUpperCase(),
          })),
            },
        },
    });
  }
  console.log("Seed Complete");
    
}

main()
.catch((e)=>{
    console.error(e);
    process.exit(1);
})
.finally(async() =>{
    await prisma.$disconnect();
});