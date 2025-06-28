
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HelpCircle } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

// Import desired icons from react-icons
import {
    MdDeviceThermostat,
    MdOutlineElectricScooter,
    MdOutlineElectricRickshaw,
    MdOutlineElectricalServices,
    MdOutlineElectricMeter,
    MdOutlineElectricBike,
    MdOutlineTrain,
    MdOutlineElevator
} from 'react-icons/md';
import {
    CgDatabase,
    CgModem,
    CgSmartHomeBoiler,
    CgSmartHomeCooker,
    CgSmartHomeHeat,
    CgSmartHomeLight,
    CgSmartHomeRefrigerator,
    CgSmartHomeWashMachine,
    CgSmartphone,
    CgSmartphoneChip,
    CgSmartphoneRam,
    CgSmartphoneShake,
    CgBatteryFull
} from 'react-icons/cg';
import { BiSolidCreditCardFront } from 'react-icons/bi';
import { BsSdCard, BsHouse, BsHouseGear } from 'react-icons/bs';
import { IoMdCar } from 'react-icons/io';
import { AiOutlineIdcard } from 'react-icons/ai';
import { GiElectric, GiRadioTower } from 'react-icons/gi';
import { TbCrane } from 'react-icons/tb';


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

const AVAILABLE_ICONS: IconDefinition[] = [
    { name: "MdDeviceThermostat", IconComponent: MdDeviceThermostat },
    { name: "MdOutlineElectricScooter", IconComponent: MdOutlineElectricScooter },
    { name: "MdOutlineElectricRickshaw", IconComponent: MdOutlineElectricRickshaw },
    { name: "MdOutlineElectricalServices", IconComponent: MdOutlineElectricalServices },
    { name: "MdOutlineElectricMeter", IconComponent: MdOutlineElectricMeter },
    { name: "MdOutlineElectricBike", IconComponent: MdOutlineElectricBike },
    { name: "MdOutlineTrain", IconComponent: MdOutlineTrain },
    { name: "CgDatabase", IconComponent: CgDatabase },
    { name: "CgModem", IconComponent: CgModem },
    { name: "CgSmartHomeBoiler", IconComponent: CgSmartHomeBoiler },
    { name: "CgSmartHomeCooker", IconComponent: CgSmartHomeCooker },
    { name: "CgSmartHomeHeat", IconComponent: CgSmartHomeHeat },
    { name: "CgSmartHomeLight", IconComponent: CgSmartHomeLight },
    { name: "CgSmartHomeRefrigerator", IconComponent: CgSmartHomeRefrigerator },
    { name: "CgSmartHomeWashMachine", IconComponent: CgSmartHomeWashMachine },
    { name: "CgSmartphone", IconComponent: CgSmartphone },
    { name: "CgSmartphoneChip", IconComponent: CgSmartphoneChip },
    { name: "CgSmartphoneRam", IconComponent: CgSmartphoneRam },
    { name: "CgSmartphoneShake", IconComponent: CgSmartphoneShake },
    { name: "CgBatteryFull", IconComponent: CgBatteryFull },
    { name: "GiRadioTower", IconComponent: GiRadioTower },
    { name: "BiSolidCreditCardFront", IconComponent: BiSolidCreditCardFront },
    { name: "BsSdCard", IconComponent: BsSdCard },
    { name: "IoMdCar", IconComponent: IoMdCar },
    { name: "AiOutlineIdcard", IconComponent: AiOutlineIdcard },
    { name: "GiElectric", IconComponent: GiElectric },
    { name: "BsHouse", IconComponent: BsHouse },
    { name: "BsHouseGear", IconComponent: BsHouseGear },
    { name: "TbCrane", IconComponent: TbCrane },
    { name: "MdOutlineElevator", IconComponent: MdOutlineElevator },
];


export const getReactIconByName = (iconName: string | null): React.ElementType | null => {
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
          <ScrollArea className="flex-grow my-4 border rounded-md">
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
                  <span className="text-xs truncate w-full">{name.replace(/^(Md|Cg|Bs|Io|Ai|Gi|Tb)/, '')}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-6 pt-4">
            <div>
              <Label className="mb-2 block text-center">Preview</Label>
              <div className="flex justify-center">
                {getReactIconByName(currentSelectedIconName) && React.createElement(getReactIconByName(currentSelectedIconName)!, {
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
