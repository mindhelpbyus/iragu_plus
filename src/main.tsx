import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from "./App.tsx";
import { queryClient } from './lib/queryClient';
// Single source of truth: globals.css (@import "tailwindcss" + Ink-on-Parchment
// tokens, JIT-compiled by @tailwindcss/vite). The old 7,000-line index.css dump
// is no longer imported.
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);
