import BoardLikeToggle from "@/board/components/BoardLikeToggle";

type CommentLikeButtonProps = {
  commentId: number;
  initialLikeCount: number;
  initialLikedByMe: boolean;
};

/** リプライ（投稿）用。実装は BoardLikeToggle に集約 */
export default function CommentLikeButton({
  commentId,
  initialLikeCount,
  initialLikedByMe,
}: CommentLikeButtonProps) {
  return (
    <BoardLikeToggle
      kind="post"
      targetId={commentId}
      initialLikeCount={initialLikeCount}
      initialLikedByMe={initialLikedByMe}
    />
  );
}
