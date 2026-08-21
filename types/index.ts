export type PlaceholderProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  brand: string;
};

export type PlaceholderProductDetail = PlaceholderProduct & {
  description: string;
  images: string[];
  sizes: string[];
  colors: string[];
};