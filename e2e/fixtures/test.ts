import { test as base, expect } from '@playwright/test';
import { HomePage } from '../page-objects/home-page';
import { FakeApi } from './fake-api';

interface Fixtures {
  api: FakeApi;
  home: HomePage;
}

export const test = base.extend<Fixtures>({
  api: async ({ context, baseURL }, use) => {
    const api = new FakeApi();
    await api.install(context, new URL(baseURL ?? 'http://localhost:4200').origin);
    await use(api);
    expect(api.unrouted, 'requests the fake backend did not recognise').toEqual([]);
  },
  home: async ({ page, api }, use) => {
    void api;
    await use(new HomePage(page));
  },
});

export { expect };
