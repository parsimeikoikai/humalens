import { useState } from "react";
import { X, FolderOpen, Globe, Lock, Plus, Tag } from "lucide-react";

interface CreateKBModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; isPublic: boolean; tags: string[] }) => void;
}

const SUGGESTED_TAGS = ["Legal", "Finance", "Research", "Product", "HR", "Technical", "Internal", "AI/ML", "Reports"];

export default function CreateKBModal({ isOpen, onClose, onCreate }: CreateKBModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
    setTags([]);
    setTagInput("");
    setError("");
    onClose();
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter a name for this knowledge base.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onCreate({ name: name.trim(), description: description.trim(), isPublic, tags });
      handleClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent via-accent/70 to-accent/40" />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-7">
            <div>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                <FolderOpen className="w-5 h-5 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">New Knowledge Base</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create a collection to organize and query your documents.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Legal Contracts, Q2 Reports…"
                autoFocus
                maxLength={60}
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background
                           focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                           placeholder:text-muted-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{name.length}/60</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What documents does this collection contain?"
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background
                           focus:outline-none focus:ring-2 focus:ring-ring text-foreground
                           placeholder:text-muted-foreground text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{description.length}/200</p>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Tags <span className="text-muted-foreground font-normal">(up to 5)</span>
              </label>
              <div className={`flex flex-wrap gap-1.5 px-3 py-2.5 border rounded-xl bg-background min-h-[44px]
                               focus-within:ring-2 focus-within:ring-ring transition-shadow ${
                                 tags.length >= 5 ? "border-border opacity-70" : "border-border"
                               }`}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-accent/10 text-accent rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-accent/60 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? "Add tags…" : ""}
                    className="flex-1 min-w-20 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                )}
              </div>
              {/* Suggested tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="text-xs px-2.5 py-1 border border-border rounded-full text-muted-foreground
                               hover:border-accent hover:text-accent transition-all"
                  >
                    <Plus className="w-2.5 h-2.5 inline mr-0.5" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Visibility</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: false,
                    icon: Lock,
                    title: "Private",
                    desc: "Only you can access and query this collection.",
                  },
                  {
                    value: true,
                    icon: Globe,
                    title: "Public",
                    desc: "Anyone with the link can query this collection.",
                  },
                ].map(({ value, icon: Icon, title, desc }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setIsPublic(value)}
                    className={`flex flex-col items-start p-4 border-2 rounded-xl text-left transition-all ${
                      isPublic === value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                      isPublic === value ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className={`text-sm font-medium ${isPublic === value ? "text-foreground" : "text-muted-foreground"}`}>
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm text-foreground
                           hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-medium
                           hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Knowledge Base
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
