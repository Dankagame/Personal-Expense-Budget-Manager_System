export const PAGE_SIZE = 10

export function Pagination({ count, page, onPage, label = 'Table pages' }: { count: number; page: number; onPage: (page: number) => void; label?: string }) {
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  if (count === 0) return null
  const firstPage = Math.max(0, Math.min(page - 2, pageCount - 5))
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index)
  return (
    <nav className="admin-pagination" aria-label={label}>
      <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count}</span>
      <div>
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        {pageNumbers.map((number) => (
          <button key={number} type="button" aria-label={`Page ${number + 1}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPage(number)}>{number + 1}</button>
        ))}
        <button type="button" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  )
}
