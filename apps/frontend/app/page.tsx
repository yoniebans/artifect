"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <SignedOut>
        <div className="max-w-md w-full p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold">
              AI-Assisted Software Engineering
            </h1>
            <p className="mt-4 text-muted-foreground">
              Design better software with AI assistance
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <Link href="/sign-in" className="w-full">
              <Button className="w-full" variant="default">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full">
              <Button className="w-full" variant="outline">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome Back</h1>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button variant="default">Go to Projects</Button>
            </Link>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
