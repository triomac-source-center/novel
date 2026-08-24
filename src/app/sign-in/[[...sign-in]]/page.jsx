import { SignIn } from '@clerk/nextjs'
import { AuthLayout } from '@/components/marketing/AuthLayout'

export const metadata = {
  title: 'Connexion',
}

export default function Login() {
  return (
    <AuthLayout tagline="Accédez à votre espace d'investissement.">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connectez-vous à votre compte</h1>
      <div className="mt-8">
        <SignIn redirectUrl="/dashboard" />
      </div>
    </AuthLayout>
  )
}
