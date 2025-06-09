
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, PlusCircle, FolderTree, ChevronRight, Minus } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData } from '@/lib/ca-data';

interface SelectableCaTreeItemProps {
  ca: CA;
  level: number;
  onSelect: (ca: CA) => void;
  currentParentId?: string | null;
}

const SelectableCaTreeItem: React.FC<SelectableCaTreeItemProps> = ({ ca, level, onSelect, currentParentId }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Expand first level by default
  const hasChildren = ca.children && ca.children.length > 0;

  // Root CAs cannot be children of other CAs (unless we allow cross-signing, which is advanced)
  // For simplicity, any CA can be a parent for now.
  // You might want to filter this to only allow selection of Root or Intermediate CAs.
  const isSelectable = true; 

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectable) {
      onSelect(ca);
    }
  };

  return (
    <li className={`py-1 ${level > 0 ? 'pl-4 border-l border-dashed border-border ml-2' : ''} relative list-none`}>
      {level > 0 && (
         <Minus className="h-3 w-3 absolute -left-[0.4rem] top-3 text-border transform rotate-90" />
      )}
      <div className="flex items-center space-x-2">
        {hasChildren && (
          <ChevronRight 
            className={`h-4 w-4 text-muted-foreground transition-transform duration-150 cursor-pointer ${isOpen ? 'rotate-90' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          />
        )}
        {!hasChildren && <div className="w-4 h-4"></div>} {/* Placeholder for alignment */}
        
        <FolderTree className="h-4 w-4 text-primary flex-shrink-0" />
        <span 
          className={`flex-1 text-sm ${isSelectable ? 'cursor-pointer hover:underline' : 'text-muted-foreground'} ${currentParentId === ca.id ? 'font-bold text-primary': ''}`}
          onClick={isSelectable ? handleSelect : undefined}
        >
          {ca.name}
        </span>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1 pl-3">
          {ca.children?.map((childCa) => (
            <SelectableCaTreeItem key={childCa.id} ca={childCa} level={level + 1} onSelect={onSelect} currentParentId={currentParentId} />
          ))}
        </ul>
      )}
    </li>
  );
};


export default function CreateCertificateAuthorityPage() {
  const router = useRouter();
  const [caName, setCaName] = useState('');
  const [caType, setCaType] = useState('root');
  const [selectedParentCa, setSelectedParentCa] = useState<CA | null>(null);
  const [validityYears, setValidityYears] = useState(caType === 'root' ? 10 : 5);
  const [keyAlgorithm, setKeyAlgorithm] = useState('RSA_2048');
  const [signatureAlgorithm, setSignatureAlgorithm] = useState('SHA256_WITH_RSA');
  const [isParentCaModalOpen, setIsParentCaModalOpen] = useState(false);

  const handleCaTypeChange = (value: string) => {
    setCaType(value);
    setSelectedParentCa(null); // Reset parent CA selection
    if (value === 'root') {
      setValidityYears(10);
    } else {
      setValidityYears(5);
    }
  };

  const handleParentCaSelect = (ca: CA) => {
    setSelectedParentCa(ca);
    setIsParentCaModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (caType === 'intermediate' && !selectedParentCa) {
      alert('Please select a Parent CA for intermediate CAs.');
      return;
    }

    const formData = {
      caName,
      caType,
      issuerId: caType === 'root' ? 'Self-signed' : selectedParentCa?.id,
      issuerDisplayName: caType === 'root' ? 'Self-signed' : selectedParentCa?.name,
      validityYears,
      keyAlgorithm,
      signatureAlgorithm,
    };
    console.log('Creating new CA with data:', formData);
    alert(`Mock CA Creation Successful for: ${caName}\nType: ${caType}\nIssuer: ${formData.issuerDisplayName}\nValidity: ${validityYears} years`);
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

            {caType === 'intermediate' && (
              <div>
                <Label htmlFor="parentCa">Parent CA</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsParentCaModalOpen(true)}
                  className="w-full justify-start text-left font-normal mt-1"
                  id="parentCa"
                >
                  {selectedParentCa ? selectedParentCa.name : "Select Parent CA..."}
                </Button>
                {!selectedParentCa && <p className="text-xs text-destructive mt-1">A parent CA must be selected.</p>}
              </div>
            )}

            {caType === 'root' && (
                 <div>
                    <Label htmlFor="issuerName">Issuer Name</Label>
                    <Input
                        id="issuerName"
                        value="Self-signed"
                        disabled
                        className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Root CAs are self-signed.</p>
                 </div>
            )}


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

      <Dialog open={isParentCaModalOpen} onOpenChange={setIsParentCaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Parent Certificate Authority</DialogTitle>
            <DialogDescription>
              Choose an existing CA to be the issuer for this new intermediate CA.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 my-4">
            <ul className="space-y-1 pr-2">
              {certificateAuthoritiesData.map((ca) => (
                <SelectableCaTreeItem 
                  key={ca.id} 
                  ca={ca} 
                  level={0} 
                  onSelect={handleParentCaSelect}
                  currentParentId={selectedParentCa?.id}
                />
              ))}
            </ul>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
