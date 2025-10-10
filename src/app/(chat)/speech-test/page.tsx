"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { Separator } from "ui/separator";
import {
  SpeechRecognitionButton,
  SpeechRecognitionStatus,
  SpeechCompatibilityIndicator,
} from "@/components/speech/speech-recognition-button";
import {
  useUniversalSpeech,
  useSpeechSupport,
} from "@/hooks/use-universal-speech";
import { SpeechServiceProvider } from "@/lib/speech/speech-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Switch } from "ui/switch";
import { Label } from "ui/label";
import { Copy, Download, RefreshCw } from "lucide-react";

const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru-RU", name: "Russian (Russia)" },
  { code: "ja-JP", name: "Japanese (Japan)" },
  { code: "ko-KR", name: "Korean (South Korea)" },
  { code: "zh-CN", name: "Chinese (Mandarin)" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
  { code: "hi-IN", name: "Hindi (India)" },
  { code: "th-TH", name: "Thai (Thailand)" },
  { code: "vi-VN", name: "Vietnamese (Vietnam)" },
];

export default function SpeechTestPage() {
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [continuous, setContinuous] = useState(false);
  const [interimResults, setInterimResults] = useState(true);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const {
    isListening,
    hasSupport,
    transcript,
    interimTranscript,
    error,
    provider,
    browserInfo,
    debugInfo,
    resetTranscript,
  } = useUniversalSpeech({
    language: selectedLanguage,
    continuous,
    interimResults,
    debug: true,
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setTranscripts((prev) => [...prev, text.trim()]);
      }
    },
    onError: (error) => {
      setLastError(error);
    },
  });

  const supportInfo = useSpeechSupport();

  const handleCopyTranscripts = () => {
    const allText = transcripts.join(" ");
    navigator.clipboard.writeText(allText);
  };

  const handleDownloadTranscripts = () => {
    const allText = transcripts.join("\n");
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "speech-transcripts.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setTranscripts([]);
    setLastError(null);
    resetTranscript();
  };

  const getProviderColor = (provider: SpeechServiceProvider) => {
    switch (provider) {
      case SpeechServiceProvider.WEB_SPEECH_API:
        return "bg-green-100 text-green-800";
      case SpeechServiceProvider.ANNYANG:
        return "bg-yellow-100 text-yellow-800";
      case SpeechServiceProvider.SPEECHLY:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Speech Recognition Test</h1>
        <p className="text-muted-foreground">
          Test speech recognition functionality across different browsers and
          devices
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Browser Compatibility */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Compatibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SpeechCompatibilityIndicator />

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Current Provider</h4>
              <Badge className={getProviderColor(provider)}>
                {provider === SpeechServiceProvider.WEB_SPEECH_API &&
                  "Web Speech API"}
                {provider === SpeechServiceProvider.ANNYANG &&
                  "Annyang Fallback"}
                {provider === SpeechServiceProvider.SPEECHLY && "Speechly"}
                {provider === SpeechServiceProvider.NONE && "No Provider"}
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Supported Providers</h4>
              <div className="flex flex-wrap gap-2">
                {supportInfo.supportedProviders.map((provider) => (
                  <Badge key={provider} variant="outline" className="text-xs">
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Browser Details</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Web Speech API: {browserInfo.hasWebSpeechAPI ? "✓" : "✗"}</p>
                <p>Annyang: {browserInfo.hasAnnyang ? "✓" : "✗"}</p>
                <p className="truncate">UA: {browserInfo.userAgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="continuous"
                checked={continuous}
                onCheckedChange={setContinuous}
              />
              <Label htmlFor="continuous">Continuous Recognition</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="interim"
                checked={interimResults}
                onCheckedChange={setInterimResults}
              />
              <Label htmlFor="interim">Interim Results</Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Speech Recognition Controls</Label>
              <div className="flex items-center gap-2">
                <SpeechRecognitionButton
                  language={selectedLanguage}
                  continuous={continuous}
                  interimResults={interimResults}
                  size="default"
                  showProvider={true}
                  onError={setLastError}
                />
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Status */}
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SpeechRecognitionStatus
              transcript={transcript || interimTranscript}
              isListening={isListening}
              error={error || lastError}
            />

            {!hasSupport && (
              <div className="mt-4 p-4 border border-red-200 rounded-md bg-red-50">
                <h4 className="font-medium text-red-800">
                  Speech Recognition Not Supported
                </h4>
                <p className="text-sm text-red-600 mt-1">
                  Your browser does not support speech recognition. Try using:
                </p>
                <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                  <li>Chrome 25+ (recommended)</li>
                  <li>Edge 79+</li>
                  <li>Safari 14.1+</li>
                  <li>Opera 27+</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcripts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transcripts ({transcripts.length})</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTranscripts}
                  disabled={transcripts.length === 0}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTranscripts}
                  disabled={transcripts.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcripts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transcripts yet. Start speaking to see results here.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md text-sm">
                    <span className="text-xs text-muted-foreground mr-2">
                      #{index + 1}:
                    </span>
                    {transcript}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === "development" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
