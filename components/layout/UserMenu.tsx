"use client";

import Link from "next/link";
import { LogOut, Settings2 } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { signOut } from "next-auth/react";

export default function UserMenu({
  email,
  orgId,
  role,
}: {
  email: string;
  orgId: string;
  role: string;
}) {
  const initial = email?.charAt(0).toUpperCase() || "U";

  return (
    <Menu as="div" className="relative">
      <MenuButton className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100 hover:cursor-pointer">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
          {initial}
        </span>
      </MenuButton>

      <MenuItems className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 outline-none animate-in fade-in zoom-in-95 duration-150">
        <div className="rounded-md px-2.5 py-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
            Signed in
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
            {email}
          </p>
        </div>

        <div className="my-1 border-t border-slate-200" />
        {role === "OWNER" || role === "ADMIN" ? (
          <MenuItem>
            <Link
              href={`/app/${orgId}/settings`}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 transition data-focus:bg-slate-50"
            >
              <Settings2 className="size-4" />
              Settings
            </Link>
          </MenuItem>
        ) : (
          <></>
        )}
        <MenuItem>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 transition data-focus:bg-rose-50 hover:cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
