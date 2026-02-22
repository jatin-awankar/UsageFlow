"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { toast } from "sonner";
import { Check, Copy, Loader2, MailPlus, Plus, X } from "lucide-react";
import { createPortal } from "react-dom";

import { inviteUser } from "@/actions/organization/inviteUser";
import { Button } from "@/components/ui/button";

const roleDescriptions: Record<Role, string> = {
  OWNER: "Full ownership and billing control",
  ADMIN: "Manage settings, billing, and team access",
  DEVELOPER: "Build and manage integrations",
  VIEWER: "Read-only access to analytics",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parseMaybeDate(value: unknown) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export default function InviteMemberForm({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [invitedEmail, setInvitedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDuplicateInvite, setIsDuplicateInvite] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
        setEmail("");
        setRole(Role.VIEWER);
        setInviteUrl(null);
        setExpiresAt(null);
        setInvitedEmail("");
        setCopied(false);
        setIsDuplicateInvite(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  useEffect(() => {
    if (!mounted || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open || inviteUrl) return;
    inputRef.current?.focus();
  }, [open, inviteUrl]);

  function resetState() {
    setEmail("");
    setRole(Role.VIEWER);
    setInviteUrl(null);
    setExpiresAt(null);
    setInvitedEmail("");
    setCopied(false);
    setIsDuplicateInvite(false);
  }

  function closeDialog() {
    if (loading) return;
    setOpen(false);
    resetState();
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      const result = await inviteUser(orgId, email, role);

      const parsedExpiresAt = parseMaybeDate(result.expiresAt);

      if (result.error) {
        toast.error(result.error);

        if (result.inviteUrl) {
          setInviteUrl(result.inviteUrl);
          setExpiresAt(parsedExpiresAt);
          setInvitedEmail(email.trim());
          setIsDuplicateInvite(true);
        }

        return;
      }

      setInviteUrl(result.inviteUrl ?? null);
      setExpiresAt(parsedExpiresAt);
      setInvitedEmail(email.trim());
      setIsDuplicateInvite(false);
      setEmail("");

      toast.success("Invitation link ready");
      router.refresh();
    } catch {
      toast.error("Failed to create invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Invite link copied");
    } catch {
      toast.error("Failed to copy invite link");
    }
  }

  const emailForMailto = encodeURIComponent(invitedEmail);
  const subject = encodeURIComponent("You're invited to join UsageFlow");
  const body = encodeURIComponent(
    inviteUrl
      ? `You have been invited to join a UsageFlow organization.\n\nAccept invitation: ${inviteUrl}`
      : ""
  );

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="hover:cursor-pointer"
      >
        <Plus className="size-4" />
        Invite member
      </Button>

      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={closeDialog}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Invite member"
                className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Invite a teammate
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Create a secure invitation link and share it with your
                      teammate.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={closeDialog}
                    disabled={loading}
                    className="hover:cursor-pointer"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {inviteUrl ? (
                  <div className="space-y-4">
                    <div
                      className={`rounded-xl border p-4 ${
                        isDuplicateInvite
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-emerald-200 bg-emerald-50/70"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isDuplicateInvite
                            ? "text-amber-900"
                            : "text-emerald-900"
                        }`}
                      >
                        {isDuplicateInvite
                          ? "An active invite already exists"
                          : "Invitation created successfully"}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          isDuplicateInvite
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {expiresAt
                          ? `Expires on ${dateFormatter.format(expiresAt)}`
                          : "Share this link with the invited teammate."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Invitation link
                      </p>
                      <code className="block max-h-28 overflow-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">
                        {inviteUrl}
                      </code>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopy}
                        className="hover:cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="size-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            Copy link
                          </>
                        )}
                      </Button>

                      {!isDuplicateInvite && invitedEmail ? (
                        <Button asChild type="button" variant="outline">
                          <a href={`mailto:${emailForMailto}?subject=${subject}&body=${body}`}>
                            <MailPlus className="size-4" />
                            Email invite
                          </a>
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        onClick={closeDialog}
                        className="hover:cursor-pointer"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Teammate email
                      </label>
                      <input
                        ref={inputRef}
                        type="email"
                        placeholder="teammate@company.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={loading}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Role
                      </label>
                      <select
                        value={role}
                        onChange={(event) => setRole(event.target.value as Role)}
                        disabled={loading}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
                      >
                        <option value={Role.VIEWER}>Viewer</option>
                        <option value={Role.DEVELOPER}>Developer</option>
                        <option value={Role.ADMIN}>Admin</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        {roleDescriptions[role]}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeDialog}
                        disabled={loading}
                        className="hover:cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="hover:cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Generate invite link"
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
