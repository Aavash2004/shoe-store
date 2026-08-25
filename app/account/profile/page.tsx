"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Lock,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  X,
} from "lucide-react";

// Schemas
const profileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

const addressSchema = z.object({
  title: z.string().min(1, "Label is required (e.g. Home, Office)"),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean().optional(),
});

type ProfileInput = z.infer<typeof profileSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;
type AddressInput = z.infer<typeof addressSchema>;

interface AddressItem extends AddressInput {
  id: string;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    phone: string;
    createdAt: string;
  } | null>(null);

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Status alerts
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  // Password Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
  });

  // Address Form
  const {
    register: registerAddress,
    handleSubmit: handleSubmitAddress,
    reset: resetAddressForm,
    setValue: setAddressValue,
    formState: { errors: addressFormErrors, isSubmitting: isSubmittingAddress },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      title: "Home",
      country: "Nepal",
      isDefault: false,
    },
  });

  // Fetch initial profile & addresses
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resUser, resAddr] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/me/addresses"),
      ]);

      if (resUser.ok) {
        const dataUser = await resUser.json();
        setUserData(dataUser.user);
        resetProfile({
          name: dataUser.user.name || "",
          phone: dataUser.user.phone || "",
        });
      }

      if (resAddr.ok) {
        const dataAddr = await resAddr.json();
        setAddresses(dataAddr.addresses || []);
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Profile Form
  const onSaveProfile = async (data: ProfileInput) => {
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setProfileError(err.error || "Failed to update profile");
        return;
      }

      const updated = await res.json();
      setUserData((prev) => (prev ? { ...prev, name: updated.user.name } : null));
      setProfileSuccess("Personal information updated successfully.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err) {
      setProfileError("An unexpected error occurred.");
    }
  };

  // Submit Password Form
  const onChangePassword = async (data: PasswordInput) => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setPasswordError(err.error || "Failed to update password.");
        return;
      }

      setPasswordSuccess("Password updated successfully.");
      resetPassword();
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err) {
      setPasswordError("An unexpected error occurred.");
    }
  };

  // Address Actions
  const openNewAddressModal = () => {
    setEditingAddress(null);
    resetAddressForm({
      title: "Home",
      fullName: userData?.name || "",
      phone: userData?.phone || "",
      line1: "",
      line2: "",
      city: "Kathmandu",
      state: "Bagmati",
      postalCode: "44600",
      country: "Nepal",
      isDefault: addresses.length === 0,
    });
    setAddressError(null);
    setShowAddressModal(true);
  };

  const openEditAddressModal = (addr: AddressItem) => {
    setEditingAddress(addr);
    resetAddressForm({
      title: addr.title || "Home",
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
    });
    setAddressError(null);
    setShowAddressModal(true);
  };

  const onSaveAddress = async (data: AddressInput) => {
    setAddressError(null);
    try {
      const url = editingAddress
        ? `/api/me/addresses/${editingAddress.id}`
        : "/api/me/addresses";
      const method = editingAddress ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setAddressError(err.error || "Failed to save address.");
        return;
      }

      setShowAddressModal(false);
      fetchData();
    } catch (err) {
      setAddressError("Failed to connect to server.");
    }
  };

  const onDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/me/addresses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  const onSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/me/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to set default address:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[var(--color-sand)]/50 rounded-xl w-1/3" />
        <div className="h-64 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl" />
        <div className="h-64 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
          Profile & Account Information
        </h1>
        <p className="text-sm text-[var(--color-navy)]/60 mt-1">
          Manage your personal details, password security, and saved shipping addresses.
        </p>
      </div>

      {/* SECTION 1: PERSONAL INFORMATION */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--color-sand)]">
          <div className="p-2 rounded-xl bg-[var(--color-sky)]/15 text-[var(--color-navy)]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
              Personal Information
            </h2>
            <p className="text-xs text-[var(--color-navy)]/60">
              Basic contact details used for orders & communication
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitProfile(onSaveProfile)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                {...registerProfile("name")}
              />
              {profileErrors.name && (
                <p className="text-xs text-rose-600">{profileErrors.name.message}</p>
              )}
            </div>

            {/* Email (Read only) */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                Email Address <span className="text-[10px] lowercase text-[var(--color-navy)]/50">(read-only)</span>
              </label>
              <input
                id="email"
                type="email"
                disabled
                value={userData?.email || ""}
                className="w-full px-4 py-3 bg-[var(--color-sand)]/40 border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)]/60 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingProfile}
              className="px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {isSubmittingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: PASSWORD SECURITY & ACCOUNT INFO */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-sand)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-sand)]/60 text-[var(--color-navy)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
                Account Security
              </h2>
              <p className="text-xs text-[var(--color-navy)]/60">
                Change your password & view account details
              </p>
            </div>
          </div>
          {userData?.createdAt && (
            <span className="text-xs text-[var(--color-navy)]/50 hidden sm:inline-block">
              Member since {new Date(userData.createdAt).getFullYear()}
            </span>
          )}
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="w-full px-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              {...registerPassword("currentPassword")}
            />
            {passwordErrors.currentPassword && (
              <p className="text-xs text-rose-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full px-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                {...registerPassword("newPassword")}
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-rose-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full px-4 py-3 bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-xl text-sm text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                {...registerPassword("confirmPassword")}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-rose-600">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-6 py-3 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {isSubmittingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: SAVED ADDRESSES */}
      <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-sand)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-sky)]/15 text-[var(--color-navy)]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
                Saved Shipping Addresses
              </h2>
              <p className="text-xs text-[var(--color-navy)]/60">
                Manage your delivery destinations for faster checkout
              </p>
            </div>
          </div>
          <button
            onClick={openNewAddressModal}
            className="px-4 py-2 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl text-xs font-medium hover:bg-[var(--color-navy)]/90 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-[var(--color-navy)]/70">
              No saved addresses found.
            </p>
            <button
              onClick={openNewAddressModal}
              className="text-xs font-semibold text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first address</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-[var(--color-cream)] border rounded-2xl p-5 space-y-3 relative flex flex-col justify-between ${
                  addr.isDefault
                    ? "border-[var(--color-navy)] ring-1 ring-[var(--color-navy)]"
                    : "border-[var(--color-sand)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]">
                      {addr.title || "HOME"}
                    </span>
                    {addr.isDefault ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)] bg-[var(--color-sky)]/20 px-2 py-0.5 rounded-full border border-[var(--color-sky)]/30 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-[var(--color-navy)]" />
                        DEFAULT
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetDefaultAddress(addr.id)}
                        className="text-[10px] text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] underline"
                      >
                        Set as default
                      </button>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-[var(--color-navy)]">
                    {addr.fullName}
                  </p>
                  <p className="text-xs text-[var(--color-navy)]/70 mt-1">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-navy)]/70">
                    {addr.city}, {addr.state} {addr.postalCode}
                  </p>
                  <p className="text-xs text-[var(--color-navy)]/70">
                    {addr.country}
                  </p>
                  <p className="text-xs text-[var(--color-navy)]/50 mt-1 font-mono">
                    Ph: {addr.phone}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-sand)]/60 flex items-center justify-end gap-3 text-xs">
                  <button
                    onClick={() => openEditAddressModal(addr)}
                    className="text-[var(--color-navy)]/70 hover:text-[var(--color-navy)] font-medium flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onDeleteAddress(addr.id)}
                    className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address Form Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-cream)] border border-[var(--color-sand)] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddressModal(false)}
              className="absolute top-4 right-4 text-[var(--color-navy)]/50 hover:text-[var(--color-navy)] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-navy)]">
                {editingAddress ? "Edit Address" : "Add New Address"}
              </h3>
              <p className="text-xs text-[var(--color-navy)]/60 mt-1">
                Enter your shipping address details below.
              </p>
            </div>

            {addressError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAddress(onSaveAddress)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                    Label (e.g. Home, Office)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    placeholder="Home"
                    {...registerAddress("title")}
                  />
                  {addressFormErrors.title && (
                    <p className="text-[10px] text-rose-600">{addressFormErrors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    {...registerAddress("fullName")}
                  />
                  {addressFormErrors.fullName && (
                    <p className="text-[10px] text-rose-600">{addressFormErrors.fullName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                  placeholder="+977 9800000000"
                  {...registerAddress("phone")}
                />
                {addressFormErrors.phone && (
                  <p className="text-[10px] text-rose-600">{addressFormErrors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                  Address Line 1
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                  placeholder="Street address, house number"
                  {...registerAddress("line1")}
                />
                {addressFormErrors.line1 && (
                  <p className="text-[10px] text-rose-600">{addressFormErrors.line1.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                  placeholder="Apartment, suite, unit, floor"
                  {...registerAddress("line2")}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                    City
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    {...registerAddress("city")}
                  />
                  {addressFormErrors.city && (
                    <p className="text-[10px] text-rose-600">{addressFormErrors.city.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                    State
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    {...registerAddress("state")}
                  />
                  {addressFormErrors.state && (
                    <p className="text-[10px] text-rose-600">{addressFormErrors.state.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    {...registerAddress("postalCode")}
                  />
                  {addressFormErrors.postalCode && (
                    <p className="text-[10px] text-rose-600">{addressFormErrors.postalCode.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase text-[var(--color-navy)]/70">
                  Country
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                  {...registerAddress("country")}
                />
                {addressFormErrors.country && (
                  <p className="text-[10px] text-rose-600">{addressFormErrors.country.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  className="rounded text-[var(--color-navy)] focus:ring-[var(--color-sky)]"
                  {...registerAddress("isDefault")}
                />
                <label htmlFor="isDefault" className="text-xs text-[var(--color-navy)]">
                  Set as default shipping address
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2.5 bg-transparent hover:bg-[var(--color-sand)]/40 text-[var(--color-navy)] text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddress}
                  className="px-5 py-2.5 bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold rounded-xl hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAddress ? "Update Address" : "Save Address"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
