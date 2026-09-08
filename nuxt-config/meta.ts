const baseUrl = process.env.VITE_BASE_URL || 'https://zecperps.app'

export const metaTags = {
  title: process.env.VITE_NAME
    ? process.env.VITE_NAME
    : 'ZEC Perps | Trade Zcash Perpetual Futures',
  description:
    'Trade Zcash (ZEC) perpetual futures, long and short, on an on-chain central-limit order book powered by Injective.',
  keywords:
    'zcash, zec, zec perps, perpetual futures, perpetuals, injective, decentralized exchange, dex, derivatives, on-chain order book, crypto trading, long short',
  author: 'ZEC Perps',
  url: baseUrl,
  shortName: 'ZEC Perps',
  twitterHandle: '',
  ogImage: `${baseUrl}/images/og.jpeg`
}

export const nuxtMetaTags = [
  {
    hid: 'og:url',
    property: 'og:url',
    content: `${process.env.VITE_BASE_URL}`
  },
  { hid: 'keywords', name: 'keywords', content: metaTags.keywords },
  { hid: 'description', name: 'description', content: metaTags.description },
  { hid: 'author', name: 'author', content: metaTags.author },
  { hid: 'og:type', property: 'og:type', content: 'exchange' },
  {
    hid: 'og:image',
    property: 'og:image',
    content: metaTags.ogImage
  },
  {
    hid: 'og:description',
    property: 'og:description',
    content: metaTags.description
  },
  {
    hid: 'twitter:card',
    property: 'twitter:card',
    content: 'summary_large_image'
  },
  {
    hid: 'twitter:site',
    property: 'twitter:site',
    content: metaTags.twitterHandle
  },
  {
    name: 'twitter:image',
    content: metaTags.ogImage
  },
  {
    hid: 'twitter:creator',
    property: 'twitter:creator',
    content: metaTags.twitterHandle
  },
  {
    hid: 'twitter:description',
    property: 'twitter:description',
    content: metaTags.description
  },
  {
    hid: 'twitter:title',
    property: 'twitter:title',
    content: metaTags.title
  },
  { hid: 'og:title', property: 'og:title', content: metaTags.title },
  { hid: 'og:site_name', property: 'og:site_name', content: metaTags.title },
  { hid: 'title', property: 'title', content: metaTags.title },
]

export const pwaMetaTags = {
  name: metaTags.title,
  description: metaTags.description,
  ogSiteName: metaTags.title,
  ogTitle: metaTags.title,
  ogDescription: metaTags.description,
  ogHost: metaTags.url,
  ogUrl: metaTags.url,
  ogImage: metaTags.ogImage,
  twitterCard: 'summary_large_image',
  twitterSite: '',
  twitterCreator: ''
}

export const manifestMetaTags = {
  name: metaTags.title,
  description: metaTags.description,
  short_name: metaTags.shortName
}
