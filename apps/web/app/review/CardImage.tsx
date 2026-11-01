// Shows a card's picture with the credit line its license asks for.
export function CardImage({
  image,
}: {
  image: { url: string; attribution: string };
}) {
  return (
    <figure className="flex flex-col items-center gap-1">
      {/* Uses a plain img, since the picture comes straight from Unsplash at the right size. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt=""
        className="max-h-48 w-auto rounded-lg object-cover"
      />
      <figcaption className="text-xs text-zinc-500">
        {image.attribution}
      </figcaption>
    </figure>
  );
}
