import * as functions from 'firebase-functions';
import { dialogflow, Confirmation } from 'actions-on-google';

interface UserStorage {
    color: string;
}

const app = dialogflow<UserStorage, UserStorage>({
  debug: true
});

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

app.intent('Default Welcome Intent', conv => {
    conv.ask(format('¡Hola!', 'Soy tu gestor de colores.', '¿Qué quieres hacer?'));
});

app.intent('help', conv => {
    conv.ask(format('Puedo ayudarte a guardar tu color favorito y decírtelo cuando lo necesites.', '¿Qué quieres hacer?'));
});

app.intent('save', (conv, { color }) => {
    if (!color || typeof color !== 'string') {
	conv.ask(format('Necesito que me especifiques un color.'));
	return;
    }

    conv.user.storage.color = color;

    conv.ask(format(`¡Vale! He guardado el ${color} como tu color favorito.`));
});

app.intent('get', conv => {
    const color = conv.user.storage.color;

    if (!color) {
	conv.ask(format('No has guardado ningún color.', '¿Qué color quieres guardar?'));
	return;
    }

    conv.ask(format(`Tu color favorito es el ${color}.`));
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
