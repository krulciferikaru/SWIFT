import { useState, useEffect, useRef } from "react";
import planApi from "../../api/plans";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import subscriberApi from "../../api/subscribers";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import TourButton from "../../components/TourButton.jsx";
import { errorMessage } from "../../utils/errors";
import { capitalizeWords, BARANGAYS, spelledDate } from "../../utils/text";
import FormField, { RequiredNote } from "../../components/FormField.jsx";

const monthLabel = (d) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const isoMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
import { required, emailAddress } from "../../utils/validators";

const EMPTY_FORM = {
  plan_id: "",
  name: "",
  address: "",
  contact_number: "",
  email: "",
  mac_address: "",
  connection_date: "",
  status: "Active",
};

// Keeps only hex digits and puts a colon after every pair: "aabbcc" -> "AA:BB:CC".
function formatMac(value) {
  const hex = value.replace(/[^0-9a-fA-F]/g, "").slice(0, 12).toUpperCase();
  return hex.match(/.{1,2}/g)?.join(":") ?? "";
}

export default function SubscriberForm({
  initial = null,
  onSubmit,
  onCancel,
  loading,
  formId = "subscriber-form",
  // Called with true when something has been typed or changed, false when it matches how the form opened.
  onDirtyChange,
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const openedAs = useRef(initial ?? EMPTY_FORM);
  const dirty = JSON.stringify(form) !== JSON.stringify(openedAs.current);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);
  const [plans, setPlans] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState([]);

  useEffect(() => {
    planApi
      .getAll()
      .then((res) => {
        const responseData = res.data;
        const list = Array.isArray(responseData)
          ? responseData
          : (responseData?.data?.data ?? responseData?.data ?? []);
        setPlans(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initial || !form.name || form.name.length < 3) {
      setDuplicateMatches([]);
      return;
    }
    const timeout = setTimeout(() => {
      subscriberApi
        .checkDuplicate(form.name)
        .then((res) => setDuplicateMatches(res.data.data))
        .catch(() => setDuplicateMatches([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [form.name, initial]);

  const set = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: field === "name" ? capitalizeWords(e.target.value) : e.target.value,
    }));

  const setValue = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // A field is only checked once the person has left it, or tried to save.
  const [touched, setTouched] = useState({});

  // Editing: when the plan is changed, which month the new plan starts from. Months already billed
  // keep the plan and price they had; the usual choice is next month.
  const planChanged = Boolean(initial?.plan_id) && String(form.plan_id) !== String(initial.plan_id);
  const nextMonth = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  })();
  const [planFrom, setPlanFrom] = useState(isoMonth(nextMonth));
  const planFromOptions = (() => {
    const out = [];
    const installed = form.connection_date ? new Date(`${String(form.connection_date).slice(0, 10)}T00:00:00`) : null;
    // The first month billed is the one after the installation month; offer back to there, newest first.
    let first = installed && !Number.isNaN(installed.getTime()) ? new Date(installed.getFullYear(), installed.getMonth() + 1, 1) : new Date(nextMonth.getFullYear(), nextMonth.getMonth() - 1, 1);
    for (let d = new Date(nextMonth); d >= first && out.length < 36; d = new Date(d.getFullYear(), d.getMonth() - 1, 1)) {
      const tag =
        d.getTime() === nextMonth.getTime() ? " (next month, the usual choice)"
        : d.getTime() === new Date(nextMonth.getFullYear(), nextMonth.getMonth() - 1, 1).getTime() ? " (this month)"
        : " (a month already billed: only to correct a mistake)";
      out.push({ value: isoMonth(d), label: monthLabel(d) + tag });
    }
    return out;
  })();
  const localErrors = {
    name: required("Name")(form.name),
    contact_number: required("Mobile number")(form.contact_number),
    email: emailAddress(form.email),
    mac_address:
      form.mac_address && form.mac_address.length !== 17
        ? "A MAC address has six pairs of letters or digits, like AA:BB:CC:DD:EE:FF."
        : "",
    connection_date: required("Installation date")(form.connection_date),
  };
  const fieldError = (key) => errors[key]?.[0] ?? (touched[key] ? localErrors[key] : "");
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstBad = Object.keys(localErrors).find((key) => localErrors[key]);
    if (firstBad) {
      setTouched(Object.fromEntries(Object.keys(localErrors).map((key) => [key, true])));
      document.getElementById(firstBad)?.focus();
      return;
    }
    setErrors({});
    setFormError("");
    try {
      await onSubmit({
        ...form,
        plan_id: form.plan_id ? Number(form.plan_id) : "",
        ...(planChanged ? { plan_effective_from: planFrom } : {}),
      });
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        // Offline, timed out, or a server error: say so, and keep everything typed.
        setFormError(errorMessage(err, "Could not save the subscriber. Please try again."));
      }
    }
  };

  const selectedPlan = plans.find(
    (p) => String(p.plan_id) === String(form.plan_id),
  );

  const field = (label, key, type = "text", extra = {}, isRequired = false) => {
    const { hint, ...inputProps } = extra;
    return (
      <FormField
        id={key}
        label={label}
        required={isRequired}
        hint={type === "date" ? spelledDate(form[key]) : hint}
        error={fieldError(key)}
      >
        <Input name={key} type={type} value={form[key]} onChange={set(key)} onBlur={handleBlur} {...inputProps} />
      </FormField>
    );
  };

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {formError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <RequiredNote />
        <TourButton tour="subscriberForm" />
      </div>

      {/* Section: Plan & Status */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Service Plan and Service Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div data-tour="sub-plan" className="space-y-1.5">
            <Label>
              Service Plan<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Select value={form.plan_id} onValueChange={setValue("plan_id")}>
              <SelectTrigger
                aria-label="Service plan"
                aria-invalid={errors.plan_id ? true : undefined}
                className={errors.plan_id ? "border-red-400 w-full" : "w-full"}
              >
                <SelectValue placeholder="Select a plan">
                  {selectedPlan
                    ? `${selectedPlan.plan_name} — ₱${Number(selectedPlan.monthly_rate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                    {p.plan_name} — ₱
                    {Number(p.monthly_rate).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_id && (
              <p className="text-red-500 text-xs">{errors.plan_id[0]}</p>
            )}
          </div>

          {planChanged && (
            <FormField
              id="plan_effective_from"
              label="The new plan applies from"
              className="sm:col-span-2"
              hint="Months already billed keep the plan and price they had, so this does not change what was billed before. Choose an earlier month only to correct a plan that was recorded wrongly."
              error={errors.plan_effective_from?.[0]}
            >
              <select
                value={planFrom}
                onChange={(e) => setPlanFrom(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-gray-950"
              >
                {planFromOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          )}

          <div data-tour="sub-status" className="space-y-1.5">
            <Label>Service status</Label>
            <Select value={form.status} onValueChange={setValue("status")}>
              <SelectTrigger className="w-full" aria-label="Service status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Disconnected">Disconnected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section: Subscriber Information */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Subscriber Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field(
            "Full Name",
            "name",
            "text",
            { placeholder: "e.g. Juan Dela Cruz" },
            true,
          )}
          {duplicateMatches.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded text-sm text-amber-800 dark:text-amber-400">
              <p className="font-medium mb-1">
                Possible existing subscriber(s) found:
              </p>
              <ul className="space-y-1">
                {duplicateMatches.map((m) => (
                  <li key={m.subscriber_id} className="text-xs">
                    {m.name} — {m.contact_number || m.email || "no contact"} ({m.status})
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-1">
                If this is the same person, consider editing their existing
                record instead of creating a new one.
              </p>
            </div>
          )}
          {field(
            "Mobile Number",
            "contact_number",
            "text",
            { placeholder: "09XX-XXX-XXXX" },
            true,
          )}
        </div>
        {field("Email Address (optional)", "email", "email")}
        <div className="space-y-1.5">
          <Label htmlFor="address">
            Address<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <select
            id="address"
            value={form.address}
            onChange={set("address")}
            aria-required="true"
            aria-invalid={errors.address ? true : undefined}
            aria-describedby={errors.address ? "address-error" : undefined}
            className={`h-9 w-full rounded-md border bg-transparent px-3 text-sm dark:bg-gray-950 ${errors.address ? "border-red-400" : "border-input"}`}
          >
            <option value="">Select a barangay</option>
            {/* Keep an older free-text address selectable when editing. */}
            {form.address && !BARANGAYS.includes(form.address) && (
              <option value={form.address}>{form.address}</option>
            )}
            {BARANGAYS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          {errors.address && (
            <p id="address-error" role="alert" className="text-red-700 dark:text-red-400 text-xs">
              {errors.address[0]}
            </p>
          )}
        </div>
      </div>

      {/* Section: Connection Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Connection Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("MAC Address", "mac_address", "text", {
            placeholder: "XX:XX:XX:XX:XX:XX",
            maxLength: 17,
            autoComplete: "off",
            spellCheck: false,
            onChange: (e) => {
              const next = formatMac(e.target.value);
              setForm((prev) => ({ ...prev, mac_address: next }));
            },
          })}
          {field("Installation Date", "connection_date", "date", {}, true)}
        </div>
      </div>
    </form>
  );
}
