import { prisma } from '../lib/db'

async function checkAnalytics() {
  console.log('📊 Checking Analytics Data...\n')

  const activities = await prisma.userActivity.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5,
    include: {
      article: {
        select: {
          title: true,
          source: true
        }
      }
    }
  })

  console.log(`Found ${activities.length} recent activities:\n`)

  activities.forEach((activity, index) => {
    console.log(`${index + 1}. Action: ${activity.action}`)
    console.log(`   Article: ${activity.article.title.substring(0, 60)}...`)
    console.log(`   Source: ${activity.article.source}`)
    console.log(`   Duration: ${activity.durationSeconds ? `${activity.durationSeconds}s` : 'N/A'}`)
    console.log(`   Scroll: ${activity.scrollPercentage !== null ? `${activity.scrollPercentage}%` : 'N/A'}`)
    console.log(`   Time: ${activity.timestamp.toLocaleString()}`)
    console.log('')
  })

  await prisma.$disconnect()
}

checkAnalytics().catch(console.error)
