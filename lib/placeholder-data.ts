import type { PlaceholderProductDetail } from "@/types";

export const placeholderProducts: PlaceholderProductDetail[] = [
  {
    id: "1",
    name: "Air Zoom Pulse",
    slug: "air-zoom-pulse",
    price: 129,
    image: "/images/Shoes/s05.avif",
    category: "Running",
    brand: "Nike",
    description:
      "A lightweight running shoe built for daily mileage, with responsive cushioning and a breathable knit upper.",
    images: ["/images/Shoes/s05.avif", "/images/Shoes/s06.avif"],
    sizes: ["39", "40", "41", "42", "43"],
    colors: ["Blue", "Cream"],
  },
  {
    id: "2",
    name: "React Street",
    slug: "react-street",
    price: 99,
    image: "/images/Shoes/so1.webp",
    category: "Lifestyle",
    brand: "Nike",
    description:
      "A clean, everyday sneaker with a minimal silhouette and durable leather construction.",
    images: ["/images/Shoes/so1.webp", "/images/Shoes/so2.webp"],
    sizes: ["38", "39", "40", "41"],
    colors: ["White", "Black"],
  },
  {
    id: "3",
    name: "Terrex Trail",
    slug: "terrex-trail",
    price: 149,
    image: "/images/Shoes/so3.avif",
    category: "Running",
    brand: "Nike",
    description:
      "Rugged trail-ready construction with reinforced grip for uneven terrain.",
    images: ["/images/Shoes/so3.avif", "/images/Shoes/so4.avif"],
    sizes: ["40", "41", "42", "43", "44"],
    colors: ["Olive", "Grey"],
  },
  {
    id: "4",
    name: "Superstar Classic",
    slug: "superstar-classic",
    price: 89,
    image: "/images/Shoes/a01.avif",
    category: "Lifestyle",
    brand: "Adidas",
    description:
      "A timeless low-top silhouette that pairs with everything.",
    images: ["/images/Shoes/a01.avif"],
    sizes: ["38", "39", "40", "41", "42"],
    colors: ["Cream", "Navy"],
  },
];