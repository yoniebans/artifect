"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of our context
type LoadingContextType = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
};

// Create the context with a default value
const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setLoading: () => undefined, // no-op function
  loadingMessage: "",
  setLoadingMessage: () => undefined, // no-op function
});

// Hook for easy context consumption
export const useLoading = () => useContext(LoadingContext);

// Provider component
export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setMessageState] = useState("");

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const setLoadingMessage = (message: string) => {
    setMessageState(message);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        loadingMessage,
        setLoadingMessage,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};
