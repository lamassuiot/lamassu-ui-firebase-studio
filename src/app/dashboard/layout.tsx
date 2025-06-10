
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
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield, FileText, Users, Landmark, ShieldCheck, HomeIcon, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function CustomSidebarToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      className="w-full flex items-center group-data-[collapsible=icon]:justify-center mb-2"
      tooltip={{ children: open ? "Collapse sidebar" : "Expand sidebar", side: 'right', align: 'center' }}
    >
      {open ? <ChevronsLeft /> : <ChevronsRight />}
      <span className="ml-2 group-data-[collapsible=icon]:hidden">{open ? "Collapse" : ""}</span>
    </SidebarMenuButton>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: HomeIcon },
    { href: '/dashboard/certificates', label: 'Certificates', icon: FileText },
    { href: '/dashboard/certificate-authorities', label: 'Certificate Authorities', icon: Landmark },
    { href: '/dashboard/registration-authorities', label: 'Registration Authorities', icon: Users },
    { href: '/dashboard/verification-authorities', label: 'Verification Authorities', icon: ShieldCheck },
  ];

  let activeLabel = 'Dashboard';
  const activeItem = navItems.find(item => 
    item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  );
  if (activeItem) {
    activeLabel = activeItem.label;
  } else if (pathname === '/dashboard') {
    const homeItem = navItems.find(item => item.href === '/dashboard');
    if (homeItem) activeLabel = homeItem.label;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex flex-col h-screen bg-background text-foreground w-full">
        <header className="flex h-14 items-center justify-between border-b border-primary-foreground/30 bg-primary text-primary-foreground px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center">
            {/* App Icon/Name could go here if needed, for now title starts */}
            <h1 className="text-xl font-semibold ml-2 md:ml-0">{activeLabel}</h1>
          </div>
          {/* Placeholder for other header actions like user menu */}
          <div></div>
        </header>

        <div className="flex flex-1 overflow-hidden"> {/* Container for sidebar and main content */}
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
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
