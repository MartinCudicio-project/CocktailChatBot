'use strict';
const request = require('request');
const TMDB = require('../config').TMDB;
const createResponse = require('./createResponse');
const MAX_CONFIDENCE = 0.7;
const axios = require('axios')


const extractEntity = (nlp, entity) => {
    let obj = nlp[entity] && nlp[entity][0];
    if(obj && obj.confidence > MAX_CONFIDENCE) {
        return obj.value;
    } else {
        return null;
    }
}

const getRandomCocktail = ()=>{
    return new Promise((resolve, reject) => {
        axios({
            "method":"GET",
            "url":"https://the-cocktail-db.p.rapidapi.com/random.php",
            "headers":{
            "content-type":"application/octet-stream",
            "x-rapidapi-host":"the-cocktail-db.p.rapidapi.com",
            "x-rapidapi-key":"bfa74590cdmsheaa847434d7a1b6p11d7c0jsnabf0f56f64d9"
            }
            })
            .then((response)=>{
                response = response.data.drinks[0]
            //   console.log(response.data.drinks[0])
              let data = {
                  strDrink : response.strDrink,
                  strCategory: response.strCategory,
                  strGlass : response.strGlass,
                  strInstructions : response.strInstructions,
                  strDrinkThumb : response.strDrinkThumb
              }
              let message = `${data.strDrink} - ${data.strCategory}
${data.strInstructions}
serve with ${data.strGlass}`.substring(0, 640)
              resolve({txt: message, img: null});
            })
            .catch((error)=>{
                console.log("error in create response")
              reject(error);
            })
    })
    
}
const getMovieData = (movie, releaseYear = null) => {
    let qs = {
        api_key: TMDB,
        query: movie
    }

    if(releaseYear) {
        qs.year = Number(releaseYear);
    }

    return new Promise((resolve, reject) => {
        request({
            uri: 'https://api.themoviedb.org/3/search/movie',
            qs
        }, (error, response, body) => {
            if(!error && response.statusCode === 200) {
                let data = JSON.parse(body);
                resolve(data.results[0]);
            } else {
                reject(error);
            }
        });
    });
}



module.exports = nlpData => {
    return new Promise(async function(resolve, reject) {
        let intent = extractEntity(nlpData, 'intent');
        if(intent) {
            console.log(intent)
            // let movie = extractEntity(nlpData, 'movie');
            // let releaseYear = extractEntity(nlpData, 'releaseYear');
            let random = extractEntity(nlpData,'intent')
            // Get data (including id) about the movie
            // Get director(s) using the id
            // Create a response and resolve back to the user
            try {
                let response = await getRandomCocktail();
                // let movieData = await getMovieData(movie, releaseYear);
                // let director = await getDirector(movieData.id);
                // let response = createResponse(intent, movieData, director);
                resolve(response);
            } catch(error) {
                reject(error);
            }

        } else {
            resolve({
                txt: "I'm not sure I understand you!",
                img: null
            });
        }
        
    });
}