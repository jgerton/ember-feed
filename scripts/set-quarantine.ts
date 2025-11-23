import { prisma } from '../lib/db'

async function setQuarantine() {
  const result = await prisma.rssFeed.update({
    where: { id: 'cmi98lrxa0000qd0ty08n29oq' },
    data: {
      status: 'quarantined',
      consecutiveFailures: 10,
      updatedAt: new Date()
    }
  })

  console.log('Feed updated to quarantine:', result)
  await prisma.$disconnect()
}

setQuarantine().catch(console.error)
