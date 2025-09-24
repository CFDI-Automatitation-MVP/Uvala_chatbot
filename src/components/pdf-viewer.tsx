"use client";

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  required?: boolean;
  onAcknowledge?: () => void;
  className?: string;
}

export function PDFViewer({
  pdfUrl,
  title,
  required,
  onAcknowledge,
  className,
}: PDFViewerProps) {
  return (
    <div className={`w-full ${className || ""}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={pdfUrl}
          className="w-full h-96"
          title={title}
          onLoad={() => {
            if (required && onAcknowledge) {
              // Auto-acknowledge when PDF loads if required
              onAcknowledge();
            }
          }}
        />
      </div>
      <div className="mt-2 text-sm text-gray-600">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Abrir PDF en nueva pestaña
        </a>
        {required && (
          <p className="mt-2 text-xs text-gray-500">
            * Este documento es requerido para continuar
          </p>
        )}
      </div>
    </div>
  );
}
