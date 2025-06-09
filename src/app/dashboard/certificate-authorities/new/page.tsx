
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle } from "lucide-react";

export default function CreateCertificateAuthorityPage() {
  const router = useRouter();
  const [caName, setCaName] = useState('');
  const [caType, setCaType] = useState('root');
  const [issuerName, setIssuerName] = useState(caType === 'root' ? 'Self-signed' : '');
  const [validityYears, setValidityYears] = useState(caType === 'root' ? 10 : 5);
  const [keyAlgorithm, setKeyAlgorithm] = useState('RSA_2048');
  const [signatureAlgorithm, setSignatureAlgorithm] = useState('SHA256_WITH_RSA');

  const handleCaTypeChange = (value: string) => {
    setCaType(value);
    if (value === 'root') {
      setIssuerName('Self-signed');
      setValidityYears(10);
    } else {
      setIssuerName(''); 
      setValidityYears(5);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = {
      caName,
      caType,
      issuerName: caType === 'root' ? 'Self-signed' : issuerName,
      validityYears,
      keyAlgorithm,
      signatureAlgorithm,
    };
    console.log('Creating new CA with data:', formData);
    // In a real app, you would submit this data to a backend
    // For now, just show an alert and navigate back
    alert(`Mock CA Creation Successful for: ${caName}\nType: ${caType}\nIssuer: ${formData.issuerName}\nValidity: ${validityYears} years`);
    router.push('/dashboard/certificate-authorities'); 
  };

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <PlusCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">Create New Certificate Authority</CardTitle>
          </div>
          <CardDescription>
            Fill in the details below to provision a new Certificate Authority.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="caName">CA Name</Label>
              <Input
                id="caName"
                value={caName}
                onChange={(e) => setCaName(e.target.value)}
                placeholder="e.g., LamassuIoT Secure Services CA"
                required
              />
            </div>

            <div>
              <Label htmlFor="caType">CA Type</Label>
              <Select value={caType} onValueChange={handleCaTypeChange}>
                <SelectTrigger id="caType">
                  <SelectValue placeholder="Select CA type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root CA</SelectItem>
                  <SelectItem value="intermediate">Intermediate CA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="issuerName">Issuer Name</Label>
              <Input
                id="issuerName"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder={caType === 'root' ? 'Self-signed' : 'Enter Parent CA Name or ID'}
                disabled={caType === 'root'}
                required={caType !== 'root'}
              />
              {caType === 'root' && <p className="text-xs text-muted-foreground mt-1">Root CAs are self-signed.</p>}
            </div>

            <div>
              <Label htmlFor="validityYears">Validity (Years)</Label>
              <Input
                id="validityYears"
                type="number"
                value={validityYears}
                onChange={(e) => setValidityYears(parseInt(e.target.value, 10))}
                min="1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="keyAlgorithm">Key Algorithm</Label>
              <Select value={keyAlgorithm} onValueChange={setKeyAlgorithm}>
                <SelectTrigger id="keyAlgorithm">
                  <SelectValue placeholder="Select key algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSA_2048">RSA 2048-bit</SelectItem>
                  <SelectItem value="RSA_4096">RSA 4096-bit</SelectItem>
                  <SelectItem value="ECDSA_P256">ECDSA P-256</SelectItem>
                  <SelectItem value="ECDSA_P384">ECDSA P-384</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="signatureAlgorithm">Signature Algorithm</Label>
              <Select value={signatureAlgorithm} onValueChange={setSignatureAlgorithm}>
                <SelectTrigger id="signatureAlgorithm">
                  <SelectValue placeholder="Select signature algorithm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHA256_WITH_RSA">SHA256 with RSA</SelectItem>
                  <SelectItem value="SHA384_WITH_RSA">SHA384 with RSA</SelectItem>
                  <SelectItem value="SHA512_WITH_RSA">SHA512 with RSA</SelectItem>
                  <SelectItem value="SHA256_WITH_ECDSA">SHA256 with ECDSA</SelectItem>
                  <SelectItem value="SHA384_WITH_ECDSA">SHA384 with ECDSA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              Create CA
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
