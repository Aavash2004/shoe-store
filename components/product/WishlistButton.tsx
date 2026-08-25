"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Lock, X } from "lucide-react";
import Link from "next/link";

interface WishlistButtonProps {
  productId: string;
  initialSaved?: boolean;
  className?: string;
  iconSize?: number;
}

export function WishlistButton({
  productId,
  initialSaved = false,
  className = "",
  iconSize = 20,
}: WishlistButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guest prompt check
    if (status === "unauthenticated" || !session?.user) {
      setShowGuestModal(true);
      return;
    }

    if (loading) return;

    setLoading(true);
    setAnimate(true);

    try {
      const res = await fetch("/api/me/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsSaved(data.saved);
      }
    } catch (err) {
      console.error("Failed to update wishlist:", err);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimate(false), 300);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
        className={`p-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] flex items-center justify-center ${
          isSaved
            ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
            : "bg-white/80 backdrop-blur-sm text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-white"
        } ${animate ? "scale-125" : "scale-100"} ${className}`}
      >
        <Heart
          size={iconSize}
          className={`transition-all duration-300 ${
            isSaved ? "fill-rose-500 text-rose-500" : "fill-transparent"
          }`}
        />
      </button>

      {/* Guest Sign-In Modal */}
      {showGuestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowGuestModal(false);
          }}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-2xl p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-4 right-4 text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-[var(--color-sky)]/15 text-[var(--color-navy)] flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 text-[var(--color-sky)] fill-current" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
                Save to Wishlist
              </h3>
              <p className="text-sm text-[var(--color-navy)]/70">
                Sign in to save this item to your personal wishlist.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href={`/auth/login?callbackUrl=${encodeURIComponent(
                  typeof window !== "undefined" ? window.location.pathname : "/account/wishlist"
                )}`}
                className="w-full py-3 px-4 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-[var(--color-cream)] font-medium text-sm rounded-xl text-center transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowGuestModal(false)}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-[var(--color-sand)]/40 text-[var(--color-navy)]/80 text-sm font-medium rounded-xl text-center transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
