
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
  const searchParams = useSearchParams()
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
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  fill="currentColor"
                  d="M11.23 2.7l-8.46 2.05v14.5l8.46 2.05L20 18.53V5.47zm-1.12 1.63l6.53 1.57v8.43l-6.53 5.45V4.33zm-1.25.31v12.02L2.7 15.3V7.2z"
                ></path>
              </svg>
              Sign In with Microsoft
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm">
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
