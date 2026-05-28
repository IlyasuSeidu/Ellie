#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const dns = require('node:dns').promises;
const https = require('node:https');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const APPLE_SEARCH_URL =
  'https://itunes.apple.com/search?term=Ryvro&entity=software&country=us&limit=20';
const PLAY_SEARCH_URL = 'https://play.google.com/store/search?q=Ryvro&c=apps&hl=en_US&gl=US';
const USPTO_SEARCH_URL = 'https://tmsearch.uspto.gov/';

const DOMAIN_CANDIDATES = [
  'getryvro.com',
  'ryvro.com',
  'ryvro.app',
  'ryvro.co',
  'ryvro.io',
  'ryvro.ai',
  'ryvro.net',
  'ryvro.org',
  'useryvro.com',
];

const SOCIAL_URLS = [
  'https://x.com/ryvro',
  'https://www.instagram.com/ryvro/',
  'https://www.tiktok.com/@ryvro',
  'https://www.youtube.com/@ryvro',
  'https://www.linkedin.com/company/ryvro',
];

function get(url, { accept = '*/*', timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    const request = https.get(
      url,
      {
        headers: {
          accept,
          'user-agent': 'RyvroLaunchAudit/1.0 (+https://getryvro.com)',
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 400,
            status: response.statusCode,
            finalUrl: response.headers.location || url,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });
    request.on('error', (error) => {
      resolve({ ok: false, status: 0, finalUrl: url, body: '', error: error.message });
    });
  });
}

async function checkApple() {
  const response = await get(APPLE_SEARCH_URL, { accept: 'application/json' });
  if (!response.ok) {
    return { ok: false, status: response.status, error: response.error || 'Apple search failed' };
  }

  const payload = JSON.parse(response.body);
  const exactMatches = payload.results
    .filter(
      (result) =>
        /^ryvro$/i.test(result.trackName || '') ||
        /^ryvro shift planner$/i.test(result.trackName || '')
    )
    .map((result) => ({
      trackName: result.trackName,
      sellerName: result.sellerName,
      bundleId: result.bundleId,
      url: result.trackViewUrl,
    }));

  return {
    ok: exactMatches.length === 0,
    resultCount: payload.resultCount,
    exactMatches,
    sampleResults: payload.results.slice(0, 8).map((result) => ({
      trackName: result.trackName,
      sellerName: result.sellerName,
      bundleId: result.bundleId,
    })),
  };
}

async function checkPlay() {
  const response = await get(PLAY_SEARCH_URL, { accept: 'text/html' });
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: response.error || 'Google Play search failed',
    };
  }

  const containsExactText = /Ryvro Shift Planner|>Ryvro</i.test(response.body);
  const visibleNameMatches = [
    ...new Set(
      [...response.body.matchAll(/<span[^>]*>([^<]{2,80})<\/span>/g)]
        .map((match) => match[1])
        .filter((value) => /ryv|rydo|ryvo|ryver|ryvro/i.test(value))
    ),
  ].slice(0, 20);

  return {
    ok: !containsExactText,
    containsExactText,
    visibleNameMatches,
  };
}

async function checkDomain(domain) {
  let records = [];
  try {
    records = await dns.resolve(domain);
  } catch (error) {
    if (!['ENODATA', 'ENOTFOUND', 'ENODOMAIN'].includes(error.code)) {
      return { domain, ok: false, records: [], error: error.code || error.message };
    }
  }

  let whois = null;
  if (domain.endsWith('.com')) {
    try {
      const result = await execFileAsync(
        'whois',
        ['-h', 'whois.verisign-grs.com', `=${domain.toUpperCase()}`],
        {
          timeout: 15000,
          maxBuffer: 1024 * 128,
        }
      );
      whois = result.stdout.includes('No match for domain')
        ? 'no-match'
        : result.stdout
            .split('\n')
            .filter((line) =>
              /Domain Name:|Registrar:|Name Server:|Registry Expiry Date:|Creation Date:/i.test(
                line
              )
            )
            .map((line) => line.trim());
    } catch (error) {
      whois = `error: ${error.message}`;
    }
  }

  return {
    domain,
    ok: records.length === 0 && (whois === null || whois === 'no-match'),
    records,
    whois,
  };
}

async function checkSocial(url) {
  const response = await get(url, { accept: 'text/html', timeoutMs: 15000 });
  return {
    url,
    status: response.status,
    ok: response.status === 404,
    note:
      response.status === 404
        ? 'Public 404; still reserve directly while logged in.'
        : 'Not reliable availability proof; reserve directly while logged in.',
  };
}

async function checkUsptoReachability() {
  const response = await get(USPTO_SEARCH_URL, { accept: 'text/html' });
  return {
    ok: response.ok && /Trademark search|Search trademarks|searchbar/i.test(response.body),
    status: response.status,
    note: 'This only verifies the official USPTO search app is reachable. Complete exact Ryvro search in browser or with counsel before launch.',
  };
}

async function main() {
  const [apple, play, uspto, domains, socials] = await Promise.all([
    checkApple(),
    checkPlay(),
    checkUsptoReachability(),
    Promise.all(DOMAIN_CANDIDATES.map(checkDomain)),
    Promise.all(SOCIAL_URLS.map(checkSocial)),
  ]);

  const report = {
    checkedAt: new Date().toISOString(),
    brand: 'Ryvro',
    publicChecksOnly: true,
    apple,
    googlePlay: play,
    uspto,
    domains,
    socials,
    requiredManualChecks: [
      'Formal trademark/legal clearance in launch markets',
      'App Store Connect name reservation',
      'Google Play Console title and package reservation',
      'Domain registrar purchase/reservation',
      'Logged-in social handle reservation',
    ],
  };

  console.log(JSON.stringify(report, null, 2));

  const hardConflict =
    apple.exactMatches?.length > 0 ||
    play.containsExactText ||
    domains.some(
      (entry) => ['getryvro.com', 'useryvro.com'].includes(entry.domain) && entry.records.length > 0
    );

  process.exitCode = hardConflict ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
