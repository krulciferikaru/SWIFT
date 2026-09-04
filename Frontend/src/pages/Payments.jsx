import { useState, useEffect, useCallback, useMemo } from "react";
import subscriberApi from "../api/subscribers";
import paymentsApi from "../api/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "../hooks/useToast";
import { Search, CheckCircle2, Check } from "lucide-react";
import { useLocation } from "react-router-dom";

const STATUS_BADGE_STYLES = {
  Active:
    "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
  Unpaid:
    "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  Disconnected:
    "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
};

const EMPTY_FORM = {
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  or_number: "",
  payment_method: "Cash",
  notes: "",
};

const currentMonthLabel = () =>
  new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

// Walks unpaid/partial months in order and describes what an entered amount would cover.
function describeCoverage(months, amount) {
  const amt = Number(amount);
  if (!months?.length || !amt || amt <= 0) return null;

  let remaining = amt;
  const covered = [];
  for (const m of months) {
    if (m.status === "paid") continue;
    const stillOwed = m.due - m.applied;
    if (stillOwed <= 0) continue;
    if (remaining <= 0) break;

    if (remaining >= stillOwed) {
      covered.push({ label: m.label, full: true });
      remaining -= stillOwed;
    } else {
      covered.push({ label: m.label, full: false });
      remaining = 0;
    }
  }

  if (covered.length === 0) return null;
  const parts = covered.map((c) => (c.full ? c.label : `${c.label} (partial)`));
  const leftover =
    remaining > 0
      ? ` — ₱${remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })} left as credit`
      : "";
  return `This will cover: ${parts.join(", ")}${leftover}`;
}

