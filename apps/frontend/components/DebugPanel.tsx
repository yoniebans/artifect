"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";

export function DebugPanel() {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { getToken } = useAuth();

  const makeTestRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First test if we can reach the backend at all
      const url =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      console.log(`Testing connection to: ${url}`);

      // Get auth info
      const token = await getToken();

      // Check token details
      let tokenInfo = "No token available";
      if (token) {
        // Parse the token to check expiration
        try {
          const tokenParts = token.split(".");
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);
            const expires = payload.exp;
            const isExpired = expires < now;

            tokenInfo =
              `Token available (starts with: ${token.substring(0, 15)}...)\n` +
              `Expires: ${new Date(expires * 1000).toISOString()}\n` +
              `Status: ${isExpired ? "EXPIRED" : "Valid"}\n` +
              `Time left: ${
                isExpired
                  ? "Expired"
                  : Math.floor((expires - now) / 60) + " minutes"
              }`;
          } else {
            tokenInfo = `Token available but malformed`;
          }
        } catch (e) {
          tokenInfo = `Token available but could not parse: ${
            e instanceof Error ? e.message : "Unknown error"
          }`;
        }
      }

      // Make a simple fetch request to test CORS and connectivity
      const directResponse = await fetch(`${url}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const directStatus = directResponse.status;
      let directBody = "No response body";
      try {
        directBody = JSON.stringify(await directResponse.json());
      } catch (e) {
        directBody = await directResponse.text();
      }

      // Now try using our API client
      let apiResponse = "Not attempted";
      try {
        const data = await fetchApi("/");
        apiResponse = JSON.stringify(data);
      } catch (e) {
        apiResponse = `Error: ${
          e instanceof Error ? e.message : "Unknown error"
        }`;
      }

      setResult(
        `Auth info:\n${tokenInfo}\n\n` +
          `Direct request: [${directStatus}] ${directBody}\n\n` +
          `API client request: ${apiResponse}\n\n` +
          `Environment: ${process.env.NODE_ENV}\n` +
          `Backend URL: ${url}`
      );
    } catch (e) {
      console.error("Debug test failed:", e);
      setError(
        `Connection test failed: ${
          e instanceof Error ? e.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded mt-8 bg-muted/20">
      <h2 className="text-lg font-bold mb-2">API Debug</h2>
      <Button
        onClick={makeTestRequest}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? "Testing..." : "Test API Connection"}
      </Button>

      {error && (
        <div className="mt-2 p-2 bg-destructive/20 text-destructive rounded">
          {error}
        </div>
      )}

      {result && (
        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
