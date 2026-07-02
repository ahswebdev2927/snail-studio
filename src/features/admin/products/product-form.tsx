"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ArrowLeft, 
  Save, 
  Layers, 
  Trash2, 
  Plus, 
  Sparkles, 
  HelpCircle, 
  Check, 
  X,
  Image as ImageIcon,
  Film,
  Boxes,
  Loader2,
  RefreshCw,
  Pencil,
  Eye,
  Archive,
  Package,
  AlertCircle
} from "lucide-react";
import { MediaPicker } from "@/components/media/media-picker";
import { generateVariants, generateUPCBarcode } from "@/lib/catalog/variants";
import { slugify } from "@/lib/utils";

// Define the validation schema
const schema = z.object({
  name: z.string().min(1, "Product name is required").max(150, "Name is too long"),
  slug: z.string().min(1, "Slug is required").max(150, "Slug is too long"),
  description: z.string(),
  shortDescription: z.string().max(500, "Short description is too long"),
  brandId: z.string().nullable(),
  categoryId: z.string().nullable(),
  status: z.enum(["Active", "Draft", "Out Of Stock", "Archived"]),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isNewArrival: z.boolean(),
  isTrending: z.boolean(),
  metaTitle: z.string().max(100, "Meta title is too long"),
  metaDescription: z.string().max(250, "Meta description is too long"),
  ogImage: z.string().nullable().optional(),
  attributeValueIds: z.array(z.string()),
  media: z.array(z.object({
    mediaId: z.string(),
    url: z.string(),
    isFeatured: z.boolean(),
    sortOrder: z.number(),
    resourceType: z.enum(["image", "video"])
  })),
  variants: z.array(z.object({
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Name is required"),
    price: z.number().min(0.01, "Price must be positive"), // entered in INR rupees, converted to paise on POST
    compareAtPrice: z.number().min(0).nullable(), // entered in INR rupees
    barcode: z.string().nullable(),
    stock: z.number().int().min(0, "Stock must be non-negative"),
    lowStockThreshold: z.number().int().min(0),
    attributeValueIds: z.array(z.string()),
  })).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface AttributeValue {
  id: string;
  groupId: string;
  value: string;
  code: string;
}

interface AttributeGroup {
  id: string;
  name: string;
  code: string;
  attributeType: "VARIANT" | "CATALOG";
  variantAxis: boolean;
  filterable: boolean;
  searchable: boolean;
  visibleOnPdp: boolean;
  displayOrder: number;
  values: AttributeValue[];
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: {
    product: any;
    media: any[];
    seo: any;
    variants: any[];
    attributes: string[];
  };
}

export default function ProductForm({ mode, productId, initialData }: ProductFormProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<AttributeGroup[]>([]);

  const variantAttributes = useMemo(() => {
    return attributes.filter((g) => g.attributeType === "VARIANT");
  }, [attributes]);

  const catalogAttributes = useMemo(() => {
    return attributes.filter((g) => g.attributeType === "CATALOG");
  }, [attributes]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Edit Mode dynamic states
  const [existingVariants, setExistingVariants] = useState<any[]>(initialData?.variants || []);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);

  // Media picker modal states
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"featured" | "gallery" | "ogImage">("featured");

  // Selected values for variant generator checkboxes
  const [selectedVariantAttrs, setSelectedVariantAttrs] = useState<Record<string, string[]>>({});

  // Base SKU for product variant auto-generation
  const [baseSku, setBaseSku] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      shortDescription: "",
      brandId: null,
      categoryId: null,
      status: "Draft",
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      isTrending: false,
      metaTitle: "",
      metaDescription: "",
      ogImage: null,
      attributeValueIds: [],
      media: [],
      variants: [],
    }
  });

  const { fields: mediaFields, append: appendMedia, remove: removeMedia, replace: replaceMedia } = useFieldArray({
    control,
    name: "media",
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant, replace: replaceVariants } = useFieldArray({
    control,
    name: "variants",
  });

  const watchName = watch("name");
  const watchMedia = watch("media");
  const watchVariants = watch("variants");

  // Fetch Category, Brand, and Attribute lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        const [brandsRes, catsRes, attrsRes] = await Promise.all([
          fetch("/api/brands"),
          fetch("/api/categories"),
          fetch("/api/attributes"),
        ]);

        if (brandsRes.ok) setBrands(await brandsRes.json());
        if (catsRes.ok) setCategories(await catsRes.json());
        if (attrsRes.ok) setAttributes(await attrsRes.json());
      } catch (err) {
        console.error("Failed to load form lookups", err);
      } finally {
        setLoadingLookups(false);
      }
    }

    loadLookups();
  }, []);

  // Prefill in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      reset({
        name: initialData.product.name,
        slug: initialData.product.slug,
        description: initialData.product.description || "",
        shortDescription: initialData.product.shortDescription || "",
        brandId: initialData.product.brandId,
        categoryId: initialData.product.categoryId,
        status: initialData.product.status,
        isFeatured: initialData.product.isFeatured,
        isBestSeller: initialData.product.isBestSeller,
        isNewArrival: initialData.product.isNewArrival || false,
        isTrending: initialData.product.isTrending || false,
        metaTitle: initialData.seo?.metaTitle || "",
        metaDescription: initialData.seo?.metaDescription || "",
        ogImage: initialData.seo?.ogImage || null,
        attributeValueIds: initialData.attributes || [],
        media: initialData.media || [],
      });
      setExistingVariants(initialData.variants || []);

      // Extract base SKU prefix from first variant if available
      if (initialData.variants && initialData.variants.length > 0) {
        const sampleSku = initialData.variants[0].sku;
        const parts = sampleSku.split("-");
        if (parts.length > 1) {
          const attrCount = initialData.variants[0].attributeValueIds.length;
          setBaseSku(parts.slice(0, Math.max(1, parts.length - attrCount)).join("-"));
        }
      }
    }
  }, [mode, initialData, reset]);

  // Sync Slug and Meta Title with Product Name typing (in create mode only)
  useEffect(() => {
    if (mode === "create" && watchName) {
      const slugValue = slugify(watchName);
      setValue("slug", slugValue, { shouldValidate: true });
      setValue("metaTitle", `${watchName} | Snail Studio`, { shouldValidate: true });

      // Automatically generate a suggested base SKU
      const cleanName = watchName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
      setBaseSku(`SNAIL-${cleanName}`);
    }
  }, [watchName, setValue, mode]);

  // Refetch variants (for edit mode)
  const refreshVariants = async () => {
    if (!productId) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setExistingVariants(data.variants || []);
      }
    } catch (err) {
      console.error("Error refreshing variants list", err);
    }
  };

  // Handle media selection from picker modal
  const handleMediaSelect = (selected: any[]) => {
    if (selected.length === 0) return;

    if (pickerTarget === "featured") {
      // Set the selected image as featured
      const filtered = watchMedia.filter(m => !m.isFeatured);
      const newMediaItem = {
        mediaId: selected[0].id,
        url: selected[0].url,
        isFeatured: true,
        sortOrder: 0,
        resourceType: selected[0].resourceType,
      };
      replaceMedia([newMediaItem, ...filtered]);
    } else if (pickerTarget === "ogImage") {
      // Set OG Image URL
      setValue("ogImage", selected[0].url, { shouldValidate: true });
    } else {
      // Append selected image/s to gallery
      const existingIds = watchMedia.map(m => m.mediaId);
      const newItems = selected
        .filter(item => !existingIds.includes(item.id))
        .map((item, index) => ({
          mediaId: item.id,
          url: item.url,
          isFeatured: false,
          sortOrder: watchMedia.length + index + 1,
          resourceType: item.resourceType,
        }));
      appendMedia(newItems);
    }
    setShowMediaPicker(false);
  };

  // Set selected item as featured, and downgrade previous featured item
  const makeFeatured = (index: number) => {
    const updated = watchMedia.map((item, idx) => ({
      ...item,
      isFeatured: idx === index,
    }));
    replaceMedia(updated);
  };

  // Toggle attribute value selections for base product attributes mapping
  const handleAttributeToggle = (groupId: string, valueId: string) => {
    const currentBase = watch("attributeValueIds") || [];
    const updatedBase = currentBase.includes(valueId)
      ? currentBase.filter(id => id !== valueId)
      : [...currentBase, valueId];
    setValue("attributeValueIds", updatedBase, { shouldValidate: true });

    // Sync to variant matrix builder selection state
    setSelectedVariantAttrs(prev => {
      const currentVar = prev[groupId] || [];
      const updatedVar = currentVar.includes(valueId)
        ? currentVar.filter(id => id !== valueId)
        : [...currentVar, valueId];
      return { ...prev, [groupId]: updatedVar };
    });
  };

  // Toggle selection of attribute value in variant generator checkbox matrix
  const handleVariantAttrToggle = (groupId: string, valueId: string) => {
    setSelectedVariantAttrs(prev => {
      const current = prev[groupId] || [];
      const updated = current.includes(valueId)
        ? current.filter(id => id !== valueId)
        : [...current, valueId];
      return { ...prev, [groupId]: updated };
    });

    // Sync to base product attributes mapping
    const currentBase = watch("attributeValueIds") || [];
    const updatedBase = currentBase.includes(valueId)
      ? currentBase.filter(id => id !== valueId)
      : [...currentBase, valueId];
    setValue("attributeValueIds", updatedBase, { shouldValidate: true });
  };

  // Trigger dynamic variant Cartesian generation
  const handleGenerateVariants = () => {
    if (!watchName) {
      setGlobalError("Please enter a product name first to generate variants.");
      return;
    }
    if (!baseSku) {
      setGlobalError("Please enter a base SKU prefix first.");
      return;
    }

    // Format selected attributes map for the variant engine
    const attributesSelectedMap: Record<string, any[]> = {};
    let activeGroupsCount = 0;

    variantAttributes.forEach(group => {
      const selectedValueIds = selectedVariantAttrs[group.id] || [];
      if (selectedValueIds.length > 0) {
        activeGroupsCount++;
        attributesSelectedMap[group.code] = group.values
          .filter(v => selectedValueIds.includes(v.id))
          .map(v => ({
            groupId: group.id,
            groupCode: group.code,
            valueId: v.id,
            valueCode: v.code
          }));
      }
    });

    if (activeGroupsCount === 0) {
      setGlobalError("Please select at least one attribute value to generate variant options.");
      return;
    }

    setGlobalError(null);

    // Default base price: 1499 rupees
    const generated = generateVariants(watchName, baseSku, 1499, attributesSelectedMap);
    
    // Map output to form matrix fields
    const formattedVariants = generated.map(v => {
      const valIds = v.attributeValues.map(av => av.valueId);

      return {
        sku: v.sku,
        name: v.name,
        price: v.price,
        compareAtPrice: 1999, // suggested retail price override
        barcode: generateUPCBarcode(),
        stock: 50, // default stock level
        lowStockThreshold: 5,
        attributeValueIds: valIds,
      };
    });

    replaceVariants(formattedVariants);

    // Automatically sync these selected attribute IDs to the base product attributeValueIds too
    const allSelectedValueIds = Object.values(selectedVariantAttrs).flat();
    const existingBaseAttrs = watch("attributeValueIds") || [];
    const merged = Array.from(new Set([...existingBaseAttrs, ...allSelectedValueIds]));
    setValue("attributeValueIds", merged);
  };

  // Trigger missing variant generation endpoint (edit mode)
  const handleGenerateMissingVariantsEdit = async () => {
    if (!productId) return;
    setSubmitting(true);
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const selectedValueIds = Object.values(selectedVariantAttrs).flat();
      if (selectedValueIds.length === 0) {
        throw new Error("Please select at least one attribute value from the generator list.");
      }

      const res = await fetch(`/api/admin/products/${productId}/generate-variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAttributeValueIds: selectedValueIds })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate missing variants");
      }

      const resData = await res.json();
      setGlobalSuccess(`Successfully generated ${resData.createdCount} new variant combinations!`);
      await refreshVariants();
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "Error generating missing variants.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle individual variant updates (Edit Dialog saving)
  const handleSaveVariantUpdate = async (updatedData: any) => {
    if (!productId || !editingVariant) return;
    setIsUpdatingVariant(true);
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${editingVariant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: updatedData.sku,
          barcode: updatedData.barcode || null,
          price: Number(updatedData.price),
          compareAtPrice: updatedData.compareAtPrice ? Number(updatedData.compareAtPrice) : null,
          stock: Number(updatedData.stock),
          status: updatedData.status,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update variant");
      }

      setGlobalSuccess(`Variant ${updatedData.sku} updated successfully!`);
      setEditingVariant(null);
      await refreshVariants();
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "Error updating variant details.");
    } finally {
      setIsUpdatingVariant(false);
    }
  };

  // Change individual variant status directly (Disable/Archive)
  const handleVariantStatusChange = async (variant: any, newStatus: "Disabled" | "Archived") => {
    const confirmationText = newStatus === "Archived"
      ? `Are you sure you want to archive variant "${variant.sku}"?`
      : `Are you sure you want to disable variant "${variant.sku}"?`;
    if (!window.confirm(confirmationText)) return;

    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: variant.sku,
          price: variant.price,
          status: newStatus,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to set variant status to ${newStatus}`);
      }

      setGlobalSuccess(`Variant "${variant.sku}" is now ${newStatus}.`);
      await refreshVariants();
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "Error modifying variant status.");
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      if (mode === "create") {
        // Transform price inputs (decimal INR) into paise (integer cents)
        const payload = {
          ...data,
          variants: data.variants?.map(v => ({
            ...v,
            price: Math.round(v.price * 100), 
            compareAtPrice: v.compareAtPrice ? Math.round(v.compareAtPrice * 100) : null,
          }))
        };

        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to create product");
        }

        window.location.href = "/admin/products";
      } else {
        // PATCH edit details
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update product details");
        }

        setGlobalSuccess("Product details updated successfully!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      console.error(err);
      setGlobalError(err.message || "An unexpected error occurred while saving the product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLookups) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light">Loading catalog parameters...</p>
      </div>
    );
  }

  const featuredMedia = watchMedia.find(m => m.isFeatured);
  const galleryMedia = watchMedia.filter(m => !m.isFeatured);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/admin/products"
            className="p-2 bg-secondary/60 hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-0.5">
            <h1 className="font-serif text-2xl font-normal text-foreground">
              {mode === "create" ? "Create Nail Design" : "Edit Nail Design"}
            </h1>
            <p className="text-xs text-muted-foreground font-light">
              {mode === "create" 
                ? "Add a new press-on nail set, configure dynamic sizing options, and setup Cloudinary media."
                : "Modify catalog properties, update marketing flags, adjust metadata, and build variants."}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5 relative z-10">
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-md shadow-primary/5 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                {mode === "create" ? "Save Product" : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>

      {globalError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs leading-normal font-light">
          {globalError}
        </div>
      )}

      {globalSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-2xl text-xs leading-normal font-light flex items-center gap-2">
          <Check className="w-4 h-4" />
          {globalSuccess}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Forms & Matrix) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Info */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
            <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-accent" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. French Ombre Glitter Nails"
                  {...register("name")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 text-foreground"
                />
                {errors.name && (
                  <p className="text-[10px] text-destructive ml-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="french-ombre-glitter-nails"
                  {...register("slug")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 text-foreground"
                />
                {errors.slug && (
                  <p className="text-[10px] text-destructive ml-1">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Category
                </label>
                <select
                  {...register("categoryId")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all text-foreground"
                >
                  <option value="" className="bg-card text-foreground">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card text-foreground">
                      {c.parentId ? "— " : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Brand
                </label>
                <select
                  {...register("brandId")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all text-foreground"
                >
                  <option value="" className="bg-card text-foreground">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id} className="bg-card text-foreground">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Description */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
            <h3 className="text-sm font-semibold tracking-wide">Product Copy & Descriptions</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Glamorous ombre press-on nails with sparkle elements..."
                  {...register("shortDescription")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 resize-none text-foreground"
                />
                {errors.shortDescription && (
                  <p className="text-[10px] text-destructive ml-1">{errors.shortDescription.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Detailed Description (HTML/Markdown supported)
                </label>
                <textarea
                  rows={5}
                  placeholder="Provide deep details about nail durability, sizes included, application glue kits, and reuse..."
                  {...register("description")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Attribute Checkboxes */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 hover:border-primary/10 transition-all">
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Product Attributes Selection</h3>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Select options associated with this product design.
              </p>
            </div>

            {/* Variant Attributes Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Variant Attributes
                </h4>
                <span className="text-[9px] text-muted-foreground font-light italic">
                  (generates product variations & pricing options)
                </span>
              </div>
              
              {variantAttributes.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-light italic pl-3.5">
                  No variant attributes defined.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {variantAttributes.map((group) => (
                    <div key={group.id} className="space-y-2.5 p-4 bg-secondary/20 dark:bg-secondary/5 rounded-2xl border border-border/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {group.name}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((v) => {
                          const isChecked = (watch("attributeValueIds") || []).includes(v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleAttributeToggle(group.id, v.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-light tracking-wide border transition-all flex items-center gap-1 cursor-pointer ${
                                isChecked
                                  ? "bg-primary/10 text-primary border-primary"
                                  : "bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                              {v.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catalog Attributes Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Catalog Attributes
                </h4>
                <span className="text-[9px] text-muted-foreground font-light italic">
                  (informational details used for search, filtering, and specifications)
                </span>
              </div>
              
              {catalogAttributes.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-light italic pl-3.5">
                  No catalog attributes defined.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {catalogAttributes.map((group) => (
                    <div key={group.id} className="space-y-2.5 p-4 bg-secondary/20 dark:bg-secondary/5 rounded-2xl border border-border/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {group.name}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((v) => {
                          const isChecked = (watch("attributeValueIds") || []).includes(v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleAttributeToggle(group.id, v.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-light tracking-wide border transition-all flex items-center gap-1 cursor-pointer ${
                                isChecked
                                  ? "bg-primary/10 text-primary border-primary"
                                  : "bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                              {v.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Variant Matrix Builder (Create Mode) OR Variant Management (Edit Mode) */}
          {mode === "create" ? (
            <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 hover:border-primary/10 transition-all">
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                    <Boxes className="w-4.5 h-4.5 text-primary animate-pulse" />
                    Variant Matrix Builder
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                    Choose attribute combinations to compile unique SKU lists.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {variantAttributes.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Select {group.name}s
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.values.map((v) => {
                          const isSelected = (selectedVariantAttrs[group.id] || []).includes(v.id);
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleVariantAttrToggle(group.id, v.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-accent/15 text-accent border-accent font-medium"
                                  : "bg-secondary/35 border-border/70 hover:bg-secondary/60 text-muted-foreground"
                              }`}
                            >
                              {v.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-secondary/25 dark:bg-secondary/10 rounded-2xl border border-border/40 flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Base SKU Prefix
                    </label>
                    <input
                      type="text"
                      placeholder="SNAIL-FRO"
                      value={baseSku}
                      onChange={(e) => setBaseSku(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all placeholder:text-muted-foreground/35 font-medium text-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateVariants}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3.5 bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate Matrix
                  </button>
                </div>
              </div>

              {watchVariants && watchVariants.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Generated Variant Options ({watchVariants.length})
                  </span>
                  
                  <div className="overflow-x-auto border border-border/40 rounded-2xl">
                    <table className="w-full text-left text-xs font-light">
                      <thead>
                        <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-semibold tracking-wider">
                          <th className="py-2.5 px-3">Variant Details</th>
                          <th className="py-2.5 px-3 w-20">Stock</th>
                          <th className="py-2.5 px-3 w-28">Price (INR)</th>
                          <th className="py-2.5 px-3 w-28">Compare At</th>
                          <th className="py-2.5 px-3 w-40">Barcode</th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantFields.map((field, idx) => (
                          <tr key={field.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/10 transition-all">
                            <td className="py-2.5 px-3 space-y-0.5">
                              <span className="font-mono text-[10px] font-semibold text-foreground">
                                {watchVariants[idx]?.sku}
                              </span>
                              <span className="text-[9px] text-muted-foreground block font-light truncate max-w-[150px]">
                                {watchVariants[idx]?.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                required
                                {...register(`variants.${idx}.stock`, { valueAsNumber: true })}
                                className="w-full px-2 py-1 bg-secondary/30 border border-border/60 focus:border-primary focus:ring-0.5 focus:ring-primary rounded-lg text-xs outline-none transition-all text-center text-foreground"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.01"
                                required
                                {...register(`variants.${idx}.price`, { valueAsNumber: true })}
                                className="w-full px-2 py-1 bg-secondary/30 border border-border/60 focus:border-primary focus:ring-0.5 focus:ring-primary rounded-lg text-xs outline-none transition-all text-center text-foreground"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                step="0.01"
                                {...register(`variants.${idx}.compareAtPrice`, { valueAsNumber: true })}
                                className="w-full px-2 py-1 bg-secondary/30 border border-border/60 focus:border-primary focus:ring-0.5 focus:ring-primary rounded-lg text-xs outline-none transition-all text-center text-foreground"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                {...register(`variants.${idx}.barcode`)}
                                className="w-full px-2 py-1 bg-secondary/30 border border-border/60 focus:border-primary focus:ring-0.5 focus:ring-primary rounded-lg text-[10px] outline-none transition-all font-mono text-foreground"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {errors.variants && (
                <p className="text-xs text-destructive mt-1 font-light">{errors.variants.message}</p>
              )}
            </div>
          ) : (
            /* Edit Mode: Variant Management & Generate Missing */
            <div className="space-y-6">
              {/* Variant Management Card */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                      <Boxes className="w-4.5 h-4.5 text-primary" />
                      Variant Management
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                      View and manage existing variant configurations, stock levels, and prices.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-border/40 rounded-2xl">
                  <table className="w-full text-left text-xs font-light">
                    <thead>
                      <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-semibold tracking-wider">
                        <th className="py-2.5 px-3">Variant</th>
                        <th className="py-2.5 px-3 w-28">SKU</th>
                        <th className="py-2.5 px-3 w-28">Barcode</th>
                        <th className="py-2.5 px-3 w-24">Price (INR)</th>
                        <th className="py-2.5 px-3 w-24">Compare Price</th>
                        <th className="py-2.5 px-3 text-center w-16">Stock</th>
                        <th className="py-2.5 px-3 text-center w-20">Status</th>
                        <th className="py-2.5 px-3 text-center w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingVariants.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground font-light text-xs">
                            No active variants found. Use the matrix builder below to generate variants.
                          </td>
                        </tr>
                      ) : (
                        existingVariants.map((v) => (
                          <tr key={v.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/10 transition-all">
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-foreground block max-w-[120px] truncate" title={v.name}>
                                {v.name.replace(`${watchName} - `, "") || v.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px]">{v.sku}</td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                              {v.barcode || <span className="italic opacity-30">None</span>}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-foreground">₹{v.price}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {v.compareAtPrice ? `₹${v.compareAtPrice}` : <span className="opacity-30">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">{v.stock}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                                v.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : v.status === "Disabled"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}>
                                {v.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingVariant(v)}
                                  className="inline-flex items-center gap-1 px-2 py-1 border border-border hover:bg-secondary hover:text-foreground text-muted-foreground rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </button>
                                {v.status === "Active" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleVariantStatusChange(v, "Disabled")}
                                    className="inline-flex items-center px-2 py-1 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 border border-border/40 hover:border-amber-500/20 rounded-lg text-[10px] transition-all cursor-pointer"
                                  >
                                    Disable
                                  </button>
                                ) : null}
                                {v.status !== "Archived" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleVariantStatusChange(v, "Archived")}
                                    className="inline-flex items-center px-2 py-1 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border border-border/40 hover:border-rose-500/20 rounded-lg text-[10px] transition-all cursor-pointer"
                                    title="Archive Variant"
                                  >
                                    Archive
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Generate Missing Variants Matrix Card */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                      <Plus className="w-4.5 h-4.5 text-accent" />
                      Generate Missing Variant Combinations
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                      Select attributes and automatically generate ONLY new combinations. Existing variants remain untouched.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {variantAttributes.map((group) => (
                      <div key={group.id} className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.name}s
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.values.map((v) => {
                            const isSelected = (selectedVariantAttrs[group.id] || []).includes(v.id);
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => handleVariantAttrToggle(group.id, v.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-accent/15 text-accent border-accent font-medium"
                                    : "bg-secondary/35 border-border/70 hover:bg-secondary/60 text-muted-foreground"
                                }`}
                              >
                                {v.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-secondary/25 dark:bg-secondary/10 rounded-2xl border border-border/40 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Base SKU Prefix
                      </label>
                      <input
                        type="text"
                        placeholder="SNAIL-FRO"
                        value={baseSku}
                        onChange={(e) => setBaseSku(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all placeholder:text-muted-foreground/35 font-medium text-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateMissingVariantsEdit}
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-3.5 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Generate Missing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidecards: Media & SEO) */}
        <div className="space-y-6">
          {/* Card 5: Media selection */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Media Library</h3>
              <p className="text-[10px] text-muted-foreground font-light mt-0.5">
                Upload and select Cloudinary assets for your catalog listings.
              </p>
            </div>

            {/* Featured Image display */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Featured Cover Image
              </span>
              {featuredMedia ? (
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border group bg-secondary/20">
                  <img
                    src={featuredMedia.url}
                    alt="Featured Product Cover"
                    className="w-full h-full object-cover transition-transform group-hover:scale-102"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(watchMedia.findIndex(m => m.isFeatured))}
                    className="absolute top-2 right-2 p-1.5 bg-background/90 text-muted-foreground hover:text-destructive rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPickerTarget("featured");
                    setShowMediaPicker(true);
                  }}
                  className="w-full aspect-square border border-dashed border-border hover:border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all cursor-pointer bg-secondary/10 dark:bg-secondary/2"
                >
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] font-light">Add Featured Image</span>
                </button>
              )}
            </div>

            {/* Gallery Images List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Gallery Images
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPickerTarget("gallery");
                    setShowMediaPicker(true);
                  }}
                  className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Images
                </button>
              </div>

              {galleryMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {watchMedia.map((m, idx) => {
                    if (m.isFeatured) return null;
                    return (
                      <div key={m.mediaId} className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-secondary/20">
                        <img src={m.url} alt="Gallery" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all">
                          <button
                            type="button"
                            onClick={() => makeFeatured(idx)}
                            className="p-1 bg-background/90 hover:bg-background text-primary rounded-lg transition-colors cursor-pointer"
                            title="Make Featured"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(idx)}
                            className="p-1 bg-background/90 hover:bg-background text-destructive rounded-lg transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground font-light text-center py-4 border border-dashed border-border/50 rounded-xl">
                  No additional gallery assets selected.
                </p>
              )}
            </div>
          </div>

          {/* Card 6: SEO */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
            <h3 className="text-sm font-semibold tracking-wide">SEO Metadata</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  placeholder="Buy French Ombre Nails Online | Store"
                  {...register("metaTitle")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 text-foreground"
                />
                {errors.metaTitle && (
                  <p className="text-[10px] text-destructive ml-1">{errors.metaTitle.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  placeholder="High-quality, durable press-on nails..."
                  {...register("metaDescription")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 resize-none text-foreground"
                />
                {errors.metaDescription && (
                  <p className="text-[10px] text-destructive ml-1">{errors.metaDescription.message}</p>
                )}
              </div>

              {/* OG Image picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Open Graph (Social Share) Image
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTarget("ogImage");
                      setShowMediaPicker(true);
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Pick Image
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="https://cloudinary.com/..."
                  {...register("ogImage")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/45 text-foreground font-mono"
                />
                {watch("ogImage") && (
                  <div className="mt-2 aspect-[1.91/1] w-full rounded-xl border border-border overflow-hidden bg-secondary/20">
                    <img src={watch("ogImage")!} alt="SEO Open Graph Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 7: Visibility & Promotions & Status */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all">
            <h3 className="text-sm font-semibold tracking-wide">Visibility & Promotions</h3>
            
            <div className="space-y-3">
              {/* Status input - edit mode */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Product Status
                </label>
                <select
                  {...register("status")}
                  className="w-full px-4 py-3 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all text-foreground font-semibold"
                >
                  <option value="Active">Active (Visible Everywhere)</option>
                  <option value="Draft">Draft (Admin Only)</option>
                  <option value="Out Of Stock">Out Of Stock (Storefront View Only)</option>
                  <option value="Archived">Archived (Hidden from Storefront/Search)</option>
                </select>
              </div>

              <div className="border-t border-border/30 my-3"></div>

              <label className="flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/30 rounded-2xl border border-border/30 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isFeatured")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Featured Product</span>
                  <p className="text-[9px] text-muted-foreground font-light leading-none">Renders in featured home grids.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/30 rounded-2xl border border-border/30 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isBestSeller")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Best Seller Badge</span>
                  <p className="text-[9px] text-muted-foreground font-light leading-none">Displays best seller tag on listings.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/30 rounded-2xl border border-border/30 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isNewArrival")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">New Arrival</span>
                  <p className="text-[9px] text-muted-foreground font-light leading-none">Highlights the set as a new release.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary/20 hover:bg-secondary/30 rounded-2xl border border-border/30 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isTrending")}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">Trending Set</span>
                  <p className="text-[9px] text-muted-foreground font-light leading-none">Shows trending badge based on sales velocity.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Edit Modal (Dialog) */}
      {editingVariant && (
        <VariantEditDialog
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSave={handleSaveVariantUpdate}
          saving={isUpdatingVariant}
        />
      )}

      {/* Cloudinary Media Selection Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/35 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-card border border-border w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-up my-auto">
            <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold tracking-wide uppercase">
                Select Cloudinary Assets
              </span>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-1.5 hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <MediaPicker
                maxSelection={pickerTarget === "featured" || pickerTarget === "ogImage" ? 1 : 10}
                onSelect={handleMediaSelect}
                onClose={() => setShowMediaPicker(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VariantEditDialogProps {
  variant: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

function VariantEditDialog({ variant, onClose, onSave, saving }: VariantEditDialogProps) {
  const [sku, setSku] = useState(variant.sku || "");
  const [barcode, setBarcode] = useState(variant.barcode || "");
  const [price, setPrice] = useState(variant.price || 0);
  const [compareAtPrice, setCompareAtPrice] = useState(variant.compareAtPrice || "");
  const [stock, setStock] = useState(variant.stock || 0);
  const [status, setStatus] = useState<"Active" | "Disabled" | "Archived">(variant.status || "Active");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim()) {
      setError("SKU is required.");
      return;
    }
    if (Number(price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    setError(null);

    try {
      await onSave({
        sku,
        barcode: barcode || null,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        stock: Number(stock),
        status,
      });
    } catch (err: any) {
      setError(err.message || "An error occurred while saving the variant.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/35 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 animate-scale-up space-y-4 my-auto">
        <div className="flex items-center justify-between border-b border-border/30 pb-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold tracking-wide">Edit Product Variant</h3>
            <p className="text-[10px] text-muted-foreground truncate max-w-[250px]">{variant.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-[10px] leading-normal font-light flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none font-mono text-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none font-mono text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Price (INR)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-foreground font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Compare Price</label>
              <input
                type="number"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Stock Level</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-foreground font-semibold font-mono text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-secondary/35 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-foreground font-semibold"
              >
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl transition-all font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-xl transition-all font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save Variant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
