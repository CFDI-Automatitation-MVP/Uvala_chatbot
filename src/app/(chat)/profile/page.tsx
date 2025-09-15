import { getSessionWithRedirect } from "@/lib/auth/supabase-auth";
import { ProfilePageClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await getSessionWithRedirect();

  return <ProfilePageClient session={session} />;
}