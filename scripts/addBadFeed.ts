import { prisma } from '../lib/db'

async function addBadFeed() {
  const badFeed = await prisma.rssFeed.create({
    data: {
      name: 'Bad Feed (Test)',
      url: 'https://invalid-url-that-does-not-exist.example.com/rss',
      priority: 50,
      status: 'active'
    }
  })

  console.log('Added bad feed for testing:', badFeed)
}

addBadFeed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
