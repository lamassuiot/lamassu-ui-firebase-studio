'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ShieldCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import * as asn1js from "asn1js";
import { Certificate, OCSPRequest, Request as PkijsRequest, CertID, OCSPResponse, getCrypto } from "pkijs";
import type { CertificateData } from '@/types/certificate';
import type { CA } from '@/lib/ca-data';
import { format } from 'date-fns';
import { DetailItem } from './DetailItem';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';

interface OcspCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateData | null;
  issuerCertificate: CA | null;
}

interface OcspResponseDetails {
    status: 'good' | 'revoked' | 'unknown' | 'error';
    statusText: string;
    producedAt?: string;
    thisUpdate?: string;
    nextUpdate?: string;
    revocationReason?: string;
    revocationTime?: string;
    errorDetails?: string;
    responderId?: string;
}

const getCertStatusFromTag = (tag: number): OcspResponseDetails['status'] => {
    if (tag === 0) return 'good';
    if (tag === 1) return 'revoked';
    return 'unknown';
};

const getRevocationReasonFromCode = (code?: number): string => {
    if (code === undefined) return 'N/A';
    const reasons = [
        "unspecified", "keyCompromise", "cACompromise", "affiliationChanged",
        "superseded", "cessationOfOperation", "certificateHold",
        "removeFromCRL", "privilegeWithdrawn", "aACompromise"
    ];
    return reasons[code] || `Unknown (${code})`;
};

