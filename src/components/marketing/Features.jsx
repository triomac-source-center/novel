import { Award, CandlestickChart, Layers3, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FEATURES = [
  {
    icon: Layers3,
    title: "Clusters & cellules",
    description:
      "Chaque cluster est divisé en cellules réparties par couches de prix croissant ; les gains se réalisent au fil des transferts entre couches.",
  },
  {
    icon: Award,
    title: "Marché des Authorship Blocks",
    description:
      "Achetez à l'avance la part système future d'une couche à prix réduit, et revendez-la librement sur un marché secondaire.",
  },
  {
    icon: CandlestickChart,
    title: "Terminal de trading",
    description: "Vue unifiée façon MT5 : watchlist, graphique en chandelles, carnet d'ordres pour cellules et blocks.",
  },
  {
    icon: Wallet,
    title: "Dépôt / retrait TRON natif",
    description:
      "Adresse de dépôt dédiée par utilisateur (USDT TRC20), détection automatique, retraits vers n'importe quel wallet externe.",
  },
]

export function Features() {
  return (
    <section id="fonctionnalites" className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Fonctionnalités</h2>
          <p className="mt-3 text-muted-foreground">Ce que vous trouvez réellement dans la plateforme.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="border-border shadow-sm">
              <CardHeader>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
