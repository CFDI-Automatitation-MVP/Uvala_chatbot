"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Shield, CreditCard, Settings, X, LogOut } from "lucide-react";
import { cn } from "lib/utils";
import { Label } from "ui/label";
import { Button } from "ui/button";
import { supabase } from "@/lib/supabase/client";

const profileSections = [
  { id: "profile", icon: User, key: "title" },
  { id: "account", icon: Settings, key: "account" },
  { id: "privacy", icon: Shield, key: "privacy" },
  { id: "billing", icon: CreditCard, key: "billing" },
] as const;

interface Props {
  session?: {
    user: {
      id: string;
      email?: string;
      name?: string;
      image?: string;
    };
  };
}

export function ProfilePageClient({ session }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>("profile");

  const user = session?.user;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/sign-in";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 flex items-center justify-center p-4">
      {/* Semi-transparent container */}
      <div className="w-full max-w-4xl bg-background/80 backdrop-blur-md border border-border/20 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Exit Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-muted/80 hover:bg-muted border border-border/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-center group hover:scale-105 shadow-lg"
          aria-label="Close Profile"
        >
          <X className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        {/* Header */}
        <div className="bg-background/50 border-b border-border/20 p-6 pr-16">
          <h1 className="text-2xl font-bold text-foreground">
            {t("Profile.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4 bg-background/30 border-r border-border/20 p-6">
            <nav className="space-y-2">
              {profileSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <Icon className="size-5 flex-shrink-0" />
                    <span className="font-medium">
                      {t(`Profile.${section.key}`)}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6">
            <div className="bg-background/40 rounded-xl p-6 border border-border/10">
              {activeSection === "profile" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("Profile.title")}
                  </h2>

                  {/* Google Account Info */}
                  <div className="bg-background/60 rounded-lg p-4 border border-border/20">
                    <Label className="text-sm font-medium text-foreground mb-3 block">
                      {t("Profile.googleAccount")}
                    </Label>
                    {user ? (
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name || "User"}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {user.name || "User"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email || "No email"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        No account connected
                      </div>
                    )}
                  </div>

                  {/* Logout Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleLogout}
                      variant="destructive"
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <LogOut className="size-4" />
                      {t("Layout.signOut")}
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "account" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("Profile.account")}
                  </h2>
                  <div className="text-muted-foreground">
                    Account settings and security options will be displayed
                    here.
                  </div>
                </div>
              )}

              {activeSection === "privacy" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("Profile.privacy")}
                  </h2>
                  <div className="text-muted-foreground">
                    Privacy settings and data management options will be
                    displayed here.
                  </div>
                </div>
              )}

              {activeSection === "billing" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("Profile.billing")}
                  </h2>
                  <div className="text-muted-foreground">
                    Billing information and subscription details will be
                    displayed here.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
