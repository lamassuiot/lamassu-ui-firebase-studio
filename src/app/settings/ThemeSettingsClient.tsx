
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Settings as SettingsIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// Helper function to parse HSL string (e.g., "217 100% 53%") into HSL object
const parseHslString = (hslString: string): HSLColor | null => {
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (match) {
    return {
      h: parseInt(match[1], 10),
      s: parseInt(match[2], 10),
      l: parseInt(match[3], 10),
    };
  }
  // Attempt to parse format like "217 90% 60%" or "0 0% 98%"
  const matchNoPercentSymbols = hslString.match(/(\d+)\s+(\d+)\s+(\d+)/);
   if (matchNoPercentSymbols) {
    return {
      h: parseInt(matchNoPercentSymbols[1], 10),
      s: parseInt(matchNoPercentSymbols[2], 10),
      l: parseInt(matchNoPercentSymbols[3], 10),
    };
  }
  return null;
};

// Helper function to format HSL object back to string "H S% L%"
const formatHslToString = (hsl: HSLColor): string => {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
};

// Helper function to get contrasting foreground HSL string
const getForegroundHsl = (backgroundL: number): string => {
  return backgroundL > 50 ? '222 84% 5%' : '0 0% 98%'; // Dark blue or Near white
};

// Function to fetch current theme from globals.css
// This is a simplified mock for the client. In reality, the AI gets globals.css content.
// For the client component to pre-fill, it would ideally get this from a context or prop
// if we wanted to avoid direct (and complex) client-side CSS parsing.
// For now, this client will not pre-fill. It will start with default inputs.

export default function ThemeSettingsClient() {
  const { toast } = useToast();

  // Initial default values, these would ideally be parsed from globals.css
  const [primaryColor, setPrimaryColor] = useState<HSLColor>({ h: 217, s: 100, l: 53 });
  const [secondaryColor, setSecondaryColor] = useState<HSLColor>({ h: 195, s: 63, l: 79 });
  
  const [globalsCssContent, setGlobalsCssContent] = useState<string | null>(null);
  const [isLoadingGlobals, setIsLoadingGlobals] = useState(false);
  const [errorGlobals, setErrorGlobals] = useState<string | null>(null);

  // Simulate fetching globals.css content to show the AI how to update it.
  // In a real integration, the AI already has access to globals.css.
  // This function is illustrative for the AI's update logic.
  const getSimulatedGlobalsCss = () => `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    body {
      font-family: Arial, Helvetica, sans-serif;
    }

    @layer base {
      :root {
        --background: 208 100% 97%;
        --foreground: 222 84% 5%;
        /* ... other light theme vars ... */
        --primary: 217 100% 53%; 
        --primary-foreground: 0 0% 98%;
        --secondary: 195 63% 79%;
        --secondary-foreground: 220 10% 20%;
        /* ... other light theme vars ... */
      }

      .dark {
        --background: 222 40% 15%;
        --foreground: 210 40% 95%;
        /* ... other dark theme vars ... */
        --primary: 217 90% 60%;
        --primary-foreground: 0 0% 98%;
        --secondary: 217 30% 25%;
        --secondary-foreground: 210 40% 90%;
        /* ... other dark theme vars ... */
      }
    }
    /* ... rest of globals.css ... */
  `;


  const handleColorChange = (colorType: 'primary' | 'secondary', prop: keyof HSLColor, value: string) => {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) return;

    const setColor = colorType === 'primary' ? setPrimaryColor : setSecondaryColor;
    setColor(prev => {
      const newValue = Math.max(0, Math.min(prop === 'h' ? 360 : 100, numericValue));
      return { ...prev, [prop]: newValue };
    });
  };

  const handleApplyTheme = () => {
    toast({
      title: "Theme Ready to Apply",
      description: (
        <div>
          <p>Please ask the AI to apply the following theme settings:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Primary Color: HSL({primaryColor.h}, {primaryColor.s}%, {primaryColor.l}%)</li>
            <li>Secondary Color: HSL({secondaryColor.h}, {secondaryColor.s}%, {secondaryColor.l}%)</li>
          </ul>
          <p className="mt-2">Example: "Apply theme with primary HSL({primaryColor.h}, {primaryColor.s}%, {primaryColor.l}%) and secondary HSL({secondaryColor.h}, {secondaryColor.s}%, {secondaryColor.l}%)."</p>
        </div>
      ),
      duration: 15000, // Keep toast longer
    });
    console.log("Instruct user to ask AI to apply these theme settings:");
    console.log("Primary:", formatHslToString(primaryColor));
    console.log("Secondary:", formatHslToString(secondaryColor));

    // The AI will then generate the <changes> block for globals.css
    // based on the user's verbal request using these values.
  };


  const ColorInputFields: React.FC<{ color: HSLColor, colorName: 'primary' | 'secondary', onChange: (prop: keyof HSLColor, value: string) => void }> =
    ({ color, colorName, onChange }) => (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Label htmlFor={`${colorName}-h`}>Hue (0-360)</Label>
        <Input
          id={`${colorName}-h`}
          type="number"
          value={color.h}
          onChange={(e) => onChange('h', e.target.value)}
          min="0"
          max="360"
        />
      </div>
      <div>
        <Label htmlFor={`${colorName}-s`}>Saturation (0-100%)</Label>
        <Input
          id={`${colorName}-s`}
          type="number"
          value={color.s}
          onChange={(e) => onChange('s', e.target.value)}
          min="0"
          max="100"
        />
      </div>
      <div>
        <Label htmlFor={`${colorName}-l`}>Lightness (0-100%)</Label>
        <Input
          id={`${colorName}-l`}
          type="number"
          value={color.l}
          onChange={(e) => onChange('l', e.target.value)}
          min="0"
          max="100"
        />
      </div>
      <div className="col-span-3 h-10 rounded-md border mt-1" style={{ backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)` }} />
    </div>
  );


  return (
    <div className="w-full space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-semibold">Application Settings</h1>
      </div>
       <Alert>
        <Palette className="h-4 w-4" />
        <AlertTitle>Theme Customization Note</AlertTitle>
        <AlertDescription>
          Adjust the HSL values for your theme below. After setting your desired colors, click "Prepare Theme Update" and then verbally ask the AI to apply these new settings. The AI will then modify the <code>globals.css</code> file.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Theme Colors</CardTitle>
          <CardDescription>
            Customize the primary and secondary colors of your application.
            These colors are defined as HSL (Hue, Saturation, Lightness) values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Primary Color</h3>
            <ColorInputFields color={primaryColor} colorName="primary" onChange={(prop, val) => handleColorChange('primary', prop, val)} />
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-medium mb-2">Secondary Color</h3>
            <ColorInputFields color={secondaryColor} colorName="secondary" onChange={(prop, val) => handleColorChange('secondary', prop, val)} />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleApplyTheme}>
              <Save className="mr-2 h-4 w-4" /> Prepare Theme Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

