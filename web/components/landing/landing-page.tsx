import { LandingNav } from "./nav";
import { Hero } from "./hero";
import { IntegrationsBar } from "./integrations-bar";
import { HowItWorks } from "./how-it-works";
import { Features } from "./features";
import { AskDemo } from "./ask-demo";
import { CtaBanner } from "./cta-banner";
import { LandingFooter } from "./footer";

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#F1EEE4] text-[#15171D]">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <IntegrationsBar />
        <HowItWorks />
        <Features />
        <AskDemo />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
