// google-sign-in-service.ts — Google Sign-In via @react-native-google-signin/google-signin v16
//
// Uses the official Google Sign-In library (the Expo-recommended approach).
// Requires a development build because it uses native modules.
//
// Configuration — register these in Google Cloud Console:
//   webClientId   — OAuth 2.0 client (Web application type) for id_token
//   iosClientId   — OAuth 2.0 iOS client (iOS application type)
//   androidClientId — OAuth 2.0 Android client (Android application type)
//
// The Google idToken returned by signIn() is exchanged for a Soostori cloud
// session by cloudExchangeGoogleToken() in cloud-auth-backend.ts.

import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  type SignInResponse,
} from '@react-native-google-signin/google-signin'
import Constants from 'expo-constants'

export interface GoogleUser {
  idToken: string
  user: {
    name: string
    email: string
    photoUrl: string
  }
}

/** Read Google OAuth client IDs from the native config plugin in app.json. */
function getGoogleClientIds(): { webClientId: string; iosClientId?: string } {
  const config = (Constants.expoConfig?.extra as Record<string, unknown>)?.googleSignIn as
    | { webClientId?: string; iosClientId?: string }
    | undefined

  const webClientId = config?.webClientId ?? ''
  if (!webClientId) {
    throw new Error(
      'Missing Google OAuth webClientId. ' +
      'Add it to app.json plugins: [["@react-native-google-signin/google-signin", { "webClientId": "..." }]]'
    )
  }
  return { webClientId, iosClientId: config?.iosClientId }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Signs in with Google using the native Google Sign-In flow.
 *
 * On Android: opens Google One Tap / Credential Manager in a Chrome Custom Tab.
 * On iOS: opens ASWebAuthenticationSession with a Safari View Controller.
 *
 * Returns a GoogleUser containing the Google idToken, which is then exchanged
 * for a Soostori cloud session by cloudExchangeGoogleToken().
 *
 * Throws if the user cancels, if Google Play Services are unavailable,
 * or if the sign-in otherwise fails.
 */
export async function signInWithGoogle(): Promise<GoogleUser> {
  const { webClientId, iosClientId } = getGoogleClientIds()

  GoogleSignin.configure({
    webClientId,
    iosClientId,
    scopes: ['openid', 'email', 'profile'],
  })

  const hasPlayServices = await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  })
  if (!hasPlayServices) {
    throw new Error('Google Play Services are not available on this device')
  }

  const response: SignInResponse = await GoogleSignin.signIn()

  if (isCancelledResponse(response)) {
    throw new Error('Google sign-in was cancelled')
  }

  if (!isSuccessResponse(response)) {
    throw new Error('Google sign-in failed with an unexpected response')
  }

  const { data } = response
  const idToken = data.idToken
  if (!idToken) {
    throw new Error('Google sign-in succeeded but returned no idToken')
  }

  return {
    idToken,
    user: {
      name: data.user.name ?? '',
      email: data.user.email,
      photoUrl: data.user.photo ?? '',
    },
  }
}

/**
 * Returns the currently cached Google user without a interactive sign-in.
 * Returns null if no user is cached (no prior sign-in this session).
 */
export async function getGoogleUser(): Promise<GoogleUser | null> {
  try {
    const { webClientId } = getGoogleClientIds()
    GoogleSignin.configure({ webClientId })
    const user = await GoogleSignin.getCurrentUser()
    if (!user?.idToken) return null

    return {
      idToken: user.idToken,
      user: {
        name: user.user.name ?? '',
        email: user.user.email,
        photoUrl: user.user.photo ?? '',
      },
    }
  } catch {
    return null
  }
}

/**
 * Signs out of Google. Clears the cached session locally.
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut()
  } catch {
    // Best-effort — ignore if not signed in
  }
}
