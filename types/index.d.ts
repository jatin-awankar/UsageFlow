interface PaginationProps {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string }>;
}