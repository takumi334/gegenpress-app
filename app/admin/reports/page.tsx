import { prisma } from "@/lib/prisma";
import { DeleteThreadButton } from "./DeleteThreadButton";


export default async function AdminReportsPage() {
  const items = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div style={{ padding: 24 }}>
      <h1>Reports</h1>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">createdAt</th>
            <th align="left">kind</th>
            <th align="left">targetId</th>
            <th align="left">reason</th>
            <th align="left">url</th>
            <th align="left">action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.kind}</td>
              <td>{String(r.targetId)}</td>
              <td>{r.reason ?? ""}</td>
              <td>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    open
                  </a>
                ) : (
                  ""
                )}
              </td>
              <td>
                {r.kind === "thread" ? (
                  <DeleteThreadButton id={Number(r.targetId)} />
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
