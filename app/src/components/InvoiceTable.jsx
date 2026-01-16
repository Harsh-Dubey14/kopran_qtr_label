import React from "react";
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
  useColorModeValue,
  Text,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  VStack,
  Tooltip,
  Badge,
  useBreakpointValue,
  useToast,
  Select,
} from "@chakra-ui/react";
import {
  Eye,
  MoreVertical,
  Download,
  Info,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import MigoLabelSlipPdf from "./MigoLabelSlipPdf";
import { pdf } from "@react-pdf/renderer";
import { getMaterialDocumentDetails } from "../api/api";

export default function InvoiceTable({
  data = [],
  selectedIDs = [],
  onSelect = () => {},
  onDoubleClickRow = () => {},
  onPreview = () => {},
  onPrint = () => {},
}) {
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [compactMode, setCompactMode] = React.useState(false);
  const [sortBy, setSortBy] = React.useState("MaterialDocument");
  const [sortDir, setSortDir] = React.useState("desc");
  const [lastClickedIndex, setLastClickedIndex] = React.useState(null);

  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "gray.800");
  const headerBg = useColorModeValue("gray.50", "gray.900");
  const headerColor = useColorModeValue("gray.700", "gray.200");
  const textMuted = useColorModeValue("gray.600", "gray.300");
  const bgHover = useColorModeValue("gray.100", "gray.700");
  const bgSelected = useColorModeValue("blue.50", "blue.900");

  const checkboxSize = isMobile ? "lg" : "md";

  const formatQty = (q) => {
    if (q === null || q === undefined || q === "") return "-";
    const n = Number(q);
    if (Number.isNaN(n)) return String(q);
    return n.toFixed(3).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "");
  };
  // 🔹 Remove duplicate MaterialDocument (keep first entry)
  const uniqueData = React.useMemo(() => {
    const map = new Map();

    data.forEach((item) => {
      if (!map.has(item.MaterialDocument)) {
        map.set(item.MaterialDocument, item);
      }
    });

    return Array.from(map.values());
  }, [data]);

  const sorted = React.useMemo(() => {
    const s = [...uniqueData];
    const key = sortBy;
    s.sort((a, b) => {
      const A = (a[key] ?? "").toString();
      const B = (b[key] ?? "").toString();
      // numeric-aware compare
      const cmp = A.localeCompare(B, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [data, sortBy, sortDir]);

  // If there's no data, render nothing. Place this after hooks so hooks
  // are always declared in the same order on every render (ESLint rule).
  if (!Array.isArray(data) || data.length === 0) return null;

  const allRowIDs = sorted.map((d, i) =>
    d.MaterialDocument
      ? `${d.MaterialDocument}-${d.MaterialDocumentItem || ""}`
      : `row-${i}`
  );
  const allSelected =
    selectedIDs.length > 0 && selectedIDs.length === allRowIDs.length;

      const generatePdfBlob = async (docs) => {
  const res = await getMaterialDocumentDetails(docs);
  if (res?.res !== "success") {
    throw new Error(res?.message || "Failed to generate PDF");
  }

  return await pdf(
    <MigoLabelSlipPdf data={res.data} />
  ).toBlob();
};

//   const handlePreview = async (ids) => {
//     try {
//       if (!ids || !ids.length) return;
//       const res = await getMaterialDocumentDetails(ids);
//       if (res?.res !== "success") throw new Error(res?.message || "Failed");
//       try {
//          const blob = await pdf(
//   <MigoLabelSlipPdf data={res.data} />
// ).toBlob();

// const url = URL.createObjectURL(blob);
// window.open(url, "_blank");

//         window.open(url, "_blank");
//       } catch (e) {
//         const blob = await pdf(<MigoLabelSlipPdf data={res.data} />).toBlob();
//         const url = URL.createObjectURL(blob);
//         window.open(url, "_blank");
//       }
//     } catch (err) {
//       toast({
//         title: "Preview error",
//         description: err?.message || String(err),
//         status: "error",
//         duration: 4000,
//       });
//     }
//   };

const handlePreview = async (docs) => {
  try {
    if (!docs?.length) return;

    const blob = await generatePdfBlob(docs);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    toast({
      title: "Preview error",
      description: err?.message || String(err),
      status: "error",
      duration: 4000,
    });
  }
};
const handleDownload = async (docs) => {
  try {
    if (!docs?.length) return;

    const blob = await generatePdfBlob(docs);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MaterialDocuments_${docs.join("_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    toast({
      title: "Download error",
      description: err?.message || String(err),
      status: "error",
      duration: 4000,
    });
  }
};


  const extractMaterialDocuments = (ids) => {
    const set = new Set();

    ids.forEach((id) => {
      const doc = String(id).split("-")[0];
      if (doc) set.add(doc);
    });

    return Array.from(set);
  };
  const triggerPreview = (ids) => {
    const docs = extractMaterialDocuments(Array.isArray(ids) ? ids : [ids]);
    if (!docs.length) return;
    handlePreview(docs);
  };
  const triggerPrint = (ids) => {
    const docs = extractMaterialDocuments(Array.isArray(ids) ? ids : [ids]);
    if (!docs.length) return;
    onPrint(docs);
  };

  // Selection helpers with shift-select support
  const handleCheckboxClick = (e, id, idx) => {
    const checked = !selectedIDs.includes(id);
    if (e.shiftKey && lastClickedIndex != null) {
      // select range between lastClickedIndex and idx
      const start = Math.min(lastClickedIndex, idx);
      const end = Math.max(lastClickedIndex, idx);
      const rangeIDs = sorted
        .slice(start, end + 1)
        .map((d, i) =>
          d.MaterialDocument
            ? `${d.MaterialDocument}-${d.MaterialDocumentItem || ""}`
            : `row-${start + i}`
        );
      let next = Array.from(new Set([...selectedIDs]));
      if (checked) {
        next = Array.from(new Set([...next, ...rangeIDs]));
      } else {
        next = next.filter((x) => !rangeIDs.includes(x));
      }
      onSelect(next);
    } else {
      if (checked) onSelect([...selectedIDs, id]);
      else onSelect(selectedIDs.filter((s) => s !== id));
    }
    setLastClickedIndex(idx);
  };

  const clearSelection = () => onSelect([]);


  return (
    <Box
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      bg={cardBg}
    >
      <Flex
        align="center"
        allSelected
        justify="space-between"
        px={2}
        py={1}
        bg={headerBg}
        borderBottom="1px solid"
        borderColor={borderColor}
        top={0}
      >
        <HStack spacing={0}>
          <Checkbox
            isChecked={allSelected}
            onChange={() => onSelect(allSelected ? [] : allRowIDs)}
            size={checkboxSize}
          />
          {selectedIDs.length > 0 && (
            <Text fontSize="xs" color={textMuted} fontWeight="medium" ml={2}>
              {selectedIDs.length} selected
            </Text>
          )}
          <HStack spacing={1} ml={2}>
            <Text fontSize="xs" color={textMuted} fontWeight="medium">
              Sort by:
            </Text>
            <Select
              size="sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              width="130px"
              variant="filled"
              fontSize="xs"
            >
              <option value="MaterialDocument">Document</option>
              <option value="Material">Material</option>
              <option value="QuantityInBaseUnit">Quantity</option>
              <option value="Plant">Plant</option>
            </Select>
          </HStack>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="toggle-sort"
            icon={
              sortDir === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )
            }
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={`Sort ${sortDir}`}
          />
        </HStack>

        <HStack spacing={2}>
          {selectedIDs.length > 0 ? (
            <HStack spacing={2}>
              <IconButton
                icon={<Eye size={14} />}
                size="sm"
                colorScheme="blue"
                onClick={() => {
                  const docs = extractMaterialDocuments(selectedIDs);
                  handlePreview(docs);
                }}
              />
              <IconButton
                icon={<Download size={14} />}
                size="sm"
                colorScheme="blue"
                onClick={() => {
  const docs = extractMaterialDocuments(selectedIDs);
  handleDownload(docs);
}}

                aria-label="Bulk print"
              />
              <IconButton
                icon={<Info size={14} />}
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                aria-label="Clear selection"
                title="Clear selection"
              />
            </HStack>
          ) : (
            <Tooltip label="Click for help" placement="bottom">
              <IconButton
                icon={<Info size={14} />}
                size="sm"
                variant="ghost"
                aria-label="info"
                onClick={() => {
                  toast({
                    title: "How to use",
                    description:
                      "Select rows using checkboxes, then click the preview or print buttons. Double-click a row for quick preview. Use shift-click to select ranges.",
                    status: "info",
                    duration: 6000,
                    isClosable: true,
                  });
                }}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      {isMobile ? (
        <VStack spacing={2} p={2} align="stretch">
          {sorted.map((doc, idx) => {
            const id = doc.MaterialDocument
              ? `${doc.MaterialDocument}`
              : `row-${idx}`;
            const selected = selectedIDs.includes(id);
            const status = doc.Status || doc.StatusCode || null;
            const statusColor =
              status === "PROCESSED"
                ? "green"
                : status === "BLOCKED"
                ? "red"
                : "gray";
            // compact single-line strip
            if (compactMode) {
              return (
                <Flex
                  key={id}
                  align="center"
                  justify="space-between"
                  borderRadius="md"
                  border="1px solid"
                  borderColor={borderColor}
                  bg={selected ? bgSelected : cardBg}
                  p={2}
                >
                  <HStack spacing={3} align="center">
                    <Checkbox
                      size={checkboxSize}
                      isChecked={selected}
                      onChange={(e) => handleCheckboxClick(e, id, idx)}
                    />
                    <Box>
                      <Text fontWeight="700" fontSize="sm">
                        {doc.MaterialDocument || "-"}
                      </Text>
                    </Box>
                    <Text fontSize="sm" color={textMuted}>
                      {doc.Material || "-"}
                    </Text>
                  </HStack>
                  <HStack spacing={2}>
                    {status && (
                      <Badge colorScheme={statusColor}>{status}</Badge>
                    )}
                    <Badge variant="subtle">
                      {formatQty(doc.QuantityInBaseUnit)}
                    </Badge>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<MoreVertical size={14} />}
                        size="sm"
                        variant="ghost"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<Eye size={12} />}
                          onClick={() => {
                            onSelect([id]);
                            handlePreview([doc.MaterialDocument || id]);
                            handleDownload([doc.MaterialDocument]);
                          }}
                        >
                          Preview
                        </MenuItem>
                        <MenuItem
                          icon={<Download size={12} />}
                          onClick={() => {
                            onSelect([id]);
                           handleDownload([doc.MaterialDocument]);

                          }}
                        >
                          Print
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </Flex>
              );
            }

            return (
              <Box
                key={id}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                bg={selected ? bgSelected : cardBg}
                p={2}
                sx={{
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(8px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                  animation: `fadeIn 0.3s ease-out ${idx * 0.03}s both`,
                }}
              >
                <Flex justify="space-between" align="center">
                  <HStack spacing={3} align="center">
                    <Checkbox
                      size={checkboxSize}
                      isChecked={selected}
                      onChange={(e) => handleCheckboxClick(e, id, idx)}
                    />
                    <Box>
                      <Text fontWeight="800" fontSize="md" lineHeight="1">
                        {doc.MaterialDocument || "-"}
                      </Text>
                      <HStack spacing={2} mt={1}>
                        <Badge variant="subtle">{doc.Material || "-"}</Badge>
                        <Badge variant="subtle">{doc.Plant || "-"}</Badge>
                      </HStack>
                    </Box>
                  </HStack>
                  <HStack spacing={2} align="center">
                    {status && (
                      <Badge colorScheme={statusColor} variant="solid" px={2}>
                        {status}
                      </Badge>
                    )}
                    <Text fontSize="sm" textAlign="right" width="80px">
                      {formatQty(doc.QuantityInBaseUnit)}
                    </Text>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<MoreVertical size={14} />}
                        size="sm"
                        variant="ghost"
                        aria-label="more"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<Eye size={12} />}
                          onClick={() => {
                            onSelect([id]);
                            handlePreview([doc.MaterialDocument || id]);
                          }}
                        >
                          Preview
                        </MenuItem>
                        <MenuItem
                          icon={<Download size={12} />}
                          onClick={() => {
                            onSelect([id]);
                            handleDownload([doc.MaterialDocument]);
                          }}
                        >
                          Print
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </Flex>
                <Flex mt={2} gridGap={6}>
                  <Box minW="50%">
                    <Text fontSize="xs" color={textMuted}>
                      Item
                    </Text>
                    <Text fontSize="sm">{doc.MaterialDocumentItem || "-"}</Text>
                  </Box>
                  <Box minW="50%">
                    <Text fontSize="xs" color={textMuted}>
                      Last Received
                    </Text>
                    <Text fontSize="sm">{doc.ReceivedDate || "-"}</Text>
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" minW="1000px">
            <Thead bg={headerBg} style={{ top: 0 }}>
              <Tr>
                <Th py={2}>
                  <Checkbox
                    isChecked={allSelected}
                    onChange={() => onSelect(allSelected ? [] : allRowIDs)}
                  />
                </Th>
                <Th color={headerColor} py={2}>
                  <Tooltip label="Material document number">
                    <Text fontSize="xs">Material Document</Text>
                  </Tooltip>
                </Th>
                {/* <Th color={headerColor} py={2} textAlign="right">
                  <Tooltip label="Document item number">
                    <Text fontSize="xs">Item</Text>
                  </Tooltip>
                </Th> */}
                <Th color={headerColor} py={2}>
                  <Tooltip label="Material code">
                    <Text fontSize="xs">Material</Text>
                  </Tooltip>
                </Th>
                <Th color={headerColor} py={2}>
                  <Tooltip label="Plant location">
                    <Text fontSize="xs">Plant</Text>
                  </Tooltip>
                </Th>
                <Th color={headerColor} py={2} textAlign="right">
                  <Tooltip label="Quantity in base unit">
                    <Text fontSize="xs">Qty</Text>
                  </Tooltip>
                </Th>
                <Th textAlign="right" py={2}>
                  <Text fontSize="xs">Actions</Text>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {sorted.map((doc, idx) => {
                const id = doc.MaterialDocument
                  ? `${doc.MaterialDocument}-${doc.MaterialDocumentItem || ""}`
                  : `row-${idx}`;
                const selected = selectedIDs.includes(id);
                return (
                  <Tr
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSelect([id]);
                        triggerPreview(id);
                      }
                    }}
                    key={id}
                    bg={selected ? bgSelected : "transparent"}
                    _hover={{ bg: bgHover, cursor: "pointer" }}
                    onDoubleClick={() => {
                      onSelect([id]);
                      triggerPreview(id);
                    }}
                    sx={{
                      "@keyframes fadeIn": {
                        from: { opacity: 0, transform: "translateY(8px)" },
                        to: { opacity: 1, transform: "translateY(0)" },
                      },
                      animation: `fadeIn 0.3s ease-out ${idx * 0.03}s both`,
                    }}
                  >
                    <Td py={1.5}>
                      <Checkbox
                        isChecked={selected}
                        onChange={(e) => handleCheckboxClick(e, id, idx)}
                      />
                    </Td>
                    <Td py={1.5} fontWeight="500" fontSize="sm">
                      {doc.MaterialDocument || "-"}
                    </Td>
                    {/* <Td
                      py={1.5}
                      textAlign="right"
                      fontFamily="mono"
                      fontSize="sm"
                    >
                      {doc.MaterialDocumentItem || "-"}
                    </Td> */}
                    <Td py={1.5} fontSize="sm">
                      {doc.Material || "-"}
                    </Td>
                    <Td py={1.5} fontSize="sm">
                      {doc.Plant || "-"}
                    </Td>
                    <Td
                      py={1.5}
                      textAlign="right"
                      fontFamily="mono"
                      fontSize="sm"
                      fontWeight="500"
                    >
                      {formatQty(doc.QuantityInBaseUnit)}
                    </Td>
                    <Td py={2} textAlign="right">
                      <HStack justify="flex-end" spacing={1}>
                        <Tooltip label="Preview document" placement="top">
                          <IconButton
                            icon={<Eye size={16} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            onClick={() => {
                              onSelect([id]);
                              handlePreview([doc.MaterialDocument || id]);
                            }}
                            aria-label="preview"
                            _hover={{ bg: "blue.50", transform: "scale(1.1)" }}
                            transition="all 0.2s"
                          />
                        </Tooltip>
                        <Tooltip label="Downlaod document" placement="top">
                          <IconButton
                            icon={<Download size={16} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => {
                              onSelect([id]);
                                handleDownload([doc.MaterialDocument]);
                            }}
                            aria-label="print"
                            _hover={{
                              bg: "purple.100",
                              transform: "scale(1.1)",
                            }}
                            transition="all 0.2s"
                          />
                        </Tooltip>
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
