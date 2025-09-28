import { cookies } from "next/headers";

export interface UserPreferences {
  language: string;
  theme?: string;
}

/**
 * Get user's preferred language from various sources
 * Priority: Cookie > Browser Headers > Default (en)
 */
export function getUserLanguage(): string {
  try {
    // 1. Check cookie first (set by language selection)
    const cookieStore = cookies();
    const localeCookie = cookieStore.get("i18n:locale");

    if (localeCookie?.value) {
      return localeCookie.value;
    }

    // 2. Fallback to English if no preference found
    return "en";
  } catch (error) {
    console.warn("Failed to get user language preference:", error);
    return "en";
  }
}

/**
 * Get user's preferred language from client-side
 */
export function getUserLanguageClient(): string {
  try {
    // 1. Check cookie first
    const cookies = document.cookie.split(";");
    const localeCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("i18n:locale="),
    );

    if (localeCookie) {
      return localeCookie.split("=")[1];
    }

    // 2. Check browser language
    const browserLang = navigator.language.split("-")[0];
    const supportedLanguages = ["en", "es", "fr", "ja"];

    if (supportedLanguages.includes(browserLang)) {
      return browserLang;
    }

    // 3. Default to English
    return "en";
  } catch (error) {
    console.warn("Failed to get user language preference on client:", error);
    return "en";
  }
}

/**
 * Set user's language preference
 */
export function setUserLanguage(language: string): void {
  try {
    // Set cookie that expires in 1 year
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    document.cookie = `i18n:locale=${language}; path=/; expires=${expires.toUTCString()}`;
  } catch (error) {
    console.error("Failed to set user language preference:", error);
  }
}

/**
 * Get all user preferences
 */
export function getUserPreferences(): UserPreferences {
  return {
    language: getUserLanguage(),
  };
}

/**
 * Get user language from database/session if available
 * This would integrate with your user system
 */
export async function getUserLanguageFromDB(userId?: string): Promise<string> {
  if (!userId) {
    return getUserLanguage();
  }

  try {
    // TODO: Implement database lookup
    // const user = await getUserById(userId);
    // return user.preferences?.language || getUserLanguage();

    // For now, fallback to cookie/default
    return getUserLanguage();
  } catch (error) {
    console.warn("Failed to get user language from database:", error);
    return getUserLanguage();
  }
}
