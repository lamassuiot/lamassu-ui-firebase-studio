
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Check, Copy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CA } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CaSelectorModal } from './CaSelectorModal';
import { CaVisualizerCard } from '../CaVisualizerCard';
import { DurationInput } from './DurationInput';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { Alert } from '../ui/alert';


interface EstEnrollModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  raId: string;
  raName: string;
  availableCAs: CA[];
  allCryptoEngines: ApiCryptoEngine[];
  isLoadingCAs: boolean;
  errorCAs: string | null;
  loadCAsAction: () => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Device", "CSR", "Props", "Bootstrap", "Commands"];
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


export const EstEnrollModal: React.FC<EstEnrollModalProps> = ({ isOpen, onOpenChange, raId, raName, availableCAs, allCryptoEngines, isLoadingCAs, errorCAs, loadCAsAction }) => {
    const { toast } = useToast();
    const { user, isLoading: authLoading } = useAuth();

    const [step, setStep] = useState(1);
    const [deviceId, setDeviceId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Step 3 state
    const [bootstrapSigner, setBootstrapSigner] = useState<CA | null>(null);
    const [isCaSelectorOpen, setIsCaSelectorOpen] = useState(false);
    const [bootstrapValidity, setBootstrapValidity] = useState('1h');
    
    // Step 4 state
    const [bootstrapCertificate, setBootstrapCertificate] = useState('');

    // Step 5 state
    const [enrollCommand, setEnrollCommand] = useState('');


    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setDeviceId('');
            setBootstrapSigner(null);
            setBootstrapValidity('1h');
            setBootstrapCertificate('');
            setEnrollCommand('');
        }
    }, [isOpen]);

    const handleNext = async () => {
        if (step === 1) { // --> Show CSR commands
            if (!deviceId.trim()) {
                toast({ title: "Device ID required", variant: "destructive" });
                return;
            }
            setStep(2);
        } else if (step === 2) { // --> Define Props
            setStep(3);
        } else if (step === 3) { // --> Issue Bootstrap Cert
             if (!bootstrapSigner) {
                toast({ title: "Bootstrap Signer required", description: "Please select a CA to sign the bootstrap certificate.", variant: "destructive" });
                return;
            }
            setIsGenerating(true);
            // MOCK API call to issue bootstrap certificate (no CSR needed for this mock)
            await new Promise(res => setTimeout(res, 800));
            const mockCert = `-----BEGIN CERTIFICATE-----\n` +
                `MOCK_BOOTSTRAP_CERT_FOR_${deviceId}_ISSUED_BY_${bootstrapSigner.name}\n` +
                `${btoa(Date.now().toString())}\n` +
                `-----END CERTIFICATE-----`;
            setBootstrapCertificate(mockCert);
            setIsGenerating(false);
            setStep(4);
        } else if (step === 4) { // --> Generate Commands
            const command = `curl -v --cert-type PEM --cert bootstrap.cert \\ \n`+
                            `  --key-type PEM --key device.key \\ \n`+
                            `  -H "Content-Type: application/pkcs10" \\ \n`+
                            `  --data-binary @device.csr \\ \n`+
                            `  "https://lab.lamassu.io/api/dmsmanager/.well-known/est/${raId}/simpleenroll"`;
            setEnrollCommand(command);
            setStep(5);
        }
    };
    
    const handleBack = () => {
        setStep(prev => prev > 1 ? prev - 1 : 1);
    };

    const handleCopy = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({ title: "Copied!", description: `${fieldName} copied to clipboard.` });
        } catch (err) {
            toast({ title: "Copy Failed", variant: "destructive" });
        }
    }
    
    const handleCaSelectedForBootstrap = (ca: CA) => {
        setBootstrapSigner(ca);
        setIsCaSelectorOpen(false);
    }

    const CodeBlock = ({ content }: { content: string }) => (
      <div className="relative">
        <pre className="text-xs bg-muted p-3 rounded-md font-mono overflow-x-auto">
          <code>{content}</code>
        </pre>
        <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 h-7 w-7" onClick={() => handleCopy(content, "Command")}>
            <Copy className="h-4 w-4"/>
        </Button>
      </div>
    );
    
    const opensslCombinedCommand = `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out device.key && openssl req -new -key device.key -out device.csr -subj "/CN=${deviceId || 'your_device_id'}"`;
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>EST Enroll</DialogTitle>
                    <DialogDescription>
                        Generate enrollment commands for RA: {raName} ({raId})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Stepper currentStep={step}/>
                    
                    {step === 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="deviceId">Device ID</Label>
                            <Input id="deviceId" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="e.g., test-1, sensor-12345" />
                        </div>
                    )}
                    {step === 2 && (
                         <div className="space-y-4">
                            <div>
                                <Label>Generate Key & CSR</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Run the following command on your device to generate a private key (`device.key`) and a CSR (`device.csr`).
                                </p>
                                <CodeBlock content={opensslCombinedCommand}/>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="bootstrapSigner">Bootstrap signer</Label>
                                <Button id="bootstrapSigner" type="button" variant="outline" onClick={() => setIsCaSelectorOpen(true)} className="w-full justify-start text-left font-normal mt-1">
                                    {bootstrapSigner ? bootstrapSigner.name : "Select CA..."}
                                </Button>
                                {bootstrapSigner && <div className="mt-2"><CaVisualizerCard ca={bootstrapSigner} className="shadow-none border-border" allCryptoEngines={allCryptoEngines}/></div>}
                            </div>
                            <DurationInput id="bootstrapValidity" label="Bootstrap Certificate Validity" value={bootstrapValidity} onChange={setBootstrapValidity} />
                        </div>
                    )}
                    {step === 4 && (
                        <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <Alert.Description>
                                    Your private key (device.key) was generated locally on your machine and is not shown here. Keep it safe.
                                </Alert.Description>
                            </Alert>
                             <div>
                                <Label>Bootstrap Certificate</Label>
                                <Textarea value={bootstrapCertificate} readOnly rows={8} className="font-mono bg-muted/50 mt-1"/>
                            </div>
                        </div>
                    )}
                     {step === 5 && (
                        <div className="space-y-4">
                            <div>
                                <Label>Enrollment Command</Label>
                                <div className="relative">
                                    <Textarea value={enrollCommand} readOnly rows={5} className="font-mono bg-muted/50 mt-1 pr-12"/>
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => handleCopy(enrollCommand, "Command")}>
                                        <Copy className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                               Note: This command assumes you have saved the bootstrap certificate as `bootstrap.cert` and the key and CSR files (`device.key`, `device.csr`) are in the same directory.
                            </p>
                        </div>
                    )}
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
                            {step < 5 ? (
                                <Button onClick={handleNext} disabled={isGenerating}>
                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Next
                                </Button>
                            ) : (
                                <Button onClick={() => onOpenChange(false)}>Finish</Button>
                            )}
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
            <CaSelectorModal
                isOpen={isCaSelectorOpen}
                onOpenChange={setIsCaSelectorOpen}
                title="Select Bootstrap Signer"
                description="Choose a CA to issue the short-lived bootstrap certificate."
                availableCAs={availableCAs}
                isLoadingCAs={isLoadingCAs}
                errorCAs={errorCAs}
                loadCAsAction={loadCAsAction}
                onCaSelected={handleCaSelectedForBootstrap}
                currentSelectedCaId={bootstrapSigner?.id}
                isAuthLoading={authLoading}
                allCryptoEngines={allCryptoEngines}
            />
        </Dialog>
    );
};
