import { ReactNode } from "react";
import { Button } from "./button";
import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  navigate?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  navigate,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-white px-6 py-12 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}

      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>

      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>

      {action &&
        (navigate ? (
          <Link href={navigate}>
            <Button className="mt-4 hover:cursor-pointer">{action}</Button>
          </Link>
        ) : (
          <Button className="mt-4 hover:cursor-pointer">{action}</Button>
        ))}
    </div>
  );
}
