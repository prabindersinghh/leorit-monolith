import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";
import logo from "@/assets/leorit-logo.png";

const ManufacturerApply = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Leorit.ai" className="w-10 h-10 object-contain" />
            <span className="text-xl font-semibold text-foreground">Leorit.ai</span>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <main className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="border-border">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold">Work With Leorit.ai</CardTitle>
              <p className="text-muted-foreground mt-2">
                Join our network of verified manufacturers
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4">What you get:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Qualified buyers with clear requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Frozen specs — no last-minute changes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Structured QC process</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Payment certainty upon approval</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground text-center mb-6">
                  To apply as a manufacturer, please sign up and complete the verification process.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/signup" className="flex-1">
                    <Button className="w-full">
                      Sign Up to Apply
                    </Button>
                  </Link>
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Already have an account? Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ManufacturerApply;
