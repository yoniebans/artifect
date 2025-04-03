import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-full">
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
