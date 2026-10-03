import logoMark from "@/assets/talenval-logo.png";

interface LogoProps {
  /** Show the wordmark next to the icon */
  withWordmark?: boolean;
  /** Base pixel size of the icon (rendered ~40% larger for visibility) */
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
  const px = Math.round(size * 1.4);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoMark}
        alt="Talenval logo"
        width={px}
        height={px}
        loading="eager"
        className="rounded-[22%] object-contain shadow-sm"
        style={{ width: px, height: px }}
      />
      {withWordmark && (
        <span
          className={`font-semibold tracking-tight ${wordmarkClassName}`}
          style={{ fontSize: Math.max(14, Math.round(size * 0.7)) }}
        >
          Talen<span className="font-bold">val</span>
        </span>
      )}
    </span>
  );
}
