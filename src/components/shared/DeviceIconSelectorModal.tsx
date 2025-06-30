
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HelpCircle, Router, Server, Thermometer, Laptop, Smartphone, Watch, Tv, Bot, ToyBrick, Car, Wind, Camera } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';


interface DeviceIconSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIconSelected: (iconName: string) => void;
  currentSelectedIconName?: string | null;
  initialIconColor: string;
  initialBgColor: string;
  onColorsChange: (colors: { iconColor: string; bgColor: string }) => void;
}

interface IconDefinition {
  name: string;
  IconComponent: React.ElementType;
}

// Curated list of icons from Lucide
const AVAILABLE_ICONS: IconDefinition[] = [
    { name: "Router", IconComponent: Router },
    { name: "Server", IconComponent: Server },
    { name: "Thermometer", IconComponent: Thermometer },
    { name: "Laptop", IconComponent: Laptop },
    { name: "Smartphone", IconComponent: Smartphone },
    { name: "Watch", IconComponent: Watch },
    { name: "Tv", IconComponent: Tv },
    { name: "Bot", IconComponent: Bot },
    { name: "ToyBrick", IconComponent: ToyBrick },
    { name: "Car", IconComponent: Car },
    { name: "Wind", IconComponent: Wind },
    { name: "Camera", IconComponent: Camera },
];


export const getLucideIconByName = (iconName: string | null): React.ElementType | null => {
    if (!iconName) return null;
    const foundIcon = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    return foundIcon ? foundIcon.IconComponent : HelpCircle; // Fallback icon
};


export const DeviceIconSelectorModal: React.FC<DeviceIconSelectorModalProps> = ({
  isOpen,
  onOpenChange,
  onIconSelected,
  currentSelectedIconName,
  initialIconColor,
  initialBgColor,
  onColorsChange,
}) => {

  const [localIconColor, setLocalIconColor] = useState(initialIconColor);
  const [localBgColor, setLocalBgColor] = useState(initialBgColor);

  useEffect(() => {
    if (isOpen) {
      setLocalIconColor(initialIconColor);
      setLocalBgColor(initialBgColor);
    }
  }, [isOpen, initialIconColor, initialBgColor]);

  const handleColorChange = (type: 'icon' | 'bg', value: string) => {
    if (type === 'icon') {
        setLocalIconColor(value);
        onColorsChange({ iconColor: value, bgColor: localBgColor });
    } else {
        setLocalBgColor(value);
        onColorsChange({ iconColor: localIconColor, bgColor: value });
    }
  };


  const handleSelect = (iconName: string) => {
    onIconSelected(iconName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Device Icon and Colors</DialogTitle>
          <DialogDescription>Choose an icon and its colors that best represents the device type.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 flex-grow min-h-0">
          <ScrollArea className="border rounded-md">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-4">
              {AVAILABLE_ICONS.map(({ name, IconComponent }) => (
                <Button
                  key={name}
                  variant={currentSelectedIconName === name ? "default" : "outline"}
                  className={cn(
                    "flex flex-col items-center justify-center h-24 p-2 space-y-1 text-center",
                    currentSelectedIconName === name && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleSelect(name)}
                  title={name}
                >
                  <IconComponent className={cn(
                      "h-8 w-8 mb-1", 
                      currentSelectedIconName === name ? "text-primary-foreground" : "text-primary"
                  )} />
                  <span className="text-xs truncate w-full">{name}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-6 pt-4">
            <div>
              <Label className="mb-2 block text-center">Preview</Label>
              <div className="flex justify-center">
                {getLucideIconByName(currentSelectedIconName) && React.createElement(getLucideIconByName(currentSelectedIconName)!, {
                    className: "h-16 w-16 p-3 rounded-lg",
                    style: { color: localIconColor, backgroundColor: localBgColor }
                })}
              </div>
            </div>
            
            <div className="space-y-4">
               <div>
                <Label htmlFor="icon-color-input" className="text-sm">Icon Color</Label>
                <Input
                id="icon-color-input"
                type="color"
                value={localIconColor}
                onChange={(e) => handleColorChange('icon', e.target.value)}
                className="mt-1 h-10 w-full p-1"
                />
              </div>
              <div>
                  <Label htmlFor="icon-bg-color-input" className="text-sm">Background Color</Label>
                  <Input
                  id="icon-bg-color-input"
                  type="color"
                  value={localBgColor}
                  onChange={(e) => handleColorChange('bg', e.target.value)}
                  className="mt-1 h-10 w-full p-1"
                  />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
