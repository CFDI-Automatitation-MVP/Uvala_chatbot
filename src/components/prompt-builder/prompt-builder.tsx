"use client";
import { useState } from "react";
import { Card } from "ui/card";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Badge } from "ui/badge";
import { Separator } from "ui/separator";
import { ScrollArea } from "ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import {
  Plus,
  X,
  Copy,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

interface PromptVariable {
  id: string;
  name: string;
  type: "text" | "number" | "boolean" | "select";
  defaultValue: string;
  options?: string[];
  description?: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: PromptVariable[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PROMPT_CATEGORIES = [
  "General",
  "Writing",
  "Analysis",
  "Code",
  "Creative",
  "Business",
  "Education",
];

export function PromptBuilder() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form states
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCategory, setTemplateCategory] = useState("General");
  const [promptContent, setPromptContent] = useState("");
  const [variables, setVariables] = useState<PromptVariable[]>([]);

  const addVariable = () => {
    const newVariable: PromptVariable = {
      id: `var_${Date.now()}`,
      name: `variable_${variables.length + 1}`,
      type: "text",
      defaultValue: "",
      description: "",
    };
    setVariables([...variables, newVariable]);
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  const updateVariable = (id: string, updates: Partial<PromptVariable>) => {
    setVariables(variables.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const generatePreview = () => {
    let preview = promptContent;
    variables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`;
      const value = variable.defaultValue || `[${variable.name}]`;
      preview = preview.replace(new RegExp(placeholder, 'g'), value);
    });
    return preview;
  };

  const saveTemplate = () => {
    if (!templateName || !promptContent) return;

    const template: PromptTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      content: promptContent,
      variables,
      category: templateCategory,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTemplates([...templates, template]);
    resetForm();
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTemplateCategory("General");
    setPromptContent("");
    setVariables([]);
    setIsCreating(false);
    setActiveTemplate(null);
  };

  const loadTemplate = (template: PromptTemplate) => {
    setActiveTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTemplateCategory(template.category || "General");
    setPromptContent(template.content);
    setVariables([...template.variables]);
    setIsCreating(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    if (activeTemplate?.id === id) {
      resetForm();
    }
  };

  if (!isCreating && templates.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Prompt Templates</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first prompt template to get started
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Prompt Builder</h2>
          <div className="flex gap-2">
            {!isCreating && (
              <Button size="sm" onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
            {isCreating && (
              <Button size="sm" variant="ghost" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {!isCreating ? (
          // Template List View
          <div className="p-4 space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{template.variables.length} variables</span>
                      <span>•</span>
                      <span>{template.content.length} chars</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatePreview())}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadTemplate(template)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Create/Edit Template View
          <div className="p-4 space-y-4">
            {/* Template Info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="Enter template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description (Optional)</Label>
                <Input
                  id="template-description"
                  placeholder="Brief description of the template"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="template-category">Category</Label>
                <Select value={templateCategory} onValueChange={setTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variables</Label>
                <Button size="sm" variant="outline" onClick={addVariable}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Variable
                </Button>
              </div>

              {variables.map((variable) => (
                <Card key={variable.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Input
                        placeholder="Variable name"
                        value={variable.name}
                        onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVariable(variable.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={variable.type}
                        onValueChange={(value: any) => updateVariable(variable.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Default value"
                        value={variable.defaultValue}
                        onChange={(e) => updateVariable(variable.id, { defaultValue: e.target.value })}
                      />
                    </div>
                    <Input
                      placeholder="Description (optional)"
                      value={variable.description}
                      onChange={(e) => updateVariable(variable.id, { description: e.target.value })}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Prompt Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Prompt Template</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {previewMode ? "Edit" : "Preview"}
                </Button>
              </div>

              {previewMode ? (
                <Card className="p-3">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {generatePreview()}
                  </pre>
                </Card>
              ) : (
                <Textarea
                  placeholder="Enter your prompt template here. Use {{variable_name}} for variables."
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              )}

              {variables.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p>Available variables:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {variables.map((v) => (
                      <Badge key={v.id} variant="outline" className="text-xs">
                        {`{{${v.name}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={saveTemplate}
                disabled={!templateName || !promptContent}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(generatePreview())}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}