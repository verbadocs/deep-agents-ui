"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ReactNode } from "react";

// Create a theme with inverted colors
const invertedTheme = createTheme({
  palette: {
    mode: "light", // Changed from "dark" to "light"
    primary: {
      main: "#2dd4bf",
    },
    background: {
      default: "#ffffff", // Changed from "#0f0f0f" to "#ffffff"
      paper: "#ffffff", // Changed from "#1a1a1a" to "#ffffff"
    },
    text: {
      primary: "#000000", // Changed from "#f3f4f6" to "#000000"
      secondary: "#333333", // Changed from "#9ca3af" to "#333333"
    },
    divider: "#d2d2d2", // Changed from "#2d2d2d" to "#d2d2d2"
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#ffffff", // Changed from "#0f0f0f" to "#ffffff"
          color: "#000000", // Changed from "#f3f4f6" to "#000000"
        },
      },
    },
  },
});

interface MaterialUIProviderProps {
  children: ReactNode;
}

export function MaterialUIProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={invertedTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
