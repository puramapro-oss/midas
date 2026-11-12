import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';

// The two existing development recipes establish their server mode. An explicit
// override supports a separately compiled server; the response never sets expectations.
const cacheByMode = {
  development: ['no-cache', 'no-store'],
  production: ['public', 'immutable', 'no-transform', 'max-age=31536000'],
} as const;

type ImageCase = {
  name: string;
  path: '/api/og' | '/api/story';
  width: number;
  height: number;
  params?: Record<string, string>;
};

const cases: ImageCase[] = [
  { name: 'OG defaults', path: '/api/og', width: 1200, height: 630 },
  {
    name: 'OG accented and XML-like text',
    path: '/api/og',
    width: 1200,
    height: 630,
    params: {
      title: 'Été <titre> & "essai"',
      description: 'Création synthétique : <texte> & "image" de l\'été.',
    },
  },
  { name: 'Story defaults', path: '/api/story', width: 1080, height: 1920 },
  {
    name: 'Story accented label, username and referral text',
    path: '/api/story',
    width: 1080,
    height: 1920,
    params: {
      type: 'achievement',
      label: 'Réussite <test> & "été"',
      username: 'Élodie <test> & "ami"',
      ref: 'essai-été-<&>"',
    },
  },
];

test.describe('Edge image API', () => {
  for (const imageCase of cases) {
    test(imageCase.name, async ({ request, baseURL }, testInfo) => {
      const isolated = process.env.MIDAS_E2E_ISOLATED === '1';
      const knownDevelopmentRecipe = isolated || testInfo.config.webServer?.command === 'npm run dev';
      const mode = process.env.MIDAS_EDGE_IMAGE_MODE ?? (knownDevelopmentRecipe ? 'development' : undefined);
      if (mode !== 'development' && mode !== 'production') {
        throw new Error('Set MIDAS_EDGE_IMAGE_MODE=development or production to match the server.');
      }
      if (!baseURL) throw new Error('The isolated server baseURL is required.');

      const base = new URL(baseURL);
      expect(base.protocol, 'Only the local HTTP fixture server is allowed').toBe('http:');
      if (isolated || process.env.CI) {
        expect(base.hostname, 'CI and isolation require the numeric loopback fixture address').toBe('127.0.0.1');
      } else {
        expect(['127.0.0.1', 'localhost'], 'Local development must stay on loopback').toContain(base.hostname);
      }
      expect(base.username).toBe('');
      expect(base.password).toBe('');

      const target = new URL(imageCase.path, base);
      for (const [name, value] of Object.entries(imageCase.params ?? {})) {
        target.searchParams.set(name, value);
      }

      // Keep the configured APIRequestContext/baseURL. Do not follow redirects
      // to a login page or another origin, and do not mock the image response.
      const response = await request.get(target.pathname + target.search, {
        headers: { accept: 'image/png' },
        maxRedirects: 0,
      });
      try {
        expect(response.url()).toBe(target.href);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']?.split(';')[0].trim().toLowerCase()).toBe('image/png');
        const cache = response.headers()['cache-control'];
        expect(cache, 'The response must preserve the explicit cache contract').toBeDefined();
        expect(cache!.split(',').map(value => value.trim().toLowerCase()).sort())
          .toEqual([...cacheByMode[mode]].sort());

        // Reading the entire body also surfaces asynchronous ImageResponse errors.
        const png = await response.body();
        expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

        // Resolve the decoder owned by the application's Next installation.
        // No new dependency or substitute renderer is needed by this spec.
        const fromTest = createRequire(testInfo.file);
        const fromNext = createRequire(fromTest.resolve('next/package.json'));
        const sharp = fromNext('sharp');
        const decoder = sharp(png, {
          failOn: 'warning',
          limitInputPixels: imageCase.width * imageCase.height,
        });
        expect((await decoder.metadata()).format).toBe('png');
        const { data, info } = await decoder.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        expect(info.width).toBe(imageCase.width);
        expect(info.height).toBe(imageCase.height);
        expect(info.channels).toBe(4);
        expect(data.length).toBe(imageCase.width * imageCase.height * 4);

        // A decoded but empty or uniform canvas is not a successful image render.
        let visible = false;
        let varied = false;
        for (let i = 0; i < data.length && !(visible && varied); i += 4) {
          if (data[i + 3] > 0) visible = true;
          if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2]) {
            varied = true;
          }
        }
        expect(visible && varied, 'The decoded image must contain visible, nonuniform content').toBe(true);
      } finally {
        await response.dispose();
      }
    });
  }
});
