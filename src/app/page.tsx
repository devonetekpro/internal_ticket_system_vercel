
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import ChatWidget from '@/components/chat-widget'

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <section className="space-y-6 py-12">
          <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center">
            <h1 className="font-headline text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">
              Effortless Support, Seamless Flow
            </h1>
            <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
              Welcome to HelpFlow, your all-in-one solution for managing customer support and internal tickets.
            </p>
            <div className="space-x-4">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/login"}>
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
               <Button asChild size="lg" variant="outline">
                <Link href="/live-chat" target="_blank">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Live Chat Demo
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <ChatWidget />
    </div>
  )
}
