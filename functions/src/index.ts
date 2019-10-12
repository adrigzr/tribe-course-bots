import * as functions from 'firebase-functions';
import { dialogflow, Confirmation, SignIn, GoogleActionsV2SignInValue } from 'actions-on-google';
import admin = require('firebase-admin');

interface UserStorage {
    color: string;
}

function sentence(acc: string, str: string): string {
    return `${acc}<s>${str}</s>`;
}

function format(...strs: string[]): string {
    return `
	<speak>
	    <prosody rate="115%" pitch="2st">
		<p>
		    ${strs.reduce(sentence, '')}
		</p>
	    </prosody>
	</speak>`;
}

async function getStorage(sub: string): Promise<UserStorage | undefined> {
  const snapshop = await admin.firestore().collection('colors').doc(sub).get();

  return snapshop.data() as UserStorage;
}

async function setStorage(sub: string, storage: UserStorage): Promise<void> {
    await admin.firestore().collection('colors').doc(sub).set(storage);
}

const app = dialogflow<UserStorage, UserStorage>({
    debug: true,
    clientId: '1013058958511-8nm0hp4prv7fslm0v0nh6jb3409dg47d.apps.googleusercontent.com'
});

admin.initializeApp({
    credential: admin.credential.cert(require('../config/auth.json')),
    databaseURL: 'https://tribe-course-bots.firebaseio.com'
});

app.intent('welcome', conv => {
    if (conv.user.profile.payload && conv.user.profile.payload.given_name) {
	conv.ask(format(`¡Hola ${conv.user.profile.payload.given_name.toLowerCase()}!`, 'Soy tu gestor de colores.', '¿Qué quieres hacer?'));
    } else {
	conv.ask(format('¡Hola!', 'Soy tu gestor de colores.', '¿Quieres autenticarte?'));
    }
});

app.intent('welcome.auth', conv => {
    conv.followup('AUTH');
})

app.intent('auth', conv => {
    conv.ask(new SignIn('Para guardar tu color favorito'));
});

app.intent('signin', (conv, _, signin: { status: GoogleActionsV2SignInValue }) => {
    if (signin.status !== 'OK') {
	conv.ask(format('Necesito saber quien eres antes de poder guardar tu color favorito.'));
    } else {
	conv.ask(format('¡Hola!'));
    }
});

app.intent('help', conv => {
    conv.ask(format('Puedo ayudarte a guardar tu color favorito y decírtelo cuando lo necesites.', '¿Qué quieres hacer?'));
});

app.intent('save', async (conv, { color }) => {
    if (!conv.user.profile.payload) {
	conv.ask(format('Necesito conocer quien eres para poder guardar tu color favorito.'));
	return;
    }

    if (!color || typeof color !== 'string') {
	conv.ask(format('Necesito que me especifiques un color.'));
	return;
    }

    await setStorage(conv.user.profile.payload.sub, { color });

    conv.ask(format(`¡Vale! He guardado el ${color} como tu color favorito.`));
});

app.intent('get', async conv => {
    if (!conv.user.profile.payload) {
	conv.ask(format('Necesito conocer quien eres para poder guardar tu color favorito.'));
	return;
    }

    const storage = await getStorage(conv.user.profile.payload.sub);

    if (!storage) {
	conv.ask(format('No has guardado ningún color.', '¿Qué color quieres guardar?'));
	return;
    }

    conv.ask(format(`Tu color favorito es el ${storage.color}.`));
});

app.intent('get.save', (conv, { color }) => {
    conv.followup('SAVE_COLOR', { color });
});

app.intent('confirmation_help', (conv, _, granted) => {
    if (granted) {
	conv.followup('SHOW_HELP');
    } else {
	conv.followup('FALLBACK');
    }
});

app.intent('exit', conv => {
    conv.close(format('Ha sido un placer hablar contigo.', '¡Hasta luego!'));
});

app.fallback(conv => {
    conv.ask(format('Perdona, no te he entendido.'));
    conv.ask(new Confirmation(format('¿Quieres ver la ayuda?')));
});

export const conversation = functions.region('europe-west1').https.onRequest(app);
