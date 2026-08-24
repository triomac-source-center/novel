import { History, KeyRound, ShieldCheck, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const POINTS = [
  {
    icon: Wallet,
    title: "Garde des fonds",
    description: "Vos dépôts sont détenus sur un wallet dédié à votre compte.",
  },
  {
    icon: History,
    title: "Historique transparent",
    description: "Chaque dépôt, investissement, transfert et retrait est journalisé et consultable.",
  },
  {
    icon: KeyRound,
    title: "Authentification sécurisée",
    description:
      "Connexion et inscription gérées par un fournisseur d'authentification tiers spécialisé, avec vérification par e-mail.",
  },
  {
    icon: ShieldCheck,
    title: "Réseau TRON",
    description: "Tous les mouvements de fonds transitent par le réseau TRON en USDT (TRC20), vérifiables publiquement on-chain.",
  },
]

export function Trust() {
  return (
    <section className="border-t border-border bg-muted/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Confiance &amp; sécurité</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((point) => (
            <Card key={point.title} className="border-border bg-card shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <point.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{point.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
