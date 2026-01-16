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
  InputGroup,
  InputLeftElement,
  Tooltip,
  Progress,
  Badge,
  Skeleton,
  Fade,
  Collapse,
  Tag,
  Link,
} from "@chakra-ui/react";
import {
  Calendar1,
  CalendarDaysIcon,
  Download,
  SearchIcon,
  Undo,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
    // console.log(...args);
  }
};

const COLOR_MODE_STORAGE_KEY = "merit_color_mode";
const SEARCH_HISTORY_KEY = "merit_search_history_v1"; // localStorage key for search history
const MAX_HISTORY = 5;
// storage key (keep stable)
const TEMPLATE_VERSION_KEY = "merit_template_version_v1";

// default template


// Brand color palette
const BRAND_TEAL = "#008A87";
const BRAND_PURPLE = "#5A3C9C";

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
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState("20");
  const toast = useToast();
  const [isPreviewLoading, setPreviewLoading] = useState(false);
  const [isPrintLoading, setPrintLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [deploymentEnv, setDeploymentEnv] = useState("");
  const [templateVersion] = useState(initialTemplateVersion);
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
          // console.log(`Payload length: ${res.payloadLength}`);
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
        // Parse IDs format: "MaterialDocument-MaterialDocumentItem" or just "MaterialDocument"
        const materialDocumentItems = ids.map((id) => {
          const parts = String(id).split("-");
          return {
            MaterialDocument: parts[0],
            MaterialDocumentItem: parts[1] || "1",
          };
        });
        // console.log(
        // "Preview: Sending MaterialDocumentItems:",
        // materialDocumentItems
        // );
        const isBulk =
          Array.isArray(billingDocumentId) && billingDocumentId.length > 1;
        const response = await axios.post(
          `${BASE}/getMaterialDocumentDetails`,
          {
            MaterialDocumentItems: materialDocumentItems,
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

            const { blob, metaTitle } = await buildInvoiceBlob(invoiceData);
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
        // console.log({ error });
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
        // Parse IDs format: "MaterialDocument-MaterialDocumentItem" or just "MaterialDocument"
        const materialDocumentItems = ids.map((id) => {
          const parts = String(id).split("-");
          return {
            MaterialDocument: parts[0],
            MaterialDocumentItem: parts[1] || "1",
          };
        });
        // console.log(
        // "Print: Sending MaterialDocumentItems:",
        // materialDocumentItems
        // );

        // Step 1: Get material document details (JSON response)
        const response = await axios.post(
          `${BASE}/getMaterialDocumentDetails`,
          {
            MaterialDocumentItems: materialDocumentItems,
          }
        );

        // API response received - update to 50%
        clearInterval(progressInterval);
        setProgressStage(50, 0);

        const apiResponse = response.data;
        if (apiResponse.res !== "success" || !apiResponse.data) {
          throw new Error(
            apiResponse.message || "Failed to fetch material document details"
          );
        }

        const materialData = apiResponse.data;
        // console.log("Material document data received:", materialData);

        // Update to 65%
        setProgressStage(65, 100);

        // Step 2: Generate PDF from the material data using server-side PDF generation
        const pdfBlob = await axios
          .post(
            `${BASE}/generateLabelPdf`,
            {
              mappedData: materialData,
              qrImages: [], // Add QR images if needed
            },
            {
              responseType: "blob",
            }
          )
          .then((res) => res.data);

        // PDF blob created - update to 85%
        setProgressStage(85, 100);

        // Verify it's a PDF
        if (!pdfBlob || pdfBlob.size === 0) {
          throw new Error("Empty PDF received from server");
        }

        if (pdfBlob.type === "application/json") {
          const text = await pdfBlob.text();
          const errorData = JSON.parse(text);
          throw new Error(
            errorData.message || errorData.error || "PDF generation failed"
          );
        }

        // Create download link
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;

        const docCount = materialDocumentItems.length;
        const filename =
          docCount > 1
            ? `Material_Documents_${docCount}_items.pdf`
            : `Material_Doc_${materialDocumentItems[0].MaterialDocument}_Item_${materialDocumentItems[0].MaterialDocumentItem}.pdf`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Complete progress
        completeProgress();

        const end =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsedMs = end - start;

        toast({
          title: "PDF Downloaded",
          description: `${filename} — ${(elapsedMs / 1000).toFixed(2)}s`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        clearInterval(progressInterval);
        setLoadingProgress(0);
        console.error("Print error:", error);
        toast({
          title: "Failed to generate PDF",
          description: error?.message || "Unexpected error occurred.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setPrintLoading(false);
      }
    },
    [toast, startProgressTracking, setProgressStage, completeProgress]
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

  // 🔹 Remove duplicate MaterialDocument (pagination-safe)
const uniqueFilteredData = useMemo(() => {
  const map = new Map();

  filteredData.forEach((item) => {
    if (!map.has(item.MaterialDocument)) {
      map.set(item.MaterialDocument, item);
    }
  });

  return Array.from(map.values());
}, [filteredData]);

  const totalPages = useMemo(() => {
  if (rowsPerPage === "all") return 1;

  const rp = Number(rowsPerPage);
  return Math.max(1, Math.ceil(uniqueFilteredData.length / rp));
}, [uniqueFilteredData, rowsPerPage]);


const currentPageData = useMemo(() => {
  if (rowsPerPage === "all") {
    return uniqueFilteredData;
  }

  const rp = Number(rowsPerPage);
  const indexOfLast = currentPage * rp;
  const indexOfFirst = indexOfLast - rp;

  return uniqueFilteredData.slice(indexOfFirst, indexOfLast);
}, [uniqueFilteredData, currentPage, rowsPerPage]);


  // const handleExportExcel = useCallback(
  //   (scope = "filtered") => {
  //     setExcelLoading(true);
  //     try {
  //       const rows = scope === "page" ? currentPageData : filteredData;
  //       if (!rows || rows.length === 0) {
  //         toast({ title: "No rows to export", status: "info", duration: 2500 });
  //         return;
  //       }

  //       const serialize = (obj) => {
  //         const entries = Object.entries(obj || {}).filter(
  //           ([k]) => !XLSX_OMIT_COLUMNS.has(k)
  //         );
  //         return Object.fromEntries(
  //           entries.map(([k, v]) => [
  //             k,
  //             typeof v === "object" && v !== null ? JSON.stringify(v) : v,
  //           ])
  //         );
  //       };

  //       const dataForXlsx = rows.map(serialize);
  //       const ws = XLSX.utils.json_to_sheet(dataForXlsx, { skipHeader: false });

  //       const colWidths = Object.keys(dataForXlsx[0] || {}).map((key) => ({
  //         wch:
  //           Math.max(
  //             key.length,
  //             ...dataForXlsx.map((r) => String(r[key] ?? "").length)
  //           ) + 2,
  //       }));
  //       ws["!cols"] = colWidths;

  //       const wb = XLSX.utils.book_new();
  //       XLSX.utils.book_append_sheet(wb, ws, "Invoices");

  //       const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  //       const datePart = (from ? `from_${from}` : "") + (to ? `_to_${to}` : "");
  //       const scopePart = scope === "page" ? "page" : "filtered";
  //       const filename = `invoices_${scopePart}${
  //         datePart ? "_" + datePart : ""
  //       }_${ts}.xlsx`;

  //       XLSX.writeFile(wb, filename);
  //     } catch (e) {
  //       debug(e);
  //       toast({
  //         title: "Excel export failed",
  //         description: e?.message || "Unexpected error.",
  //         status: "error",
  //       });
  //     } finally {
  //       setExcelLoading(false);
  //     }
  //   },
  //   [currentPageData, filteredData, from, to, toast]
  // );

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

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
      {/* Improved Header with Better Hierarchy */}
      <Fade in={true} transition={{ enter: { duration: 0.3 } }}>
        <Box
          mb={4}
          px={{ base: 3, md: 4 }}
          py={{ base: 2, md: 2 }}
          bg={headerBg}
          border="1px solid"
          borderColor={headerBorder}
          rounded="xl"
          boxShadow="sm"
        >
          {/* Mobile Layout */}
          <Flex
            display={{ base: "flex", md: "none" }}
            direction="column"
            gap={2}
          >
            <Flex justify="space-between" align="center">
              <HStack spacing={2}>
                <Image
                  src="/kopran_logo.png"
                  alt="Logo"
                  width="28px"
                  height="28px"
                  objectFit="contain"
                  borderRadius="md"
                />
                <Heading
                  as="h1"
                  fontSize="md"
                  fontWeight="semibold"
                  color={titleColor}
                  letterSpacing="tight"
                >
                  Quarantine Label
                </Heading>
              </HStack>
              <IconButton
                aria-label="Toggle color mode"
                size="sm"
                variant="ghost"
                onClick={toggleColorMode}
                icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              />
            </Flex>
            {deploymentEnv && (
              <Text fontSize="xs" color={mutedTextColor} fontWeight="medium">
                Environment: {deploymentEnv.toUpperCase()}
              </Text>
            )}
          </Flex>

          {/* Desktop Layout - Compact with Inline Environment */}
          <Box display={{ base: "none", md: "block" }}>
            <Flex align="center" justify="space-between">
              {/* Left: Logo + Title + Environment Badge Inline */}
              <HStack spacing={3}>
                <Image
                  src="/kopran_logo.png"
                  alt="Logo"
                  width="28px"
                  height="28px"
                  objectFit="contain"
                  borderRadius="md"
                />
                <Heading
                  as="h1"
                  fontSize="lg"
                  fontWeight="600"
                  color={titleColor}
                  letterSpacing="tight"
                >
                  Quarantine Label
                </Heading>
                {deploymentEnv && (
                  <Badge
                    fontSize="xs"
                    colorScheme="gray"
                    variant="outline"
                    px={2}
                    py={0.5}
                    fontWeight="medium"
                  >
                    {deploymentEnv.toUpperCase()}
                  </Badge>
                )}
              </HStack>

              {/* Right: Actions */}
              <HStack spacing={1}>
                {/* <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<MoreVertical size={18} />}
                    variant="ghost"
                    size="sm"
                    aria-label="More options"
                  />
                  <MenuList>
                    <MenuItem
                      icon={<FileSpreadsheet size={16} />}
                      // onClick={() => handleExportExcel("filtered")}
                    >
                      Export to Excel
                    </MenuItem>
                  </MenuList>
                </Menu> */}
                <Tooltip label="Toggle theme" placement="left">
                  <IconButton
                    aria-label="Toggle color mode"
                    size="sm"
                    variant="ghost"
                    onClick={toggleColorMode}
                    icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
                  />
                </Tooltip>
              </HStack>
            </Flex>
          </Box>
        </Box>
      </Fade>

      {/* Improved Filters with Better Density and Sticky Positioning */}
      <Fade in={true} transition={{ enter: { duration: 0.4 } }}>
        <Box
          position={{ base: "sticky", md: "relative" }}
          top={{ base: 0, md: "auto" }}
          zIndex={20}
          bg={surfaceBg}
          rounded="xl"
          mb={4}
          boxShadow="md"
          border="1px solid"
          borderColor={filterBorderColor}
          overflow="hidden"
        >
          {/* Mobile: Collapsible Header */}
          <Box
            display={{ base: "flex", md: "none" }}
            alignItems="center"
            justifyContent="space-between"
            p={3}
            bg={headerBg}
            borderBottom={isFiltersOpen ? "1px solid" : "none"}
            borderBottomColor={filterBorderColor}
            cursor="pointer"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            _active={{ bg: useColorModeValue("gray.50", "gray.700") }}
          >
            <HStack spacing={2}>
              <SearchIcon size={16} color={mutedTextColor} />
              <Text fontSize="sm" fontWeight="600" color={titleColor}>
                Filters
              </Text>
              {(searchTerm || from || to) && (
                <Badge colorScheme="blue" fontSize="xs">
                  Active
                </Badge>
              )}
            </HStack>
            {isFiltersOpen ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </Box>

          {/* Mobile: Collapsible Content */}
          <Collapse in={isFiltersOpen} animateOpacity>
            <Box display={{ base: "block", md: "none" }} p={3}>
              <VStack spacing={3} align="stretch">
                {/* 1. Search - Full width, tall, prominent */}
                <Box ref={inputWrapperRef} position="relative" w="100%">
                  <InputGroup size="md">
                    <InputLeftElement pointerEvents="none" h="48px">
                      <SearchIcon color={placeholderColor} size={18} />
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
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "sm",
                        borderWidth: "2px",
                      }}
                      h="48px"
                      fontSize="md"
                      fontWeight="500"
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
                      boxShadow="lg"
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
                            py={3}
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

                {/* 2. Date Range - Single consolidated control */}
                <VStack spacing={2} align="stretch">
                  <Text
                    fontSize="xs"
                    color={mutedTextColor}
                    fontWeight="600"
                    textTransform="uppercase"
                  >
                    Date Range
                  </Text>
                  <VStack spacing={2}>
                    <Input
                      size="md"item
                      type="date"
                      placeholder="From date"
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        setCurrentPage(1);
                      }}
                      bg={useColorModeValue("gray.50", "gray.700")}
                      borderColor={filterBorderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "sm",
                        borderWidth: "2px",
                      }}
                      h="44px"
                    />
                    <Input
                      size="md"
                      type="date"
                      placeholder="To date"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value);
                        setCurrentPage(1);
                      }}
                      bg={useColorModeValue("gray.50", "gray.700")}
                      borderColor={filterBorderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "sm",
                        borderWidth: "2px",
                      }}
                      h="44px"
                    />
                  </VStack>
                </VStack>

                {/* 3. Quick Filters - Horizontal scrollable chips */}
                <Box>
                  <Flex
                    overflowX="auto"
                    gap={2}
                    pb={1}
                    css={{
                      "&::-webkit-scrollbar": { display: "none" },
                      scrollbarWidth: "none",
                    }}
                  >
                    <Tag
                      size="lg"
                      variant="outline"
                      colorScheme="teal"
                      cursor="pointer"
                      onClick={() => applyQuickDate("today")}
                      px={4}
                      py={2}
                      fontSize="sm"
                      fontWeight="600"
                      _active={{ bg: "teal.50" }}
                      whiteSpace="nowrap"
                    >
                      <Calendar1 size={14} style={{ marginRight: "6px" }} />
                      Today
                    </Tag>
                    <Tag
                      size="lg"
                      variant="outline"
                      colorScheme="purple"
                      cursor="pointer"
                      onClick={() => applyQuickDate("month")}
                      px={4}
                      py={2}
                      fontSize="sm"
                      fontWeight="600"
                      _active={{ bg: "purple.50" }}
                      whiteSpace="nowrap"
                    >
                      <CalendarDaysIcon
                        size={14}
                        style={{ marginRight: "6px" }}
                      />
                      This Month
                    </Tag>
                    <Link
                      color="red.500"
                      fontSize="sm"
                      fontWeight="600"
                      onClick={() => {
                        setSearchTerm("");
                        setFrom("");
                        setTo("");
                        setCurrentPage(1);
                      }}
                      alignSelf="center"
                      ml={2}
                      whiteSpace="nowrap"
                    >
                      Clear All
                    </Link>
                  </Flex>
                </Box>

                {/* 4. Primary CTA - Full width at bottom */}
                <Button
                  size="lg"
                  colorScheme="teal"
                  bg={BRAND_TEAL}
                  color="white"
                  _hover={{ bg: BRAND_PURPLE }}
                  _active={{ transform: "scale(0.98)" }}
                  onClick={onGoClicked}
                  w="100%"
                  h="48px"
                  fontWeight="700"
                  fontSize="md"
                  mt={2}
                >
                  Apply Filters
                </Button>
              </VStack>
            </Box>
          </Collapse>

          {/* Desktop Layout */}
          <Box display={{ base: "none", md: "block" }} p={3}>
            <VStack spacing={3} align="stretch">
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

              {/* Row 2: Date Range + Actions */}
              <Flex
                direction={{ base: "column", md: "row" }}
                gap={3}
                align={{ base: "stretch", md: "center" }}
              >
                {/* Date Range - Visually Secondary */}
                {/* <HStack flex={1} spacing={2}>
                  <Text
                    fontSize="xs"
                    color={mutedTextColor}
                    fontWeight="medium"
                  >
                    Date range:
                  </Text>
                  <Input
                    size="sm"
                    type="date"
                    placeholder="From date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    bg={useColorModeValue("gray.50", "gray.700")}
                    borderColor={filterBorderColor}
                    opacity={0.9}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "none",
                      opacity: 1,
                    }}
                    fontSize="sm"
                  />
                  <Text fontSize="xs" color={mutedTextColor}>
                    to
                  </Text>
                  <Input
                    size="sm"
                    type="date"
                    placeholder="To date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    bg={useColorModeValue("gray.50", "gray.700")}
                    borderColor={filterBorderColor}
                    opacity={0.9}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "none",
                      opacity: 1,
                    }}
                    fontSize="sm"
                  />
                </HStack> */}

                {/* Actions - Better Spacing and Labels */}
               <HStack spacing={3} ml="auto">
  <Button
    size="sm"
    variant="outline"
    leftIcon={<Undo size={14} />}
    onClick={() => {
      setSearchTerm("");
      setFrom("");
      setTo("");
      setCurrentPage(1);
    }}
    fontSize="xs"
  >
    Clear
  </Button>

  <Button
    size="sm"
    colorScheme="teal"
    bg={BRAND_TEAL}
    color="white"
    _hover={{ bg: BRAND_PURPLE }}
    onClick={onGoClicked}
    minW="70px"
    fontWeight="600"
    px={6}
  >
    Go
  </Button>
