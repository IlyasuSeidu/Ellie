/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const storeKitConfig = {
  identifier: '9f1a7c6a-7a24-44d8-bd7c-7d49a5b98a74',
  nonConsumables: [],
  nonRenewingSubscriptions: [],
  products: [],
  settings: {
    _askToBuyEnabled: false,
    _billingGracePeriodEnabled: false,
    _billingRetryEnabled: false,
    _interruptedPurchasesEnabled: false,
    _locale: 'en_US',
    _storefront: 'USA',
  },
  subscriptionGroups: [
    {
      id: '22156776',
      localizations: [
        {
          description: 'Voice shift assistant access.',
          displayName: 'Ryvro Pro',
          locale: 'en_US',
        },
      ],
      name: 'Ryvro Pro',
      subscriptions: [
        {
          adHocOffers: [],
          codeOffers: [],
          displayPrice: '6.99',
          familyShareable: false,
          groupNumber: 1,
          internalID: '6780186030',
          introductoryOffer: null,
          localizations: [
            {
              description: 'Monthly schedule tools and assistant access.',
              displayName: 'Ryvro Pro Monthly',
              locale: 'en_US',
            },
          ],
          productID: 'ryvro_pro_monthly',
          recurringSubscriptionPeriod: 'P1M',
          referenceName: 'Ryvro Pro Monthly',
          subscriptionGroupID: '22156776',
          type: 'RecurringSubscription',
        },
        {
          adHocOffers: [],
          codeOffers: [],
          displayPrice: '49.99',
          familyShareable: false,
          groupNumber: 2,
          internalID: '6780186069',
          introductoryOffer: null,
          localizations: [
            {
              description: 'Full-year schedule tools and assistant access.',
              displayName: 'Ryvro Pro Annual',
              locale: 'en_US',
            },
          ],
          productID: 'ryvro_pro_annual',
          recurringSubscriptionPeriod: 'P1Y',
          referenceName: 'Ryvro Pro Annual',
          subscriptionGroupID: '22156776',
          type: 'RecurringSubscription',
        },
      ],
    },
  ],
  version: {
    major: 4,
    minor: 0,
  },
};

const schemeStoreKitReference = `      <StoreKitConfigurationFileReference
         identifier = "../RyvroShiftPlanner/RyvroPro.storekit">
      </StoreKitConfigurationFileReference>
`;

function ensureSchemeStoreKitReference(schemePath) {
  if (!fs.existsSync(schemePath)) {
    return;
  }

  const scheme = fs.readFileSync(schemePath, 'utf8');
  if (scheme.includes('RyvroPro.storekit')) {
    return;
  }

  const marker = '      <BuildableProductRunnable';
  if (!scheme.includes(marker)) {
    throw new Error(`Could not find Xcode launch action marker in ${schemePath}`);
  }

  fs.writeFileSync(schemePath, scheme.replace(marker, `${schemeStoreKitReference}${marker}`));
}

module.exports = function withRyvroStoreKitConfig(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const storeKitPath = path.join(iosRoot, 'RyvroShiftPlanner', 'RyvroPro.storekit');
      const schemePath = path.join(
        iosRoot,
        'RyvroShiftPlanner.xcodeproj',
        'xcshareddata',
        'xcschemes',
        'RyvroShiftPlanner.xcscheme'
      );

      fs.mkdirSync(path.dirname(storeKitPath), { recursive: true });
      fs.writeFileSync(storeKitPath, `${JSON.stringify(storeKitConfig, null, 2)}\n`);
      ensureSchemeStoreKitReference(schemePath);

      return modConfig;
    },
  ]);
};
