
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, KeyRound, UploadCloud, FileText, ChevronRight, Settings, PlusCircle, FileKey, Tag } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const creationModes = [
  {
    id: 'newKeyPair',
    title: 'Create New Key Pair',
    description: 'Generate a new cryptographic key pair (public and private key) securely managed by LamassuIoT.',
    icon: <KeyRound className="h-8 w-8 text-primary" />,
  },
  {
    id: 'importKeyPair',
    title: 'Import Existing Key Pair',
    description: "Import an existing key pair (both public and private key components) from an external source.",
    icon: <UploadCloud className="h-8 w-8 text-primary" />,
  },
  {
    id: 'importPublicKey',
    title: 'Import Public Key Only',
    description: 'Import an existing public key for verification or trust purposes. The private key will not be managed.',
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
];

const keyTypes = [
  { value: 'RSA', label: 'RSA' },
  { value: 'ECDSA', label: 'ECDSA' },
  { value: 'ML-DSA', label: 'ML-DSA (Post-Quantum)' },
];

const rsaKeySizes = [
  { value: '2048', label: '2048 bit' },
  { value: '3072', label: '3072 bit' },
  { value: '4096', label: '4096 bit' },
];

const ecdsaKeyCurves = [
  { value: 'P-256', label: 'P-256 (NIST P-256, secp256r1)' },
  { value: 'P-384', label: 'P-384 (NIST P-384, secp384r1)' },
  { value: 'P-521', label: 'P-521 (NIST P-521, secp521r1)' },
];

const mlDsaSecurityLevels = [
  { value: 'ML-DSA-44', label: 'ML-DSA-44 (Security Level 1 - ~AES-128)' },
  { value: 'ML-DSA-65', label: 'ML-DSA-65 (Security Level 3 - ~AES-192)' },
  { value: 'ML-DSA-87', label: 'ML-DSA-87 (Security Level 5 - ~AES-256)' },
];

export default function CreateKmsKeyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  // Common fields
  const [keyAlias, setKeyAlias] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated

  // New Key Pair mode fields
  const [keyType, setKeyType] = useState('RSA');
  const [rsaKeySize, setRsaKeySize] = useState('2048');
  const [ecdsaCurve, setEcdsaCurve] = useState('P-256');
  const [mlDsaSecurityLevel, setMlDsaSecurityLevel] = useState('ML-DSA-65');


  // Import Key Pair mode fields
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [publicKeyPemForImport, setPublicKeyPemForImport] = useState(''); // Optional, can be derived
  const [passphrase, setPassphrase] = useState('');

  // Import Public Key mode fields
  const [publicKeyPem, setPublicKeyPem] = useState('');
  
  const [keyId, setKeyId] = useState('');
   useEffect(() => {
    setKeyId(`key-${crypto.randomUUID()}`);
  }, [selectedMode]);


  const handleKeyTypeChange = (value: string) => {
    setKeyType(value);
    if (value === 'RSA') {
      setRsaKeySize('2048');
    } else if (value === 'ECDSA') {
      setEcdsaCurve('P-256');
    } else if (value === 'ML-DSA') {
      setMlDsaSecurityLevel('ML-DSA-65');
    }
  };

  const currentKeySpecOptions = (() => {
    if (keyType === 'RSA') return rsaKeySizes;
    if (keyType === 'ECDSA') return ecdsaKeyCurves;
    if (keyType === 'ML-DSA') return mlDsaSecurityLevels;
    return [];
  })();

  const keySpecLabel = (() => {
    if (keyType === 'RSA') return 'RSA Key Size';
    if (keyType === 'ECDSA') return 'ECDSA Curve';
    if (keyType === 'ML-DSA') return 'ML-DSA Security Level';
    return 'Key Specification';
  })();

  const currentKeySpecValue = (() => {
    if (keyType === 'RSA') return rsaKeySize;
    if (keyType === 'ECDSA') return ecdsaCurve;
    if (keyType === 'ML-DSA') return mlDsaSecurityLevel;
    return '';
  })();

  const handleKeySpecChange = (value: string) => {
    if (keyType === 'RSA') setRsaKeySize(value);
    else if (keyType === 'ECDSA') setEcdsaCurve(value);
    else if (keyType === 'ML-DSA') setMlDsaSecurityLevel(value);
  };


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyAlias.trim()) {
        toast({ title: "Validation Error", description: "Key Alias cannot be empty.", variant: "destructive"});
        return;
    }

    let formData: any = {
      creationMode: selectedMode,
      keyId,
      keyAlias,
      description,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
    };

    if (selectedMode === 'newKeyPair') {
      let keySpecValue = '';
      if (keyType === 'RSA') keySpecValue = rsaKeySize;
      else if (keyType === 'ECDSA') keySpecValue = ecdsaCurve;
      else if (keyType === 'ML-DSA') keySpecValue = mlDsaSecurityLevel;
      
      formData = {
        ...formData,
        keyType,
        keySpec: keySpecValue,
      };
    } else if (selectedMode === 'importKeyPair') {
      if (!privateKeyPem.trim()) {
        toast({ title: "Validation Error", description: "Private Key (PEM) is required for import.", variant: "destructive"});
        return;
      }
      formData = {
        ...formData,
        privateKeyPem,
        publicKeyPemForImport: publicKeyPemForImport.trim() || undefined,
        passphrase: passphrase || undefined,
      };
    } else if (selectedMode === 'importPublicKey') {
      if (!publicKeyPem.trim()) {
        toast({ title: "Validation Error", description: "Public Key (PEM) is required for import.", variant: "destructive"});
        return;
      }
      formData = { ...formData, publicKeyPem };
    }

    console.log(`Creating KMS Key (Mode: ${selectedMode}) with data:`, formData);
    toast({
      title: "KMS Key Creation Mocked",
      description: `Key "${keyAlias}" submitted via ${selectedModeDetails?.title}. Details in console.`,
    });
    // Reset common fields
    setKeyAlias('');
    setDescription('');
    setTags('');
    // Optionally reset mode-specific fields or navigate
    // setSelectedMode(null); 
    router.push('/dashboard/kms/keys');
  };

  const selectedModeDetails = creationModes.find(m => m.id === selectedMode);

  if (!selectedMode) {
    return (
      <div className="w-full space-y-8 mb-8">
        <Button variant="outline" onClick={() => router.push('/dashboard/kms/keys')} className="mb-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to KMS Keys
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-headline font-semibold">Choose Key Creation Method</h1>
          <p className="text-muted-foreground mt-2">Select how you want to create or import your cryptographic key.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {creationModes.map(mode => (
            <Card 
              key={mode.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group"
              onClick={() => setSelectedMode(mode.id)}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">{mode.icon}</div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{mode.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">{mode.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                  <Button variant="default" className="w-full">
                      Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 mb-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/dashboard/kms/keys')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to KMS Keys
        </Button>
        <Button variant="ghost" onClick={() => setSelectedMode(null)} className="text-primary hover:text-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Change Creation Method
        </Button>
      </div>
      
      <div className="w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            {selectedModeDetails?.icon ? React.cloneElement(selectedModeDetails.icon, {className: "h-8 w-8 text-primary"}) : <KeyRound className="h-8 w-8 text-primary" />}
            <h1 className="text-2xl font-headline font-semibold">
              {selectedModeDetails ? selectedModeDetails.title : "Configure Cryptographic Key"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {selectedModeDetails
              ? `Fill in the details for: ${selectedModeDetails.title}.`
              : "Fill in the details below for the new key."}
          </p>
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Settings className="mr-2 h-5 w-5 text-muted-foreground" />Key Configuration</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyId">Key ID (generated)</Label>
                  <Input id="keyId" value={keyId} readOnly className="mt-1 bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="keyAlias">Key Alias / Name</Label>
                  <Input
                    id="keyAlias"
                    value={keyAlias}
                    onChange={(e) => setKeyAlias(e.target.value)}
                    placeholder="e.g., lamassu/prod/primary-signing-key"
                    required
                    className="mt-1"
                  />
                  {!keyAlias.trim() && <p className="text-xs text-destructive mt-1">Key Alias cannot be empty.</p>}
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe the purpose or use of this key."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tags"><Tag className="inline mr-1 h-4 w-4 text-muted-foreground"/>Tags (Optional, comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., signing, production, EU_region"
                    className="mt-1"
                  />
                </div>
              </div>
            </section>
            
            {selectedMode === 'newKeyPair' && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center"><KeyRound className="mr-2 h-5 w-5 text-muted-foreground" />Key Generation Parameters</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="keyType">Key Type</Label>
                      <Select value={keyType} onValueChange={handleKeyTypeChange}>
                        <SelectTrigger id="keyType" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {keyTypes.map(kt => <SelectItem key={kt.value} value={kt.value}>{kt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="keySpec">{keySpecLabel}</Label>
                      <Select value={currentKeySpecValue} onValueChange={handleKeySpecChange}>
                        <SelectTrigger id="keySpec" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {currentKeySpecOptions.map(ks => <SelectItem key={ks.value} value={ks.value}>{ks.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {selectedMode === 'importKeyPair' && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center"><FileKey className="mr-2 h-5 w-5 text-muted-foreground" />Import Key Pair Material</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="privateKeyPem">Private Key (PEM format)</Label>
                    <Textarea
                      id="privateKeyPem"
                      value={privateKeyPem}
                      onChange={(e) => setPrivateKeyPem(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----\n..."
                      rows={6}
                      required
                      className="mt-1 font-mono"
                    />
                    {!privateKeyPem.trim() && <p className="text-xs text-destructive mt-1">Private Key (PEM) is required.</p>}
                  </div>
                  <div>
                    <Label htmlFor="publicKeyPemForImport">Public Key (PEM format) - Optional</Label>
                    <Textarea
                      id="publicKeyPemForImport"
                      value={publicKeyPemForImport}
                      onChange={(e) => setPublicKeyPemForImport(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----\n... (Optional, can be derived if private key is unencrypted)"
                      rows={4}
                      className="mt-1 font-mono"
                    />
                     <p className="text-xs text-muted-foreground mt-1">If the private key is encrypted, the public key might be needed or cannot be derived.</p>
                  </div>
                  <div>
                    <Label htmlFor="passphrase">Passphrase (if private key is encrypted)</Label>
                    <Input
                      id="passphrase"
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter passphrase for encrypted private key"
                      className="mt-1"
                    />
                  </div>
                </div>
              </section>
            )}

            {selectedMode === 'importPublicKey' && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground" />Import Public Key Material</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="publicKeyPem">Public Key (PEM format)</Label>
                    <Textarea
                      id="publicKeyPem"
                      value={publicKeyPem}
                      onChange={(e) => setPublicKeyPem(e.target.value)}
                      placeholder="-----BEGIN PUBLIC KEY-----\n..."
                      rows={6}
                      required
                      className="mt-1 font-mono"
                    />
                    {!publicKeyPem.trim() && <p className="text-xs text-destructive mt-1">Public Key (PEM) is required.</p>}
                  </div>
                </div>
              </section>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> 
                {selectedMode === 'newKeyPair' ? 'Create Key Pair' : 
                 selectedMode === 'importKeyPair' ? 'Import Key Pair' :
                 'Import Public Key'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


    
