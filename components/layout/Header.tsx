"use client";



import Link from "next/link";

import { ShoppingBag, Heart, User, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";



export function Header() {

  return (

    <header className="sticky top-0 z-50 border-b border-[var(--color-sand)] bg-[var(--color-cream)]/95 backdrop-blur">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        <Link

          href="/"

          className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-navy)]"

        >

          Shoe Store

        </Link>



        <nav className="hidden items-center gap-8 md:flex">

          <Link href="/shop" className="text-sm text-[var(--color-navy)]/80 hover:text-[var(--color-navy)]">

            Shop

          </Link>

          <Link href="/shop?category=running" className="text-sm text-[var(--color-navy)]/80 hover:text-[var(--color-navy)]">

            Running

          </Link>

          <Link href="/shop?category=lifestyle" className="text-sm text-[var(--color-navy)]/80 hover:text-[var(--color-navy)]">

            Lifestyle

          </Link>

        </nav>



        <div className="flex items-center gap-2">

          <Button variant="ghost" size="icon" >

            <Link href="/account/wishlist">

              <Heart className="h-5 w-5" />

            </Link>

          </Button>

          <Button variant="ghost" size="icon" >

            <Link href="/account">

              <User className="h-5 w-5" />

            </Link>

          </Button>

          <Button variant="ghost" size="icon" >

            <Link href="/cart">

              <ShoppingBag className="h-5 w-5" />

            </Link>

          </Button>

          <Button variant="ghost" size="icon" className="md:hidden">

            <Menu className="h-5 w-5" />

          </Button>

        </div>

      </div>

    </header>

  );

}