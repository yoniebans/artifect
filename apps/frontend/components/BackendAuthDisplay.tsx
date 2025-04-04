"use client";

import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { resetBackendAuthFailure } from "@/lib/api-client";

export function BackendAuthErrorDisplay() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      // Reset our backend auth failure flag before signing out
      resetBackendAuthFailure();

      // Use Clerk's signOut function which properly clears the session
      await signOut();

      // Redirect to landing page after successful sign-out
      // The redirect happens automatically with Clerk, but we'll add this as a fallback
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      console.error("Error signing out:", error);
      // Force a redirect to landing page as a fallback
      window.location.href = "/";
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full p-6 bg-background border rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Account Setup Issue</h2>
        <p className="mb-4">
          There was a problem with your account on our servers. This often
          happens when social login providers don&apos;t share all required
          information (like your email address).
        </p>
        <p className="mb-6">
          You can try signing out and then signing in again with a different
          method, or contact support if the issue persists.
        </p>
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Go Home
          </Button>
          <Button onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
}
