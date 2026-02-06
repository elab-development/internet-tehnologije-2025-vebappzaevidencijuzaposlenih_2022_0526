"use client";

type Column = {
  header: string; // tekst u headeru kolone
  accessor: string; // naziv polja iz objekta (startTime, endTime, title...)
};

type TableProps = {
  columns: Column[];
  data: Record<string, any>[];

  // 🔽 NOVO: opcije za selekciju redova
  selectable?: boolean;          // da li tabela ima checkbox kolonu
  selectedIds?: number[];        // koji id-jevi su selektovani
  onToggleRow?: (id: number) => void;
  onToggleAll?: () => void;
  idField?: string;              // kako se zove polje za id, podrazumevano "id"
};

export default function Table({
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  idField = "id",
}: TableProps) {
  const allSelected =
    data.length > 0 && selectedIds.length === data.length;

  return (
    <table className="w-full border-collapse rounded-lg overflow-hidden">
      <thead className="bg-blue-100">
        <tr>
          {selectable && (
            <th className="border px-3 py-2 text-left text-sm font-semibold w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </th>
          )}

          {columns.map((col) => (
            <th
              key={col.accessor}
              className="border px-3 py-2 text-left text-sm font-semibold"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.length === 0 && (
          <tr>
            <td
              colSpan={columns.length + (selectable ? 1 : 0)}
              className="border px-3 py-4 text-center text-sm text-zinc-500"
            >
              Nema aktivnosti za izabrani datum
            </td>
          </tr>
        )}

        {data.map((row, i) => {
          const idValue = row[idField] as number | undefined;
          const isSelected =
            selectable && idValue !== undefined && selectedIds.includes(idValue);

          return (
            <tr
              key={idValue ?? i}
              className={`hover:bg-blue-50 ${
                isSelected ? "bg-blue-50" : ""
              }`}
            >
              {selectable && (
                <td className="border px-3 py-2 text-sm w-10">
                  <input
                    type="checkbox"
                    checked={!!isSelected}
                    onChange={() =>
                      onToggleRow && idValue !== undefined && onToggleRow(idValue)
                    }
                  />
                </td>
              )}

              {columns.map((col) => (
                <td
                  key={col.accessor}
                  className="border px-3 py-2 text-sm"
                >
                  {row[col.accessor] ?? (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
