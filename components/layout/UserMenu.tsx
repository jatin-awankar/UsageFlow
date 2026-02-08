"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { signOut } from "next-auth/react";

export default function UserMenu({ email }: { email: string }) {
  return (
    <Menu as="div" className="relative">
      <MenuButton className="text-sm text-gray-600 hover:text-gray-900 hover:cursor-pointer">
        {email}
      </MenuButton>

      <MenuItems className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow-sm">
        <MenuItem>
          <button
            onClick={() => signOut()}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            Sign out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
