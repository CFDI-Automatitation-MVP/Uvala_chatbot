"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  Copy, 
  Check, 
  Code2, 
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Download,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  Share,
  Palette,
  FileCode,
  Send,
  Paperclip
} from "lucide-react";
import { JsonViewPopup } from "../json-view-popup";
import { useCopy } from "@/hooks/use-copy";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChat } from "@ai-sdk/react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { generateUUID } from "lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export interface WebSandboxProps {
  html?: string;
  css?: string;
  javascript?: string;
  title?: string;
  success?: boolean;
  error?: string;
}

export function WebSandbox(props: WebSandboxProps) {
  const { html = "", css = "", javascript = "", title = "Web Application", success = true, error } = props;
  const { copy, copied } = useCopy();
  const { setOpen } = useSidebar();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showCode, setShowCode] = React.useState(false);
  const [viewportSize, setViewportSize] = React.useState('desktop');
  const [activeTab, setActiveTab] = React.useState('controls');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Get chat model from store
  const { selectedChatModel } = appStore(
    useShallow((state) => ({
      selectedChatModel: state.selectedChatModel,
    }))
  );
  
  // Initialize chat for web development iterations
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useChat({
    api: '/api/chat',
    id: `web-sandbox-${generateUUID()}`,
    initialMessages: [
      {
        id: generateUUID(),
        role: 'assistant',
        content: `I've created your web application "${title}". You can ask me to make changes, add features, modify styling, or fix any issues. What would you like to adjust?`,
      },
    ],
    body: {
      model: selectedChatModel,
    },
  });

  // Generate the complete HTML document
  const sandboxContent = React.useMemo(() => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- Google Fonts for better typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        /* Modern CSS Reset and Base Styles */
        *, *::before, *::after {
            box-sizing: border-box;
        }
        
        html {
            line-height: 1.15;
            -webkit-text-size-adjust: 100%;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #333;
            background: #fff;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Modern CSS Variables for consistency */
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --accent-color: #f59e0b;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --border-color: #e2e8f0;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-accent: #f1f5f9;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --border-radius: 0.5rem;
            --border-radius-lg: 1rem;
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
        }
        
        /* Enhanced default styles */
        h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.25;
            margin-bottom: var(--spacing-md);
            color: var(--text-primary);
        }
        
        p {
            margin-bottom: var(--spacing-md);
            color: var(--text-secondary);
        }
        
        button {
            cursor: pointer;
            border: none;
            border-radius: var(--border-radius);
            padding: var(--spacing-sm) var(--spacing-md);
            font-family: inherit;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        input, textarea {
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            padding: var(--spacing-sm) var(--spacing-md);
            font-family: inherit;
            font-size: inherit;
            transition: border-color 0.2s ease;
        }
        
        input:focus, textarea:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        /* Utility classes for quick styling */
        .container { max-width: 1200px; margin: 0 auto; padding: 0 var(--spacing-md); }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-row { flex-direction: row; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-sm { gap: var(--spacing-sm); }
        .gap-md { gap: var(--spacing-md); }
        .gap-lg { gap: var(--spacing-lg); }
        .btn-primary { background: var(--primary-color); color: white; }
        .btn-secondary { background: var(--secondary-color); color: white; }
        .card { background: var(--bg-primary); border-radius: var(--border-radius-lg); box-shadow: var(--shadow-md); padding: var(--spacing-lg); }
        
        /* Custom styles from user */
        ${css}
    </style>
</head>
<body>
    ${html}
    <script>
        // Console override for better error handling
        const originalConsole = window.console;
        window.console = {
            ...originalConsole,
            error: (...args) => {
                originalConsole.error(...args);
                window.parent.postMessage({
                    type: 'console-error',
                    data: args.map(arg => String(arg)).join(' ')
                }, '*');
            },
            log: (...args) => {
                originalConsole.log(...args);
                window.parent.postMessage({
                    type: 'console-log', 
                    data: args.map(arg => String(arg)).join(' ')
                }, '*');
            },
            warn: (...args) => {
                originalConsole.warn(...args);
                window.parent.postMessage({
                    type: 'console-warn',
                    data: args.map(arg => String(arg)).join(' ')
                }, '*');
            }
        };

        // Error handling
        window.addEventListener('error', (e) => {
            window.parent.postMessage({
                type: 'runtime-error',
                data: e.message + ' at line ' + e.lineno
            }, '*');
        });

        // Utility functions for common tasks
        window.utils = {
            // DOM utilities
            $: (selector) => document.querySelector(selector),
            $$: (selector) => document.querySelectorAll(selector),
            createElement: (tag, props = {}, children = []) => {
                const el = document.createElement(tag);
                Object.assign(el, props);
                children.forEach(child => {
                    if (typeof child === 'string') {
                        el.appendChild(document.createTextNode(child));
                    } else {
                        el.appendChild(child);
                    }
                });
                return el;
            },
            
            // Animation utilities
            fadeIn: (el, duration = 300) => {
                el.style.opacity = '0';
                el.style.transition = \`opacity \${duration}ms ease\`;
                setTimeout(() => el.style.opacity = '1', 10);
            },
            
            fadeOut: (el, duration = 300) => {
                el.style.transition = \`opacity \${duration}ms ease\`;
                el.style.opacity = '0';
                setTimeout(() => el.style.display = 'none', duration);
            },
            
            // Event utilities
            on: (el, event, handler) => el.addEventListener(event, handler),
            off: (el, event, handler) => el.removeEventListener(event, handler),
            
            // Storage utilities
            store: {
                get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
                set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
                remove: (key) => localStorage.removeItem(key)
            }
        };

        try {
            ${javascript}
        } catch (error) {
            console.error('JavaScript execution error:', error.message);
        }
    </script>
</body>
</html>`;
  }, [html, css, javascript, title]);

  const runCode = React.useCallback(() => {
    if (!iframeRef.current) return;
    
    setIsRunning(true);
    
    // Create blob URL for the sandbox content
    const blob = new Blob([sandboxContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Set iframe source
    iframeRef.current.src = url;
    
    // Clean up blob URL after iframe loads
    setTimeout(() => {
      URL.revokeObjectURL(url);
      setIsRunning(false);
    }, 1000);
  }, [sandboxContent]);

  const handleCopyCode = React.useCallback(async () => {
    const fullCode = `HTML:\n${html}\n\nCSS:\n${css}\n\nJavaScript:\n${javascript}`;
    try {
      await copy(fullCode);
      toast.success('Code copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy code');
    }
  }, [html, css, javascript, copy]);

  // Listen for messages from iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console-error') {
        console.error('Sandbox Error:', event.data.data);
      } else if (event.data?.type === 'console-log') {
        console.log('Sandbox Log:', event.data.data);
      } else if (event.data?.type === 'runtime-error') {
        console.error('Sandbox Runtime Error:', event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-run and setup fullscreen mode
  React.useEffect(() => {
    runCode();
  }, [runCode]);
  
  // Exit dashboard and return to chat
  const exitDashboard = () => {
    // This will be handled by the parent component or router
    window.dispatchEvent(new CustomEvent('exitWebDashboard'));
  };
  
  // Handle file upload for images
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        append({
          role: 'user',
          content: `I've uploaded an image. Please help me incorporate it into the web page design.`,
        });
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select a valid image file');
    }
  };
  
  // Get viewport dimensions based on selected size
  const getViewportDimensions = () => {
    switch (viewportSize) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  if (!success) {
    return (
      <Card className="flex flex-col bg-destructive/10 border-destructive relative">
        <div className="absolute right-2 top-2 z-10">
          <JsonViewPopup data={props} />
        </div>
        <CardHeader className="items-center pb-0 flex flex-col gap-2">
          <CardTitle className="flex items-center text-destructive">
            Web Sandbox Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-6">
          <div className="text-sm text-destructive">
            <strong>Error:</strong> {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!success) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <X className="w-5 h-5" />
              Web Application Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={exitDashboard} className="w-full">
              Return to Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const viewportDimensions = getViewportDimensions();

  // Standalone Web Development Dashboard - Chat left, Sandbox full-width right
  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Top Header with simple controls */}
      <div className="h-12 bg-card border-b flex items-center px-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="font-semibold">{title}</span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          {/* Device Size Controls */}
          <Button
            variant={viewportSize === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewportSize('desktop')}
            className="gap-2"
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </Button>
          <Button
            variant={viewportSize === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewportSize('tablet')}
            className="gap-2"
          >
            <Tablet className="w-4 h-4" />
            Tablet
          </Button>
          <Button
            variant={viewportSize === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewportSize('mobile')}
            className="gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </Button>
          
          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={runCode}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Refresh
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDashboard}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Exit
          </Button>
        </div>
      </div>

      {/* Two-column layout: Chat Left, Full-width Sandbox Right */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left Panel - Chat Only */}
        <div className="w-80 flex-shrink-0 border-r bg-card flex flex-col">
          <div className="p-3 border-b">
            <h3 className="font-medium text-sm">Web Development Chat</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Make changes to your web application
            </p>
          </div>
          
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground p-3 rounded-lg text-sm flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Generating changes...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Chat Input */}
          <div className="p-3 border-t flex-shrink-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Ask for changes: 'Make the header blue', 'Add a contact form', etc..."
                className="w-full min-h-[80px] resize-none text-sm"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    Upload
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !input?.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </form>
            
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => append({
                  role: 'user',
                  content: 'Change the color scheme to a darker theme'
                })}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                Dark theme
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => append({
                  role: 'user',
                  content: 'Add a contact form section'
                })}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                Add form
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => append({
                  role: 'user',
                  content: 'Make it mobile responsive'
                })}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                Responsive
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Full-width Sandbox */}
        <div className="flex-1 bg-white">
          <div 
            className="w-full h-full transition-all duration-300"
            style={{
              maxWidth: viewportSize === 'desktop' ? '100%' : viewportDimensions.width,
              maxHeight: '100%',
              margin: viewportSize === 'desktop' ? '0' : '20px auto'
            }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              loading="lazy"
              style={{
                width: viewportSize === 'desktop' ? '100%' : viewportDimensions.width,
                height: viewportSize === 'desktop' ? '100%' : viewportDimensions.height
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}