export const OcspCheckModal: React.FC<OcspCheckModalProps> = ({ isOpen, onClose, certificate, issuerCertificate }) => {
    const [ocspUrl, setOcspUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [responseDetails, setResponseDetails] = useState<OcspResponseDetails | null>(null);

    useEffect(() => {
        if (isOpen && certificate?.ocspUrls && certificate.ocspUrls.length > 0) {
            setOcspUrl(certificate.ocspUrls[0]);
        } else {
            setOcspUrl('');
        }
        setResponseDetails(null); // Reset on open
    }, [isOpen, certificate]);

    const handleSendRequest = async () => {
        if (!ocspUrl || !certificate || !issuerCertificate?.pemData) {
            setResponseDetails({ status: 'error', statusText: 'Missing Information', errorDetails: 'OCSP URL, target certificate, or issuer certificate is missing.' });
            return;
        }

        setIsLoading(true);
        setResponseDetails(null);

        try {
            // 1. Parse target and issuer certificates
            const parsePem = (pem: string) => {
                const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "");
                const binary = window.atob(pemString);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return asn1js.fromBER(bytes.buffer);
            };

            const targetCertAsn1 = parsePem(certificate.pemData);
            const targetCert = new Certificate({ schema: targetCertAsn1.result });

            const issuerCertAsn1 = parsePem(issuerCertificate.pemData);
            const issuerCert = new Certificate({ schema: issuerCertAsn1.result });

            // 2. Create CertID manually instead of using the problematic static method
            const certId = new CertID();
            const crypto = getCrypto();
            if (!crypto) {
                throw new Error("WebCrypto API is not available. Could not get crypto engine.");
            }
            
            const hashAlgorithm = "SHA-1"; // OCSP standard hash algorithm for CertID
            
            const issuerNameBuffer = issuerCert.subject.toSchema().toBER(false);
            certId.issuerNameHash = await crypto.digest(hashAlgorithm, issuerNameBuffer);
            
            const issuerKeyBuffer = issuerCert.subjectPublicKeyInfo.toSchema().toBER(false);
            certId.issuerKeyHash = await crypto.digest(hashAlgorithm, issuerKeyBuffer);
            
            certId.serialNumber = targetCert.serialNumber;
            
            // 3. Create OCSP Request
            const ocspRequest = new OCSPRequest({
                tbsRequest: {
                    requestList: [new PkijsRequest({ reqCert: certId })]
                }
            });

            // 4. Send Request
            const requestBody = ocspRequest.toSchema().toBER(false);
            const response = await fetch(ocspUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/ocsp-request' },
                body: requestBody
            });

            if (!response.ok) {
                throw new Error(`OCSP server responded with HTTP ${response.status}`);
            }

            // 5. Parse Response
            const responseBody = await response.arrayBuffer();
            const asn1Resp = asn1js.fromBER(responseBody);
            const ocspResponse = new OCSPResponse({ schema: asn1Resp.result });

            if (ocspResponse.responseStatus !== 0) {
                 throw new Error(`OCSP response status is not 'successful'. Status: ${ocspResponse.responseStatus}`);
            }

            if (!ocspResponse.responseBytes) throw new Error("No responseBytes in OCSP response.");
            const basicResponse = ocspResponse.responseBytes.response.valueBlock.value[0];
            const singleResponse = basicResponse.tbsResponseData.responses[0];

            let responderId = "N/A";
            if(basicResponse.tbsResponseData.responderID.byName) {
                responderId = basicResponse.tbsResponseData.responderID.byName.typesAndValues.map((tv: any) => `${tv.type}=${tv.value.valueBlock.value}`).join(', ');
            } else if (basicResponse.tbsResponseData.responderID.byKey) {
                responderId = `KeyHash: ${Buffer.from(basicResponse.tbsResponseData.responderID.byKey.valueBlock.valueHex).toString('hex')}`;
            }

            const certStatus = getCertStatusFromTag(singleResponse.certStatus.tag);
            let revokedInfo = {};
            if (certStatus === 'revoked' && singleResponse.certStatus.value?.revocationTime) {
                revokedInfo = {
                    revocationTime: format(singleResponse.certStatus.value.revocationTime, 'PPpp'),
                    revocationReason: getRevocationReasonFromCode(singleResponse.certStatus.value.revocationReason),
                };
            }
            
            setResponseDetails({
                status: certStatus,
                statusText: certStatus.charAt(0).toUpperCase() + certStatus.slice(1),
                producedAt: format(basicResponse.tbsResponseData.producedAt, 'PPpp'),
                thisUpdate: format(singleResponse.thisUpdate, 'PPpp'),
                nextUpdate: singleResponse.nextUpdate ? format(singleResponse.nextUpdate, 'PPpp') : 'Not specified',
                responderId,
                ...revokedInfo,
            });

        } catch (e: any) {
            console.error("OCSP Check Failed:", e);
            let errorDetails = e.message || 'An unknown error occurred.';
            if (e instanceof TypeError && e.message.includes('fetch')) {
                errorDetails += ' This is often caused by a CORS policy on the OCSP server, which prevents browser-based requests. Check the browser console for more details.';
            }
            setResponseDetails({ status: 'error', statusText: 'Request Failed', errorDetails });
        } finally {
            setIsLoading(false);
        }
    };
    
    const StatusDisplay: React.FC<{ details: OcspResponseDetails }> = ({ details }) => {
        let Icon = AlertTriangle;
        let colorClass = "text-yellow-600";
        if (details.status === 'good') { Icon = CheckCircle; colorClass = "text-green-600"; }
        if (details.status === 'revoked') { Icon = XCircle; colorClass = "text-red-600"; }
        if (details.status === 'unknown') { Icon = Clock; colorClass = "text-gray-600"; }
        
        return (
             <div className="flex items-center space-x-2">
                <Icon className={`h-6 w-6 ${colorClass}`} />
                <Badge variant={details.status === 'good' ? 'default' : 'destructive'} className={details.status === 'good' ? 'bg-green-500' : ''}>
                    {details.statusText}
                </Badge>
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg md:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><ShieldCheck className="mr-2 h-6 w-6 text-primary"/>OCSP Status Check</DialogTitle>
                    <DialogDescription>
                        Verify the revocation status of certificate <span className="font-mono text-xs">{certificate?.serialNumber}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4">
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="ocsp-url-select">Select a discovered URL</Label>
                            <Select value={ocspUrl} onValueChange={setOcspUrl} disabled={isLoading || !certificate?.ocspUrls?.length}>
                                <SelectTrigger id="ocsp-url-select">
                                    <SelectValue placeholder="Select from certificate's AIA..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {certificate?.ocspUrls?.map(url => (
                                        <SelectItem key={url} value={url}>{url}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or
                                </span>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="ocsp-url-input">Enter URL manually</Label>
                            <Input
                                id="ocsp-url-input"
                                type="text"
                                placeholder="http://ocsp.example.com"
                                value={ocspUrl}
                                onChange={(e) => setOcspUrl(e.target.value)}
                                disabled={isLoading}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSendRequest} disabled={!ocspUrl || isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Send OCSP Request
                    </Button>
                </div>
                
                {responseDetails && (
                    <div className="mt-4 border-t pt-4">
                         <h4 className="text-lg font-medium mb-3">OCSP Response</h4>
                         {responseDetails.status === 'error' ? (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{responseDetails.statusText}</AlertTitle>
                                <AlertDescription>{responseDetails.errorDetails}</AlertDescription>
                            </Alert>
                         ) : (
                            <div className="space-y-2">
                                <DetailItem label="Status" value={<StatusDisplay details={responseDetails} />} />
                                <DetailItem label="Responder ID" value={responseDetails.responderId} isMono />
                                <DetailItem label="Produced At" value={responseDetails.producedAt} />
                                <DetailItem label="This Update" value={responseDetails.thisUpdate} />
                                <DetailItem label="Next Update" value={responseDetails.nextUpdate} />
                                {responseDetails.status === 'revoked' && (
                                <>
                                    <DetailItem label="Revocation Time" value={responseDetails.revocationTime} />
                                    <DetailItem label="Revocation Reason" value={responseDetails.revocationReason} />
                                </>
                                )}
                            </div>
                         )}
                    </div>
                )}


                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
