import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useApprovals } from "../context/ApprovalContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard,
  Users2,
  ClipboardCheck,
  FileText,
  Wifi,
  ShieldCheck,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItemsByRole = {
  admin: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Subscribers", path: "/subscribers", icon: Users2 },
    {
      label: "Pending Approvals",
      path: "/approvals",
      icon: ClipboardCheck,
      showBadge: true,
    },
    { label: "Service Plans", path: "/plans", icon: Wifi },
    { label: "Payments", path: "/payments", icon: Wallet },
    { label: "Reports", path: "/reports", icon: FileText },
    { label: "Manage Roles", path: "/users", icon: ShieldCheck },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
    { label: "Guide", path: "/guide", icon: HelpCircle },
  ],
  secretary: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Subscribers", path: "/subscribers", icon: Users2 },
    {
      label: "Pending Approvals",
      path: "/approvals",
      icon: ClipboardCheck,
      showBadge: true,
    },
    { label: "Service Plans", path: "/plans", icon: Wifi },
    { label: "Payments", path: "/payments", icon: Wallet },
    { label: "Reports", path: "/reports", icon: FileText },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
    { label: "Guide", path: "/guide", icon: HelpCircle },
  ],
  subscriber: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
    { label: "Guide", path: "/guide", icon: HelpCircle },
  ],
};

