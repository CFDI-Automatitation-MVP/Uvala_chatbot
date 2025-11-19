/* biome-ignore lint/suspicious/noExplicitAny: This is a valid use case */
import React from "react";

import { useEditorRef } from "platejs/react";

import { DRAG_ITEM_BLOCK } from "@platejs/dnd";
import { type UseDndNodeOptions, useDndNode } from "./useDndNode";

export type DraggableState = {
  /**
   * True when the element is ready to be dragged (e.g., on mouse down but
   * before drag starts)
   */
  isAboutToDrag: boolean;
  isDragging: boolean;
  /** The ref of the draggable element */
  nodeRef: React.RefObject<HTMLDivElement | null>;
  /** The ref of the multiple preview element */
  previewRef: React.RefObject<HTMLDivElement | null>;
  /** The ref of the draggable handle */
  handleRef: (
    elementOrNode:
      | Element
      | React.ReactElement<any>
      | React.RefObject<any>
      | null,
  ) => void;
};

export const useDraggable = (props: UseDndNodeOptions): DraggableState => {
  const { type = DRAG_ITEM_BLOCK, orientation, onDropHandler } = props;

  const editor = useEditorRef();

  const nodeRef = React.useRef<HTMLDivElement>(null);

  const multiplePreviewRef = React.useRef<HTMLDivElement>(null);

  const dndResult = useDndNode({
    multiplePreviewRef,
    nodeRef,
    type,
    onDropHandler,
    orientation,
    ...props,
  });

  const { dragRef, isAboutToDrag, isDragging } = editor.plugins.dnd
    ? dndResult
    : { dragRef: null, isAboutToDrag: false, isDragging: false };

  return {
    isAboutToDrag,
    isDragging,
    nodeRef,
    previewRef: multiplePreviewRef,
    handleRef: dragRef,
  };
};
