import updateNotifier from './components/UpdateNotifier.js';

export async function init() {
  await updateNotifier.init();
}

window.SaniCheckVersionInit = init;
window.UpdateNotifier = updateNotifier;
