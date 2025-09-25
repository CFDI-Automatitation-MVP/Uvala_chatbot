"use client";

import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  pdfUrl: string;
  title?: string;
  required?: boolean;
  onAcknowledge?: () => void;
  className?: string;
}

export function PDFViewer({
  pdfUrl,
  required,
  onAcknowledge,
  className,
}: PDFViewerProps) {
  const handleViewPDF = () => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");

    if (required && onAcknowledge) {
      onAcknowledge();
    }
  };

  const handleDownloadPDF = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "terminos-y-condiciones-uvala.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (required && onAcknowledge) {
      onAcknowledge();
    }
  };

  return (
    <div className={`w-full ${className || ""}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleViewPDF}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FileText className="w-4 h-4 mr-2" />
          Abrir PDF
        </Button>

        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
      </div>

      {required && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          * Este documento es requerido para continuar
        </p>
      )}
    </div>
  );
}
