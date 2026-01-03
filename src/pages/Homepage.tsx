import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, ChevronRight } from "lucide-react";
import logo from "@/assets/leorit-logo.png";

const Homepage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Leorit.ai" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold text-foreground">Leorit.ai</span>
          </div>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            End-to-end manufacturing execution, without factory chaos.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Leorit.ai takes full responsibility for custom manufacturing orders — from specification locking and quality control to delivery coordination and payment release.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/buyer/start-order">
              <Button size="lg" className="gap-2">
                Start an Order
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/manufacturer/apply">
              <Button variant="outline" size="lg" className="gap-2">
                Work With Leorit
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 — WHO IS THIS FOR? */}
      <section className="py-20 px-6 bg-secondary">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Who is this for?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Buyers */}
            <Card className="border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-6">For Buyers</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">One accountable execution partner</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Locked specs & verified QC</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">On-time delivery</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Zero factory coordination</span>
                  </li>
                </ul>
                <Link to="/buyer/start-order">
                  <Button className="w-full gap-2">
                    Start an Order
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* For Manufacturers */}
            <Card className="border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-6">For Manufacturers</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Qualified buyers only</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Clear & frozen requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Structured QC process</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Payment certainty</span>
                  </li>
                </ul>
                <Link to="/manufacturer/apply">
                  <Button variant="outline" className="w-full gap-2">
                    Apply as Manufacturer
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 3 — HOW LEORIT.AI WORKS */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            How Leorit.ai Works
          </h2>
          
          {/* Flow diagram */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="px-6 py-3 bg-secondary rounded-lg border border-border">
              <span className="font-medium text-foreground">Buyer</span>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <div className="px-6 py-3 bg-primary text-primary-foreground rounded-lg">
              <span className="font-medium">Leorit.ai</span>
            </div>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <div className="px-6 py-3 bg-secondary rounded-lg border border-border">
              <span className="font-medium text-foreground">Manufacturer</span>
            </div>
          </div>

          <ul className="space-y-4 max-w-2xl mx-auto">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <span className="text-muted-foreground pt-1">Buyer places order with Leorit.ai</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <span className="text-muted-foreground pt-1">Leorit.ai defines specs & QC rules</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <span className="text-muted-foreground pt-1">Manufacturer executes</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <span className="text-muted-foreground pt-1">Leorit.ai verifies quality & delivery</span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <span className="text-muted-foreground pt-1">Payment released post-approval</span>
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 4 — WHY LEORIT.AI EXISTS */}
      <section className="py-20 px-6 bg-secondary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Why Leorit.ai Exists
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Manufacturing fails not because suppliers are unavailable, but because execution breaks — unclear specs, inconsistent quality, missed timelines, and no accountability.
          </p>
          <p className="text-lg text-foreground font-medium mt-6">
            Leorit.ai exists to absorb this chaos and deliver predictable outcomes.
          </p>
        </div>
      </section>

      {/* SECTION 5 — WHAT WE START WITH */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-8">
            What We Start With
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-8">
            We start with apparel and fabric manufacturing.
          </p>
          <ul className="space-y-3 max-w-md mx-auto mb-8">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-foreground flex-shrink-0" />
              <span className="text-muted-foreground">High volume</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-foreground flex-shrink-0" />
              <span className="text-muted-foreground">QC-sensitive</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Visually verifiable</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Repeated execution failures</span>
            </li>
          </ul>
          <p className="text-center text-foreground font-medium">
            This is a training ground — not a limitation.
          </p>
        </div>
      </section>

      {/* SECTION 6 — FOOTER */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Leorit.ai" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-semibold text-foreground">Leorit.ai</span>
                <p className="text-sm text-muted-foreground">Manufacturing execution partner</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Contact: <a href="mailto:contact@leorit.xyz" className="text-foreground hover:underline">contact@leorit.xyz</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
