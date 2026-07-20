"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageSquare, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ContactClientProps {
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
}

export function ContactClient({
  storeEmail = "hello@snailstudio.in",
  storePhone = "+91 99999 99999",
  storeAddress = "Snail Studio, Luxury Craft Center\nNew Delhi, DL 110001, India",
}: ContactClientProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name.trim()) newErrors.name = "Full name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!form.subject.trim()) newErrors.subject = "Subject is required";
    if (!form.message.trim()) newErrors.message = "Message cannot be empty";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        const data = await res.json();
        console.error("Contact form API submission failed:", data);
        setStatus("error");
      }
    } catch (err) {
      console.error("Network error during contact submission:", err);
      setStatus("error");
    }
  };

  return (
    <div className="bg-background text-foreground/90 font-sans min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-primary uppercase bg-primary/5 border border-primary/20 px-3 py-1 rounded-full">
            <MessageSquare className="w-3.5 h-3.5" />
            Contact Support
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-wide text-foreground">
            We are here to help
          </h1>
          <p className="text-sm font-light text-muted-foreground leading-relaxed">
            Have questions about custom sizing, shipping times, or need help designing a bespoke set? Drop us a line and our studio support team will get back to you within 24 hours.
          </p>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-6 shadow-xs">
              <h3 className="font-serif text-xl font-medium text-foreground pb-2 border-b border-border/10">
                Get in Touch
              </h3>

              {/* Email Support Card */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Email Support</h4>
                  <p className="text-xs text-muted-foreground font-light">For order queries and customization design reviews.</p>
                  <a
                    href={`mailto:${storeEmail}`}
                    className="block text-xs font-semibold text-primary hover:underline pt-0.5"
                  >
                    {storeEmail}
                  </a>
                </div>
              </div>

              {/* WhatsApp Support Card */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">WhatsApp Chat</h4>
                  <p className="text-xs text-muted-foreground font-light">Available Monday to Saturday, 10 AM - 7 PM IST.</p>
                  <a
                    href={`https://wa.me/${storePhone.replace(/[\s+()-]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-semibold text-primary hover:underline pt-0.5"
                  >
                    {storePhone}
                  </a>
                </div>
              </div>

              {/* Location Card */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Studio Location</h4>
                  <p className="text-xs text-muted-foreground font-light leading-relaxed whitespace-pre-line">
                    {storeAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Sizing Banner */}
            <div className="bg-gradient-to-br from-secondary/50 to-primary/5 border border-border/40 rounded-2xl p-6 flex flex-col justify-between h-48 relative overflow-hidden">
              <div className="space-y-2 z-10">
                <h4 className="font-serif text-lg font-medium text-foreground leading-tight">Not sure about your size?</h4>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Our interactive sizing guide takes less than two minutes and helps prevent fit issues.
                </p>
              </div>
              <Link
                href="/sizing-guide"
                className="inline-flex items-center text-xs font-semibold text-primary uppercase tracking-widest hover:text-accent transition-colors pt-2 z-10 group"
              >
                Go to Size Guide
                <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="absolute right-[-15px] bottom-[-15px] w-20 h-20 rounded-full bg-primary/10 blur-xl pointer-events-none" />
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-card border border-border/30 rounded-2xl p-6 sm:p-8 shadow-xs">
            {status === "success" ? (
              <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-medium text-foreground">Message Sent!</h3>
                  <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. We have received your query and one of our custom design team artists will get back to you shortly.
                  </p>
                </div>
                <Button
                  onClick={() => setStatus("idle")}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs uppercase tracking-widest px-6 py-2.5 rounded-full cursor-pointer mt-4"
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="font-serif text-xl font-medium text-foreground pb-2 border-b border-border/10">
                  Send a Message
                </h3>

                {status === "error" && (
                  <div className="p-4 bg-destructive/10 text-destructive text-xs rounded-xl font-medium">
                    ⚠️ An error occurred sending your message. Please try again.
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1">
                  <label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    className="w-full bg-background border border-border/45 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50 font-light"
                  />
                  {errors.name && <p className="text-[10px] text-destructive font-medium">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full bg-background border border-border/45 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50 font-light"
                  />
                  {errors.email && <p className="text-[10px] text-destructive font-medium">{errors.email}</p>}
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label htmlFor="subject" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="What is your query about?"
                    className="w-full bg-background border border-border/45 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50 font-light"
                  />
                  {errors.subject && <p className="text-[10px] text-destructive font-medium">{errors.subject}</p>}
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label htmlFor="message" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Type your message details here..."
                    className="w-full bg-background border border-border/45 rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50 font-light resize-none"
                  />
                  {errors.message && <p className="text-[10px] text-destructive font-medium">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={status === "submitting"}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs uppercase tracking-widest py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer font-semibold"
                >
                  {status === "submitting" ? "Sending..." : "Submit Message"}
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
