import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex-1 flex justify-center items-center">
      <SignUp
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
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
