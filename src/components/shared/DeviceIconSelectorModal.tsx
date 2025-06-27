
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { HelpCircle } from 'lucide-react';

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
import { GoRadioTower } from 'react-icons/go';
import { BiSolidCreditCardFront } from 'react-icons/bi';
import { BsSdCard, BsHouse, BsHouseGear } from 'react-icons/bs';
import { IoMdCar } from 'react-icons/io';
import { AiOutlineIdcard } from 'react-icons/ai';
import { GiElectric } from 'react-icons/gi';
import { TbCrane } from 'react-icons/tb';


interface DeviceIconSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIconSelected: (iconName: string) => void;
  currentSelectedIconName?: string | null;
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
    { name: "GoRadioTower", IconComponent: GoRadioTower },
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
                <IconComponent className={cn(
                    "h-8 w-8 mb-1", 
                    currentSelectedIconName === name ? "text-primary-foreground" : "text-primary"
                )} />
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
