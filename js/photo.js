// The photograph page itself is built on the server (api/photo.js).
// This script only adds the header, menu and footer, and counts the view.
import { mountChrome, track } from './common.js';

mountChrome('photo');

const id = document.querySelector('#main')?.dataset.id;
if (id) track(`photo:${id}`);
