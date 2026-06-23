import { useState } from "react";
import { Upload, CheckCircle, AlertCircle, X } from "lucide-react";

import { API_BASE_URL } from "@/app/lib/api/baseUrl";


interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setUploadState("uploading");

    try {
      const formData = new FormData();
      // Backend expects multipart field name: `file`
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/ingest/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let detail = "Upload failed";
        try {
          const data = await res.json();
          detail = data?.detail ?? detail;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(detail);
      }

      setUploadState("success");
    } catch {
      setUploadState("error");
    }
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const resetAndClose = () => {
    setUploadState("idle");
    setFileName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <h2 className="text-2xl text-foreground">Upload  Report</h2>
          <button
            onClick={resetAndClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {uploadState === "idle" && (
            <>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Upload situation reports, crisis briefs, assessments, or field updates.
                We support PDF, Word, and text documents up to 50MB.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? "border-accent bg-accent bg-opacity-5"
                    : "border-border hover:border-accent hover:bg-accent hover:bg-opacity-5"
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg mb-2 text-foreground">
                  Drag and drop your report here
                </p>
                <p className="text-muted-foreground mb-4">or</p>
                <label className="inline-block px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-opacity-90 transition-all cursor-pointer">
                  Browse files
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-foreground">Document requirements:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>Accepted formats: PDF, DOC, DOCX, TXT</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>Maximum file size: 50MB</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>Documents will be processed and made searchable within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span>All uploads are encrypted and handled in compliance with humanitarian data protection standards</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {uploadState === "uploading" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xl mb-2 text-foreground">Processing your report</p>
              <p className="text-muted-foreground">{fileName}</p>
              <div className="mt-6 max-w-md mx-auto bg-secondary rounded-full h-2 overflow-hidden">
                <div className="bg-accent h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {uploadState === "success" && (
            <div className="py-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-600" />
              <p className="text-2xl mb-2 text-foreground">Upload successful</p>
              <p className="text-muted-foreground mb-8">
                {fileName} has been uploaded and queued for processing
              </p>

              <div className="bg-secondary rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
                <h3 className="text-foreground mb-4">What happens next?</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">1.</span>
                    <span>Document is scanned and extracted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">2.</span>
                    <span>Content is indexed and made searchable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">3.</span>
                    <span>You'll receive an email when processing is complete</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setUploadState("idle");
                    setFileName("");
                  }}
                  className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-secondary transition-all"
                >
                  Upload another
                </button>
                <button
                  onClick={resetAndClose}
                  className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-opacity-90 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {uploadState === "error" && (
            <div className="py-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
              <p className="text-2xl mb-2 text-foreground">Upload failed</p>
              <p className="text-muted-foreground mb-8">
                There was an error uploading {fileName}. Please try again.
              </p>
              <button
                onClick={() => {
                  setUploadState("idle");
                  setFileName("");
                }}
                className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-opacity-90 transition-all"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
