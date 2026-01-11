import { ChakraProvider, Box, ColorModeScript } from "@chakra-ui/react";
import theme from "./theme";
import Dashboard from "./pages/DashboardNew";

function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />

      <Box p={4}>
        <Dashboard />
      </Box>
    </ChakraProvider>
  );
}

export default App;
