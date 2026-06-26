"use client";

import { useState } from "react";

interface Props {
  src: string;
  fallback?: string;
  alt: string;
}

export default function ReelThumbnail({ src, fallback, alt }: Props) {
  const [current, setCurrent] = useState(src);
  const [tried, setTried] = useState(false);

  function handleError() {
    if (!tried && fallback && current !== fallback) {
      setTried(true);
      setCurrent(fallback);
    }
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading="lazy"
      onError={handleError}
    />
  );
}
