export default async function ThreadPage({ params }: { params: { threadid: string } }) {
  const threadTitle = "サンプルスレッド"; // ←実際はDBやAPIから取る

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-i18n>
        {threadTitle}
      </h1>

      <section>
        <h2 data-i18n>スレッド一覧（仮）</h2>
        <table>
          <thead>
            <tr>
              <th data-i18n>投稿者</th>
              <th data-i18n>本文</th>
              <th data-i18n>日時</th>
            </tr>
          </thead>
          <tbody>
            {/* 投稿リストをここに map */}
          </tbody>
        </table>
      </section>

      <form>
        <label data-i18n>投稿</label>
        <textarea placeholder="コメントを書く…" />
        <button type="submit" data-i18n>
          送信
        </button>
      </form>
    </main>
  );
}

