
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, PlusCircle, FolderTree, ChevronRight, Minus, Settings, Info, CalendarDays } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData } from '@/lib/ca-data';
import { Separator } from '@/components/ui/separator';

interface SelectableCaTreeItemProps {
  ca: CA;
  level: number;
  onSelect: (ca: CA) => void;
  currentParentId?: string | null;
}

const SelectableCaTreeItem: React.FC<SelectableCaTreeItemProps> = ({ ca, level, onSelect, currentParentId }) => {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = ca.children && ca.children.length > 0;
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

const keyTypes = [
  { value: 'RSA', label: 'RSA' },
  { value: 'ECDSA', label: 'ECDSA' },
];

const rsaKeySizes = [
  { value: '2048', label: '2048 bit' },
  { value: '3072', label: '3072 bit' },
  { value: '4096', label: '4096 bit' },
];

const ecdsaKeySizes = [
  { value: 'P-256', label: 'P-256' },
  { value: 'P-384', label: 'P-384' },
  { value: 'P-521', label: 'P-521' },
];


export default function CreateCertificateAuthorityPage() {
  const router = useRouter();
  const [caType, setCaType] = useState('root'); // 'root' or 'intermediate'
  const [cryptoEngine, setCryptoEngine] = useState('Local Software KeyStore');
  const [selectedParentCa, setSelectedParentCa] = useState<CA | null>(null);
  const [caId, setCaId] = useState('');
  const [caName, setCaName] = useState(''); // This will be Subject CN

  const [keyType, setKeyType] = useState('RSA');
  const [keySize, setKeySize] = useState('2048');

  // Subject DN components
  const [country, setCountry] = useState(''); // C
  const [stateProvince, setStateProvince] = useState(''); // ST
  const [locality, setLocality] = useState(''); // L
  const [organization, setOrganization] = useState(''); // O
  const [organizationalUnit, setOrganizationalUnit] = useState(''); // OU

  const [caExpirationDuration, setCaExpirationDuration] = useState('10y');
  const [issuanceExpirationDuration, setIssuanceExpirationDuration] = useState('1y');

  const [isParentCaModalOpen, setIsParentCaModalOpen] = useState(false);

  useEffect(() => {
    setCaId(crypto.randomUUID());
  }, []);

  const handleCaTypeChange = (value: string) => {
    setCaType(value);
    setSelectedParentCa(null);
    if (value === 'root') {
      setCaExpirationDuration('10y');
      setIssuanceExpirationDuration('1y');
    } else {
      setCaExpirationDuration('5y');
      setIssuanceExpirationDuration('90d');
    }
  };

  const handleKeyTypeChange = (value: string) => {
    setKeyType(value);
    if (value === 'RSA') {
      setKeySize('2048');
    } else if (value === 'ECDSA') {
      setKeySize('P-256');
    }
  };

  const currentKeySizeOptions = keyType === 'RSA' ? rsaKeySizes : ecdsaKeySizes;

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
    if (!caName.trim()) {
        alert('CA Name (Common Name) cannot be empty.');
        return;
    }

    const subjectDN = {
        C: country,
        ST: stateProvince,
        L: locality,
        O: organization,
        OU: organizationalUnit,
        CN: caName,
    };

    const formData = {
      caType,
      cryptoEngine,
      parentCaId: caType === 'root' ? 'Self-signed' : selectedParentCa?.id,
      parentCaName: caType === 'root' ? 'Self-signed' : selectedParentCa?.name,
      caId,
      subjectDN,
      keyType,
      keySize,
      caExpirationDuration,
      issuanceExpirationDuration,
    };
    console.log('Creating new CA with data:', formData);
    alert(`Mock CA Creation Successful for: ${caName}\nType: ${caType}\nDetails in console.`);
    router.push('/dashboard/certificate-authorities');
  };

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <div className="w-full"> {/* Was Card */}
        <div className="p-6"> {/* Was CardHeader - simplified to p-6 or adjust as needed */}
          <div className="flex items-center space-x-3">
            <PlusCircle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Create New Certificate Authority</h1> {/* Was CardTitle */}
          </div>
          <p className="text-sm text-muted-foreground mt-1.5"> {/* Was CardDescription, added mt-1.5 for spacing */}
            Fill in the details below to provision a new Certificate Authority.
          </p>
        </div>
        <div className="p-6 pt-0"> {/* Was CardContent */}
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* CA Settings Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Settings className="mr-2 h-5 w-5 text-muted-foreground" />CA Settings</h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor="caType">CA Type</Label>
                  <Select value={caType} onValueChange={handleCaTypeChange}>
                    <SelectTrigger id="caType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root CA</SelectItem>
                      <SelectItem value="intermediate">Intermediate CA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cryptoEngine">Crypto Engine</Label>
                  <Select value={cryptoEngine} onValueChange={setCryptoEngine}>
                    <SelectTrigger id="cryptoEngine"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local Software KeyStore">Local Software KeyStore</SelectItem>
                      <SelectItem value="AWS KMS">AWS KMS (mock)</SelectItem>
                      <SelectItem value="Azure Key Vault">Azure Key Vault (mock)</SelectItem>
                      <SelectItem value="Hardware HSM">Hardware HSM (mock)</SelectItem>
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
                    {!selectedParentCa && <p className="text-xs text-destructive mt-1">A parent CA must be selected for intermediate CAs.</p>}
                  </div>
                )}
                 {caType === 'root' && (
                     <div>
                        <Label htmlFor="issuerName">Issuer</Label>
                        <Input id="issuerName" value="Self-signed" disabled className="mt-1 bg-muted/50" />
                        <p className="text-xs text-muted-foreground mt-1">Root CAs are self-signed.</p>
                     </div>
                )}


                <div>
                  <Label htmlFor="caId">CA ID</Label>
                  <Input id="caId" value={caId} readOnly className="mt-1 bg-muted/50" />
                </div>

                <div>
                  <Label htmlFor="caName">CA Name (Subject Common Name)</Label>
                  <Input
                    id="caName"
                    value={caName}
                    onChange={(e) => setCaName(e.target.value)}
                    placeholder="e.g., LamassuIoT Secure Services CA"
                    required
                    className="mt-1"
                  />
                  {!caName.trim() && <p className="text-xs text-destructive mt-1">CA Name (Common Name) cannot be empty.</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyType">Key Type</Label>
                    <Select value={keyType} onValueChange={handleKeyTypeChange}>
                      <SelectTrigger id="keyType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {keyTypes.map(kt => <SelectItem key={kt.value} value={kt.value}>{kt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="keySize">Key Size</Label>
                    <Select value={keySize} onValueChange={setKeySize}>
                      <SelectTrigger id="keySize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currentKeySizeOptions.map(ks => <SelectItem key={ks.value} value={ks.value}>{ks.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Subject Section */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground" />Subject Distinguished Name (DN)</h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country (C)</Label>
                    <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g., US (2-letter code)" maxLength={2} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="stateProvince">State / Province (ST)</Label>
                    <Input id="stateProvince" value={stateProvince} onChange={e => setStateProvince(e.target.value)} placeholder="e.g., California" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locality">Locality (L)</Label>
                    <Input id="locality" value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g., San Francisco" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization (O)</Label>
                    <Input id="organization" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="e.g., LamassuIoT Corp" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="organizationalUnit">Organizational Unit (OU)</Label>
                  <Input id="organizationalUnit" value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)} placeholder="e.g., Secure Devices Division" className="mt-1" />
                </div>
                 <p className="text-xs text-muted-foreground">The "CA Name" entered in CA Settings will be used as the Common Name (CN) for the subject.</p>
              </div>
            </section>

            <Separator />

            {/* Expiration Settings */}
            <section>
                 <h3 className="text-lg font-semibold mb-3 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />Expiration Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
                    <div>
                        <Label htmlFor="caExpirationDuration" className="font-medium">CA Certificate Expiration</Label>
                        <Input
                            id="caExpirationDuration"
                            value={caExpirationDuration}
                            onChange={(e) => setCaExpirationDuration(e.target.value)}
                            placeholder="e.g., 10y, 365d"
                            required
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Duration (valid units: y/w/d/h/m/s).</p>
                    </div>
                    <div>
                        <Label htmlFor="issuanceExpirationDuration" className="font-medium">Default End-Entity Certificate Issuance Expiration</Label>
                        <Input
                            id="issuanceExpirationDuration"
                            value={issuanceExpirationDuration}
                            onChange={(e) => setIssuanceExpirationDuration(e.target.value)}
                            placeholder="e.g., 1y, 90d"
                            required
                            className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Duration for certs issued by this CA.</p>
                    </div>
                </div>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> Create CA
              </Button>
            </div>
          </form>
        </div>
      </div>

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
              {certificateAuthoritiesData.filter(ca => ca.status === 'active').map((ca) => ( // Only show active CAs as potential parents
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
