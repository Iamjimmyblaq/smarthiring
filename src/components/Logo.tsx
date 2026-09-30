import logoMark from "@/assets/talenval-logo.png";

interface LogoProps {
  /** Show the wordmark next to the icon */
  withWordmark?: boolean;
  /** Pixel size of the icon */
  size?: number;
  /** Tailwind class for the wordmark text color */
  wordmarkClassName?: string;
  className?: string;
}

export default function Logo({
  withWordmark = true,
  size = 32,
  wordmarkClassName = "text-foreground",
  className = "",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoMark}
        alt="Talenval logo"
        width={size}
        height={size}
        loading="eager"
        className="object-contain"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className={`font-semibold tracking-tight text-[1.05rem] ${wordmarkClassName}`}>
          Talen<span className="font-bold">val</span>
        </span>
      )}
    </span>
  );
}