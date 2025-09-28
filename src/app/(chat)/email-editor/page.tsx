"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Eye,
  Save,
  Download,
  Upload,
  Smartphone,
  Monitor,
  Palette,
  Type,
  Layout,
  Send,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  getWelcomeEmailTemplate,
  getSubscriptionEmailTemplate,
  getCancellationEmailTemplate,
} from "@/lib/email/email-templates";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  lastModified: Date;
}

// Generate templates from the new minimalist system
const generateDefaultTemplates = (language: string = "en"): EmailTemplate[] => [
  {
    id: "welcome",
    name: "Welcome Email",
    ...getWelcomeEmailTemplate(language),
    lastModified: new Date(),
  },
  {
    id: "subscription",
    name: "Subscription Confirmed",
    ...getSubscriptionEmailTemplate(language),
    lastModified: new Date(),
  },
  {
    id: "cancellation",
    name: "Subscription Cancelled",
    ...getCancellationEmailTemplate(language),
    lastModified: new Date(),
  },
];

const defaultTemplates: EmailTemplate[] = generateDefaultTemplates();

export default function EmailEditorPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate>(
    defaultTemplates[0],
  );
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [activeTab, setActiveTab] = useState("editor");
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  // Load templates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("uvala-email-templates");
    if (saved) {
      try {
        const parsedTemplates = JSON.parse(saved);
        setTemplates(parsedTemplates);
        setActiveTemplate(parsedTemplates[0] || defaultTemplates[0]);
      } catch (error) {
        console.error("Failed to load saved templates:", error);
      }
    }
  }, []);

  const saveTemplate = () => {
    const updatedTemplates = templates.map((t) =>
      t.id === activeTemplate.id
        ? { ...activeTemplate, lastModified: new Date() }
        : t,
    );
    setTemplates(updatedTemplates);
    localStorage.setItem(
      "uvala-email-templates",
      JSON.stringify(updatedTemplates),
    );
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          to: testEmail,
          subject: activeTemplate.subject,
          htmlContent: activeTemplate.htmlContent,
          textContent: activeTemplate.textContent,
        }),
      });

      if (response.ok) {
        alert("Test email sent successfully!");
      } else {
        alert("Failed to send test email");
      }
    } catch (_error) {
      alert("Error sending test email");
    } finally {
      setIsSending(false);
    }
  };

  const exportTemplate = () => {
    const dataStr = JSON.stringify(activeTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTemplate.name.toLowerCase().replace(/\s+/g, "-")}-template.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("Copied to clipboard!");
  };

  const changeLanguage = (language: string) => {
    setSelectedLanguage(language);
    const newTemplates = generateDefaultTemplates(language);
    setTemplates(newTemplates);
    setActiveTemplate(newTemplates[0]);
  };

  const previewWithData = (content: string) => {
    return content
      .replace(/\{\{userName\}\}/g, "John Doe")
      .replace(/\{\{planType\}\}/g, "Premium Plan")
      .replace(/\{\{appUrl\}\}/g, window.location.origin);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Email Template Editor
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Design and preview your Brevo email templates
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Language:
              </span>
              <select
                value={selectedLanguage}
                onChange={(e) => changeLanguage(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="ja">🇯🇵 日本語</option>
              </select>
            </div>
          </div>

          {/* Template Selector */}
          <div className="flex gap-2 mb-4">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant={
                  activeTemplate.id === template.id ? "default" : "outline"
                }
                onClick={() => setActiveTemplate(template)}
                className="h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-gray-500">
                    Modified: {template.lastModified.toLocaleDateString()}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Template Editor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Template Name
                      </label>
                      <Input
                        value={activeTemplate.name}
                        onChange={(e) =>
                          setActiveTemplate({
                            ...activeTemplate,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Subject Line
                      </label>
                      <Input
                        value={activeTemplate.subject}
                        onChange={(e) =>
                          setActiveTemplate({
                            ...activeTemplate,
                            subject: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        Available Variables
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["{{userName}}", "{{planType}}", "{{appUrl}}"].map(
                          (variable) => (
                            <Badge
                              key={variable}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => copyToClipboard(variable)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              {variable}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="html">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        HTML Content
                      </label>
                      <Textarea
                        value={activeTemplate.htmlContent}
                        onChange={(e) =>
                          setActiveTemplate({
                            ...activeTemplate,
                            htmlContent: e.target.value,
                          })
                        }
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Text Content (Fallback)
                      </label>
                      <Textarea
                        value={activeTemplate.textContent}
                        onChange={(e) =>
                          setActiveTemplate({
                            ...activeTemplate,
                            textContent: e.target.value,
                          })
                        }
                        rows={15}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <Button
                    onClick={saveTemplate}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Test Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your-email@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button
                    onClick={sendTestEmail}
                    disabled={!testEmail || isSending}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        previewMode === "desktop" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setPreviewMode("desktop")}
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewMode === "mobile" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewMode("mobile")}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`border rounded-lg overflow-hidden ${
                    previewMode === "mobile" ? "max-w-sm mx-auto" : ""
                  }`}
                >
                  <iframe
                    srcDoc={previewWithData(activeTemplate.htmlContent)}
                    className="w-full h-96 border-none"
                    title="Email Preview"
                  />
                </div>

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Subject Preview:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {previewWithData(activeTemplate.subject)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
