"use client";

import { appStore } from "@/app/store";
import { useChatModels } from "@/hooks/queries/use-chat-models";
import { ChatModel } from "app-types/chat";
import { CheckIcon, ChevronDown } from "lucide-react";
import { Fragment, memo, PropsWithChildren, useEffect, useState } from "react";
import { Button } from "ui/button";
import { useTranslations } from "next-intl";

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "ui/command";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { Popover, PopoverContent, PopoverTrigger } from "ui/popover";

interface SelectModelProps {
  onSelect: (model: ChatModel) => void;
  align?: "start" | "end";
  currentModel?: ChatModel;
  showProvider?: boolean;
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [open, setOpen] = useState(false);
  const { data: providers } = useChatModels();
  const [model, setModel] = useState(props.currentModel);

  useEffect(() => {
    const modelToUse = props.currentModel ?? appStore.getState().chatModel;

    if (modelToUse) {
      setModel(modelToUse);
    }
  }, [props.currentModel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || (
          <Button
            variant={"secondary"}
            size={"sm"}
            className="data-[state=open]:bg-input! hover:bg-input! "
            data-testid="model-selector-button"
          >
            <div className="mr-auto flex items-center gap-1">
              {(props.showProvider ?? true) && (
                <ModelProviderIcon
                  provider={model?.provider || ""}
                  className="size-2.5 mr-1"
                />
              )}
              <p data-testid="selected-model-name">{model?.model || "model"}</p>
            </div>
            <ChevronDown className="size-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[240px] bg-background/80 backdrop-blur-md border-border/20"
        align={props.align || "end"}
        data-testid="model-selector-popover"
      >
        <Command
          className="rounded-lg relative shadow-md h-auto bg-transparent"
          value={JSON.stringify(model)}
          onClick={(e) => e.stopPropagation()}
        >
          <CommandList className="p-2">
            {providers?.map((provider, i) => (
              <Fragment key={provider.provider}>
                <CommandGroup
                  heading={<ProviderHeader provider={provider.provider} />}
                  className="pb-4 group"
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                  data-testid={`model-provider-${provider.provider}`}
                >
                  {provider.models.map((item) => (
                    <CommandItem
                      key={item.name}
                      className="cursor-pointer justify-center"
                      onSelect={() => {
                        setModel({
                          provider: provider.provider,
                          model: item.name,
                        });
                        props.onSelect({
                          provider: provider.provider,
                          model: item.name,
                        });
                        setOpen(false);
                      }}
                      value={item.name}
                      data-testid={`model-option-${provider.provider}-${item.name}`}
                    >
                      {model?.provider === provider.provider &&
                      model?.model === item.name ? (
                        <CheckIcon
                          className="size-3 mr-2"
                          data-testid="selected-model-check"
                        />
                      ) : (
                        <div className="size-3 mr-2" />
                      )}
                      <span>{item.name}</span>
                      {item.isToolCallUnsupported && (
                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          No tools
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {i < providers?.length - 1 && <CommandSeparator />}
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const ProviderHeader = memo(function ProviderHeader({
  provider,
}: { provider: string }) {
  const t = useTranslations("Common");

  return (
    <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 group-hover:text-foreground transition-colors duration-300">
      {provider !== "Great for all your tasks" && (
        <>
          {provider === "openai" ? (
            <ModelProviderIcon
              provider="openai"
              className="size-3 text-foreground"
            />
          ) : (
            <ModelProviderIcon provider={provider} className="size-3" />
          )}
        </>
      )}
      {provider === "Great for all your tasks"
        ? t("greatForAllYourTasks")
        : provider}
    </div>
  );
});
