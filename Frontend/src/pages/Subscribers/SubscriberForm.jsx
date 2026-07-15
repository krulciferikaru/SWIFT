import { useState, useEffect } from "react";
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

export default function SubscriberForm({
  initial = null,
  onSubmit,
  onCancel,
  loading,
  formId = "subscriber-form",
}) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [plans, setPlans] = useState([]);
  const [errors, setErrors] = useState({});
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
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setValue = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      await onSubmit({
        ...form,
        plan_id: form.plan_id ? Number(form.plan_id) : "",
      });
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      }
    }
  };

  const selectedPlan = plans.find(
    (p) => String(p.plan_id) === String(form.plan_id),
  );

  const field = (label, key, type = "text", extra = {}, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={errors[key] ? "border-red-400" : ""}
        {...extra}
      />
      {errors[key] && <p className="text-red-500 text-xs">{errors[key][0]}</p>}
    </div>
  );

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      {/* Section: Plan & Status */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Service Plan & Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Service Plan<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Select value={form.plan_id} onValueChange={setValue("plan_id")}>
              <SelectTrigger
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

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={setValue("status")}>
              <SelectTrigger className="w-full">
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
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
                    {m.name} — {m.email} ({m.status})
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-1">
                If this is the same person, consider editing their existing
                record instead of creating a new one.
              </p>
            </div>
          )}
          {field("Contact Number", "contact_number", "text", {
            placeholder: "09XX-XXX-XXXX",
          })}
        </div>
        {field("Email Address", "email", "email", {}, true)}
        {field(
          "Address",
          "address",
          "text",
          { placeholder: "e.g. Palayan City, Nueva Ecija" },
          true,
        )}
      </div>

      {/* Section: Connection Details */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Connection Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("MAC Address", "mac_address", "text", {
            placeholder: "XX:XX:XX:XX:XX:XX",
          })}
          {field("Connection Date", "connection_date", "date", {}, true)}
        </div>
      </div>
    </form>
  );
}
