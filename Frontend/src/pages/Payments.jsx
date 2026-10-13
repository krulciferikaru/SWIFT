import { useState, useEffect, useCallback, useMemo } from "react";
import subscriberApi from "../api/subscribers";
import { useAuth } from "../context/AuthContext";
import paymentsApi from "../api/payments";
import PaymentHistory from "../components/PaymentHistory.jsx";
import { errorMessage } from "../utils/errors";
import { CardListSkeleton, LoadingStatus } from "../components/Skeletons.jsx";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
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
import { Search, CheckCircle2, Check, ChevronRight, Wallet } from "lucide-react";
import { useLocation } from "react-router-dom";
import TourButton from "../components/TourButton.jsx";
import { useTourActive } from "../tour/tourState";
import { PaymentSample } from "../components/TourSamples.jsx";
import Toast from "../components/Toast.jsx";
import ReviewDialog from "../components/ReviewDialog.jsx";
import FormField, { RequiredNote } from "../components/FormField.jsx";
import { required, positiveAmount, firstError } from "../utils/validators";
import { spelledDate } from "../utils/text";
import { Clock } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import VoidPaymentDialog from "../components/VoidPaymentDialog.jsx";

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

// A collector goes from house to house, so the page remembers, on this device only:
//  - the last few people they opened, to pick again with one tap
//  - the payment method they used last
const RECENT_KEY = "swift.recentSubscribers";
const METHOD_KEY = "swift.lastPaymentMethod";
const RECENT_MAX = 5;

