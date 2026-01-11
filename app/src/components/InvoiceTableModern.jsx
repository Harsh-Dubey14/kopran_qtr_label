import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Text,
  HStack,
  Tooltip,
} from "@chakra-ui/react";
import { Eye, Printer, MoreVertical, Star, Info } from "lucide-react";
import { useState } from "react";

export default function InvoiceTableModern({
  data,
  selectedID,
  onSelect,
  onPreview,
  onPrint,
}) {
  const bgSelected = useColorModeValue("blue.100", "blue.800");
  const bgHover = useColorModeValue("blue.50", "blue.900");
  const zebraBg = useColorModeValue("gray.50", "gray.800");

  const [sortField, setSortField] = useState("BillingDocumentDate");
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (field) => {
    setSortField(field);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const sortedData = [...data].sort((a, b) => {
    const valA = a[sortField] || "";
    const valB = b[sortField] || "";
    return sortOrder === "asc"
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  const getSortIcon = (field) => {
    if (field !== sortField) return null;
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const displayKeys = data?.[0] ? Object.keys(data[0]) : [];

  return (
    <Box
      overflowX="auto"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      p={0}
      bg={useColorModeValue("white", "gray.900")}
    >
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            {displayKeys.map((key) => (
              <Th
                key={key}
                onClick={() => handleSort(key)}
                cursor="pointer"
                textAlign="center"
              >
                {key} {getSortIcon(key)}
              </Th>
            ))}
            <Th textAlign="center">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedData.length === 0 ? (
            <Tr>
              <Td colSpan={displayKeys.length + 1} textAlign="center">
                <Text color="gray.500">No billing records found</Text>
              </Td>
            </Tr>
          ) : (
            sortedData.map((doc, idx) => {
              const isSelected = selectedID === doc.BillingDocument;
              return (
                <Tr
                  key={doc.BillingDocument}
                  bg={
                    isSelected
                      ? bgSelected
                      : idx % 2 === 0
                      ? "transparent"
                      : zebraBg
                  }
                  _hover={{ bg: bgHover }}
                  transition="0.2s"
                >
                  {displayKeys.map((key) => (
                    <Td key={key} textAlign="center" title={doc[key]}>
                      {doc[key]}
                    </Td>
                  ))}
                  <Td textAlign="center">
                    <HStack spacing={1} justify="center">
                      <Tooltip label="Preview">
                        <IconButton
                          icon={<Eye size={14} />}
                          size="sm"
                          onClick={() => onPreview(doc.BillingDocument)}
                          aria-label="Preview"
                        />
                      </Tooltip>
                      <Tooltip label="Print">
                        <IconButton
                          icon={<Printer size={14} />}
                          size="sm"
                          onClick={() => onPrint(doc.BillingDocument)}
                          aria-label="Print"
                        />
                      </Tooltip>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<MoreVertical size={14} />}
                          size="sm"
                          aria-label="More"
                        />
                        <MenuList fontSize="sm">
                          <MenuItem icon={<Star size={12} />}>
                            Mark Important
                          </MenuItem>
                          <MenuItem icon={<Info size={12} />}>Details</MenuItem>
                          <MenuItem>Archive</MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Td>
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
