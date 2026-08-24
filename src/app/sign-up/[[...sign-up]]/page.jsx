import { SignUp } from '@clerk/nextjs'
import { AuthLayout } from '@/components/marketing/AuthLayout'

export const metadata = {
  title: 'Inscription',
}

export default function Register() {
  return (
    <AuthLayout tagline="Créez votre compte et commencez à investir en quelques minutes.">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Créez votre compte</h1>
      <div className="mt-8">
        <SignUp redirectUrl="/dashboard" />
      </div>
    </AuthLayout>
  )
}
