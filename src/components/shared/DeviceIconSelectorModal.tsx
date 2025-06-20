'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as LucideIcons from 'lucide-react';

interface DeviceIconSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIconSelected: (iconName: string) => void;
  currentSelectedIconName?: string | null;
}

// Define a type for the structure of our icon list
interface IconDefinition {
  name: keyof typeof LucideIcons; // Ensures names are valid Lucide icon names
  IconComponent: React.ElementType;
}

// Curated list of Lucide icons for IoT devices
const AVAILABLE_ICONS: IconDefinition[] = [
  { name: 'Router', IconComponent: LucideIcons.Router },
  { name: 'Smartphone', IconComponent: LucideIcons.Smartphone },
  { name: 'Tablet', IconComponent: LucideIcons.Tablet },
  { name: 'Laptop', IconComponent: LucideIcons.Laptop },
  { name: 'Monitor', IconComponent: LucideIcons.Monitor },
  { name: 'HardDrive', IconComponent: LucideIcons.HardDrive },
  { name: 'Server', IconComponent: LucideIcons.Server },
  { name: 'Cpu', IconComponent: LucideIcons.Cpu },
  { name: 'MemoryStick', IconComponent: LucideIcons.MemoryStick },
  { name: 'Chip', IconComponent: LucideIcons.Chip },
  { name: 'Radio', IconComponent: LucideIcons.Radio },
  { name: 'Wifi', IconComponent: LucideIcons.Wifi },
  { name: 'Bluetooth', IconComponent: LucideIcons.Bluetooth },
  { name: 'Signal', IconComponent: LucideIcons.Signal },
  { name: 'BatteryFull', IconComponent: LucideIcons.BatteryFull },
  { name: 'Thermometer', IconComponent: LucideIcons.Thermometer },
  { name: 'Lightbulb', IconComponent: LucideIcons.Lightbulb },
  { name: 'Fan', IconComponent: LucideIcons.Fan },
  { name: 'Lock', IconComponent: LucideIcons.Lock },
  { name: 'KeyRound', IconComponent: LucideIcons.KeyRound },
  { name: 'Camera', IconComponent: LucideIcons.Camera },
  { name: 'Video', IconComponent: LucideIcons.Video },
  { name: 'Settings2', IconComponent: LucideIcons.Settings2 },
  { name: 'Power', IconComponent: LucideIcons.Power },
  { name: 'Plug', IconComponent: LucideIcons.Plug },
  { name: 'Speaker', IconComponent: LucideIcons.Speaker },
  { name: 'Printer', IconComponent: LucideIcons.Printer },
  { name: 'Scanner', IconComponent: LucideIcons.Scanner },
  { name: 'Cloud', IconComponent: LucideIcons.Cloud },
  { name: 'Database', IconComponent: LucideIcons.Database },
  { name: 'Disc3', IconComponent: LucideIcons.Disc3 },
  { name: 'CircuitBoard', IconComponent: LucideIcons.CircuitBoard },
  { name: 'Activity', IconComponent: LucideIcons.Activity },
  { name: 'AirVent', IconComponent: LucideIcons.AirVent },
  { name: 'AlertTriangle', IconComponent: LucideIcons.AlertTriangle },
  { name: 'Archive', IconComponent: LucideIcons.Archive },
  { name: 'AppWindow', IconComponent: LucideIcons.AppWindow },
  { name: 'BadgeAlert', IconComponent: LucideIcons.BadgeAlert },
  { name: 'Box', IconComponent: LucideIcons.Box },
  { name: 'Briefcase', IconComponent: LucideIcons.Briefcase },
  { name: 'Cable', IconComponent: LucideIcons.Cable },
  { name: 'Container', IconComponent: LucideIcons.Container },
  { name: 'DiscAlbum', IconComponent: LucideIcons.DiscAlbum },
  { name: 'Gauge', IconComponent: LucideIcons.Gauge },
  { name: 'Globe', IconComponent: LucideIcons.Globe },
  { name: 'Home', IconComponent: LucideIcons.Home },
  { name: 'Image', IconComponent: LucideIcons.Image },
  { name: 'LifeBuoy', IconComponent: LucideIcons.LifeBuoy },
  { name: 'Link', IconComponent: LucideIcons.Link },
  { name: 'MapPin', IconComponent: LucideIcons.MapPin },
  { name: 'MessageSquare', IconComponent: LucideIcons.MessageSquare },
  { name: 'Mic', IconComponent: LucideIcons.Mic },
  { name: 'Navigation', IconComponent: LucideIcons.Navigation },
  { name: 'Network', IconComponent: LucideIcons.Network },
  { name: 'Package', IconComponent: LucideIcons.Package },
  { name: 'QrCode', IconComponent: LucideIcons.QrCode },
  { name: 'SatelliteDish', IconComponent: LucideIcons.SatelliteDish },
  { name: 'Save', IconComponent: LucideIcons.Save },
  { name: 'Shield', IconComponent: LucideIcons.Shield },
  { name: 'ShoppingBag', IconComponent: LucideIcons.ShoppingBag },
  { name: 'Siren', IconComponent: LucideIcons.Siren },
  { name: 'SlidersHorizontal', IconComponent: LucideIcons.SlidersHorizontal },
  { name: 'ToyBrick', IconComponent: LucideIcons.ToyBrick },
  { name: 'Trash2', IconComponent: LucideIcons.Trash2 },
  { name: 'UploadCloud', IconComponent: LucideIcons.UploadCloud },
  { name: 'User', IconComponent: LucideIcons.User },
  { name: 'Volume2', IconComponent: LucideIcons.Volume2 },
  { name: 'Wallet', IconComponent: LucideIcons.Wallet },
  { name: 'Webhook', IconComponent: LucideIcons.Webhook },
  { name: 'Zap', IconComponent: LucideIcons.Zap },
];

export const getLucideIconByName = (iconName: string | null): React.ElementType | null => {
    if (!iconName) return null;
    const foundIcon = AVAILABLE_ICONS.find(icon => icon.name === iconName);
    return foundIcon ? foundIcon.IconComponent : LucideIcons.HelpCircle; // Fallback icon
};


export const DeviceIconSelectorModal: React.FC<DeviceIconSelectorModalProps> = ({
  isOpen,
  onOpenChange,
  onIconSelected,
  currentSelectedIconName,
}) => {

  const handleSelect = (iconName: string) => {
    onIconSelected(iconName);
    onOpenChange(false); // Close modal on selection
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Device Icon</DialogTitle>
          <DialogDescription>Choose an icon that best represents the device type.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 border rounded-md">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 p-4">
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
                <IconComponent className="h-8 w-8 mb-1 text-primary" />
                <span className="text-xs truncate w-full">{name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
