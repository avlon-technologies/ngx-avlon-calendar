import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/**
 * A demo example with a preview tab and a source tab.
 *
 * Every calendar example on the page is wrapped in one of these, so the markup
 * that produced what you are looking at is always one click away rather than
 * something you have to go and find in the repository.
 */
@Component({
  selector: 'demo-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800' },
  template: `
    <header class="flex items-start justify-between gap-4 px-5 pt-5">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">{{ heading() }}</h3>
        <p class="mt-1.5 text-[0.8rem] leading-relaxed text-slate-600 dark:text-slate-400">
          <ng-content select="[blurb]" />
        </p>
      </div>

      <div
        role="tablist"
        [attr.aria-label]="heading() + ' view'"
        class="flex shrink-0 gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"
      >
        @for (t of tabs; track t) {
          <button
            type="button"
            role="tab"
            [id]="tabId(t)"
            [attr.aria-selected]="tab() === t"
            [attr.aria-controls]="panelId(t)"
            [attr.tabindex]="tab() === t ? 0 : -1"
            class="rounded-md px-2.5 py-1 text-[0.72rem] font-medium capitalize transition-colors"
            [class]="
              tab() === t
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            "
            (click)="tab.set(t)"
            (keydown)="onTabKeydown($event)"
          >
            {{ t }}
          </button>
        }
      </div>
    </header>

    <div class="flex-1 p-5">
      <div
        role="tabpanel"
        [id]="panelId('preview')"
        [attr.aria-labelledby]="tabId('preview')"
        [hidden]="tab() !== 'preview'"
      >
        <ng-content />
      </div>

      <div
        role="tabpanel"
        [id]="panelId('code')"
        [attr.aria-labelledby]="tabId('code')"
        [hidden]="tab() !== 'code'"
      >
        <pre
          class="max-h-96 overflow-auto rounded-xl bg-slate-900 p-4 font-mono text-[0.72rem] leading-[1.7] text-slate-300"
        ><code>{{ code() }}</code></pre>
      </div>
    </div>

    <footer class="px-5 pb-5">
      <ng-content select="[footer]" />
    </footer>
  `,
})
export class DemoExample {
  readonly heading = input.required<string>();

  /** The markup this example renders, shown verbatim under the source tab. */
  readonly code = input.required<string>();

  protected readonly tabs = ['preview', 'code'] as const;
  protected readonly tab = signal<'preview' | 'code'>('preview');

  private readonly slug = computed(() =>
    this.heading()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  );

  protected tabId(name: string): string {
    return `${this.slug()}-tab-${name}`;
  }

  protected panelId(name: string): string {
    return `${this.slug()}-panel-${name}`;
  }

  /** Left and right move between tabs, as the tablist pattern expects. */
  protected onTabKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.tab.update((current) => (current === 'preview' ? 'code' : 'preview'));
  }
}
