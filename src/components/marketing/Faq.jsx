import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const FAQS = [
  {
    question: "Qu'est-ce qu'un cluster ?",
    answer:
      "Un pool d'investissement divisé en cellules réparties par couches de prix ; à chaque couche remplie, le prix augmente pour la suivante.",
  },
  {
    question: "Comment je récupère mon argent ?",
    answer: "Depuis la page Wallet, demandez un retrait vers n'importe quelle adresse TRON externe, en USDT (TRC20).",
  },
  {
    question: "Quels frais s'appliquent ?",
    answer: "16 % sont prélevés uniquement sur le gain réalisé lors d'un transfert de cellule — jamais sur le capital déposé ou investi.",
  },
  {
    question: "Quel réseau crypto est accepté ?",
    answer: "USDT sur le réseau TRON (TRC20) uniquement. Envoyer depuis un autre réseau entraîne une perte définitive.",
  },
  {
    question: "Le rendement est-il garanti ?",
    answer:
      "Non. Les gains dépendent uniquement de la demande réelle sur chaque cluster. Aucun rendement, aucun taux, et aucun résultat futur n'est garanti ou promis par la plateforme.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="border-t border-border py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Questions fréquentes</h2>
        </div>
        <div className="mt-12 space-y-4">
          {FAQS.map((faq) => (
            <Card key={faq.question} className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
