"use client";

import { useEffect, useState } from "react";
import { Upload, CheckCircle, AlertCircle, X, FolderOpen, Plus } from "lucide-react";
import { useDispatch } from "react-redux";

import {
  invalidateKnowledgeBases,
  uploadDocument,
  useListKnowledgeBasesQuery,
} from "@/app/services/api/knowledgeBaseApi";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Preselected target. When null the user picks one in the modal. */
  knowledgeBaseId?: number | null;
  /** Take the user to the Knowledge Bases page — they can't upload
   *  anything until they have one. */
  onManageKnowledgeBases?: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadModal({
  isOpen,
  onClose,
  knowledgeBaseId = null,
  onManageKnowledgeBases,
}: UploadModalProps) {
  const dispatch = useDispatch();

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [processedChunkCount, setProcessedChunkCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [targetKbId, setTargetKbId] = useState<number | null>(knowledgeBaseId);

  // Only load the picker's options while the modal is open.
  const { data: knowledgeBases = [], isLoading: isLoadingKbs } =
    useListKnowledgeBasesQuery(undefined, { skip: !isOpen });

  const onlyKbId = knowledgeBases.length === 1 ? knowledgeBases[0].id : null;

  useEffect(() => {
    if (!isOpen) return;

    // Preselect: an explicit target wins; otherwise fall back to the only
    // knowledge base the user has, so the common case needs no choice.
    // Keyed on the ids rather than the array so a re-render never overwrites
    // a selection the user made in the dropdown.
    setTargetKbId(knowledgeBaseId ?? onlyKbId);
  }, [isOpen, knowledgeBaseId, onlyKbId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setErrorMessage("");
    setProcessedChunkCount(0);

    if (targetKbId === null) {
      setErrorMessage("Choose a knowledge base to upload into first.");
      setUploadState("error");
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setErrorMessage("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
      setUploadState("error");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("File is too large. Upload a document smaller than 50MB.");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");

    try {
      const document = await uploadDocument(targetKbId, file, category);

      setProcessedChunkCount(document.chunks ?? 0);
      setUploadState("success");

      // Refresh the KB list so document counts and status reflect the upload.
      dispatch(invalidateKnowledgeBases());
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "There was an error uploading the document. Please try again."
      );
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
    setErrorMessage("");
    setProcessedChunkCount(0);
    setCategory("");
    onClose();
  };

  const targetKb = knowledgeBases.find((kb) => kb.id === targetKbId);
  const hasNoKnowledgeBases = !isLoadingKbs && knowledgeBases.length === 0;
  const canUpload = targetKbId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border">
          <div>
            <h2 className="text-2xl text-foreground">Upload Document</h2>
            {targetKb && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                {targetKb.name}
              </p>
            )}
          </div>
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
              {hasNoKnowledgeBases ? (
                <div className="py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-1">
                    No knowledge base yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Documents live inside a knowledge base. Create one from the
                    Knowledge Bases page, then upload into it.
                  </p>
                  <button
                    onClick={() => {
                      // This used to just close the modal, leaving the user
                      // exactly where they started with no way to act on it.
                      if (onManageKnowledgeBases) {
                        onManageKnowledgeBases();
                        return;
                      }

                      resetAndClose();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground
                               rounded-lg text-sm font-medium hover:bg-opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Go to Knowledge Bases
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Upload contracts, reports, research, notes — anything you want to
                    ask questions about. PDF, DOCX and TXT, up to 50MB.
                  </p>

                  {/* Target knowledge base */}
                  <div className="mb-6">
                    <label
                      htmlFor="upload-kb"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Knowledge base <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="upload-kb"
                      value={targetKbId ?? ""}
                      onChange={(e) =>
                        setTargetKbId(e.target.value ? Number(e.target.value) : null)
                      }
                      disabled={isLoadingKbs}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground
                                 focus:outline-none focus:border-accent disabled:opacity-60"
                    >
                      <option value="">
                        {isLoadingKbs ? "Loading…" : "Select a knowledge base…"}
                      </option>
                      {knowledgeBases.map((kb) => (
                        <option key={kb.id} value={kb.id}>
                          {kb.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="upload-category"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Category (optional)
                    </label>
                    <input
                      id="upload-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Health, Protection, Education"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div
                    onDrop={canUpload ? handleDrop : (e) => e.preventDefault()}
                    onDragOver={canUpload ? handleDragOver : (e) => e.preventDefault()}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                      !canUpload
                        ? "border-border opacity-60"
                        : isDragging
                          ? "border-accent bg-accent bg-opacity-5"
                          : "border-border hover:border-accent hover:bg-accent hover:bg-opacity-5"
                    }`}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2 text-foreground">
                      Drag and drop your document here
                    </p>
                    <p className="text-muted-foreground mb-4">or</p>
                    <label
                      className={`inline-block px-6 py-3 rounded-lg transition-all ${
                        canUpload
                          ? "bg-accent text-accent-foreground hover:bg-opacity-90 cursor-pointer"
                          : "bg-secondary text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      Browse files
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleInputChange}
                        disabled={!canUpload}
                        className="hidden"
                      />
                    </label>
                    {!canUpload && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Select a knowledge base to enable uploading.
                      </p>
                    )}
                  </div>

                  <div className="mt-8 space-y-4">
                    <h3 className="text-foreground">Document requirements:</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        <span>Accepted formats: PDF, DOCX, TXT</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        <span>Maximum file size: 50MB</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        <span>
                          Documents are indexed into the selected knowledge base and
                          only searchable by you
                        </span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}

          {uploadState === "uploading" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xl mb-2 text-foreground">Processing your document</p>
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
                {fileName} was indexed into {processedChunkCount} chunk
                {processedChunkCount === 1 ? "" : "s"}
                {targetKb ? ` in ${targetKb.name}` : ""}
              </p>

              <div className="bg-secondary rounded-xl p-6 max-w-md mx-auto mb-8 text-left">
                <h3 className="text-foreground mb-4">What happens next?</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">1.</span>
                    <span>Document text was extracted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">2.</span>
                    <span>Content was chunked and embedded</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">3.</span>
                    <span>Chunks were stored in your knowledge base</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setUploadState("idle");
                    setFileName("");
                    setErrorMessage("");
                    setProcessedChunkCount(0);
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
                {errorMessage || `There was an error uploading ${fileName}. Please try again.`}
              </p>
              <button
                onClick={() => {
                  setUploadState("idle");
                  setFileName("");
                  setErrorMessage("");
                  setProcessedChunkCount(0);
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
