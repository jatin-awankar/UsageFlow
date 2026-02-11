"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function UserMenu({
  email,
  orgId,
}: {
  email: string;
  orgId: string;
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="text-sm text-gray-600 hover:text-gray-900 hover:cursor-pointer">
        {email}
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-sm focus:outline-none">
        <MenuItem>
          <Link href={`/app/${orgId}/settings`}>
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer">
              Settings
            </button>
          </Link>
        </MenuItem>
        <MenuItem>
          <button
            onClick={() => signOut()}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 hover:cursor-pointer"
          >
            Sign out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
