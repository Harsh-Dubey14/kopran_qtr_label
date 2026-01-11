import React, { useMemo, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  HStack,
  IconButton,
  Text,
  Flex,
  VStack,
  Tooltip,
  Badge,
  useBreakpointValue,
  useToast,
  Select,
  useColorModeValue,
} from "@chakra-ui/react";
import { Eye, MoreVertical, Printer, Info } from "lucide-react";
import { pdf } from "@react-pdf/renderer";

import MigoLabelSlipPdf from "./MigoLabelSlipPdf";
import { getMaterialDocumentDetails } from "../api/api";

/* =========================================================
   HELPERS
========================================================= */

const formatQty = (q) => {
  if (q === null || q === undefined || q === "") return "-";
  const n = Number(q);
  if (Number.isNaN(n)) return String(q);
  return n.toFixed(2).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "");
};

const buildRowId = (doc, idx) =>
  doc.MaterialDocument
    ? `${doc.MaterialDocument}-${doc.MaterialDocumentItem || ""}`
    : `row-${idx}`;

/* =========================================================
   COMPONENT
========================================================= */

export default function InvoiceTable({
  data = [],
  selectedIDs = [],
  onSelect = () => {},
  onDoubleClickRow = () => {},
  onPrint = () => {},
}) {
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [setCompactMode] = useState(false);
  const [sortBy, setSortBy] = useState("MaterialDocument");
  const [sortDir, setSortDir] = useState("desc");
  const [lastClickedIndex, setLastClickedIndex] = useState(null);

  /* =======================================================
     THEME
  ======================================================= */

  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.900");
  const headerColor = useColorModeValue("gray.700", "gray.200");
  const textMuted = useColorModeValue("gray.600", "gray.300");
  const bgHover = useColorModeValue("gray.100", "gray.700");
  const bgSelected = useColorModeValue("blue.50", "blue.900");

  /* =======================================================
     SORTING
  ======================================================= */

  const sorted = useMemo(() => {
    const s = [...data];
    s.sort((a, b) => {
      const A = (a[sortBy] ?? "").toString();
      const B = (b[sortBy] ?? "").toString();
      const cmp = A.localeCompare(B, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [data, sortBy, sortDir]);

  if (!Array.isArray(sorted) || sorted.length === 0) return null;

  const allRowIDs = sorted.map(buildRowId);
  const allSelected =
    selectedIDs.length > 0 && selectedIDs.length === allRowIDs.length;

  /* =======================================================
     PREVIEW (ONLY REACT PDF)
  ======================================================= */

  const handlePreview = async (ids) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) return;

      // 1️⃣ Fetch backend data
      const res = await getMaterialDocumentDetails(ids);

      if (res?.res !== "success") {
        throw new Error(res?.message || "Failed to fetch data");
      }

      // 2️⃣ 🔥 THIS IS THE KEY FIX
      const labelData = Array.isArray(res.data) ? res.data : [];

      if (labelData.length === 0) {
        throw new Error("No label data received");
      }

      console.log("Labels/pages to generate:", labelData.length);

      // 3️⃣ OPTIONAL: backend PDF call (keep if needed)
      // try {
      //   await generateLabelPdf(labelData);
      // } catch {
      //   /* optional backend PDF, ignore failure */
      // }

      // 4️⃣ FRONTEND PDF PREVIEW (1 item = 1 page)
      const blob = await pdf(<MigoLabelSlipPdf data={labelData} />).toBlob();

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast({
        title: "Preview error",
        description: err?.message || String(err),
        status: "error",
        duration: 4000,
      });
    }
  };

  /* =======================================================
     SELECTION (SHIFT SUPPORT)
  ======================================================= */

  const handleCheckboxClick = (e, id, idx) => {
    const checked = !selectedIDs.includes(id);

    if (e.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);

      const rangeIDs = sorted.slice(start, end + 1).map(buildRowId);

      let next = [...new Set(selectedIDs)];

      next = checked
        ? [...new Set([...next, ...rangeIDs])]
        : next.filter((x) => !rangeIDs.includes(x));

      onSelect(next);
    } else {
      onSelect(
        checked ? [...selectedIDs, id] : selectedIDs.filter((x) => x !== id)
      );
    }

    setLastClickedIndex(idx);
  };
  const handlePrint = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return;

    // 1️⃣ Fetch backend data
    const res = await getMaterialDocumentDetails(ids);

    if (res?.res !== "success") {
      throw new Error(res?.message || "Failed to fetch data");
    }

    const labelData = Array.isArray(res.data) ? res.data : [];

    if (labelData.length === 0) {
      throw new Error("No label data received");
    }

    // 2️⃣ Generate PDF blob
    const blob = await pdf(
      <MigoLabelSlipPdf data={labelData} />
    ).toBlob();

    // 3️⃣ Open & print
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url);

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    toast({
      title: "Print error",
      description: err?.message || String(err),
      status: "error",
      duration: 4000,
    });
  }
};


  /* =======================================================
     HEADER
  ======================================================= */

  const Header = (
    <Flex
      align="center"
      justify="space-between"
      px={2}
      py={1}
      bg={headerBg}
      borderBottom="1px solid"
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex={20}
    >
      <HStack spacing={2}>
        <Checkbox
          isChecked={allSelected}
          onChange={() => onSelect(allSelected ? [] : allRowIDs)}
        />
        <Text fontSize="xs" color={textMuted}>
          {selectedIDs.length} selected
        </Text>

        <Select
          size="sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          width="150px"
        >
          <option value="MaterialDocument">Document</option>
          <option value="Material">Material</option>
          <option value="QuantityInBaseUnit">Quantity</option>
          <option value="Plant">Plant</option>
        </Select>

        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          aria-label="sort"
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </IconButton>
      </HStack>

      <HStack spacing={2}>
        {selectedIDs.length > 0 ? (
          <>
            <IconButton
              icon={<Eye size={14} />}
              size="sm"
              colorScheme="blue"
              onClick={() => handlePreview(selectedIDs)}
            />
            <IconButton
              icon={<Printer size={14} />}
              size="sm"
              colorScheme="blue"
              onClick={() => handlePrint(selectedIDs)}
            />
          </>
        ) : (
          <Tooltip label="Select rows to preview or print">
            <IconButton icon={<Info size={14} />} size="sm" variant="ghost" />
          </Tooltip>
        )}
        <IconButton
          icon={<MoreVertical size={14} />}
          size="sm"
          variant="ghost"
          onClick={() => setCompactMode((v) => !v)}
        />
      </HStack>
    </Flex>
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Box border="1px solid" borderColor={borderColor} borderRadius="md">
      {Header}

      {isMobile ? (
        <VStack p={2} spacing={2}>
          {sorted.map((doc, idx) => {
            const id = buildRowId(doc, idx);
            const selected = selectedIDs.includes(id);

            return (
              <Flex
                key={id}
                p={2}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                bg={selected ? bgSelected : cardBg}
                justify="space-between"
                align="center"
              >
                <HStack>
                  <Checkbox
                    isChecked={selected}
                    onClick={(e) => handleCheckboxClick(e, id, idx)}
                  />
                  <Text fontWeight="bold">{doc.MaterialDocument}</Text>
                </HStack>

                <HStack>
                  <Badge>{formatQty(doc.QuantityInBaseUnit)}</Badge>
                  <IconButton
                    icon={<Eye size={14} />}
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePreview([id])}
                  />
                </HStack>
              </Flex>
            );
          })}
        </VStack>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" minW="1000px">
            <Thead bg={headerBg}>
              <Tr>
                <Th />
                <Th color={headerColor}>Document</Th>
                <Th color={headerColor}>Item</Th>
                <Th color={headerColor}>Material</Th>
                <Th color={headerColor}>Plant</Th>
                <Th color={headerColor} isNumeric>
                  Quantity
                </Th>
                <Th isNumeric>Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {sorted.map((doc, idx) => {
                const id = buildRowId(doc, idx);
                const selected = selectedIDs.includes(id);

                return (
                  <Tr
                    key={id}
                    tabIndex={0}
                    bg={selected ? bgSelected : "transparent"}
                    _hover={{ bg: bgHover }}
                    onDoubleClick={() => handlePreview([id])}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePreview([id]);
                      }
                    }}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selected}
                        onChange={(e) => handleCheckboxClick(e, id, idx)}
                      />
                    </Td>
                    <Td>{doc.MaterialDocument}</Td>
                    <Td>{doc.MaterialDocumentItem}</Td>
                    <Td>{doc.Material}</Td>
                    <Td>{doc.Plant}</Td>
                    <Td isNumeric>{formatQty(doc.QuantityInBaseUnit)}</Td>
                    <Td isNumeric>
                      <HStack justify="flex-end">
                        <IconButton
                          icon={<Eye size={14} />}
                          size="xs"
                          variant="ghost"
                          onClick={() => handlePreview([id])}
                        />
                        <IconButton
                          icon={<Printer size={14} />}
                          size="xs"
                          variant="ghost"
                          onClick={() => handlePrint([id])}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
