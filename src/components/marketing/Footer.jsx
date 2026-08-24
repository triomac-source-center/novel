import Link from "next/link"
import { Layers3 } from "lucide-react"

const LINKS = [
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#faq", label: "FAQ" },
]

const LEGAL_LINKS = [
  { href: "#", label: "Mentions légales" },
  { href: "#", label: "Confidentialité" },
  { href: "#", label: "CGU" },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers3 className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">triomac60</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} triomac60. Tous droits réservés.</p>
          <div className="flex gap-4">
            {LEGAL_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-xs text-muted-foreground hover:text-foreground">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
