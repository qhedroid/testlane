import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyCredentials } from '@testlane/db/auth/verify-credentials'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await verifyCredentials(credentials.email, credentials.password)
        if (!user) return null
        return { id: user.id, name: user.name, email: user.email, globalRole: user.globalRole }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id
        token.globalRole = (user as { globalRole: string }).globalRole
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string; globalRole?: string }).id = token.id as string
        ;(session.user as { id?: string; globalRole?: string }).globalRole =
          token.globalRole as string
      }
      return session
    },
  },
}
