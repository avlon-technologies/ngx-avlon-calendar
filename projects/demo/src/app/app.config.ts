import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideAvlonCalendar } from 'ngx-avlon-calendar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),

    // House style for every picker in the app. Each option is also a component
    // input, so any single field can still opt out.
    provideAvlonCalendar({
      displayFormat: 'MM/dd/yyyy',
      iconPosition: 'right',
      clearable: true,
      theme: 'av-theme-default',
    }),
  ],
};
