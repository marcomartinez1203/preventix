interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <span className={`${compact ? 'brand-logo-mark' : 'brand-logo'} ${className}`} role="img" aria-label="Preventix">
      <span className="brand-symbol"><img src="/brand/preventix-logo.jpeg" alt="" width={1254} height={1254} /></span>
      {!compact && <span className="brand-wordmark">preventix<span aria-hidden="true">.</span></span>}
    </span>
  );
}