export default function Sidebar({ open: pinned, onToggle }) {
  const [hovered, setHovered] = useState(false);
  // While collapsed, hovering expands the sidebar temporarily as an overlay.
  const open = pinned || hovered;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pendingCount, refreshPendingCount, claimsCount, refreshClaimsCount } =
    useApprovals();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const [tooltip, setTooltip] = useState(null); // { label, top }
  const asideRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const navItems = navItemsByRole[user?.role] || [];
  const canSeeApprovals = user?.role === "admin" || user?.role === "secretary";
  const totalApprovalsCount = pendingCount + claimsCount;

  useEffect(() => {
    if (canSeeApprovals) {
      refreshPendingCount();
      refreshClaimsCount();
    }
  }, [canSeeApprovals, refreshPendingCount, refreshClaimsCount]);

  const showTooltip = (e, label) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  };
  const hideTooltip = () => setTooltip(null);

  const requestLogout = () => {
    const skip = localStorage.getItem("skipLogoutConfirm") === "true";
    if (skip) {
      handleLogout();
    } else {
      setShowLogoutConfirm(true);
    }
  };

  const handleLogout = async () => {
    if (skipNextTime) {
      localStorage.setItem("skipLogoutConfirm", "true");
    }
    setShowLogoutConfirm(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
    <aside
      ref={asideRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        hideTooltip();
      }}
      className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${open ? "w-60" : "w-16"} ${hovered && !pinned ? "shadow-xl" : ""}
`}
    >
      <div
        className={`p-4 text-lg font-semibold border-b border-gray-200 dark:border-gray-800 flex items-center ${open ? "justify-between" : "justify-center"}`}
      >
        {open ? (
          <>
            {/* Logo - plain, no toggle behavior when expanded */}
            <div className="flex items-center gap-2">
              <img src="/SWIFT_Logo.svg" alt="SWIFT" className="size-6" />
              <span className="text-primary">SWIFT</span>
            </div>

            {/* Toggle - separate button beside the logo */}
            <button
              onClick={onToggle}
              onMouseEnter={(e) =>
                showTooltip(e, pinned ? "Close sidebar" : "Keep sidebar open")
              }
              onMouseLeave={hideTooltip}
              aria-label={pinned ? "Collapse sidebar" : "Keep sidebar open"}
              className="flex items-center justify-center size-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {pinned ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
            </button>
          </>
        ) : (
          /* Collapsed: logo and toggle share one spot, swap on hover */
          <button
            onClick={onToggle}
            onMouseEnter={(e) => showTooltip(e, "Open sidebar")}
            onMouseLeave={hideTooltip}
            aria-label="Expand sidebar"
            className="group relative flex items-center justify-center size-9 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            <span className="flex items-center transition-opacity duration-150 group-hover:opacity-0">
              <img src="/SWIFT_Logo.svg" alt="SWIFT" className="size-6" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <PanelLeftOpen className="size-4" />
            </span>
          </button>
        )}
      </div>

      <nav
        data-tour="nav"
        className={`flex-1 p-2 space-y-1 flex flex-col ${!open ? "items-center" : ""}`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-tour={`nav-${item.path.slice(1)}`}
              onMouseEnter={(e) => showTooltip(e, item.label)}
              onMouseLeave={hideTooltip}
              className={`relative flex items-center rounded-md text-sm transition-colors ${
                open
                  ? "justify-between px-3 py-2 w-full"
                  : "justify-center size-9"
              } ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : open
                    ? "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                    : "text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
            >
              <span className={`flex items-center ${open ? "gap-2.5" : ""}`}>
                <Icon className="size-4 shrink-0" />
                {open && item.label}
              </span>
              {open && item.showBadge && totalApprovalsCount > 0 && (
                <Badge
                  variant="outline"
                  className={`h-5 px-1.5 text-xs ${
                    isActive
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {totalApprovalsCount}
                </Badge>
              )}
              {!open && item.showBadge && pendingCount > 0 && (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={`${!open ? "px-2 py-3" : "p-4"} space-y-3 flex flex-col ${!open ? "items-center" : ""}`}
      >
        <Button
          variant="outline"
          size="icon"
          data-tour="theme-toggle"
          onClick={toggleTheme}
          onMouseEnter={(e) =>
            showTooltip(
              e,
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
            )
          }
          onMouseLeave={hideTooltip}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        <div className="border-t border-gray-200 dark:border-gray-800 w-full" />

        {open && user && (
          <div className="text-xs w-full">
            <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
              {user.name}
            </p>
            <p className="text-gray-500 dark:text-gray-400 capitalize">
              {user.role}
            </p>
          </div>
        )}

        <Button
          onClick={requestLogout}
          onMouseEnter={(e) => showTooltip(e, "Logout")}
          onMouseLeave={hideTooltip}
          variant="destructive"
          className={open ? "w-full justify-start gap-2" : "size-9"}
          size={open ? "default" : "icon"}
        >
          <LogOut className="size-4" />
          {open && "Logout"}
        </Button>
      </div>

      {/* Floating tooltip - positioned relative to viewport so it's never clipped
          by the sidebar's overflow-y-auto */}
      {tooltip &&
        createPortal(
          <div
            className="fixed z-9999 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-white dark:text-gray-900 shadow-lg pointer-events-none"
            style={{ left: open ? 248 : 72, top: tooltip.top }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="skip-logout-confirm"
              checked={skipNextTime}
              onCheckedChange={setSkipNextTime}
            />
            <label
              htmlFor="skip-logout-confirm"
              className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              Don't ask me again
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>

    {/* Phones: top bar with a dropdown menu instead of the side panel */}
    <header className="md:hidden fixed inset-x-0 top-0 z-40 h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800">
      <Link to="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
        <img src="/SWIFT_Logo.svg" alt="" className="size-6" />
        <span className="text-primary">SWIFT</span>
      </Link>
      <div className="flex items-center gap-1">
        {canSeeApprovals && totalApprovalsCount > 0 && !mobileOpen && (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
          >
            {totalApprovalsCount}
          </Badge>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          data-tour="mobile-menu"
          className="flex items-center justify-center size-10 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
    </header>

    {mobileOpen && (
      <div className="md:hidden fixed inset-0 top-14 z-30">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <nav
          id="mobile-menu"
          aria-label="Main menu"
          className="absolute inset-x-0 top-0 max-h-full overflow-y-auto bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 shadow-lg p-2"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-md px-3 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </span>
                {item.showBadge && totalApprovalsCount > 0 && (
                  <Badge
                    variant="outline"
                    className={`h-5 px-1.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {totalApprovalsCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>

          {user && (
            <div className="px-3 py-2 text-xs">
              <p className="font-medium truncate">{user.name}</p>
              <p className="text-gray-500 dark:text-gray-400 capitalize">
                {user.role}
              </p>
            </div>
          )}

          <Button
            onClick={() => {
              setMobileOpen(false);
              requestLogout();
            }}
            variant="destructive"
            className="w-full justify-start gap-2 mt-1"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </nav>
      </div>
    )}
    </>
  );
}
