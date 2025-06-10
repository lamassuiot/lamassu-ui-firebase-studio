
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, PlusCircle, FolderTree, ChevronRight, Minus, Cpu, HelpCircle, Settings, Key, Server, PackageCheck, AlertTriangle } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData } from '@/lib/ca-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { Separator } from '@/components/ui/separator';

interface SelectableCaTreeItemProps {
  ca: CA;
  level: number;
  onSelect: (ca: CA) => void;
  isSelected?: boolean; 
  isMultiSelected?: boolean; 
  showCheckbox?: boolean; 
  onMultiSelectToggle?: (ca: CA, isSelected: boolean) => void; 
}

const SelectableCaTreeItem: React.FC<SelectableCaTreeItemProps> = ({ 
  ca, 
  level, 
  onSelect, 
  isSelected, 
  isMultiSelected, 
  showCheckbox, 
  onMultiSelectToggle 
}) => {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = ca.children && ca.children.length > 0;

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showCheckbox && onMultiSelectToggle) {
        onMultiSelectToggle(ca, !isMultiSelected);
    } else {
      onSelect(ca);
    }
  };

  return (
    <li className={`py-1 ${level > 0 ? 'pl-4 border-l border-dashed border-border ml-2' : ''} relative list-none`}>
      {level > 0 && <Minus className="h-3 w-3 absolute -left-[0.4rem] top-3 text-border transform rotate-90" />}
      <div 
        className={`flex items-center space-x-2 p-1 rounded-md hover:bg-muted/50 cursor-pointer ${isSelected || isMultiSelected ? 'bg-primary/10' : ''}`}
        onClick={handleItemClick}
      >
        {showCheckbox && (
          <Input 
            type="checkbox" 
            checked={!!isMultiSelected} 
            onChange={(e) => {
              e.stopPropagation(); 
              if (onMultiSelectToggle) onMultiSelectToggle(ca, e.target.checked);
            }} 
            className="h-4 w-4 mr-2 accent-primary" 
          />
        )}
        {hasChildren && (
          <ChevronRight 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          />
        )}
        {!hasChildren && !showCheckbox && <div className="w-4"></div>}
        {!hasChildren && showCheckbox && <div className="w-0"></div>}
        
        <FolderTree className="h-4 w-4 text-primary flex-shrink-0" />
        <span className={`flex-1 text-sm ${isSelected || isMultiSelected ? 'font-semibold text-primary': ''}`}>
          {ca.name}
        </span>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1 pl-3">
          {ca.children?.map((childCa) => (
            <SelectableCaTreeItem 
              key={childCa.id} 
              ca={childCa} 
              level={level + 1} 
              onSelect={onSelect}
              isSelected={isSelected && childCa.id === ca.id} 
              isMultiSelected={!!(isMultiSelected && showCheckbox && currentMultiSelectedCAs?.some(sel => sel.id === childCa.id))}
              showCheckbox={showCheckbox}
              onMultiSelectToggle={onMultiSelectToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

let currentMultiSelectedCAs: CA[] | undefined; 

export default function CreateRegistrationAuthorityPage() {
  const router = useRouter();

  const [registrationMode, setRegistrationMode] = useState('JITP');
  const [tags, setTags] = useState('iot');
  const [protocol, setProtocol] = useState('EST');
  const [enrollmentCa, setEnrollmentCa] = useState<CA | null>(null);
  const [allowOverrideEnrollment, setAllowOverrideEnrollment] = useState(true);
  const [authMode, setAuthMode] = useState('Client Certificate');
  const [validationCAs, setValidationCAs] = useState<CA[]>([]);
  const [allowExpiredAuth, setAllowExpiredAuth] = useState(true);
  const [chainValidationLevel, setChainValidationLevel] = useState(-1);

  const [revokeOnReEnroll, setRevokeOnReEnroll] = useState(true);
  const [allowExpiredRenewal, setAllowExpiredRenewal] = useState(true);
  const [certLifespan, setCertLifespan] = useState('2y');
  const [allowedRenewalDelta, setAllowedRenewalDelta] = useState('14w2d');
  const [preventiveRenewalDelta, setPreventiveRenewalDelta] = useState('4w3d');
  const [criticalRenewalDelta, setCriticalRenewalDelta] = useState('1w');
  const [additionalValidationCAs, setAdditionalValidationCAs] = useState<CA[]>([]);

  const [enableKeyGeneration, setEnableKeyGeneration] = useState(false);

  const [includeDownstreamCA, setIncludeDownstreamCA] = useState(true);
  const [includeEnrollmentCA, setIncludeEnrollmentCA] = useState(false);
  const [managedCAs, setManagedCAs] = useState<CA[]>([]);

  const [isEnrollmentCaModalOpen, setIsEnrollmentCaModalOpen] = useState(false);
  const [isValidationCaModalOpen, setIsValidationCaModalOpen] = useState(false);
  const [isAdditionalValidationCaModalOpen, setIsAdditionalValidationCaModalOpen] = useState(false);
  const [isManagedCaModalOpen, setIsManagedCaModalOpen] = useState(false);

  const handleEnrollmentCaSelect = (ca: CA) => {
    setEnrollmentCa(ca);
    setIsEnrollmentCaModalOpen(false);
  };
  
  const toggleSelection = (ca: CA, currentSelection: CA[], setter: React.Dispatch<React.SetStateAction<CA[]>>) => {
    setter(prevSelected =>
      prevSelected.find(selected => selected.id === ca.id)
        ? prevSelected.filter(selected => selected.id !== ca.id)
        : [...prevSelected, ca]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = {
      dmsName: 'ECS DMS',
      dmsId: 'ecs-dms',
      registrationMode,
      tags,
      protocol,
      enrollmentCaId: enrollmentCa?.id,
      allowOverrideEnrollment,
      authMode,
      validationCaIds: validationCAs.map(ca => ca.id),
      allowExpiredAuth,
      chainValidationLevel,
      revokeOnReEnroll,
      allowExpiredRenewal,
      certLifespan,
      allowedRenewalDelta,
      preventiveRenewalDelta,
      criticalRenewalDelta,
      additionalValidationCaIds: additionalValidationCAs.map(ca => ca.id),
      enableKeyGeneration,
      includeDownstreamCA,
      includeEnrollmentCA,
      managedCaIds: managedCAs.map(ca => ca.id),
    };
    console.log('Creating new RA with data:', formData);
    alert(`Mock RA Creation Submitted!\nCheck console for details.`);
    router.push('/dashboard/registration-authorities'); 
  };
  
  const renderCaSelectionDialog = (
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    title: string,
    description: string,
    onSelect: (ca: CA) => void, 
    currentSingleSelectedCa?: CA | null, 
    onMultiSelectToggle?: (ca: CA, isSelected: boolean) => void, 
    _currentMultiSelectedCAs?: CA[] 
  ) => {
    currentMultiSelectedCAs = _currentMultiSelectedCAs;
    return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 my-4">
          <ul className="space-y-1 pr-2">
            {certificateAuthoritiesData.map((ca) => (
              <SelectableCaTreeItem 
                key={ca.id} 
                ca={ca} 
                level={0} 
                onSelect={onSelect} 
                isSelected={currentSingleSelectedCa?.id === ca.id}
                showCheckbox={!!onMultiSelectToggle} 
                isMultiSelected={_currentMultiSelectedCAs?.some(selCa => selCa.id === ca.id)}
                onMultiSelectToggle={onMultiSelectToggle}
              />
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )};

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to RAs
      </Button>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <PlusCircle className="mr-2 h-6 w-6 text-primary" /> Create New Registration Authority
          </CardTitle>
          <CardDescription>
            Configure all settings for the new Registration Authority below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                <Settings className="mr-2 h-5 w-5 text-muted-foreground"/>Device Manufacturing Definition
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor="dmsName">DMS Name</Label>
                  <Input id="dmsName" value="ECS DMS" readOnly className="mt-1 bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="dmsId">DMS ID</Label>
                  <Input id="dmsId" value="ecs-dms" readOnly className="mt-1 bg-muted/50" />
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                <Cpu className="mr-2 h-5 w-5 text-muted-foreground" /> Enrollment Device Registration
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor="registrationMode">Registration Mode</Label>
                  <Select value={registrationMode} onValueChange={setRegistrationMode}>
                    <SelectTrigger id="registrationMode" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JITP">JITP (Just-In-Time Provisioning)</SelectItem>
                      <SelectItem value="Pre registration">Pre-registration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., iot, sensor, production" className="mt-1" />
                </div>
              </div>
            </section>

            <Separator className="my-6" />
            
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                <Key className="mr-2 h-5 w-5 text-muted-foreground"/>Enrollment Settings
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select value={protocol} onValueChange={setProtocol}>
                    <SelectTrigger id="protocol" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="CMP">CMP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="enrollmentCa">Enrollment CA</Label>
                  <Button type="button" variant="outline" onClick={() => setIsEnrollmentCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1">
                    {enrollmentCa ? enrollmentCa.name : "Select Enrollment CA..."}
                  </Button>
                  {enrollmentCa && (
                    <div className="mt-2">
                      <CaVisualizerCard ca={enrollmentCa} className="shadow-none border-border" />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="allowOverrideEnrollment" checked={allowOverrideEnrollment} onCheckedChange={setAllowOverrideEnrollment} />
                  <Label htmlFor="allowOverrideEnrollment">Allow Override Enrollment</Label>
                </div>
                <div>
                  <Label htmlFor="authMode">Authentication Mode</Label>
                  <Select value={authMode} onValueChange={setAuthMode}>
                    <SelectTrigger id="authMode" className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Client Certificate">Client Certificate</SelectItem>
                      <SelectItem value="External Webhook">External Webhook</SelectItem>
                      <SelectItem value="No Auth">No Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="validationCAs">Validation CAs</Label>
                  <Button type="button" variant="outline" onClick={() => setIsValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1">
                    {validationCAs.length > 0 ? `Selected ${validationCAs.length} CA(s) - Click to modify` : "Select Validation CAs..."}
                  </Button>
                  {validationCAs.length > 0 && 
                    <div className="mt-2 space-y-2">
                      {validationCAs.map(ca => (
                        <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border" />
                      ))}
                    </div>
                  }
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="allowExpiredAuth" checked={allowExpiredAuth} onCheckedChange={setAllowExpiredAuth} />
                  <Label htmlFor="allowExpiredAuth">Allow Authenticating Expired Certificates</Label>
                </div>
                <div>
                  <Label htmlFor="chainValidationLevel" className="flex items-center">
                    Chain Validation Level
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="ml-1 h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent><p>-1 equals full chain validation.</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input id="chainValidationLevel" type="number" value={chainValidationLevel} onChange={(e) => setChainValidationLevel(parseInt(e.target.value))} className="mt-1" />
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                <PackageCheck className="mr-2 h-5 w-5 text-muted-foreground"/>Re-Enrollment Settings
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Switch id="revokeOnReEnroll" checked={revokeOnReEnroll} onCheckedChange={setRevokeOnReEnroll} />
                  <Label htmlFor="revokeOnReEnroll">Revoke On Re-Enroll</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="allowExpiredRenewal" checked={allowExpiredRenewal} onCheckedChange={setAllowExpiredRenewal} />
                  <Label htmlFor="allowExpiredRenewal">Allow Expired Renewal</Label>
                </div>
                <div>
                  <Label htmlFor="certLifespan">Certificate Lifespan (e.g., 2y, 6m, 90d)</Label>
                  <Input id="certLifespan" value={certLifespan} onChange={(e) => setCertLifespan(e.target.value)} placeholder="e.g., 2y" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="allowedRenewalDelta">Allowed Renewal Delta (e.g., 14w2d)</Label>
                  <Input id="allowedRenewalDelta" value={allowedRenewalDelta} onChange={(e) => setAllowedRenewalDelta(e.target.value)} placeholder="e.g., 14w2d" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="preventiveRenewalDelta">Preventive Renewal Delta (e.g., 4w3d)</Label>
                  <Input id="preventiveRenewalDelta" value={preventiveRenewalDelta} onChange={(e) => setPreventiveRenewalDelta(e.target.value)} placeholder="e.g., 4w3d" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="criticalRenewalDelta">Critical Renewal Delta (e.g., 1w)</Label>
                  <Input id="criticalRenewalDelta" value={criticalRenewalDelta} onChange={(e) => setCriticalRenewalDelta(e.target.value)} placeholder="e.g., 1w" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="additionalValidationCAs">Additional Validation CAs (for re-enrollment)</Label>
                  <Button type="button" variant="outline" onClick={() => setIsAdditionalValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1">
                    {additionalValidationCAs.length > 0 ? `Selected ${additionalValidationCAs.length} CA(s) - Click to modify` : "Select Additional Validation CAs..."}
                  </Button>
                  {additionalValidationCAs.length > 0 && 
                    <div className="mt-2 space-y-2">
                      {additionalValidationCAs.map(ca => (
                        <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border" />
                      ))}
                    </div>
                  }
                </div>
              </div>
            </section>

            <Separator className="my-6" />

            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                 <Server className="mr-2 h-5 w-5 text-muted-foreground"/>Server Key Generation Settings
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <p className="text-sm text-muted-foreground">Devices will be able to enroll using EST-defined ServerKeyGen endpoints if enabled.</p>
                <div className="flex items-center space-x-2">
                  <Switch id="enableKeyGeneration" checked={enableKeyGeneration} onCheckedChange={setEnableKeyGeneration} />
                  <Label htmlFor="enableKeyGeneration">Enable Server-Side Key Generation</Label>
                </div>
              </div>
            </section>

            <Separator className="my-6" />
            
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center">
                 <AlertTriangle className="mr-2 h-5 w-5 text-muted-foreground"/>CA Distribution
              </h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Switch id="includeDownstreamCA" checked={includeDownstreamCA} onCheckedChange={setIncludeDownstreamCA} />
                  <Label htmlFor="includeDownstreamCA">Include 'Downstream' CA used by Lamassu</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="includeEnrollmentCA" checked={includeEnrollmentCA} onCheckedChange={setIncludeEnrollmentCA} />
                  <Label htmlFor="includeEnrollmentCA">Include Enrollment CA</Label>
                </div>
                <div>
                  <Label htmlFor="managedCAs">Managed CAs (for CA certs endpoint)</Label>
                  <Button type="button" variant="outline" onClick={() => setIsManagedCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1">
                    {managedCAs.length > 0 ? `Selected ${managedCAs.length} CA(s) - Click to modify` : "Select Managed CAs..."}
                  </Button>
                  {managedCAs.length > 0 && 
                    <div className="mt-2 space-y-2">
                      {managedCAs.map(ca => (
                        <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border" />
                      ))}
                    </div>
                  }
                </div>
              </div>
            </section>

            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create RA
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {renderCaSelectionDialog(
        isEnrollmentCaModalOpen,
        setIsEnrollmentCaModalOpen,
        "Select Enrollment CA",
        "Choose the CA that will issue certificates for this RA.",
        handleEnrollmentCaSelect,
        enrollmentCa
      )}

      {renderCaSelectionDialog(
        isValidationCaModalOpen,
        setIsValidationCaModalOpen,
        "Select Validation CAs",
        "Choose CAs to validate client certificates during enrollment.",
        () => {}, 
        null,
        (ca, isSelected) => toggleSelection(ca, validationCAs, setValidationCAs),
        validationCAs
      )}

      {renderCaSelectionDialog(
        isAdditionalValidationCaModalOpen,
        setIsAdditionalValidationCaModalOpen,
        "Select Additional Validation CAs",
        "Choose CAs for validating certificates during re-enrollment.",
        () => {}, 
        null,
        (ca, isSelected) => toggleSelection(ca, additionalValidationCAs, setAdditionalValidationCAs),
        additionalValidationCAs
      )}

       {renderCaSelectionDialog(
        isManagedCaModalOpen,
        setIsManagedCaModalOpen,
        "Select Managed CAs",
        "Choose CAs to be distributed via the CA certs endpoint.",
         () => {},
         null,
        (ca, isSelected) => toggleSelection(ca, managedCAs, setManagedCAs),
        managedCAs
      )}
    </div>
  );
}
