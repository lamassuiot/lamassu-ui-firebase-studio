
'use client';

import React from 'react';
import crypto from 'crypto'; // For mock serial numbers
import { useRouter } from 'next/navigation'; // Added for navigation
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, FolderTree, ChevronRight, Minus, FileSearch, FilePlus2, PlusCircle } from "lucide-react";

// Define the CA data structure
interface CA {
  id: string;
  name: string;
  issuer: string;
  expires: string;
  serialNumber: string;
  status: 'active' | 'expired' | 'revoked';
  children?: CA[];
}

// Mock CA data
const certificateAuthoritiesData: CA[] = [
  {
    id: 'root-ca-1',
    name: 'LamassuIoT Global Root CA G1',
    issuer: 'Self-signed',
    expires: '2045-12-31',
    serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
    status: 'active',
    children: [
      {
        id: 'intermediate-ca-1a',
        name: 'LamassuIoT Regional Services CA EU',
        issuer: 'LamassuIoT Global Root CA G1',
        expires: '2040-06-30',
        serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
        status: 'active',
        children: [
          {
            id: 'signing-ca-1a1',
            name: 'Device Authentication CA EU West',
            issuer: 'LamassuIoT Regional Services CA EU',
            expires: '2035-01-15',
            serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
            status: 'active',
          },
          {
            id: 'signing-ca-1a2',
            name: 'Secure Update Service CA EU Central',
            issuer: 'LamassuIoT Regional Services CA EU',
            expires: '2038-03-22',
            serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
            status: 'active',
          },
        ],
      },
      {
        id: 'intermediate-ca-1b',
        name: 'LamassuIoT Manufacturing CA US',
        issuer: 'LamassuIoT Global Root CA G1',
        expires: '2039-10-10',
        serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
        status: 'active',
        children: [
           {
            id: 'signing-ca-1b1',
            name: 'Factory A Provisioning CA',
            issuer: 'LamassuIoT Manufacturing CA US',
            expires: '2030-07-12',
            serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
            status: 'active',
          }
        ]
      },
    ],
  },
  {
    id: 'root-ca-2',
    name: 'LamassuIoT Test & Development Root CA',
    issuer: 'Self-signed',
    expires: '2030-01-01',
    serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
    status: 'active',
    children: [
        {
          id: 'intermediate-ca-2a',
          name: 'Staging Environment CA',
          issuer: 'LamassuIoT Test & Development Root CA',
          expires: '2028-07-07',
          serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
          status: 'active',
        },
        {
          id: 'intermediate-ca-2b',
          name: 'QA Services CA (Expired)',
          issuer: 'LamassuIoT Test & Development Root CA',
          expires: '2023-01-01', // Expired
          serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
          status: 'expired',
        }
    ]
  },
  {
    id: 'root-ca-3',
    name: 'Old Partner Root CA (Revoked)',
    issuer: 'Self-signed',
    expires: '2025-05-05',
    serialNumber: crypto.randomBytes(10).toString('hex').toUpperCase(),
    status: 'revoked',
  }
];

// Recursive component to render each CA and its children
const CaTreeItem: React.FC<{ ca: CA; level: number; router: ReturnType<typeof useRouter> }> = ({ ca, level, router }) => {
  const [isOpen, setIsOpen] = React.useState(level < 2);

  const hasChildren = ca.children && ca.children.length > 0;

  let statusColorClass = '';
  switch (ca.status) {
    case 'active':
      statusColorClass = 'text-green-600 dark:text-green-400';
      break;
    case 'expired':
      statusColorClass = 'text-orange-500 dark:text-orange-400';
      break;
    case 'revoked':
      statusColorClass = 'text-red-600 dark:text-red-400';
      break;
    default:
      statusColorClass = 'text-muted-foreground';
  }

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/details`);
  };

  const handleIssueCertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/certificate-authorities/${ca.id}/issue-certificate`);
  };

  return (
    <li className={`py-1 ${level > 0 ? 'pl-6 border-l border-dashed border-border ml-3' : ''} relative`}>
      {level > 0 && (
         <Minus className="h-3 w-3 absolute -left-[0.45rem] top-3.5 text-border transform rotate-90" />
      )}
      <div
        className={`flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex-shrink-0 pt-1">
          {hasChildren ? (
            <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
          ) : (
            <div className="w-5 h-5"></div>
          )}
        </div>
        <FolderTree className="h-5 w-5 text-primary flex-shrink-0 pt-1" />
        <div className="flex-1">
          <span className="font-medium text-foreground">{ca.name}</span>
          <p className="text-xs text-muted-foreground">Issuer: {ca.issuer}</p>
        </div>
        <div className="text-right text-xs space-y-1 flex-shrink-0">
            <p className={`font-semibold ${statusColorClass}`}>{ca.status.toUpperCase()}</p>
            <p className="text-muted-foreground">Expires: {ca.expires}</p>
            <p className="text-muted-foreground mt-1">ID: <span className="font-mono text-xs select-all">{ca.id}</span></p>
            <p className="text-muted-foreground">Serial: <span className="font-mono text-xs select-all">{ca.serialNumber}</span></p>
            <div className="flex justify-end space-x-1 mt-2">
                <Button variant="outline" size="sm" onClick={handleDetailsClick} title={`Details for ${ca.name}`}>
                    <FileSearch className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Details</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleIssueCertClick} title={`Issue certificate from ${ca.name}`}>
                    <FilePlus2 className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Issue</span>
                </Button>
            </div>
        </div>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1">
          {ca.children?.map((childCa) => (
            <CaTreeItem key={childCa.id} ca={childCa} level={level + 1} router={router} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function CertificateAuthoritiesPage() {
  const router = useRouter(); // Initialize router

  const handleCreateNewCAClick = () => {
    console.log('Create New Certificate Authority clicked');
    // Implement navigation or modal display for new CA creation
    // For now, let's also route to a placeholder page if it existed, e.g.
    // router.push('/dashboard/certificate-authorities/new');
  };

  return (
    <div className="space-y-6 w-full">
      <Card className="shadow-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Landmark className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Certificate Authorities</CardTitle>
            </div>
            <Button variant="default" onClick={handleCreateNewCAClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New CA
            </Button>
          </div>
          <CardDescription>Manage your Certificate Authority (CA) configurations and trust stores. Click on a CA with sub-items to expand/collapse.</CardDescription>
        </CardHeader>
        <CardContent>
          {certificateAuthoritiesData.length > 0 ? (
            <ul className="space-y-1">
              {certificateAuthoritiesData.map((ca) => (
                <CaTreeItem key={ca.id} ca={ca} level={0} router={router} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No Certificate Authorities configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
