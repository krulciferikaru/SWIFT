import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";
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

export default function Approvals() {
  const location = useLocation();
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
  const [actionLoading, setActionLoading] = useState(null);
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

  const handleApprove = async (subscriber) => {
    setActionLoading(subscriber.subscriber_id);
    try {
      await api.patch(`/subscribers/${subscriber.subscriber_id}/approve`);
      if (tab === "pending") {
        setPending((prev) =>
          prev.filter((s) => s.subscriber_id !== subscriber.subscriber_id),
        );
      } else {
        setRejected((prev) =>
          prev.filter((s) => s.subscriber_id !== subscriber.subscriber_id),
        );
      }
      showToast(`${subscriber.name} approved.`);
      refreshPendingCount();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to approve subscriber.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
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

  const list = search
    ? baseList.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.contact_number?.toLowerCase().includes(q)
        );
      })
    : baseList;

  const emptyMessage =
    tab === "pending"
      ? "No pending subscribers."
      : tab === "rejected"
        ? "No rejected subscribers."
        : claimsSubTab === "pending"
          ? "No pending account claims."
          : "No rejected account claims.";

  return (
    <div>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      {initialLoading ? (
        <>
          <Skeleton className="h-8 w-40 mb-4" />
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Approvals
          </h1>

          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
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
        <div className="flex gap-2 mb-4">
          <button
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
        <Skeleton className="h-9 w-full max-w-sm mb-4" />
      ) : (
        <Input
          type="text"
          placeholder="Search by name, email, or contact number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {tab === "claims" && claimsSubTab === "pending" && list.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded text-sm text-amber-800 dark:text-amber-400">
          These are new login registrations using an email that matches an
          existing subscriber record. Verify the person's identity (name,
          contact number, address on file) before approving — approving links
          this login to the existing subscriber's account.
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {tab === "claims" ? (
                  <>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-40" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-14" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {tab === "claims" ? (
                    <>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-32" />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-32" />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : list.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      ) : tab === "claims" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested Name</TableHead>
                <TableHead>Email</TableHead>
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
                    {claimUser.email}
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
                    <div className="flex gap-2">
                      {claimsSubTab === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveClaim(claimUser)}
                            disabled={actionLoading === claimUser.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectClaimTarget(claimUser)}
                            disabled={actionLoading === claimUser.id}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleReapproveClaim(claimUser)}
                          disabled={actionLoading === claimUser.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
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
                <TableHead>Contact Number</TableHead>
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
                    {subscriber.email}
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(subscriber)}
                        disabled={actionLoading === subscriber.subscriber_id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {tab === "pending" ? "Approve" : "Re-approve"}
                      </Button>
                      {tab === "pending" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectTarget(subscriber)}
                          disabled={actionLoading === subscriber.subscriber_id}
                        >
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Application
            </AlertDialogAction>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectClaim}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
