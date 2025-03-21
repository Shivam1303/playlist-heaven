import NextAuth, { AuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const scope = [
    "user-read-email",
    "playlist-modify-public",
    "user-top-read",
    "user-read-recently-played",
    "user-library-read",
    "user-follow-read",
    "playlist-read-private",
    "playlist-read-collaborative"
].join(" ");

export const authOptions: AuthOptions = {
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID || "",
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
            authorization: {
                params: { scope },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }

            // Return previous token if the access token has not expired yet
            if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
                return token;
            }

            // Access token has expired, try to refresh it
            if (token.refreshToken) {
                try {
                    const response = await fetch('https://accounts.spotify.com/api/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${Buffer.from(
                                `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                            ).toString('base64')}`,
                        },
                        body: new URLSearchParams({
                            grant_type: 'refresh_token',
                            refresh_token: token.refreshToken as string,
                        }),
                    });

                    const refreshedTokens = await response.json();

                    if (!response.ok) {
                        console.error("Failed to refresh token:", refreshedTokens);
                        return token;
                    }

                    console.log("Token refreshed successfully");

                    return {
                        ...token,
                        accessToken: refreshedTokens.access_token,
                        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
                        expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
                    };
                } catch (error) {
                    console.error("Error refreshing access token", error);
                    return { ...token, error: "RefreshAccessTokenError" };
                }
            }

            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            if (token.error) {
                session.error = token.error as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/",
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };