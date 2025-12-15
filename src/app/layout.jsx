import { Inter, Lexend } from 'next/font/google'
import clsx from 'clsx'
import { AuthProvider } from '@/lib/auth-context'

import '@/styles/tailwind.css'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/nextjs'

export const metadata = {
  title: {
    template: '%s - TaxPal',
    default: 'TaxPal - Accounting made simple for small businesses',
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
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-white antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex h-full flex-col">
        {/* <SignedOut>
          <SignInButton/>
        </SignedOut>
        <SignedIn>
          <UserButton/>
        </SignedIn> */}
        <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
    </ClerkProvider>
  )
}
