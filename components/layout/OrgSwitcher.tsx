"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { Menu, MenuButton, MenuItems } from "@headlessui/react";
import { useRouter } from "next/navigation";

type Org = {
  id: string;
  name: string;
};

export default function OrgSwitcher({
  currentOrgId,
  organizations,
}: {
  currentOrgId: string;
  organizations: Org[];
}) {
  const router = useRouter();

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  function handleSwitch(orgId: string) {
    if (orgId === currentOrgId) return;
    router.push(`/app/${orgId}/dashboard`);
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex max-w-44 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:cursor-pointer">
        <span className="truncate">{currentOrg?.name || "Select org"}</span>
        <ChevronDown className="size-4 text-slate-400" />
      </MenuButton>

      <MenuItems className="absolute right-0 z-30 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 outline-none animate-in fade-in zoom-in-95 duration-150">
        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {organizations.map((org) => {
            const active = org.id === currentOrgId;

            return (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSwitch(org.id)}
                disabled={active}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  active
                    ? "cursor-not-allowed bg-slate-100 text-slate-500"
                    : "text-slate-700 hover:bg-slate-50 hover:cursor-pointer"
                }`}
              >
                <span className="truncate">{org.name}</span>
                {active ? <Check className="size-4" /> : null}
              </button>
            );
          })}
        </div>

        <div className="my-2 border-t border-slate-200" />

        <button
          type="button"
          onClick={() => router.push("/onboarding/create-org")}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:cursor-pointer"
        >
          <Plus className="size-4" />
          Create organization
        </button>
      </MenuItems>
    </Menu>
  );
}
