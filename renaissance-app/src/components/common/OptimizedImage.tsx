import { useState, type ImgHTMLAttributes } from 'react';
import './OptimizedImage.css';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  /** Image source URL (required) */
  src: string;
  /** Accessible alt text (required) */
  alt: string;
  /** Intrinsic width — prevents CLS */
  width: number;
  /** Intrinsic height — prevents CLS */
  height: number;
  /** Skip lazy loading for above-fold images */
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  style,
  ...rest
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="optimized-image-wrapper"
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={`optimized-image${loaded ? ' is-loaded' : ''}${className ? ` ${className}` : ''}`}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </div>
  );
}
