
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RegistrationAuthoritiesPage() {
  const router = useRouter();

  const handleCreateNewRAClick = () => {
    router.push('/dashboard/registration-authorities/new');
  };

  return (
    <div className="space-y-6 w-full">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl font-headline">Registration Authorities</CardTitle>
            </div>
            <Button variant="default" onClick={handleCreateNewRAClick}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New RA
            </Button>
          </div>
          <CardDescription>Oversee Registration Authority (RA) settings and operations. Manage existing RAs or create new ones.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This section is for managing Registration Authorities. Below you would typically see a list of configured RAs.
          </p>
           <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">RA Listing Area</h3>
            <p className="text-sm text-muted-foreground">Existing RAs would be listed here. Currently under construction.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
