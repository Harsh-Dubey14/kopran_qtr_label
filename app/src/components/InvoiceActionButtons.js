import { IconButton, HStack } from "@chakra-ui/react";
import { Eye, Printer } from "lucide-react";

export default function InvoiceActionButtons({
  id,
  isLoading,
  onPreview,
  onPrint,
  size = "xs",
  colorScheme = "blue",
}) {
  return (
    <HStack spacing={2} justify="center">
      <IconButton
        icon={<Eye size={16} />}
        size={size}
        aria-label="Preview"
        title="Preview"
        colorScheme={colorScheme}
        isLoading={isLoading}
        onClick={onPreview}
      />
      <IconButton
        icon={<Printer size={16} />}
        size={size}
        aria-label="Print"
        title="Print"
        colorScheme="teal"
        isLoading={isLoading}
        onClick={onPrint}
      />
    </HStack>
  );
}
