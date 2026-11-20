// Lets phones offer to install the admin page as an app. It caches nothing,
// so every page always loads fresh from the network.
self.addEventListener('fetch', () => {});
