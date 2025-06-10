
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield, FileText, Users, Landmark, ShieldCheck, Home as HomeIcon, LayoutDashboard } from 'lucide-react'; // Added HomeIcon, LayoutDashboard
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: HomeIcon }, // Added Home
    { href: '/dashboard/certificates', label: 'Certificates', icon: FileText },
    { href: '/dashboard/certificate-authorities', label: 'Certificate Authorities', icon: Landmark },
    { href: '/dashboard/registration-authorities', label: 'Registration Authorities', icon: Users },
    { href: '/dashboard/verification-authorities', label: 'Verification Authorities', icon: ShieldCheck },
  ];

  // Determine the active section label for the header
  let activeLabel = 'Dashboard'; // Default label
  const currentRootPath = pathname.split('/').slice(0, 3).join('/'); // e.g., /dashboard/certificates

  const activeItem = navItems.find(item => 
    item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );
  if (activeItem) {
    activeLabel = activeItem.label;
  } else if (pathname === '/dashboard') { // Explicitly set for /dashboard if not matched by exact href
    const homeItem = navItems.find(item => item.href === '/dashboard');
    if (homeItem) activeLabel = homeItem.label;
  }


  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background text-foreground w-full">
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href.length > '/dashboard'.length)}
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
             <div className="group-data-[collapsible=icon]:hidden w-full">
                <ThemeToggle />
             </div>
             <div className="hidden group-data-[collapsible=icon]:flex justify-center w-full">
                <ThemeToggle />
             </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-primary-foreground/30 bg-primary text-primary-foreground px-4 md:px-6">
            <div> 
              <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10 focus-visible:ring-primary-foreground/50" />
            </div>
            <div className="flex-1 text-left ml-2 md:ml-4"> 
              <h1 className="text-xl font-semibold">
                {activeLabel}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
