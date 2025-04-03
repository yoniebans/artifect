import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import "./animations.css";
import { LoadingProvider } from "@/components/loading/LoadingContext";
import { LoadingOverlay } from "@/components/loading/LoadingOverlay";
import { NavigationProgress } from "@/components/transitions/NavigationProgress";
import { Toaster } from "@/components/ui/toaster";
import { dark } from "@clerk/themes";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Projects",
  description: "Software design application powered by Claude AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
        >
          <LoadingProvider>
            <NavigationProgress />
            <header className="flex justify-end items-center p-4 gap-4 h-16">
              <SignedIn>
                <UserButton />
              </SignedIn>
            </header>
            <main className="flex-1">{children}</main>
            <LoadingOverlay />
            <Toaster />
          </LoadingProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
