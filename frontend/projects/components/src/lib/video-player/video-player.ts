import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gw-video-player',
  templateUrl: './video-player.html',
  styleUrl: './video-player.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayer {
  readonly src = input.required<string>();
  readonly poster = input.required<string>();
  readonly label = input.required<string>();
  readonly captionsSrc = input<string>();
}
