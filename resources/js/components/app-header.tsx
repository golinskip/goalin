import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Gift, LayoutGrid, Menu, Target, Zap } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as activitiesIndex } from '@/routes/activities';
import { index as goalsIndex } from '@/routes/goals';
import { index as rewardsIndex } from '@/routes/rewards';
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const manageNavItems: NavItem[] = [
    {
        title: 'Goals',
        href: goalsIndex(),
        icon: Target,
    },
    {
        title: 'Activities',
        href: activitiesIndex(),
        icon: Zap,
    },
    {
        title: 'Rewards',
        href: rewardsIndex(),
        icon: Gift,
    },
];

const activeItemStyles =
    'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();

    const isManageActive = manageNavItems.some((item) =>
        isCurrentUrl(item.href, undefined, true),
    );

    return (
        <>
            <div className="border-b border-sidebar-border/80 bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px]"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex h-full w-64 flex-col items-stretch justify-between bg-sidebar"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation menu
                                </SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <div className="flex items-center gap-2">
                                        <AppLogoIcon className="size-6 text-primary" />
                                        <span className="font-semibold">Goalin</span>
                                    </div>
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col space-y-4 p-4">
                                    <div className="flex flex-col space-y-4 text-sm">
                                        <Link
                                            href={dashboard()}
                                            className="flex items-center space-x-2 font-medium"
                                        >
                                            <LayoutGrid className="h-5 w-5" />
                                            <span>Dashboard</span>
                                        </Link>

                                        <div className="pt-2">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                Manage
                                            </p>
                                            <div className="flex flex-col space-y-4">
                                                {manageNavItems.map((item) => (
                                                    <Link
                                                        key={item.title}
                                                        href={item.href}
                                                        className="flex items-center space-x-2 font-medium"
                                                    >
                                                        {item.icon && (
                                                            <item.icon className="h-5 w-5" />
                                                        )}
                                                        <span>{item.title}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex items-center gap-2"
                    >
                        <AppLogoIcon className="size-8 text-primary" />
                        <span className="text-lg font-semibold">Goalin</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch space-x-2">
                                <NavigationMenuItem className="relative flex h-full items-center">
                                    <Link
                                        href={dashboard()}
                                        className={cn(
                                            navigationMenuTriggerStyle(),
                                            whenCurrentUrl(
                                                dashboard(),
                                                activeItemStyles,
                                            ),
                                            'h-9 cursor-pointer px-3',
                                        )}
                                    >
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        Dashboard
                                    </Link>
                                    {isCurrentUrl(dashboard()) && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-primary"></div>
                                    )}
                                </NavigationMenuItem>

                                <NavigationMenuItem className="relative flex h-full items-center">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                isManageActive && activeItemStyles,
                                                'h-9 cursor-pointer gap-1 px-3',
                                            )}
                                        >
                                            Manage
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-48">
                                            {manageNavItems.map((item) => (
                                                <DropdownMenuItem key={item.title} asChild>
                                                    <Link
                                                        href={item.href}
                                                        className="flex items-center gap-2"
                                                    >
                                                        {item.icon && (
                                                            <item.icon className="h-4 w-4" />
                                                        )}
                                                        {item.title}
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {isManageActive && (
                                        <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-primary"></div>
                                    )}
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center space-x-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user.avatar}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-sidebar-border/70">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-muted-foreground md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
