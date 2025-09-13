"use client";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";

import { SidebarGroup } from "ui/sidebar";
import Link from "next/link";
import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { WriteIcon } from "ui/write-icon";
import {
  FolderOpenIcon,
  FolderSearchIcon,
  PlusIcon,
  Waypoints,
  MessageCircleDashed,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Skeleton } from "ui/skeleton";
import { useArchives } from "@/hooks/queries/use-archives";
import { ArchiveDialog } from "../archive-dialog";
import { appStore } from "@/app/store";

export function AppSidebarMenus() {
  const router = useRouter();
  const t = useTranslations("");
  const { setOpenMobile } = useSidebar();
  const [expandedArchive, setExpandedArchive] = useState(false);
  const [addArchiveDialogOpen, setAddArchiveDialogOpen] = useState(false);

  const { data: archives, isLoading: isLoadingArchives } = useArchives();
  const appStoreMutate = appStore((state) => state.mutate);
  const toggleArchive = useCallback(() => {
    setExpandedArchive((prev) => !prev);
  }, []);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <Tooltip>
            <SidebarMenuItem className="mb-1">
              <Link
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMobile(false);
                  router.push(`/`);
                  router.refresh();
                }}
              >
                <SidebarMenuButton
                  className="font-semibold group/new-chat group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto transition-all duration-200"
                  tooltip={t("Layout.newChat")}
                >
                  <WriteIcon className="size-4 group-data-[collapsible=icon]:size-6 transition-all duration-200 flex-shrink-0" />
                  <span className="ml-2 whitespace-nowrap overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:opacity-0">
                    {t("Layout.newChat")}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-medium ml-auto opacity-0 group-hover/new-chat:opacity-100 transition-opacity duration-200 group-data-[collapsible=icon]:hidden">
                    {getShortcutKeyList(Shortcuts.openNewChat).map((key) => (
                      <span
                        key={key}
                        className="border w-5 h-5 flex items-center justify-center bg-accent rounded"
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </Tooltip>
          <Tooltip>
            <SidebarMenuItem className="mb-1">
              <SidebarMenuButton
                className="font-semibold group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto transition-all duration-200"
                tooltip={t("Layout.temporaryChat")}
                onClick={() => {
                  setOpenMobile(false);
                  appStoreMutate((state) => ({
                    temporaryChat: {
                      ...state.temporaryChat,
                      isOpen: !state.temporaryChat.isOpen,
                    },
                  }));
                }}
              >
                <MessageCircleDashed className="size-4 group-data-[collapsible=icon]:size-6 transition-all duration-200 flex-shrink-0" />
                <span className="ml-2 whitespace-nowrap overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:opacity-0">
                  {t("Layout.temporaryChat")}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Tooltip>
        </SidebarMenu>

        {/* Workflow - Hidden but preserved */}
        {false && (
          <SidebarMenu>
            <Tooltip>
              <SidebarMenuItem>
                <Link href="/workflow">
                  <SidebarMenuButton className="font-semibold">
                    <Waypoints className="size-4" />
                    {t("Layout.workflow")}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </Tooltip>
          </SidebarMenu>
        )}
        <SidebarMenu className="group/archive">
          <Tooltip>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleArchive}
                className="font-semibold group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto transition-all duration-200"
                tooltip={t("Archive.title")}
              >
                {expandedArchive ? (
                  <FolderOpenIcon className="size-4 group-data-[collapsible=icon]:size-6 transition-all duration-200 flex-shrink-0" />
                ) : (
                  <FolderSearchIcon className="size-4 group-data-[collapsible=icon]:size-6 transition-all duration-200 flex-shrink-0" />
                )}
                <span className="ml-2 whitespace-nowrap overflow-hidden transition-all duration-200 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:opacity-0">
                  {t("Archive.title")}
                </span>
              </SidebarMenuButton>
              <SidebarMenuAction
                className="group-hover/archive:opacity-100 opacity-0 transition-opacity"
                onClick={() => setAddArchiveDialogOpen(true)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PlusIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    {t("Archive.addArchive")}
                  </TooltipContent>
                </Tooltip>
              </SidebarMenuAction>
            </SidebarMenuItem>
          </Tooltip>
          {expandedArchive && (
            <>
              <SidebarMenuSub>
                {isLoadingArchives ? (
                  <div className="gap-2 flex flex-col">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-full" />
                    ))}
                  </div>
                ) : archives!.length === 0 ? (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton className="text-muted-foreground">
                      {t("Archive.noArchives")}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ) : (
                  archives!.map((archive) => (
                    <SidebarMenuSubItem
                      onClick={() => {
                        router.push(`/archive/${archive.id}`);
                      }}
                      key={archive.id}
                      className="cursor-pointer"
                    >
                      <SidebarMenuSubButton>
                        {archive.name}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))
                )}
              </SidebarMenuSub>
            </>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
      <ArchiveDialog
        open={addArchiveDialogOpen}
        onOpenChange={setAddArchiveDialogOpen}
      />
    </SidebarGroup>
  );
}