export default function Payments() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const [billing, setBilling] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [showReconnectConfirm, setShowReconnectConfirm] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const { toast, showToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.subscriber) {
      selectSubscriber(location.state.subscriber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }
    setSearching(true);
    subscriberApi
      .getAll({ search, per_page: 8 })
      .then((res) => {
        const responseData = res.data.data;
        const list = Array.isArray(responseData)
          ? responseData
          : (responseData?.data ?? []);
        setResults(list);
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [search]);

  useEffect(() => {
    setLoading(false)
  }, [])

  const loadDetail = useCallback(
    async (subscriber) => {
      setLoadingDetail(true);
      setBilling(null);
      setHistory([]);
      try {
        const [billingRes, historyRes] = await Promise.all([
          paymentsApi.getBilling(subscriber.subscriber_id),
          paymentsApi.getHistory(subscriber.subscriber_id),
        ]);
        setBilling(billingRes.data.data);
        setHistory(historyRes.data.data);
      } catch {
        showToast("Failed to load billing details.", "error");
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  const selectSubscriber = (subscriber) => {
    setSelected(subscriber);
    setForm(EMPTY_FORM);
    setErrors({});
    loadDetail(subscriber);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const coveragePreview = useMemo(
    () => describeCoverage(billing?.months, form.amount),
    [billing, form.amount],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const res = await paymentsApi.create(selected.subscriber_id, form);
      setBilling(res.data.data.billing);
      setForm(EMPTY_FORM);
      showToast("Payment recorded.");
      const historyRes = await paymentsApi.getHistory(selected.subscriber_id);
      setHistory(historyRes.data.data);
      const fresh = await subscriberApi.getAll({
        search: selected.email,
        per_page: 1,
      });
      const freshData = fresh.data.data;
      const freshList = Array.isArray(freshData)
        ? freshData
        : (freshData?.data ?? []);
      if (freshList[0]) setSelected(freshList[0]);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        showToast(
          err.response?.data?.message || "Failed to record payment.",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmReconnect = async () => {
    setReconnecting(true);
    try {
      await subscriberApi.updateStatus(selected.subscriber_id, "Active");
      setSelected({ ...selected, status: "Active" });
      showToast(`${selected.name} reconnected.`);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to reconnect subscriber.",
        "error",
      );
    } finally {
      setReconnecting(false);
      setShowReconnectConfirm(false);
    }
  };

  const canReconnect =
    selected?.status === "Disconnected" && billing?.months_behind === 0;
  const thisMonth = currentMonthLabel();

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${toast.type === "error" ? "bg-red-500" : "bg-green-500"
            }`}
        >
          {toast.message}
        </div>
      )}

      {loading ? (
        <>
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Payments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Search for a subscriber to view their balance and record a payment.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or MAC address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {search && (
                <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : results.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400 dark:text-gray-500">
                      No subscribers found.
                    </p>
                  ) : (
                    results.map((s) => (
                      <button
                        key={s.subscriber_id}
                        onClick={() => selectSubscriber(s)}
                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {s.email}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {selected && (
        <>
          {/* Subscriber header — balance now lives here, not buried below */}
          <Card>
            <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selected.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selected.plan?.plan_name ?? "No plan assigned"} ·{" "}
                  {selected.email}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${STATUS_BADGE_STYLES[selected.status]}`}
                >
                  {selected.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                {billing && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Balance due
                    </p>
                    <p
                      className={`text-2xl font-bold ${billing.balance > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}
                    >
                      ₱
                      {billing.balance.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    {billing.advance_credit > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        + ₱
                        {billing.advance_credit.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        advance credit
                      </p>
                    )}
                  </div>
                )}
                {canReconnect && (
                  <Button
                    size="sm"
                    onClick={() => setShowReconnectConfirm(true)}
                  >
                    Reconnect Subscriber
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {loadingDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-8 w-full" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Breakdown + history side-by-side, so "did they already pay?" doesn't require scrolling */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Billing Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                    {billing?.months.map((m) => {
                      const isCurrent = m.label === thisMonth;
                      const isUnpaid = m.status !== "paid";
                      return (
                        <div
                          key={m.label}
                          className={`flex items-center justify-between px-3 py-2 rounded-md ${isCurrent
                            ? "ring-2 ring-blue-400 dark:ring-blue-600 bg-amber-50 dark:bg-amber-950/40"
                            : isUnpaid
                              ? "bg-red-50 dark:bg-red-950/30"
                              : ""
                            }`}
                        >
                          <span className="text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {m.label}
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                                current
                              </span>
                            )}
                          </span>
                          <span
                            className={`text-xs ${isUnpaid ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
                          >
                            ₱
                            {(m.due - m.applied).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {isUnpaid ? "unpaid" : "paid"}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        No payments recorded yet.
                      </p>
                    ) : (
                      history.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-500 dark:text-gray-400">
                            {new Date(p.payment_date).toLocaleDateString()} ·{" "}
                            {p.or_number}
                          </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            ₱
                            {Number(p.amount).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Record payment form, with live coverage preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount">
                          Amount<span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          value={form.amount}
                          onChange={handleChange}
                          required
                          className={errors.amount ? "border-red-400" : ""}
                        />
                        {errors.amount && (
                          <p className="text-red-500 text-xs">
                            {errors.amount[0]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="or_number">
                          OR Number
                          <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input
                          id="or_number"
                          name="or_number"
                          value={form.or_number}
                          onChange={handleChange}
                          required
                          placeholder="e.g. 41001"
                          className={errors.or_number ? "border-red-400" : ""}
                        />
                        {errors.or_number && (
                          <p className="text-red-500 text-xs">
                            {errors.or_number[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {coveragePreview && (
                      <div className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded text-sm text-green-700 dark:text-green-400">
                        <Check className="size-4 mt-0.5 shrink-0" />
                        <span>{coveragePreview}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="payment_date">
                          Payment Date
                          <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input
                          id="payment_date"
                          name="payment_date"
                          type="date"
                          value={form.payment_date}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Payment Method</Label>
                        <Select
                          value={form.payment_method}
                          onValueChange={(v) =>
                            setForm({ ...form, payment_method: v })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="GCash">GCash</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Optional"
                      />
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      {saving ? "Recording..." : "Record Payment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      <AlertDialog
        open={showReconnectConfirm}
        onOpenChange={setShowReconnectConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
              Reconnect this subscriber?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected && (
                <>
                  <strong>{selected.name}</strong> has fully paid off their
                  balance. Confirm that the physical reconnection has been
                  completed before marking their status as Active.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? "Reconnecting..." : "Confirm Reconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
