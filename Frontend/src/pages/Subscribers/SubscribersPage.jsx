import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { TableSkeleton } from "../../components/Skeletons.jsx";
import { Archive, ChevronRight, CreditCard, MousePointerClick, Pencil } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import TourButton from "../../components/TourButton.jsx";
import Toast from "../../components/Toast.jsx";
import SubscriberDetailsModal from "./SubscriberDetailsModal";
const STATUSES = ["All", "Active", "Unpaid", "Disconnected"];

export default function SubscribersPage() {
  const { can } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const {
    subscribers,
    meta,
    summary,
    loading,
    error,
    refetch,
    refetchSummary,
  } = useSubscribers({ search, status, page });

  const { toast, showToast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status]);

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

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await subscriberApi.delete(deleteTarget.subscriber_id);

      if (response.status < 200 || response.status >= 300) {
        throw new Error("Archive request was not successful.");
      }

      setDeleteTarget(null);
      showToast("Subscriber archived.", "success");
      await refetch();
      await refetchSummary();
    } catch (err) {
      const msg = err.response?.data?.message ?? "Archive failed.";
      showToast(msg, "error");
      return;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (status !== "All") params.status = status;

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
  }, [showPreview, search, status]);

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
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
              </div>
            ))}
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
              placeholder="Search by name, contact number, address, MAC…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-tour="subs-status" aria-label="Filter by status" className="w-full sm:w-40">
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

        <p className="mb-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
          Click a subscriber's name to see all their details. Each row also has Edit, Archive and Payments buttons.
        </p>

        {/* Table */}
        <div data-tour="subs-table" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <TableSkeleton rows={9} columns={[
              { label: "Name" }, { label: "Plan" }, { label: "Email" }, { label: "Contact" },
              { label: "MAC Address" }, { label: "Status", kind: "badge" }, { label: "Actions", kind: "actions" },
            ]} />
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400">
              No subscribers found.
              {search || status !== "All" ? " Try adjusting your filters." : ""}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.subscriber_id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      <button
                        data-tour="subs-name"
                        type="button"
                        onClick={() => setDetailsTarget(sub)}
                        aria-haspopup="dialog"
                        title="View details"
                        className="group inline-flex items-center gap-0.5 text-left font-semibold text-blue-700 dark:text-blue-400 underline decoration-blue-700/40 dark:decoration-blue-400/40 underline-offset-2 hover:decoration-current focus-visible:decoration-current"
                      >
                        {sub.name}
                        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
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
                    <TableCell>
                      <StatusBadge status={sub.status} />
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
                          onClick={() => setDeleteTarget(sub)}
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

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              Showing {meta.from}–{meta.to} of {meta.total} subscribers
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1">
                Page {page} of {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                disabled={page === meta.last_page}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

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
        confirmClose
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
          setDeleteTarget(s);
        }}
        onPayments={(s) => navigate("/payments", { state: { subscriber: s } })}
      />

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Subscriber"
        description="Update the subscriber's details below."
        size="lg"
        confirmClose
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Archive "{deleteTarget?.name}"? They will be removed from the
              subscriber list and can no longer log in, but you can restore
              them anytime from the Archive page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? "Archiving..." : "Archive Subscriber"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
