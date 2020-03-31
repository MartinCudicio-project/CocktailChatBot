'use strict';
const request = require('request');
const crypto = require('crypto');

class FBeamer {
	constructor(config) {
		try {
			// if (!config || config.PAGE_ACCESS_TOKEN === undefined || config.VERIFY_TOKEN === undefined || config.APP_SECRET === undefined) {
			if (!config || config.PAGE_ACCESS_TOKEN === undefined || config.VERIFY_TOKEN === undefined) {
			throw new Error("Unable to access tokens!");
			} else {
				this.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;
				this.VERIFY_TOKEN = config.VERIFY_TOKEN;
				this.APP_SECRET = config.APP_SECRET;
			}
		} catch (e) {
			console.log(e);
		}
	}

	registerHook(req, res) {
		// If req.query.hub.mode is 'subscribe'
		// and if req.query.hub.verify_token is the same as this.VERIFY_TOKEN
		// then send back an HTTP status 200 and req.query.hub.challenge
		let {
			mode,
			verify_token,
			challenge
		} = req.query.hub;
		if (mode === 'subscribe' && verify_token === this.VERIFY_TOKEN) {
			return res.end(challenge);
		} else {
			console.log("Could not register webhook!");
			return res.status(403).end();
		}
	}

	verifySignature(req, res, next) {
		let rawData = '';
		
		req.on('data', function(data) {
			rawData += data;
		});

		req.on('end', () => {
			let hash = crypto.createHmac('sha1', this.APP_SECRET).update(rawData).digest('hex');
			let signature = req.headers['x-hub-signature'];
			if (hash !== signature.split("=")[1]) {
				// Implement a logging and notification mechanism
				//console.error("ERROR: INVALID SIGNATURE");
			}

		});
		return next();
	}

	subscribe() {
		request({
			uri: 'https://graph.facebook.com/v2.6/me/subscribed_apps',
			qs: {
				access_token: this.PAGE_ACCESS_TOKEN
			},
			method: 'POST'
		}, (error, response, body) => {
			if (!error && JSON.parse(body).success) {
				console.log("Subscribed to the page!");
			} else {
				console.log(error);
			}
		});
	}

	async incoming(req, res, cb) {
		// Extract the body of the POST request
		let data = req.body;

		if (data.object === 'page') {
			// Iterate through the page entry Array
			data.entry.forEach(pageObj => {
				// Iterate through the messaging Array
				pageObj.messaging.forEach(msgEvent => {
					let messageObj = {
						sender: msgEvent.sender.id,
						timeOfMessage: msgEvent.timestamp,
						message: msgEvent.message
					}
					cb(messageObj);
				});
			});
		}
		res.send(200);
	}

	sendMessage(id, message, messaging_type= 'RESPONSE') {
		let payload = {
			messaging_type,
			recipient: {
				id
			},
			message
		}
		console.log("send message",payload)
		// console.log(payload.message.quick_replies)
		return new Promise((resolve, reject) => {
			// Create an HTTP POST request
			request({
				uri: 'https://graph.facebook.com/v2.6/me/messages',
				qs: {
					access_token: this.PAGE_ACCESS_TOKEN
				},
				method: 'POST',
				json: payload
			}, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					resolve({
						messageId: body.message_id
					});
				} else {
					reject(error);
				}
			});
		});
	}
	// Propose a quick reply
	quick_reply(text,replies){
		// console.log(text)
		// console.log(replies)
		let repliesFormated = []
		replies.forEach(elem=>{
			repliesFormated.push({
				"content_type":"text",
				"title":elem.title,
				"image_url":"https://img-3.journaldesfemmes.fr/YFEyw9oHTHScre-uh3DiCm3IQNc=/750x/smart/afa673ac36ef40e1bc1296e271753801/recipe-jdf/10026152.jpg",
				"payload": elem.payload
			})
		})
		let message = {
			"text": text,
			"quick_replies": repliesFormated
		}
		return message
	}


	// Send a text message
	txt(text) {
		let message = {
			text : text
		}
		return message
	}

	// Send an image message
	img(url) {
		let message = {  
			attachment: {
				type: 'image',
				payload: {
					url
				}
			}
		}
		return message
	}
}

module.exports = FBeamer;