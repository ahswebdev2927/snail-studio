"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customConfirm } from "@/components/ui/alert-dialog-provider";
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  X, 
  Sparkles, 
  Home, 
  Info,
  Briefcase,
  School,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveUserAddress, deleteUserAddress, setDefaultAddress } from "@/features/account/actions";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField, SelectField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { addressSchema, type AddressInput } from "@/lib/validators/address";

interface Address {
  id: string;
  userId: string;
  type: "shipping" | "billing";
  isDefault: boolean;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressClientProps {
  initialAddresses: Address[];
}

export function AddressClient({ initialAddresses }: AddressClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Address label state ("Home", "Work", "Hostel", "Other")
  const [label, setLabel] = useState("Home");

  // UX states
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [modalOpen]);

  // RHF Setup
  const form = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: "shipping",
      name: "",
      phone: "+91",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      isDefault: false,
    },
    mode: "onBlur",
  });

  const addressType = form.watch("type");

  const openAddModal = () => {
    if (initialAddresses.length >= 5) {
      notify.error("You cannot add more than 5 addresses. Please delete one first.");
      return;
    }
    form.reset({
      type: "shipping",
      name: "",
      phone: "+91",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      isDefault: false,
    });
    setLabel("Home");
    setModalMode("add");
    setModalOpen(true);
  };

  const openEditModal = (addr: Address) => {
    // Parse Label and Address Line 2
    const rawLine2 = addr.addressLine2 || "";
    const parts = rawLine2.split(" | ");
    const labels = ["Home", "Work", "Hostel", "Other"];
    let finalLabel = "Home";
    let finalLine2 = rawLine2;

    if (labels.includes(parts[0])) {
      finalLabel = parts[0];
      finalLine2 = parts.slice(1).join(" | ");
    }

    form.reset({
      type: addr.type,
      name: addr.name,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: finalLine2,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
    });

    setLabel(finalLabel);
    setSelectedAddressId(addr.id);
    setModalMode("edit");
    setModalOpen(true);
  };

  const formatPhoneNumber = (val: string) => {
    let digits = val.replace(/\s+/g, "");
    if (!digits) return "";
    if (!digits.startsWith("+91")) {
      const raw = digits.replace(/[^\d]/g, "");
      if (raw.startsWith("91") && raw.length > 2) {
        digits = "+" + raw;
      } else {
        digits = "+91" + raw;
      }
    }
    return digits.slice(0, 13);
  };

  const handleFormSubmit = async (data: AddressInput) => {
    setLoading(true);

    try {
      // Package label into Address Line 2
      const finalAddressLine2 = `${label} | ${(data.addressLine2 || "").trim()}`;
      
      const res = await saveUserAddress({
        id: modalMode === "edit" && selectedAddressId ? selectedAddressId : undefined,
        type: data.type,
        name: data.name,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: finalAddressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        isDefault: data.isDefault
      });

      if (res.success) {
        notify.success(
          modalMode === "add" 
            ? "New address saved successfully." 
            : "Address changes saved successfully."
        );
        setModalOpen(false);
        router.refresh();
      } else {
        notify.error(res.error || "Failed to save address details.");
      }
    } catch (err: any) {
      console.error(err);
      notify.error("An unexpected error occurred saving address.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await customConfirm("Delete Address", "Are you sure you want to delete this address?")) return;
    setActionLoadingId(id);

    try {
      const res = await deleteUserAddress(id);
      if (res.success) {
        notify.success("Address deleted successfully.");
        router.refresh();
      } else {
        notify.error(res.error || "Failed to delete address.");
      }
    } catch (err) {
      console.error(err);
      notify.error("Failed to delete address.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetDefault = async (id: string, type: "shipping" | "billing") => {
    setActionLoadingId(id);

    try {
      const res = await setDefaultAddress(id, type);
      if (res.success) {
        notify.success(`Default ${type} address updated successfully.`);
        router.refresh();
      } else {
        notify.error(res.error || "Failed to set default address.");
      }
    } catch (err) {
      console.error(err);
      notify.error("Failed to set default address.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getLabelStyle = (lbl: string) => {
    switch (lbl) {
      case "Home": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25";
      case "Work": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25";
      case "Hostel": return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25";
      default: return "bg-secondary/10 text-secondary border-secondary/25";
    }
  };

  const getLabelIcon = (lbl: string) => {
    switch (lbl) {
      case "Home": return <Home className="w-3 h-3 text-blue-500 dark:text-blue-400" />;
      case "Work": return <Briefcase className="w-3 h-3 text-purple-500 dark:text-purple-400" />;
      case "Hostel": return <School className="w-3 h-3 text-orange-500 dark:text-orange-400" />;
      default: return <Tag className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/20">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            Address Book
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Manage your saved shipping and billing addresses ({initialAddresses.length}/5 saved).
          </p>
        </div>
        <Button
          onClick={openAddModal}
          disabled={initialAddresses.length >= 5}
          size="sm"
          className="text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Address
        </Button>
      </div>

      {/* Address limit warning bar */}
      {initialAddresses.length >= 5 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-light">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>You have reached the maximum limit of 5 saved addresses. Please delete an address to add a new one.</span>
        </div>
      )}

      {/* Addresses Grid */}
      {initialAddresses.length === 0 ? (
        <div className="py-16 text-center space-y-4 border border-dashed border-border/40 rounded-3xl bg-secondary/5">
          <MapPin className="w-10 h-10 text-muted-foreground/45 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-serif text-sm font-semibold text-foreground">No Saved Addresses</h3>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Add a shipping address to speed up your checkout process next time.
            </p>
          </div>
          <Button onClick={openAddModal} variant="outline" className="text-xs uppercase tracking-wider cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Address Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {initialAddresses.map((addr) => {
            const isLoading = actionLoadingId === addr.id;

            // Parse addressLine2 to show label
            const rawLine2 = addr.addressLine2 || "";
            const parts = rawLine2.split(" | ");
            const labels = ["Home", "Work", "Hostel", "Other"];
            const cardLabel = labels.includes(parts[0]) ? parts[0] : null;
            const cardLine2 = cardLabel ? parts.slice(1).join(" | ") : rawLine2;

            return (
              <div
                key={addr.id}
                className={`bg-card border rounded-2xl p-5 flex flex-col justify-between h-56 relative overflow-hidden transition-all duration-300 ${
                  addr.isDefault 
                    ? "border-primary shadow-sm" 
                    : "border-border/30 hover:border-border/80"
                }`}
              >
                {/* Default indicator */}
                {addr.isDefault && (
                  <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-accent/20">
                    Default {addr.type}
                  </div>
                )}

                {/* Details */}
                <div className="space-y-2 text-xs font-light">
                  <div className="flex items-center gap-2 font-semibold text-foreground flex-wrap">
                    <span className="truncate max-w-[120px]">{addr.name}</span>
                    {cardLabel && (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getLabelStyle(cardLabel)}`}>
                        {getLabelIcon(cardLabel)}
                        {cardLabel}
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-wider font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/20">
                      {addr.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[10px]">Phone: {addr.phone}</p>
                  <div className="text-muted-foreground leading-relaxed">
                    <p className="truncate">{addr.addressLine1}</p>
                    {cardLine2 && <p className="truncate">{cardLine2}</p>}
                    <p className="truncate">{addr.city}, {addr.state} - {addr.postalCode}</p>
                    <p className="truncate">{addr.country}</p>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="flex justify-between items-center pt-3 border-t border-border/10 mt-3 text-xs">
                  {/* Left Default Toggler */}
                  <div>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr.id, addr.type)}
                        disabled={isLoading}
                        className="text-[9px] uppercase font-bold tracking-widest text-primary hover:text-accent disabled:opacity-50 transition-colors flex items-center gap-0.5 cursor-pointer bg-transparent border-none"
                      >
                        Set Default
                      </button>
                    )}
                  </div>

                  {/* Right CRUD triggers */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(addr)}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors disabled:opacity-50 cursor-pointer bg-transparent border-none"
                      title="Edit Address"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors disabled:opacity-50 cursor-pointer bg-transparent border-none"
                      title="Delete Address"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Address Form Modal */}
      {modalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-background/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-card border border-border/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative my-auto">
            {/* Top gold line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-accent to-primary/30" />

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border/20 flex justify-between items-center">
              <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent" />
                {modalMode === "add" ? "Add New Address" : "Edit Address Details"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-all cursor-pointer bg-transparent border-none"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <Form methods={form as any} onSubmit={handleFormSubmit}>
              <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* 2-column details */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="name" label="Recipient Name" required>
                    <InputField placeholder="e.g. Jane Doe" />
                  </FormField>

                  <FormField name="phone" label="Contact Mobile" required>
                    <InputField
                      placeholder="e.g. +91 9999988888"
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        form.setValue("phone", formatted, { shouldValidate: true });
                      }}
                    />
                  </FormField>
                </div>

                {/* Address Label Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase pl-0.5">
                    Address Label
                  </label>
                  <div className="flex gap-2">
                    {["Home", "Work", "Hostel", "Other"].map((lblOption) => (
                      <button
                        key={lblOption}
                        type="button"
                        onClick={() => setLabel(lblOption)}
                        className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                          label === lblOption
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-secondary/10 text-foreground border-border/40 hover:border-border/80"
                        }`}
                      >
                        {getLabelIcon(lblOption)}
                        {lblOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flat details */}
                <FormField name="addressLine1" label="Address Line 1 (Flat, House, Building)" required>
                  <InputField placeholder="e.g. Apartment 4B, Emerald Heights" />
                </FormField>

                {/* Sector / Landmark details */}
                <FormField name="addressLine2" label="Address Line 2 (Area, Sector, Landmark)">
                  <InputField placeholder="e.g. Near Royal Palms, Goregaon East" />
                </FormField>

                {/* 3-column region values */}
                <div className="grid grid-cols-3 gap-3">
                  <FormField name="city" label="City" required>
                    <InputField placeholder="Mumbai" />
                  </FormField>

                  <FormField name="state" label="State" required>
                    <InputField placeholder="Maharashtra" />
                  </FormField>

                  <FormField name="postalCode" label="Postal Code / PIN" required>
                    <InputField placeholder="400063" />
                  </FormField>
                </div>

                {/* Country and Type */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="country" label="Country" required>
                    <InputField placeholder="India" />
                  </FormField>

                  <FormField name="type" label="Address Type" required>
                    <SelectField
                      options={[
                        { value: "shipping", label: "Shipping Address" },
                        { value: "billing", label: "Billing Address" },
                      ]}
                      placeholder="Select address type..."
                      label="Address Type"
                    />
                  </FormField>
                </div>

                {/* Default Checkbox */}
                <label className="flex items-center gap-2.5 p-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...form.register("isDefault")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-light">
                    Set as default {addressType} address
                  </span>
                </label>
              </div>

              {/* Modal Footer actions */}
              <div className="px-6 py-4.5 bg-secondary/20 border-t border-border/20 flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  variant="outline"
                  className="text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Save Address"
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
