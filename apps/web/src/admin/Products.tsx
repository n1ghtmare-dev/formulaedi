import { useState } from 'react';
import { formatKopecks } from '@formulaedi/shared';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api, type AdminCategory, type AdminItem } from './adminApi';
import { PageTitle, Loading, ErrorMsg, useLoad } from './shared';

export function Products({ onAuthError }: { onAuthError: () => void }) {
  const { data, loading, error, reload } = useLoad(() => api.menu(), onAuthError);
  const [itemEdit, setItemEdit] = useState<{ item: AdminItem | null; categoryId: string } | null>(null);
  const [catEdit, setCatEdit] = useState<AdminCategory | 'new' | null>(null);

  const del = async (fn: () => Promise<unknown>, msg: string) => {
    if (!confirm(msg)) return;
    try {
      await fn();
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <PageTitle>Товары</PageTitle>
        <button
          onClick={() => setCatEdit('new')}
          className="flex items-center gap-1.5 rounded-full bg-olive-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-olive-800"
        >
          <Plus size={16} /> Категория
        </button>
      </div>

      {loading && <Loading />}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      <div className="space-y-6">
        {data?.map((cat) => (
          <div key={cat.id} className="rounded-2xl border border-line bg-paper p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-lg">{cat.iconEmoji}</span>
              <h2 className="font-serif text-xl text-olive-800">{cat.name}</h2>
              {!cat.isActive && (
                <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                  скрыта
                </span>
              )}
              <span className="text-xs text-ink-soft">/{cat.slug}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <IconBtn onClick={() => setItemEdit({ item: null, categoryId: cat.id })} title="Добавить позицию">
                  <Plus size={15} />
                </IconBtn>
                <IconBtn onClick={() => setCatEdit(cat)} title="Изменить категорию">
                  <Pencil size={15} />
                </IconBtn>
                <IconBtn
                  danger
                  onClick={() => del(() => api.deleteCategory(cat.id), `Удалить категорию «${cat.name}» и все её позиции?`)}
                  title="Удалить категорию"
                >
                  <Trash2 size={15} />
                </IconBtn>
              </div>
            </div>

            {cat.items.length === 0 ? (
              <p className="text-sm text-ink-soft">Позиций пока нет.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {cat.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-olive-800">{it.name}</span>
                        {it.isHalal && <Tag>халяль</Tag>}
                        {!it.isAvailable && <Tag danger>скрыто</Tag>}
                      </div>
                      {it.description && (
                        <div className="truncate text-xs text-ink-soft">{it.description}</div>
                      )}
                    </div>
                    <span className="font-semibold tabular-nums">{formatKopecks(it.priceKopecks)}</span>
                    <IconBtn onClick={() => setItemEdit({ item: it, categoryId: cat.id })} title="Изменить">
                      <Pencil size={15} />
                    </IconBtn>
                    <IconBtn
                      danger
                      onClick={() => del(() => api.deleteItem(it.id), `Удалить «${it.name}»?`)}
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </IconBtn>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {itemEdit && (
        <ItemModal
          item={itemEdit.item}
          categoryId={itemEdit.categoryId}
          categories={data ?? []}
          onClose={() => setItemEdit(null)}
          onSaved={() => {
            setItemEdit(null);
            reload();
          }}
        />
      )}
      {catEdit && (
        <CategoryModal
          category={catEdit === 'new' ? null : catEdit}
          onClose={() => setCatEdit(null)}
          onSaved={() => {
            setCatEdit(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function Tag({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        danger ? 'bg-danger-bg text-danger' : 'bg-brand-50 text-olive-700'
      }`}
    >
      {children}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-8 w-8 place-items-center rounded-lg ring-1 ring-line transition ${
        danger ? 'text-danger hover:bg-danger-bg' : 'text-olive-700 hover:bg-brand-50'
      }`}
    >
      {children}
    </button>
  );
}

// ——— Модалка позиции ———
function ItemModal({
  item,
  categoryId,
  categories,
  onClose,
  onSaved,
}: {
  item: AdminItem | null;
  categoryId: string;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [catId, setCatId] = useState(categoryId);
  const [priceRub, setPriceRub] = useState(item ? String(item.priceKopecks / 100) : '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [isHalal, setIsHalal] = useState(item?.isHalal ?? false);
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    const priceKopecks = Math.round(parseFloat(priceRub.replace(',', '.')) * 100);
    if (!name.trim() || !Number.isFinite(priceKopecks) || priceKopecks < 0) {
      setErr('Укажите название и корректную цену');
      setBusy(false);
      return;
    }
    const body = {
      name: name.trim(),
      categoryId: catId,
      priceKopecks,
      description: description.trim() || undefined,
      isHalal,
      isAvailable,
    };
    try {
      if (item) await api.updateItem(item.id, body);
      else await api.createItem(body);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={item ? 'Изменить позицию' : 'Новая позиция'} onClose={onClose}>
      <FieldLabel>Название</FieldLabel>
      <Input value={name} onChange={setName} placeholder="Бургер классический" />
      <FieldLabel>Категория</FieldLabel>
      <select
        value={catId}
        onChange={(e) => setCatId(e.target.value)}
        className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-brand-400"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <FieldLabel>Цена, ₽</FieldLabel>
      <Input value={priceRub} onChange={setPriceRub} placeholder="320" inputMode="decimal" />
      <FieldLabel>Описание</FieldLabel>
      <Input value={description} onChange={setDescription} placeholder="Говяжья котлета, сыр, овощи" />
      <div className="mt-3 flex gap-4">
        <Check label="Халяль" checked={isHalal} onChange={setIsHalal} />
        <Check label="Доступно" checked={isAvailable} onChange={setIsAvailable} />
      </div>
      {err && <p className="mt-3 text-xs font-semibold text-danger">{err}</p>}
      <SaveRow busy={busy} onCancel={onClose} onSave={save} />
    </Modal>
  );
}

// ——— Модалка категории ———
function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [icon, setIcon] = useState(category?.iconEmoji ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    if (!name.trim() || !slug.trim()) {
      setErr('Укажите название и slug');
      setBusy(false);
      return;
    }
    const body = { name: name.trim(), slug: slug.trim(), iconEmoji: icon.trim() || undefined, isActive };
    try {
      if (category) await api.updateCategory(category.id, body);
      else await api.createCategory(body);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={category ? 'Изменить категорию' : 'Новая категория'} onClose={onClose}>
      <FieldLabel>Название</FieldLabel>
      <Input value={name} onChange={setName} placeholder="Салаты" />
      <FieldLabel>Slug (латиницей, уникальный)</FieldLabel>
      <Input value={slug} onChange={setSlug} placeholder="salads" />
      <FieldLabel>Иконка (эмодзи)</FieldLabel>
      <Input value={icon} onChange={setIcon} placeholder="🥗" />
      <div className="mt-3">
        <Check label="Показывать на сайте" checked={isActive} onChange={setIsActive} />
      </div>
      {err && <p className="mt-3 text-xs font-semibold text-danger">{err}</p>}
      <SaveRow busy={busy} onCancel={onClose} onSave={save} />
    </Modal>
  );
}

// ——— Мелкие UI ———
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[rgba(44,49,24,0.45)] backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-paper p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-olive-800">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-cream">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 mt-3 block text-xs font-semibold text-ink-soft">{children}</label>;
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'decimal';
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
    />
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-olive-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand-500)]" />
      {label}
    </label>
  );
}

function SaveRow({ busy, onSave, onCancel }: { busy: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="mt-5 flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-ink-soft hover:bg-cream"
      >
        Отмена
      </button>
      <button
        onClick={onSave}
        disabled={busy}
        className="flex-1 rounded-full bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-olive-600 disabled:opacity-50"
      >
        {busy ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </div>
  );
}
