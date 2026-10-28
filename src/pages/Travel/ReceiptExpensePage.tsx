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
  Download,
  Maximize2,
  Paperclip,
  Eye,
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
import { AutocompleteCombobox, type AutocompleteOption } from "@/components/ui/autocomplete-combobox";

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

  // Only Administrator can see all expenses among all users; requesters can only see their own expenses
  const isAdministrator = Boolean(
    user?.is_super_admin ||
    roles?.some((r) =>
      ["SUPER_ADMIN", "ADMIN"].includes(r.code?.toUpperCase())
    ) ||
    user?.email?.toLowerCase().includes("admin")
  );

  const [perspectiveMode, setPerspectiveMode] = useState<"leadership" | "attendee">(
    isAdministrator ? "leadership" : "attendee"
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
  const [formSubtotal, setFormSubtotal] = useState<number | null>(null);
  const [formDiscount, setFormDiscount] = useState<number>(0.0);
  const [formNetSubtotal, setFormNetSubtotal] = useState<number | null>(null);
  const [formCalculationVerified, setFormCalculationVerified] = useState<boolean>(false);
  const [formDiscountDetails, setFormDiscountDetails] = useState<string>("");
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
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  // ===================== BATCH UPLOAD STATE =====================
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchFileCount, setBatchFileCount] = useState<number>(0);
  const [batchProgressText, setBatchProgressText] = useState("");
  const [batchCreatedDrafts, setBatchCreatedDrafts] = useState<TravelReceipt[]>([]);
  const [batchErrors, setBatchErrors] = useState<Array<{ file_name: string; error: string }>>([]);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Lightbox & Download State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string>("");
  const [lightboxName, setLightboxName] = useState<string>("");
  const [lightboxType, setLightboxType] = useState<string>("");
  const [lightboxZoom, setLightboxZoom] = useState<number>(1.0);
  const [lightboxRotate, setLightboxRotate] = useState<number>(0);

  const openLightbox = (src: string, name: string, type?: string) => {
    if (!src) return;
    setLightboxSrc(src);
    setLightboxName(name || "receipt");
    setLightboxType(type || (name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"));
    setLightboxZoom(1.0);
    setLightboxRotate(0);
    setLightboxOpen(true);
  };

  const handleDownloadAttachment = (fileData: string, fileName: string, receiptId?: string) => {
    if (fileData) {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = fileName || "receipt_attachment";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${fileName || "receipt"}...`);
    } else if (receiptId) {
      window.open(travelService.getReceiptAttachmentUrl(receiptId), "_blank");
    } else {
      toast.error("No attachment file data available to download.");
    }
  };

  const handleAttachReceiptToExisting = async (file: File) => {
    if (!selectedReceiptDetail) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const mime = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      try {
        const updated = await travelService.updateReceipt(selectedReceiptDetail.id, {
          file_name: file.name,
          file_type: mime,
          file_size_bytes: file.size,
          file_data: dataUrl,
        });
        setSelectedReceiptDetail(updated);
        queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
        toast.success(`Attached ${file.name} to expense!`);
      } catch (err: any) {
        toast.error("Failed to attach receipt to expense.");
      }
    };
    reader.readAsDataURL(file);
  };

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

  const isAttendeeView = !isAdministrator || perspectiveMode === "attendee";
  const effectiveEmail = isAttendeeView ? user?.email || "alex.rivera@zenatech.com" : undefined;

  // Query Receipts
  const { data: receiptsData, isLoading } = useQuery({
    queryKey: ["travelReceipts", selectedEventId, statusFilter, categoryFilter, perspectiveMode, effectiveEmail, isAdministrator],
    queryFn: () =>
      travelService.getReceipts({
        eventId: selectedEventId,
        userEmail: isAdministrator && !isAttendeeView ? undefined : (user?.email || "alex.rivera@zenatech.com"),
        status: statusFilter,
        category: categoryFilter,
        isAdminOverride: isAdministrator && !isAttendeeView,
      }),
  });

  const receiptsList: TravelReceipt[] = Array.isArray(receiptsData)
    ? receiptsData
    : (receiptsData?.receipts || []);
  const stats = (!Array.isArray(receiptsData) && receiptsData?.stats) || {
    total_receipts: receiptsList.length,
    total_amount: receiptsList.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
    pending_amount: receiptsList.filter((r) => r.status === "pending_approval").reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
    approved_amount: receiptsList.filter((r) => r.status === "approved").reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
    reimbursed_amount: receiptsList.filter((r) => r.status === "reimbursed").reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
  };

  // Query total receipts count for top tab badge
  const { data: allReceiptsCountData } = useQuery({
    queryKey: ["travelReceiptsTotalCount", selectedEventId],
    queryFn: () =>
      travelService.getReceipts({
        eventId: selectedEventId,
        isAdminOverride: true,
      }),
    staleTime: 30000,
  });

  const allCount =
    (!Array.isArray(allReceiptsCountData) && allReceiptsCountData?.stats?.total_receipts) ??
    (Array.isArray(allReceiptsCountData) ? allReceiptsCountData.length : allReceiptsCountData?.receipts?.length) ??
    (perspectiveMode === "leadership" ? receiptsList.length : 0);

  const myCount = useMemo(() => {
    if (perspectiveMode === "attendee") {
      return receiptsList.length;
    }
    const currentEmail = (user?.email || "alex.rivera@zenatech.com").toLowerCase();
    const sourceList = (Array.isArray(allReceiptsCountData) ? allReceiptsCountData : allReceiptsCountData?.receipts) || receiptsList;
    return sourceList.filter((r) => (r.user_email || "").toLowerCase() === currentEmail).length;
  }, [perspectiveMode, receiptsList, allReceiptsCountData, user?.email]);

  // Auto-set event ID
  useEffect(() => {
    if (eventsList.length > 0 && !formEventId) {
      const firstEv = eventsList[0] as any;
      setFormEventId(firstEv.id || firstEv.trip_uuid || firstEv.event_name || "");
    }
  }, [eventsList, formEventId]);

  // Combobox options for mapping travel events
  const eventComboboxOptions: AutocompleteOption[] = useMemo(() => [
    {
      id: "",
      name: "General Corporate Travel (No Event)",
      sublabel: "Standard company business overhead",
      badge: "General",
    },
    ...eventsList.map((ev: any) => ({
      id: ev.id || ev.trip_uuid || ev.event_name || "",
      name: ev.title || ev.event_name || "Corporate Travel Event",
      sublabel: `${ev.location || "TBD"} • ${ev.start_date || ""} to ${ev.end_date || ""}`,
      badge: ev.status ? String(ev.status).toUpperCase() : undefined,
    })),
  ], [eventsList]);

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
  const handleMultipleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length === 1) {
      if (activeTab !== "new_expense") {
        resetForm();
        setActiveTab("new_expense");
      }
      await handleFileSelected(fileArray[0]);
      return;
    }

    // Multiple receipts selected -> run batch upload & extraction
    await executeBatchUpload(fileArray);
  };

  const executeBatchUpload = async (fileArray: File[]) => {
    setIsBatchProcessing(true);
    setBatchFileCount(fileArray.length);
    setBatchProgressText(`Analyzing and extracting ${fileArray.length} receipts with AI multimodal vision...`);
    setBatchErrors([]);

    const formData = new FormData();
    fileArray.forEach((f) => {
      formData.append("files", f);
    });
    if (formEventId && formEventId !== "all") {
      formData.append("event_id", formEventId);
    }
    formData.append("user_email", user?.email || "alex.rivera@zenatech.com");
    formData.append("user_name", user?.full_name || "Alex Rivera");
    formData.append("auto_save_draft", "true");

    try {
      const data = await travelService.batchUploadAndExtractReceipts(formData);

      setBatchCreatedDrafts(data.items || []);
      setBatchErrors(data.errors || []);
      setIsBatchProcessing(false);
      setIsBatchModalOpen(true);

      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });

      if (data.success_count > 0) {
        toast.success(`Batch complete: ${data.success_count} receipt${data.success_count > 1 ? "s" : ""} extracted and saved as Draft!`);
      }
      if (data.failed_count > 0) {
        toast.error(`${data.failed_count} file${data.failed_count > 1 ? "s" : ""} failed to extract.`);
      }
    } catch (err: any) {
      console.error("Batch upload failed:", err);
      setIsBatchProcessing(false);
      toast.error(err?.response?.data?.detail || "Batch receipt upload failed.");
    }
  };

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
    const isPdf = attachmentType.includes("pdf") || targetFile?.name?.toLowerCase().endsWith(".pdf");

    try {
      let finalMerchant = "";
      let finalDate = "";
      let finalTotal = 0;
      let finalTax: number | undefined = undefined;
      let finalTip: number | undefined = 0;
      let finalSubtotal: number | null = null;
      let finalDiscount: number = 0;
      let finalNetSubtotal: number | null = null;
      let finalCalculationVerified: boolean = false;
      let finalDiscountDetails: string = "";
      let finalCurr = "USD";
      let finalRate = 1.385;
      let finalCat = "equipment_supplies";
      let finalPolicy = "Standard Corporate Travel Policy";
      let finalPayment = "Company Corporate Card";
      let finalRecNum = "";
      let finalDesc = "";
      let finalItems: Array<{ description: string; quantity: number; unit_price: number; amount: number }> = [];
      let finalRawText = "";
      let confidence = 95;

      let serverSuccess = false;

      // 1. Primary: Server-side AI & Multimodal Vision Extraction (Gemini / Ollama / PyMuPDF)
      try {
        setOcrProgress({ status: "Auditing & extracting receipt with AI multimodal vision...", progress: 0.35 });
        const formData = new FormData();
        if (targetFile) {
          formData.append("file", targetFile);
        } else if (targetDataUrl) {
          const res = await fetch(targetDataUrl);
          const blob = await res.blob();
          formData.append("file", blob, attachmentName || (isPdf ? "receipt.pdf" : "receipt.jpg"));
        }
        if (formEventId && formEventId !== "all") {
          formData.append("event_id", formEventId);
        }
        if (attachmentName || targetFile?.name) {
          formData.append("user_hint", attachmentName || targetFile?.name || "");
        }

        const serverResult = await travelService.uploadAndExtractReceipt(formData);

        if (serverResult && (serverResult.extraction_confidence || 0) > 0 && serverResult.merchant_name !== "Unknown Vendor") {
          finalMerchant = serverResult.merchant_name || "";
          finalDate = serverResult.transaction_date || "";
          finalTotal = serverResult.total_amount && serverResult.total_amount > 0 ? serverResult.total_amount : 0;
          finalTax = serverResult.tax_amount;
          finalTip = serverResult.tip_amount || 0;
          finalSubtotal = serverResult.subtotal_amount ?? null;
          finalDiscount = Number(serverResult.discount_amount) || 0;
          finalNetSubtotal = serverResult.net_subtotal ?? null;
          finalCalculationVerified = Boolean(serverResult.calculation_verified);
          finalDiscountDetails = serverResult.discount_details || "";
          finalCurr = serverResult.currency || "CAD";
          finalRate = serverResult.exchange_rate || (finalCurr === "CAD" ? 1.0 : 1.385);
          finalCat = serverResult.expense_category || "meals_entertainment";
          finalPolicy = serverResult.policy || "Daily Per Diem Cap Policy ($120/day)";
          finalPayment = serverResult.payment_method || "Company Corporate Card";
          finalRecNum = serverResult.receipt_number || "";
          finalDesc = serverResult.description || "";
          finalItems = serverResult.line_items || [];
          finalRawText = serverResult.raw_extracted_text || "";
          confidence = serverResult.extraction_confidence || 98;
          serverSuccess = true;
        }
      } catch (serverErr) {
        console.warn("Server multimodal extraction unavailable, falling back to local OCR:", serverErr);
      }

      // 2. Secondary Fallback: Client-Side Tesseract OCR + AI reasoning
      if (!serverSuccess && !isPdf && (targetFile || targetDataUrl)) {
        setOcrProgress({ status: "Extracting receipt text with Tesseract OCR...", progress: 0.5 });
        const ocrResult = await runTesseractOcr(targetFile || targetDataUrl!, (progress) => {
          setOcrProgress({ status: progress.status, progress: 0.4 + progress.progress * 0.4 });
        });

        finalMerchant = ocrResult.merchantName && ocrResult.merchantName !== "Unknown Vendor" ? ocrResult.merchantName : "";
        finalDate = ocrResult.transactionDate || "";
        finalTotal = ocrResult.totalAmount && ocrResult.totalAmount > 0 ? ocrResult.totalAmount : 0;
        finalTax = ocrResult.taxAmount;
        finalTip = ocrResult.tipAmount || 0;
        finalCurr = ocrResult.currency || "CAD";
        finalRate = ocrResult.exchangeRate || (finalCurr === "CAD" ? 1.0 : 1.385);
        finalCat = ocrResult.category || "meals_entertainment";
        finalPolicy = ocrResult.policy || "Standard Corporate Travel Policy";
        finalPayment = ocrResult.payThrough || "Company Corporate Card";
        finalRecNum = ocrResult.receiptNumber || "";
        finalDesc = ocrResult.description || "";
        finalItems = ocrResult.lineItems || [];
        finalRawText = ocrResult.rawText || "";
        confidence = ocrResult.confidence || 90;

        // AI Reasoning Refinement
        setOcrProgress({ status: "Refining & auditing with AI reasoning...", progress: 0.85 });
        try {
          const refined = await travelService.aiRefineReceipt({
            raw_text: finalRawText,
            current_data: {
              merchant_name: finalMerchant,
              transaction_date: finalDate,
              total_amount: finalTotal,
              currency: finalCurr,
              expense_category: finalCat,
              receipt_number: finalRecNum,
              description: finalDesc,
              line_items: finalItems,
            },
            notes_or_hint: attachmentName || targetFile?.name,
          });

          if (refined) {
            if (refined.merchant_name && refined.merchant_name !== "Unknown Vendor") finalMerchant = refined.merchant_name;
            if (refined.transaction_date) finalDate = refined.transaction_date;
            if (refined.total_amount && refined.total_amount > 0) finalTotal = refined.total_amount;
            if (refined.tax_amount !== undefined) finalTax = refined.tax_amount;
            if (refined.tip_amount !== undefined) finalTip = refined.tip_amount;
            if (refined.subtotal_amount !== undefined) finalSubtotal = refined.subtotal_amount;
            if (refined.discount_amount !== undefined) finalDiscount = Number(refined.discount_amount) || 0;
            if (refined.net_subtotal !== undefined) finalNetSubtotal = refined.net_subtotal;
            if (refined.calculation_verified !== undefined) finalCalculationVerified = Boolean(refined.calculation_verified);
            if (refined.discount_details) finalDiscountDetails = refined.discount_details;
            if (refined.currency) finalCurr = refined.currency;
            if (refined.exchange_rate) finalRate = refined.exchange_rate;
            if (refined.expense_category) finalCat = refined.expense_category;
            if (refined.policy) finalPolicy = refined.policy;
            if (refined.payment_method) finalPayment = refined.payment_method;
            if (refined.receipt_number) finalRecNum = refined.receipt_number;
            if (refined.description) finalDesc = refined.description;
            if (refined.line_items && refined.line_items.length > 0) finalItems = refined.line_items;
            confidence = refined.extraction_confidence || 95;
          }
        } catch (aiRefineErr) {
          console.warn("AI refine notice:", aiRefineErr);
        }
      }

      if (finalMerchant) setFormMerchant(finalMerchant);
      if (finalDate) setFormDate(finalDate);
      if (finalTotal > 0) setFormSpendAmount(finalTotal);
      if (finalTax !== undefined) setFormTax(finalTax);
      if (finalTip !== undefined) setFormTip(finalTip);
      setFormSubtotal(finalSubtotal);
      setFormDiscount(finalDiscount);
      setFormNetSubtotal(finalNetSubtotal);
      setFormCalculationVerified(finalCalculationVerified);
      setFormDiscountDetails(finalDiscountDetails);
      if (finalCurr) setFormCurrency(finalCurr);
      if (finalRate) setFormExchangeRate(finalRate);
      if (finalCat) setFormCategory(finalCat);
      if (finalPolicy) setFormPolicy(finalPolicy);
      if (finalPayment) setFormPayThrough(finalPayment);
      if (finalRecNum) setFormReceiptNum(finalRecNum);
      if (finalDesc) setFormDescription(finalDesc);
      if (finalItems && finalItems.length > 0) setFormLineItems(finalItems);
      if (finalRawText) setRawOcrText(finalRawText);
      setOcrConfidence(confidence);
      toast.success(`Extracted & AI-refined (${confidence}% confidence)!`);
      setMobilePane("form");
      return;
    } catch (err: any) {
      console.error("Receipt extraction error:", err);
      toast.error("Could not extract receipt automatically. You can enter details manually.");
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["travelReceipts"] });
      queryClient.invalidateQueries({ queryKey: ["travelReceipts", "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["travelReceipts", "sidebarPendingCount"] });
      if (editingReceiptId) {
        toast.success("Expense updated successfully!");
      } else if (variables.status === "pending_approval") {
        toast.success("Expense submitted successfully! It has been routed to Approvals.");
      } else {
        toast.success("Expense draft saved successfully!");
      }
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
      subtotal_amount: formSubtotal,
      discount_amount: formDiscount,
      net_subtotal: formNetSubtotal,
      calculation_verified: formCalculationVerified,
      discount_details: formDiscountDetails,
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
    setFormSubtotal(null);
    setFormDiscount(0);
    setFormNetSubtotal(null);
    setFormCalculationVerified(false);
    setFormDiscountDetails("");
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
    setFormSubtotal(receipt.subtotal_amount !== undefined ? receipt.subtotal_amount : (receipt.extraction_metadata?.subtotal_amount ?? null));
    setFormDiscount(receipt.discount_amount !== undefined ? (Number(receipt.discount_amount) || 0) : (Number(receipt.extraction_metadata?.discount_amount) || 0));
    setFormNetSubtotal(receipt.net_subtotal !== undefined ? receipt.net_subtotal : (receipt.extraction_metadata?.net_subtotal ?? null));
    setFormCalculationVerified(Boolean(receipt.calculation_verified ?? receipt.extraction_metadata?.calculation_verified));
    setFormDiscountDetails(receipt.discount_details || receipt.extraction_metadata?.discount_details || "");
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
              Expenses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Multi-currency corporate expense management with multimodal AI receipt extraction, real-time CAD conversion, and policy compliance verification.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdministrator ? (
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setPerspectiveMode("leadership");
                  if (activeTab !== "list") setActiveTab("list");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "list" && perspectiveMode === "leadership"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Expenses {allCount !== undefined && allCount > 0 ? `(${allCount})` : `(${receiptsList.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPerspectiveMode("attendee");
                  if (activeTab !== "list") setActiveTab("list");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "list" && perspectiveMode === "attendee"
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Expenses {myCount !== undefined && myCount > 0 ? `(${myCount})` : ""}
              </button>
            </div>
          ) : (
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setPerspectiveMode("attendee");
                  if (activeTab !== "list") setActiveTab("list");
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-card text-foreground shadow-xs"
              >
                My Expenses ({receiptsList.length})
              </button>
            </div>
          )}

          {activeTab === "list" && (
            <div className="flex items-center gap-2">
              <input
                ref={batchFileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleMultipleFilesSelected(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => batchFileInputRef.current?.click()}
                className="gap-1.5 rounded-xl font-semibold text-xs shadow-xs border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>Batch Upload (Drafts)</span>
              </Button>
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
            </div>
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
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleMultipleFilesSelected(e.target.files);
                        e.target.value = "";
                      }
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
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleMultipleFilesSelected(e.dataTransfer.files);
                        }
                      }}
                      className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/30 group"
                    >
                      <UploadCloud className="w-10 h-10 text-muted-foreground mx-auto mb-2 group-hover:scale-110 group-hover:text-primary transition-all" />
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Drag and drop receipt(s) here, or <span className="text-primary underline">browse</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        Single or batch upload: PNG, JPG, WebP, and PDF invoices (batch saves as Drafts)
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
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Batch Upload (Drafts)</span>
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
                            onClick={() => openLightbox(attachmentDataUrl || "", attachmentName, attachmentType)}
                            className="p-1 hover:bg-muted rounded text-foreground"
                            title="Fullscreen Preview"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(attachmentDataUrl || "", attachmentName)}
                            className="p-1 hover:bg-muted rounded text-foreground"
                            title="Download Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
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
                  {/* Extracted Receipt Preview Banner (Visible after upload & OCR extraction) */}
                  {attachmentDataUrl && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-card border border-primary/20 shadow-xs gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          onClick={() => openLightbox(attachmentDataUrl, attachmentName, attachmentType)}
                          className="w-12 h-12 rounded-lg bg-muted border border-border overflow-hidden shrink-0 cursor-pointer hover:opacity-85 transition-opacity flex items-center justify-center relative group"
                          title="Click to view full preview"
                        >
                          {attachmentType.includes("pdf") ? (
                            <FileText className="w-6 h-6 text-rose-500" />
                          ) : (
                            <img src={attachmentDataUrl} alt="Receipt Thumbnail" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                              {attachmentName || "Receipt Attachment"}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 uppercase">
                              {attachmentType.includes("pdf") ? "PDF" : "Image"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {attachmentSize > 0 ? `${(attachmentSize / 1024).toFixed(1)} KB • ` : ""}
                            {ocrConfidence > 0 ? `AI Extracted (${ocrConfidence}% Confidence)` : "Attached Document"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => openLightbox(attachmentDataUrl, attachmentName, attachmentType)}
                          className="text-xs gap-1 h-7 rounded-lg"
                          title="Open full receipt preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => handleDownloadAttachment(attachmentDataUrl, attachmentName)}
                          className="text-xs gap-1 h-7 rounded-lg"
                          title="Download original receipt file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </Button>
                      </div>
                    </div>
                  )}

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
                  {/* SECTION 2: AMOUNT, TAX & CURRENCY BREAKDOWN */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/50 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        <span>2. Financial Breakdown (Subtotal, Tax & Total Spend)</span>
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground font-normal">
                        Pre-tax + Tax = After-tax total
                      </span>
                    </div>

                    {/* Currency & Base Conversion Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                      {/* Currency Auto-Complete Combobox */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Billing Currency
                        </Label>
                        <Popover open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCurrencyOpen}
                              className="h-9 w-full px-2.5 rounded-lg border-input bg-background text-xs font-bold font-mono justify-between gap-1 hover:bg-muted/30"
                            >
                              <span className="truncate">{formCurrency}</span>
                              <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[330px] p-2 bg-popover rounded-xl border border-border shadow-lg" align="start">
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

                      {/* Exchange Rate */}
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
                      </div>

                      {/* Amount in (CAD) Highlight */}
                      <div className="p-2.5 rounded-lg bg-card border border-primary/30 flex flex-col justify-center">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block mb-0.5">
                          Amount in (CAD)
                        </span>
                        <div className="text-lg font-bold font-mono text-foreground">
                          ${amountCad.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Base company accounting currency
                        </span>
                      </div>
                    </div>

                    {/* Pre-tax Subtotal, Tax, Tip & Discount Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Pre-Tax Subtotal
                        </Label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formSubtotal ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                              setFormSubtotal(val);
                              if (val !== null) {
                                const net = Math.max(val - formDiscount, 0);
                                setFormNetSubtotal(net);
                                setFormSpendAmount(Number((net + formTax + formTip).toFixed(2)));
                              }
                            }}
                            placeholder="0.00"
                            className="h-9 pl-7 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-1">Pre-tax goods & services</span>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Tax Amount (GST/HST/VAT)
                        </Label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formTax || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFormTax(val);
                              const sub = formSubtotal ?? 0;
                              const disc = formDiscount ?? 0;
                              const net = Math.max(sub - disc, 0);
                              setFormSpendAmount(Number((net + val + formTip).toFixed(2)));
                            }}
                            placeholder="0.00"
                            className="h-9 pl-7 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-1">Sales tax / VAT amount</span>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Tip / Gratuity
                        </Label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formTip || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFormTip(val);
                              const sub = formSubtotal ?? 0;
                              const disc = formDiscount ?? 0;
                              const net = Math.max(sub - disc, 0);
                              setFormSpendAmount(Number((net + formTax + val).toFixed(2)));
                            }}
                            placeholder="0.00"
                            className="h-9 pl-7 text-xs rounded-lg font-mono"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-1">Optional restaurant/driver tip</span>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold text-foreground block mb-1">
                          Discount / Credits
                        </Label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formDiscount || ""}
                            onChange={(e) => {
                              const disc = parseFloat(e.target.value) || 0;
                              setFormDiscount(disc);
                              const sub = formSubtotal ?? 0;
                              const net = Math.max(sub - disc, 0);
                              setFormNetSubtotal(net);
                              setFormSpendAmount(Number((net + formTax + formTip).toFixed(2)));
                            }}
                            placeholder="0.00"
                            className="h-9 pl-7 text-xs rounded-lg font-mono text-emerald-600 dark:text-emerald-400 font-medium"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-1">Promos or coupons subtracted</span>
                      </div>
                    </div>

                    {/* Grand Total (After-Tax Total) Input & Calculation Summary Strip */}
                    <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground block">
                          After-Tax Total (Grand Total) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative w-48">
                          <DollarSign className="w-4 h-4 absolute left-2.5 top-2.5 text-primary" />
                          <Input
                            type="number"
                            step="0.01"
                            value={formSpendAmount || ""}
                            onChange={(e) => {
                              const total = parseFloat(e.target.value) || 0;
                              setFormSpendAmount(total);
                              if (formTax > 0 || formTip > 0 || formDiscount > 0) {
                                const inferredSub = Math.max(0, total - formTax - formTip + formDiscount);
                                setFormSubtotal(inferredSub);
                                setFormNetSubtotal(Math.max(0, inferredSub - formDiscount));
                              } else {
                                setFormSubtotal(total);
                                setFormNetSubtotal(total);
                              }
                            }}
                            placeholder="0.00"
                            className="h-10 pl-8 text-sm rounded-lg font-mono font-bold text-primary"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground block">
                          Final charged transaction amount on receipt
                        </span>
                      </div>

                      {/* Live Math Visual Breakdown */}
                      <div className="flex items-center gap-2 text-xs font-mono bg-muted/40 p-2.5 rounded-lg border border-border/60">
                        <div className="text-center">
                          <span className="text-[10px] text-muted-foreground font-sans block">Subtotal</span>
                          <span className="font-semibold text-foreground">${(formSubtotal ?? Math.max(0, formSpendAmount - formTax - formTip + formDiscount)).toFixed(2)}</span>
                        </div>
                        <span className="text-muted-foreground font-bold">+</span>
                        <div className="text-center">
                          <span className="text-[10px] text-muted-foreground font-sans block">Tax</span>
                          <span className="font-semibold text-foreground">${formTax.toFixed(2)}</span>
                        </div>
                        {formTip > 0 && (
                          <>
                            <span className="text-muted-foreground font-bold">+</span>
                            <div className="text-center">
                              <span className="text-[10px] text-muted-foreground font-sans block">Tip</span>
                              <span className="font-semibold text-foreground">${formTip.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {formDiscount > 0 && (
                          <>
                            <span className="text-emerald-600 font-bold">-</span>
                            <div className="text-center">
                              <span className="text-[10px] text-emerald-600 font-sans block">Disc</span>
                              <span className="font-semibold text-emerald-600">${formDiscount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <span className="text-primary font-bold">=</span>
                        <div className="text-center pl-1 border-l border-border/80">
                          <span className="text-[10px] text-primary font-sans font-bold block">After-Tax Total</span>
                          <span className="font-bold text-primary text-sm">${formSpendAmount.toFixed(2)} {formCurrency}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT & EVENT MAPPING */}
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      <span>3. Payment & Event Mapping</span>
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

                      {/* Travel Event Autocomplete Combobox */}
                      <div>
                        <Label className="text-xs font-semibold text-foreground flex items-center justify-between mb-1">
                          <span>Associated Travel Event / Trip <span className="text-destructive">*</span></span>
                          {formEventId && (
                            <button
                              type="button"
                              onClick={() => setFormEventId("")}
                              className="text-[11px] text-muted-foreground hover:text-foreground underline font-normal"
                            >
                              Clear Selection
                            </button>
                          )}
                        </Label>
                        <AutocompleteCombobox
                          value={formEventId}
                          onChange={(val) => setFormEventId(String(val))}
                          options={eventComboboxOptions}
                          placeholder="Search & map expense to event..."
                          className="h-9 text-xs w-full"
                        />
                        <span className="text-[10px] text-muted-foreground block mt-1">
                          Fuzzy search events by title, destination, or date.
                        </span>
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
              {/* Event Filter Autocomplete */}
              <div className="w-56">
                <AutocompleteCombobox
                  value={selectedEventId}
                  onChange={(val) => setSelectedEventId(String(val))}
                  options={[
                    { id: "all", name: "All Trips / Events", badge: "All" },
                    ...eventsList.map((ev: any) => ({
                      id: ev.id || ev.trip_uuid || ev.event_name || "",
                      name: ev.title || ev.event_name || "Corporate Travel Event",
                      sublabel: ev.location,
                      badge: ev.status ? String(ev.status).toUpperCase() : undefined,
                    })),
                  ]}
                  placeholder="Filter by Event..."
                  className="h-9 text-xs"
                />
              </div>

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
                  <table className="w-full text-left text-xs min-w-[880px]">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3 whitespace-nowrap min-w-[240px]">Date & Merchant</th>
                        <th className="p-3 whitespace-nowrap min-w-[180px]">Category & Policy</th>
                        <th className="p-3 whitespace-nowrap min-w-[160px]">Pay Through</th>
                        <th className="p-3 text-right whitespace-nowrap min-w-[140px]">Amount</th>
                        <th className="p-3 text-right whitespace-nowrap min-w-[150px]">To Be Reimbursed</th>
                        <th className="p-3 text-center whitespace-nowrap min-w-[120px]">Attachment</th>
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
                        const hasAttachment = Boolean(rec.file_data || rec.file_name);

                        return (
                          <tr
                            key={rec.id}
                            onClick={() => setSelectedReceiptDetail(rec)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                            title="Click row to view expense details"
                          >
                            {/* Date & Merchant */}
                            <td className="p-3 whitespace-nowrap min-w-[240px]">
                              <div className="font-bold text-foreground text-sm whitespace-nowrap group-hover:text-primary transition-colors">
                                <span className="whitespace-nowrap">{rec.merchant_name}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                <span className="whitespace-nowrap font-medium">{rec.transaction_date ? String(rec.transaction_date).split("T")[0] : ""}</span>
                                {rec.receipt_number && <span className="whitespace-nowrap font-mono">• {rec.receipt_number}</span>}
                                {rec.user_name && <span className="whitespace-nowrap">• {rec.user_name}</span>}
                              </div>
                            </td>

                            {/* Category & Policy */}
                            <td className="p-3 whitespace-nowrap min-w-[180px]">
                              <div className="flex items-center gap-1.5 font-medium text-foreground whitespace-nowrap">
                                <CatIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="whitespace-nowrap">{catMeta.label}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
                                {rec.policy || "Standard Corporate Policy"}
                              </div>
                            </td>

                            {/* Pay Through */}
                            <td className="p-3 whitespace-nowrap min-w-[160px]">
                              <div className="text-foreground font-medium text-xs flex items-center gap-1.5 whitespace-nowrap">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="whitespace-nowrap">{rec.payment_method || "Corporate Card"}</span>
                              </div>
                            </td>

                            {/* Combined Amount (CAD & Original) */}
                            <td className="p-3 text-right whitespace-nowrap min-w-[140px]">
                              <div className="font-mono font-bold text-foreground text-sm whitespace-nowrap">
                                ${cadVal.toFixed(2)} CAD
                              </div>
                              {rec.currency !== "CAD" ? (
                                <div className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                                  ${Number(rec.total_amount).toFixed(2)} {rec.currency}
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                                  CAD Direct
                                </div>
                              )}
                            </td>

                            {/* To Be Reimbursed */}
                            <td className="p-3 text-right whitespace-nowrap min-w-[150px]">
                              {rec.is_reimbursable ? (
                                <div className="whitespace-nowrap">
                                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                    ${cadVal.toFixed(2)} CAD
                                  </div>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Due to Employee
                                  </span>
                                </div>
                              ) : (
                                <div className="whitespace-nowrap">
                                  <span className="font-mono text-muted-foreground text-xs">$0.00 CAD</span>
                                  <span className="text-[10px] text-muted-foreground block">Direct Corp Card</span>
                                </div>
                              )}
                            </td>

                            {/* Attachment Quick View & Download */}
                            <td className="p-3 text-center whitespace-nowrap min-w-[120px]">
                              {hasAttachment ? (
                                <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => openLightbox(rec.file_data || "", rec.file_name || "receipt", rec.file_type || "image/jpeg")}
                                    className="h-7 px-2 text-xs gap-1 font-semibold rounded-lg text-primary border-primary/20 bg-primary/5 hover:bg-primary/15"
                                    title={`View ${rec.file_name || "Receipt Attachment"}`}
                                  >
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span className="font-mono text-[10px] uppercase">
                                      {rec.file_type?.includes("pdf") ? "PDF" : "IMG"}
                                    </span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => handleDownloadAttachment(rec.file_data || "", rec.file_name || "receipt", rec.id)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                                    title="Download Receipt Attachment"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/60">—</span>
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

                        {/* Amount & Reimbursed Strip */}
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              Amount
                            </span>
                            <span className="text-base font-bold font-mono text-foreground">
                              ${cadVal.toFixed(2)} CAD
                            </span>
                            {rec.currency !== "CAD" && (
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                ${Number(rec.total_amount).toFixed(2)} {rec.currency}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                              To Be Reimbursed
                            </span>
                            {rec.is_reimbursable ? (
                              <div>
                                <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 block">
                                  ${cadVal.toFixed(2)} CAD
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  Employee Due
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-mono text-muted-foreground block">$0.00 CAD</span>
                                <span className="text-[10px] text-muted-foreground">Corp Card</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {rec.payment_method}
                          </span>
                          <div className="flex gap-2">
                            {rec.file_data && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLightbox(rec.file_data || "", rec.file_name || "receipt", rec.file_type || "image/jpeg");
                                }}
                                className="text-xs h-7 gap-1"
                              >
                                <Paperclip className="w-3 h-3 text-primary" />
                                <span>Receipt</span>
                              </Button>
                            )}
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
          <DialogTitle className="sr-only">
            {selectedReceiptDetail?.merchant_name ? `Expense Record: ${selectedReceiptDetail.merchant_name}` : "Expense Details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed breakdown of receipt expense, tax amount, and event mapping.
          </DialogDescription>
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

              {/* Hidden file input for attaching a receipt to an existing expense */}
              <input
                ref={detailFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleAttachReceiptToExisting(e.target.files[0]);
                }}
              />

              {/* Two Column Layout for Receipt Document Attachment + Expense Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Receipt Document Attachment with View & Download */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      <span>Receipt Attachment</span>
                    </span>
                    {selectedReceiptDetail.file_type && (
                      <Badge variant="outline" className="text-[10px] font-mono uppercase bg-muted/60">
                        {selectedReceiptDetail.file_type.includes("pdf") ? "PDF" : "Image"}
                      </Badge>
                    )}
                  </div>

                  {selectedReceiptDetail.file_data ? (
                    <div className="space-y-2.5">
                      {/* Attachment Info & Action Strip */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border text-xs gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate text-xs" title={selectedReceiptDetail.file_name || "receipt"}>
                            {selectedReceiptDetail.file_name || "Attached Receipt Document"}
                          </div>
                          {selectedReceiptDetail.file_size_bytes && selectedReceiptDetail.file_size_bytes > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {(selectedReceiptDetail.file_size_bytes / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              openLightbox(
                                selectedReceiptDetail.file_data || "",
                                selectedReceiptDetail.file_name || "receipt",
                                selectedReceiptDetail.file_type || "image/jpeg"
                              )
                            }
                            className="h-7 px-2 text-xs gap-1 rounded-lg"
                            title="Fullscreen View"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>View</span>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() =>
                              handleDownloadAttachment(
                                selectedReceiptDetail.file_data || "",
                                selectedReceiptDetail.file_name || "receipt",
                                selectedReceiptDetail.id
                              )
                            }
                            className="h-7 px-2 text-xs gap-1 rounded-lg font-semibold"
                            title="Download Receipt File"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>

                      {/* Document Viewer Frame */}
                      <div
                        onClick={() =>
                          openLightbox(
                            selectedReceiptDetail.file_data || "",
                            selectedReceiptDetail.file_name || "receipt",
                            selectedReceiptDetail.file_type || "image/jpeg"
                          )
                        }
                        className="w-full h-72 sm:h-80 lg:h-[420px] bg-neutral-900 rounded-2xl overflow-hidden flex items-center justify-center border border-border p-2 cursor-pointer group relative"
                        title="Click to view fullscreen preview"
                      >
                        {selectedReceiptDetail.file_type?.includes("pdf") ? (
                          <div className="w-full h-full relative">
                            <iframe
                              src={selectedReceiptDetail.file_data}
                              className="w-full h-full rounded-xl border-0 pointer-events-none"
                              title="Receipt Document"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                              <span className="px-3 py-1.5 rounded-xl bg-background/90 text-foreground text-xs font-semibold shadow-md flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                                <span>Click to View Fullscreen PDF</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center relative">
                            <img
                              src={
                                selectedReceiptDetail.file_data.startsWith("data:") || selectedReceiptDetail.file_data.startsWith("http")
                                  ? selectedReceiptDetail.file_data
                                  : `data:${selectedReceiptDetail.file_type || "image/jpeg"};base64,${selectedReceiptDetail.file_data}`
                              }
                              alt={selectedReceiptDetail.merchant_name}
                              className="max-h-full max-w-full object-contain rounded-lg transition-transform group-hover:scale-[1.02]"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                              <span className="px-3 py-1.5 rounded-xl bg-background/90 text-foreground text-xs font-semibold shadow-md flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-primary" />
                                <span>Click to Expand Lightbox</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty Attachment State with Quick Attach Action */
                    <div
                      onClick={() => detailFileInputRef.current?.click()}
                      className="w-full h-48 sm:h-64 border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20 flex flex-col items-center justify-center group"
                    >
                      <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all mb-2" />
                      <div className="text-xs font-semibold text-foreground">No Receipt Attached</div>
                      <p className="text-[11px] text-muted-foreground mt-1 mb-3 max-w-[220px]">
                        Attach receipt image or PDF to support expense compliance & auditing.
                      </p>
                      <Button type="button" variant="outline" size="xs" className="text-xs gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Upload & Attach Receipt</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right Column: Key Details, Financial Breakdown & Itemization */}
                <div className={`${selectedReceiptDetail.file_data ? "lg:col-span-7" : "col-span-1"} space-y-4`}>
                  {(() => {
                    const recTotal = Number(selectedReceiptDetail.total_amount) || 0;
                    const recTax = Number(selectedReceiptDetail.tax_amount) || 0;
                    const recTip = Number(selectedReceiptDetail.tip_amount) || 0;
                    const recDiscount = Number(selectedReceiptDetail.discount_amount) || 0;
                    const recSubtotal =
                      selectedReceiptDetail.subtotal_amount !== undefined &&
                      selectedReceiptDetail.subtotal_amount !== null &&
                      Number(selectedReceiptDetail.subtotal_amount) > 0
                        ? Number(selectedReceiptDetail.subtotal_amount)
                        : Math.max(0, recTotal - recTax - recTip + recDiscount);
                    const effectiveTaxRate =
                      recSubtotal > 0 && recTax > 0 ? ((recTax / recSubtotal) * 100).toFixed(1) : null;
                    const cadTotal =
                      Number(selectedReceiptDetail.amount_cad) ||
                      recTotal * (Number(selectedReceiptDetail.exchange_rate) || 1.385);
                    const mappedEvent = eventsList.find((e) => e.id === selectedReceiptDetail.event_id);

                    return (
                      <>
                        {/* 1. Mapped Event Card */}
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                                Mapped Event / Expedition
                              </span>
                              <span className="font-semibold text-foreground text-xs">
                                {mappedEvent
                                  ? mappedEvent.title
                                  : selectedReceiptDetail.event_title || "General Corporate Travel (No Event)"}
                              </span>
                              {mappedEvent && (
                                <span className="text-[11px] text-muted-foreground block">
                                  {mappedEvent.location} • {mappedEvent.start_date} to {mappedEvent.end_date}
                                </span>
                              )}
                            </div>
                          </div>
                          {mappedEvent?.status && (
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {mappedEvent.status}
                            </Badge>
                          )}
                        </div>

                        {/* 2. Elevated Financial Breakdown Ledger (Subtotal, Tax, After-Tax Total) */}
                        <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-primary" />
                              <span>Financial Breakdown</span>
                            </span>
                            {selectedReceiptDetail.currency !== "CAD" && (
                              <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                                1 {selectedReceiptDetail.currency} ≈ {Number(selectedReceiptDetail.exchange_rate || 1.385).toFixed(4)} CAD
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-xs">
                            {/* Pre-Tax Subtotal */}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <span>Pre-Tax Subtotal</span>
                                <span className="text-[10px] text-muted-foreground/80 font-normal">(Net goods & services)</span>
                              </span>
                              <span className="font-mono font-semibold text-foreground text-sm">
                                ${recSubtotal.toFixed(2)} {selectedReceiptDetail.currency}
                              </span>
                            </div>

                            {/* Promotional Discount if applicable */}
                            {recDiscount > 0 && (
                              <div className="flex items-center justify-between py-1 text-emerald-600 dark:text-emerald-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <span>Discount & Promotional Credits</span>
                                  {selectedReceiptDetail.discount_details && (
                                    <span className="text-[10px] font-normal italic">
                                      ({selectedReceiptDetail.discount_details})
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono font-semibold text-sm">
                                  -${recDiscount.toFixed(2)} {selectedReceiptDetail.currency}
                                </span>
                              </div>
                            )}

                            {/* Tax Amount */}
                            <div className="flex items-center justify-between py-1 border-t border-border/40">
                              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                                <span>Taxes (GST / HST / VAT / Sales Tax)</span>
                                {effectiveTaxRate && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/60 text-muted-foreground font-mono">
                                    {effectiveTaxRate}%
                                  </Badge>
                                )}
                              </span>
                              <span className="font-mono font-semibold text-foreground text-sm">
                                +${recTax.toFixed(2)} {selectedReceiptDetail.currency}
                              </span>
                            </div>

                            {/* Tip / Gratuity if applicable */}
                            {recTip > 0 && (
                              <div className="flex items-center justify-between py-1">
                                <span className="text-muted-foreground font-medium">Tip / Gratuity</span>
                                <span className="font-mono font-semibold text-foreground text-sm">
                                  +${recTip.toFixed(2)} {selectedReceiptDetail.currency}
                                </span>
                              </div>
                            )}

                            {/* After-Tax Total (Grand Total) Highlight */}
                            <div className="pt-3 mt-2 border-t-2 border-border/80 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-foreground block">
                                  After-Tax Total (Grand Total)
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Final amount charged to payment method
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-extrabold font-mono text-primary">
                                  ${recTotal.toFixed(2)} {selectedReceiptDetail.currency}
                                </div>
                                {selectedReceiptDetail.currency !== "CAD" && (
                                  <div className="text-[11px] font-mono text-muted-foreground font-medium">
                                    ≈ ${cadTotal.toFixed(2)} CAD
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reimbursable vs Direct Corporate Card Pill */}
                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Reimbursement:</span>
                              {selectedReceiptDetail.is_reimbursable ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Due to Employee (${cadTotal.toFixed(2)} CAD)
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-medium">
                                  Paid via Corporate Card (No Reimbursement)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Accounting & Transaction Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl border border-border">
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
                            <span className="text-muted-foreground block mb-0.5 font-medium">Payment Account</span>
                            <span className="font-semibold text-foreground">
                              {selectedReceiptDetail.payment_method}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">Policy</span>
                            <span className="font-semibold text-foreground truncate block" title={selectedReceiptDetail.policy || ""}>
                              {selectedReceiptDetail.policy || "Standard Policy"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5 font-medium">Submitted By</span>
                            <span className="font-semibold text-foreground truncate block" title={selectedReceiptDetail.user_email || ""}>
                              {selectedReceiptDetail.user_name || "Employee"}
                            </span>
                          </div>
                          {selectedReceiptDetail.attendees && (
                            <div className="col-span-2 sm:col-span-3 pt-1 border-t border-border/40">
                              <span className="text-muted-foreground block mb-0.5 font-medium">Attendees / Participants</span>
                              <span className="font-medium text-foreground">{selectedReceiptDetail.attendees}</span>
                            </div>
                          )}
                        </div>

                        {/* 4. Description / Business Justification */}
                        {selectedReceiptDetail.description && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Purpose</h4>
                            <p className="text-xs text-foreground bg-muted/20 p-3 rounded-xl border border-border">
                              {selectedReceiptDetail.description}
                            </p>
                          </div>
                        )}

                        {/* 5. Itemized Breakdown Table */}
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
                      </>
                    );
                  })()}
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
      {/* ===================== FULLSCREEN LIGHTBOX / PREVIEW MODAL ===================== */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] overflow-hidden p-0 flex flex-col bg-neutral-950 border-neutral-800 text-white">
          <DialogTitle className="sr-only">{lightboxName || "Receipt Attachment Preview"}</DialogTitle>
          <DialogDescription className="sr-only">Receipt preview and attachment viewer</DialogDescription>
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
            <div className="flex items-center gap-2.5 truncate mr-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="font-semibold text-xs sm:text-sm truncate text-white">
                {lightboxName || "Receipt Preview"}
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-neutral-700 bg-neutral-800 text-neutral-300">
                {lightboxType.includes("pdf") ? "PDF" : "Image"}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!lightboxType.includes("pdf") && (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                    className="h-7 w-7 p-0 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[11px] font-mono px-1 text-neutral-400">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setLightboxZoom((z) => Math.min(3.0, z + 0.25))}
                    className="h-7 w-7 p-0 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setLightboxRotate((r) => (r + 90) % 360)}
                    className="h-7 w-7 p-0 text-neutral-300 hover:text-white hover:bg-neutral-800"
                    title="Rotate 90deg"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleDownloadAttachment(lightboxSrc, lightboxName)}
                className="h-7 px-2.5 text-xs gap-1.5 border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setLightboxOpen(false)}
                className="h-7 w-7 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full h-[65vh] sm:h-[75vh] overflow-auto flex items-center justify-center p-4 bg-neutral-950">
            {lightboxType.includes("pdf") ? (
              <iframe
                src={lightboxSrc}
                title="PDF Document Preview"
                className="w-full h-full border-0 rounded-lg bg-neutral-900"
              />
            ) : (
              <img
                src={lightboxSrc}
                alt={lightboxName}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl select-none"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================== BATCH PROCESSING PROGRESS MODAL ===================== */}
      <Dialog open={isBatchProcessing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md text-center p-6 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
            <Layers className="w-6 h-6 text-primary animate-spin" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold">
              Extracting Receipts with AI Vision
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {batchProgressText || `Analyzing ${batchFileCount} uploaded receipts concurrently...`}
            </DialogDescription>
          </div>
          <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>All extracted expenses will be automatically saved with <strong>Draft</strong> status.</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================== BATCH EXTRACTION RESULTS MODAL ===================== */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    Batch Receipts Extracted
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                      {batchCreatedDrafts.length} Saved as Draft
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Multiple receipts were processed with AI vision. Review your newly created Draft expenses below.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* List of Extracted Drafts */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-muted/10">
            {batchCreatedDrafts.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No receipts were successfully extracted in this batch.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {batchCreatedDrafts.map((rec) => {
                  const catMeta = EXPENSE_CATEGORIES.find((c) => c.value === rec.expense_category) || {
                    label: rec.expense_category,
                    icon: Layers,
                  };
                  const CatIcon = catMeta.icon;
                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          {rec.file_data ? (
                            <div
                              onClick={() => openLightbox(rec.file_data || "", rec.file_name || "receipt", rec.file_type || "")}
                              className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-muted/40 cursor-pointer shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <img src={rec.file_data} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0 text-muted-foreground">
                              <Receipt className="w-5 h-5" />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs text-foreground truncate max-w-[160px]">
                              {rec.merchant_name || "Unknown Merchant"}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{rec.transaction_date || "No date"}</span>
                              {rec.receipt_number && (
                                <span className="font-mono text-[10px] text-muted-foreground">· {rec.receipt_number}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                                <CatIcon className="w-3 h-3 text-primary" />
                                <span>{catMeta.label}</span>
                              </Badge>
                              <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] px-1.5 py-0 font-medium">
                                Draft
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm text-foreground">
                            ${Number(rec.total_amount).toFixed(2)}{" "}
                            <span className="text-[10px] font-semibold text-muted-foreground">{rec.currency}</span>
                          </div>
                          {rec.currency !== "CAD" && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ≈ ${Number(rec.amount_cad || 0).toFixed(2)} CAD
                            </div>
                          )}
                          {((rec.discount_amount && Number(rec.discount_amount) > 0) || (rec.extraction_metadata?.discount_amount && Number(rec.extraction_metadata?.discount_amount) > 0)) && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                              Disc: -${Number(rec.discount_amount || rec.extraction_metadata?.discount_amount || 0).toFixed(2)}
                            </div>
                          )}
                          {rec.tax_amount > 0 && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Tax: ${Number(rec.tax_amount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {rec.line_items?.length || 0} line item{rec.line_items?.length === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setIsBatchModalOpen(false);
                              setSelectedReceiptDetail(rec);
                            }}
                            className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View / Edit</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {batchErrors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl space-y-1 text-xs">
                <div className="font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Some files could not be extracted ({batchErrors.length}):</span>
                </div>
                <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
                  {batchErrors.map((err, idx) => (
                    <li key={idx}>
                      <span className="font-medium text-foreground">{err.file_name}</span>: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                batchFileInputRef.current?.click();
              }}
              className="text-xs gap-1.5 w-full sm:w-auto"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload More Receipts</span>
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => {
                  setStatusFilter("draft");
                  setActiveTab("list");
                  setIsBatchModalOpen(false);
                }}
                className="text-xs gap-1.5 w-full sm:w-auto font-semibold"
              >
                <span>View All Draft Expenses</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
