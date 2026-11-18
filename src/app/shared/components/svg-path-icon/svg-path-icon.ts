import { Component, input } from '@angular/core';
import type { parseSvgPathIcon } from '../../utils/svg-path-icon';

@Component({
  selector: 'tp-svg-path-icon',
  host: { 'aria-hidden': 'true' },
  styles: ':host{display:inline-flex;flex:none;width:1.25rem;height:1.25rem} svg{width:100%;height:100%;display:block}',
  template: `
    @if (icon(); as image) {
      <svg [attr.viewBox]="image.viewBox" focusable="false">
        @for (path of image.paths; track $index) {
          <path [attr.d]="path.d" [attr.fill]="path.fill" [attr.stroke]="path.stroke"
            [attr.fill-rule]="path.fillRule" [attr.stroke-width]="path.strokeWidth"
            [attr.stroke-linecap]="path.lineCap" [attr.stroke-linejoin]="path.lineJoin" />
        }
      </svg>
    }
  `,
})
export class SvgPathIcon {
  readonly icon = input.required<NonNullable<ReturnType<typeof parseSvgPathIcon>>>();
}
