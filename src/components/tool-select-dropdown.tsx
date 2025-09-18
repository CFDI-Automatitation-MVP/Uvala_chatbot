// MCP functionality disabled - stub component

import React from "react";

interface ToolSelectDropdownProps {
  children?: React.ReactNode;
  mentions?: any[];
  className?: string;
  align?: string;
  side?: string;
  onSelectWorkflow?: (workflow: any) => void;
  onSelectAgent?: (agent: any) => void;
}

export default function ToolSelectDropdown({
  children,
}: ToolSelectDropdownProps) {
  return <div>{children}</div>;
}
