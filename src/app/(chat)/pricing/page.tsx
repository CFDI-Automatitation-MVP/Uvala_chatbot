"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Zap,
  Crown,
  Globe,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslations } from "next-intl";

type Currency = "USD" | "MXN";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: {
    USD: number;
    MXN: number;
  };
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  stripePriceId: {
    USD: string;
    MXN: string;
  };
}

const pricingPlans: PricingPlan[] = [
  {
    id: "plus",
    name: "Plus",
    description: "For regular users",
    price: {
      USD: 7,
      MXN: 129,
    },
    interval: "month",
    stripePriceId: {
      USD: "price_1S8ZQb1pY9V37Up5ZA7L5GdP",
      MXN: "price_1S8XyI1pY9V37Up5iYJDKtqU",
    },
    popular: true,
    features: [],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals and teams",
    price: {
      USD: 11,
      MXN: 199,
    },
    interval: "month",
    stripePriceId: {
      USD: "price_1S8aVQ1pY9V37Up58mNbG5rA",
      MXN: "price_1S8XzW1pY9V37Up5DIUux5pQ",
    },
    features: [],
  },
  {
    id: "max",
    name: "Max",
    description: "For power users and professionals",
    price: {
      USD: 14,
      MXN: 249,
    },
    interval: "month",
    stripePriceId: {
      USD: "price_1S8aWD1pY9V37Up57JJOhbk0",
      MXN: "price_1S8aUO1pY9V37Up5TcfjXrNP",
    },
    features: [],
  },
];

// Function to get icon for feature
const getFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase();
  if (
    lowerFeature.includes("web search") ||
    lowerFeature.includes("búsqueda web") ||
    lowerFeature.includes("recherche web") ||
    lowerFeature.includes("ウェブ検索")
  ) {
    return <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />;
  } else if (
    lowerFeature.includes("image") ||
    lowerFeature.includes("imagen") ||
    lowerFeature.includes("画像")
  ) {
    return <ImageIcon className="w-4 h-4 text-green-500 flex-shrink-0" />;
  } else if (
    lowerFeature.includes("video") ||
    lowerFeature.includes("vidéo") ||
    lowerFeature.includes("動画")
  ) {
    return <Video className="w-4 h-4 text-green-500 flex-shrink-0" />;
  } else {
    return <Check className="w-4 h-4 text-green-500 flex-shrink-0" />;
  }
};

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("MXN");
  const {
    hasSubscription,
    planType,
    subscription,
    loading: subscriptionLoading,
  } = useSubscription();
  const t = useTranslations("Pricing");

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.price[currency] === 0) return; // Free plan doesn't need checkout

    const priceId = plan.stripePriceId[currency];
    if (!priceId) {
      alert(
        `Stripe price ID not configured for this plan in ${currency}. Please contact support.`,
      );
      return;
    }

    setIsLoading(plan.id);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceId,
          planId: plan.id,
          currency: currency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to start checkout. Please try again later.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Background video - only covers the content area, not the sidebar */}
      <div className="absolute inset-0 w-full h-full bg-black -z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/uvala-pricing-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40 z-10" />{" "}
        {/* Overlay for better contrast */}
      </div>

      <div className="relative z-20 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-white">{t("title")}</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            {t("description")}
          </p>

          {/* Currency Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg p-1 border border-white/30">
              <button
                onClick={() => setCurrency("MXN")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currency === "MXN"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {t("currencyPesos")}
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  currency === "USD"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {t("currencyDollars")}
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {pricingPlans.map((plan) => {
            const isCurrentPlan = hasSubscription && planType === plan.id;
            const isActivePlan =
              isCurrentPlan && subscription?.status === "active";

            return (
              <Card
                key={plan.id}
                className={`relative bg-black/20 backdrop-blur-sm border-white/50 shadow-2xl text-white ${
                  isActivePlan
                    ? "border-green-500 ring-2 ring-green-200"
                    : plan.popular
                      ? "border-white ring-2 ring-white/30"
                      : ""
                }`}
              >
                {isActivePlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500">
                    <Crown className="w-3 h-3 mr-1" />
                    {t("currentPlan")}
                  </Badge>
                )}
                {plan.popular && !isActivePlan && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Zap className="w-3 h-3 mr-1" />
                    {t("mostPopular")}
                  </Badge>
                )}

                <CardHeader className="p-8 pb-4 text-center">
                  <CardTitle className="mb-4">
                    {isActivePlan && (
                      <div className="flex items-center justify-center text-green-600 mb-2">
                        <Crown className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">
                          {t("active")}
                        </span>
                      </div>
                    )}
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {t(`plans.${plan.id}.name`)}
                    </h3>
                    <CardDescription className="text-gray-300 text-base">
                      {t(`plans.${plan.id}.description`)}
                    </CardDescription>
                  </CardTitle>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">
                      ${plan.price[currency]} {currency}
                      <span className="text-lg font-normal text-gray-400">
                        /{t(plan.interval)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8">
                  <ul className="space-y-4 mb-8">
                    {t
                      .raw(`plans.${plan.id}.features`)
                      .map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-3">
                          {getFeatureIcon(feature)}
                          <span
                            className="text-sm text-white"
                            dangerouslySetInnerHTML={{
                              __html: feature.replace(
                                /\*\*(.*?)\*\*/g,
                                "<strong>$1</strong>",
                              ),
                            }}
                          />
                        </li>
                      ))}
                  </ul>

                  {isActivePlan ? (
                    <div className="w-full p-3 text-center bg-green-500/20 border border-green-400 rounded-md backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-2 text-green-300">
                        <Crown className="w-4 h-4" />
                        <span className="font-medium">{t("currentPlan")}</span>
                      </div>
                      <p className="text-xs text-green-200 mt-1">
                        {t("subscribed")}
                      </p>
                    </div>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? "bg-white text-black hover:bg-gray-100 border-white"
                          : "bg-white/90 text-black hover:bg-white border-white/70"
                      }`}
                      onClick={() => handleSubscribe(plan)}
                      disabled={
                        isLoading === plan.id ||
                        (plan.price[currency] > 0 &&
                          !plan.stripePriceId[currency]) ||
                        subscriptionLoading
                      }
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {subscriptionLoading
                        ? t("loading")
                        : isLoading === plan.id
                          ? t("loading")
                          : !plan.stripePriceId[currency]
                            ? t("comingSoon")
                            : t("subscribeTo", {
                                plan: t(`plans.${plan.id}.name`),
                              })}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
