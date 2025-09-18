
'use client'

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Header({ user }: { user: User | null }) {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
   <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container mx-auto flex h-14 items-center px-4">
    <div className="mr-4 flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="w-10 h-auto">
          <Icon
            icon="streamline-pixel:email-mail-chat"
            width="42"
            height="42"
            className="text-primary"
          />
        </span>
        <span className="font-bold hidden sm:inline-block text-2xl font-headline">
          HelpFlow
        </span>
      </Link>
    </div>
    <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
      {user ? (
        <>
          <Button variant="ghost" asChild className="h-9 px-3 text-sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button onClick={handleSignOut} className="h-9 px-3 text-sm">
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost" asChild className="h-9 px-3 text-sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="h-9 px-3 text-sm">
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </>
      )}
    </div>
  </div>
</header>
  );
}
