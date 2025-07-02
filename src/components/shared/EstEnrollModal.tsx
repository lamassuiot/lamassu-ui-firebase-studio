
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CA } from '@/lib/ca-data';
import { findCaById } from '@/lib/ca-data';
import { useToast } from '@/hooks/use-toast';
import { CaVisualizerCard } from '../CaVisualizerCard';
import { DurationInput } from './DurationInput';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { Alert } from '../ui/alert';
import { CodeBlock } from './CodeBlock';
import { EST_API_BASE_URL } from '@/lib/api-domains';

// Re-defining RA type here to avoid complex imports, but ideally this would be shared
interface ApiRaItem {
  id: string;
  name: string;
  settings: {
    enrollment_settings: {
      enrollment_ca: string;
    }
  }
}

interface EstEnrollModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  ra: ApiRaItem | null;
  availableCAs: CA[];
  allCryptoEngines: ApiCryptoEngine[];
  isLoadingCAs: boolean;
  errorCAs: string | null;
  loadCAsAction: () => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Configure CSR", "Issue Bootstrap", "Enroll Device"];
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


export const EstEnrollModal: React.FC<EstEnrollModalProps> = ({ isOpen, onOpenChange, ra, availableCAs, allCryptoEngines }) => {
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [deviceId, setDeviceId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [bootstrapSigner, setBootstrapSigner] = useState<CA | null>(null);
    const [bootstrapValidity, setBootstrapValidity] = useState('1h');
    const [bootstrapCertificate, setBootstrapCertificate] = useState('');
    const [enrollCommand, setEnrollCommand] = useState('');


    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setDeviceId('');
            setBootstrapValidity('1h');
            setBootstrapCertificate('');
            setEnrollCommand('');
            
            if (ra && availableCAs.length > 0) {
                const enrollmentCaId = ra.settings.enrollment_settings.enrollment_ca;
                const signerCa = findCaById(enrollmentCaId, availableCAs);

                if (signerCa) {
                    setBootstrapSigner(signerCa);
                    if (signerCa.defaultIssuanceLifetime && !signerCa.defaultIssuanceLifetime.includes('T') && signerCa.defaultIssuanceLifetime !== 'Indefinite' && signerCa.defaultIssuanceLifetime !== 'Not Specified') {
                        setBootstrapValidity(signerCa.defaultIssuanceLifetime);
                    } else {
                        setBootstrapValidity('1h');
                    }
                } else {
                    setBootstrapSigner(null);
                }
            } else {
                setBootstrapSigner(null);
            }
        }
    }, [isOpen, ra, availableCAs]);
    
    const handleIssueBootstrap = async () => {
        if (!bootstrapSigner) {
            toast({ title: "Bootstrap Signer Required", description: "The RA policy does not specify a valid enrollment CA for bootstrapping.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        setBootstrapCertificate('');
        await new Promise(res => setTimeout(res, 800));
        const mockCert = `-----BEGIN CERTIFICATE-----\n` +
            `MOCK_BOOTSTRAP_CERT_FOR_${deviceId}_ISSUED_BY_${bootstrapSigner.name}\n` +
            `${btoa(Date.now().toString())}\n` +
            `-----END CERTIFICATE-----`;
        setBootstrapCertificate(mockCert);
        setIsGenerating(false);
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!deviceId.trim()) {
                toast({ title: "Device ID required", variant: "destructive" });
                return;
            }
            setStep(2);
        } else if (step === 2) {
             if (!bootstrapCertificate) {
                toast({ title: "Bootstrap certificate not issued", description: "Please issue the bootstrap certificate before proceeding.", variant: "destructive" });
                return;
            }
            const command = `curl -v --cert-type PEM --cert bootstrap.cert \\ \n`+
                            `  --key-type PEM --key device.key \\ \n`+
                            `  -H "Content-Type: application/pkcs10" \\ \n`+
                            `  --data-binary @device.csr \\ \n`+
                            `  "${EST_API_BASE_URL}/${ra?.id}/simpleenroll"`;
            setEnrollCommand(command);
            setStep(3);
        }
    };
    
    const handleBack = () => {
        setStep(prev => prev > 1 ? prev - 1 : 1);
    };

    const opensslCombinedCommand = `openssl req -new -newkey rsa:2048 -nodes -keyout device.key -out device.csr -subj "/CN=${deviceId}"`;

    const renderStepContent = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="deviceId">Device ID</Label>
                            <Input id="deviceId" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="e.g., test-1, sensor-12345" />
                        </div>
                        <div className="space-y-2">
                            <Label>Generate Key & CSR</Label>
                            <p className="text-xs text-muted-foreground mb-1">
                                Run the following command on your device to generate a private key (`device.key`) and a CSR (`device.csr`).
                            </p>
                            <CodeBlock content={opensslCombinedCommand}/>
                        </div>
                    </div>
                );
            case 2:
                 return (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="bootstrapSigner">Bootstrap signer</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                The RA policy dictates that the bootstrap certificate must be signed by the following CA.
                            </p>
                            {bootstrapSigner ? (
                                <div className="mt-2"><CaVisualizerCard ca={bootstrapSigner} className="shadow-none border-border" allCryptoEngines={allCryptoEngines}/></div>
                            ) : (
                                <div className="mt-2 p-4 text-center border rounded-md bg-muted/30 text-muted-foreground">
                                    <p>No authorized enrollment CA found for this RA.</p>
                                </div>
                            )}
                        </div>
                        <DurationInput id="bootstrapValidity" label="Bootstrap Certificate Validity" value={bootstrapValidity} onChange={setBootstrapValidity} />
                        
                        <Button onClick={handleIssueBootstrap} disabled={isGenerating || !bootstrapSigner} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {isGenerating ? 'Issuing...' : 'Issue Bootstrap Certificate'}
                        </Button>
                        
                        {bootstrapCertificate && (
                            <div className="pt-4 border-t">
                                <Label>Generated Bootstrap Certificate</Label>
                                <Textarea value={bootstrapCertificate} readOnly rows={8} className="font-mono bg-muted/50 mt-1"/>
                                <p className="text-xs text-muted-foreground mt-1">Save this content as `bootstrap.cert` on your device.</p>
                            </div>
                        )}
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                         <Alert>
                            <Info className="h-4 w-4" />
                            <Alert.Description>
                               Your private key (`device.key`) was generated locally on your machine and is not shown here. Keep it safe.
                            </Alert.Description>
                        </Alert>
                        <div>
                            <Label>Enrollment Command</Label>
                            <CodeBlock content={enrollCommand} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                           Note: This command assumes you have saved the bootstrap certificate as `bootstrap.cert` and the key and CSR files (`device.key`, `device.csr`) are in the same directory.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>EST Enroll</DialogTitle>
                    <DialogDescription>
                        Generate enrollment commands for RA: {ra?.name} ({ra?.id})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Stepper currentStep={step}/>
                    <div className="min-h-[200px]">
                        {renderStepContent()}
                    </div>
                </div>

                <DialogFooter>
                    <div className="w-full flex justify-between">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <div className="flex space-x-2">
                            {step > 1 && (
                                <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
                                    <ArrowLeft className="mr-2 h-4 w-4"/>Back
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button onClick={handleNext} disabled={isGenerating || (step === 2 && !bootstrapCertificate)}>
                                    Next
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
