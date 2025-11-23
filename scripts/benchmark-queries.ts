import { prisma } from '../lib/db'

async function benchmarkFeedLoad() {
  const iterations = 10
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    await prisma.article.findMany({
      orderBy: [
        { score: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: 50
    })

    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  return { avg, min, max, times }
}

async function benchmarkUserActivityByArticle() {
  const iterations = 10
  const times: number[] = []

  // Get a sample article ID
  const article = await prisma.article.findFirst()
  if (!article) {
    console.log('⚠️  No articles found for UserActivity benchmark')
    return null
  }

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    await prisma.userActivity.findMany({
      where: { articleId: article.id },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  return { avg, min, max, times }
}

async function benchmarkLogEntriesByType() {
  const iterations = 10
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    await prisma.logEntry.findMany({
      where: { type: 'discovery' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const end = performance.now()
    times.push(end - start)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)

  return { avg, min, max, times }
}

async function runBenchmarks() {
  console.log('🔍 Running Query Performance Benchmarks...\n')

  // Get row counts
  const articleCount = await prisma.article.count()
  const activityCount = await prisma.userActivity.count()
  const logCount = await prisma.logEntry.count()

  console.log('📊 Database Stats:')
  console.log(`   Articles: ${articleCount}`)
  console.log(`   User Activities: ${activityCount}`)
  console.log(`   Log Entries: ${logCount}\n`)

  // Feed load benchmark
  console.log('1️⃣  Feed Load Query (score DESC, publishedAt DESC, LIMIT 50)')
  const feedResults = await benchmarkFeedLoad()
  console.log(`   Average: ${feedResults.avg.toFixed(2)}ms`)
  console.log(`   Min: ${feedResults.min.toFixed(2)}ms`)
  console.log(`   Max: ${feedResults.max.toFixed(2)}ms`)
  console.log(`   ${feedResults.avg < 100 ? '✅' : '❌'} Target: < 100ms\n`)

  // User activity benchmark
  console.log('2️⃣  User Activity by Article (WHERE articleId, ORDER BY timestamp DESC, LIMIT 50)')
  const activityResults = await benchmarkUserActivityByArticle()
  if (activityResults) {
    console.log(`   Average: ${activityResults.avg.toFixed(2)}ms`)
    console.log(`   Min: ${activityResults.min.toFixed(2)}ms`)
    console.log(`   Max: ${activityResults.max.toFixed(2)}ms\n`)
  }

  // Log entries benchmark
  console.log('3️⃣  Log Entries by Type (WHERE type="discovery", ORDER BY createdAt DESC, LIMIT 50)')
  const logResults = await benchmarkLogEntriesByType()
  console.log(`   Average: ${logResults.avg.toFixed(2)}ms`)
  console.log(`   Min: ${logResults.min.toFixed(2)}ms`)
  console.log(`   Max: ${logResults.max.toFixed(2)}ms\n`)

  await prisma.$disconnect()

  return {
    feedLoad: feedResults,
    userActivity: activityResults,
    logEntries: logResults,
    stats: { articleCount, activityCount, logCount }
  }
}

runBenchmarks().catch(console.error)
