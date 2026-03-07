export const metadata = {
  title: "サッカー掲示板 | 翻訳付き海外ファン議論と試合予想 - Gegenpress",
  description:
    "海外サッカーファンの議論を翻訳付きで読める掲示板。試合予想やコメント投稿を通じて、クラブごとの反応をまとめて楽しめます。",
};

export default function BoardIndex() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Board</h1>
      <p>チームを指定してください。例: /board/57</p>
    </main>
  );
}

