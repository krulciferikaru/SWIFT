import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import CardAction from "../../components/CardAction.jsx";
import DateHint from "../../components/DateHint.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import ReviewDialog from "../../components/ReviewDialog.jsx";
import ConfirmAction from "../../components/ConfirmAction.jsx";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { TableSkeleton } from "../../components/Skeletons.jsx";
import { spelledDate } from "../../utils/text";
import { Archive, BellRing, ChevronRight, CreditCard, FilterX, MousePointerClick, Pencil, Users2 } from "lucide-react";
import { errorMessage } from "../../utils/errors";
import { VerifiedBadge } from "../../components/PhoneVerification.jsx";
import reportApi from "../../api/reports";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import SubscriberForm from "./SubscriberForm";
import CsvPreviewTable from "../../components/CsvPreviewTable";
import { useSubscribers } from "../../hooks/useSubscribers";
import { useToast } from "../../hooks/useToast";
import { extractCsvTableData } from "../../utils/csvParser";
import subscriberApi from "../../api/subscribers";
import archiveApi from "../../api/archive";
import { useNavigate } from "react-router-dom";
import { useQueryState } from "../../hooks/useQueryState";
import SortableHead, { nextSort } from "../../components/SortableHead.jsx";
import Pager from "../../components/Pager.jsx";
import planApi from "../../api/plans";
import TourButton from "../../components/TourButton.jsx";
import Toast from "../../components/Toast.jsx";
import SubscriberDetailsModal from "./SubscriberDetailsModal";
const STATUSES = ["All", "Active", "Unpaid", "Disconnected"];
// What the address holds. A page with nothing chosen has a plain address.
const VIEW_DEFAULTS = { q: "", status: "All", plan: "All", from: "", to: "", page: 1, per: 15, sort: "name", dir: "asc" };
const peso = (value) => `₱${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default function SubscribersPage() {
  const { can } = useAuth();
  // The search, filters, sort and page live in the address (for example ?status=Unpaid&sort=plan),
  // so the dashboard cards can link to a filtered list, and refresh / Back keep the view.
  const [view, setView] = useQueryState(VIEW_DEFAULTS);
  const search = view.q;
  const status = STATUSES.includes(view.status) ? view.status : "All";
  const planId = view.plan;
  const installedFrom = view.from;
  const installedTo = view.to;
  const page = view.page;
  const perPage = view.per;
  const sort = view.sort;
  const dir = view.dir;
  const setStatus = (value) => setView({ status: value, page: 1 });
  const setPlanId = (value) => setView({ plan: value, page: 1 });
  const setInstalledFrom = (value) => setView({ from: value, page: 1 });
  const setInstalledTo = (value) => setView({ to: value, page: 1 });
  const setPage = (value) => setView({ page: Math.max(value, 1) });
  const changeSort = (column) => setView(nextSort({ sort, dir }, column));
  // What is typed in the box; it reaches the address after a short pause.
  const [searchInput, setSearchInput] = useState(view.q);
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    planApi
      .getAll()
      .then((res) => {
        const body = res.data;
        setPlans(Array.isArray(body) ? body : (body?.data?.data ?? body?.data ?? []));
      })
      .catch(() => {});
  }, []);

  const rangeError =
    installedFrom && installedTo && installedTo < installedFrom
      ? "The end date is before the start date."
      : "";
  // Only send dates that make sense together.
  const activeFrom = rangeError ? "" : installedFrom;
  const activeTo = rangeError ? "" : installedTo;
  const hasExtraFilters = planId !== "All" || installedFrom || installedTo;
  const clearAllFilters = () => {
    setSearchInput("");
    setView({ q: "", status: "All", plan: "All", from: "", to: "", page: 1 });
  };

  // Debounce the search box so we don't refetch on every keystroke.
  const latestSearch = useRef(search);
  latestSearch.current = search;
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== latestSearch.current) setView({ q: searchInput.trim() === "" ? "" : searchInput, page: 1 });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, setView]);

  const {
    subscribers,
    meta,
    summary,
    loading,
    error,
    refetch,
    refetchSummary,
  } = useSubscribers({ search, status, page, perPage, sort, direction: dir, planId, installedFrom: activeFrom, installedTo: activeTo });

  const { toast, showToast } = useToast();

  // Picking people to send a payment reminder to (only for staff who may send texts).
  const canRemind = can("sms.send");
  const [picked, setPicked] = useState(() => new Set());
  const [remindOpen, setRemindOpen] = useState(false);
  const [reminding, setReminding] = useState(false);
  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageAllPicked = subscribers.length > 0 && subscribers.every((s) => picked.has(s.subscriber_id));
  const togglePage = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (pageAllPicked) subscribers.forEach((s) => next.delete(s.subscriber_id));
      else subscribers.forEach((s) => next.add(s.subscriber_id));
      return next;
    });
  const pickWhoOwes = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      subscribers.filter((s) => s.balance > 0).forEach((s) => next.add(s.subscriber_id));
      return next;
    });
  const sendReminders = async () => {
    setReminding(true);
    try {
      const res = await subscriberApi.sendReminders([...picked]);
      showToast(res.data?.message || "Reminders sent.");
      setPicked(new Set());
    } catch (err) {
      showToast(errorMessage(err, "Could not send the reminders."), "error");
    } finally {
      setReminding(false);
      setRemindOpen(false);
    }
  };

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  // The subscriber about to be archived: staff confirm first.
  const [archiveTarget, setArchiveTarget] = useState(null);
  // Whether the Add / Edit form has unsaved changes: closing it only asks when it does.
  const [addDirty, setAddDirty] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Only show skeleton placeholders on the very first load, not on every
  // filter-triggered refetch — otherwise the toolbar (and its focused
  // search input) gets unmounted and replaced on each keystroke.
  const [initialLoading, setInitialLoading] = useState(true);
  useEffect(() => {
    if (!loading) setInitialLoading(false);
  }, [loading]);

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  const handleAdd = async (form) => {
    setFormLoading(true);
    try {
      await subscriberApi.create(form);
      setShowAdd(false);
      showToast("Subscriber added successfully.");
      refetch();
      refetchSummary();
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    setFormLoading(true);
    try {
      await subscriberApi.update(editTarget.subscriber_id, form);
      setEditTarget(null);
      showToast("Subscriber updated successfully.");
      refetch();
      refetchSummary();
    } finally {
      setFormLoading(false);
    }
  };

  // Archiving can be undone, so it happens straight away and the message offers an Undo button.
  // (A confirmation window for something reversible only teaches people to click through windows.)
  const undoArchive = async (sub) => {
    try {
      await archiveApi.restoreSubscriber(sub.subscriber_id);
      showToast(`${sub.name} was restored.`);
      await refetch();
      await refetchSummary();
    } catch (err) {
      showToast(errorMessage(err, "Could not undo. You can restore them from the Archive page."), "error");
    }
  };

  const archiveSubscriber = async (sub) => {
    try {
      const response = await subscriberApi.delete(sub.subscriber_id);
      if (response.status < 200 || response.status >= 300) {
        throw new Error("Archive request was not successful.");
      }
      showToast(`${sub.name} was archived. They can no longer sign in.`, "success", {
        action: { label: "Undo", onClick: () => undoArchive(sub) },
      });
      await refetch();
      await refetchSummary();
    } catch (err) {
      showToast(err.response?.data?.message ?? errorMessage(err, "Archive failed."), "error");
    }
  };

  const handleExportReport = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (status !== "All") params.status = status;
      if (planId !== "All") params.plan_id = planId;
      if (activeFrom) params.installed_from = activeFrom;
      if (activeTo) params.installed_to = activeTo;

      const res = await reportApi.downloadSubscribersXlsx(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "subscribers_report.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Report downloaded successfully.");
    } catch (err) {
      showToast(errorMessage(err, "Failed to download report."), "error");
    }
  };

  const fetchPreviewCsv = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewHeaders([]);
    setPreviewRows([]);

    try {
      const params = {};
      if (search) params.search = search;
      if (status !== "All") params.status = status;
      if (planId !== "All") params.plan_id = planId;
      if (activeFrom) params.installed_from = activeFrom;
      if (activeTo) params.installed_to = activeTo;

      const res = await reportApi.previewSubscribers(params);
      const csvText = await res.data.text();
      const { headers, rows } = extractCsvTableData(csvText);

      if (headers.length > 0) {
        setPreviewHeaders(headers);
        setPreviewRows(rows);
      }
    } catch {
      setPreviewError("Unable to load report preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (showPreview) {
      fetchPreviewCsv();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, search, status, planId, activeFrom, activeTo]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="space-y-6">
        <div className="mb-6 flex items-start justify-between gap-3">
          {initialLoading ? (
            <div className="space-y-2">
              <h1 className="sr-only">Subscribers</h1>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Subscribers
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage all cable TV subscribers for Palayan Branch.
                </p>
              </div>
              <TourButton tour="subscribers" />
            </>
          )}
        </div>

        {summary ? (
          <div data-tour="subs-summary" className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              {
                label: "Total",
                value: summary.total,
                color: "text-gray-800 dark:text-gray-200",
              },
              {
                label: "Pending",
                value: summary.pending,
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Active",
                value: summary.active,
                color: "text-green-700 dark:text-green-400",
              },
              {
                label: "Unpaid",
                value: summary.unpaid,
                color: "text-yellow-600 dark:text-yellow-400",
              },
              {
                label: "Disconnected",
                value: summary.disconnected,
                color: "text-red-600 dark:text-red-400",
              },
            ].map((card) => {
              const body = (
                <CardContent>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                    {card.value}
                  </p>
                </CardContent>
              );
              // Pending is not a subscriber status: those people wait on the Approvals page.
              if (card.label === "Pending") {
                return (
                  <CardAction key={card.label} to={can("approvals.manage") ? "/approvals" : undefined} hint="Review applications">
                    {body}
                  </CardAction>
                );
              }
              const target = card.label === "Total" ? "All" : card.label;
              const selected = status === target;
              const hint = selected
                ? target === "All" ? "Showing everyone" : `Showing ${card.label.toLowerCase()} only`
                : target === "All" ? "Show everyone" : `Show only ${card.label.toLowerCase()}`;
              return (
                <CardAction key={card.label} onClick={() => setStatus(target)} pressed={selected} hint={hint}>
                  {body}
                </CardAction>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {initialLoading ? (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-40" />
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-36" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              data-tour="subs-search"
              aria-label="Search subscribers"
              type="text"
              placeholder="Search by name, mobile number, address, MAC…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-tour="subs-status" aria-label="Filter by service status" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              data-tour="subs-export"
              onClick={() => setShowPreview(true)}
              className="bg-green-700 text-white hover:bg-green-800 whitespace-nowrap"
            >
              Export CSV
            </Button>

            {can("subscribers.manage") && (
              <Button
                data-tour="subs-add"
                onClick={() => setShowAdd(true)}
                className="whitespace-nowrap"
              >
                Add Subscriber
              </Button>
            )}
          </div>
        )}

        {!initialLoading && (
          <div data-tour="subs-filters" className="-mt-3 mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label htmlFor="subs-plan" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Plan</label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="subs-plan" aria-label="Filter by plan" className="w-full sm:w-52">
                  <SelectValue>
                    {planId === "All"
                      ? "All plans"
                      : (plans.find((p) => String(p.plan_id) === planId)?.plan_name ?? "Plan")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All plans</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                      {p.plan_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="subs-from" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Installed from</label>
              <Input id="subs-from" type="date" value={installedFrom} max={installedTo || undefined} onChange={(e) => setInstalledFrom(e.target.value)} className="w-full sm:w-40" />
              <DateHint value={installedFrom} />
            </div>
            <div className="space-y-1">
              <label htmlFor="subs-to" className="block text-xs font-medium text-gray-600 dark:text-gray-400">Installed to</label>
              <Input id="subs-to" type="date" value={installedTo} min={installedFrom || undefined} onChange={(e) => setInstalledTo(e.target.value)} className="w-full sm:w-40" />
              <DateHint value={installedTo} />
            </div>
            {(hasExtraFilters || search || status !== "All") && (
              <Button type="button" variant="outline" onClick={clearAllFilters} className="gap-1.5">
                <FilterX className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            )}
            {rangeError && <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{rangeError}</p>}
          </div>
        )}

        <p className="mb-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
          Click a subscriber's name to see all their details. Each row also has Edit, Archive and Payments buttons.
        </p>

        {canRemind && !initialLoading && subscribers.length > 0 && (
          <div data-tour="subs-remind" className="-mt-1 mb-3 flex flex-wrap items-center gap-3 text-sm">
            {picked.size === 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={pickWhoOwes} className="gap-1.5">
                <BellRing className="size-3.5" aria-hidden="true" />
                Select everyone who owes on this page
              </Button>
            ) : (
              <>
                <span className="font-medium text-gray-900 dark:text-gray-100" aria-live="polite">
                  {picked.size} selected
                </span>
                <Button type="button" size="sm" onClick={() => setRemindOpen(true)} className="gap-1.5">
                  <BellRing className="size-3.5" aria-hidden="true" />
                  Send payment reminder
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPicked(new Set())}>
                  Clear selection
                </Button>
              </>
            )}
          </div>
        )}

        {/* Table */}
        <div
          data-tour="subs-table"
          aria-busy={loading}
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity ${loading && !initialLoading ? "opacity-60" : ""}`}
        >
          {initialLoading ? (
            <TableSkeleton rows={9} columns={[
              ...(canRemind ? [{ label: "" }] : []), { label: "Name" }, { label: "Plan" }, { label: "Email" }, { label: "Mobile" },
              { label: "MAC Address" }, { label: "Installed" }, { label: "Service status", kind: "badge" }, { label: "Balance" }, { label: "Actions", kind: "actions" },
            ]} />
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : subscribers.length === 0 ? (
            search || status !== "All" || hasExtraFilters ? (
              <EmptyState
                icon={Users2}
                title="No subscribers match these filters"
                description="Try a different search, or clear the filters to see everyone."
                onClearFilters={clearAllFilters}
              />
            ) : (
              <EmptyState
                icon={Users2}
                title="No subscribers yet"
                description="Subscribers show up here once staff add them, or after a new sign-up is approved."
                action={can("subscribers.manage") ? { label: "Add Subscriber", onClick: () => setShowAdd(true) } : undefined}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canRemind && (
                    <TableHead className="w-10">
                      <Checkbox checked={pageAllPicked} onCheckedChange={togglePage} aria-label="Select everyone on this page" />
                    </TableHead>
                  )}
                  <SortableHead column="name" sort={sort} dir={dir} onSort={changeSort}>Name</SortableHead>
                  <SortableHead column="plan" sort={sort} dir={dir} onSort={changeSort}>Plan</SortableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <SortableHead column="installed" sort={sort} dir={dir} onSort={changeSort}>Installed</SortableHead>
                  <SortableHead column="status" sort={sort} dir={dir} onSort={changeSort}>Service status</SortableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.subscriber_id}>
                    {canRemind && (
                      <TableCell className="w-10">
                        <Checkbox
                          checked={picked.has(sub.subscriber_id)}
                          onCheckedChange={() => togglePick(sub.subscriber_id)}
                          aria-label={`Select ${sub.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <button
                        data-tour="subs-name"
                        type="button"
                        onClick={() => setDetailsTarget(sub)}
                        aria-haspopup="dialog"
                        title="View details"
                        className="group inline-flex items-center gap-0.5 text-left font-semibold text-gray-900 dark:text-gray-100 underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:decoration-current"
                      >
                        {sub.name}
                        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                      {sub.deletion && (
                        <span className="mt-0.5 block text-xs font-normal text-amber-700 dark:text-amber-300">
                          Deleted their account on {new Date(sub.deletion.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {sub.plan?.plan_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {sub.email || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      <div>
                                              {sub.contact || sub.contact_number || "—"}
                                              <div><VerifiedBadge verified={sub.contact_verified} /></div>
                                            </div>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {sub.mac_address || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {sub.connection_date ? spelledDate(String(sub.connection_date).slice(0, 10)) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {sub.balance > 0 ? (
                        <span className="font-semibold text-red-700 dark:text-red-400">
                          {peso(sub.balance)}
                          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                            {sub.months_behind} {sub.months_behind === 1 ? "month" : "months"} behind
                          </span>
                        </span>
                      ) : !sub.plan || !sub.connection_date ? (
                        <span className="text-gray-500 dark:text-gray-400">Not set up yet</span>
                      ) : sub.advance_credit > 0 ? (
                        <span className="text-green-700 dark:text-green-400">
                          {peso(sub.advance_credit)} credit
                        </span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">Paid up</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div data-tour="subs-actions" className="flex flex-wrap gap-2">
                        {can("subscribers.manage") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditTarget(sub)}
                          aria-label={`Edit ${sub.name}`}
                          className="gap-1.5"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        )}
                        {can("subscribers.archive") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setArchiveTarget(sub)}
                          aria-label={`Archive ${sub.name}`}
                          className="gap-1.5"
                        >
                          <Archive className="size-3.5" aria-hidden="true" />
                          Archive
                        </Button>
                        )}
                        {can("payments.view", "payments.record") && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Payments for ${sub.name}`}
                          onClick={() =>
                            navigate("/payments", {
                              state: { subscriber: sub },
                            })
                          }
                          className="gap-1.5 border-green-700/40 text-green-700 hover:bg-green-50 dark:border-green-400/40 dark:text-green-400 dark:hover:bg-green-950"
                        >
                          <CreditCard className="size-3.5" aria-hidden="true" />
                          Payments
                        </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Pager
          meta={meta}
          page={page}
          onPage={setPage}
          perPage={perPage}
          onPerPage={(n) => setView({ per: n, page: 1 })}
          noun="subscribers"
        />
      </div>

      <ConfirmAction
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title="Archive this subscriber?"
        description={
          archiveTarget && (
            <>
              <strong>{archiveTarget.name}</strong> will be removed from the subscriber list and can no longer sign in. Nothing is deleted: their
              payments and history are kept, and you can restore them from the Archive page (or press Undo straight after).
            </>
          )
        }
        confirmLabel="Archive subscriber"
        busyLabel="Archiving..."
        destructive
        busy={archiving}
        onConfirm={async () => {
          setArchiving(true);
          await archiveSubscriber(archiveTarget);
          setArchiving(false);
          setArchiveTarget(null);
        }}
      />

      <ReviewDialog
        open={remindOpen}
        onOpenChange={setRemindOpen}
        title={`Send a payment reminder to ${picked.size} ${picked.size === 1 ? "person" : "people"}?`}
        description="Each person gets a text with the amount they owe."
        rows={[
          { label: "People selected", value: picked.size, emphasis: true },
          { label: "Message", value: "Reminder with their balance" },
        ]}
        warning="Texts cannot be recalled and each one uses SMS credit. Anyone selected who owes nothing is skipped."
        confirmLabel="Send reminders"
        busyLabel="Sending..."
        busy={reminding}
        onConfirm={sendReminders}
      />

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="CSV Preview"
        size="xl"
      >
        <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                CSV Viewer
              </p>
              <p className="text-lg font-semibold">subscribers_report.csv</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-900"
              >
                Close
              </Button>
              <Button
                onClick={handleExportReport}
                className="bg-green-700 text-white hover:bg-green-800"
              >
                Download CSV
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4">
            <CsvPreviewTable
              headers={previewHeaders}
              rows={previewRows}
              loading={previewLoading}
              error={previewError}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Subscriber"
        description="Fill in the subscriber's details below."
        size="lg"
        confirmClose={addDirty}
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-subscriber-form"
              disabled={formLoading}
            >
              {formLoading ? "Saving..." : "Save Subscriber"}
            </Button>
          </div>
        )}
      >
        <SubscriberForm
          formId="add-subscriber-form"
          onDirtyChange={setAddDirty}
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          loading={formLoading}
        />
      </Modal>

      <SubscriberDetailsModal
        subscriber={detailsTarget}
        onClose={() => setDetailsTarget(null)}
        onEdit={(s) => {
          setDetailsTarget(null);
          setEditTarget(s);
        }}
        onArchive={(s) => {
          setDetailsTarget(null);
          setArchiveTarget(s);
        }}
        onPayments={(s) => navigate("/payments", { state: { subscriber: s } })}
      />

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Subscriber"
        description="Update the subscriber's details below."
        size="lg"
        confirmClose={editDirty}
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-subscriber-form"
              disabled={formLoading}
            >
              {formLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      >
        {editTarget && (
          <SubscriberForm
            formId="edit-subscriber-form"
            onDirtyChange={setEditDirty}
            initial={{
              plan_id: editTarget.plan_id ?? "",
              name: editTarget.name ?? "",
              address: editTarget.address ?? "",
              contact_number:
                editTarget.contact ?? editTarget.contact_number ?? "",
              email: editTarget.email ?? "",
              mac_address: editTarget.mac_address ?? "",
              connection_date: (
                editTarget.installation_date ??
                editTarget.connection_date ??
                ""
              ).slice(0, 10),
              status: editTarget.status ?? "Active",
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={formLoading}
          />
        )}
      </Modal>

    </div>
  );
}
