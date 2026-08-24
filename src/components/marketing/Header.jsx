"use client"

import Link from "next/link"
import { Layers3 } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#faq", label: "FAQ" },
]

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <Layers3 className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">triomac60</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="outline" size="sm">
              Connexion
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Créer un compte</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
