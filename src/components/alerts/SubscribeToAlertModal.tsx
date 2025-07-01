
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
import { Loader2, Mail, Users, Webhook, Check, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { subscribeToAlert, type SubscriptionPayload } from '@/lib/alerts-api';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { JSONPath } from 'jsonpath-plus';
import { Validator } from 'jsonschema';
import { Alert, AlertDescription as AlertDescUI } from '@/components/ui/alert';


interface SubscribeToAlertModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  eventType: string | null;
  samplePayload: object | null;
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

const filterOptions = [
    { value: 'NONE', label: 'None' },
    { value: 'JSON-PATH', label: 'JSON Path' },
    { value: 'JSON-SCHEMA', label: 'JSON Schema' },
    { value: 'JAVASCRIPT', label: 'Javascript' },
];

function generateSchema(obj: any): any {
  if (obj === null) {
    return { type: 'null' };
  }

  const type = typeof obj;

  if (type === 'string') {
    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z/.test(obj)) {
        return { type: 'string', format: 'date-time', description: 'Timestamp of the event.' };
    }
    return { type: 'string', description: 'A string value.' };
  }

  if (type === 'number') {
    return { type: 'number', description: 'A numeric value.' };
  }

  if (type === 'boolean') {
    return { type: 'boolean', description: 'A boolean value.' };
  }

  if (type === 'object') {
    if (Array.isArray(obj)) {
      const itemsSchema = obj.length > 0 ? generateSchema(obj[0]) : {};
      return { type: 'array', items: itemsSchema, description: 'An array of items.' };
    }

    const properties: { [key: string]: any } = {};
    const required: string[] = [];
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        properties[key] = generateSchema(obj[key]);
        required.push(key);
      }
    }
    
    const schema: any = {
      type: 'object',
      properties,
    };
    if (required.length > 0) {
        schema.required = required.sort();
    }
    return schema;
  }
  
  return {}; // Fallback for undefined, function, etc.
}


