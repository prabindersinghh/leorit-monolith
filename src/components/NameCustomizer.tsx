import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Type, Save } from "lucide-react";
import { toast } from "sonner";

interface NameCustomizerProps {
  csvColumns: string[];
  designPreview: string;
  onClose: () => void;
  onSave: (settings: NameSettings) => void;
}

export interface NameSettings {
  nameColumn: string;
  position: { x: number; y: number };
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
}

const NameCustomizer = ({ csvColumns, designPreview, onClose, onSave }: NameCustomizerProps) => {
  const [settings, setSettings] = useState<NameSettings>({
    nameColumn: csvColumns[0] || "",
    position: { x: 50, y: 70 },
    fontSize: 24,
    fontFamily: "Arial",
    color: "#000000",
    rotation: 0,
  });

  const handleSave = () => {
    if (!settings.nameColumn) {
      toast.error("Please select a column for names");
      return;
    }
    onSave(settings);
    toast.success("Name settings saved!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Customize Name Placement</h2>
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
              <img 
                src={designPreview} 
                alt="Design preview" 
                className="w-full h-full object-contain"
              />
              <div
                className="absolute"
                style={{
                  left: `${settings.position.x}%`,
                  top: `${settings.position.y}%`,
                  transform: `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
                  fontSize: `${settings.fontSize}px`,
                  fontFamily: settings.fontFamily,
                  color: settings.color,
                  fontWeight: "bold",
                  transition: "all 0.2s ease",
                  textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                SAMPLE NAME
              </div>
            </div>
          </div>

          {/* Controls Area */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Select Name Column from CSV</Label>
              <Select value={settings.nameColumn} onValueChange={(value) => setSettings(prev => ({ ...prev, nameColumn: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose column" />
                </SelectTrigger>
                <SelectContent>
                  {csvColumns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Position</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Horizontal (X)</Label>
                  <Slider
                    value={[settings.position.x]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, position: { ...prev.position, x: value } }))}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vertical (Y)</Label>
                  <Slider
                    value={[settings.position.y]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, position: { ...prev.position, y: value } }))}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Font Size ({settings.fontSize}px)</Label>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, fontSize: value }))}
                min={12}
                max={72}
                step={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Font Family</Label>
              <Select value={settings.fontFamily} onValueChange={(value) => setSettings(prev => ({ ...prev, fontFamily: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Text Color</Label>
              <Input
                type="color"
                value={settings.color}
                onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                className="h-12 cursor-pointer"
              />
            </div>

            <div className="space-y-3">
              <Label>Rotation ({settings.rotation}°)</Label>
              <Slider
                value={[settings.rotation]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, rotation: value }))}
                min={-45}
                max={45}
                step={5}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
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

export default NameCustomizer;
