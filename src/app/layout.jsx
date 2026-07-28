import { Inter, Lexend } from 'next/font/google'
import clsx from 'clsx'
import { AuthProvider } from '@/lib/auth-context'
import { WalletProvider } from '@/lib/wallet-context'
import { ToastProvider } from '@/lib/toast-context'

import '@/styles/tailwind.css'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/nextjs'

export const metadata = {
  title: {
    template: '%s | triomac60',
    default: 'triomac60 | Layered cluster investing',
  },
  description:
    'Most bookkeeping software is accurate, but hard to use. We make the opposite trade-off, and hope you don’t get audited.',
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
    <html
      lang="fr"
      className={clsx(
        'dark h-full scroll-smooth bg-background antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex h-full flex-col bg-background text-foreground">
        {/* <SignedOut>
          <SignInButton/>
        </SignedOut>
        <SignedIn>
          <UserButton/>
        </SignedIn> */}
        <AuthProvider>
          <WalletProvider>
            <ToastProvider>{children}</ToastProvider>
          </WalletProvider>
        </AuthProvider>
        </body>
    </html>
    </ClerkProvider>
  )
}
