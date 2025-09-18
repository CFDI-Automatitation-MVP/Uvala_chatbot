"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleIcon } from "ui/google-icon";
import Image from "next/image";
import { getURL } from "@/lib/get-url";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getURL()}auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch {
      toast.error("Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 justify-center">
      <Card className="w-full md:max-w-sm bg-black/10 backdrop-blur-md border-white/30 mx-auto shadow-2xl animate-in fade-in duration-1000">
        <CardHeader className="py-6 px-6 text-center">
          <div className="flex flex-col items-center mb-2">
            <div className="mb-4">
              <Image
                src="/auth/uvala-white-log.svg"
                alt="Uvala Logo"
                width={96}
                height={96}
                className="w-24 h-24 object-contain mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-white">uvala</h1>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 text-base bg-white/90 hover:bg-white text-black border-white/50 hover:border-white"
          >
            <GoogleIcon className="size-5 mr-3 fill-current" />
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
