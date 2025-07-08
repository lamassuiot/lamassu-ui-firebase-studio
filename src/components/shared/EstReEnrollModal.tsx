
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Info, RefreshCw as RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription as AlertDescUI, AlertTitle } from '../ui/alert';
import { CodeBlock } from './CodeBlock';
import { EST_API_BASE_URL } from '@/lib/api-domains';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KEY_TYPE_OPTIONS, RSA_KEY_SIZE_OPTIONS, ECDSA_CURVE_OPTIONS } from '@/lib/key-spec-constants';
import { Switch } from '@/components/ui/switch';

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
  const steps = ["Configure", "Commands"];
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
    
    const [step, setStep] = useState(1);
    const [deviceId, setDeviceId] = useState('');
    
    // Keygen state
    const [keygenType, setKeygenType] = useState('RSA');
    const [keygenSpec, setKeygenSpec] = useState('2048');

    const [validateServerCert, setValidateServerCert] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setDeviceId('');
            setKeygenType('RSA');
            setKeygenSpec('2048');
            setValidateServerCert(false);
        }
    }, [isOpen]);
    
    const handleKeygenTypeChange = (type: string) => {
        setKeygenType(type);
        setKeygenSpec(type === 'RSA' ? '2048' : 'P-256');
    };

    const currentKeySpecOptions = keygenType === 'RSA' ? RSA_KEY_SIZE_OPTIONS : ECDSA_CURVE_OPTIONS;

    const handleNext = () => {
        if (step === 1) {
            if (!deviceId.trim()) {
                toast({ title: "Device ID required", variant: "destructive" });
                return;
            }
            setStep(2);
        }
    };
    
    const handleBack = () => setStep(1);

    const keygenCommandPart = keygenType === 'RSA' 
        ? `-newkey rsa:${keygenSpec}` 
        : `-newkey ec -pkeyopt ec_paramgen_curve:${keygenSpec}`;
    
    const opensslCombinedCommand = `echo "Generating new key and CSR for re-enrollment..."\nopenssl req -new ${keygenCommandPart} -nodes -keyout ${deviceId}.new.key -out ${deviceId}.new.csr -subj "/CN=${deviceId}"\ncat ${deviceId}.new.csr | sed '/-----BEGIN CERTIFICATE REQUEST-----/d'  | sed '/-----END CERTIFICATE REQUEST-----/d'> ${deviceId}.new.stripped.csr`;

    const serverCertCommand = `echo "Fetching server root CA for validation..."\nLAMASSU_SERVER=lab.lamassu.io\nopenssl s_client -showcerts -servername $LAMASSU_SERVER -connect $LAMASSU_SERVER:443 2>/dev/null </dev/null | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > root-ca.pem`;
    
    const curlValidationFlag = validateServerCert ? '--cacert root-ca.pem' : '-k';
    const finalReEnrollCommand = [
      `echo "Performing re-enrollment..."\ncurl -v --cert ${deviceId}.existing.crt --key ${deviceId}.existing.key ${curlValidationFlag} -H "Content-Type: application/pkcs10" --data-binary @${deviceId}.new.stripped.csr -o ${deviceId}.new.p7 "${EST_API_BASE_URL}/${ra?.id}/simplereenroll"`,
      `echo "Extracting new certificate..."\nopenssl base64 -d -in ${deviceId}.new.p7 | openssl pkcs7 -inform DER -outform PEM -print_certs -out ${deviceId}.new.crt`,
      `echo "Verifying new certificate..."\nopenssl x509 -text -noout -in ${deviceId}.new.crt`
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
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Prerequisites</AlertTitle>
                                <AlertDescUI>
                                    This process assumes you have the device's current, valid certificate and private key (e.g., `{deviceId || 'device-id'}.existing.crt` and `{deviceId || 'device-id'}.existing.key`).
                                </AlertDescUI>
                            </Alert>
                            <div>
                                <Label htmlFor="deviceId">Device ID (Common Name)</Label>
                                <Input id="deviceId" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Enter the device's CN" />
                            </div>
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
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <Label>1. Generate New Key &amp; CSR</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Run this on your device to generate a new private key (`{deviceId}.new.key`) and CSR (`{deviceId}.new.csr`).
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
                            {step < 2 ? (
                                <Button onClick={handleNext}>
                                    Generate Commands
                                </Button>
                            ) : (
                                <Button onClick={() => onOpenChange(false)}>Finish</Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
