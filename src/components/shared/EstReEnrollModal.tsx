
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Info, RefreshCw as RefreshCwIcon, Search, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription as AlertDescUI, AlertTitle } from '../ui/alert';
import { CodeBlock } from './CodeBlock';
import { EST_API_BASE_URL } from '@/lib/api-domains';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KEY_TYPE_OPTIONS, RSA_KEY_SIZE_OPTIONS, ECDSA_CURVE_OPTIONS } from '@/lib/key-spec-constants';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { ApiDevice, fetchDevices } from '@/lib/devices-api';
import { DeviceIcon, StatusBadge } from '@/app/devices/page';


// RA type definition
interface ApiRaItem {
  id: string;
  name: string;
}

interface EstReEnrollModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ra: ApiRaItem | null;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Search Device", "Configure Key", "Commands"];
  return (
    <div className="flex items-center space-x-2 sm:space-x-4 mb-6 sm:mb-8">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex flex-col items-center space-y-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold transition-colors text-xs sm:text-sm",
                isCompleted ? "bg-primary text-primary-foreground" :
                isActive ? "bg-primary/20 border-2 border-primary text-primary" :
                "bg-muted border-2 border-border text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
              </div>
              <p className={cn(
                "text-xs font-medium text-center",
                isActive || isCompleted ? "text-primary" : "text-muted-foreground"
              )}>{label}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 transition-colors mt-[-1rem]",
                isCompleted ? "bg-primary" : "bg-border"
              )}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


