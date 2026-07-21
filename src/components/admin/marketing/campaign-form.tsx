"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { createCampaignAction, CreateCampaignInput } from "@/features/marketing/actions";
import { Sparkles, Calendar, FileText, Send, Save, ArrowLeft, ArrowRight, Eye, Monitor, Smartphone, CheckCircle, Search, Percent, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface CouponItem {
  id: string;
  code: string;
  description: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  price?: number;
}

interface CampaignFormProps {
  coupons: CouponItem[];
  products: ProductItem[];
}

const TEMPLATE_PRESETS: Record<string, { subject: string; html: string }> = {
  promotion: {
    subject: "Handcrafted Elegance Awaits - Special Offer Inside!",
    html: `<html>
  <body style="font-family: 'Outfit', sans-serif; background-color: #FAF8F5; padding: 30px; margin: 0; color: #2C2520;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DF;">
      <div style="background-color: #A85328; padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; font-family: 'Georgia', serif; margin: 0; font-size: 28px; font-weight: normal; letter-spacing: 1px;">Handcrafted Elegance Awaits</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello {{customer_name}},</p>
        <p style="font-size: 16px; line-height: 1.6;">Step up your style with our premium, reusable press-on nail sets. Each set is painted by hand by our custom artists for a salon-quality finish.</p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">Discover your next favorite look from our curated sets:</p>
        
        <div style="margin: 30px 0; text-align: center;">
          {{recommended_products}}
        </div>
        
        <p style="text-align: center; margin: 40px 0;">
          <a href="{{unsubscribe_url}}" style="background-color: #A85328; color: #ffffff; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 5px 15px rgba(168,83,40,0.2);">Shop the Collection</a>
        </p>
        <p style="font-size: 16px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 25px; margin-top: 30px;">We know you love shopping in <strong>{{favorite_category}}</strong>!</p>
        <p style="font-size: 15px; color: #777; margin-bottom: 0;">Best regards,<br/>Snail Studios</p>
      </div>
      <div style="background-color: #FAF8F5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EAE6DF;">
        You are receiving this email because you opted in to receive promotions from Snail Studios. <br/>
        <a href="{{unsubscribe_url}}" style="color: #A85328; text-decoration: underline; margin-top: 8px; display: inline-block;">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`
  },
  new_collection: {
    subject: "Introducing: The Velvet Luxe Collection 💅",
    html: `<html>
  <body style="font-family: 'Outfit', sans-serif; background-color: #FAF8F5; padding: 30px; margin: 0; color: #2C2520;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DF;">
      <div style="background: linear-gradient(135deg, #2C2520 0%, #4E4035 100%); padding: 50px 20px; text-align: center;">
        <span style="color: #A85328; text-transform: uppercase; font-size: 12px; letter-spacing: 3px; font-weight: bold; display: block; margin-bottom: 10px;">New Arrival Release</span>
        <h1 style="color: #ffffff; font-family: 'Georgia', serif; margin: 0; font-size: 32px; font-weight: normal; letter-spacing: 1px;">THE VELVET LUXE</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customer_name}},</p>
        <p style="font-size: 16px; line-height: 1.6;">Indulge in textured jewel tones and cat-eye finishes with our newest limited-run collection, designed to deliver head-turning shimmer effects. Every design is crafted meticulously by our hand-paint nail artists.</p>
        
        <h3 style="color: #A85328; font-family: Georgia, serif; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 30px;">Featured Collection Sets</h3>
        <div style="margin: 25px 0; text-align: center;">
          {{recommended_products}}
        </div>

        <p style="text-align: center; margin: 40px 0 20px 0;">
          <a href="{{unsubscribe_url}}" style="background-color: #2C2520; color: #ffffff; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">Explore the Collection</a>
        </p>
      </div>
      <div style="background-color: #FAF8F5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EAE6DF;">
        Snail Studios &bull; Premium Reusable Press-On Nails<br/>
        <a href="{{unsubscribe_url}}" style="color: #A85328; text-decoration: underline; margin-top: 8px; display: inline-block;">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`
  },
  wishlist_reminder: {
    subject: "Items in your wishlist are waiting for you!",
    html: `<html>
  <body style="font-family: 'Outfit', sans-serif; background-color: #FAF8F5; padding: 30px; margin: 0; color: #2C2520;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DF;">
      <div style="background-color: #FAF6F0; padding: 40px 20px; text-align: center; border-bottom: 1px solid #EAE6DF;">
        <h1 style="color: #A85328; font-family: 'Georgia', serif; margin: 0; font-size: 26px; font-weight: normal;">Your Saved Styles Await</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customer_name}},</p>
        <p style="font-size: 16px; line-height: 1.6;">We noticed you saved some premium, reusable press-on nail sets in your wishlist. Because our artists paint each set by hand in small batches, popular designs sell out quickly.</p>
        
        <h3 style="color: #A85328; font-family: Georgia, serif; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 30px;">Saved Items in Your Wishlist</h3>
        <div style="margin: 25px 0;">
          {{wishlist_products}}
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">Complete your purchase today before your sizes are gone!</p>
        <p style="text-align: center; margin: 35px 0;">
          <a href="{{unsubscribe_url}}" style="background-color: #A85328; color: #ffffff; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">Return & Order Now</a>
        </p>
      </div>
      <div style="background-color: #FAF8F5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EAE6DF;">
        Snail Studios &bull; Premium Reusable Press-On Nails<br/>
        <a href="{{unsubscribe_url}}" style="color: #A85328; text-decoration: underline; margin-top: 8px; display: inline-block;">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`
  },
  cart_recovery: {
    subject: "Complete your order before it sells out!",
    html: `<html>
  <body style="font-family: 'Outfit', sans-serif; background-color: #FAF8F5; padding: 30px; margin: 0; color: #2C2520;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DF;">
      <div style="background-color: #FAF6F0; padding: 40px 20px; text-align: center; border-bottom: 1px solid #EAE6DF;">
        <h1 style="color: #A85328; font-family: 'Georgia', serif; margin: 0; font-size: 26px; font-weight: normal;">Don't Leave Your Nails Behind</h1>
      </div>
      <div style="padding: 40px 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi {{customer_name}},</p>
        <p style="font-size: 16px; line-height: 1.6;">We've saved the handcrafted items left in your shopping cart. Because our sets are painted by hand in small batches, stock is limited and cart holds expire soon.</p>
        
        <h3 style="color: #A85328; font-family: Georgia, serif; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 30px;">Items in Your Cart</h3>
        <div style="margin: 25px 0;">
          {{cart_products}}
        </div>

        <div style="border: 2px dashed #A85328; background-color: #FAF6F0; padding: 25px; border-radius: 15px; text-align: center; margin: 30px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Apply checkout coupon code:</p>
          <h2 style="font-family: monospace; font-size: 26px; margin: 10px 0; letter-spacing: 3px; color: #2C2520;">{{coupon_code}}</h2>
          <p style="margin: 0; font-size: 11px; color: #999;">Save 10% on your shopping cart order today!</p>
        </div>

        <p style="text-align: center; margin: 35px 0;">
          <a href="{{unsubscribe_url}}" style="background-color: #A85328; color: #ffffff; padding: 14px 35px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">Complete Checkout</a>
        </p>
      </div>
      <div style="background-color: #FAF8F5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EAE6DF;">
        Snail Studios &bull; Premium Reusable Press-On Nails<br/>
        <a href="{{unsubscribe_url}}" style="color: #A85328; text-decoration: underline; margin-top: 8px; display: inline-block;">Unsubscribe</a>
      </div>
    </div>
  </body>
</html>`
  },
  custom: {
    subject: "A Message from Snail Studios",
    html: `<html>
  <body style="font-family: 'Outfit', sans-serif; background-color: #FAF8F5; padding: 30px; margin: 0; color: #2C2520;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #EAE6DF; padding: 40px 30px;">
      <h2 style="color: #2C2520; font-family: Georgia, serif; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-top: 0;">Snail Studios</h2>
      <p>Hello {{customer_name}},</p>
      <p>[Type your custom message content here...]</p>
      <p style="font-size: 14px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
        Snail Studios &bull; Handcrafted Press-on Nail Sets
      </p>
    </div>
  </body>
</html>`
  }
};

export default function CampaignForm({ coupons, products }: CampaignFormProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  // Wizard state values
  const [campaignType, setCampaignType] = useState<CreateCampaignInput["campaignType"]>("promotion");
  const [segmentType, setSegmentType] = useState<CreateCampaignInput["segmentType"]>("all");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState(TEMPLATE_PRESETS.promotion.subject);
  const [bodyHtml, setBodyHtml] = useState(TEMPLATE_PRESETS.promotion.html);
  const [couponId, setCouponId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [scheduleType, setScheduleType] = useState<"immediate" | "scheduled" | "draft">("draft");
  const [scheduledAtDate, setScheduledAtDate] = useState("");
  const [scheduledAtTime, setScheduledAtTime] = useState("");
  
  // Search query for catalog product search
  const [productQuery, setProductQuery] = useState("");

  // Segment accurate preview members
  const [segmentMembers, setSegmentMembers] = useState<{ id: string | null; email: string; name: string }[]>([]);
  const [checkedEmails, setCheckedEmails] = useState<string[]>([]);
  const [isSegmentLoading, setIsSegmentLoading] = useState(false);

  useEffect(() => {
    const fetchSegmentMembers = async () => {
      setIsSegmentLoading(true);
      try {
        const res = await fetch(`/api/admin/marketing/segment-preview?segment=${segmentType}`);
        if (res.ok) {
          const payload = await res.json();
          const members = payload.recipients || [];
          setSegmentMembers(members);
          setCheckedEmails(members.map((m: { id: string | null; email: string; name: string }) => m.email));
        }
      } catch (err) {
        console.error("Failed to load segment preview:", err);
      } finally {
        setIsSegmentLoading(false);
      }
    };
    fetchSegmentMembers();
  }, [segmentType]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newValue = before + tag + after;
    setBodyHtml(newValue);

    // Re-focus and position cursor right after the inserted placeholder tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 0);
  };
  const mirrorRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const mirror = mirrorRef.current;
    if (mirror) {
      mirror.scrollTop = e.currentTarget.scrollTop;
      mirror.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const highlightPlaceholders = (text: string) => {
    const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
    return parts.map((part, index) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return (
          <span
            key={index}
            className="bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded border border-amber-500/30"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleCampaignTypeSelect = (type: CreateCampaignInput["campaignType"]) => {
    setCampaignType(type);
    
    // Auto-fill defaults
    const preset = TEMPLATE_PRESETS[type] || TEMPLATE_PRESETS.custom;
    setSubject(preset.subject);
    setBodyHtml(preset.html);

    // Auto-generate campaign name
    const typeLabels: Record<string, string> = {
      newsletter: "Newsletter Campaign",
      promotion: "Promo Blast Campaign",
      wishlist_reminder: "Wishlist Reminder Campaign",
      cart_recovery: "Cart Recovery Campaign",
      custom: "Custom Campaign"
    };
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    setName(`${typeLabels[type] || "Campaign"} - ${dateStr}`);

    // Suggested audience mapping
    if (type === "wishlist_reminder") {
      setSegmentType("wishlist");
    } else if (type === "cart_recovery") {
      setSegmentType("cart_abandoners");
    } else {
      setSegmentType("all");
    }

    setCurrentStep(2);
  };

  const handleProductToggle = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== productId));
    } else {
      if (selectedProductIds.length >= 4) {
        setErrorMessage("You can select up to 4 featured products.");
        setTimeout(() => setErrorMessage(""), 3000);
        return;
      }
      setSelectedProductIds([...selectedProductIds, productId]);
    }
  };

  // Resolve estimated reach counter
  const getEstimatedReach = () => {
    switch (segmentType) {
      case "all":
        return "100+ (Everyone)";
      case "vip":
        return "~12 VIP Shoppers";
      case "frequent":
        return "~25 Frequent Buyers";
      case "inactive":
        return "~15 Inactive Customers";
      case "cart_abandoners":
        return "~8 Cart Abandoners";
      case "wishlist":
        return "~20 Wishlist Savers";
      case "launch_subscribers":
        return "~45 Launch Subscribers";
      default:
        return "N/A";
    }
  };

  // Compile Preview HTML with mock placeholders
  const getCompiledPreview = () => {
    let mockHtml = bodyHtml;
    mockHtml = mockHtml.replaceAll("{{customer_name}}", "Jane Doe");
    
    const activeCoupon = coupons.find((c) => c.id === couponId);
    mockHtml = mockHtml.replaceAll("{{coupon_code}}", activeCoupon?.code || "MOCKSAVE10");
    mockHtml = mockHtml.replaceAll("{{coupon}}", activeCoupon?.code || "MOCKSAVE10");
    mockHtml = mockHtml.replaceAll("{{favorite_category}}", "Gel Coated Coffin Nails");
    mockHtml = mockHtml.replaceAll("{{unsubscribe_url}}", "#");

    const wishlistMock = `
      <div style="border: 1px solid #EAE6DF; padding: 15px; border-radius: 10px; margin: 10px 0; background: #FFF;">
        <h4 style="margin: 0 0 5px 0; color: #2C2520;">Glazed Almond Press-on Set</h4>
        <span style="font-size: 12px; color: #888;">Size: Medium &bull; Price: ₹1,500</span>
      </div>
    `;
    mockHtml = mockHtml.replaceAll("{{wishlist_products}}", wishlistMock);

    const cartMock = `
      <div style="border: 1px solid #EAE6DF; padding: 15px; border-radius: 10px; margin: 10px 0; background: #FFF;">
        <h4 style="margin: 0 0 5px 0; color: #2C2520;">Chrome Velvet Coffin Set &times; 1</h4>
        <span style="font-size: 12px; color: #888;">Total: ₹1,800</span>
      </div>
    `;
    mockHtml = mockHtml.replaceAll("{{cart_products}}", cartMock);

    const productsMock = selectedProductIds.length > 0 
      ? products
          .filter((p) => selectedProductIds.includes(p.id))
          .map((p) => `
            <div style="display: inline-block; width: 120px; margin: 10px; text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
              <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #2C2520; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</p>
              <span style="font-size: 11px; color: #A85328; font-weight: bold;">₹1,500</span>
            </div>
          `).join("")
      : `
        <div style="display: inline-block; width: 120px; margin: 10px; text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #2C2520;">Classic French</p>
          <span style="font-size: 11px; color: #A85328; font-weight: bold;">₹1,200</span>
        </div>
        <div style="display: inline-block; width: 120px; margin: 10px; text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #2C2520;">Cat-Eye Aura</p>
          <span style="font-size: 11px; color: #A85328; font-weight: bold;">₹1,600</span>
        </div>
      `;
    mockHtml = mockHtml.replaceAll("{{recommended_products}}", productsMock);

    return mockHtml;
  };

  const handleSend = () => {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Campaign Name is required. Please go back to step 3 and enter a name.");
      return;
    }

    let scheduledAtString: string | undefined = undefined;
    if (scheduleType === "scheduled") {
      if (!scheduledAtDate || !scheduledAtTime) {
        setErrorMessage("Please configure date and time for the scheduled release.");
        return;
      }
      scheduledAtString = new Date(`${scheduledAtDate}T${scheduledAtTime}`).toISOString();
    }

    startTransition(async () => {
      const isCustomSelection = checkedEmails.length !== segmentMembers.length;
      const finalSegmentType = isCustomSelection ? "selected" : segmentType;
      const segmentDetails = isCustomSelection ? JSON.stringify(checkedEmails) : undefined;

      const res = await createCampaignAction({
        name,
        subject,
        campaignType,
        segmentType: finalSegmentType,
        segmentDetails: segmentDetails,
        templateName: campaignType,
        bodyHtml,
        couponId: couponId || null,
        featuredProductIds: selectedProductIds.length > 0 ? JSON.stringify(selectedProductIds) : undefined,
        scheduleType,
        scheduledAtString,
      });

      if (res && !res.success) {
        setErrorMessage(res.error || "Failed to create campaign.");
      }
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productQuery.toLowerCase())
  );

  return (
    <div className="bg-card border border-border/40 shadow-sm rounded-3xl p-8 max-w-5xl mx-auto font-sans text-foreground">
      
      {/* Steps timeline indicator */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/30">
        {[
          { step: 1, label: "Type" },
          { step: 2, label: "Audience" },
          { step: 3, label: "Customize & Preview" },
          { step: 4, label: "Schedule" },
          { step: 5, label: "Review & Send" }
        ].map((item) => (
          <div key={item.step} className="flex items-center flex-1 last:flex-initial">
            <button
              type="button"
              disabled={item.step > currentStep && !name}
              onClick={() => setCurrentStep(item.step)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold transition-all ${
                currentStep === item.step
                  ? "bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/20"
                  : currentStep > item.step
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {item.step}
            </button>
            <span className="hidden md:inline ml-2 text-xs font-semibold text-muted-foreground mr-4">
              {item.label}
            </span>
            {item.step < 5 && (
              <div className={`hidden md:block flex-1 h-[2px] mr-4 transition-all ${
                currentStep > item.step ? "bg-primary/20" : "bg-border/30"
              }`} />
            )}
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-4 mb-6 text-sm font-semibold flex items-center gap-2">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* STEP 1: Campaign Type Card Grid */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">Create a Campaign</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Select a campaign archetype to preload templates, custom subject lines, and recommended customer target scopes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {[
              { type: "promotion", title: "📢 Promotion", desc: "Broadcast sales, seasonal launches, and store events." },
              { type: "new_collection", title: "🆕 New Collection", desc: "Introduce new handcrafted premium sets." },
              { type: "wishlist_reminder", title: "❤️ Wishlist Reminder", desc: "Target customers with items saved in wishlists." },
              { type: "cart_recovery", title: "🛒 Cart Recovery", desc: "Re-engage checkout drop-offs with custom discount coupons." },
              { type: "custom", title: "✉️ Custom Newsletter", desc: "Write customized HTML messages to store visitors." }
            ].map((preset) => (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleCampaignTypeSelect(preset.type as any)}
                className={`text-left p-6 rounded-2xl border transition-all hover:scale-[1.01] flex flex-col justify-between h-40 ${
                  campaignType === preset.type
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-primary/40 hover:bg-secondary/10"
                }`}
              >
                <div>
                  <h3 className="font-bold text-base text-foreground mb-2">{preset.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{preset.desc}</p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">Select &rarr;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Audience Target Select */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold font-serif">Choose Target Audience</h3>
            <p className="text-xs text-muted-foreground mt-1">Select which segment of customers will receive this campaign run.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { val: "all", title: "Everyone", desc: "All active customers with marketing permission." },
              { val: "vip", title: "VIP Shoppers", desc: "High value customers with multiple completed orders." },
              { val: "frequent", title: "Frequent Customers", desc: "Shoppers with >= 3 successful orders." },
              { val: "inactive", title: "Inactive Customers", desc: "No orders placed in the last 90 days." },
              { val: "cart_abandoners", title: "Cart Abandoners", desc: "Customers with active items left in their cart." },
              { val: "wishlist", title: "Wishlist Savers", desc: "Users with items saved in their wishlist." },
              { val: "launch_subscribers", title: "Launch Subscribers", desc: "Mailing list from pre-launch signups." }
            ].map((seg) => (
              <label
                key={seg.val}
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  segmentType === seg.val
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:bg-secondary/10"
                }`}
              >
                <input
                  type="radio"
                  name="segmentType"
                  value={seg.val}
                  checked={segmentType === seg.val}
                  onChange={() => setSegmentType(seg.val as any)}
                  className="mt-1 accent-primary"
                />
                <div>
                  <span className="font-bold text-sm block text-foreground">{seg.title}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed block mt-1">{seg.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <div className="border border-border/40 rounded-2xl p-4 bg-secondary/5 space-y-3">
              <div className="flex justify-between items-center border-b border-border/30 pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="select-all-recipients"
                    checked={segmentMembers.length > 0 && checkedEmails.length === segmentMembers.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = checkedEmails.length > 0 && checkedEmails.length < segmentMembers.length;
                      }
                    }}
                    onChange={() => {
                      if (checkedEmails.length === segmentMembers.length) {
                        setCheckedEmails([]);
                      } else {
                        setCheckedEmails(segmentMembers.map((m) => m.email));
                      }
                    }}
                    className="rounded border-border/60 text-primary focus:ring-primary h-4 w-4 accent-primary cursor-pointer"
                  />
                  <label htmlFor="select-all-recipients" className="font-semibold text-xs uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                    Audience Members:
                  </label>
                </div>
                <span className="text-xs font-bold text-primary">
                  {isSegmentLoading ? "Calculating..." : `${checkedEmails.length} / ${segmentMembers.length} Selected`}
                </span>
              </div>
              
              {isSegmentLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-muted-foreground ml-2">Loading member list...</span>
                </div>
              ) : segmentMembers.length > 0 ? (
                <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                  {segmentMembers.map((m, idx) => {
                    const isChecked = checkedEmails.includes(m.email);
                    return (
                      <div 
                        key={m.id || idx} 
                        onClick={() => {
                          if (isChecked) {
                            setCheckedEmails(checkedEmails.filter((e) => e !== m.email));
                          } else {
                            setCheckedEmails([...checkedEmails, m.email]);
                          }
                        }}
                        className={`flex justify-between items-center text-xs font-medium border rounded-lg px-3 py-1.5 cursor-pointer transition-all select-none ${
                          isChecked 
                            ? "bg-primary/5 border-primary/40 text-foreground" 
                            : "bg-background/40 border-border/20 text-muted-foreground hover:bg-secondary/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            className="rounded border-border/60 text-primary focus:ring-primary h-3.5 w-3.5 accent-primary pointer-events-none"
                          />
                          <span className="font-mono">{m.email}</span>
                        </div>
                        <span className="text-[10px] bg-secondary/30 px-2 py-0.5 rounded-full">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-1 text-center">No active users currently match this segment.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary/20 text-sm font-semibold flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold flex items-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Customize Message Form & Live Preview */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-serif">Design Campaign Message</h3>
              <p className="text-xs text-muted-foreground mt-1">Refine the email details and watch your live compiled email preview update instantly.</p>
            </div>
            
            {/* Desktop / Mobile Preview Toggles */}
            <div className="flex items-center border border-border/60 rounded-xl p-0.5 bg-secondary/10">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  previewMode === "desktop" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor size={14} /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  previewMode === "mobile" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone size={14} /> Mobile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Left Column: Inputs and Editor */}
            <div className="space-y-4 bg-secondary/5 border border-border/30 rounded-2xl p-5 shadow-sm">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Internal Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Launch Coupon Blast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                  <span>Email Subject Line</span>
                  <span className="text-[10px] text-primary tracking-normal font-semibold lowercase font-sans">supports {"{{customer_name}}"}</span>
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Percent size={14} /> Attach Coupon
                  </label>
                  <select
                    value={couponId}
                    onChange={(e) => setCouponId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                  >
                    <option value="">No coupon attached</option>
                    {coupons.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} ({c.description || "Active Discount"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ShoppingBag size={14} /> Curate Featured Products
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search store sets..."
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                    />
                  </div>
                  {productQuery && (
                    <div className="border border-border/50 rounded-xl bg-background max-h-40 overflow-y-auto mt-1 p-2 space-y-1 z-10 relative">
                      {filteredProducts.slice(0, 5).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleProductToggle(p.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex justify-between items-center transition-all ${
                            selectedProductIds.includes(p.id)
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-secondary/40 text-foreground"
                          }`}
                        >
                          <span>{p.name}</span>
                          {selectedProductIds.includes(p.id) ? (
                            <span className="text-[10px] font-bold">Selected</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">+ Add</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedProductIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {products
                        .filter((p) => selectedProductIds.includes(p.id))
                        .map((p) => (
                          <span
                            key={p.id}
                            className="bg-secondary text-foreground border border-border/50 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5"
                          >
                            {p.name}
                            <button
                              type="button"
                              onClick={() => handleProductToggle(p.id)}
                              className="text-muted-foreground hover:text-rose-500 font-extrabold text-xs"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                  <span>Body HTML Content</span>
                  <span className="text-[10px] text-primary tracking-normal font-semibold lowercase font-sans">supports personalization tags</span>
                </label>
                
                {/* Smart Insertion Toolbar */}
                <div className="flex flex-wrap gap-1 p-1.5 bg-background border border-border/60 rounded-xl mb-1.5">
                  <span className="text-[9px] font-bold text-muted-foreground flex items-center px-1 select-none">
                    ⚡ Insert:
                  </span>
                  {[
                    { label: "👤 Name", tag: "{{customer_name}}", tooltip: "Customer Name" },
                    { label: "🎟️ Coupon", tag: "{{coupon_code}}", tooltip: "Coupon Code" },
                    { label: "❤️ Wishlist", tag: "{{wishlist_products}}", tooltip: "Wishlist items block" },
                    { label: "🛒 Cart", tag: "{{cart_products}}", tooltip: "Abandoned cart items block" },
                    { label: "💅 Style", tag: "{{favorite_category}}", tooltip: "Customer's favorite category" },
                    { label: "✨ Recommended", tag: "{{recommended_products}}", tooltip: "Curated products block" },
                    { label: "🔕 Unsubscribe", tag: "{{unsubscribe_url}}", tooltip: "Unsubscribe link URL" }
                  ].map((ph) => (
                    <button
                      key={ph.tag}
                      type="button"
                      title={ph.tooltip}
                      onClick={() => insertPlaceholder(ph.tag)}
                      className="px-2.5 py-1 text-[9px] font-bold bg-secondary/40 hover:bg-primary/5 hover:text-primary text-foreground border border-border/30 rounded-lg transition-all hover:scale-[1.01]"
                    >
                      {ph.label}
                    </button>
                  ))}
                </div>

                <div className="relative border border-border rounded-xl bg-background overflow-hidden min-h-[280px]">
                  {/* Highlight overlay layer behind the textarea */}
                  <div
                    ref={mirrorRef}
                    className="absolute inset-0 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all overflow-hidden text-transparent select-none"
                    style={{ wordBreak: "break-word" }}
                  >
                    {highlightPlaceholders(bodyHtml)}
                  </div>

                  {/* Actual textarea layer on top */}
                  <textarea
                    ref={textareaRef}
                    required
                    rows={12}
                    value={bodyHtml}
                    onScroll={handleScroll}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="relative w-full bg-transparent p-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-0 focus:border-transparent transition-all text-foreground shadow-inner resize-y z-10"
                    style={{ wordBreak: "break-word", minHeight: "280px" }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Live Compiled Preview */}
            <div className="border border-border/40 rounded-2xl overflow-hidden bg-background shadow-sm flex flex-col min-h-[500px] xl:sticky xl:top-6">
              <div className="bg-secondary/15 border-b border-border/40 px-5 py-3 flex justify-between items-center">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye size={14} className="text-primary" /> Live Email Preview
                </span>
                <span className="text-[10px] text-muted-foreground italic font-medium">Updates in real-time</span>
              </div>
              <div className="flex-1 flex justify-center py-6 bg-secondary/5">
                <div
                  className={`transition-all duration-300 w-full flex justify-center ${
                    previewMode === "mobile" ? "max-w-[360px] border-[6px] border-secondary-foreground/20 rounded-[30px] p-2 bg-background min-h-[480px]" : "px-4"
                  }`}
                >
                  <iframe
                    srcDoc={getCompiledPreview()}
                    title="Live Email Preview Sandbox"
                    className="w-full h-[480px] border border-border/30 rounded-xl bg-white shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary/20 text-sm font-semibold flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!name.trim()) {
                  setErrorMessage("Campaign Name is required. Please enter an Internal Campaign Name.");
                  return;
                }
                setErrorMessage("");
                setCurrentStep(4);
              }}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold flex items-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Schedule Settings */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold font-serif">Configure Release Schedule</h3>
            <p className="text-xs text-muted-foreground mt-1">Specify whether to transmit this newsletter batch immediately or queue for later.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {[
              { type: "draft", icon: <FileText size={20} />, label: "Save as Draft", desc: "Saves details in draft. Trigger manually later." },
              { type: "immediate", icon: <Send size={20} />, label: "Send Immediately", desc: "Transmits email batch as soon as you confirm." },
              { type: "scheduled", icon: <Calendar size={20} />, label: "Schedule Later", desc: "Automatically triggers at a specified hour." }
            ].map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => setScheduleType(opt.type as any)}
                className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.01] ${
                  scheduleType === opt.type
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:bg-secondary/10"
                }`}
              >
                <div className="text-primary mb-3">{opt.icon}</div>
                <h4 className="font-bold text-sm text-foreground mb-1">{opt.label}</h4>
                <p className="text-xs text-muted-foreground leading-normal">{opt.desc}</p>
              </button>
            ))}
          </div>

          {scheduleType === "scheduled" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/10 border border-border/30 rounded-2xl p-6 transition-all">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Release Date</label>
                <input
                  type="date"
                  required
                  value={scheduledAtDate}
                  onChange={(e) => setScheduledAtDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary text-foreground font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Release Time</label>
                <input
                  type="time"
                  required
                  value={scheduledAtTime}
                  onChange={(e) => setScheduledAtTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary text-foreground font-medium"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary/20 text-sm font-semibold flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold flex items-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Review & Final Confirmation */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold font-serif">Review & Confirm Campaign</h3>
            <p className="text-xs text-muted-foreground mt-1">Please double check all parameters before launching this batch run.</p>
          </div>

          <div className="border border-border/50 rounded-2xl bg-secondary/10 p-6 space-y-4 text-sm font-medium">
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Campaign Name:</span>
              <span className="text-foreground font-semibold">{name || "Untitled Campaign"}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Archetype:</span>
              <span className="text-foreground capitalize">{campaignType}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Subject Line:</span>
              <span className="text-foreground">{subject}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Coupon Attached:</span>
              <span className="text-foreground">
                {couponId ? coupons.find((c) => c.id === couponId)?.code : "None"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Target Segment:</span>
              <span className="text-foreground capitalize">{segmentType}</span>
            </div>
            <div className="flex justify-between border-b border-border/30 pb-2">
              <span className="text-muted-foreground text-xs uppercase">Audience Reach:</span>
              <span className="text-primary font-bold">
                {isSegmentLoading ? "Calculating..." : `${checkedEmails.length} / ${segmentMembers.length} Selected`}
              </span>
            </div>
            {checkedEmails.length > 0 && (
              <div className="border border-border/30 rounded-xl p-3 bg-secondary/5 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Target Recipients ({checkedEmails.length}):</span>
                <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                  {checkedEmails.map((email, idx) => {
                    const member = segmentMembers.find(m => m.email === email);
                    return (
                      <div key={idx} className="flex justify-between font-mono font-medium text-foreground">
                        <span>{email}</span>
                        <span className="text-[10px] text-muted-foreground font-sans font-normal">{member?.name || "Customer"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-between pb-1">
              <span className="text-muted-foreground text-xs uppercase">Release Schedule:</span>
              <span className="text-foreground font-semibold">
                {scheduleType === "immediate"
                  ? "⚡ Immediately on dispatch confirmation"
                  : scheduleType === "scheduled"
                  ? `📅 Scheduled for ${scheduledAtDate} at ${scheduledAtTime}`
                  : "💾 Save as internal draft"}
              </span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl border border-border hover:bg-secondary/20 text-sm font-semibold flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSend}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold flex items-center gap-2 shadow-md shadow-primary/25 disabled:opacity-50 transition-all"
            >
              {isPending ? (
                "Processing..."
              ) : scheduleType === "immediate" ? (
                <>
                  <Send size={16} /> Confirm & Dispatch Run
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Save Campaign Settings
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
