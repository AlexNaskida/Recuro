import { minidenticon } from "minidenticons";
import { useMemo } from "react";

interface Props {
  address: string;
  size?: number;
  className?: string;
}

export default function WalletIdenticon({ address, size = 32, className }: Props) {
  const svg = useMemo(() => minidenticon(address, 60, 50), [address]);
  return (
    <img
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      alt="wallet"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "50%" }}
    />
  );
}
