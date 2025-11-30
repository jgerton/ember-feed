import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://ember:ember_dev@localhost:5432/ember_feed',
  },
})
