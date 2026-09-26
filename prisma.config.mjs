import 'dotenv/config'

const config = {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.NOTES_DATABASE_URL,
  },
}

export default config
