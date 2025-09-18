
'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Signup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
        },
    })
    
    setLoading(false)

    if (error) {
        toast.error(error.message)
        return
    }

    if (data.user && data.session) {
        toast.success('Please check your email to continue signing up.')
        router.push('/login')
    } else {
        toast.info('User already exists or session is active. Please try logging in.');
        router.push('/login')
    }
  }

  return (
    <Card className="w-full max-w-md">
      <form onSubmit={handleSignUp}>
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Create an account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
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
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Create account'}
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm mt-4">
            <p className="w-full">
                Already have an account?{' '}
                <Link href="/login" className="underline">
                    Sign in
                </Link>
            </p>
        </CardFooter>
      </form>
    </Card>
  )
}
