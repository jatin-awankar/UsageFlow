"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

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
  const pathname = usePathname();

  function switchOrg(orgId: string) {
    // Preserve current route, just replace orgId
    const nextPath = pathname.replace(`/app/${currentOrgId}`, `/app/${orgId}`);
    router.push(nextPath);
  }

  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
        <span className="font-medium">{currentOrgName}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-sm focus:outline-none">
        <div className="py-1">
          {organizations.map((org) => {
            const isCurrent = org.id === currentOrgId;

            return (
              <MenuItem key={org.id}>
                {({ focus }) => (
                  <button
                    onClick={() => switchOrg(org.id)}
                    disabled={isCurrent}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      isCurrent
                        ? "text-gray-400 cursor-not-allowed"
                        : focus
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    <span>{org.name}</span>
                    {isCurrent && <Check className="h-4 w-4 text-gray-400" />}
                  </button>
                )}
              </MenuItem>
            );
          })}
        </div>
      </MenuItems>
    </Menu>
  );
}
