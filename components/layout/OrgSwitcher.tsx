"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

type Organization = {
  id: string;
  name: string;
};

type OrgSwitcherProps = {
  currentOrgId: string;
  currentOrgName: string;
  organizations: Organization[];
};

export default function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  organizations,
}: OrgSwitcherProps) {
  const router = useRouter();

  function switchOrg(orgId: string) {
    router.push(`/app/${orgId}/dashboard`);
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
        <span className="font-medium">{currentOrgName}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-56 rounded-md border shadow-sm focus:outline-none">
        <div className="py-1">
          {organizations.map((org) => (
            <MenuItem key={org.id}>
              {({ focus }) => (
                <button
                  onClick={() => switchOrg(org.id)}
                  disabled={org.id === currentOrgId}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    org.id === currentOrgId
                      ? "text-gray-500 cursor-not-allowed"
                      : focus
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-700"
                  }`}
                >
                  {org.name}
                </button>
              )}
            </MenuItem>
          ))}
        </div>
      </MenuItems>
    </Menu>
  );
}
