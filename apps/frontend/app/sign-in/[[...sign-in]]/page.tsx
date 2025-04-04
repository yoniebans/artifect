"use client";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect } from "react";
import { resetBackendAuthFailure } from "@/lib/api-client";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const hasError = searchParams?.get("error") === "auth_failed";

  // Reset backend auth failure when the sign-in page is loaded
  useEffect(() => {
    resetBackendAuthFailure();
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center items-center">
      {hasError && (
        <Alert variant="destructive" className="max-w-md mb-6">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            There was a problem with your account on our servers. This may be
            because your social login didn&apos;t provide an email address.
            Please try signing in with email and password instead, or contact
            support if the issue persists.
          </AlertDescription>
        </Alert>
      )}

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-background border border-border shadow-lg",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "bg-background border border-border text-foreground hover:bg-muted",
            formFieldLabel: "text-foreground",
            formFieldInput: "bg-background border border-input text-foreground",
            footerActionText: "text-muted-foreground",
            footerActionLink: "text-primary hover:text-primary-focus",
            identityPreviewText: "text-foreground",
            identityPreviewEditButtonIcon: "text-primary",
          },
        }}
        redirectUrl="/dashboard"
      />
    </div>
  );
}