</HStack>
              </Flex>
            </VStack>
          </Box>
        </Box>
      </Fade>

      {/* Minimal Progress Indicator */}
      {(isPreviewLoading || isPrintLoading) && (
        <Box
          position="fixed"
          top={4}
          right={4}
          zIndex="toast"
          animation="slideIn 0.2s ease-out"
          sx={{
            "@keyframes slideIn": {
              "0%": { opacity: 0, transform: "translateY(-20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            bg={surfaceBg}
            p={4}
            rounded="lg"
            shadow="lg"
            minW="200px"
            border="1px solid"
            borderColor={colorMode === "light" ? "gray.200" : "gray.600"}
          >
            <HStack spacing={3}>
              <Spinner size="sm" color="blue.500" thickness="2px" />
              <VStack align="start" spacing={1} flex={1}>
                <Text fontSize="sm" fontWeight="medium" color={titleColor}>
                  {isPreviewLoading ? "Preview" : "Download"}
                </Text>
                <Text fontSize="xs" color={mutedTextColor}>
                  {Math.round(loadingProgress)}%
                </Text>
              </VStack>
            </HStack>
            <Progress
              value={loadingProgress}
              size="xs"
              mt={2}
              rounded="full"
              colorScheme="blue"
            />
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
        <Fade in={currentPageData.length === 0}>
          <Box
            py={16}
            px={6}
            textAlign="center"
            bg={surfaceBg}
            rounded="xl"
            border="1px solid"
            borderColor={filterBorderColor}
          >
            <Image
              src="/no_data_bg_img-removebg-preview.png"
              alt="No Data"
              boxSize="auto"
              maxW="240px"
              mx="auto"
              mb={6}
              opacity={0.6}
            />
            <Text fontSize="xl" fontWeight="600" color={titleColor} mb={2}>
              No Records Found
            </Text>
            <Text fontSize="md" color={mutedTextColor} mb={4}>
              {from || to || searchTerm
                ? "No results match your current filters"
                : "No material documents available"}
            </Text>
            <VStack
              spacing={2}
              align="center"
              color={mutedTextColor}
              fontSize="sm"
            >
              <Text>• Try adjusting your date range</Text>
              <Text>• Clear search filters and try again</Text>
              <Text>• Check if material documents exist for this period</Text>
            </VStack>
            {(from || to || searchTerm) && (
              <Button
                mt={6}
                size="sm"
                variant="outline"
                leftIcon={<Undo size={14} />}
                onClick={() => {
                  setSearchTerm("");
                  setFrom("");
                  setTo("");
                  setCurrentPage(1);
                }}
              >
                Clear All Filters
              </Button>
            )}
          </Box>
        </Fade>
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
              <Fade in={tableLoading}>
                <VStack spacing={3} p={4}>
                  {/* Compact Table Skeleton */}
                  <Skeleton height="36px" rounded="md" />
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <HStack key={i} spacing={3} w="100%">
                      <Skeleton height="14px" width="24px" />
                      <Skeleton height="14px" flex={1} />
                      <Skeleton height="14px" flex={1} />
                      <Skeleton height="14px" flex={1} />
                      <Skeleton height="14px" width="70px" />
                      <Skeleton height="14px" width="60px" />
                    </HStack>
                  ))}
                </VStack>
              </Fade>
            ) : (
              <Fade in={!tableLoading}>
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
              </Fade>
            )}
          </Box>
          <Fade in={!tableLoading && !loading}>
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
          </Fade>
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
