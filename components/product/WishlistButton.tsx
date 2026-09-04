"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, Lock, X } from "lucide-react";
import Link from "next/link";
import { useWishlistStore } from "@/stores/wishlist-store";

interface WishlistButtonProps {
  productId: string;
  initialSaved?: boolean;
  className?: string;
  iconSize?: number;
  showText?: boolean;
}

export function WishlistButton({
  productId,
  initialSaved = false,
  className = "",
  iconSize = 18,
  showText = false,
}: WishlistButtonProps) {
  const { data: session, status } = useSession();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [animating, setAnimating] = useState(false);

  const { isWishlisted, toggleWishlistId, fetchWishlist, hasFetched } =
    useWishlistStore();

  // On initial mount or auth check, fetch wishlist from server if logged in
  useEffect(() => {
    if (session?.user && !hasFetched) {
      fetchWishlist();
    }
  }, [session, hasFetched, fetchWishlist]);

  // Determine if item is saved: check Zustand store or fallback to initialSaved prop
  const isSaved = hasFetched ? isWishlisted(productId) : initialSaved;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guest check
    if (status === "unauthenticated" || !session?.user) {
      setShowGuestModal(true);
      return;
    }

    // Trigger immediate pop animation
    setAnimating(true);
    setTimeout(() => setAnimating(false), 350);

    // Optimistic toggle
    const nextSavedState = toggleWishlistId(productId);

    // Show toast feedback immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: nextSavedState
              ? "Added to your Wishlist ❤️"
              : "Removed from your Wishlist",
            type: nextSavedState ? "success" : "info",
          },
        })
      );
    }

    // Async server sync in background
    try {
      const res = await fetch("/api/me/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        // Revert on error
        toggleWishlistId(productId);
      }
    } catch (err) {
      console.error("Wishlist sync error:", err);
      toggleWishlistId(productId);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
        className={`group/wishlist relative flex items-center justify-center transition-all duration-200 focus:outline-none ${
          showText
            ? "w-full py-3 px-5 rounded-xl border font-semibold text-xs tracking-wide transition-all shadow-xs " +
              (isSaved
                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                : "bg-white border-[var(--color-sand)] text-[var(--color-navy)] hover:border-[var(--color-navy)]/40 hover:bg-[var(--color-cream-alt)]")
            : "p-2 rounded-full transition-transform active:scale-90 " +
              (isSaved
                ? "bg-rose-50 text-rose-500 shadow-xs"
                : "bg-white/90 backdrop-blur-xs text-[var(--color-navy)]/65 hover:text-rose-500 hover:bg-white shadow-xs")
        } ${animating ? "scale-125" : "scale-100"} ${className}`}
      >
        <Heart
          size={iconSize}
          className={`transition-all duration-300 ${
            isSaved
              ? "fill-rose-500 text-rose-500 scale-105"
              : "fill-transparent text-current group-hover/wishlist:text-rose-500"
          } ${animating ? "animate-ping opacity-75" : ""}`}
        />
        {showText && (
          <span className="ml-2">
            {isSaved ? "Saved to Wishlist" : "Add to Wishlist"}
          </span>
        )}
      </button>

      {/* Guest Sign-In Modal */}
      {showGuestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowGuestModal(false);
          }}
        >
          <div
            className="w-full max-w-sm bg-white border border-[var(--color-sand)] rounded-2xl p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-4 right-4 text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] p-1 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-2 border border-rose-100">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
                Save to Wishlist
              </h3>
              <p className="text-xs text-[var(--color-navy)]/65 leading-relaxed">
                Sign in to save your favorite shoes and access them from any device.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(
                  typeof window !== "undefined" ? window.location.pathname : "/account/wishlist"
                )}`}
                className="w-full py-2.5 px-4 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-white font-semibold text-xs rounded-xl text-center transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In to Continue</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="w-full py-2 px-4 bg-transparent hover:bg-slate-100 text-[var(--color-navy)]/70 text-xs font-semibold rounded-xl text-center transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
