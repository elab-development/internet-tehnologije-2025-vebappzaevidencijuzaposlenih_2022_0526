type Column = {
  header: string;
  accessor: string;
};

type TableProps = {
  columns: Column[];
  data: any[];
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