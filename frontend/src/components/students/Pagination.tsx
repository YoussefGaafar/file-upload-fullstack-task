// DONE BY Youssef Gaafar

interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  pageSize,
  total,
  onPage,
  onPageSize,
}: Props) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 text-sm text-gray-500">
      <span>
        Showing{' '}
        <span className="font-medium text-gray-800">
          {from}–{to}
        </span>{' '}
        of{' '}
        <span className="font-medium text-gray-800">
          {total.toLocaleString()}
        </span>{' '}
        students
      </span>

      <div className="flex items-center gap-3">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-gray-300 px-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPage(1)} disabled={page === 1} title="First">
            «
          </NavBtn>
          <NavBtn
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            title="Previous"
          >
            ‹
          </NavBtn>

          <span className="px-3 text-sm font-medium text-gray-700">
            {page} / {totalPages.toLocaleString()}
          </span>

          <NavBtn
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            title="Next"
          >
            ›
          </NavBtn>
          <NavBtn
            onClick={() => onPage(totalPages)}
            disabled={page >= totalPages}
            title="Last"
          >
            »
          </NavBtn>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
