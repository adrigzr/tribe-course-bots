import * as functions from 'firebase-functions';
import { dialogflow, Confirmation } from 'actions-on-google';

interface UserStorage {
    color: string;
}

const app = dialogflow<UserStorage, UserStorage>({
  debug: true
});

app.intent('Default Welcome Intent', conv => {
    conv.ask(`
<speak>
    <p>
	<s><emphasis level="strong">!Hola!</emphasis></s>
	<s>Soy tu gestor de colores.</s>
	<s>¿Qué quieres hacer?</s>
  </p>
</speak>`);
});

app.intent('help', conv => {
    conv.ask(`
<speak>
    <p>
	<s>Puedo ayudarte a guardar tu color favorito y decírtelo cuando lo necesites.</s>
	<s>¿Qué quieres hacer?</s>
    </p>
</speak>`);
});

app.intent('save', (conv, { color }) => {
    if (!color || typeof color !== 'string') {
	conv.ask('Necesito que me especifiques un color.');
	return;
    }

    conv.user.storage.color = color;

    conv.ask(`¡Vale! He guardado el ${color} como tu color favorito.`);
});

app.intent('get', conv => {
    const color = conv.user.storage.color;

    if (!color) {
	conv.ask('No has guardado ningún color. ¿Qué color quieres guardar?');
	return;
    }

    conv.ask(`Tu color favorito es el ${color}.`);
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
    conv.ask('Perdona, no te he entendido.');
    conv.ask(new Confirmation('¿Quieres ver la ayuda?'));
});

export const conversation = functions.region('europe-west1').https.onRequest(app);
