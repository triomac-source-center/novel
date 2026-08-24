import { Card, CardContent } from "@/components/ui/card"

const STEPS = [
  {
    step: "1",
    title: "Déposez en USDT",
    description: "Générez une adresse de dépôt TRON dédiée à votre compte et envoyez vos USDT (TRC20).",
  },
  {
    step: "2",
    title: "Rejoignez un cluster",
    description:
      "Achetez des cellules dans un cluster ouvert ; chaque couche se remplit à un prix, puis la suivante ouvre à un prix plus élevé.",
  },
  {
    step: "3",
    title: "Les gains réels sont distribués",
    description:
      "Quand une cellule change de main à un prix supérieur, la plus-value revient au propriétaire précédent, au prorata.",
  },
  {
    step: "4",
    title: "Retirez à tout moment",
    description: "Transférez vos USDT vers n'importe quelle adresse TRON externe.",
  },
]

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="border-t border-border py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Comment ça marche</h2>
          <p className="mt-3 text-muted-foreground">Un flux simple, de bout en bout, entièrement traçable.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <Card key={item.step} className="border-border shadow-sm">
              <CardContent className="pt-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {item.step}
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
