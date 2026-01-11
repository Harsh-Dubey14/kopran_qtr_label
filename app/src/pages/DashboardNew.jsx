import {
  Box,
  Heading,
  Button,
  Input,
  Flex,
  HStack,
  Text,
  useToast,
  Image,
  Spinner,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  Select,
  IconButton,
  useColorModeValue,
  VStack,
  useBreakpointValue,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  ButtonGroup,
  Tooltip,
  Progress,
} from "@chakra-ui/react";
import {
  Calendar1,
  CalendarDaysIcon,
  Download,
  FileSpreadsheet,
  SearchIcon,
  Undo,
} from "lucide-react";
import * as XLSX from "xlsx";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { BASE, fetchgetMaterialDocumentItem } from "../api/api";
import InvoiceTable from "../components/InvoiceTable";
import { pdf } from "@react-pdf/renderer";
import axios from "axios";
import { keyframes } from "@emotion/react";
import QRCode from "qrcode";

import ExportInvoicePDFViewReplicaV2 from "../components/ExportInvoicePDFViewReplicaV2";
import DomesticExportInvoicePdfViewV1 from "../components/DomesticExportInvoicePdfViewV1";
import { useColorMode } from "@chakra-ui/react";
import TaxInvoicePdfViewV2 from "../components/TaxInvoicePdfViewV2";

const pulseRotate = keyframes`
  0% { transform: scale(0.9) rotate(0deg); opacity: 0.6; }
  50% { transform: scale(1.1) rotate(180deg); opacity: 1; }
  100% { transform: scale(0.9) rotate(360deg); opacity: 0.6; }
`;

const ENV_BG = { production: "green.50", uat: "orange.50", default: "blue.50" };
const ENV_FG = {
  production: "green.700",
  uat: "orange.700",
  default: "blue.700",
};
const ENV_BORDER = {
  production: "green.200",
  uat: "orange.200",
  default: "blue.200",
};

