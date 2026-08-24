import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="pt-20 pb-16 text-center lg:pt-28">
      <div className="mx-auto max-w-6xl px-6">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Des clusters d&apos;investissement gérés, financés et réglés en USDT sur TRON.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Déposez en USDT (réseau TRON, TRC20), investissez dans des clusters gérés par couches, et retirez vos
          gains à tout moment vers votre propre wallet.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-up">
            <Button size="lg">
              Créer un compte
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#comment-ca-marche">
            <Button variant="outline" size="lg">
              Voir comment ça marche
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}
