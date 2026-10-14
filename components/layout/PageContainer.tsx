import React from "react";

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "full";
}

/**
 * Standard Storefront Page Container
 * Ensures uniform max-width (max-w-7xl) and responsive horizontal padding (px-4 sm:px-6 lg:px-8)
 * across all store pages (cart, checkout, track-order, collections, etc.).
 */
export function StoreContainer({
  children,
  className = "",
  size = "default",
  ...props
}: PageContainerProps) {
  const sizeClasses = {
    default: "max-w-7xl",
    narrow: "max-w-4xl",
    full: "max-w-full",
  }[size];

  return (
    <div
      className={`mx-auto w-full ${sizeClasses} px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Standard Admin Portal Container
 * Ensures consistent grid and container widths across all admin views, management tables, and forms.
 */
export function AdminContainer({
  children,
  className = "",
  size = "default",
  ...props
}: PageContainerProps) {
  const sizeClasses = {
    default: "max-w-7xl",
    narrow: "max-w-4xl",
    full: "max-w-full",
  }[size];

  return (
    <div
      className={`mx-auto w-full ${sizeClasses} px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export const PageContainer = StoreContainer;
