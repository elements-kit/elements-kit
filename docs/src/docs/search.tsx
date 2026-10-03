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
} from "fumadocs-ui/components/dialog/search"
import { useEffect, useRef, useState } from "react"
import { loadPagefind } from "./pagefind"

export function PagefindDialog(props: SharedProps) {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<SearchItemType[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const queryId = useRef(0)

  useEffect(() => {
    if (props.open)
      void loadPagefind().then((pf) => setUnavailable(pf === null))
  }, [props.open])

  useEffect(() => {
    if (search.length === 0) {
      setItems(null)
      return
    }

    const id = ++queryId.current
    setIsLoading(true)
    const timer = setTimeout(async () => {
      const pagefind = await loadPagefind()
      if (!pagefind || id !== queryId.current) return

      const { results } = await pagefind.search(search)
      const resolved = await Promise.all(
        results.slice(0, 8).map(async (result) => {
          const data = await result.data()
          return [
            {
              id: `${result.id}-page`,
              type: "page",
              content: data.meta.title ?? data.url,
              url: data.url,
            },
            {
              id: `${result.id}-excerpt`,
              type: "text",
              content: data.excerpt.replace(/<[^>]+>/g, ""),
              url: data.url,
            },
          ] satisfies SearchItemType[]
        }),
      )
      if (id !== queryId.current) return
      setItems(resolved.flat())
      setIsLoading(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [search])

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
  )
}
