import { Table } from "@cloudflare/kumo/components/table";
import { formatIndian, formatIndianShort } from '../lib/dates';
import { EVENT_COLORS } from '../lib/palette';

export default function EventsTable({ events, loading }) {
  if (loading && (!events || events.length === 0)) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="cf-skeleton h-4" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <p className="text-xs leading-4 text-[var(--muted)]">No data yet</p>;
  }

  return (
    <div className="events-table overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Time</Table.Head>
            <Table.Head>Type</Table.Head>
            <Table.Head>Label</Table.Head>
            {/* Page and Country are hidden below md: five columns do not
                fit a phone, the table ran 598px wide in a 390px viewport
                and the Page/Country columns sat off-screen. Label already
                carries the page for project clicks; the columns return
                at md (768px), where the full table fits. */}
            <Table.Head className="hidden md:table-cell">Page</Table.Head>
            <Table.Head className="hidden md:table-cell">Country</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {events.map((e, i) => (
            <Table.Row key={i}>
              <Table.Cell className="whitespace-nowrap tabular-nums text-[var(--muted)]">
                {/* Short date (no year) on phones, full date from md up. */}
                <span className="md:hidden">{formatIndianShort(e.at)}</span>
                <span className="hidden md:inline">{formatIndian(e.at)}</span>
              </Table.Cell>
              <Table.Cell>
                <TypeBadge type={e.type} />
              </Table.Cell>
              <Table.Cell className="text-[var(--text-2)] max-w-[80px] md:max-w-[150px] truncate">
                {e.label || '-'}
              </Table.Cell>
              <Table.Cell className="hidden md:table-cell text-[var(--text-2)] font-mono max-w-[120px] truncate">
                {e.page || '-'}
              </Table.Cell>
              <Table.Cell className="hidden md:table-cell text-[var(--text-2)]">{e.country || '-'}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}

function TypeBadge({ type }) {
  const color = EVENT_COLORS[type];
  if (!color) {
    return (
      <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] leading-[14px] font-medium bg-[var(--surface-2)] text-[var(--muted)]">
        {type?.replace(/_/g, ' ') ?? 'unknown'}
      </span>
    );
  }
  /* Pageview uses var(--accent) so the badge follows the theme
     (dark #2f7cf6, light #0969da); the other event colors are the
     same in both themes. */
  const style = type === 'pageview'
    ? { color: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }
    : { color, backgroundColor: color + '26' };
  return (
    <span className="inline-block whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] leading-[14px] font-medium" style={style}>
      {type?.replace(/_/g, ' ') ?? 'unknown'}
    </span>
  );
}
