import { Header } from '@/components/marketing/Header'
import { Hero } from '@/components/marketing/Hero'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Features } from '@/components/marketing/Features'
import { Trust } from '@/components/marketing/Trust'
import { Faq } from '@/components/marketing/Faq'
import { CallToAction } from '@/components/marketing/CallToAction'
import { Footer } from '@/components/marketing/Footer'

export default function Home() {
  return (
    <>
      <Header />
      <main className="bgmain">
        <Hero />
        <HowItWorks />
        <Features />
        <Trust />
        <Faq />
        <CallToAction />
      </main>
      <Footer />
    </>
  )
}
