import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { travelService } from "@/services/travelService";
import { useAuth } from "@/lib/AuthContext";
import type { TravelReceipt, TravelEvent, ReceiptLineItem, CurrencyOption } from "@/types/travel";
import {
  Receipt,
  UploadCloud,
  DollarSign,
  Clock,
  CheckCircle2,
  Sparkles,
  Plane,
  Building,
  Car,
  Utensils,
  Wrench,
  Fuel,
  Package,
  Layers,
  Search,
  Trash2,
  Camera,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Briefcase,
  CreditCard,
  Plus,
  ArrowLeft,
  Check,
  RefreshCw,
  ChevronsUpDown,
  X,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { runTesseractOcr, type OcrProgressUpdate } from "@/lib/tesseractOcr";

// Standard Zoho Expense Categories
const EXPENSE_CATEGORIES = [
  { value: "flight", label: "Air Travel", icon: Plane, defaultPolicy: "Executive Air Travel Policy" },
  { value: "lodging", label: "Lodging & Hotel", icon: Building, defaultPolicy: "Standard Corporate Lodging Policy" },
  { value: "meals_entertainment", label: "Meals & Entertainment", icon: Utensils, defaultPolicy: "Daily Per Diem Cap Policy ($120/day)" },
  { value: "ground_transport", label: "Ground Transportation", icon: Car, defaultPolicy: "Standard Ground Transportation Policy" },
  { value: "fuel", label: "Fuel & Mileage", icon: Fuel, defaultPolicy: "Corporate Vehicle Fleet Fuel Policy" },
  { value: "drone_gear_cargo", label: "Drone Hardware & Cargo", icon: Package, defaultPolicy: "Drone Arena Hardware Special Authorization" },
  { value: "equipment_supplies", label: "Office & Arena Supplies", icon: Wrench, defaultPolicy: "Standard Corporate Travel Policy" },
  { value: "other", label: "Miscellaneous / Other", icon: Layers, defaultPolicy: "Standard Corporate Travel Policy" },
];

const POLICIES = [
  "Standard Corporate Travel Policy",
  "Executive Tier 1 Policy (Michael Vance / CEO)",
  "Daily Per Diem Cap Policy ($120/day)",
  "Drone Arena Cargo Special Authorization",
  "Client Reimbursable Project Policy",
];

const PAY_THROUGH_ACCOUNTS = [
  { value: "Company Corporate Card", label: "Company Corporate Card (Mastercard)", isReimbursable: false },
  { value: "Executive Corporate Amex #4012", label: "Executive Corporate Amex #4012", isReimbursable: false },
  { value: "Personal Card (Reimbursable)", label: "Personal Card (Employee Reimbursable)", isReimbursable: true },
  { value: "Petty Cash / Per Diem", label: "Petty Cash / Per Diem Allowance", isReimbursable: true },
  { value: "Direct Corporate Invoice", label: "Direct Corporate Invoice / Wire", isReimbursable: false },
];

export default function ReceiptExpensePage() {
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // View Mode: 'list' (Table / Grid) vs 'new_expense' (Zoho Expense Form & OCR Split View)
  const [activeTab, setActiveTab] = useState<"list" | "new_expense" | "audit">("list");
  const [mobilePane, setMobilePane] = useState<"receipt" | "form">("receipt");

  // Safe helper to reliably parse line_items even if serialized as string from PostgreSQL JSONB
  const getSafeLineItems = (items: any): ReceiptLineItem[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  };

  // Leadership role check (CEO, EA, Lead, Super Admin)
  const isActualLeader = Boolean(
    user?.is_super_admin ||
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN", "EXECUTIVE", "CEO", "EA", "COORDINATOR", "MANAGER"].includes(r.code)
    ) ||
    user?.email?.toLowerCase().includes("ceo") ||
    user?.email?.toLowerCase().includes("vanessa") ||
    user?.email?.toLowerCase().includes("admin")
  );

  const [perspectiveMode, setPerspectiveMode] = useState<"leadership" | "attendee">(
    isActualLeader ? "leadership" : "attendee"
  );

  // Filter States
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ===================== ZOHO EXPENSE FORM STATE =====================
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [formMerchant, setFormMerchant] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formCategory, setFormCategory] = useState("meals_entertainment");
  const [formPolicy, setFormPolicy] = useState("Daily Per Diem Cap Policy ($120/day)");
  const [formPayThrough, setFormPayThrough] = useState("Company Corporate Card");
  const [formSpendAmount, setFormSpendAmount] = useState<number>(0.0);
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formExchangeRate, setFormExchangeRate] = useState<number>(1.385);
  const [formTax, setFormTax] = useState<number>(0.0);
  const [formTip, setFormTip] = useState<number>(0.0);
  const [formDescription, setFormDescription] = useState("");
  const [formReceiptNum, setFormReceiptNum] = useState("");
  const [formEventId, setFormEventId] = useState("");
  const [formIsReimbursable, setFormIsReimbursable] = useState(false);
  const [formIsBillable, setFormIsBillable] = useState(false);
  const [formProjectCode, setFormProjectCode] = useState("INTERNAL-CORP");
  const [formAttendees, setFormAttendees] = useState("");
  const [formLineItems, setFormLineItems] = useState<
    Array<{ description: string; quantity: number; unit_price: number; amount: number }>
  >([]);

  // Auto-complete combobox states for Currency & Category
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // ===================== ATTACHMENT & TESSERACT OCR STATE =====================
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentType, setAttachmentType] = useState<string>("");
  const [attachmentSize, setAttachmentSize] = useState<number>(0);

  // Viewer controls
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [previewRotate, setPreviewRotate] = useState<number>(0);
  const [isRawOcrOpen, setIsRawOcrOpen] = useState(false);

  // OCR Execution status
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressUpdate>({ status: "", progress: 0 });
  const [rawOcrText, setRawOcrText] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);

  // Detail Modal
  const [selectedReceiptDetail, setSelectedReceiptDetail] = useState<TravelReceipt | null>(null);

  // Amount in CAD (Live Computed or Explicit)
  const amountCad = useMemo(() => {
    return parseFloat((formSpendAmount * formExchangeRate).toFixed(2));
  }, [formSpendAmount, formExchangeRate]);

  // Policy Compliance Evaluation
  const policyCompliance = useMemo(() => {
    if (formCategory === "meals_entertainment" && amountCad > 150) {
      return {
        status: "warning",
        label: "Policy Alert: Exceeds $120 Daily Meal Cap",
        message: "Spend exceeds $120/day per-diem limit. Requires executive manager review.",
      };
    }
    if (formCategory === "flight" && amountCad > 3500) {
      return {
        status: "warning",
        label: "Policy Alert: High Airfare Tier",
        message: "Airfare exceeds standard $3,500 corridor limit. Attached invoice required.",
      };
    }
    return {
      status: "compliant",
      label: "Within Corporate Policy",
      message: "Matches Zenatech corporate travel guidelines.",
    };
  }, [formCategory, amountCad]);

  // Query events
  const { data: eventsList = [] } = useQuery<TravelEvent[]>({
    queryKey: ["travelEvents"],
    queryFn: travelService.getEvents,
  });

  const isAttendeeView = perspectiveMode === "attendee";
  const effectiveEmail = isAttendeeView ? user?.email || "alex.rivera@zenatech.com" : undefined;

  // Query Receipts
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ["travelReceipts", selectedEventId, statusFilter, categoryFilter, perspectiveMode, effectiveEmail],
    queryFn: () =>
      travelService.getReceipts({
        eventId: selectedEventId,
        userEmail: effectiveEmail,
        status: statusFilter,
        category: categoryFilter,
        isAdminOverride: !isAttendeeView,
      }),
  });

  const receiptsList = receiptsData?.receipts || [];
  const stats = receiptsData?.stats || {
    total_receipts: 0,
    total_amount: 0,
    pending_amount: 0,
    approved_amount: 0,
    reimbursed_amount: 0,
  };

  // Auto-set event ID
  useEffect(() => {
    if (eventsList.length > 0 && !formEventId) {
      setFormEventId(eventsList[0].id);
    }
  }, [eventsList, formEventId]);

  // Currencies catalog powered by country-currencies python library
  const { data: currenciesData } = useQuery({
    queryKey: ["spendCurrencies"],
    queryFn: travelService.getCurrencies,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const currenciesCatalog: CurrencyOption[] = useMemo(() => {
    if (currenciesData?.currencies && currenciesData.currencies.length > 0) {
      return currenciesData.currencies;
    }
    return [
      { code: "CAD", name: "Canadian Dollar", symbol: "$", countries: ["CA"], default_exchange_rate: 1.0, is_popular: true },
      { code: "USD", name: "US Dollar", symbol: "$", countries: ["US"], default_exchange_rate: 1.385, is_popular: true },
      { code: "EUR", name: "Euro", symbol: "€", countries: ["FR", "DE", "IT", "ES"], default_exchange_rate: 1.492, is_popular: true },
      { code: "GBP", name: "British Pound", symbol: "£", countries: ["GB"], default_exchange_rate: 1.765, is_popular: true },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", countries: ["JP"], default_exchange_rate: 0.0092, is_popular: true },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF", countries: ["CH"], default_exchange_rate: 1.56, is_popular: true },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", countries: ["AU"], default_exchange_rate: 0.895, is_popular: true },
      { code: "SGD", name: "Singapore Dollar", symbol: "S$", countries: ["SG"], default_exchange_rate: 1.035, is_popular: true },
      { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", countries: ["HK"], default_exchange_rate: 0.178, is_popular: true },
      { code: "AED", name: "UAE Dirham", symbol: "AED", countries: ["AE"], default_exchange_rate: 0.377, is_popular: true },
    ];
  }, [currenciesData]);

  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) return currenciesCatalog;
    const q = currencySearch.toLowerCase().trim();
    return currenciesCatalog.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        (c.countries && c.countries.some((co) => co.toLowerCase().includes(q)))
    );
  }, [currenciesCatalog, currencySearch]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return EXPENSE_CATEGORIES;
    const q = categorySearch.toLowerCase().trim();
    return EXPENSE_CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        (c.defaultPolicy && c.defaultPolicy.toLowerCase().includes(q))
    );
  }, [categorySearch]);

  const handleCurrencySelect = (currencyOpt: CurrencyOption) => {
    handleCurrencyChange(currencyOpt.code, currencyOpt.default_exchange_rate);
  };

  // Auto-update exchange rate when currency changes
  const handleCurrencyChange = (newCurrency: string, customRate?: number) => {
    setFormCurrency(newCurrency);
    if (customRate !== undefined) {
      setFormExchangeRate(customRate);
      return;
    }
    const found = currenciesCatalog.find((c) => c.code.toUpperCase() === newCurrency.toUpperCase());
    if (found && found.default_exchange_rate) {
      setFormExchangeRate(found.default_exchange_rate);
    }
  };

  // Auto-sync category with policy
  const handleCategoryChange = (newCat: string) => {
    setFormCategory(newCat);
    const found = EXPENSE_CATEGORIES.find((c) => c.value === newCat);
    if (found) {
      setFormPolicy(found.defaultPolicy);
    }
  };

  // Auto-sync pay through with reimbursable
  const handlePayThroughChange = (newPayThrough: string) => {
    setFormPayThrough(newPayThrough);
    const found = PAY_THROUGH_ACCOUNTS.find((p) => p.value === newPayThrough);
    if (found) {
      setFormIsReimbursable(found.isReimbursable);
    }
  };

  // ===================== FILE UPLOAD & OCR TRIGGER =====================
  // ===================== FILE UPLOAD & AI OCR TRIGGER =====================
  const handleFileSelected = async (file: File) => {
    setAttachmentFile(file);
    setAttachmentName(file.name);
    const mime = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    setAttachmentType(mime);
    setAttachmentSize(file.size);
    setPreviewZoom(1.0);
    setPreviewRotate(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setAttachmentDataUrl(dataUrl);
      // Automatically trigger multimodal extraction
      await triggerReceiptExtraction(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const triggerReceiptExtraction = async (fileToScan?: File, dataUrlToScan?: string) => {
    const targetFile = fileToScan || attachmentFile;
    const targetDataUrl = dataUrlToScan || attachmentDataUrl;

    if (!targetFile && !targetDataUrl) {
      toast.error("Please upload or capture a receipt first.");
      return;
    }

    setIsOcrRunning(true);
    setOcrProgress({ status: "Extracting document with Gemini 2.5 Flash AI...", progress: 0.15 });

    try {
      // 1. Primary AI Engine: Upload to backend for PyMuPDF + Gemini 2.5 Flash Vision
      const formData = new FormData();
      if (targetFile) {
        formData.append("file", targetFile);
      } else if (targetDataUrl) {
        const res = await fetch(targetDataUrl);
        const blob = await res.blob();
        formData.append("file", blob, attachmentName || "receipt.pdf");
      }
      if (formEventId && formEventId !== "all") {
        formData.append("event_id", formEventId);
      }

      setOcrProgress({ status: "Analyzing receipt & itemization with Gemini...", progress: 0.55 });
      const serverResult = await travelService.uploadAndExtractReceipt(formData);

      if (serverResult) {
        if (serverResult.merchant_name && serverResult.merchant_name !== "Unknown Vendor") {
          setFormMerchant(serverResult.merchant_name);
        }
        if (serverResult.transaction_date) {
          setFormDate(serverResult.transaction_date);
        }
        if (serverResult.total_amount && serverResult.total_amount > 0) {
          setFormSpendAmount(serverResult.total_amount);
        }
        if (serverResult.tax_amount !== undefined) {
          setFormTax(serverResult.tax_amount);
        }
        if (serverResult.tip_amount !== undefined) {
          setFormTip(serverResult.tip_amount);
        }
        if (serverResult.currency) {
          setFormCurrency(serverResult.currency);
        }
        if (serverResult.exchange_rate) {
          setFormExchangeRate(serverResult.exchange_rate);
        }
        if (serverResult.expense_category) {
          setFormCategory(serverResult.expense_category);
        }
        if (serverResult.policy) {
          setFormPolicy(serverResult.policy);
        }
        if (serverResult.payment_method) {
          setFormPayThrough(serverResult.payment_method);
        }
        if (serverResult.receipt_number) {
          setFormReceiptNum(serverResult.receipt_number);
        }
        if (serverResult.description) {
          setFormDescription(serverResult.description);
        }
        if (serverResult.line_items && serverResult.line_items.length > 0) {
          setFormLineItems(serverResult.line_items);
        }
        if (serverResult.raw_extracted_text) {
          setRawOcrText(serverResult.raw_extracted_text);
        }
        setOcrConfidence(serverResult.extraction_confidence || 98);
        toast.success(`Extracted with Gemini AI (${serverResult.extraction_confidence || 98}% confidence)!`);
        setMobilePane("form");
        return;
      }
    } catch (serverErr: any) {
      console.warn("Server AI extraction failed or offline, checking fallback:", serverErr);

      // Fallback: If it's an image, attempt client-side Tesseract.js
      const isPdf = attachmentType.includes("pdf") || targetFile?.name?.toLowerCase().endsWith(".pdf");
      if (!isPdf && (targetFile || targetDataUrl)) {
        try {
          setOcrProgress({ status: "Falling back to local Tesseract OCR...", progress: 0.7 });
          const ocrResult = await runTesseractOcr(targetFile || targetDataUrl!, (progress) => {
            setOcrProgress(progress);
          });
          if (ocrResult.merchantName && ocrResult.merchantName !== "Unknown Vendor") setFormMerchant(ocrResult.merchantName);
          if (ocrResult.transactionDate) setFormDate(ocrResult.transactionDate);
          if (ocrResult.totalAmount && ocrResult.totalAmount > 0) setFormSpendAmount(ocrResult.totalAmount);
          if (ocrResult.taxAmount !== undefined) setFormTax(ocrResult.taxAmount);
          if (ocrResult.currency) setFormCurrency(ocrResult.currency);
          if (ocrResult.category) setFormCategory(ocrResult.category);
          if (ocrResult.policy) setFormPolicy(ocrResult.policy);
          if (ocrResult.payThrough) setFormPayThrough(ocrResult.payThrough);
          if (ocrResult.receiptNumber) setFormReceiptNum(ocrResult.receiptNumber);
          if (ocrResult.description) setFormDescription(ocrResult.description);
          if (ocrResult.lineItems) setFormLineItems(ocrResult.lineItems);
          setRawOcrText(ocrResult.rawText);
          setOcrConfidence(ocrResult.confidence);
          toast.success("Extracted using client Tesseract OCR fallback.");
          setMobilePane("form");
          return;
        } catch (tessErr) {
          console.error("Tesseract client fallback error:", tessErr);
        }
      }
      toast.error("Could not extract receipt automatically. You can enter details or click 'AI Refine'.");
    } finally {
      setIsOcrRunning(false);
    }
  };

  const handleAiRefine = async () => {
    setIsOcrRunning(true);
    setOcrProgress({ status: "Refining with Gemini 2.5 Flash AI...", progress: 0.4 });
    try {
      const refined = await travelService.aiRefineReceipt({
        raw_text: rawOcrText,
        current_data: {
          merchant_name: formMerchant,
          transaction_date: formDate,
          total_amount: formSpendAmount,
          currency: formCurrency,
          expense_category: formCategory,
          receipt_number: formReceiptNum,
          description: formDescription,
          line_items: formLineItems,
        },
        notes_or_hint: formDescription || attachmentName,
      });

      if (refined) {
        if (refined.merchant_name) setFormMerchant(refined.merchant_name);
        if (refined.transaction_date) setFormDate(refined.transaction_date);
        if (refined.total_amount && refined.total_amount > 0) setFormSpendAmount(refined.total_amount);
        if (refined.tax_amount !== undefined) setFormTax(refined.tax_amount);
        if (refined.tip_amount !== undefined) setFormTip(refined.tip_amount);
        if (refined.currency) setFormCurrency(refined.currency);
        if (refined.expense_category) setFormCategory(refined.expense_category);
        if (refined.policy) setFormPolicy(refined.policy);
        if (refined.payment_method) setFormPayThrough(refined.payment_method);
        if (refined.receipt_number) setFormReceiptNum(refined.receipt_number);
        if (refined.description) setFormDescription(refined.description);
        if (refined.line_items && refined.line_items.length > 0) setFormLineItems(refined.line_items);
        setOcrConfidence(refined.extraction_confidence || 99);
        toast.success("Gemini AI refined and standardized receipt data!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "AI Refine failed. Check server connectivity.");
    } finally {
      setIsOcrRunning(false);
    }
  };

  // ===================== SAVE MUTATION =====================
  const saveReceiptMutation = useMutation({
    mutationFn: (payload: Partial<TravelReceipt>) => {
      if (editingReceiptId) {
        return travelService.updateReceipt(editingReceiptId, payload);
      }
      return travelService.createReceipt(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      toast.success(editingReceiptId ? "Expense updated successfully!" : "Expense created successfully!");
      resetForm();
      setActiveTab("list");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to save expense");
    },
  });

  const handleSaveExpense = (submitStatus: "draft" | "pending_approval" = "pending_approval") => {
    if (!formMerchant.trim()) {
      toast.error("Please enter a Merchant / Vendor name.");
      return;
    }
    if (formSpendAmount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }

    const payload: Partial<TravelReceipt> = {
      merchant_name: formMerchant.trim(),
      transaction_date: formDate,
      total_amount: formSpendAmount,
      currency: formCurrency,
      exchange_rate: formExchangeRate,
      amount_cad: amountCad,
      tax_amount: formTax,
      tip_amount: formTip,
      expense_category: formCategory,
      policy: formPolicy,
      payment_method: formPayThrough,
      description: formDescription,
      notes: formDescription,
      receipt_number: formReceiptNum || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      event_id: formEventId || (eventsList[0]?.id ?? null),
      user_email: user?.email || "alex.rivera@zenatech.com",
      user_name: user?.full_name || "Alex Rivera",
      is_reimbursable: formIsReimbursable,
      is_billable: formIsBillable,
      project_code: formProjectCode,
      attendees: formAttendees,
      line_items: formLineItems,
      file_name: attachmentName || (attachmentDataUrl ? "receipt_scan.jpg" : undefined),
      file_type: attachmentType || (attachmentDataUrl ? "image/jpeg" : undefined),
      file_size_bytes: attachmentSize,
      file_data: attachmentDataUrl || undefined,
      raw_extracted_text: rawOcrText,
      extraction_confidence: ocrConfidence || 95.0,
      status: submitStatus,
    };

    saveReceiptMutation.mutate(payload);
  };

  const resetForm = () => {
    setEditingReceiptId(null);
    setFormMerchant("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormCategory("meals_entertainment");
    setFormPolicy("Daily Per Diem Cap Policy ($120/day)");
    setFormPayThrough("Company Corporate Card");
    setFormSpendAmount(0);
    setFormCurrency("USD");
    setFormExchangeRate(1.385);
    setFormTax(0);
    setFormTip(0);
    setFormDescription("");
    setFormReceiptNum("");
    setFormIsReimbursable(false);
    setFormIsBillable(false);
    setFormProjectCode("INTERNAL-CORP");
    setFormAttendees("");
    setFormLineItems([]);
    setAttachmentFile(null);
    setAttachmentDataUrl(null);
    setAttachmentName("");
    setAttachmentSize(0);
    setRawOcrText("");
    setOcrConfidence(0);
  };

  const loadExpenseIntoEditor = (receipt: TravelReceipt) => {
    setEditingReceiptId(receipt.id);
    setFormMerchant(receipt.merchant_name || "");
    setFormDate(receipt.transaction_date ? String(receipt.transaction_date).split("T")[0] : "");
    setFormCategory(receipt.expense_category || "other");
    setFormPolicy(receipt.policy || "Standard Corporate Travel Policy");
    setFormPayThrough(receipt.payment_method || "Company Corporate Card");
    setFormSpendAmount(Number(receipt.total_amount) || 0);
    setFormCurrency(receipt.currency || "USD");
    setFormExchangeRate(Number(receipt.exchange_rate) || 1.385);
    setFormTax(Number(receipt.tax_amount) || 0);
    setFormTip(Number(receipt.tip_amount) || 0);
    setFormDescription(receipt.description || receipt.notes || "");
    setFormReceiptNum(receipt.receipt_number || "");
    setFormEventId(receipt.event_id || "");
    setFormIsReimbursable(Boolean(receipt.is_reimbursable));
    setFormIsBillable(Boolean(receipt.is_billable));
    setFormProjectCode(receipt.project_code || "INTERNAL-CORP");
    setFormAttendees(receipt.attendees || "");
    setFormLineItems(receipt.line_items || []);
    setAttachmentDataUrl(receipt.file_data || null);
    setAttachmentName(receipt.file_name || "attached_receipt.jpg");
    setAttachmentType(receipt.file_type || "image/jpeg");
    setAttachmentSize(receipt.file_size_bytes || 0);
    setRawOcrText(receipt.raw_extracted_text || "");
    setOcrConfidence(Number(receipt.extraction_confidence) || 95);
    setActiveTab("new_expense");
  };

  // Filtered Receipts List
  const filteredReceipts = useMemo(() => {
    return receiptsList.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMerchant = r.merchant_name?.toLowerCase().includes(q);
        const matchRecNum = r.receipt_number?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchUser = r.user_name?.toLowerCase().includes(q);
        if (!matchMerchant && !matchRecNum && !matchDesc && !matchUser) return false;
      }
      return true;
    });
  }, [receiptsList, searchQuery]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* ===================== EXPENSE HEADER BAR ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Receipts & Expenses
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1.5 py-0.5">
              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
              Tesseract OCR Engine Ready
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Multi-currency corporate expense management with client-side Tesseract OCR, real-time CAD conversion, and policy compliance verification.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "list"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Expenses ({receiptsList.length})
            </button>
            <button
              onClick={() => {
                resetForm();
                setActiveTab("new_expense");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "new_expense"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>{editingReceiptId ? "Edit Expense" : "New Expense"}</span>
            </button>
          </div>

          {activeTab === "list" && (
            <Button
              onClick={() => {
                resetForm();
                setActiveTab("new_expense");
              }}
              size="sm"
              className="gap-1.5 rounded-xl font-semibold text-xs shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Receipt</span>
            </Button>
          )}
        </div>
      </div>

      {/* ===================== VIEW 1: ZOHO EXPENSE 2-COLUMN SPLIT FORM ===================== */}
      {activeTab === "new_expense" && (
        <div className="space-y-6">
          {/* Top Return Banner */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetForm();
                setActiveTab("list");
              }}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Expense List</span>
            </Button>

            {/* Mobile Switcher (Receipt vs Form) */}
            <div className="flex lg:hidden bg-muted/60 p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setMobilePane("receipt")}
                className={`px-3 py-1 text-xs font-semibold rounded-md ${
                  mobilePane === "receipt" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                1. Receipt & OCR
              </button>
              <button
                type="button"
                onClick={() => setMobilePane("form")}
                className={`px-3 py-1 text-xs font-semibold rounded-md ${
                  mobilePane === "form" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                2. Expense Details
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ================= LEFT COLUMN: RECEIPT ATTACHMENT & OCR INSPECTOR ================= */}
            <div className={`lg:col-span-5 space-y-4 ${mobilePane === "form" ? "hidden lg:block" : "block"}`}>
              <Card className="border-border shadow-xs overflow-hidden">
                <CardHeader className="p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-primary" />
                        <span>Receipt Attachment</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Upload or scan receipt using Tesseract OCR.
                      </CardDescription>
                    </div>
                    {attachmentFile && (
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {(attachmentSize / 1024).toFixed(1)} KB
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* File Dropzone & Camera Inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                    }}
                  />

                  {!attachmentDataUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/30 group"
                    >
                      <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-2 group-hover:scale-110 group-hover:text-primary transition-all" />
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Drag and drop receipt here, or <span className="text-primary underline">browse</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        Supports PNG, JPG, WebP, and PDF invoices up to 15MB
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            cameraInputRef.current?.click();
                          }}
                          className="text-xs gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5 text-primary" />
                          <span>Use Camera</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Receipt Image Viewer */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border">
                        <div className="truncate max-w-[200px] font-medium text-foreground">
                          {attachmentName}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.2))}
                            className="p-1 hover:bg-muted rounded text-foreground"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono px-1">{Math.round(previewZoom * 100)}%</span>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.2))}
                            className="p-1 hover:bg-muted rounded text-foreground"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewRotate((r) => (r + 90) % 360)}
                            className="p-1 hover:bg-muted rounded text-foreground"
                            title="Rotate"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachmentFile(null);
                              setAttachmentDataUrl(null);
                              setAttachmentName("");
                            }}
                            className="p-1 hover:bg-destructive/10 text-destructive rounded ml-1"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* View Canvas */}
                      <div className="relative w-full h-[320px] sm:h-[400px] bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-inner">
                        {attachmentType.includes("pdf") ? (
                          <div className="relative w-full h-full flex flex-col bg-neutral-950">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800 text-neutral-300 text-[11px] border-b border-neutral-700 shrink-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{attachmentName}</span>
                              </div>
                              <a
                                href={attachmentDataUrl || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                <span>Pop-out</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex-1 w-full h-full relative">
                              <iframe
                                src={attachmentDataUrl || ""}
                                title="PDF Document Preview"
                                className="w-full h-full border-0 bg-neutral-900"
                              />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={attachmentDataUrl}
                            alt="Receipt Preview"
                            style={{
                              transform: `scale(${previewZoom}) rotate(${previewRotate}deg)`,
                              transition: "transform 0.2s ease-out",
                            }}
                            className="max-h-full max-w-full object-contain"
                          />
                        )}

                        {isOcrRunning && (
                          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                            <div className="text-xs font-bold text-foreground">Processing with Gemini AI & OCR...</div>
                            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden border border-border">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${Math.round((ocrProgress.progress || 0) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">{ocrProgress.status || "Extracting text & analyzing receipt structure..."}</p>
                          </div>
                        )}
                      </div>

                      {/* Manual Trigger Action */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isOcrRunning || (!attachmentFile && !attachmentDataUrl)}
                          onClick={() => triggerReceiptExtraction()}
                          className="w-full text-xs gap-1.5 font-semibold"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>Extract with Gemini AI & OCR</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs"
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* OCR Confidence & Raw Text Collapsible */}
                  {rawOcrText && (
                    <div className="border border-border/80 rounded-xl p-3 bg-muted/20 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-semibold text-foreground">Gemini AI & OCR Verified</span>
                        </div>
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          {ocrConfidence}% Confidence
                        </Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsRawOcrOpen(!isRawOcrOpen)}
                        className="text-[11px] text-primary hover:underline block font-medium"
                      >
                        {isRawOcrOpen ? "Hide Extracted OCR Text" : "View Raw Recognized Text"}
                      </button>

                      {isRawOcrOpen && (
                        <pre className="p-2.5 rounded-lg bg-background border border-border text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-muted-foreground">
                          {rawOcrText}
                        </pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ================= RIGHT COLUMN: EXPENSE DETAILED FORM ================= */}
            <div className={`lg:col-span-7 space-y-6 ${mobilePane === "receipt" ? "hidden lg:block" : "block"}`}>
              <Card className="border-border shadow-xs">
                <CardHeader className="p-4 sm:p-6 border-b border-border bg-card">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {editingReceiptId ? "Edit Expense Entry" : "Expense Details"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Review attributes extracted by Gemini AI & OCR or modify manual fields.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* AI Refine (Gemini) Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleAiRefine}
                        disabled={isOcrRunning || (!rawOcrText && !formMerchant && formSpendAmount <= 0)}
                        className="gap-1.5 text-xs rounded-lg border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 font-semibold shadow-2xs"
                        title="Use Gemini 2.5 Flash to automatically detect missing fields, clean vendor names, parse line items and verify tax/currency"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span>AI Refine (Gemini)</span>
                      </Button>

                      {/* Policy Compliance Pill */}
                      <div
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border ${
                          policyCompliance.status === "compliant"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {policyCompliance.status === "compliant" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{policyCompliance.label}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-6">
                  {/* SECTION 1: CORE ATTRIBUTES (Date, Merchant, Category, Policy) */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      <span>1. Core Expense Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Date <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="date"
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>

                      {/* Merchant */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Merchant / Vendor <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={formMerchant}
                          onChange={(e) => setFormMerchant(e.target.value)}
                          placeholder="e.g. Air Canada, Spago, Bellagio"
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>

                      {/* Category Auto-Complete */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCategoryOpen}
                              className="w-full h-9 justify-between rounded-lg px-3 text-xs font-medium bg-background border-input hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-2 truncate">
                                {(() => {
                                  const meta = EXPENSE_CATEGORIES.find((c) => c.value === formCategory) || {
                                    label: formCategory,
                                    icon: Layers,
                                  };
                                  const IconComponent = meta.icon;
                                  return (
                                    <>
                                      <IconComponent className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="truncate">{meta.label}</span>
                                    </>
                                  );
                                })()}
                              </div>
                              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-2 bg-popover rounded-xl border border-border shadow-lg" align="start">
                            <div className="flex items-center border-b border-border px-2 pb-2 gap-1.5">
                              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <Input
                                placeholder="Search category..."
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                                autoFocus
                              />
                              {categorySearch && (
                                <button
                                  type="button"
                                  onClick={() => setCategorySearch("")}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="max-h-56 overflow-y-auto pt-1 space-y-0.5">
                              {filteredCategories.length === 0 ? (
                                <div className="p-3 text-center text-xs text-muted-foreground">
                                  No matching category found
                                </div>
                              ) : (
                                filteredCategories.map((cat) => {
                                  const Icon = cat.icon;
                                  const isSelected = formCategory === cat.value;
                                  return (
                                    <button
                                      key={cat.value}
                                      type="button"
                                      onClick={() => {
                                        handleCategoryChange(cat.value);
                                        setIsCategoryOpen(false);
                                        setCategorySearch("");
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                                        isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-foreground"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                        <div className="truncate">
                                          <div className="truncate font-medium">{cat.label}</div>
                                          <div className="text-[10px] text-muted-foreground truncate">{cat.defaultPolicy}</div>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Policy */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Expense Policy <span className="text-destructive">*</span>
                        </Label>
                        <select
                          value={formPolicy}
                          onChange={(e) => setFormPolicy(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden"
                        >
                          {POLICIES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: AMOUNT & CURRENCY (Amount in CAD & Exchange Rate) */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      <span>2. Spend Amount & Currency Conversion</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                      {/* Spend Amount & Original Currency Auto-Complete */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Spend Amount <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              value={formSpendAmount || ""}
                              onChange={(e) => setFormSpendAmount(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-9 pl-7 text-xs rounded-lg font-mono font-medium"
                            />
                          </div>

                          {/* Currency Auto-Complete Combobox */}
                          <Popover open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={isCurrencyOpen}
                                className="h-9 min-w-[95px] px-2.5 rounded-lg border-input bg-background text-xs font-bold font-mono justify-between gap-1 hover:bg-muted/30"
                              >
                                <span className="truncate">{formCurrency}</span>
                                <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[330px] p-2 bg-popover rounded-xl border border-border shadow-lg" align="end">
                              <div className="flex items-center border-b border-border px-2 pb-2 gap-1.5">
                                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <Input
                                  placeholder="Search currency code, name, or country..."
                                  value={currencySearch}
                                  onChange={(e) => setCurrencySearch(e.target.value)}
                                  className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 font-sans"
                                  autoFocus
                                />
                                {currencySearch && (
                                  <button
                                    type="button"
                                    onClick={() => setCurrencySearch("")}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <div className="max-h-60 overflow-y-auto pt-1 space-y-0.5">
                                {filteredCurrencies.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-muted-foreground">
                                    No currencies matching "{currencySearch}"
                                  </div>
                                ) : (
                                  filteredCurrencies.map((c) => {
                                    const isSelected = formCurrency === c.code;
                                    return (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          handleCurrencySelect(c);
                                          setIsCurrencyOpen(false);
                                          setCurrencySearch("");
                                        }}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                                          isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/50 text-foreground"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="font-mono font-bold text-xs w-10 shrink-0">{c.code}</span>
                                          <span className="text-[11px] text-muted-foreground w-6 text-center font-mono shrink-0">{c.symbol}</span>
                                          <div className="truncate">
                                            <span className="truncate font-medium">{c.name}</span>
                                            {c.countries && c.countries.length > 0 && (
                                              <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                                                ({c.countries.slice(0, 3).join(", ")}{c.countries.length > 3 ? "..." : ""})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                          <span className="text-[10px] font-mono text-muted-foreground">
                                            ~{c.default_exchange_rate.toFixed(3)}
                                          </span>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                              <div className="pt-2 border-t border-border mt-1 px-1 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Powered by countries-currencies</span>
                                <span>{currenciesCatalog.length} currencies</span>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Exchange Rate (Quick Selection Removed, Auto-Complete & Manual Customization) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs font-semibold text-foreground">
                            Exchange Rate
                          </Label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            1 {formCurrency} = {formExchangeRate.toFixed(4)} CAD
                          </span>
                        </div>
                        <Input
                          type="number"
                          step="0.0001"
                          value={formExchangeRate}
                          onChange={(e) => setFormExchangeRate(parseFloat(e.target.value) || 1.0)}
                          className="h-9 text-xs rounded-lg font-mono font-medium"
                        />
                        <span className="text-[10px] text-muted-foreground block mt-1">
                          Auto-populated from {formCurrency} rate. Editable for custom conversions.
                        </span>
                      </div>

                      {/* Amount in (CAD) Highlight */}
                      <div className="p-3 rounded-lg bg-card border border-primary/30 flex flex-col justify-center">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block mb-0.5">
                          Amount in (CAD)
                        </span>
                        <div className="text-xl font-bold font-mono text-foreground">
                          ${amountCad.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Base company accounting currency
                        </span>
                      </div>
                    </div>

                    {/* Tax & Tip Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Tax Amount (GST / HST / VAT)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formTax || ""}
                          onChange={(e) => setFormTax(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-9 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Tip / Gratuity
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formTip || ""}
                          onChange={(e) => setFormTip(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-9 text-xs rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT & ACCOUNTING (Pay Through, Reimbursable, Billable) */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      <span>3. Payment & Accounting</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pay Through Account */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Pay Through <span className="text-destructive">*</span>
                        </Label>
                        <select
                          value={formPayThrough}
                          onChange={(e) => handlePayThroughChange(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden"
                        >
                          {PAY_THROUGH_ACCOUNTS.map((acc) => (
                            <option key={acc.value} value={acc.value}>
                              {acc.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Travel Event / Trip */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Associated Travel Event / Trip
                        </Label>
                        <select
                          value={formEventId}
                          onChange={(e) => setFormEventId(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium focus:outline-hidden"
                        >
                          {eventsList.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} ({ev.location})
                            </option>
                          ))}
                          {eventsList.length === 0 && <option value="">General Corporate Travel</option>}
                        </select>
                      </div>
                    </div>

                    {/* Checkboxes: Reimbursable & Billable */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={formIsReimbursable}
                          onChange={(e) => setFormIsReimbursable(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-foreground">Claim Reimbursement</div>
                          <div className="text-muted-foreground text-[11px]">Pay back to employee bank account</div>
                        </div>
                      </label>

                      <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formIsBillable}
                            onChange={(e) => setFormIsBillable(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-foreground">Billable to Customer / Project</span>
                          </div>
                        </label>
                        {formIsBillable && (
                          <Input
                            value={formProjectCode}
                            onChange={(e) => setFormProjectCode(e.target.value)}
                            placeholder="e.g. PRJ-DRONE-AERO"
                            className="h-8 text-xs rounded-md"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: DESCRIPTION & BUSINESS PURPOSE */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>4. Business Justification & Notes</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Reference / Invoice / Receipt #
                        </Label>
                        <Input
                          value={formReceiptNum}
                          onChange={(e) => setFormReceiptNum(e.target.value)}
                          placeholder="e.g. REC-98214"
                          className="h-9 text-xs rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Attendees / Participants
                        </Label>
                        <Input
                          value={formAttendees}
                          onChange={(e) => setFormAttendees(e.target.value)}
                          placeholder="e.g. Michael Vance (CEO), Sajjad (VP Eng)"
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground block mb-1">
                        Description / Business Purpose <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        rows={3}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Explain the business purpose and context of this expense for audit approval..."
                        className="text-xs rounded-lg resize-none"
                      />
                    </div>
                  </div>

                  {/* SECTION 5: ITEMIZED LINE ITEMS (Zoho Expense Table) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>5. Itemized Breakdown ({formLineItems.length})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setFormLineItems([
                            ...formLineItems,
                            { description: "New Item", quantity: 1, unit_price: 0, amount: 0 },
                          ])
                        }
                        className="text-xs text-primary gap-1 h-7"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Row</span>
                      </Button>
                    </div>

                    {formLineItems.length > 0 && (
                      <div className="border border-border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                            <tr>
                              <th className="p-2.5">Item Description</th>
                              <th className="p-2.5 w-20 text-center">Qty</th>
                              <th className="p-2.5 w-24 text-right">Unit Price</th>
                              <th className="p-2.5 w-24 text-right">Total</th>
                              <th className="p-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {formLineItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const copy = [...formLineItems];
                                      copy[idx].description = e.target.value;
                                      setFormLineItems(copy);
                                    }}
                                    className="w-full bg-transparent border-0 text-xs focus:ring-0 p-1 font-medium text-foreground"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const copy = [...formLineItems];
                                      const qty = parseFloat(e.target.value) || 1;
                                      copy[idx].quantity = qty;
                                      copy[idx].amount = parseFloat((qty * copy[idx].unit_price).toFixed(2));
                                      setFormLineItems(copy);
                                    }}
                                    className="w-full bg-transparent border-0 text-xs focus:ring-0 text-center p-1 font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => {
                                      const copy = [...formLineItems];
                                      const price = parseFloat(e.target.value) || 0;
                                      copy[idx].unit_price = price;
                                      copy[idx].amount = parseFloat((copy[idx].quantity * price).toFixed(2));
                                      setFormLineItems(copy);
                                    }}
                                    className="w-full bg-transparent border-0 text-xs focus:ring-0 text-right p-1 font-mono"
                                  />
                                </td>
                                <td className="p-2 text-right font-mono font-medium text-foreground">
                                  ${item.amount.toFixed(2)}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setFormLineItems(formLineItems.filter((_, i) => i !== idx))}
                                    className="text-muted-foreground hover:text-destructive p-1 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* BOTTOM STICKY ACTION STRIP */}
                <CardFooter className="p-4 sm:p-6 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Auto-calculates exchange rates into CAD base ledger.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveExpense("draft")}
                      disabled={saveReceiptMutation.isPending}
                      className="text-xs rounded-xl"
                    >
                      Save as Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveExpense("pending_approval")}
                      disabled={saveReceiptMutation.isPending}
                      className="text-xs rounded-xl font-bold shadow-xs gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingReceiptId ? "Update & Save" : "Save & Submit Expense"}</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: ALL EXPENSES LIST (ZOHO EXPENSE STYLE) ===================== */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Executive KPI Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-bold font-mono text-foreground mt-1">
                    ${stats.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-muted-foreground">{stats.total_receipts} logged expenses</span>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Approval</p>
                  <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    ${stats.pending_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Awaiting sign-off
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approved & Verified</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ${stats.approved_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready for ledger
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reimbursed</p>
                  <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    ${stats.reimbursed_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[11px] text-muted-foreground">Paid out to employee</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant, receipt #, description..."
                className="h-9 pl-9 text-xs rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Event Filter */}
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Trips / Events</option>
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="reimbursed">Reimbursed</option>
                <option value="draft">Draft</option>
              </select>

              {/* Leadership Perspective Switcher */}
              {isActualLeader && (
                <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setPerspectiveMode("leadership")}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      perspectiveMode === "leadership" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                    }`}
                  >
                    Leadership
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerspectiveMode("attendee")}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      perspectiveMode === "attendee" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                    }`}
                  >
                    My Expenses
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ================= EXPENSE TABLE (DESKTOP) & CARDS (MOBILE) ================= */}
          {isLoading ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <div className="text-sm font-semibold text-foreground">Loading expenses...</div>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-xl border border-border space-y-3">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
              <div className="text-base font-semibold text-foreground">No expenses found</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No expense receipts match your filters. Upload a new receipt or clear filters.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setActiveTab("new_expense");
                }}
                size="sm"
                className="rounded-xl font-semibold text-xs mt-2"
              >
                + New Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Data Table */}
              <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[980px]">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3 w-12 text-center whitespace-nowrap">Receipt</th>
                        <th className="p-3 whitespace-nowrap min-w-[240px]">Date & Merchant</th>
                        <th className="p-3 whitespace-nowrap min-w-[190px]">Category & Policy</th>
                        <th className="p-3 whitespace-nowrap min-w-[180px]">Pay Through</th>
                        <th className="p-3 text-right whitespace-nowrap min-w-[130px]">Amount (Original)</th>
                        <th className="p-3 text-right whitespace-nowrap min-w-[140px]">Amount in (CAD)</th>
                        <th className="p-3 text-center whitespace-nowrap min-w-[130px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredReceipts.map((rec) => {
                        const catMeta = EXPENSE_CATEGORIES.find((c) => c.value === rec.expense_category) || {
                          label: rec.expense_category,
                          icon: Layers,
                        };
                        const CatIcon = catMeta.icon;
                        const cadVal = rec.amount_cad || (Number(rec.total_amount) * (Number(rec.exchange_rate) || 1.385));

                        return (
                          <tr
                            key={rec.id}
                            onClick={() => setSelectedReceiptDetail(rec)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                            title="Click row to view expense details"
                          >
                            {/* Receipt Thumbnail */}
                            <td className="p-3 text-center whitespace-nowrap">
                              {rec.file_data ? (
                                <div className="w-9 h-9 rounded-lg overflow-hidden border border-border group-hover:border-primary transition-all inline-block shadow-2xs">
                                  <img
                                    src={rec.file_data}
                                    alt="Receipt"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                                  <Receipt className="w-4 h-4" />
                                </div>
                              )}
                            </td>

                            {/* Date & Merchant */}
                            <td className="p-3 whitespace-nowrap min-w-[240px]">
                              <div className="font-bold text-foreground text-sm flex items-center gap-1.5 whitespace-nowrap group-hover:text-primary transition-colors">
                                <span className="whitespace-nowrap">{rec.merchant_name}</span>
                                {rec.extraction_confidence && Number(rec.extraction_confidence) >= 95 && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-1 py-0 whitespace-nowrap">
                                    OCR
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                <span className="whitespace-nowrap font-medium">{rec.transaction_date ? String(rec.transaction_date).split("T")[0] : ""}</span>
                                {rec.receipt_number && <span className="whitespace-nowrap font-mono">• {rec.receipt_number}</span>}
                                {rec.user_name && <span className="whitespace-nowrap">• {rec.user_name}</span>}
                              </div>
                            </td>

                            {/* Category & Policy */}
                            <td className="p-3 whitespace-nowrap min-w-[190px]">
                              <div className="flex items-center gap-1.5 font-medium text-foreground whitespace-nowrap">
                                <CatIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="whitespace-nowrap">{catMeta.label}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                                {rec.policy || "Standard Corporate Policy"}
                              </div>
                            </td>

                            {/* Pay Through */}
                            <td className="p-3 whitespace-nowrap min-w-[180px]">
                              <div className="text-foreground font-medium text-xs flex items-center gap-1.5 whitespace-nowrap">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="whitespace-nowrap">{rec.payment_method || "Corporate Card"}</span>
                              </div>
                              {rec.is_reimbursable && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5 whitespace-nowrap">
                                  Reimbursable to Employee
                                </span>
                              )}
                            </td>

                            {/* Amount Original */}
                            <td className="p-3 text-right font-mono text-muted-foreground whitespace-nowrap min-w-[130px]">
                              ${Number(rec.total_amount).toFixed(2)} {rec.currency}
                            </td>

                            {/* Amount in (CAD) */}
                            <td className="p-3 text-right whitespace-nowrap min-w-[140px]">
                              <div className="font-mono font-bold text-foreground text-sm whitespace-nowrap">
                                ${cadVal.toFixed(2)} CAD
                              </div>
                              {rec.currency !== "CAD" && (
                                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap block">
                                  @ {Number(rec.exchange_rate || 1.385).toFixed(4)}
                                </span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="p-3 text-center whitespace-nowrap min-w-[130px]">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border inline-block whitespace-nowrap ${
                                  rec.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : rec.status === "reimbursed"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                                    : rec.status === "draft"
                                    ? "bg-muted text-muted-foreground border-border"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                }`}
                              >
                                {rec.status === "pending_approval"
                                  ? "Pending Approval"
                                  : rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Responsive Cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredReceipts.map((rec) => {
                  const catMeta = EXPENSE_CATEGORIES.find((c) => c.value === rec.expense_category) || {
                    label: rec.expense_category,
                    icon: Layers,
                  };
                  const CatIcon = catMeta.icon;
                  const cadVal = rec.amount_cad || (Number(rec.total_amount) * (Number(rec.exchange_rate) || 1.385));

                  return (
                    <Card
                      key={rec.id}
                      onClick={() => setSelectedReceiptDetail(rec)}
                      className="border-border shadow-xs overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-foreground text-sm">{rec.merchant_name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                              <CatIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{catMeta.label}</span>
                              <span>• {rec.transaction_date ? String(rec.transaction_date).split("T")[0] : ""}</span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${
                              rec.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {rec.status === "pending_approval" ? "Pending" : rec.status}
                          </span>
                        </div>

                        {/* Amount Strip */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              Amount in CAD
                            </span>
                            <span className="text-base font-bold font-mono text-foreground">
                              ${cadVal.toFixed(2)} CAD
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              ${Number(rec.total_amount).toFixed(2)} {rec.currency}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Rate: {Number(rec.exchange_rate || 1.385).toFixed(4)}
                            </span>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {rec.payment_method}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadExpenseIntoEditor(rec);
                              }}
                              className="text-xs h-7"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== EXPENSE DETAIL MODAL ===================== */}
      <Dialog open={Boolean(selectedReceiptDetail)} onOpenChange={() => setSelectedReceiptDetail(null)}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6">
          {selectedReceiptDetail && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <span>{selectedReceiptDetail.merchant_name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">
                      Official expense record • Logged on {selectedReceiptDetail.created_at ? new Date(selectedReceiptDetail.created_at).toLocaleDateString() : "N/A"}
                    </DialogDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs px-2.5 py-1 ${
                      selectedReceiptDetail.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                        : selectedReceiptDetail.status === "reimbursed"
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-semibold"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                    }`}
                  >
                    {selectedReceiptDetail.status === "pending_approval"
                      ? "Pending Approval"
                      : selectedReceiptDetail.status}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Two Column Layout if receipt document exists */}
              <div className={`grid grid-cols-1 ${selectedReceiptDetail.file_data ? "lg:grid-cols-12 gap-6" : "gap-5"}`}>
                {/* Left Column: Receipt Document Preview */}
                {selectedReceiptDetail.file_data && (
                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Receipt Attachment</span>
                      {selectedReceiptDetail.file_type && (
                        <span className="text-[10px] font-mono lowercase bg-muted px-1.5 py-0.5 rounded">
                          {selectedReceiptDetail.file_type.split("/")[1] || selectedReceiptDetail.file_type}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-80 lg:h-[460px] bg-neutral-900 rounded-2xl overflow-hidden flex items-center justify-center border border-border p-2">
                      {selectedReceiptDetail.file_type?.includes("pdf") ? (
                        <iframe
                          src={selectedReceiptDetail.file_data}
                          className="w-full h-full rounded-xl border-0"
                          title="Folio Document"
                        />
                      ) : (
                        <img
                          src={
                            selectedReceiptDetail.file_data.startsWith("data:") || selectedReceiptDetail.file_data.startsWith("http")
                              ? selectedReceiptDetail.file_data
                              : `data:${selectedReceiptDetail.file_type || "image/jpeg"};base64,${selectedReceiptDetail.file_data}`
                          }
                          alt={selectedReceiptDetail.merchant_name}
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Right Column: Key Details & Itemization */}
                <div className={`${selectedReceiptDetail.file_data ? "lg:col-span-7" : "col-span-1"} space-y-4`}>
                  {/* Amount Summary Strip */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Amount in CAD
                      </span>
                      <span className="text-xl font-bold font-mono text-primary">
                        ${(Number(selectedReceiptDetail.amount_cad) || Number(selectedReceiptDetail.total_amount) * (Number(selectedReceiptDetail.exchange_rate) || 1.385)).toFixed(2)} CAD
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-0.5">
                        Original Spend
                      </span>
                      <span className="text-base font-bold font-mono text-foreground block">
                        ${Number(selectedReceiptDetail.total_amount).toFixed(2)} {selectedReceiptDetail.currency}
                      </span>
                      {selectedReceiptDetail.currency !== "CAD" && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Rate: {Number(selectedReceiptDetail.exchange_rate || 1.385).toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-4 rounded-xl border border-border">
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Transaction Date</span>
                      <span className="font-semibold text-foreground">
                        {selectedReceiptDetail.transaction_date ? String(selectedReceiptDetail.transaction_date).split("T")[0] : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Reference / Receipt #</span>
                      <span className="font-mono font-semibold text-foreground">
                        {selectedReceiptDetail.receipt_number || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Category</span>
                      <span className="font-semibold capitalize text-foreground">
                        {selectedReceiptDetail.expense_category.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Policy</span>
                      <span className="font-semibold text-foreground">
                        {selectedReceiptDetail.policy || "Standard Corporate Policy"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Pay Through Account</span>
                      <span className="font-semibold text-foreground">
                        {selectedReceiptDetail.payment_method}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5 font-medium">Submitted By</span>
                      <span className="font-semibold text-foreground">
                        {selectedReceiptDetail.user_name || "Employee"} {selectedReceiptDetail.user_email ? `(${selectedReceiptDetail.user_email})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Description / Business Purpose */}
                  {selectedReceiptDetail.description && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Purpose</h4>
                      <p className="text-xs text-foreground bg-muted/20 p-3 rounded-xl border border-border">
                        {selectedReceiptDetail.description}
                      </p>
                    </div>
                  )}

                  {/* Line Items Table */}
                  {getSafeLineItems(selectedReceiptDetail.line_items).length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itemized Breakdown</h4>
                      <div className="border border-border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                            <tr>
                              <th className="p-2.5">Item</th>
                              <th className="p-2.5 text-center">Qty</th>
                              <th className="p-2.5 text-right">Price</th>
                              <th className="p-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {getSafeLineItems(selectedReceiptDetail.line_items).map((li, i) => (
                              <tr key={i}>
                                <td className="p-2.5 text-foreground font-medium">{li.description}</td>
                                <td className="p-2.5 text-center font-mono">{li.quantity}</td>
                                <td className="p-2.5 text-right font-mono">${Number(li.unit_price).toFixed(2)}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-foreground">
                                  ${Number(li.amount).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReceiptDetail(null)}
                  className="text-xs rounded-xl"
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      loadExpenseIntoEditor(selectedReceiptDetail);
                      setSelectedReceiptDetail(null);
                    }}
                    className="text-xs rounded-xl gap-1.5 font-semibold"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Edit Expense</span>
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
