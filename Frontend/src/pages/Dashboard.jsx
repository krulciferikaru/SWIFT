import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import subscriberApi from "../api/subscribers";
import paymentsApi from "../api/payments";
import api from "../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users2,
  ClipboardCheck,
  Wifi,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Wallet,
  CircleCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const STATUS_COLORS = {
  Active: "#305CDE",
  Unpaid: "#f59e0b",
  Disconnected: "#9ca3af",
};

function daysAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [pendingList, setPendingList] = useState([]);
  const [unpaidList, setUnpaidList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimsList, setClaimsList] = useState([]);
  const [myBilling, setMyBilling] = useState(null);
  const [myPayments, setMyPayments] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const isStaff = user?.role === "admin" || user?.role === "secretary";
  const totalPendingApprovals = (summary?.pending ?? 0) + claimsList.length

  const oldestClaimDays =
    claimsList.length > 0 
      ? Math.max(...claimsList.map((c) => daysAgo(c.created_at)))
      : 0;

  useEffect(() => {
    if (isStaff) return;
    Promise.all([paymentsApi.getMyBilling(), paymentsApi.getMyPayments()])
      .then(([billingRes, paymentsRes]) => {
        setMyBilling(billingRes.data.data);
        setMyPayments(paymentsRes.data.data);
      })
      .catch(() => {})
      .finally(() => setMyLoading(false));
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    Promise.all([
      subscriberApi.getSummary(),
      api.get("/subscribers/pending"),
      subscriberApi.getAll({ status: "Unpaid", per_page: 5 }),
      api.get("/subscribers/pending-claims"),
    ])
      .then(([summaryRes, pendingRes, unpaidRes, claimsRes]) => {
        setSummary(summaryRes.data.data);
        setPendingList(pendingRes.data ?? []);
        const unpaidData = unpaidRes.data.data;
        setUnpaidList(
          Array.isArray(unpaidData) ? unpaidData : (unpaidData?.data ?? []),
        );
        setClaimsList(claimsRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isStaff]);

  const chartData = summary
    ? [
        { name: "Active", value: summary.active },
        { name: "Unpaid", value: summary.unpaid },
        { name: "Disconnected", value: summary.disconnected },
      ].filter((d) => d.value > 0)
    : [];

  const oldestPendingDays =
    pendingList.length > 0
      ? Math.max(...pendingList.map((p) => daysAgo(p.created_at)))
      : 0;

  const needsAttention =
    summary?.pending > 0 || summary?.unpaid > 0 || claimsList.length > 0;

  if (!isStaff) {
    if (myLoading) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      );
    }

    if (!myBilling) {
      return (
        <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
          No subscriber account is linked to your login yet. Please contact
          staff.
        </div>
      );
    }

    const statusColor =
      myBilling.months_behind === 0
        ? "text-green-600 dark:text-green-400"
        : myBilling.months_behind <= 2
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Account
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.name}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="size-5 text-primary" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Monthly Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                ₱
                {myBilling.monthly_rate.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="size-5 text-amber-500" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Current Balance
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${myBilling.balance > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
              >
                ₱
                {myBilling.balance.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })}
              </p>
              {myBilling.advance_credit > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  + ₱
                  {myBilling.advance_credit.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  advance credit
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CircleCheck className={`size-5 ${statusColor}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Months Behind
              </p>
              <p className={`text-2xl font-bold mt-1 ${statusColor}`}>
                {myBilling.months_behind}
              </p>
            </CardContent>
          </Card>
        </div>

        {myBilling.balance > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded text-sm text-amber-800 dark:text-amber-400">
            You have an outstanding balance. Please settle your payment to avoid
            service interruption.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {myBilling.months.map((m) => (
              <div
                key={m.label}
                className={`flex items-center justify-between px-3 py-2 rounded-md ${
                  m.status !== "paid" ? "bg-red-50 dark:bg-red-950/30" : ""
                }`}
              >
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {m.label}
                </span>
                <Badge
                  variant="outline"
                  className={
                    m.status === "paid"
                      ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 capitalize"
                      : m.status === "partial"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 capitalize"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 capitalize"
                  }
                >
                  {m.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {myPayments.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No payments recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {myPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(p.payment_date).toLocaleDateString()} ·{" "}
                      {p.or_number} · {p.payment_method}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      ₱
                      {Number(p.amount).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <Skeleton className="h-55 w-full rounded-full mx-auto max-w-55" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
        Unable to load dashboard data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Jubal Brothers Cable TV Corporation — Palayan Branch
          </p>
        </div>
      </div>

      {/* Needs Attention — decision-oriented, not just descriptive */}
      {needsAttention && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.pending > 0 && (
              <Link
                to="/approvals"
                className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {summary.pending} application
                    {summary.pending === 1 ? "" : "s"} awaiting approval
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {oldestPendingDays > 0
                      ? `Oldest submitted ${oldestPendingDays} day${oldestPendingDays === 1 ? "" : "s"} ago`
                      : "Submitted today"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </Link>
            )}

            {summary.unpaid > 0 && (
              <Link
                to="/subscribers"
                className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {summary.unpaid} subscriber{summary.unpaid === 1 ? "" : "s"}{" "}
                    marked Unpaid
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {unpaidList.length > 0
                      ? unpaidList
                          .slice(0, 2)
                          .map((s) => s.name)
                          .join(", ") + (summary.unpaid > 2 ? ", …" : "")
                      : "Review status and follow up"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </Link>
            )}

            {claimsList.length > 0 && (
              <Link
                to="/approvals"
                state={{ tab: "claims" }}
                className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900 hover:border-amber-400 dark:hover:border-amber-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {claimsList.length} account claim
                    {claimsList.length === 1 ? "" : "s"} awaiting verification
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {oldestClaimDays > 0
                      ? `Oldest submitted ${oldestClaimDays} day${oldestClaimDays === 1 ? "" : "s"} ago`
                      : "Submitted today"}
                  </p>
                </div>
                <ArrowRight className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/subscribers">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users2 className="size-5 text-primary" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total Subscribers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {summary.total}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/approvals">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <ClipboardCheck className="size-5 text-amber-500" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Pending Approvals
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {totalPendingApprovals}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Active
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {summary.active}
            </p>
          </CardContent>
        </Card>

        <Link to="/subscribers">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Wifi className="size-5 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Unpaid
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {summary.unpaid}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status breakdown + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Subscriber Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              asChild
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <Link to="/subscribers">
                <div className="text-left">
                  <p className="font-medium">Manage Subscribers</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    View, add, or edit subscriber records
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <Link to="/approvals">
                <div className="text-left">
                  <p className="font-medium">Review Approvals</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    {summary.pending > 0
                      ? `${summary.pending} application${summary.pending === 1 ? "" : "s"} waiting`
                      : "No pending applications"}
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-start h-auto py-4"
            >
              <Link to="/plans">
                <div className="text-left">
                  <p className="font-medium">Service Plans</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    Manage available plans and pricing
                  </p>
                </div>
              </Link>
            </Button>
            {user?.role === "admin" && (
              <Button
                asChild
                variant="outline"
                className="justify-start h-auto py-4"
              >
                <Link to="/users">
                  <div className="text-left">
                    <p className="font-medium">Manage Roles</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                      Control staff account access
                    </p>
                  </div>
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
        FUTURE ENHANCEMENT (requires a Payments table + PaymentController):
        - Days-since-last-payment / aging balance per subscriber
        - Revenue trend (this month vs. last month)
        - Churn risk signals (e.g. Unpaid for N+ days without resolution)
        These need real billing history data that doesn't exist in the schema yet.
        Worth raising with your adviser as the next dashboard iteration once
        the Payments feature is built.
      */}
    </div>
  );
}
