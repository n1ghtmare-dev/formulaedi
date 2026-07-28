import { useState } from 'react';
import { catMeta } from '../lib/catalog';
import { CategoryIcon } from '../lib/icons';

// Фото блюда. Если есть реальное фото (src из БД) — показываем его,
// иначе — чистую фирменную плитку с иконкой категории (единый вид для всех карточек).
export function FoodImage({
  slug,
  src,
  iconSize = 40,
  className = '',
}: {
  slug: string;
  src?: string | null;
  iconSize?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const meta = catMeta(slug);

  const tileBg = `radial-gradient(120% 120% at 30% 18%, #ffffff66, transparent 60%), ${meta.tint}`;

  // Плитка-иконка (нет фото или фото не загрузилось)
  if (!src || failed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: tileBg }}>
        <CategoryIcon slug={slug} size={iconSize} strokeWidth={1.4} className="text-olive-700/55" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: tileBg }}>
      {!loaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
