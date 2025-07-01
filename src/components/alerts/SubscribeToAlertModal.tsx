
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, Users, Webhook, Check, ArrowLeft } from 'lucide-react';
import { subscribeToAlert, type SubscriptionPayload } from '@/lib/alerts-api';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

interface SubscribeToAlertModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  eventType: string | null;
  onSuccess: () => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Channels", "Filters", "Confirmation"];
  return (
    <div className="flex items-center space-x-4 mb-8">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex flex-col items-center space-y-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold transition-colors",
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

const channelOptions = [
    { value: 'EMAIL', label: 'Email Notification', icon: Mail },
    { value: 'TEAMS_WEBHOOK', label: 'Microsoft Teams Webhook', icon: Users },
    { value: 'WEBHOOK', label: 'Webhook', icon: Webhook },
];

export const SubscribeToAlertModal: React.FC<SubscribeToAlertModalProps> = ({
  isOpen,
  onOpenChange,
  eventType,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1 State
  const [channelType, setChannelType] = useState<'EMAIL' | 'TEAMS_WEBHOOK' | 'WEBHOOK'>('EMAIL');
  const [email, setEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [teamsName, setTeamsName] = useState('');

  // Step 2 State
  const [jsonPathCondition, setJsonPathCondition] = useState('$.data');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1);
      setChannelType('EMAIL');
      setEmail(user?.profile.email || '');
      setWebhookUrl('');
      setTeamsName('');
      setJsonPathCondition('$.data');
    }
  }, [isOpen, user]);

  const handleNext = () => {
    if(step === 1) {
        if(channelType === 'EMAIL' && !email.trim()) {
            toast({ title: 'Validation Error', description: 'Email address is required.', variant: 'destructive' });
            return;
        }
        if(channelType === 'WEBHOOK' && !webhookUrl.trim()) {
            toast({ title: 'Validation Error', description: 'Webhook URL is required.', variant: 'destructive' });
            return;
        }
        if(channelType === 'TEAMS_WEBHOOK' && (!webhookUrl.trim() || !teamsName.trim())) {
            toast({ title: 'Validation Error', description: 'Name and Webhook URL are required for Teams.', variant: 'destructive' });
            return;
        }
    }
    setStep(s => s + 1);
  }

  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!eventType || !user?.access_token) {
        toast({ title: "Error", description: "Event type or authentication is missing.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        let config = {};
        if (channelType === 'EMAIL') {
            config = { email };
        } else {
            config = { url: webhookUrl };
        }

        let channelName = `${channelType.toLowerCase()}-subscription-for-${eventType}`;
        if (channelType === 'TEAMS_WEBHOOK' && teamsName.trim()) {
            channelName = teamsName.trim();
        }

        const payload: SubscriptionPayload = {
            event_type: eventType,
            conditions: jsonPathCondition ? [{ type: 'JSON-PATH', condition: jsonPathCondition }] : [],
            channel: {
                type: channelType,
                name: channelName,
                config: config,
            }
        };

        await subscribeToAlert(payload, user.access_token);
        onSuccess();
    } catch(e: any) {
        toast({ title: "Subscription Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
            <div className="space-y-4">
                <Label htmlFor="channel-type">Channel Type</Label>
                <Select value={channelType} onValueChange={(v) => setChannelType(v as any)}>
                    <SelectTrigger id="channel-type">
                        <SelectValue placeholder="Select a channel type..." />
                    </SelectTrigger>
                    <SelectContent>
                        {channelOptions.map(opt => {
                            const Icon = opt.icon;
                            return (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span>{opt.label}</span>
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                
                {channelType === 'EMAIL' && (
                    <div>
                        <Label htmlFor="email-input">Email Address</Label>
                        <Input id="email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your.email@example.com" />
                    </div>
                )}
                {channelType === 'WEBHOOK' && (
                     <div>
                        <Label htmlFor="webhook-url-input">Webhook URL</Label>
                        <Input id="webhook-url-input" type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-webhook-url.com" />
                    </div>
                )}
                {channelType === 'TEAMS_WEBHOOK' && (
                     <div className="space-y-4">
                        <div>
                            <Label htmlFor="teams-name-input">Name</Label>
                            <Input id="teams-name-input" type="text" value={teamsName} onChange={e => setTeamsName(e.target.value)} placeholder="e.g., Critical Alerts Team" />
                        </div>
                        <div>
                            <Label htmlFor="webhook-url-input-teams">Incoming Microsoft Teams Webhook URL</Label>
                            <Input id="webhook-url-input-teams" type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-tenant.webhook.office.com/..." />
                        </div>
                    </div>
                )}
            </div>
        );
      case 2:
        return (
            <div>
                <Label htmlFor="json-path-condition">JSON-PATH Condition</Label>
                <Textarea id="json-path-condition" value={jsonPathCondition} onChange={e => setJsonPathCondition(e.target.value)} placeholder="e.g., $.data.id" rows={4}/>
                <p className="text-xs text-muted-foreground mt-1">
                    Define a JSON-PATH expression to filter events based on their payload. Leave empty for no condition.
                </p>
            </div>
        );
      case 3:
        return (
            <div className="space-y-3 text-sm p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold">Confirm Subscription</h4>
                <p><strong>Event Type:</strong> <span className="font-mono text-xs">{eventType}</span></p>
                <p><strong>Channel:</strong> {channelOptions.find(o => o.value === channelType)?.label}</p>
                {channelType === 'EMAIL' && <p><strong>Email:</strong> {email}</p>}
                {channelType === 'WEBHOOK' && <p><strong>URL:</strong> <span className="truncate">{webhookUrl}</span></p>}
                {channelType === 'TEAMS_WEBHOOK' && (
                    <>
                        <p><strong>Name:</strong> {teamsName}</p>
                        <p><strong>URL:</strong> <span className="truncate">{webhookUrl}</span></p>
                    </>
                )}
                <p><strong>Condition:</strong> {jsonPathCondition || "None"}</p>
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Subscribe to event</DialogTitle>
          <DialogDescription>
            Get notified when a "<span className="font-semibold">{eventType}</span>" event occurs.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <Stepper currentStep={step} />
            <div className="min-h-[150px]">
                {renderStepContent()}
            </div>
        </div>

        <DialogFooter className="flex justify-between w-full">
            <div>
                {step > 1 && <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>}
            </div>
            <div className="flex space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                {step < 3 && <Button onClick={handleNext}>Next</Button>}
                {step === 3 && <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Confirm Subscription
                </Button>}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
