import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'gw-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model('');
  readonly type = input<'text' | 'email'>('text');
  readonly multiline = input(false);
  readonly rows = input(5);
  readonly required = input(false);
  readonly readonly = input(false);
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly help = input<string | null>(null);
  readonly error = input<string | null>(null);

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('control');

  protected readonly helpId = computed(() => `${this.fieldId()}-help`);
  protected readonly errorId = computed(() => `${this.fieldId()}-error`);
  protected readonly describedBy = computed(() => {
    const ids = [this.help() ? this.helpId() : null, this.error() ? this.errorId() : null].filter(
      Boolean,
    );
    return ids.length > 0 ? ids.join(' ') : null;
  });

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }
}
