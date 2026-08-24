import Link from "next/link"
import { History, KeyRound, Layers3, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const REASSURANCE_POINTS = [
  { icon: Wallet, text: "Vos fonds sont détenus en wallet dédié à votre compte." },
  { icon: History, text: "Historique complet de chaque transaction." },
  { icon: KeyRound, text: "Retraits vers votre wallet TRON en quelques minutes." },
]

// Reassurance panel appears first in the DOM so it stacks ABOVE the form on mobile (default
// flex-col); on desktop (lg:flex-row) the order-* utilities put the form back on the left.
export function AuthLayout({ tagline, children }) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <div className="flex items-center justify-center border-b border-border bg-muted/20 px-6 py-10 lg:order-2 lg:w-[420px] lg:border-b-0 lg:border-l lg:py-0">
        <Card className="w-full max-w-sm border-border shadow-sm">
          <CardContent className="pt-6">
            <p className="text-lg font-semibold tracking-tight text-foreground">{tagline}</p>
            <ul className="mt-6 space-y-4">
              {REASSURANCE_POINTS.map((point) => (
                <li key={point.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <point.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-muted-foreground">{point.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:order-1 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers3 className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">triomac60</span>
          </Link>
          <div className="mt-10">{children}</div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Connexion sécurisée</p>
        </div>
      </div>
    </div>
  )
}