export const SubscribeToAlertModal: React.FC<SubscribeToAlertModalProps> = ({
  isOpen,
  onOpenChange,
  eventType,
  samplePayload,
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
  const [webhookName, setWebhookName] = useState('');
  const [webhookMethod, setWebhookMethod] = useState<'POST' | 'PUT'>('POST');

  // Step 2 State
  const [filterType, setFilterType] = useState<string>('NONE');
  const [filterCondition, setFilterCondition] = useState('$.data');
  const [jsonSchema, setJsonSchema] = useState('{}');
  const [jsFunction, setJsFunction] = useState('function (event) {\n  return true;\n}');
  const [evaluationResult, setEvaluationResult] = useState<{ match: boolean; message: string; error?: boolean } | null>(null);
  const [inputEvent, setInputEvent] = useState('');


  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1);
      setChannelType('EMAIL');
      setEmail(user?.profile.email || '');
      setWebhookUrl('');
      setTeamsName('');
      setWebhookName('');
      setWebhookMethod('POST');
      setFilterType('NONE');
      setFilterCondition('$.data');
      if (samplePayload) {
          const generatedSchema = generateSchema(samplePayload);
          setJsonSchema(JSON.stringify(generatedSchema, null, 2));
      } else {
          setJsonSchema('{}');
      }
      setJsFunction('function (event) {\n  return true;\n}');
      setInputEvent(samplePayload ? JSON.stringify(samplePayload, null, 2) : '');
    }
  }, [isOpen, user, samplePayload]);

  useEffect(() => {
    const evaluate = async () => {
        if (filterType === 'NONE' || !inputEvent) {
            setEvaluationResult(null);
            return;
        }

        try {
            const jsonPayload = JSON.parse(inputEvent);

            if (filterType === 'JSON-PATH') {
                if (!filterCondition.trim() || !filterCondition.startsWith('$')) {
                    setEvaluationResult({ match: false, message: 'Invalid JSONPath expression. Must start with "$".', error: true });
                    return;
                }
                const result = JSONPath({ path: filterCondition, json: jsonPayload });
                if (result.length > 0) {
                    setEvaluationResult({ match: true, message: 'The filter matches this Cloud Event' });
                } else {
                    setEvaluationResult({ match: false, message: 'The filter does not match this Cloud Event' });
                }
            } else if (filterType === 'JAVASCRIPT') {
                try {
                    // Using Function constructor is safer than eval, but not a true sandbox.
                    // It doesn't have access to local scope but can access globals.
                    const userFunc = new Function('event', `return (${jsFunction})(event)`);
                    const result = userFunc(jsonPayload);
                    
                    if (typeof result === 'boolean') {
                        if (result) {
                            setEvaluationResult({ match: true, message: 'The filter matches this Cloud Event' });
                        } else {
                            setEvaluationResult({ match: false, message: 'The filter does not match this Cloud Event' });
                        }
                    } else {
                        setEvaluationResult({ match: false, message: `Function returned type '${typeof result}', but a boolean was expected.`, error: true });
                    }
                } catch (e: any) {
                    setEvaluationResult({ match: false, message: `Evaluation error: ${e.message}`, error: true });
                }
            } else if (filterType === 'JSON-SCHEMA') {
                try {
                    const schema = JSON.parse(jsonSchema);
                    const validator = new Validator();
                    const result = validator.validate(jsonPayload, schema);
                    if (result.valid) {
                        setEvaluationResult({ match: true, message: 'The event conforms to the schema.' });
                    } else {
                        const errorMessages = result.errors.map(e => `${e.property} ${e.message}`).join('; ');
                        setEvaluationResult({ match: false, message: `Schema validation failed: ${errorMessages}`, error: true });
                    }
                } catch (e: any) {
                     setEvaluationResult({ match: false, message: `Invalid JSON Schema: ${e.message}`, error: true });
                }
            }
             else {
                setEvaluationResult(null); // No evaluation for other types yet
            }

        } catch (e: any) {
            if (e instanceof SyntaxError) {
                setEvaluationResult({ match: false, message: 'The Input Event is not valid JSON.', error: true });
            } else {
                setEvaluationResult({ match: false, message: e.message, error: true });
            }
        }
    };
    
    evaluate();
  }, [filterCondition, jsFunction, filterType, inputEvent, jsonSchema]);

  const handleNext = () => {
    if(step === 1) {
        if(channelType === 'EMAIL' && !email.trim()) {
            toast({ title: 'Validation Error', description: 'Email address is required.', variant: 'destructive' });
            return;
        }
        if(channelType === 'WEBHOOK' && (!webhookUrl.trim() || !webhookName.trim())) {
            toast({ title: 'Validation Error', description: 'Name and Webhook URL are required.', variant: 'destructive' });
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
        let config: any = {};
        if (channelType === 'EMAIL') {
            config = { email };
        } else if (channelType === 'WEBHOOK') {
            config = {
                url: webhookUrl,
                method: webhookMethod,
                name: webhookName,
            };
        } else { // TEAMS_WEBHOOK
            config = { url: webhookUrl, name: teamsName };
        }

        let channelName = `${channelType.toLowerCase()}-subscription-for-${eventType}`;
        if (channelType === 'TEAMS_WEBHOOK' && teamsName.trim()) {
            channelName = teamsName.trim();
        } else if (channelType === 'WEBHOOK' && webhookName.trim()){
            channelName = webhookName.trim();
        }

        const currentCondition = filterType === 'JAVASCRIPT' ? jsFunction 
                               : filterType === 'JSON-SCHEMA' ? jsonSchema
                               : filterCondition;

        const payload: SubscriptionPayload = {
            event_type: eventType,
            conditions: filterType !== 'NONE' && currentCondition.trim() ? [{ type: filterType, condition: currentCondition.trim() }] : [],
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
                     <div className="space-y-4">
                        <div>
                            <Label htmlFor="webhook-name-input">Name</Label>
                            <Input id="webhook-name-input" type="text" value={webhookName} onChange={e => setWebhookName(e.target.value)} placeholder="e.g., My Notification Endpoint" />
                        </div>
                        <div>
                            <Label htmlFor="webhook-method-select">Method</Label>
                            <Select value={webhookMethod} onValueChange={(v: 'POST' | 'PUT') => setWebhookMethod(v)}>
                                <SelectTrigger id="webhook-method-select"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="webhook-url-input">Webhook URL</Label>
                            <Input id="webhook-url-input" type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-webhook-url.com" />
                        </div>
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
            <div className="space-y-4">
                <div>
                    <Label htmlFor="filter-type">Filter or Condition Format</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger id="filter-type">
                            <SelectValue placeholder="Select a filter type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {filterOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {filterType === 'JSON-PATH' && (
                    <div>
                        <Label htmlFor="filter-condition-jsonpath">JSONPath Expression</Label>
                        <Input id="filter-condition-jsonpath" value={filterCondition} onChange={e => setFilterCondition(e.target.value)} placeholder={`Enter JSONPath expression...`} />
                    </div>
                )}
                {filterType === 'JAVASCRIPT' && (
                    <div>
                        <Label htmlFor="filter-condition-js">Javascript Function</Label>
                        <Textarea id="filter-condition-js" value={jsFunction} onChange={e => setJsFunction(e.target.value)} rows={5} className="font-mono"/>
                    </div>
                )}
                {filterType === 'JSON-SCHEMA' && (
                    <div>
                        <Label htmlFor="filter-condition-jsonschema">JSON Schema</Label>
                        <Textarea id="filter-condition-jsonschema" value={jsonSchema} onChange={e => setJsonSchema(e.target.value)} rows={5} className="font-mono"/>
                    </div>
                )}
                {(filterType !== 'NONE') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-1.5">
                            <Label htmlFor="input-event">Input Event</Label>
                             <Textarea 
                                id="input-event"
                                value={inputEvent}
                                onChange={(e) => setInputEvent(e.target.value)}
                                className="font-mono text-xs h-64"
                                placeholder="Enter a valid JSON object..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Evaluation Result</Label>
                            {evaluationResult ? (
                                <Alert variant={evaluationResult.error ? 'destructive' : 'default'} className={cn(
                                    !evaluationResult.error && evaluationResult.match && "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
                                    !evaluationResult.error && !evaluationResult.match && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
                                )}>
                                    <div className="flex items-center">
                                       {evaluationResult.error ? <AlertTriangle className="h-4 w-4 text-destructive" /> : 
                                        evaluationResult.match ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : 
                                        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                       }
                                       <AlertDescUI className="ml-2">{evaluationResult.message}</AlertDescUI>
                                    </div>
                                </Alert>
                            ) : (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-4 border rounded-md bg-muted/30">
                                    Awaiting evaluation...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
      case 3:
        const currentCondition = filterType === 'JAVASCRIPT' ? jsFunction 
                               : filterType === 'JSON-SCHEMA' ? jsonSchema
                               : filterCondition;
        return (
            <div className="space-y-3 text-sm p-4 border rounded-md bg-muted/50">
                <h4 className="font-semibold">Confirm Subscription</h4>
                <p><strong>Event Type:</strong> <span className="font-mono text-xs">{eventType}</span></p>
                <p><strong>Channel:</strong> {channelOptions.find(o => o.value === channelType)?.label}</p>
                {channelType === 'EMAIL' && <p><strong>Email:</strong> {email}</p>}
                {channelType === 'WEBHOOK' && (
                    <>
                        <p><strong>Name:</strong> {webhookName}</p>
                        <p><strong>Method:</strong> {webhookMethod}</p>
                        <p><strong>URL:</strong> <span className="truncate">{webhookUrl}</span></p>
                    </>
                )}
                {channelType === 'TEAMS_WEBHOOK' && (
                    <>
                        <p><strong>Name:</strong> {teamsName}</p>
                        <p><strong>URL:</strong> <span className="truncate">{webhookUrl}</span></p>
                    </>
                )}
                <p><strong>Condition Type:</strong> {filterOptions.find(o => o.value === filterType)?.label}</p>
                {filterType !== 'NONE' && <p><strong>Condition:</strong> {currentCondition}</p>}
            </div>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Subscribe to event</DialogTitle>
          <DialogDescription>
            Get notified when a "<span className="font-semibold">{eventType}</span>" event occurs.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
            <Stepper currentStep={step} />
            <div className="min-h-[200px]">
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
