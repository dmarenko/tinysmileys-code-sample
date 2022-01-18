import { SignIn } from './DOM'

declare global {
	interface Window {
		gapi: any,
		FB: any
		// [key: string]: any;
	}
}

export interface AuthCallbacks {
	OnGuest: () => void
	OnMember: () => void
}

type Provider = 'google' | 'facebook' | 'guest'

let currentProvider: Provider = 'guest'

const LoadGoogleApi = (OnSignInCallback: () => void) => {
	return new Promise<boolean>((resolve, reject) => {
		window['gapi']['load']('auth2', () => {
			const auth2 = window['gapi']['auth2']['init']({
				'client_id': '826309562216-kccq6buglsjmvvk1gci63f7p8e3h62i9.apps.googleusercontent.com'
			}).then(() => {
				const signedIn: boolean = window['gapi']['auth2']['getAuthInstance']()['isSignedIn']['get']()
				if (signedIn) {
					resolve(true)
					currentProvider = 'google'
					OnSignInCallback()
				} else {
					resolve(false)
					window['gapi']['signin2']['render'](SignIn.GoogleSignInContainer.id, {
						'scope': 'profile',
						'fetch_basic_profile': false,
						'width': 300,
						'height': 40,
						'longtitle': true,
						'theme': 'dark',
						'onsuccess': (googleUser: any) => {
							currentProvider = 'google'
							OnSignInCallback()
						},
						'onfailure': () => {
							
						}
					})
				}
			})
		})
	})
}

const LoadFacebookApi = (OnSignInCallback: () => void) => {
	return new Promise<boolean>((resolve, reject) => {
		window['FB']['init']({
			'appId': '486435112232760',
			'autoLogAppEvents': true,
			'xfbml': false,
			'version': 'v6.0'
		})

		window['FB']['getLoginStatus']((response: any) => {
			if (response['status'] == 'connected') {
				resolve(true)
				currentProvider = 'facebook'
				OnSignInCallback()
			} else {
				resolve(false)
				const statusChangeHandler = (response: any) => {
					if (response['status'] == 'connected') {
						window['FB']['Event']['unsubscribe']('auth.statusChange', statusChangeHandler)
						currentProvider = 'facebook'
						OnSignInCallback()
					}
				}
				window['FB']['Event']['subscribe']('auth.statusChange', statusChangeHandler)
			}
		}, true)
		
		const el = document.createElement('div')
		el.className = 'fb-login-button'
		el.dataset['scope'] = 'public_profile'
		el.dataset['width'] = '300'
		el.dataset['size'] = 'large'
		el.dataset['buttonType'] = 'login_with'
		el.dataset['layout'] = 'default'
		el.dataset['autoLogoutLink'] = 'false'
		el.dataset['useContinueAs'] = 'false'
		SignIn.FacebookSignInContainer.appendChild(el)
		window['FB']['XFBML']['parse'](SignIn.FacebookSignInContainer)
	})
}

const Init = (callbacks: AuthCallbacks) => {
	Promise.all([LoadGoogleApi(callbacks.OnMember), LoadFacebookApi(callbacks.OnMember)]).then(loaded => {
		const allSignedOut = loaded.every(signedIn => !signedIn)
		if (allSignedOut) {
			callbacks.OnGuest()
		}
	})
}

const GetToken = () => {
	if (currentProvider == 'google') {
		return 'google_' + window['gapi']['auth2']['getAuthInstance']()['currentUser']['get']()['getAuthResponse']()['id_token']
	} else if (currentProvider == 'facebook') {
		return 'facebook_' + window['FB']['getAccessToken']()
	}
	return null
}

const SignOut = () => {
	const token = GetToken()
	if (token != null) {
		if (token.startsWith('google')) {
			window['gapi']['auth2']['getAuthInstance']()['signOut']().then(() => {
				window.location.reload()
			})
		} else if (token.startsWith('facebook')) {
			window['FB']['logout'](() => {
				window.location.reload()
			})
		}
	} else {
		window.location.reload()
	}
}

export default {
	Init,
	GetToken,
	SignOut
}