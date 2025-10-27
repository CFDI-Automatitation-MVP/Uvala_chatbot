"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "lib/utils";

interface CodeSandboxProps {
  code: string;
  type: "react" | "html" | "vue";
  className?: string;
  onError?: (error: string) => void;
}

export function CodeSandbox({
  code,
  type,
  className,
  onError,
}: CodeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    console.log("[CODE SANDBOX] Rendering with:", {
      type,
      codeLength: code.length,
      codePreview: code.substring(0, 200),
    });

    setIsLoading(true);
    setError(null);

    const sandboxContent = generateSandboxContent(code, type);
    console.log(
      "[CODE SANDBOX] Generated sandbox HTML length:",
      sandboxContent.length,
    );

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (doc) {
        doc.open();
        doc.write(sandboxContent);
        doc.close();

        // Listen for errors from the iframe
        iframe.contentWindow?.addEventListener("error", (e) => {
          const errorMessage = `Runtime error: ${e.message}`;
          console.error("[CODE SANDBOX] Runtime error:", errorMessage);
          setError(errorMessage);
          onError?.(errorMessage);
        });

        // Listen for console errors
        iframe.contentWindow?.addEventListener("unhandledrejection", (e) => {
          const errorMessage = `Unhandled promise rejection: ${e.reason}`;
          console.error("[CODE SANDBOX] Promise rejection:", errorMessage);
          setError(errorMessage);
          onError?.(errorMessage);
        });

        // Wait for all scripts to load before hiding loading state
        // This is especially important for Recharts
        const checkInterval = setInterval(() => {
          if (iframe.contentWindow) {
            const win = iframe.contentWindow as any;
            // For React components, wait for both React and Recharts (if used)
            if (type === "react") {
              const reactLoaded = !!win.React && !!win.ReactDOM;
              const rechartsLoaded = !!win.Recharts; // Recharts should always be loaded

              console.log("[CODE SANDBOX] Loading check:", {
                reactLoaded,
                rechartsLoaded,
                hasRecharts: !!win.Recharts,
              });

              if (reactLoaded && rechartsLoaded) {
                clearInterval(checkInterval);
                setIsLoading(false);
                console.log(
                  "[CODE SANDBOX] ✅ All libraries loaded successfully",
                );
              }
            } else {
              // For HTML, just wait a moment for DOM to be ready
              clearInterval(checkInterval);
              setIsLoading(false);
            }
          }
        }, 100);

        // Timeout after 5 seconds to prevent infinite loading
        setTimeout(() => {
          clearInterval(checkInterval);
          setIsLoading(false);
          console.log(
            "[CODE SANDBOX] Loading timeout reached, showing preview anyway",
          );
        }, 5000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to render code";
      console.error("[CODE SANDBOX] Render error:", errorMessage, err);
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  }, [code, type, onError]);

  return (
    <div
      className={cn(
        "relative w-full h-full bg-white dark:bg-[#121212]",
        className,
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-[#121212]/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading preview...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#121212] p-6">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-6 max-w-md">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">
              Preview Error
            </h3>
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 bg-transparent"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        title="Code Preview"
      />
    </div>
  );
}

function generateSandboxContent(code: string, type: "react" | "html" | "vue") {
  if (type === "html") {
    // Extract <style> tags from code and move them to <head>
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const styles: string[] = [];
    const processedCode = code.replace(styleRegex, (match) => {
      styles.push(match);
      return ""; // Remove from body
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
    * {
      box-sizing: border-box;
    }
    /* Hide any style tags that appear in the body */
    body > style {
      display: none;
    }
  </style>
  ${styles.join("\n")}
</head>
<body>
  ${processedCode}
</body>
</html>`;
  }

  if (type === "react") {
    // Clean the code: remove imports and requires
    const cleanCode = cleanReactCode(code.trim());

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Load all scripts with proper async handling -->
  <script>
    // Create a promise-based loading system
    window.scriptsLoaded = {
      react: false,
      reactDOM: false,
      reactIs: false,
      babel: false,
      tailwind: false,
      lucide: false,
      recharts: false
    };

    window.checkAllScriptsLoaded = function() {
      const allLoaded = Object.values(window.scriptsLoaded).every(v => v === true);
      if (allLoaded) {
        console.log('✅ [SANDBOX] All scripts loaded successfully!');
        window.dispatchEvent(new Event('scriptsReady'));
      }
      return allLoaded;
    };
  </script>

  <!-- React (MUST be first) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js" onload="window.scriptsLoaded.react = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load React')"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" onload="window.scriptsLoaded.reactDOM = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load ReactDOM')"></script>

  <!-- react-is (REQUIRED by Recharts UMD) -->
  <script crossorigin src="https://unpkg.com/react-is@18/umd/react-is.production.min.js" onload="window.scriptsLoaded.reactIs = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load react-is')"></script>

  <!-- Babel -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js" onload="window.scriptsLoaded.babel = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load Babel')"></script>

  <!-- Tailwind CSS with custom config -->
  <script src="https://cdn.tailwindcss.com" onload="window.scriptsLoaded.tailwind = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load Tailwind')"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            border: "hsl(214.3 31.8% 91.4%)",
            input: "hsl(214.3 31.8% 91.4%)",
            ring: "hsl(222.2 84% 4.9%)",
            background: "hsl(0 0% 100%)",
            foreground: "hsl(222.2 84% 4.9%)",
            primary: {
              DEFAULT: "hsl(222.2 47.4% 11.2%)",
              foreground: "hsl(210 40% 98%)",
            },
            secondary: {
              DEFAULT: "hsl(210 40% 96.1%)",
              foreground: "hsl(222.2 47.4% 11.2%)",
            },
            destructive: {
              DEFAULT: "hsl(0 84.2% 60.2%)",
              foreground: "hsl(210 40% 98%)",
            },
            muted: {
              DEFAULT: "hsl(210 40% 96.1%)",
              foreground: "hsl(215.4 16.3% 46.9%)",
            },
            accent: {
              DEFAULT: "hsl(210 40% 96.1%)",
              foreground: "hsl(222.2 47.4% 11.2%)",
            },
            card: {
              DEFAULT: "hsl(0 0% 100%)",
              foreground: "hsl(222.2 84% 4.9%)",
            },
          },
          borderRadius: {
            lg: "0.5rem",
            md: "calc(0.5rem - 2px)",
            sm: "calc(0.5rem - 4px)",
          },
        },
      },
    }
  </script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest" onload="window.scriptsLoaded.lucide = true; window.checkAllScriptsLoaded();" onerror="console.error('Failed to load Lucide')"></script>

  <!-- Recharts UMD (MUST load after React, ReactDOM, and react-is) -->
  <script crossorigin src="https://unpkg.com/recharts@2.5.0/umd/Recharts.min.js" onload="window.scriptsLoaded.recharts = true; window.checkAllScriptsLoaded(); console.log('✅ Recharts loaded successfully');" onerror="console.error('❌ CRITICAL: Recharts failed to load!')"></script>

  <style>
    /* CSS Reset & Base Styles */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background: white;
      color: hsl(222.2 84% 4.9%);
      line-height: 1.5;
    }

    /* Dark mode styles */
    @media (prefers-color-scheme: dark) {
      body {
        background: hsl(222.2 84% 4.9%);
        color: hsl(210 40% 98%);
      }
    }

    #root {
      width: 100%;
      min-height: 100vh;
      padding: 2rem;
    }

    /* Button base styles */
    button {
      font-family: inherit;
      cursor: pointer;
      border: none;
      outline: none;
    }

    /* Input base styles */
    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }

    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: hsl(210 40% 96.1%);
    }

    ::-webkit-scrollbar-thumb {
      background: hsl(215.4 16.3% 46.9%);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: hsl(215.4 16.3% 36.9%);
    }

    /* Shadow utilities */
    .shadow-card {
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    }

    .shadow-card-lg {
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    // Wait for all scripts to load before executing
    function initializeSandbox() {
      console.log('[SANDBOX] 🚀 Starting initialization...');
      console.log('[SANDBOX] React available:', !!window.React);
      console.log('[SANDBOX] ReactDOM available:', !!window.ReactDOM);
      console.log('[SANDBOX] Recharts available:', !!window.Recharts);

      if (!window.React || !window.ReactDOM || !window.Recharts) {
        console.error('❌ [SANDBOX] Critical libraries not loaded yet, retrying...');
        return false;
      }

      const { useState, useEffect, useCallback, useMemo, useRef } = React;

      // Make lucide icons available
      const lucide = window.lucide;

      // Make recharts available - with error handling and detailed logging
      if (!window.Recharts) {
        console.error('❌ [SANDBOX] Recharts library failed to load!');
        document.getElementById('root').innerHTML = '<div style="padding: 40px; text-align: center;"><h2 style="color: red;">Error: Recharts library failed to load</h2><p>Please check the browser console for details.</p></div>';
        return false;
      } else {
        console.log('✅ [SANDBOX] Recharts loaded successfully');
        console.log('[SANDBOX] Available Recharts components:', Object.keys(window.Recharts).slice(0, 20));
      }

      const {
        BarChart, LineChart, AreaChart, PieChart,
        Bar, Line, Area, Pie, XAxis, YAxis, CartesianGrid,
        Tooltip, Legend, ResponsiveContainer, Cell
      } = window.Recharts || {};

      // Verify critical components
      console.log('[SANDBOX] ResponsiveContainer available:', !!ResponsiveContainer);
      console.log('[SANDBOX] LineChart available:', !!LineChart);
      console.log('[SANDBOX] BarChart available:', !!BarChart);

      if (!ResponsiveContainer || !LineChart || !BarChart) {
        console.error('❌ [SANDBOX] Recharts components not properly exposed!');
        return false;
      }

    // ========== MOCK DATA GENERATION FUNCTIONS ==========

    // Generate time series data (price history, stock data, etc.)
    const generateMockHistory = function(count = 30) {
      return Array.from({ length: count }, (_, i) => ({
        date: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: 100 + Math.random() * 50,
        value: 100 + Math.random() * 50,
        volume: Math.floor(Math.random() * 1000000),
      }));
    };

    // Generate line chart data
    const generateLineChartData = function(count = 12) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Array.from({ length: count }, (_, i) => ({
        name: months[i % 12],
        value: Math.floor(Math.random() * 5000) + 1000,
        revenue: Math.floor(Math.random() * 8000) + 2000,
        profit: Math.floor(Math.random() * 3000) + 500,
      }));
    };

    // Generate bar chart data
    const generateBarChartData = function(count = 7) {
      const categories = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Product F', 'Product G'];
      return Array.from({ length: count }, (_, i) => ({
        name: categories[i] || \`Product \${String.fromCharCode(65 + i)}\`,
        sales: Math.floor(Math.random() * 8000) + 2000,
        target: Math.floor(Math.random() * 10000) + 3000,
        growth: Math.floor(Math.random() * 50) + 10,
      }));
    };

    // Generate pie chart data
    const generatePieChartData = function(count = 5) {
      const labels = ['Desktop', 'Mobile', 'Tablet', 'Smart TV', 'Other'];
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
      return Array.from({ length: count }, (_, i) => ({
        name: labels[i] || \`Category \${i + 1}\`,
        value: Math.floor(Math.random() * 500) + 100,
        color: colors[i % colors.length],
      }));
    };

    // Generate area chart data (multi-series)
    const generateAreaChartData = function(count = 12) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return Array.from({ length: count }, (_, i) => ({
        month: months[i % 12],
        desktop: Math.floor(Math.random() * 4000) + 1000,
        mobile: Math.floor(Math.random() * 3000) + 800,
        tablet: Math.floor(Math.random() * 2000) + 500,
      }));
    };

    // Generate stock/financial data
    const generateStockData = function(count = 5) {
      const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
      return Array.from({ length: count }, (_, i) => ({
        symbol: stocks[i % stocks.length],
        name: ['Apple Inc.', 'Alphabet Inc.', 'Microsoft Corp.', 'Amazon.com Inc.', 'Tesla Inc.', 'Meta Platforms', 'NVIDIA Corp.', 'Netflix Inc.'][i % 8],
        price: (Math.random() * 500 + 50).toFixed(2),
        change: ((Math.random() - 0.5) * 20).toFixed(2),
        changePercent: ((Math.random() - 0.5) * 5).toFixed(2),
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        marketCap: \`\${(Math.random() * 2000 + 100).toFixed(0)}B\`,
      }));
    };

    // Generate table data (generic)
    const generateTableData = function(rows = 10) {
      return Array.from({ length: rows }, (_, i) => ({
        id: i + 1,
        name: \`Item \${i + 1}\`,
        status: ['Active', 'Pending', 'Completed', 'Cancelled'][Math.floor(Math.random() * 4)],
        amount: \`$\${(Math.random() * 10000).toFixed(2)}\`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        progress: Math.floor(Math.random() * 100),
      }));
    };

    // Generate metrics/KPI data
    const generateMetrics = function() {
      return {
        totalRevenue: \`$\${(Math.random() * 100000 + 50000).toFixed(0)}\`,
        totalUsers: Math.floor(Math.random() * 50000 + 10000),
        activeUsers: Math.floor(Math.random() * 30000 + 5000),
        conversionRate: \`\${(Math.random() * 5 + 1).toFixed(2)}%\`,
        growthRate: \`\${(Math.random() * 30 + 10).toFixed(1)}%\`,
        avgOrderValue: \`$\${(Math.random() * 200 + 50).toFixed(2)}\`,
        churnRate: \`\${(Math.random() * 5).toFixed(2)}%\`,
      };
    };

    // Master function for easy access
    const generateMockData = function(type, count) {
      switch(type) {
        case 'history': return generateMockHistory(count);
        case 'line': return generateLineChartData(count);
        case 'bar': return generateBarChartData(count);
        case 'pie': return generatePieChartData(count);
        case 'area': return generateAreaChartData(count);
        case 'stocks': return generateStockData(count);
        case 'table': return generateTableData(count);
        case 'metrics': return generateMetrics();
        default: return [];
      }
    };

    // Make all functions available globally
    window.generateMockHistory = generateMockHistory;
    window.generateLineChartData = generateLineChartData;
    window.generateBarChartData = generateBarChartData;
    window.generatePieChartData = generatePieChartData;
    window.generateAreaChartData = generateAreaChartData;
    window.generateStockData = generateStockData;
    window.generateTableData = generateTableData;
    window.generateMetrics = generateMetrics;
    window.generateMockData = generateMockData;

    ${cleanCode}

    // Try to find and render the component
    const rootElement = document.getElementById('root');

    // Check if there's a default export or a named component
    let ComponentToRender;

    try {
      // Try to find the main component
      ${extractComponentName(cleanCode)}

      if (typeof ComponentToRender === 'undefined') {
        throw new Error('No component found to render');
      }

      ReactDOM.render(<ComponentToRender />, rootElement);
      console.log('[SANDBOX] ✅ Component rendered successfully!');
      return true;
    } catch (error) {
      console.error('[SANDBOX] Error rendering component:', error);
      rootElement.innerHTML = '<div style="padding: 20px; color: red; font-family: monospace; background: #fee; border: 2px solid #c00; border-radius: 8px;">Error: ' + error.message + '</div>';
      return false;
    }
  }

    // Try to initialize immediately (in case scripts already loaded)
    if (!initializeSandbox()) {
      // If not ready, wait for scripts to load
      console.log('[SANDBOX] Waiting for all scripts to load...');

      // Try every 200ms
      let attempts = 0;
      const maxAttempts = 25; // 5 seconds max

      const initInterval = setInterval(() => {
        attempts++;
        console.log(\`[SANDBOX] Initialization attempt \${attempts}/\${maxAttempts}\`);

        if (initializeSandbox()) {
          clearInterval(initInterval);
          console.log('[SANDBOX] ✅ Successfully initialized!');
        } else if (attempts >= maxAttempts) {
          clearInterval(initInterval);
          console.error('[SANDBOX] ❌ Failed to initialize after maximum attempts');
          document.getElementById('root').innerHTML = '<div style="padding: 40px; text-align: center; color: red;"><h2>Failed to Load</h2><p>Chart libraries failed to load. Please refresh the page.</p></div>';
        }
      }, 200);
    }
  </script>
</body>
</html>`;
  }

  // Vue support (basic)
  if (type === "vue") {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const { createApp } = Vue;
    ${code}
  </script>
</body>
</html>`;
  }

  return "";
}

function cleanReactCode(code: string): string {
  let cleaned = code;

  // First, detect the default export component name BEFORE removing exports
  const defaultExportMatch =
    code.match(/export\s+default\s+function\s+(\w+)/)?.[1] ||
    code.match(/export\s+default\s+(\w+)/)?.[1];

  // Remove import statements (both single and multi-line)
  cleaned = cleaned.replace(
    /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*)?)+\s+from\s+['"][^'"]+['"]\s*;?/g,
    "",
  );
  cleaned = cleaned.replace(/import\s+['"][^'"]+['"]\s*;?/g, "");

  // Remove require statements
  cleaned = cleaned.replace(
    /const\s+\{[^}]*\}\s*=\s*require\([^)]+\)\s*;?/g,
    "",
  );
  cleaned = cleaned.replace(/const\s+\w+\s*=\s*require\([^)]+\)\s*;?/g, "");
  cleaned = cleaned.replace(/require\([^)]+\)/g, "{}");

  // Remove export statements but keep the declaration
  cleaned = cleaned.replace(/export\s+default\s+/g, "");
  cleaned = cleaned.replace(/export\s+/g, "");

  // If we found a default export, add a marker comment for extractComponentName to find
  if (defaultExportMatch) {
    cleaned = `// [DEFAULT_EXPORT: ${defaultExportMatch}]\n${cleaned}`;
  }

  return cleaned.trim();
}

function extractComponentName(code: string): string {
  // Look for the marker comment that cleanReactCode adds for the default export
  const defaultExportMatch = code.match(/\/\/ \[DEFAULT_EXPORT: (\w+)\]/);
  if (defaultExportMatch) {
    const componentName = defaultExportMatch[1];
    console.log("[SANDBOX] Found default export component:", componentName);
    return `ComponentToRender = ${componentName};`;
  }

  // Fallback: Try to find the LAST function/component definition
  // (usually the main component is at the end)
  const allFunctionMatches = code.matchAll(
    /(?:^|\n)(?:export\s+default\s+)?function\s+(\w+)\s*\(/gm,
  );
  const allConstMatches = code.matchAll(
    /(?:^|\n)const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/gm,
  );

  const functionNames = Array.from(allFunctionMatches, (m) => m[1]);
  const constNames = Array.from(allConstMatches, (m) => m[1]);

  // Prefer the last function component
  const lastFunction = functionNames[functionNames.length - 1];
  const lastConst = constNames[constNames.length - 1];

  if (lastFunction) {
    console.log("[SANDBOX] Using last function component:", lastFunction);
    return `ComponentToRender = ${lastFunction};`;
  }

  if (lastConst) {
    console.log("[SANDBOX] Using last const component:", lastConst);
    return `ComponentToRender = ${lastConst};`;
  }

  // Original fallback logic for backwards compatibility
  const functionMatch =
    code.match(/function\s+(\w+)\s*\(/)?.[1] ||
    code.match(/const\s+(\w+)\s*=\s*\(/)?.[1];

  if (functionMatch) {
    console.log("[SANDBOX] Using first match component:", functionMatch);
    return `ComponentToRender = ${functionMatch};`;
  }

  // Default: try to render the entire code as a component
  console.log("[SANDBOX] No component found, wrapping entire code");
  return `ComponentToRender = () => { ${code}; return null; };`;
}