const readRecent = () => {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};
const rememberRecent = (subscriber) => {
  try {
    const entry = {
      subscriber_id: subscriber.subscriber_id,
      name: subscriber.name,
      address: subscriber.address,
      contact_number: subscriber.contact_number,
      status: subscriber.status,
      plan: subscriber.plan ? { plan_name: subscriber.plan.plan_name } : null,
    };
    const next = [entry, ...readRecent().filter((r) => r.subscriber_id !== entry.subscriber_id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    return next;
  } catch {
    return readRecent();
  }
};
const lastMethod = () => {
  try {
    return localStorage.getItem(METHOD_KEY) || "";
  } catch {
    return "";
  }
};

const peso = (value) =>
  `₱${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

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
  const { can, user } = useAuth();
  const canCancelPayments = user?.role === "admin" || user?.role === "secretary";
  // The payment being cancelled (administrators and the secretary).
  const [voiding, setVoiding] = useState(null);
  const { methods: paymentMethods } = usePaymentMethods();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const tourActive = useTourActive();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const [billing, setBilling] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Today by the clock on this device (not UTC, which is still yesterday before 8 AM in the Philippines).
  const todayHere = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const freshForm = () => ({ ...EMPTY_FORM, payment_date: todayHere(), payment_method: lastMethod() || EMPTY_FORM.payment_method });
  const [form, setForm] = useState(freshForm);
  const [recent, setRecent] = useState(readRecent);
  // The OR number that probably comes next in this person's receipt book.
  const [orSuggestion, setOrSuggestion] = useState(null);
  const loadOrSuggestion = useCallback(() => {
    if (!can("payments.record")) return;
    paymentsApi
      .nextOrNumber()
      .then((res) => setOrSuggestion(res.data?.data?.suggestion ?? null))
      .catch(() => setOrSuggestion(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the chosen method was renamed or switched off, fall back to the first one on offer.
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.includes(form.payment_method)) {
      setForm((f) => ({ ...f, payment_method: paymentMethods[0] }));
    }
  }, [paymentMethods, form.payment_method]);
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
      } catch (err) {
        showToast(errorMessage(err, "Failed to load billing details."), "error");
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  const selectSubscriber = (subscriber) => {
    setSelected(subscriber);
    setForm(freshForm());
    setErrors({});
    setTouched({});
    setRecent(rememberRecent(subscriber));
    loadOrSuggestion();
    loadDetail(subscriber);
  };

  // A field is only checked once the person has left it, or tried to save.
  const [touched, setTouched] = useState({});
  const localErrors = {
    amount: firstError(form.amount, required("Amount"), positiveAmount),
    or_number: required("OR number")(form.or_number),
    payment_date: required("Payment date")(form.payment_date),
  };
  const fieldError = (name) => errors[name]?.[0] ?? (touched[name] ? localErrors[name] : "");
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors(({ [e.target.name]: _gone, ...rest }) => rest);
  };

  const coveragePreview = useMemo(
    () => describeCoverage(billing?.months, form.amount),
    [billing, form.amount],
  );

  // Pressing Record Payment opens a review first; the payment is only saved on Confirm.
  const [reviewOpen, setReviewOpen] = useState(false);
  const handleSubmit = (e) => {
    e.preventDefault();
    const firstBad = Object.keys(localErrors).find((name) => localErrors[name]);
    if (firstBad) {
      setTouched({ amount: true, or_number: true, payment_date: true });
      document.getElementById(firstBad)?.focus();
      return;
    }
    setErrors({});
    setReviewOpen(true);
  };

  const reviewWarning = (() => {
    const amount = Number(form.amount);
    const balance = Number(billing?.balance ?? 0);
    const rate = Number(billing?.monthly_rate ?? 0);
    // More than two months beyond what is owed is more likely a typing slip than an advance payment.
    if (amount > 0 && rate > 0 && amount - balance > rate * 2) {
      return `This is ${peso(amount - balance)} more than the amount owed (${peso(balance)}) and would be kept as advance credit. Check for an extra digit before confirming.`;
    }
    return "";
  })();

  const recordPayment = async () => {
    setSaving(true);
    try {
      const res = await paymentsApi.create(selected.subscriber_id, form);
      setBilling(res.data.data.billing);
      setForm(freshForm());
      setTouched({});
      loadOrSuggestion(); // the book moves on by one
      showToast("Payment recorded.");
      const historyRes = await paymentsApi.getHistory(selected.subscriber_id);
      setHistory(historyRes.data.data);
      const fresh = await subscriberApi.getOne(selected.subscriber_id);
      if (fresh.data.data) setSelected(fresh.data.data);
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
      setReviewOpen(false);
    }
  };

  // The payment was cancelled: show the new balance, and optionally put its details back in the form.
  const handleVoided = async ({ billing }, { prefill, original }) => {
    setVoiding(null);
    if (billing) setBilling(billing);
    showToast("Payment cancelled. It stays in the history, marked as cancelled.");
    try {
      const historyRes = await paymentsApi.getHistory(selected.subscriber_id);
      setHistory(historyRes.data.data);
      const fresh = await subscriberApi.getOne(selected.subscriber_id);
      if (fresh.data.data) setSelected(fresh.data.data);
    } catch {
      // The numbers will refresh the next time the page loads.
    }
    if (prefill && original) {
      setForm({
        ...freshForm(),
        amount: String(Number(original.amount)),
        payment_date: String(original.payment_date).slice(0, 10),
        or_number: original.or_number,
        payment_method: original.payment_method,
        notes: original.notes ?? "",
      });
      setTouched({});
      setTimeout(() => document.getElementById("amount")?.focus(), 150);
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
      <Toast toast={toast} />

      {loading ? (
        <>
          <div className="space-y-2">
            <h1 className="sr-only">Payments</h1>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Card>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Payments
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search for a subscriber to view their balance and record a payment.
              </p>
            </div>
            <TourButton tour="payments" />
          </div>

          <Card>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  data-tour="payments-search"
                  aria-label="Search subscribers"
                  placeholder="Search by name, mobile number, or MAC address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {!search && recent.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Clock className="size-3.5" aria-hidden="true" />
                    Recently opened
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r.subscriber_id}>
                        <Button type="button" variant="outline" size="sm" onClick={() => selectSubscriber(r)}>
                          {r.name}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {search && (
                <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : results.length === 0 ? (
                    <EmptyState
                      compact
                      title={`No subscriber matches "${search}"`}
                      description="Check the spelling, or search by mobile number or address."
                    />
                  ) : (
                    results.map((s) => (
                      <button
                        key={s.subscriber_id}
                        onClick={() => selectSubscriber(s)}
                        className="group flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {s.name}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            {s.contact_number || s.email}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center text-xs font-medium text-blue-700 dark:text-blue-400">
                          Open billing
                          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tourActive && !selected && <PaymentSample />}

      {selected && (
        <>
          {/* Subscriber header — balance now lives here, not buried below */}
          <Card data-tour="payments-balance">
            <CardContent className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selected.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selected.plan?.plan_name ?? "No plan assigned"} ·{" "}
                  {selected.contact_number || selected.email}
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
            <LoadingStatus contentClassName="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardListSkeleton rows={4} />
                <CardListSkeleton rows={4} />
              </div>
              <Card>
                <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                  <Skeleton className="h-9 w-full max-w-md" />
                </CardContent>
              </Card>
            </LoadingStatus>
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

                <Card data-tour="payments-history">
                  <CardHeader>
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PaymentHistory
                      maxHeightClass="max-h-80"
                      payments={history}
                      onCancelPayment={canCancelPayments ? setVoiding : undefined}
                      subscriber={{
                        name: selected.name,
                        address: selected.address,
                        contact_number: selected.contact_number,
                        plan_name: selected.plan?.plan_name,
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Record payment form, with live coverage preview */}
              {can("payments.record") && (
              <Card data-tour="payments-form">
                <CardHeader>
                  <CardTitle className="text-base">Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-md">
                    <RequiredNote />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField id="amount" label="Amount" required hint="In pesos" error={fieldError("amount")}>
                        <Input
                          name="amount"
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={form.amount}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </FormField>
                      <FormField
                        id="or_number"
                        label="OR Number"
                        required
                        hint={
                          <>
                            From the paper receipt.
                            {orSuggestion && form.or_number !== orSuggestion && (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  onClick={() => setForm((f) => ({ ...f, or_number: orSuggestion }))}
                                  className="font-medium text-primary underline underline-offset-2 dark:text-blue-300"
                                >
                                  Use next in your book: {orSuggestion}
                                </button>
                              </>
                            )}
                          </>
                        }
                        error={fieldError("or_number")}
                      >
                        <Input
                          name="or_number"
                          value={form.or_number}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 41001"
                        />
                      </FormField>
                    </div>

                    {coveragePreview && (
                      <div className="flex items-start gap-2 p-2.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded text-sm text-green-700 dark:text-green-400">
                        <Check className="size-4 mt-0.5 shrink-0" />
                        <span>{coveragePreview}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <FormField id="payment_date" label="Payment Date" required hint={spelledDate(form.payment_date)} error={fieldError("payment_date")}>
                        <Input name="payment_date" type="date" value={form.payment_date} onChange={handleChange} onBlur={handleBlur} />
                      </FormField>
                      <div className="space-y-1.5">
                        <Label>Payment Method</Label>
                        <Select
                          value={form.payment_method}
                          onValueChange={(v) => {
                            setForm({ ...form, payment_method: v });
                            try {
                              localStorage.setItem(METHOD_KEY, v);
                            } catch {
                              // not remembered, that is all
                            }
                          }}
                        >
                          <SelectTrigger className="w-full" aria-label="Payment method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
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

                    <Button type="submit" disabled={saving} className="w-full gap-2">
                      <Wallet className="size-4" aria-hidden="true" />
                      {saving ? "Recording..." : "Record Payment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              )}
            </>
          )}
        </>
      )}

      <VoidPaymentDialog payment={voiding} onClose={() => setVoiding(null)} onDone={handleVoided} />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Check this payment before recording it"
        description="Payments cannot be edited or deleted afterwards, so make sure everything below is right."
        rows={[
          { label: "Subscriber", value: selected?.name },
          { label: "Amount", value: peso(form.amount), emphasis: true },
          {
            label: "Payment date",
            value: form.payment_date
              ? new Date(`${form.payment_date}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "",
          },
          { label: "OR number", value: form.or_number },
          { label: "Method", value: form.payment_method },
          ...(form.notes ? [{ label: "Notes", value: form.notes }] : []),
        ]}
        warning={reviewWarning}
        confirmLabel="Record payment"
        busyLabel="Recording..."
        busy={saving}
        onConfirm={recordPayment}
      />

      <AlertDialog
        open={showReconnectConfirm}
        onOpenChange={setShowReconnectConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-700 dark:text-green-400" />
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
