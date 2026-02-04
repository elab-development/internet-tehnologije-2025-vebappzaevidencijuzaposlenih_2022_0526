"use client";

type Column = {
  header: string; //tekst u headeru kolone
  accessor: string; //accessor=naziv polja iz objekta npr. startTime, endTime...
};

type TableProps = {
  columns: Column[];
  data: Record<string, any>[];
};

export default function Table({ columns, data }: TableProps) {
  return (
    <table className="w-full border-collapse rounded-lg overflow-hidden">
      <thead className="bg-blue-100">
        <tr>
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
              colSpan={columns.length}
              className="border px-3 py-4 text-center text-sm text-zinc-500"
            >
              Nema aktivnosti za izabrani datum
            </td>
          </tr>
        )}

        {data.map((row, i) => (
          <tr key={i} className="hover:bg-blue-50">
            {columns.map((col) => (
              <td
                key={col.accessor}
                className="border px-3 py-2 text-sm"
              >
                {row[col.accessor]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
