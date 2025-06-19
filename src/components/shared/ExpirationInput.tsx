
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";

export type ExpirationType = "Duration" | "Date" | "Indefinite";

export interface ExpirationConfig {
  type: ExpirationType;
  durationValue?: string; // e.g., "10y", "365d"
  dateValue?: Date;       // Specific date
}

interface ExpirationInputProps {
  label: string;
  value: ExpirationConfig;
  onValueChange: (config: ExpirationConfig) => void;
  defaultType?: ExpirationType;
  defaultDuration?: string;
  defaultDate?: Date;
  idPrefix: string; // To ensure unique IDs for elements
}

const INDEFINITE_DATE_VALUE = new Date("9999-12-31T23:59:59.999Z");

export const ExpirationInput: React.FC<ExpirationInputProps> = ({
  label,
  value,
  onValueChange,
  defaultType = "Duration",
  defaultDuration = "1y",
  defaultDate,
  idPrefix,
}) => {
  const [currentType, setCurrentType] = useState<ExpirationType>(value.type || defaultType);
  const [duration, setDuration] = useState<string>(value.durationValue || defaultDuration);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value.dateValue || defaultDate);

  useEffect(() => {
    // Sync with prop value changes
    setCurrentType(value.type);
    setDuration(value.durationValue || defaultDuration);
    setSelectedDate(value.dateValue || defaultDate);
  }, [value, defaultDuration, defaultDate]);

  const handleTypeChange = (newType: ExpirationType) => {
    setCurrentType(newType);
    let newConfig: ExpirationConfig = { type: newType };
    if (newType === "Duration") {
      newConfig.durationValue = duration;
    } else if (newType === "Date") {
      newConfig.dateValue = selectedDate || new Date(); // Default to today if no date selected
    } else if (newType === "Indefinite") {
      // For Indefinite, no specific value is stored in the config other than type
      // The parent component will translate this to the special date for the API
    }
    onValueChange(newConfig);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = e.target.value;
    setDuration(newDuration);
    if (currentType === "Duration") {
      onValueChange({ type: "Duration", durationValue: newDuration });
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (currentType === "Date" && date) {
      onValueChange({ type: "Date", dateValue: date });
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-type`}>{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 items-end">
        <Select value={currentType} onValueChange={(val) => handleTypeChange(val as ExpirationType)}>
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Duration">Duration</SelectItem>
            <SelectItem value="Date">Specific Date</SelectItem>
            <SelectItem value="Indefinite">Indefinite</SelectItem>
          </SelectContent>
        </Select>

        {currentType === "Duration" && (
          <div>
            <Input
              id={`${idPrefix}-duration`}
              type="text"
              value={duration}
              onChange={handleDurationChange}
              placeholder="e.g., 10y, 365d, 2w"
            />
             <p className="text-xs text-muted-foreground mt-1">Valid units: y, w, d, h, m, s.</p>
          </div>
        )}
        {currentType === "Date" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={`${idPrefix}-date-picker`}
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate && isValid(selectedDate) ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}
        {currentType === "Indefinite" && (
          <Input
            id={`${idPrefix}-indefinite`}
            value="Never Expires (9999-12-31)"
            readOnly
            className="bg-muted/50"
          />
        )}
      </div>
    </div>
  );
};
