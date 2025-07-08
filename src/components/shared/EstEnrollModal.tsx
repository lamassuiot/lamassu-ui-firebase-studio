
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Check, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CA } from '@/lib/ca-data';
import { findCaById } from '@/lib/ca-data';
import { useToast } from '@/hooks/use-toast';
import { CaVisualizerCard } from '../CaVisualizerCard';
import { DurationInput } from './DurationInput';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { Alert, AlertDescription as AlertDescUI } from '../ui/alert';
import { CodeBlock } from './CodeBlock';
import { EST_API_BASE_URL } from '@/lib/api-domains';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KEY_TYPE_OPTIONS, RSA_KEY_SIZE_OPTIONS, ECDSA_CURVE_OPTIONS } from '@/lib/key-spec-constants';

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


export const EstEnrollModal: React.FC<EstEnrollModalProps> = ({ isOpen, onOpenChange, ra, availableCAs, allCryptoEngines }) => {
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [deviceId, setDeviceId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Step 2 state
    const [keygenType, setKeygenType] = useState('RSA');
    const [keygenSpec, setKeygenSpec] = useState('2048');

    // Step 3 state
    const [bootstrapSigner, setBootstrapSigner] = useState<CA | null>(null);
    const [bootstrapValidity, setBootstrapValidity] = useState('1h');
    
    // Step 4 state
    const [bootstrapCertificate, setBootstrapCertificate] = useState('');

    // Step 5 state
    const [enrollCommand, setEnrollCommand] = useState('');


    useEffect(() => {
        if(isOpen) {
            setStep(1);
            setDeviceId(crypto.randomUUID());
            setBootstrapValidity('1h');
            setBootstrapCertificate('');
            setEnrollCommand('');
            setKeygenType('RSA');
            setKeygenSpec('2048');
            
            // Auto-select CA based on RA config
            if (ra && availableCAs.length > 0) {
                const enrollmentCaId = ra.settings.enrollment_settings.enrollment_ca;
                const signerCa = findCaById(enrollmentCaId, availableCAs);

                if (signerCa) {
                    setBootstrapSigner(signerCa);
                    // Pre-populate validity if it's a duration string
                    if (signerCa.defaultIssuanceLifetime && !signerCa.defaultIssuanceLifetime.includes('T') && signerCa.defaultIssuanceLifetime !== 'Indefinite' && signerCa.defaultIssuanceLifetime !== 'Not Specified') {
                        setBootstrapValidity(signerCa.defaultIssuanceLifetime);
                    } else {
                        setBootstrapValidity('1h'); // Fallback for ISO dates, Indefinite, or unspecified
                    }
                } else {
                    setBootstrapSigner(null);
                }
            } else {
                setBootstrapSigner(null);
            }
        }
    }, [isOpen, ra, availableCAs]);

    const handleKeygenTypeChange = (type: string) => {
        setKeygenType(type);
        if (type === 'RSA') {
            setKeygenSpec('2048');
        } else { // EC
            setKeygenSpec('P-256');
        }
    };

    const currentKeySpecOptions = keygenType === 'RSA' ? RSA_KEY_SIZE_OPTIONS : ECDSA_CURVE_OPTIONS;
    
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
                toast({ title: "Bootstrap Signer Required", description: "The RA policy does not specify a valid enrollment CA for bootstrapping.", variant: "destructive" });
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
                            `  "${EST_API_BASE_URL}/${ra?.id}/simpleenroll"`;
            setEnrollCommand(command);
            setStep(5);
        }
    };
    
    const handleBack = () => {
        setStep(prev => prev > 1 ? prev - 1 : 1);
    };

    let keygenCommandPart = '';
    if (keygenType === 'RSA') {
        keygenCommandPart = `-newkey rsa:${keygenSpec}`;
    } else { // EC
        keygenCommandPart = `-newkey ec -pkeyopt ec_paramgen_curve:${keygenSpec}`;
    }
    const opensslCombinedCommand = `openssl req -new ${keygenCommandPart} -nodes -keyout ${deviceId}.key -out ${deviceId}.csr -subj "/CN=${deviceId}"
cat ${deviceId}.csr | sed '/-----BEGIN CERTIFICATE REQUEST-----/d'  | sed '/-----END CERTIFICATE REQUEST-----/d'> ${deviceId}.stripped.csr`;

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
                    
                    {step === 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="deviceId">Device ID</Label>
                            <div className="flex items-center gap-2">
                                <Input id="deviceId" value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="e.g., test-1, sensor-12345" />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setDeviceId(crypto.randomUUID())}
                                    title="Generate random GUID"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="keygen-type">Key Type</Label>
                                    <Select value={keygenType} onValueChange={handleKeygenTypeChange}>
                                        <SelectTrigger id="keygen-type">
                                            <SelectValue />
                                        </SelectTrigger>
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
                                        <SelectTrigger id="keygen-spec">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currentKeySpecOptions.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Generate Key & CSR</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Run the following command on your device to generate a private key (`${deviceId}.key`) and a CSR (`${deviceId}.csr`).
                                </p>
                                <CodeBlock content={opensslCombinedCommand} textareaClassName="h-28" />
                            </div>
                        </div>
                    )}
                    {step === 3 && (
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
                        </div>
                    )}
                    {step === 4 && (
                        <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescUI>
                                    Your private key (${deviceId}.key) was generated locally on your machine and is not shown here. Keep it safe.
                                </AlertDescUI>
                            </Alert>
                             <div>
                                <Label>Bootstrap Certificate</Label>
                                <CodeBlock content={bootstrapCertificate}/>
                            </div>
                        </div>
                    )}
                     {step === 5 && (
                        <div className="space-y-4">
                            <div>
                                <Label>Enrollment Command</Label>
                                <CodeBlock content={enrollCommand} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                               Note: This command assumes you have saved the bootstrap certificate as `bootstrap.cert` and the key and CSR files (`${deviceId}.key`, `${deviceId}.csr`) are in the same directory.
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
        </Dialog>
    );
};
