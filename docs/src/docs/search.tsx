/** @jsxImportSource react */
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useEffect, useState } from "react";
import { loadPagefind, searchPagefind } from "./pagefind";

export default function PagefindDialog(props: SharedProps) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SearchItemType[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (props.open)
      void loadPagefind().then((pf) => setUnavailable(pf === null));
  }, [props.open]);

  useEffect(() => {
    setIsLoading(search.length > 0);
    if (search.length === 0) {
      setItems(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const hits = await searchPagefind(search);
        if (cancelled) return;
        setItems(
          hits.flatMap(({ id, hit }) => [
            {
              id: `${id}-page`,
              type: "page",
              content: hit.meta.title ?? hit.url,
              url: hit.url,
            },
            {
              id: `${id}-excerpt`,
              type: "text",
              content: hit.excerpt.replace(/<[^>]+>/g, ""),
              url: hit.url,
            },
          ]),
        );
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={items}
          Empty={() => (
            <div className="py-12 text-center text-sm text-fd-muted-foreground">
              {unavailable
                ? "Search is available in production builds only."
                : "No results found."}
            </div>
          )}
        />
      </SearchDialogContent>
    </SearchDialog>
  );
}
