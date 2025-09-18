
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { Provider } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import React, { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const rawSearchParams = useSearchParams()
   const searchParams = rawSearchParams ?? new URLSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isMicrosoftLoading, setIsMicrosoftLoading] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      toast.error(message)
      // Clean the URL to prevent the toast from showing again on refresh
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router])
  
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const supabase =  await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      toast.error(error.message)
      setIsSubmitting(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const socialSignIn = async (provider: Provider) => {
    setIsMicrosoftLoading(true)
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: 'email',
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    
    console.log('Supabase OAuth response:', { data, error });

    if (error) {
      console.log('Microsoft sign in error:', error);
      toast.error(error.message)
      setIsMicrosoftLoading(false)
      return
    }

    if (data.url) {
      window.location.href = data.url
    }
  }
  
  const anyLoading = isSubmitting || isMicrosoftLoading

  return (
    <Card className="w-full max-w-md">
        <form onSubmit={handleSignIn}>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl">Sign In</CardTitle>
        <CardDescription>Enter your email below to login to your account</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={anyLoading}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={anyLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={anyLoading}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign In'}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          type="button"
          className="w-full"
          onClick={() => socialSignIn('azure')}
          disabled={anyLoading}
        >
          {isMicrosoftLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M2 3h9v9H2zm9 19H2v-9h9zM21 3v9h-9V3zm0 19h-9v-9h9z"/></svg>
              Sign In with Microsoft
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm mt-4">
        <p className="w-full">
            Don't have an account?{' '}
            <Link href="/signup" className="underline">
                Sign up
            </Link>
        </p>
      </CardFooter>
      </form>
    </Card>
  )
}
