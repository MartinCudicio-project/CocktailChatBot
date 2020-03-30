'use strict';
// create an API server
const Restify = require('restify');
const server = Restify.createServer({
	name: 'CocktailMate'
});
const tmdb = require('./cocktailDB');
// FBeamer
// Tokens
const config = require('./config');
const FBeamer = require('./fbeamer');
const f = new FBeamer(config.FB);
const PORT = process.env.PORT || 3000;

server.use(Restify.jsonp());

// Register the webhooks
server.get('/', (req, res, next) => {
	f.registerHook(req, res);
	return next();
});


// Receive all incoming messages
server.post('/',
	(req, res, next) => f.verifySignature(req, res, next),
	Restify.bodyParser(),
	(req, res, next) => {
		f.incoming(req, res, msg => {
			// Process messages
			let {
				message,
				sender
			} = msg;
			if(message && message.nlp) {
				if(message && message.nlp.entities && message.quick_reply){
					if(message.quick_reply.payload){
						let regex = /[a-zA-Z]+/g;
						let fnd = message.quick_reply.payload.match(regex)
						if(fnd[0] == "cocktailByName"){
							message.nlp.entities.intent = [ {confidence : 1.00, value : fnd[0], type: 'value'}];
							regex = /\d+/g;
							fnd = message.quick_reply.payload.match(regex)
							message.nlp.entities.drink = [ {confidence : 1.00, value :fnd[0], type: 'value'} ];
						}		
					}
				}
				if(message.nlp.entities){
					tmdb(message.nlp.entities)
					.then(messageReply => {
						const  sendingProcessus = async () =>{
							if(messageReply.message)
									f.sendMessage(sender,messageReply.message)
							if(messageReply.image)
								await f.sendMessage(sender,messageReply.image)
							if(messageReply.quick_reply)
								await f.sendMessage(sender,messageReply.quick_reply)
						}
						sendingProcessus()
					})
					.catch(error => {
						//console.log(error);
						f.txt(sender, 'My servers are acting up. Do check back later...');
					});
				// If a text message is received
				}
			}
			
			else{
				const error = f.txt(sender, `Let's be polite : say HELLO !`);
				f.sendMessage(sender,error)
			}
		});
		res.send(200);
		return next();
	});

// Subscribe
f.subscribe();

server.listen(PORT, () => console.log(`Cocktail Fun running on port ${PORT}`));