const isProd = () => process.env.NODE_ENV === "production";
const debug = (...args) => {
  if (!isProd()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

const COLOR_MODE_STORAGE_KEY = "merit_color_mode";
const SEARCH_HISTORY_KEY = "merit_search_history_v1"; // localStorage key for search history
const MAX_HISTORY = 5;
// storage key (keep stable)
const TEMPLATE_VERSION_KEY = "merit_template_version_v1";

// default template
const XLSX_OMIT_COLUMNS = new Set(["MetadataId", "MetadataURI", "ETag"]);

// Brand color palette
const BRAND_TEAL = "#008A87";
const BRAND_PURPLE = "#5A3C9C";
const BRAND_NAVY = "#0A163B";

const TEMPLATE_DEFAULT = "v2"; // valid values: "auto", "v1", "v2"
const savedTemplateVersion =
  typeof window !== "undefined"
    ? localStorage.getItem(TEMPLATE_VERSION_KEY)
    : null;
const initialTemplateVersion =
  savedTemplateVersion === "auto" ||
  savedTemplateVersion === "v1" ||
  savedTemplateVersion === "v2"
    ? savedTemplateVersion
    : TEMPLATE_DEFAULT;

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // const [selectedID, setSelectedID] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("20");
  const toast = useToast();
  const [isPreviewLoading, setPreviewLoading] = useState(false);
  const [isPrintLoading, setPrintLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [deploymentEnv, setDeploymentEnv] = useState("");
  const [ setExcelLoading] = useState(false);
  const [templateVersion] = useState(
    initialTemplateVersion
  );
  const [tableLoading, setTableLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); // Start loader immediately
    axios
      .get(`${BASE}/env`)
      .then((res) => {
        if (!cancelled) setDeploymentEnv(res.data.env);
      })
      .catch((err) => {
        debug("Failed to fetch environment", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false); // Hide loader after response
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Chakra color mode (must be called unconditionally)
  const { colorMode, toggleColorMode, setColorMode } = useColorMode();

  // --- IMPORTANT FIX: call useColorModeValue unconditionally here and stash results ---
  const surfaceBg = useColorModeValue("white", "gray.700");
  const filterInputBg = useColorModeValue("gray.50", "gray.600");
  const filterBorderColor = useColorModeValue("gray.200", "gray.600");
  const placeholderColor = useColorModeValue("gray.500", "gray.300");
  const tableBg = useColorModeValue("gray.50", "#2D3748");
  const historyBoxBg = useColorModeValue("white", "gray.700");
  const historyHeaderBg = useColorModeValue("gray.50", "gray.600");
  const historyBorderBottomColor = useColorModeValue("gray.100", "gray.600");
  const historyItemHoverBg = useColorModeValue("gray.100", "gray.600");
  const mutedTextColor = useColorModeValue("gray.500", "gray.300");

  // Header theming + responsiveness
  const headerBg = useColorModeValue("white", "gray.800");
  const headerBorder = useColorModeValue("gray.200", "gray.700");
  const titleColor = useColorModeValue("gray.800", "white");
  const isMobile = useBreakpointValue({ base: true, md: false });
  // Progress bar background (use hook unconditionally)
  const progressBg = useColorModeValue("#E6F7F6", "#1A223B");

  // -------------------------------------------------------------------------------

  // Sidebar preview state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewMeta, setPreviewMeta] = useState({
    id: undefined,
    title: undefined,
  });
  const lastObjectUrlRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");

  // --- Search history state ---
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistoryBox, setShowHistoryBox] = useState(false);
  const inputWrapperRef = useRef(null);

  // inside Dashboard() near other useState declarations:

  // add a useEffect to persist changes
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(TEMPLATE_VERSION_KEY, templateVersion);
      }
    } catch (e) {
      debug("Failed to persist templateVersion", e);
    }
  }, [templateVersion]);

  // Load saved color mode on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        // only call if different to avoid unnecessary renders
        if (saved !== colorMode) setColorMode(saved);
      }
    } catch (e) {
      debug("Failed to read saved color mode", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Persist color mode whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
    } catch (e) {
      debug("Failed to persist color mode", e);
    }
  }, [colorMode]);

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSearchHistory(parsed);
      }
    } catch (e) {
      debug("Failed to load search history", e);
    }
  }, []);

  // Utility: persist history array
  const persistHistory = (arr) => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(arr));
    } catch (e) {
      debug("Failed to persist history", e);
    }
  };

  // Add a term to history (most recent first, unique, limit MAX_HISTORY)
  const pushSearchHistory = (term) => {
    const t = (term ?? "").trim();
    if (!t) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((x) => x.toLowerCase() !== t.toLowerCase());
      const updated = [t, ...filtered].slice(0, MAX_HISTORY);
      persistHistory(updated);
      return updated;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
      debug("Failed to clear search history", e);
    }
  };

  // Click outside to hide history box
  useEffect(() => {
    const handler = (ev) => {
      if (!inputWrapperRef.current) return;
      if (!inputWrapperRef.current.contains(ev.target)) {
        setShowHistoryBox(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(0); // Reset progress
    let cancelled = false;
    let progressInterval; // Declare progressInterval outside the try block

    try {
      progressInterval = setInterval(() => {
        setLoadingProgress((prev) => Math.min(prev + 10, 90)); // Increment progress
      }, 500);

      const res = await fetchgetMaterialDocumentItem();

      if (!cancelled) {
        clearInterval(progressInterval); // Clear progress interval
        setLoadingProgress(100); // Set progress to 100% on success

        if (res?.payloadLength) {
          console.log(`Payload length: ${res.payloadLength}`);
        }

        setData(Array.isArray(res?.data) ? res.data : []);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error("Error loading documents:", e);
      toast({ title: "Failed to load data", status: "error" });
    } finally {
      if (progressInterval) clearInterval(progressInterval); // Ensure interval is cleared
      if (!cancelled) {
        setLoading(false);
        setLoadingProgress(0); // Reset progress on completion
      }
    }
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    // call and also return its cleanup if provided
    const cleanup = loadDocs();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [loadDocs]);

  const generateQrImage = useCallback(async (text) => {
    try {
      const t = (text ?? "").trim();
      if (!t) return null;
      return await QRCode.toDataURL(t);
    } catch (err) {
      debug("QR generation failed", err);
      return null;
    }
  }, []);

  const buildInvoiceBlob = useCallback(
    async (invoiceData, templateChoice = templateVersion) => {
      let blob = null;
      const metaTitle = invoiceData?.title || invoiceData?.type || "Invoice";

      try {
        // pick QR from whichever payload exists (tax preferred)
        const qrSource =
          (
            invoiceData?.generateTaxInvoiceData?.document?.einvoiceSignedQr ||
            ""
          ).trim() ||
          (
            invoiceData?.generateExportInvoiceData?.document
              ?.einvoiceSignedQr || ""
          ).trim() ||
          "";

        const qrBase64 = qrSource ? await generateQrImage(qrSource) : null;

        const isTaxType =
          invoiceData?.type === "TAX INVOICE" ||
          invoiceData?.type === "JOB WORK TAX INVOICE" ||
          !!invoiceData?.generateTaxInvoiceData;

        // helper to render component with chosen payload
        const renderPdfToBlob = async (Component, payload) => {
          if (!payload) return null;
          return await pdf(
            <Component data={payload} qrImage={qrBase64} />
          ).toBlob();
        };

        // Decide which component + payload to use
        if (isTaxType) {
          // tax invoice flow (both templates are domestic/tax)
          if (templateChoice === "v1") {
            // v1 -> TaxInvoicePdfViewV2
            if (!invoiceData?.generateTaxInvoiceData) {
              toast({
                title: "Payload missing for chosen template",
                description:
                  "Tax payload not present — falling back to available data.",
                status: "warning",
                duration: 3000,
                isClosable: true,
              });
            }
            blob =
              (await renderPdfToBlob(
                TaxInvoicePdfViewV2,
                invoiceData?.generateTaxInvoiceData ||
                  invoiceData?.generateExportInvoiceData
              )) || null;
          } else if (templateChoice === "v2") {
            // v2 -> DomesticExportInvoicePdfViewV1
            if (!invoiceData?.generateTaxInvoiceData) {
              toast({
                title: "Payload missing for chosen template",
                description:
                  "Tax payload not present — falling back to available data.",
                status: "warning",
                duration: 3000,
                isClosable: true,
              });
            }
            blob =
              (await renderPdfToBlob(
                DomesticExportInvoicePdfViewV1,
                invoiceData?.generateTaxInvoiceData ||
                  invoiceData?.generateExportInvoiceData
              )) || null;
          } else {
            // auto: prefer TaxInvoicePdfViewV2 if tax payload exists, else fallback
            if (invoiceData?.generateTaxInvoiceData) {
              blob = await renderPdfToBlob(
                TaxInvoicePdfViewV2,
                invoiceData.generateTaxInvoiceData
              );
            } else if (invoiceData?.generateExportInvoiceData) {
              blob = await renderPdfToBlob(
                DomesticExportInvoicePdfViewV1,
                invoiceData.generateExportInvoiceData
              );
            } else {
              toast({
                title: "No invoice payload found",
                description: "Cannot render PDF — no payload present.",
                status: "error",
                duration: 4000,
                isClosable: true,
              });
              return { blob: null, metaTitle };
            }
          }
        } else {
          // export or other -> use ExportInvoicePDFViewReplicaV2 (existing behavior)
          if (!invoiceData?.generateExportInvoiceData) {
            toast({
              title: "No export payload",
              description: "Export payload not found to render export invoice.",
              status: "error",
              duration: 4000,
              isClosable: true,
            });
            return { blob: null, metaTitle };
          }
          blob = await renderPdfToBlob(
            ExportInvoicePDFViewReplicaV2,
            invoiceData.generateExportInvoiceData
          );
        }

        if (!blob) {
          // Safety: if still null, warn
          toast({
            title: "Failed to build PDF",
            description: "Unexpected error while creating PDF blob.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }

        return { blob, metaTitle };
      } catch (err) {
        console.error("buildInvoiceBlob error:", err);
        toast({
          title: "Error generating PDF",
          description: err?.message || "Unexpected error.",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        return { blob: null, metaTitle };
      }
    },
    // IMPORTANT: include templateVersion (and toast, generateQrImage) so default arg and closures stay current
    [generateQrImage, templateVersion, toast]
  );

  // Progress tracking utilities
  const startProgressTracking = useCallback((isPreview = true) => {
    setLoadingProgress(0);
    const interval = setInterval(
      () => {
        setLoadingProgress((prev) => {
          if (prev < 60) {
            const increment = isPreview
              ? Math.random() * 15 + 5
              : Math.random() * 12 + 3;
            return Math.min(prev + increment, 60);
          }
          return prev;
        });
      },
      isPreview ? 200 : 250
    );
    return interval;
  }, []);

  const setProgressStage = useCallback((stage, delay = 0) => {
    setTimeout(() => {
      setLoadingProgress(stage);
    }, delay);
  }, []);

  const completeProgress = useCallback(() => {
    setProgressStage(100, 100);
    setTimeout(() => {
      setLoadingProgress(0);
    }, 1000);
  }, [setProgressStage]);

  const handlePreview = useCallback(
    async (billingDocumentId) => {
      // Always send as array for bulk and single
      const ids = Array.isArray(billingDocumentId)
        ? billingDocumentId
        : [billingDocumentId];
      setPreviewLoading(true);
      const progressInterval = startProgressTracking(true);
      const start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        console.log("Preview: Sending MaterialDocuments:", ids);
        const isBulk =
          Array.isArray(billingDocumentId) && billingDocumentId.length > 1;
        const response = await axios.post(
          `${BASE}/getMaterialDocumentDetails`,
          {
            MaterialDocuments: ids,
          }
        );

        // API response received - update to 75%
        clearInterval(progressInterval);
        setProgressStage(75, 0);

        const apiResponse = response.data;
        if (apiResponse.res !== "success" || !apiResponse.data) {
          toast({ title: "Invalid API response.", status: "error" });
          return;
        }

        const invoiceDataArray = apiResponse.data;

        if (isBulk) {
          // For bulk, generate and open multiple previews
          for (const invoiceData of invoiceDataArray) {
            if (
              !invoiceData ||
              (!invoiceData.generateTaxInvoiceData &&
                !invoiceData?.generateExportInvoiceData)
            ) {
              continue;
            }

            const { blob} = await buildInvoiceBlob(invoiceData);
            if (!blob) continue;

            const url = URL.createObjectURL(blob);
            // Open in new tab
            window.open(url, "_blank");
          }

          toast({
            title: "Bulk previews opened",
            description: `${invoiceDataArray.length} invoices opened in new tabs`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          // Single preview
          const invoiceData = invoiceDataArray[0];
          if (
            !invoiceData ||
            (!invoiceData.generateTaxInvoiceData &&
              !invoiceData?.generateExportInvoiceData)
          ) {
            toast({ title: "Invalid invoice data received.", status: "error" });
            return;
          }

          const { blob, metaTitle } = await buildInvoiceBlob(invoiceData);
          if (!blob) throw new Error("Failed to create PDF blob");

          // PDF blob created - update to 95%
          setProgressStage(95, 100);

          // revoke previous
          if (lastObjectUrlRef.current) {
            URL.revokeObjectURL(lastObjectUrlRef.current);
            lastObjectUrlRef.current = null;
          }

          const url = URL.createObjectURL(blob);
          lastObjectUrlRef.current = url;
          setPreviewUrl(url);
          setPreviewMeta({ id: billingDocumentId, title: metaTitle });
          onOpen();

          // Complete progress
          completeProgress();

          // success timing
          const end =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const elapsedMs = end - start;
          toast({
            title: "Preview ready",
            description: `${metaTitle} (${billingDocumentId}) — ${(
              elapsedMs / 1000
            ).toFixed(2)}s`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.log({ error });
        clearInterval(progressInterval);
        setLoadingProgress(0);
        toast({
          title: "Failed to generate invoice preview.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [
      buildInvoiceBlob,
      onOpen,
      toast,
      startProgressTracking,
      setProgressStage,
      completeProgress,
    ]
  );

  const handlePrint = useCallback(
    async (billingDocumentId) => {
      // Always send as array for bulk and single
      const ids = Array.isArray(billingDocumentId)
        ? billingDocumentId
        : [billingDocumentId];
      setPrintLoading(true);
      const progressInterval = startProgressTracking(false);
      const start =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      try {
        console.log("Print: Sending MaterialDocuments:", ids);
        const isBulk =
          Array.isArray(billingDocumentId) && billingDocumentId.length > 1;
        const response = await axios.post(
          `${BASE}/getMaterialDocumentDetails`,
          {
            MaterialDocuments: ids,
          }
        );

        // API response received - update to 65%
        clearInterval(progressInterval);
        setProgressStage(65, 0);

        const apiResponse = response.data;
        if (apiResponse.res !== "success" || !apiResponse.data) {
          throw new Error("Invalid API response");
        }

        const invoiceDataArray = apiResponse.data;

        if (isBulk) {
          // For bulk, download multiple PDFs
          for (let i = 0; i < invoiceDataArray.length; i++) {
            const invoiceData = invoiceDataArray[i];
            if (
              !invoiceData ||
              (!invoiceData.generateTaxInvoiceData &&
                !invoiceData.generateExportInvoiceData)
            ) {
              continue;
            }

            const { blob } = await buildInvoiceBlob(invoiceData);
            if (!blob) continue;

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Billing No ${
              billingDocumentId[i] || `Doc${i + 1}`
            }.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }

          toast({
            title: "Bulk downloads started",
            description: `${invoiceDataArray.length} PDFs downloaded`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          // Single print
          const invoiceData = invoiceDataArray[0];
          if (
            !invoiceData ||
            (!invoiceData.generateTaxInvoiceData &&
              !invoiceData.generateExportInvoiceData)
          ) {
            throw new Error("Incomplete invoice data received");
          }

          const { blob } = await buildInvoiceBlob(invoiceData);
          if (!blob) throw new Error("Failed to create PDF blob");

          // PDF blob created - update to 85%
          setProgressStage(85, 100);

          const url = URL.createObjectURL(blob);

          // File URL created - update to 95%
          setProgressStage(95, 100);
          const link = document.createElement("a");
          link.href = url;
          link.download = `Billing No ${billingDocumentId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Download started - complete progress
          completeProgress();

          const end =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const elapsedMs = end - start;
          toast({
            title: "Downloaded",
            description: `Billing No ${billingDocumentId}.pdf — ${(
              elapsedMs / 1000
            ).toFixed(2)}s`,
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        clearInterval(progressInterval);
        setLoadingProgress(0);
        toast({
          title: "Failed to download invoice.",
          description: error?.message || "Unexpected error occurred.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setPrintLoading(false);
      }
    },
    [
      buildInvoiceBlob,
      toast,
      startProgressTracking,
      setProgressStage,
      completeProgress,
    ]
  );

  const closePreview = useCallback(() => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewMeta({});
    onClose();
  }, [onClose]);

  // Derived data via useMemo (solves react-hooks/exhaustive-deps noise)
  const filteredData = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return data.filter((doc) => {
      const docDate = String(doc.BillingDocumentDate || "").substring(0, 10);
      const inDateRange = (!from || docDate >= from) && (!to || docDate <= to);

      const matchesSearch =
        !search ||
        Object.values(doc).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(search)
        );

      return matchesSearch && inDateRange;
    });
  }, [data, from, to, searchTerm]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === "all") {
      return 1;
    }
    const rp = Number(rowsPerPage);
    return Math.max(1, Math.ceil(filteredData.length / rp));
  }, [filteredData, rowsPerPage]);

  const currentPageData = useMemo(() => {
    if (rowsPerPage === "all") {
      return filteredData;
    }
    const rp = Number(rowsPerPage);
    const indexOfLast = currentPage * rp;
    const indexOfFirst = indexOfLast - rp;
    return filteredData.slice(indexOfFirst, indexOfLast);
  }, [filteredData, currentPage, rowsPerPage]);

  const handleExportExcel = useCallback(
    (scope = "filtered") => {
      setExcelLoading(true);
      try {
        const rows = scope === "page" ? currentPageData : filteredData;
        if (!rows || rows.length === 0) {
          toast({ title: "No rows to export", status: "info", duration: 2500 });
          return;
        }

        const serialize = (obj) => {
          const entries = Object.entries(obj || {}).filter(
            ([k]) => !XLSX_OMIT_COLUMNS.has(k)
          );
          return Object.fromEntries(
            entries.map(([k, v]) => [
              k,
              typeof v === "object" && v !== null ? JSON.stringify(v) : v,
            ])
          );
        };

        const dataForXlsx = rows.map(serialize);
        const ws = XLSX.utils.json_to_sheet(dataForXlsx, { skipHeader: false });

        const colWidths = Object.keys(dataForXlsx[0] || {}).map((key) => ({
          wch:
            Math.max(
              key.length,
              ...dataForXlsx.map((r) => String(r[key] ?? "").length)
            ) + 2,
        }));
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");

        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const datePart = (from ? `from_${from}` : "") + (to ? `_to_${to}` : "");
        const scopePart = scope === "page" ? "page" : "filtered";
        const filename = `invoices_${scopePart}${
          datePart ? "_" + datePart : ""
        }_${ts}.xlsx`;

        XLSX.writeFile(wb, filename);
      } catch (e) {
        debug(e);
        toast({
          title: "Excel export failed",
          description: e?.message || "Unexpected error.",
          status: "error",
        });
      } finally {
        setExcelLoading(false);
      }
    },
    // [currentPageData, filteredData, from, to, toast]
  );

  // Reset page to 1 if filters change and current page overflows
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Handle table loading for large datasets
  useEffect(() => {
    if (rowsPerPage === "all" && filteredData.length > 1000) {
      setTableLoading(true);
      const timer = setTimeout(() => setTableLoading(false), 500);
      return () => clearTimeout(timer);
    } else {
      setTableLoading(false);
    }
  }, [rowsPerPage, filteredData.length]);

  const envKey = (deploymentEnv || "").toLowerCase();
  const bg = ENV_BG[envKey] || ENV_BG.default;
  const fg = ENV_FG[envKey] || ENV_FG.default;
  const bd = ENV_BORDER[envKey] || ENV_BORDER.default;
  const animate = envKey !== "production" ? "pulse 2s infinite" : "none";

  // --- Handlers related to search UI ---
  const onApplyHistoryTerm = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
    // optional: push the term again to put it at top
    pushSearchHistory(term);
    // you may want to refresh data or let the user click Go — your current code filters client-side so updates are immediate
    setShowHistoryBox(false);
  };

  const onGoClicked = () => {
    if (searchTerm && searchTerm.trim() !== "") pushSearchHistory(searchTerm);
    setCurrentPage(1);
    loadDocs(); // keep existing behavior
  };

  // handle Enter key in the search input
  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      if (searchTerm && searchTerm.trim() !== "") pushSearchHistory(searchTerm);
      setCurrentPage(1);
      loadDocs();
      // prevent form submission if any
      e.preventDefault();
      setShowHistoryBox(false);
    }
  };
  // ----------------------------------------
  // Quick date helpers
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const applyQuickDate = (mode) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (mode === "today") {
      const ymd = toYMD(today);
      setFrom(ymd);
      setTo(ymd);
    } else {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setFrom(toYMD(monthStart));
      setTo(toYMD(today));
    }
    setCurrentPage(1);
  };
  // ----------------------------------------

  // Bulk selection state for InvoiceTable
  const [selectedIDs, setSelectedIDs] = useState([]);

  // Bulk preview handler
  const handleBulkPreview = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    // Send all selected IDs for bulk preview
    await handlePreview(ids);
  };

  // Bulk print handler
  const handleBulkPrint = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    // Send all selected IDs for bulk print
    await handlePrint(ids);
  };

  return (
    <Box p={0}>
      {/* Header */}
      {/* Header */}
      {/* Header */}
      <Box
        mb={4}
        px={{ base: 3, md: 4 }}
        py={{ base: 2, md: 3 }}
        bg={headerBg}
        border="1px solid"
        borderColor={headerBorder}
        rounded="2xl"
        boxShadow="sm"
      >
        {/* Top row (mobile): env pill left, theme toggle right */}
        <Flex
          display={{ base: "flex", md: "none" }}
          w="100%"
          align="center"
          justify="space-between"
          mb={2}
          gap={2}
        >
          {deploymentEnv ? (
            <Box
              as="span"
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={3}
              py={1}
              bg={bg}
              color={fg}
              fontSize="xs"
              rounded="full"
              fontWeight="semibold"
              border="1px solid"
              borderColor={bd}
              animation={animate}
              sx={{
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(0,0,0,0.2)" },
                  "70%": { boxShadow: "0 0 0 6px rgba(0,0,0,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
                },
              }}
            >
              <Box boxSize="6px" rounded="full" bg={fg} opacity={0.9} />
              {deploymentEnv.toUpperCase()}
            </Box>
          ) : (
            <Box />
          )}

          <IconButton
            aria-label="Toggle color mode"
            size="sm"
            variant="ghost"
            onClick={toggleColorMode}
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          />
        </Flex>

        {/* Title row (centered, truncates safely) */}
        <HStack spacing={{ base: 2, md: 3 }} w="100%" minW={0} justify="center">
          <Image
            src="/kopran_logo.png"
            alt="Logo"
            width={{ base: "28px", md: "40px" }}
            height={{ base: "28px", md: "40px" }}
            objectFit="contain"
            borderRadius="md"
            flexShrink={0}
          />
          <Heading
            as="h1"
            fontSize={{ base: "md", md: "lg" }}
            fontWeight="semibold"
            color={titleColor}
            letterSpacing="tight"
            noOfLines={1}
            maxW="100%"
          >
            QUARANTINE LABEL
          </Heading>
        </HStack>

        {/* Bottom row (desktop): env left, toggle right */}
        <Flex
          display={{ base: "none", md: "flex" }}
          mt={3}
          w="100%"
          align="center"
          justify="space-between"
        >
          {deploymentEnv ? (
            <Box
              as="span"
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={3}
              py={1}
              bg={bg}
              color={fg}
              fontSize="xs"
              rounded="full"
              fontWeight="semibold"
              border="1px solid"
              borderColor={bd}
              animation={animate}
              sx={{
                "@keyframes pulse": {
                  "0%": { boxShadow: "0 0 0 0 rgba(0,0,0,0.2)" },
                  "70%": { boxShadow: "0 0 0 6px rgba(0,0,0,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(0,0,0,0)" },
                },
              }}
            >
              <Box boxSize="6px" rounded="full" bg={fg} opacity={0.9} />
              {deploymentEnv.toUpperCase()}
            </Box>
          ) : (
            <Box />
          )}

          <IconButton
            aria-label="Toggle color mode"
            size="sm"
            variant="ghost"
            onClick={toggleColorMode}
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          />
        </Flex>
      </Box>

      {/* Filters */}
      {/* Filters (themed for light/dark) */}

      <Box
        bg={surfaceBg}
        p={{ base: 3, md: 4 }}
        rounded="2xl"
        mb={4}
        boxShadow="sm"
        border="1px solid"
        borderColor={filterBorderColor}
      >
        <SimpleGrid
          columns={{ base: 1, md: 3, lg: 4 }}
          spacing={{ base: 3, md: 4 }}
          alignItems="center"
        >
          {/* Search */}
          <Box ref={inputWrapperRef} position="relative" w="100%">
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <SearchIcon color={placeholderColor} />
              </InputLeftElement>
              <Input
                placeholder="Search all fields"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setShowHistoryBox(true);
                }}
                onFocus={() => {
                  if (searchHistory.length > 0) setShowHistoryBox(true);
                }}
                onBlur={() => {
                  if (searchTerm && searchTerm.trim() !== "") {
                    pushSearchHistory(searchTerm);
                  }
                  setShowHistoryBox(false);
                }}
                onKeyDown={onSearchKeyDown}
                bg={filterInputBg}
                borderColor={filterBorderColor}
                _placeholder={{ color: placeholderColor }}
                _focus={{ borderColor: "blue.400", boxShadow: "none" }}
              />
            </InputGroup>

            {/* History dropdown */}
            {showHistoryBox && searchHistory.length > 0 && (
              <Box
                position="absolute"
                zIndex={30}
                mt={2}
                left={0}
                right={0}
                bg={historyBoxBg}
                border="1px solid"
                borderColor={filterBorderColor}
                boxShadow="sm"
                rounded="md"
                overflow="hidden"
              >
                <Flex
                  justify="space-between"
                  align="center"
                  px={3}
                  py={2}
                  borderBottom="1px solid"
                  borderBottomColor={historyBorderBottomColor}
                  bg={historyHeaderBg}
                >
                  <Text fontSize="sm" fontWeight="semibold">
                    Recent searches
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSearchHistory();
                    }}
                  >
                    Clear
                  </Button>
                </Flex>

                <VStack
                  align="stretch"
                  spacing={0}
                  maxH="220px"
                  overflowY="auto"
                >
                  {searchHistory.map((term, idx) => (
                    <Box
                      key={`${term}-${idx}`}
                      px={3}
                      py={2}
                      _hover={{ bg: historyItemHoverBg }}
                      cursor="pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onApplyHistoryTerm(term);
                      }}
                    >
                      <Text fontSize="sm" noOfLines={1}>
                        {term}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>

          {/* From date */}
          <Input
            size="sm"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setCurrentPage(1);
            }}
            maxW="100%"
            bg={filterInputBg}
            borderColor={filterBorderColor}
            _focus={{ borderColor: "blue.400", boxShadow: "none" }}
          />

          {/* To date */}
          <Input
            size="sm"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setCurrentPage(1);
            }}
            maxW="100%"
            bg={filterInputBg}
            borderColor={filterBorderColor}
            _focus={{ borderColor: "blue.400", boxShadow: "none" }}
          />

          {/* Quick range + actions */}
          <HStack justify={{ base: "flex-start", md: "flex-end" }} spacing={2}>
            <ButtonGroup isAttached size="sm" variant="ghost">
              <Tooltip label="Set From/To to today">
                <Button onClick={() => applyQuickDate("today")}>
                  <Calendar1 />
                </Button>
              </Tooltip>
              <Tooltip label="Set From to 1st of this month, To to today">
                <Button onClick={() => applyQuickDate("month")}>
                  {" "}
                  <CalendarDaysIcon />
                </Button>
              </Tooltip>
            </ButtonGroup>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFrom("");
                setTo("");
                setCurrentPage(1);
              }}
            >
              <Undo />
            </Button>

            <Button
              size="sm"
              colorScheme="teal"
              bg={BRAND_TEAL}
              color="white"
              _hover={{ bg: BRAND_PURPLE }}
              onClick={onGoClicked}
            >
              Go
            </Button>

            <Tooltip label="Export all filtered rows">
              <Button
                size="sm"
                colorScheme="purple"
                bg={BRAND_PURPLE}
                color="white"
                _hover={{ bg: BRAND_TEAL }}
                onClick={() => handleExportExcel("filtered")}
                aria-label="Export Excel"
              >
                <FileSpreadsheet size={12} />
                {!isMobile && <Box as="span" ml={0}></Box>}
              </Button>
            </Tooltip>

            {/* <Box maxW="180px" w={{ base: "140px", md: "180px" }}>
            <Select
              size="sm"
              value={templateVersion}
              onChange={(e) => setTemplateVersion(e.target.value)}
              title="Choose PDF template"
            >
              <option value="auto">Auto</option>
              <option value="v1">Legacy</option>
              <option value="v2">New</option>
            </Select>
          </Box> */}
          </HStack>
        </SimpleGrid>
      </Box>

      {/* Global Progress Overlay */}
      {(isPreviewLoading || isPrintLoading) && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          backdropFilter="blur(8px)"
          zIndex="overlay"
          display="flex"
          alignItems="center"
          justifyContent="center"
          animation="fadeIn 0.2s ease-out"
          sx={{
            "@keyframes fadeIn": {
              "0%": { opacity: 0 },
              "100%": { opacity: 1 },
            },
          }}
        >
          <Box
            bg={surfaceBg}
            p={10}
            rounded="3xl"
            shadow="2xl"
            minW="380px"
            maxW="420px"
            mx={4}
            border="1px solid"
            borderColor={colorMode === "light" ? "blue.100" : "blue.700"}
            position="relative"
            overflow="hidden"
            _before={{
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              bgGradient: "linear(to-r, blue.400, purple.500, pink.400)",
            }}
          >
            <VStack spacing={6}>
              {/* Enhanced Icon with Gradient Background */}
              <Box position="relative"></Box>

              {/* Content */}
              <VStack spacing={3}>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color={titleColor}
                  textAlign="center"
                  letterSpacing="wide"
                >
                  {isPreviewLoading
                    ? "Generating Preview"
                    : "Preparing Download"}
                </Text>

                {/* Large Percentage Display */}
                <Text
                  fontSize="4xl"
                  fontWeight="black"
                  bgGradient="linear(45deg, blue.400, purple.500)"
                  bgClip="text"
                  textAlign="center"
                  lineHeight={1}
                >
                  {Math.round(loadingProgress)}%
                </Text>
              </VStack>

              {/* Enhanced Progress Bar */}
              <Box w="100%" position="relative">
                <Progress
                  value={loadingProgress}
                  size="lg"
                  hasStripe
                  isAnimated
                  rounded="full"
                  transition="all 0.3s ease"
                  bg={progressBg}
                  sx={{
                    "& > div": {
                      bgGradient: `linear(to-r, ${BRAND_TEAL}, ${BRAND_PURPLE}, ${BRAND_NAVY})`,
                    },
                  }}
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  rounded="full"
                  boxShadow="inset 0 1px 2px rgba(0,0,0,0.1)"
                  pointerEvents="none"
                />
              </Box>

              {/* Status Text */}
              <Text
                fontSize="sm"
                color={mutedTextColor}
                textAlign="center"
                fontWeight="medium"
              >
                Please wait while we process your request
              </Text>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Table / Empty / Loader */}
      {loading ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          mt={20}
          gap={4}
        >
          <Box
            boxSize="40px"
            rounded="2xl"
            bg={colorMode === "light" ? "purple.500" : "white"}
            animation={`${pulseRotate} 0.8s infinite linear`}
            shadow="md"
          />
          <Text
            fontSize="lg"
            fontWeight="medium"
            color={colorMode === "light" ? "gray.600" : "white"}
          >
            Loading, please wait...
          </Text>
        </Flex>
      ) : currentPageData.length === 0 ? (
        <Box py={12} textAlign="center">
          <Image
            src="/no_data_bg_img-removebg-preview.png"
            alt="No Data"
            boxSize="auto"
            mx="auto"
            mb={4}
            opacity={0.7}
          />
          <Text fontSize="lg" fontWeight="medium" color="gray.600">
            No Records Found
          </Text>
          <Text fontSize="sm" color="gray.500">
            Try adjusting filters or add a new entry
          </Text>
        </Box>
      ) : (
        <>
          <Box
            bg={tableBg}
            p={2}
            rounded="2xl"
            mb={2}
            boxShadow="sm"
            overflowX="auto"
          >
            {tableLoading ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                mt={10}
                gap={4}
              >
                <Box
                  boxSize="40px"
                  rounded="2xl"
                  bg={colorMode === "light" ? "purple.500" : "white"}
                  animation={`${pulseRotate} 0.8s infinite linear`}
                  shadow="md"
                />
                <Text
                  fontSize="lg"
                  fontWeight="medium"
                  color={colorMode === "light" ? "gray.600" : "white"}
                >
                  Rendering large table, please wait...
                </Text>
              </Flex>
            ) : (
              <InvoiceTable
                data={currentPageData}
                selectedIDs={selectedIDs}
                onSelect={setSelectedIDs}
                onPreview={(ids) =>
                  Array.isArray(ids)
                    ? handleBulkPreview(ids)
                    : handlePreview(ids)
                }
                onPrint={(ids) =>
                  Array.isArray(ids) ? handleBulkPrint(ids) : handlePrint(ids)
                }
                isPreviewLoading={isPreviewLoading}
                onDoubleClickRow={handlePreview}
                isPrintLoading={isPrintLoading}
                loadingProgress={loadingProgress}
                allSelected={
                  selectedIDs.length === currentPageData.length &&
                  currentPageData.length > 0
                }
                totalRows={currentPageData.length}
              />
            )}
          </Box>
          <HStack mt={4} justify="space-between">
            <HStack>
              <Text>Rows per page:</Text>
              <Select
                value={rowsPerPage}
                onChange={(e) => {
                  setCurrentPage(1);
                  setRowsPerPage(e.target.value);
                }}
                width="80px"
                size="sm"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>

                <option value="all">All</option>
              </Select>
            </HStack>

            <HStack>
              <Button
                isDisabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                size="sm"
              >
                Previous
              </Button>
              <Text>
                Page {currentPage} / {totalPages}
              </Text>
              <Button
                isDisabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                size="sm"
              >
                Next
              </Button>
            </HStack>
          </HStack>
        </>
      )}
      {/* Right Sidebar Preview Drawer */}
      <Drawer
        placement="right"
        size="xl"
        isOpen={isOpen}
        onClose={closePreview}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            <Flex align="center" gap={3} justify="space-between">
              <Box>
                <Text fontWeight="bold">
                  {previewMeta?.title || "Invoice Preview"}
                </Text>
                {previewMeta?.id && (
                  <Text fontSize="sm" color={mutedTextColor}>
                    Billing No {previewMeta.id}
                  </Text>
                )}
              </Box>
              {previewMeta?.id && (
                <Button
                  size="sm"
                  leftIcon={<Download size={16} />}
                  isLoading={isPrintLoading}
                  onClick={() => handlePrint(previewMeta.id)}
                  colorScheme="blue"
                >
                  Download
                </Button>
              )}
            </Flex>
          </DrawerHeader>
          <DrawerBody p={0}>
            {previewUrl ? (
              <Box w="100%" h="100%">
                <iframe
                  title="Invoice PDF Preview"
                  src={previewUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </Box>
            ) : (
              <Flex align="center" justify="center" h="100%">
                <Spinner />
              </Flex>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
