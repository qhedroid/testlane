import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id: string
      globalRole: string
    }
  }

  interface User {
    id: string
    globalRole: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    globalRole: string
  }
}
