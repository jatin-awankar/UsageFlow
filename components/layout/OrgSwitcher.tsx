"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { Menu, MenuButton, MenuItems } from "@headlessui/react";

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

  const currentOrg = organizations.find((o) => o.id === currentOrgId);

  function handleSwitch(orgId: string) {
    router.push(`/app/${orgId}/dashboard`);
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:cursor-pointer">
        {currentOrg?.name}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-56 p-2 rounded-md border bg-white shadow-sm focus:outline-none hover:cursor-pointer">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer ${
              org.id === currentOrgId ? "text-gray-400 cursor-not-allowed" : ""
            }`}
          >
            {org.name}
            {org.id === currentOrgId && (
              <Check className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ))}

        <div className="border-t my-1" />

        <button
          onClick={() => router.push("/onboarding/create-org")}
          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          + Create organization
        </button>
      </MenuItems>
    </Menu>
  );
}
