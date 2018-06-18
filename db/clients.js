const GOOGLE_CLIENT_ID = process.env.GOOGLE_ID || 'google';
const GOOGLE_SECRET = process.env.GOOGLE_SECRET || 'googleSecret';

// console.log("GoogleClientID: " + GOOGLE_CLIENT_ID);
// console.log("GoogleSecret: " + GOOGLE_SECRET);

const clients = [
    {id: GOOGLE_CLIENT_ID, redirectURI: "https://oauth-redirect.googleusercontent.com/r/bcosmarthomeaction", secret: GOOGLE_SECRET}
];

module.exports.findById = function (id, done) {
    for (let i = 0; i < clients.length; i++) {
        if (clients[i].id === id) {
            return done(null, clients[i]);
        }
        return done(new Error("Client not found"));
    }
};