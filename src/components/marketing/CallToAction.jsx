import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Prêt à commencer ?</h2>
        <p className="mt-3 text-muted-foreground">
          Créez votre compte et générez votre première adresse de dépôt en quelques minutes.
        </p>
        <div className="mt-8">
          <Link href="/sign-up">
            <Button size="lg">Créer un compte</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
