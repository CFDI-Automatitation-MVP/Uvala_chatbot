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

import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleIcon } from "ui/google-icon";

export default function SignIn() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
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
      <Card className="w-full md:max-w-md bg-background border-none mx-auto shadow-none animate-in fade-in duration-1000">
        <CardHeader className="my-4">
          <CardTitle className="text-2xl text-center my-1">
            Welcome to Better Chatbot
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 text-base"
          >
            <GoogleIcon className="size-5 mr-3 fill-foreground" />
            {loading ? "Signing in..." : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
