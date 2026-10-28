import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import fuzzysort from "fuzzysort";

export interface AutocompleteOption {
  id: number | string;
  name: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface AutocompleteComboboxProps {
  value: number | string | "";
  onChange: (value: any) => void;
  options: AutocompleteOption[];
  onCreate?: (name: string) => Promise<number | string>;
  createLabel?: (search: string) => string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteCombobox({
  value,
  onChange,
  options,
  onCreate,
  createLabel,
  placeholder = "Select an option...",
  disabled = false,
  className,
}: AutocompleteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdOption, setCreatedOption] = useState<{ id: any; name: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  // Normalize options so name is always a valid string
  const safeOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => ({
      ...opt,
      name: opt?.name != null ? String(opt.name) : String(opt?.id ?? ""),
    }));
  }, [options]);

  // Perform fuzzy search
  const results = useMemo(() => {
    if (!search.trim()) {
      return safeOptions.map((opt) => ({ ...opt, score: 0 })).slice(0, 1000);
    }
    const fuzz_results = fuzzysort.go(search, safeOptions as any, { key: "name", all: true } as any);
    return (fuzz_results as any)
      .map((res: any) => {
        const rawScore = res.score;
        let matchPercent = 100;
        if (rawScore < 0) {
          matchPercent = Math.max(0, 100 + Math.floor(rawScore / 10));
        }
        return {
          id: res.obj.id,
          name: res.obj.name || "",
          sublabel: res.obj.sublabel,
          badge: res.obj.badge,
          icon: res.obj.icon,
          score: matchPercent,
        };
      })
      .slice(0, 1000);
  }, [search, safeOptions]);

  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return safeOptions.some((opt) => (opt.name || "").toLowerCase() === q);
  }, [search, safeOptions]);

  const selectedOption = useMemo(() => {
    const found = safeOptions.find(
      (opt) => opt.id === value || (typeof value === "string" && (opt.name || "").toLowerCase() === value.toLowerCase())
    );
    if (found) return found;
    if (createdOption && createdOption.id === value) return createdOption;
    if (value !== undefined && value !== null && value !== "") {
      return { id: value, name: String(value) };
    }
    return undefined;
  }, [safeOptions, value, createdOption]);

  const handleCreate = async () => {
    if (!onCreate || !search.trim()) return;
    setIsCreating(true);
    try {
      const typedName = search.trim();
      const newId = await onCreate(typedName);
      setCreatedOption({ id: newId, name: typedName });
      onChange(newId);
      setOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal bg-background overflow-hidden text-xs h-10", className)}
          disabled={disabled}
        >
          <span className="truncate flex-1 text-left">
            {selectedOption ? (
              <span className="font-medium text-foreground">{selectedOption.name}</span>
            ) : (
              <span className="text-muted-foreground truncate block">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 shadow-xl" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <input
              ref={inputRef}
              className="flex h-9 w-full rounded-md bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search or type name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results.length > 0 && results[0].score >= 90) {
                    onChange(results[0].id);
                    setOpen(false);
                  } else if (onCreate && search.trim() && !exactMatch) {
                    handleCreate();
                  } else if (results.length > 0) {
                    onChange(results[0].id);
                    setOpen(false);
                  }
                }
              }}
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto p-1 divide-y divide-border/40" onWheel={(e) => e.stopPropagation()}>
            {results.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                  value === opt.id || (typeof value === "string" && (opt.name || "").toLowerCase() === value.toLowerCase())
                    ? "bg-accent/60 text-accent-foreground font-medium"
                    : ""
                )}
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-primary",
                    value === opt.id || (typeof value === "string" && (opt.name || "").toLowerCase() === value.toLowerCase())
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate">{opt.name}</span>
                  {opt.sublabel && (
                    <span className="truncate text-[10px] text-muted-foreground">{opt.sublabel}</span>
                  )}
                </div>
                {opt.badge && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 shrink-0">
                    {opt.badge}
                  </span>
                )}
                {search.trim() && opt.score > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground bg-secondary/50 px-1 py-0.5 rounded">
                    {opt.score}%
                  </span>
                )}
              </div>
            ))}

            {results.length === 0 && !search.trim() && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No options found.
              </div>
            )}

            {search.trim() && !exactMatch && onCreate && (
              <div
                onClick={isCreating ? undefined : handleCreate}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2.5 py-2 text-xs outline-none hover:bg-primary/10 text-primary font-medium mt-1 border-t border-t-primary/10"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-3.5 w-3.5" />
                )}
                {createLabel ? createLabel(search) : `Add "${search}"`}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
