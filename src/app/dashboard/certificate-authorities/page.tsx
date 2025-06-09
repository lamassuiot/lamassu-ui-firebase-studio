
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Landmark, FolderTree, ChevronRight, Minus } from "lucide-react"; // Added FolderTree, ChevronRight, Minus

// Define the CA data structure
interface CA {
  id: string;
  name: string;
  issuer: string;
  expires: string;
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
    status: 'active',
    children: [
      {
        id: 'intermediate-ca-1a',
        name: 'LamassuIoT Regional Services CA EU',
        issuer: 'LamassuIoT Global Root CA G1',
        expires: '2040-06-30',
        status: 'active',
        children: [
          { 
            id: 'signing-ca-1a1', 
            name: 'Device Authentication CA EU West', 
            issuer: 'LamassuIoT Regional Services CA EU', 
            expires: '2035-01-15',
            status: 'active',
          },
          { 
            id: 'signing-ca-1a2', 
            name: 'Secure Update Service CA EU Central', 
            issuer: 'LamassuIoT Regional Services CA EU', 
            expires: '2038-03-22',
            status: 'active',
          },
        ],
      },
      {
        id: 'intermediate-ca-1b',
        name: 'LamassuIoT Manufacturing CA US',
        issuer: 'LamassuIoT Global Root CA G1',
        expires: '2039-10-10',
        status: 'active',
        children: [
           { 
            id: 'signing-ca-1b1', 
            name: 'Factory A Provisioning CA', 
            issuer: 'LamassuIoT Manufacturing CA US', 
            expires: '2030-07-12',
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
    status: 'active',
    children: [
        { 
          id: 'intermediate-ca-2a', 
          name: 'Staging Environment CA', 
          issuer: 'LamassuIoT Test & Development Root CA', 
          expires: '2028-07-07',
          status: 'active',
        },
        { 
          id: 'intermediate-ca-2b', 
          name: 'QA Services CA (Expired)', 
          issuer: 'LamassuIoT Test & Development Root CA', 
          expires: '2023-01-01', // Expired
          status: 'expired',
        }
    ]
  },
  {
    id: 'root-ca-3',
    name: 'Old Partner Root CA (Revoked)',
    issuer: 'Self-signed',
    expires: '2025-05-05',
    status: 'revoked',
  }
];

// Recursive component to render each CA and its children
const CaTreeItem: React.FC<{ ca: CA; level: number }> = ({ ca, level }) => {
  const [isOpen, setIsOpen] = React.useState(level < 2); // Default open for root and first level intermediates

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

  return (
    <li className={`py-1 ${level > 0 ? 'pl-6 border-l border-dashed border-border ml-3' : ''} relative`}>
      {level > 0 && (
         <Minus className="h-3 w-3 absolute -left-[0.45rem] top-3.5 text-border transform rotate-90" />
      )}
      <div 
        className={`flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 ${hasChildren ? 'cursor-pointer' : ''}`}
        onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
      >
        {hasChildren ? (
          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
        ) : (
          <div className="w-5 h-5"></div> // Placeholder for alignment
        )}
        <FolderTree className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <span className="font-medium text-foreground">{ca.name}</span>
          <p className="text-xs text-muted-foreground">Issuer: {ca.issuer}</p>
        </div>
        <div className="text-right text-xs">
            <p className={`font-semibold ${statusColorClass}`}>{ca.status.toUpperCase()}</p>
            <p className="text-muted-foreground">Expires: {ca.expires}</p>
        </div>
      </div>
      {hasChildren && isOpen && (
        <ul className="mt-1">
          {ca.children?.map((childCa) => (
            <CaTreeItem key={childCa.id} ca={childCa} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function CertificateAuthoritiesPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <Landmark className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">Certificate Authorities</CardTitle>
          </div>
          <CardDescription>Manage your Certificate Authority (CA) configurations and trust stores. Click on a CA with sub-items to expand/collapse.</CardDescription>
        </CardHeader>
        <CardContent>
          {certificateAuthoritiesData.length > 0 ? (
            <ul className="space-y-1">
              {certificateAuthoritiesData.map((ca) => (
                <CaTreeItem key={ca.id} ca={ca} level={0} />
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
