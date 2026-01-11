import {
  HStack,
  Input,
  Button,
  useColorModeValue,
  Box,
  Icon,
} from "@chakra-ui/react";
import { CalendarRange } from "lucide-react";

export default function FilterBarModern({
  from,
  to,
  setFrom,
  setTo,
  onFilter,
}) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.600");

  return (
    <Box
      p={4}
      rounded="lg"
      bg={bg}
      border="1px"
      borderColor={border}
      boxShadow="sm"
      mb={6}
    >
      <HStack spacing={4} align="center" justify="flex-end">
        <Input
          size="sm"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          rounded="md"
          focusBorderColor="blue.500"
        />
        <Input
          size="sm"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          rounded="md"
          focusBorderColor="blue.500"
        />
        <Button
          size="sm"
          colorScheme="blue"
          leftIcon={<Icon as={CalendarRange} boxSize={4} />}
          onClick={onFilter}
        >
          Apply
        </Button>
      </HStack>
    </Box>
  );
}
