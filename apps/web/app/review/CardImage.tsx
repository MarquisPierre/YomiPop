// Shows a card's picture, with the credit line its license asks for when it has one.
export function CardImage({
  image,
}: {
  image: { url: string; attribution?: string | null };
}) {
  return (
    <figure className="flex flex-col items-center gap-1">
      {/* Uses a plain img, since the picture comes straight from Unsplash at the right size. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt=""
        className="max-h-48 w-auto rounded-xl border object-cover"
      />
      {/* Shows the credit line only for photos that have one; the user's own uploads don't. */}
      {image.attribution && (
        <figcaption className="text-xs text-muted-foreground">
          {image.attribution}
        </figcaption>
      )}
    </figure>
  );
}
