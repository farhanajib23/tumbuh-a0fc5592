<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep the module registry in `src/lib/modules.ts` as the shared source for navigation and module previews so availability remains consistent.
- Keep the shared application shell in `src/components/tumbuh/app-shell.tsx` and module placeholders under `/modul/$module` so later modules can be introduced independently.
- Centralize candidate palette and light/dark theme roles in `src/styles.css` so visual updates do not require feature edits.
- Keep phase-one screens UI-only with explicit empty and unavailable states; do not persist personal input or simulate user records.
