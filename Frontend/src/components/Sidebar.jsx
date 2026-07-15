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
  Wifi,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Wallet,
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
    { label: "Manage Roles", path: "/users", icon: ShieldCheck },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
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
    { label: "Settings", path: "/settings", icon: SettingsIcon },
  ],
  subscriber: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
  ],
};

export default function Sidebar({ open, onToggle }) {
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
    <aside
      ref={asideRef}
      className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${open ? "w-60" : "w-16"}
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
              onMouseEnter={(e) => showTooltip(e, "Close sidebar")}
              onMouseLeave={hideTooltip}
              aria-label="Collapse sidebar"
              className="flex items-center justify-center size-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              <PanelLeftClose className="size-4" />
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
        className={`flex-1 p-2 space-y-1 flex flex-col ${!open ? "items-center" : ""}`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
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
  );
}
