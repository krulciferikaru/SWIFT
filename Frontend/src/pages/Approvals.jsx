import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
import { TableSkeleton } from "../components/Skeletons.jsx";
import { Check, ClipboardCheck, RotateCcw, X } from "lucide-react";
import EmptyState from "../components/EmptyState.jsx";
import Pager from "../components/Pager.jsx";
import ApproveDialog from "../components/ApproveDialog.jsx";
import ConfirmAction from "../components/ConfirmAction.jsx";
import { useOnReconnect } from "../hooks/useOnline";
import subscriberApi from "../api/subscribers";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "../hooks/useToast";
import { useApprovals } from "@/context/ApprovalContext";
import TourButton from "../components/TourButton.jsx";
import { useTourActive } from "../tour/tourState";
import { ApprovalSample } from "../components/TourSamples.jsx";
import Toast from "../components/Toast.jsx";

export default function Approvals() {
  const location = useLocation();
  const tourActive = useTourActive();
  const [tab, setTab] = useState(location.state?.tab ?? "pending"); // 'pending' | 'rejected' | 'claims'
  const [claimsSubTab, setClaimsSubTab] = useState("pending"); // 'pending' | 'rejected'
  const [pending, setPending] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [claims, setClaims] = useState([]);
  const [rejectedClaims, setRejectedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // The lists are loaded whole and shown a page at a time, so a long queue stays easy to scan.
  const [pageNo, setPageNo] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [actionLoading, setActionLoading] = useState(null);
  // The applicant being approved: a plan and an installation date are chosen first.
  const [approveTarget, setApproveTarget] = useState(null);
  // The rejected claim about to be approved again: staff confirm first.
  const [reapproveClaimTarget, setReapproveClaimTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectClaimTarget, setRejectClaimTarget] = useState(null);
  const { refreshPendingCount, refreshClaimsCount } = useApprovals();
  const { toast, showToast } = useToast();

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/subscribers/pending");
      setPending(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load pending subscribers.",
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchRejected = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await subscriberApi.getAll({
        account_status: "rejected",
        per_page: 100,
      });
      const responseData = res.data.data;
      const list = Array.isArray(responseData)
        ? responseData
        : (responseData?.data ?? []);
      setRejected(list);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load rejected subscribers.",
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/subscribers/pending-claims");
      setClaims(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load account claims.");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const fetchRejectedClaims = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/subscribers/rejected-claims");
      setRejectedClaims(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load rejected claims.",
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "pending") fetchPending();
    else if (tab === "rejected") fetchRejected();
    else if (claimsSubTab === "pending") fetchClaims();
    else fetchRejectedClaims();
  }, [tab, claimsSubTab]);

  // Reload whichever list is showing once the connection is back.
  useOnReconnect(() => {
    if (tab === "pending") fetchPending();
    else if (tab === "rejected") fetchRejected();
    else if (claimsSubTab === "pending") fetchClaims();
    else fetchRejectedClaims();
  });

  // The dialog has already approved them on the server; this updates the lists.
  const handleApproved = (subscriber) => {
    setApproveTarget(null);
    if (tab === "pending") {
      setPending((prev) => prev.filter((s) => s.subscriber_id !== subscriber.subscriber_id));
    } else {
      setRejected((prev) => prev.filter((s) => s.subscriber_id !== subscriber.subscriber_id));
    }
    showToast(`${subscriber.name} approved.`);
    refreshPendingCount();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.subscriber_id);
    try {
      await api.patch(`/subscribers/${rejectTarget.subscriber_id}/reject`);
      setPending((prev) =>
        prev.filter((s) => s.subscriber_id !== rejectTarget.subscriber_id),
      );
      showToast(`${rejectTarget.name}'s application was rejected.`);
      refreshPendingCount();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to reject subscriber.",
        "error",
      );
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  };

  const handleApproveClaim = async (claimUser) => {
    setActionLoading(claimUser.id);
    try {
      await api.patch(`/subscribers/claims/${claimUser.id}/approve`);
      setClaims((prev) => prev.filter((c) => c.id !== claimUser.id));
      showToast(`${claimUser.name}'s account claim approved.`);
      refreshClaimsCount();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to approve claim.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReapproveClaim = async (claimUser) => {
    setActionLoading(claimUser.id);
    try {
      await api.patch(`/subscribers/claims/${claimUser.id}/approve`);
      setRejectedClaims((prev) => prev.filter((c) => c.id !== claimUser.id));
      showToast(`${claimUser.name}'s account claim approved.`);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to approve claim.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const confirmRejectClaim = async () => {
    if (!rejectClaimTarget) return;
    setActionLoading(rejectClaimTarget.id);
    try {
      await api.patch(`/subscribers/claims/${rejectClaimTarget.id}/reject`);
      setClaims((prev) => prev.filter((c) => c.id !== rejectClaimTarget.id));
      showToast(`Claim for ${rejectClaimTarget.name} rejected.`);
      refreshClaimsCount();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to reject claim.",
        "error",
      );
    } finally {
      setActionLoading(null);
      setRejectClaimTarget(null);
    }
  };

  useEffect(() => {
    api
      .get("/subscribers/pending-claims")
      .then((res) => setClaims(res.data))
      .catch(() => {});
    refreshClaimsCount();
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state]);

  const baseList =
    tab === "pending"
      ? pending
      : tab === "rejected"
        ? rejected
        : claimsSubTab === "pending"
          ? claims
          : rejectedClaims;

  const fullList = search
    ? baseList.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.contact_number?.toLowerCase().includes(q)
        );
      })
    : baseList;

  const lastPage = Math.max(Math.ceil(fullList.length / perPage), 1);
  const currentPage = Math.min(pageNo, lastPage);
  const pageStart = (currentPage - 1) * perPage;
  const list = fullList.slice(pageStart, pageStart + perPage);
  const pagerMeta = {
    total: fullList.length,
    from: fullList.length ? pageStart + 1 : 0,
    to: Math.min(pageStart + perPage, fullList.length),
    last_page: lastPage,
  };
  // A different tab or search starts again from the first page.
  useEffect(() => {
    setPageNo(1);
  }, [tab, claimsSubTab, search]);

  const emptyState =
    tab === "pending"
      ? { title: "No applications waiting", description: "New sign-ups from the registration page wait here until you approve or reject them." }
      : tab === "rejected"
        ? { title: "No rejected applications", description: "Applications you reject are kept here for reference." }
        : claimsSubTab === "pending"
          ? { title: "No account claims waiting", description: "When someone signs up with a number that already belongs to a subscriber, you verify the claim here." }
          : { title: "No rejected claims", description: "Claims you reject are kept here for reference." };

  return (
    <div>
      <Toast toast={toast} />

      {initialLoading ? (
        <>
          <h1 className="sr-only">Pending Approvals</h1>
          <Skeleton className="h-8 w-40 mb-4" />
          <div className="flex h-10 items-end gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Approvals
            </h1>
            <TourButton tour="approvals" />
          </div>

          <div data-tour="approvals-tabs" role="group" aria-label="Approval lists" className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              data-tour="approvals-tab-pending"
              aria-pressed={tab === "pending"}
              onClick={() => setTab("pending")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "pending"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Pending
            </button>
            <button
              data-tour="approvals-tab-rejected"
              aria-pressed={tab === "rejected"}
              onClick={() => setTab("rejected")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "rejected"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Rejected
            </button>
            <button
              data-tour="approvals-tab-claims"
              aria-pressed={tab === "claims"}
              onClick={() => setTab("claims")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "claims"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Account Claims
              {claims.length > 0 && (
                <Badge
                  variant="outline"
                  className="ml-2 h-5 px-1.5 text-xs bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                >
                  {claims.length}
                </Badge>
              )}
            </button>
          </div>
        </>
      )}

      {tab === "claims" && !initialLoading && (
        <div data-tour="approvals-claims-subtabs" role="group" aria-label="Claim lists" className="flex gap-2 mb-4">
          <button
            data-tour="approvals-subtab-pending"
            aria-pressed={claimsSubTab === "pending"}
            onClick={() => setClaimsSubTab("pending")}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              claimsSubTab === "pending"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Pending Claims
          </button>
          <button
            data-tour="approvals-subtab-rejected"
            aria-pressed={claimsSubTab === "rejected"}
            onClick={() => setClaimsSubTab("rejected")}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              claimsSubTab === "rejected"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            Rejected Claims
          </button>
        </div>
      )}

      {initialLoading ? (
        <Skeleton className="h-8 w-full max-w-sm mb-4" />
      ) : (
        <Input
          data-tour="approvals-search"
          aria-label="Search approvals"
          type="text"
          placeholder="Search by name, mobile number, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {tab === "claims" && claimsSubTab === "pending" && list.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded text-sm text-amber-800 dark:text-amber-400">
          These are new login registrations using a mobile number that matches an
          existing subscriber record. Verify the person's identity (name,
          mobile number, address on file) before approving — approving links
          this login to the existing subscriber's account.
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {tab === "claims" ? (
            <TableSkeleton rows={4} columns={[
              { label: "Requested Name" }, { label: "Mobile Number" }, { label: "Existing Subscriber on File" },
              { label: "Requested On" }, { label: "Actions", kind: "actions" },
            ]} />
          ) : (
            <TableSkeleton rows={4} columns={[
              { label: "Name" }, { label: "Email" }, { label: "Mobile Number" }, { label: "Status", kind: "badge" },
              { label: "Registered On" }, { label: "Actions", kind: "actions" },
            ]} />
          )}
        </div>
      ) : list.length === 0 ? (
        <>
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <EmptyState
              icon={ClipboardCheck}
              title={search ? "No one matches your search" : emptyState.title}
              description={search ? "Check the spelling, or clear the search." : emptyState.description}
              onClearFilters={search ? () => setSearch("") : undefined}
            />
          </div>
          {tourActive && <ApprovalSample tab={tab} claimsSubTab={claimsSubTab} />}
        </>
      ) : tab === "claims" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested Name</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Existing Subscriber on File</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((claimUser) => (
                <TableRow key={claimUser.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {claimUser.name}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {claimUser.contact_number || claimUser.email || "—"}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {claimUser.subscriber ? (
                      <div className="text-xs">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {claimUser.subscriber.name}
                        </p>
                        <p>{claimUser.subscriber.address || "—"}</p>
                        <p>{claimUser.subscriber.contact_number || "—"}</p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {new Date(claimUser.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div data-tour="approvals-row-actions" className="flex gap-2">
                      {claimsSubTab === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveClaim(claimUser)}
                            aria-label={`Approve ${claimUser.name}`}
                            disabled={actionLoading === claimUser.id}
                            className="gap-1.5 bg-green-700 text-white hover:bg-green-800"
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={() => setRejectClaimTarget(claimUser)}
                            aria-label={`Reject ${claimUser.name}`}
                            disabled={actionLoading === claimUser.id}
                          >
                            <X className="size-3.5" aria-hidden="true" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setReapproveClaimTarget(claimUser)}
                          aria-label={`Re-approve ${claimUser.name}`}
                          disabled={actionLoading === claimUser.id}
                          className="gap-1.5 bg-green-700 text-white hover:bg-green-800"
                        >
                          <RotateCcw className="size-3.5" aria-hidden="true" />
                          Re-approve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((subscriber) => (
                <TableRow key={subscriber.subscriber_id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {subscriber.name}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {subscriber.email || "—"}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {subscriber.contact_number || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        tab === "pending"
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900 capitalize"
                          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 capitalize"
                      }
                    >
                      {subscriber.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div data-tour="approvals-row-actions" className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setApproveTarget(subscriber)}
                        aria-label={`${tab === "pending" ? "Approve" : "Re-approve"} ${subscriber.name}`}
                        disabled={actionLoading === subscriber.subscriber_id}
                        className="gap-1.5 bg-green-700 text-white hover:bg-green-800"
                      >
                        {tab === "pending" ? <Check className="size-3.5" aria-hidden="true" /> : <RotateCcw className="size-3.5" aria-hidden="true" />}
                        {tab === "pending" ? "Approve" : "Re-approve"}
                      </Button>
                      {tab === "pending" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5"
                          onClick={() => setRejectTarget(subscriber)}
                          aria-label={`Reject ${subscriber.name}`}
                          disabled={actionLoading === subscriber.subscriber_id}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmAction
        open={!!reapproveClaimTarget}
        onOpenChange={(open) => { if (!open) setReapproveClaimTarget(null); }}
        title="Approve this account claim again?"
        description={
          reapproveClaimTarget && (
            <>
              You rejected <strong>{reapproveClaimTarget.name}</strong>&apos;s claim earlier. Approving it now links their login to the existing
              subscriber record and lets them sign in. Only do this if you have checked that they really are that subscriber.
            </>
          )
        }
        confirmLabel="Approve claim"
        busyLabel="Approving..."
        busy={actionLoading === reapproveClaimTarget?.id}
        onConfirm={async () => {
          const target = reapproveClaimTarget;
          await handleReapproveClaim(target);
          setReapproveClaimTarget(null);
        }}
      />

      <ApproveDialog subscriber={approveTarget} onClose={() => setApproveTarget(null)} onApproved={handleApproved} />

      <Pager
        meta={pagerMeta}
        page={currentPage}
        onPage={(n) => setPageNo(Math.max(n, 1))}
        perPage={perPage}
        onPerPage={(n) => { setPerPage(n); setPageNo(1); }}
        noun={tab === "claims" ? "claims" : "applications"}
        sizes={[25, 50, 100]}
      />

      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget && (
                <>
                  You're about to reject <strong>{rejectTarget.name}</strong>'s
                  subscriber application. You can re-approve them later from the
                  Rejected tab if needed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="outline" onClick={confirmReject} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
              Reject Application
            </AlertDialogAction>
            <AlertDialogCancel variant="default">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectClaimTarget}
        onOpenChange={(open) => {
          if (!open) setRejectClaimTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this account claim?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectClaimTarget && (
                <>
                  This will mark the login request for{" "}
                  <strong>{rejectClaimTarget.name}</strong> as rejected. You can
                  find it later in the Rejected Claims tab, and the original
                  subscriber record on file will not be affected.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="outline" onClick={confirmRejectClaim} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
              Reject Claim
            </AlertDialogAction>
            <AlertDialogCancel variant="default">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
