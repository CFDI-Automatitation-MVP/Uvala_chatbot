"use client";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "ui/dropdown-menu";
import { AvatarFallback, AvatarImage, Avatar } from "ui/avatar";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenu } from "ui/sidebar";
import {
  ChevronsUpDown,
  LogOutIcon,
  Settings2,
  Palette,
  Languages,
  Sun,
  MoonStar,
  ChevronRight,
  ArrowUpRight,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { appStore } from "@/app/store";
import { BASE_THEMES, COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "lib/const";
import { capitalizeFirstLetter, cn } from "lib/utils";
import { supabase } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { getLocaleAction } from "@/i18n/get-locale";
import { useCallback, useState, useEffect } from "react";
import { useShallow } from "zustand/shallow";
import { useThemeStyle } from "@/hooks/use-theme-style";
import { useSidebar } from "ui/sidebar";
import { Button } from "ui/button";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { HoverBorderGradient } from "ui/hover-border-gradient";
type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
};

export function AppSidebarUser({
  session,
}: { session?: { user: SessionUser } }) {
  const [appStoreMutate, profileDropdownOpen] = appStore(
    useShallow((state) => [state.mutate, state.profileDropdownOpen])
  );
  const t = useTranslations("Layout");
  const { open, openMobile } = useSidebar();
  const { hasSubscription } = useSubscription();

  const setDropdownOpen = (isOpen: boolean) => {
    appStoreMutate({ profileDropdownOpen: isOpen });
  };

  const user = session?.user;

  // Close dropdown when sidebar closes
  useEffect(() => {
    if (!open && !openMobile) {
      setDropdownOpen(false);
    }
  }, [open, openMobile]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/sign-in";
    }
  };

  // Session is managed by Supabase automatically

  return (
    <SidebarMenu>
      {/* Upgrade Button - Only show if user doesn't have active subscription and sidebar is open */}
      {!hasSubscription && (open || openMobile) && (
        <SidebarMenuItem className="mb-2">
          <HoverBorderGradient
            containerClassName="rounded-lg w-full"
            as="div"
            className="bg-black dark:bg-white text-white dark:text-black flex items-center justify-center space-x-2 w-full py-2 px-4 font-medium"
          >
            <Link href="/pricing" className="flex items-center gap-2 w-full justify-center">
              <ArrowUpRight className="size-4" />
              <span>{t("upgrade")}</span>
            </Link>
          </HoverBorderGradient>
        </SidebarMenuItem>
      )}
      
      <SidebarMenuItem>
        <DropdownMenu open={profileDropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-12 animate-shimmer border border-slate-700/50 dark:border-slate-700/50 border-slate-300/50 bg-[linear-gradient(110deg,rgba(0,1,3,0.2),45%,rgba(30,38,49,0.3),55%,rgba(0,1,3,0.2))] dark:bg-[linear-gradient(110deg,rgba(0,1,3,0.2),45%,rgba(30,38,49,0.3),55%,rgba(0,1,3,0.2))] bg-[linear-gradient(110deg,rgba(248,250,252,0.6),45%,rgba(226,232,240,0.7),55%,rgba(248,250,252,0.6))] bg-[length:200%_100%] text-slate-300 dark:text-slate-300 text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 hover:text-slate-700 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
              size={"lg"}
              tooltip={user?.email || "Profile"}
            >
              <Avatar className="rounded-full size-8 border border-slate-600/50 dark:border-slate-600/50 border-slate-400/50 group-data-[collapsible=icon]:size-9">
                <AvatarImage
                  className="object-cover"
                  src={user?.image || "/pf.png"}
                  alt={user?.name || ""}
                />
                <AvatarFallback className="bg-slate-700/50 dark:bg-slate-700/50 bg-slate-200/70 text-slate-300 dark:text-slate-300 text-slate-600">
                  {user?.name?.slice(0, 1) || ""}
                </AvatarFallback>
              </Avatar>
              <span className="truncate group-data-[collapsible=icon]:sr-only">
                {user?.email}
              </span>
              <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="bg-background/80 backdrop-blur-md border-border/20 w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
            align="center"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={user?.image || "/pf.png"}
                    alt={user?.name || ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user?.name?.slice(0, 1) || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <User className="size-4 text-foreground" />
                <span>{t("profile")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => appStoreMutate({ openChatPreferences: true })}
            >
              <Settings2 className="size-4 text-foreground" />
              <span>{t("chatPreferences")}</span>
            </DropdownMenuItem>
            <SelectTheme />
            <SelectLanguage />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOutIcon className="size-4 text-foreground" />
              <span>{t("signOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SelectTheme() {
  const t = useTranslations("Layout");

  const { theme = "light", setTheme } = useTheme();

  const { themeStyle = "default", setThemeStyle } = useThemeStyle();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="flex items-center"
        icon={
          <>
            <span className="text-muted-foreground text-xs min-w-0 truncate">
              {`${capitalizeFirstLetter(theme)} ${capitalizeFirstLetter(
                themeStyle,
              )}`}
            </span>
            <ChevronRight className="size-4 ml-2" />
          </>
        }
      >
        <Palette className="mr-2 size-4" />
        <span className="mr-auto">{t("theme")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="bg-background/80 backdrop-blur-md border-border/20 w-48 rounded-lg">
          <DropdownMenuLabel className="text-muted-foreground w-full flex items-center">
            <span className="text-muted-foreground text-xs mr-2 select-none">
              {capitalizeFirstLetter(theme)}
            </span>
            <div className="flex-1" />

            <div
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="cursor-pointer border rounded-full flex items-center"
            >
              <div
                className={cn(
                  theme === "dark" &&
                    "bg-accent ring ring-muted-foreground/40 text-foreground",
                  "p-1 rounded-full",
                )}
              >
                <MoonStar className="size-3" />
              </div>
              <div
                className={cn(
                  theme === "light" &&
                    "bg-accent ring ring-muted-foreground/40 text-foreground",
                  "p-1 rounded-full",
                )}
              >
                <Sun className="size-3" />
              </div>
            </div>
          </DropdownMenuLabel>
          <div className="max-h-96 overflow-y-auto">
            {BASE_THEMES.map((t) => (
              <DropdownMenuCheckboxItem
                key={t}
                checked={themeStyle === t}
                onClick={(e) => {
                  e.preventDefault();
                  setThemeStyle(t);
                }}
                className="text-sm"
              >
                {capitalizeFirstLetter(t)}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

function SelectLanguage() {
  const t = useTranslations("Layout");
  const { data: currentLocale } = useSWR(COOKIE_KEY_LOCALE, getLocaleAction, {
    fallbackData: SUPPORTED_LOCALES[0].code,
    revalidateOnFocus: false,
  });
  const handleOnChange = useCallback((locale: string) => {
    document.cookie = `${COOKIE_KEY_LOCALE}=${locale}; path=/;`;
    window.location.reload();
  }, []);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages className="mr-2 size-4" />
        <span>{t("language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          className="bg-background/80 backdrop-blur-md border-border/20 w-48 max-h-96 overflow-y-auto rounded-lg"
        >
          <DropdownMenuLabel className="text-muted-foreground">
            {t("language")}
          </DropdownMenuLabel>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuCheckboxItem
              key={locale.code}
              checked={locale.code === currentLocale}
              onCheckedChange={() =>
                locale.code !== currentLocale && handleOnChange(locale.code)
              }
            >
              {locale.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
