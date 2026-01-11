import { HStack, Input, Button } from "@chakra-ui/react";

export default function FilterBar({ from, to, setFrom, setTo, onFilter }) {
  return (
    <HStack spacing={4} mb={4}>
      <Input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <Button colorScheme="blue" onClick={onFilter}>
        Search
      </Button>
    </HStack>
  );
}
