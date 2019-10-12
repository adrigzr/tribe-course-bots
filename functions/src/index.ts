import * as functions from 'firebase-functions';
import { dialogflow, Confirmation } from 'actions-on-google';

interface UserStorage {
    color: string;
}

const app = dialogflow<UserStorage, UserStorage>({
  debug: true
});

function join(strs: TemplateStringsArray, ...substs: string[]) {
    return substs.reduce((prev,cur,i) => prev+cur+strs[i+1], strs[0]);
}

function prosody(strs: TemplateStringsArray, ...substs: string[]): string {
    return `
	<speak>
	    <prosody rate="120%" pitch="2st">${join(strs, ...substs)}</prosody>
	</speak>`;
}

app.intent('Default Welcome Intent', conv => {
    conv.ask(prosody`¡Hola! Soy tu gestor de colores. ¿Qué quieres hacer?`);
});

app.intent('help', conv => {
    conv.ask(prosody`Puedo ayudarte a guardar tu color favorito y decírtelo cuando lo necesites. ¿Qué quieres hacer?`);
});

app.intent('save', (conv, { color }) => {
    if (!color || typeof color !== 'string') {
	conv.ask(prosody`Necesito que me especifiques un color.`);
	return;
    }

    conv.user.storage.color = color;

    conv.ask(prosody`¡Vale! He guardado el ${color} como tu color favorito.`);
});

app.intent('get', conv => {
    const color = conv.user.storage.color;

    if (!color) {
	conv.ask(prosody`No has guardado ningún color. ¿Qué color quieres guardar?`);
	return;
    }

    conv.ask(prosody`Tu color favorito es el ${color}.`);
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

app.fallback(conv => {
    conv.ask(prosody`Perdona, no te he entendido.`);
    conv.ask(new Confirmation(prosody`¿Quieres ver la ayuda?`));
});

export const conversation = functions.region('europe-west1').https.onRequest(app);
