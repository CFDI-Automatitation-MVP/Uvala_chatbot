"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  User,
  Shield,
  CreditCard,
  Settings,
  X,
  LogOut,
  Crown,
  Calendar,
  AlertCircle,
  Clock,
  XCircle,
  CheckCircle,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import { cn } from "lib/utils";
import { Label } from "ui/label";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import {
  isUserInTrialPeriod,
  getRemainingTrialDays,
  isTrialExpired,
} from "@/lib/subscription";
import { PDFViewer } from "@/components/pdf-viewer";

const profileSections = [
  { id: "profile", icon: User, key: "title" },
  { id: "account", icon: Settings, key: "account" },
  { id: "privacy", icon: Shield, key: "privacy" },
  { id: "billing", icon: CreditCard, key: "billing" },
] as const;

// Helper function to get plan-specific icon
const getPlanIcon = (planType: string | undefined) => {
  switch (planType) {
    case "plus":
      return "/uvala-plus.svg";
    case "pro":
      return "/uvala-pro.svg";
    case "max":
      return "/uvala-max.svg";
    default:
      return null;
  }
};

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
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [_termsAcknowledged, setTermsAcknowledged] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const {
    hasSubscription,
    planType,
    subscription,
    userCreatedAt,
    loading: subscriptionLoading,
  } = useSubscription();

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

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.",
      )
    ) {
      return;
    }

    setCancelingSubscription(true);
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          "Your subscription has been scheduled for cancellation at the end of the current billing period.",
        );
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        alert(`Error: ${data.error || "Failed to cancel subscription"}`);
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert(
        "An error occurred while canceling your subscription. Please try again.",
      );
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleTermsAcknowledged = () => {
    setTermsAcknowledged(true);
    setCanProceed(true);
  };

  const handleProceed = () => {
    if (canProceed) {
      router.push("/");
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
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">
                      {t("Profile.privacy")}
                    </h2>
                    <Shield className="w-6 h-6 text-muted-foreground" />
                  </div>

                  {/* Data Privacy Information */}
                  <div className="bg-background/60 rounded-lg p-4 border border-border/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-foreground">
                        Data Privacy
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      Anthropic believes in transparent data practices. Learn
                      how your information is protected when using Anthropic
                      products, and visit our Privacy Center and Privacy Policy
                      for more details.
                    </p>
                    <div className="space-y-2 text-sm">
                      <button className="text-blue-600 hover:text-blue-700 transition-colors">
                        How we protect your data →
                      </button>
                      <br />
                      <button className="text-blue-600 hover:text-blue-700 transition-colors">
                        How we use your data →
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions PDF */}
                  <PDFViewer
                    pdfUrl="/TÉRMINOS Y CONDICIONES DE USO DE PLATAFORMA UVALA.AI.pdf"
                    title={
                      t("Profile.termsAndConditions") ||
                      "Términos y Condiciones de Uso de Plataforma Uvala.AI"
                    }
                    required={true}
                    onAcknowledge={handleTermsAcknowledged}
                    className="mt-6"
                  />

                  {/* Proceed Button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleProceed}
                      disabled={!canProceed}
                      className={cn(
                        "w-full transition-all duration-200",
                        canProceed
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-muted text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      {canProceed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Continue to Application
                        </>
                      ) : (
                        "Please acknowledge terms to continue"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "billing" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("Profile.billing")}
                  </h2>

                  {subscriptionLoading ? (
                    <div className="text-muted-foreground">
                      Loading subscription details...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Current Plan */}
                      <div className="bg-background/60 rounded-lg p-4 border border-border/20">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium text-foreground">
                            Current Plan
                          </Label>
                          {hasSubscription &&
                            subscription?.status === "active" &&
                            getPlanIcon(planType) && (
                              <Image
                                src={getPlanIcon(planType)!}
                                alt={`${planType} plan icon`}
                                width={32}
                                height={32}
                                className="flex-shrink-0"
                              />
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              hasSubscription &&
                              subscription?.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {planType} Plan
                          </Badge>

                          {subscription?.status && (
                            <Badge
                              variant={
                                subscription.status === "active"
                                  ? "default"
                                  : subscription.status === "trialing"
                                    ? "default"
                                    : subscription.status === "canceled" ||
                                        subscription.status === "unpaid"
                                      ? "destructive"
                                      : subscription.status === "past_due" ||
                                          subscription.status === "incomplete"
                                        ? "destructive"
                                        : "secondary"
                              }
                              className="capitalize"
                            >
                              {subscription.status === "past_due"
                                ? "Payment Due"
                                : subscription.status === "incomplete"
                                  ? "Action Required"
                                  : subscription.status === "trialing"
                                    ? "Trial"
                                    : subscription.status}
                            </Badge>
                          )}
                        </div>

                        {!hasSubscription && (
                          <p className="text-sm text-muted-foreground mt-2">
                            You&apos;re currently on the free plan. Upgrade to
                            unlock more features.
                          </p>
                        )}
                      </div>

                      {/* Trial Status - Show for free users only */}
                      {!hasSubscription && userCreatedAt && (
                        <div className="bg-background/60 rounded-lg p-4 border border-border/20">
                          <Label className="text-sm font-medium text-foreground mb-3 block">
                            Trial Status
                          </Label>

                          {(() => {
                            const userCreationDate = new Date(userCreatedAt);
                            const isInTrial =
                              isUserInTrialPeriod(userCreationDate);
                            const remainingDays =
                              getRemainingTrialDays(userCreationDate);
                            const trialExpired =
                              isTrialExpired(userCreationDate);

                            if (isInTrial) {
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Clock className="w-4 h-4" />
                                    <Badge
                                      variant="default"
                                      className="bg-blue-600"
                                    >
                                      Trial Active
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-foreground">
                                    <span className="font-medium">
                                      {remainingDays} day
                                      {remainingDays !== 1 ? "s" : ""}
                                    </span>{" "}
                                    remaining
                                  </div>
                                </div>
                              );
                            } else if (trialExpired) {
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                    <Badge variant="destructive">
                                      Trial Expired
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Upgrade to continue using the service
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="text-sm text-muted-foreground">
                                  No trial information available
                                </div>
                              );
                            }
                          })()}
                        </div>
                      )}

                      {/* Subscription Details */}
                      {hasSubscription && subscription && (
                        <div className="bg-background/60 rounded-lg p-4 border border-border/20">
                          <Label className="text-sm font-medium text-foreground mb-3 block">
                            Subscription Details
                          </Label>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-foreground">
                                Current Period:{" "}
                                {new Date(
                                  subscription.currentPeriodStart,
                                ).toLocaleDateString()}{" "}
                                -{" "}
                                {new Date(
                                  subscription.currentPeriodEnd,
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            {subscription.cancelAtPeriodEnd && (
                              <div className="flex items-center gap-2 text-orange-600">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                  Your subscription will cancel at the end of
                                  the current period.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Subscription Management Dropdown */}
                      <div className="pt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex items-center gap-2 w-full"
                            >
                              <Settings className="size-4" />
                              {t("Profile.subscriptionManage") ||
                                "Manage Subscription"}
                              <ChevronDown className="size-4 ml-auto" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56" align="end">
                            <DropdownMenuItem
                              onClick={() => router.push("/pricing")}
                              className="flex items-center gap-2"
                            >
                              <CreditCard className="size-4" />
                              {t("Profile.upgradePlan") || "Upgrade Plan"}
                            </DropdownMenuItem>

                            {hasSubscription && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open("/pricing", "_blank")
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Settings className="size-4" />
                                  {t("Profile.changePlan") || "Change Plan"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {subscription?.status === "active" &&
                                  !subscription?.cancelAtPeriodEnd && (
                                    <DropdownMenuItem
                                      onClick={handleCancelSubscription}
                                      disabled={cancelingSubscription}
                                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                    >
                                      <XCircle className="size-4" />
                                      {cancelingSubscription
                                        ? t("Profile.canceling") ||
                                          "Canceling..."
                                        : t("Profile.cancelSubscription") ||
                                          "Cancel Subscription"}
                                    </DropdownMenuItem>
                                  )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
