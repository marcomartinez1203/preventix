interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <span className={`${compact ? 'brand-logo-mark' : 'brand-logo'} ${className}`}>
      <img src="/brand/preventix-logo.jpeg" alt="Preventix" width={1254} height={1254} />
    </span>
  );
}
