import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import spotifyWebApi, { LOGIN_URL } from "@/lib/spotify"

async function refreshAccessToken(token){
    try{
        spotifyWebApi.setAccessToken(token.accessToken);
        spotifyWebApi.setRefreshToken(token.refreshToken);

        const { body: refreshedToken } =  await spotifyWebApi.refreshAccessToken();
        return{
                ...token,
                accessToken: refreshedToken.access_token,
                accessTokenExpires: Date.now() + refreshedToken.expires_at * 1000,
                refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
            }

    }catch(error){
        console.error("refreshAccessToken Function", error);
        return {
            ...token,
            error: 'RefreshAccessTokenError'
        }
    }
}

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        authorization: LOGIN_URL
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages:{
    signIn: '/'
  },
  callbacks:{
    async jwt({ token, account, user}){
        if(account && user){
            return{
                ...token,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                username: account.providerAccountId,
                accessTokenExpires: account.expires_at * 1000,
            }
        }

        if(Date.now() < token.accessTokenExpires){
            return token;
        }

        return await refreshAccessToken(token);
    },

    async session({session, token}){
        session.user.accessToken = token.accessToken;
        session.user.refreshToken = token.refreshToken;
        session.user.username = token.username;

        return session;
    }
  }
});