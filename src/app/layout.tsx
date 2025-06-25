
'use client';

import './globals.css'; 
import { Toaster } from "@/components/ui/toaster"; 
import { AuthProvider, useAuth } from '@/contexts/AuthContext'; 

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams }
from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarGroupLabel,
  useSidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Shield, FileText, Users, Landmark, ShieldCheck, HomeIcon, ChevronsLeft, ChevronsRight, Router, ServerCog, KeyRound, ScrollTextIcon, LogIn, LogOut, Loader2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { jwtDecode } from 'jwt-decode';
import Image from 'next/image'
import Logo from './lamassu_full_white.svg'

interface DecodedAccessToken {
  realm_access?: {
    roles?: string[];
  };
}

const PATH_SEGMENT_TO_LABEL_MAP: Record<string, string> = {
  'certificates': "Certificates",
  'certificate-authorities': "Certificate Authorities",
  'signing-profiles': "Signing Profiles",
  'registration-authorities': "Registration Authorities",
  'verification-authorities': "Verification Authorities",
  'new': "New",
  'details': "Details",
  'issue-certificate': "Issue Certificate",
  'kms': "KMS",
  'keys': "Keys",
  'devices': "Devices",
  'device-groups': "Device Groups",
  'crypto-engines': "Crypto Engines",
};

function generateBreadcrumbs(pathname: string, queryParams: URLSearchParams): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(segment => segment);
  const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  if (pathname === '/') {
    return [{ label: 'Home' }];
  }

  let currentHref = '';

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    let label = PATH_SEGMENT_TO_LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    currentHref += `/${segment}`;
    const isLastSegment = i === pathSegments.length - 1;
    let hrefWithQuery = currentHref;

    if (segment === 'details') {
        if (queryParams.get('caId')) hrefWithQuery += `?caId=${queryParams.get('caId')}`;
        else if (queryParams.get('certificateId')) hrefWithQuery += `?certificateId=${queryParams.get('certificateId')}`;
        else if (queryParams.get('keyId')) hrefWithQuery += `?keyId=${queryParams.get('keyId')}`;
        else if (queryParams.get('deviceId')) hrefWithQuery += `?deviceId=${queryParams.get('deviceId')}`;
    } else if (segment === 'issue-certificate' && queryParams.get('caId')) {
        hrefWithQuery += `?caId=${queryParams.get('caId')}`;
    }


    if (isLastSegment) {
      breadcrumbItems.push({ label }); 
    } else {
      breadcrumbItems.push({ label, href: hrefWithQuery });
    }
  }
  return breadcrumbItems;
}


const LoadingState = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground w-full p-6 text-center">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-6 text-lg text-muted-foreground">
        Loading authentication status...
      </p>
    </div>
);

const MainLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, login, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams(); 

  const breadcrumbItems = generateBreadcrumbs(pathname, searchParams);
  let userRoles: string[] = [];
  if (isAuthenticated() && user?.access_token) {
    try {
      const decodedToken = jwtDecode<DecodedAccessToken>(user.access_token);
      if (decodedToken.realm_access && Array.isArray(decodedToken.realm_access.roles)) {
        userRoles = decodedToken.realm_access.roles;
      }
    } catch (error) {
      console.error("Error decoding access token:", error);
    }
  }

  const homeItem = { href: '/', label: 'Home', icon: HomeIcon };
  const kmsItems = [
    { href: '/kms/keys', label: 'Keys', icon: KeyRound },
    { href: '/crypto-engines', label: 'Crypto Engines', icon: Cpu },
  ];
  const pkiItems = [
    { href: '/certificates', label: 'Certificates', icon: FileText },
    { href: '/certificate-authorities', label: 'Certificate Authorities', icon: Landmark },
    { href: '/signing-profiles', label: 'Signing Profiles', icon: ScrollTextIcon },
    { href: '/registration-authorities', label: 'Registration Authorities', icon: Users },
    { href: '/verification-authorities', label: 'Verification Authorities', icon: ShieldCheck },
  ];
  const iotItems = [
    { href: '/devices', label: 'Devices', icon: Router },
    { href: '/device-groups', label: 'Device Groups', icon: ServerCog },
  ];

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col h-screen bg-background text-foreground w-full">
        <header className="flex h-12 items-center justify-between border-b border-primary-foreground/30 bg-primary text-primary-foreground px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground" />
             <Image
              src={Logo}
              height={30}
              alt="LamassuIoT Logo"
            />
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated() && user?.profile?.name && (
              <div className="flex items-center gap-2">
                <span className="text-sm hidden sm:inline">Welcome, {user.profile.name}</span>
                {userRoles.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    {userRoles.map((role: string, index: number) => (
                      <Badge
                        key={index}
                        variant="default"
                        className="text-xs font-normal px-1.5 py-0.5 border-primary text-black bg-primary-foreground hover:bg-primary-foreground/80"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isAuthenticated() ? (
              <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={login} className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
                <LogIn className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Login</span>
              </Button>
            )}
          </div>
        </header>

        {isAuthenticated() ? (
          <div className="flex flex-1 overflow-hidden">
            <Sidebar collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
              <SidebarHeader className="p-4">
                <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                  <Shield className="h-8 w-8 text-primary flex-shrink-0" />
                  <h2 className="font-headline text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                    LamassuIoT
                  </h2>
                </div>
              </SidebarHeader>
              <SidebarContent className="p-2">
                <SidebarMenu>
                  <SidebarMenuItem key={homeItem.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === homeItem.href}
                      tooltip={{children: homeItem.label, side: 'right', align: 'center' }}
                    >
                      <Link href={homeItem.href} className="flex items-center w-full justify-start">
                        <homeItem.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap">{homeItem.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarGroupLabel className="px-2 pt-2 group-data-[collapsible=icon]:pt-0">KMS</SidebarGroupLabel>
                  {kmsItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{children: item.label, side: 'right', align: 'center' }}
                      >
                        <Link href={item.href} className="flex items-center w-full justify-start">
                          <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  <SidebarGroupLabel className="px-2 pt-2 group-data-[collapsible=icon]:pt-0">PKI</SidebarGroupLabel>
                  {pkiItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{children: item.label, side: 'right', align: 'center' }}
                      >
                        <Link href={item.href} className="flex items-center w-full justify-start">
                          <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  <SidebarGroupLabel className="px-2 pt-2 group-data-[collapsible=icon]:pt-0">IoT</SidebarGroupLabel>
                  {iotItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{children: item.label, side: 'right', align: 'center' }}
                      >
                        <Link href={item.href} className="flex items-center w-full justify-start">
                          <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
                <CustomSidebarToggle />
                <div className="group-data-[collapsible=icon]:hidden w-full">
                    <ThemeToggle />
                </div>
                <div className="hidden group-data-[collapsible=icon]:flex justify-center w-full">
                    <ThemeToggle />
                </div>
              </SidebarFooter>
            </Sidebar>

            <SidebarInset className="flex-1 overflow-y-auto p-4 md:p-6">
              {breadcrumbItems.length > 1 && <Breadcrumbs items={breadcrumbItems} />}
              {children}
            </SidebarInset>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <ShieldCheck className="h-16 w-16 text-primary mb-6" />
            <h1 className="text-3xl font-bold mb-3">Welcome to LamassuIoT</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
              Securely manage your X.509 certificates and IoT device identities. Please log in to access the dashboard.
            </p>
            <Button onClick={login} size="lg" className="px-8 py-6 text-lg">
              <LogIn className="mr-2 h-5 w-5" /> Login with Lamassu Identity
            </Button>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
};


const InnerLayout = ({ children }: { children: React.ReactNode }) => {
  const { isLoading: authIsLoading } = useAuth();
  const [clientMounted, setClientMounted] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams(); 

  React.useEffect(() => {
    setClientMounted(true);
  }, []);

  const isCallbackPage =
    pathname === '/signin-callback' ||
    pathname === '/silent-renew-callback' ||
    pathname === '/signout-callback';

  if (isCallbackPage) {
    return <>{children}</>; 
  }

  if (!clientMounted || authIsLoading) {
    return <LoadingState />;
  }

  return <MainLayoutContent>{children}</MainLayoutContent>;
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LamassuIoT Certificate Manager</title>
        <meta name="description" content="Manage and verify your X.509 certificates with LamassuIoT." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <React.Suspense fallback={<LoadingState />}>
            <InnerLayout>{children}</InnerLayout>
          </React.Suspense>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

function CustomSidebarToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      className="w-full flex items-center group-data-[collapsible=icon]:justify-center mb-2"
      tooltip={{ children: open ? "Collapse sidebar" : "Expand sidebar", side: 'right', align: 'center' }}
    >
      {open ? <ChevronsLeft /> : <ChevronsRight />}
      <span className="ml-2 group-data-[collapsible=icon]:hidden whitespace-nowrap">{open ? "Collapse" : ""}</span>
    </SidebarMenuButton>
  );
}