export const EstReEnrollModal: React.FC<EstReEnrollModalProps> = ({ isOpen, onOpenChange, ra }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [step, setStep] = useState(1);
    
    // Step 1: Search state
    const [deviceId, setDeviceId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [foundDevice, setFoundDevice] = useState<ApiDevice | null>(null);

    // Step 2: Keygen state
    const [keygenType, setKeygenType] = useState('RSA');
    const [keygenSpec, setKeygenSpec] = useState('2048');

    // Step 3: Command state
    const [validateServerCert, setValidateServerCert] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setDeviceId('');
            setKeygenType('RSA');
            setKeygenSpec('2048');
            setValidateServerCert(false);
            setFoundDevice(null);
            setIsSearching(false);
            setSearchError(null);
        }
    }, [isOpen]);
    
    const handleKeygenTypeChange = (type: string) => {
        setKeygenType(type);
        setKeygenSpec(type === 'RSA' ? '2048' : 'P-256');
    };

    const currentKeySpecOptions = keygenType === 'RSA' ? RSA_KEY_SIZE_OPTIONS : ECDSA_CURVE_OPTIONS;

    const handleSearch = async () => {
        if (!deviceId.trim() || !ra?.id || !user?.access_token) {
            setSearchError("Please enter a Device ID.");
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        setFoundDevice(null);
        try {
            const params = new URLSearchParams();
            params.append('page_size', '1');
            params.append('filter', `id[equal]${deviceId.trim()}`);
            params.append('filter', `dms_owner[equal]${ra.id}`); // Important: scope to the RA

            const result = await fetchDevices(user.access_token, params);
            if (result.list && result.list.length > 0) {
                setFoundDevice(result.list[0]);
                setStep(2); // Move to next step on success
            } else {
                setSearchError(`No device found with ID "${deviceId.trim()}" for this RA.`);
            }
        } catch (e: any) {
            setSearchError(e.message || "An error occurred during search.");
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleNext = () => {
        if (step === 2) {
            setStep(3);
        }
    };
    
    const handleBack = () => {
        if (step === 3) setStep(2);
        if (step === 2) {
            setStep(1);
            setFoundDevice(null);
            setSearchError(null);
        }
    };

    const finalDeviceId = foundDevice?.id || 'device-id';

    const keygenCommandPart = keygenType === 'RSA' 
        ? `-newkey rsa:${keygenSpec}` 
        : `-newkey ec -pkeyopt ec_paramgen_curve:${keygenSpec}`;
    
    const opensslCombinedCommand = `echo "Generating new key and CSR for re-enrollment..."\nopenssl req -new ${keygenCommandPart} -nodes -keyout ${finalDeviceId}.new.key -out ${finalDeviceId}.new.csr -subj "/CN=${finalDeviceId}"\ncat ${finalDeviceId}.new.csr | sed '/-----BEGIN CERTIFICATE REQUEST-----/d'  | sed '/-----END CERTIFICATE REQUEST-----/d'> ${finalDeviceId}.new.stripped.csr`;

    const serverCertCommand = `echo "Fetching server root CA for validation..."\nLAMASSU_SERVER=lab.lamassu.io\nopenssl s_client -showcerts -servername $LAMASSU_SERVER -connect $LAMASSU_SERVER:443 2>/dev/null </dev/null | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > root-ca.pem`;
    
    const curlValidationFlag = validateServerCert ? '--cacert root-ca.pem' : '-k';
    const finalReEnrollCommand = [
      `echo "Performing re-enrollment..."\ncurl -v --cert ${finalDeviceId}.existing.crt --key ${finalDeviceId}.existing.key ${curlValidationFlag} -H "Content-Type: application/pkcs10" --data-binary @${finalDeviceId}.new.stripped.csr -o ${finalDeviceId}.new.p7 "${EST_API_BASE_URL}/${ra?.id}/simplereenroll"`,
      `echo "Extracting new certificate..."\nopenssl base64 -d -in ${finalDeviceId}.new.p7 | openssl pkcs7 -inform DER -outform PEM -print_certs -out ${finalDeviceId}.new.crt`,
      `echo "Verifying new certificate..."\nopenssl x509 -text -noout -in ${finalDeviceId}.new.crt`
    ].join('\n\n');

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><RefreshCwIcon className="mr-2 h-6 w-6 text-primary"/>EST Re-Enroll</DialogTitle>
                    <DialogDescription>
                        Generate re-enrollment commands for RA: {ra?.name} ({ra?.id})
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Stepper currentStep={step}/>
                    
                    {step === 1 && (
                        <div className="space-y-4">
                            <Label htmlFor="deviceId-search">Device ID</Label>
                            <div className="flex items-center gap-2">
                                <Input id="deviceId-search" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Enter Device ID to search..."/>
                                <Button onClick={handleSearch} disabled={isSearching || !deviceId.trim()}>
                                    {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                    Search
                                </Button>
                            </div>
                            {searchError && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTriangle className="h-4 w-4"/>
                                    <AlertTitle>Search Failed</AlertTitle>
                                    <AlertDescUI>{searchError}</AlertDescUI>
                                </Alert>
                            )}
                        </div>
                    )}

                    {step === 2 && foundDevice && (
                         <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4"/>
                                <AlertTitle>Device Found</AlertTitle>
                                <AlertDescUI>
                                    <div className="flex items-center gap-4 mt-2 p-2 border rounded-md bg-background">
                                        <DeviceIcon type={foundDevice.icon} iconColor={foundDevice.icon_color.split('-')[0]} bgColor={foundDevice.icon_color.split('-')[1]} />
                                        <div className="flex-grow">
                                            <p className="font-semibold">{foundDevice.id}</p>
                                            <p className="text-xs text-muted-foreground">Status: <StatusBadge status={foundDevice.status as any} /></p>
                                        </div>
                                    </div>
                                </AlertDescUI>
                            </Alert>
                            <div>
                                <Label>New Key Parameters</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Define the new key and CSR that will be generated on the device.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="keygen-type">Key Type</Label>
                                        <Select value={keygenType} onValueChange={handleKeygenTypeChange}>
                                            <SelectTrigger id="keygen-type"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {KEY_TYPE_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="keygen-spec">{keygenType === 'RSA' ? 'Key Size' : 'Curve'}</Label>
                                         <Select value={keygenSpec} onValueChange={setKeygenSpec}>
                                            <SelectTrigger id="keygen-spec"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {currentKeySpecOptions.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {step === 3 && foundDevice && (
                        <div className="space-y-4">
                             <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Prerequisites</AlertTitle>
                                <AlertDescUI>
                                    This process assumes you have the device's current, valid certificate and private key (e.g., `{finalDeviceId}.existing.crt` and `{finalDeviceId}.existing.key`).
                                </AlertDescUI>
                            </Alert>
                            <div>
                                <Label>1. Generate New Key &amp; CSR</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Run this on your device to generate a new private key (`{finalDeviceId}.new.key`) and CSR (`{finalDeviceId}.new.csr`).
                                </p>
                                <CodeBlock content={opensslCombinedCommand} textareaClassName="h-28" />
                            </div>
                            
                            <div>
                                <Label>2. Run Re-enrollment Command</Label>
                                <div className="flex items-center space-x-2 my-2">
                                    <Switch
                                        id="validate-server-cert-reenroll"
                                        checked={validateServerCert}
                                        onCheckedChange={setValidateServerCert}
                                    />
                                    <Label htmlFor="validate-server-cert-reenroll">Validate Server Certificate (Recommended)</Label>
                                </div>
                                {validateServerCert && (
                                    <div className="mb-2">
                                        <p className="text-xs text-muted-foreground mb-1">
                                            First, obtain the server's root CA certificate.
                                        </p>
                                        <CodeBlock content={serverCertCommand} textareaClassName="h-28" />
                                    </div>
                                )}
                                <CodeBlock content={finalReEnrollCommand} textareaClassName="h-40" />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <div className="w-full flex justify-between">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <div className="flex space-x-2">
                            {step > 1 && (
                                <Button variant="outline" onClick={handleBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4"/>Back
                                </Button>
                            )}
                            {step === 2 && (
                                <Button onClick={handleNext}>
                                    Generate Commands
                                </Button>
                            )}
                             {step === 3 && (
                                <Button onClick={() => onOpenChange(false)}>Finish</Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
