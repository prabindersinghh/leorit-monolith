import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X, Move, RotateCw, ZoomIn, Save } from "lucide-react";
import { toast } from "sonner";

interface DesignEditorProps {
  frontDesign: string;
  backDesign?: string;
  onClose: () => void;
  onSave: (settings: DesignSettings) => void;
}

interface DesignSettings {
  frontPosition: { x: number; y: number };
  backPosition: { x: number; y: number };
  frontScale: number;
  backScale: number;
  frontRotation: number;
  backRotation: number;
}

const DesignEditor = ({ frontDesign, backDesign, onClose, onSave }: DesignEditorProps) => {
  const [activeView, setActiveView] = useState<"front" | "back">("front");
  const [settings, setSettings] = useState<DesignSettings>({
    frontPosition: { x: 50, y: 50 },
    backPosition: { x: 50, y: 50 },
    frontScale: 100,
    backScale: 100,
    frontRotation: 0,
    backRotation: 0,
  });

  const updateFrontPosition = (axis: "x" | "y", value: number) => {
    setSettings(prev => ({
      ...prev,
      frontPosition: { ...prev.frontPosition, [axis]: value }
    }));
  };

  const updateBackPosition = (axis: "x" | "y", value: number) => {
    setSettings(prev => ({
      ...prev,
      backPosition: { ...prev.backPosition, [axis]: value }
    }));
  };

  const handleSave = () => {
    onSave(settings);
    toast.success("Design settings saved!");
    onClose();
  };

  const currentDesign = activeView === "front" ? frontDesign : backDesign;
  const currentPosition = activeView === "front" ? settings.frontPosition : settings.backPosition;
  const currentScale = activeView === "front" ? settings.frontScale : settings.backScale;
  const currentRotation = activeView === "front" ? settings.frontRotation : settings.backRotation;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground">Advanced Design Editor</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={activeView === "front" ? "default" : "outline"}
                onClick={() => setActiveView("front")}
              >
                Front
              </Button>
              {backDesign && (
                <Button
                  size="sm"
                  variant={activeView === "back" ? "default" : "outline"}
                  onClick={() => setActiveView("back")}
                >
                  Back
                </Button>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div className="space-y-4">
            <Label>Live Preview</Label>
            <div className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden border-2 border-border">
              {currentDesign && (
                <div
                  className="absolute"
                  style={{
                    left: `${currentPosition.x}%`,
                    top: `${currentPosition.y}%`,
                    transform: `translate(-50%, -50%) scale(${currentScale / 100}) rotate(${currentRotation}deg)`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <img 
                    src={currentDesign} 
                    alt="Design preview" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Controls Area */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-muted-foreground" />
                <Label>Position</Label>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Horizontal (X)</Label>
                  <Slider
                    value={[activeView === "front" ? settings.frontPosition.x : settings.backPosition.x]}
                    onValueChange={([value]) => 
                      activeView === "front" ? updateFrontPosition("x", value) : updateBackPosition("x", value)
                    }
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vertical (Y)</Label>
                  <Slider
                    value={[activeView === "front" ? settings.frontPosition.y : settings.backPosition.y]}
                    onValueChange={([value]) => 
                      activeView === "front" ? updateFrontPosition("y", value) : updateBackPosition("y", value)
                    }
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                <Label>Scale ({currentScale}%)</Label>
              </div>
              <Slider
                value={[currentScale]}
                onValueChange={([value]) => 
                  setSettings(prev => ({
                    ...prev,
                    [activeView === "front" ? "frontScale" : "backScale"]: value
                  }))
                }
                min={50}
                max={150}
                step={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-muted-foreground" />
                <Label>Rotation ({currentRotation}°)</Label>
              </div>
              <Slider
                value={[currentRotation]}
                onValueChange={([value]) => 
                  setSettings(prev => ({
                    ...prev,
                    [activeView === "front" ? "frontRotation" : "backRotation"]: value
                  }))
                }
                min={-180}
                max={180}
                step={5}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignEditor;
